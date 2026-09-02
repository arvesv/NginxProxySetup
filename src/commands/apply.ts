import { Command } from "commander";
import fs from "node:fs";
import YAML from "yaml";
import chalk from "chalk";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { withSpinner } from "../utils/spinner.js";
import { NpmDeclarativeConfigSchema, type NpmDeclarativeConfig } from "../types/config.js";
import type { NginxProxyManager } from "../index.js";

export function registerApplyCommands(program: Command) {
  program
    .command("apply")
    .description("Declaratively apply/reconcile configuration from a YAML/JSON file (GitOps style)")
    .requiredOption("-f, --file <file>", "Path to YAML/JSON configuration file")
    .option("--dry-run", "Show changes that would be made without applying them", false)
    .option("--prune", "Delete remote proxy hosts that are not defined in the configuration file", false)
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        
        if (!fs.existsSync(opts.file)) {
          throw new Error(`Configuration file not found: ${opts.file}`);
        }

        const raw = fs.readFileSync(opts.file, "utf-8");
        const parsedObj = opts.file.endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw);
        const parsed = NpmDeclarativeConfigSchema.safeParse(parsedObj);

        if (!parsed.success) {
          logger.error("Configuration file validation failed:");
          for (const err of parsed.error.issues) {
            console.error(chalk.red(`  • [${err.path.join(".")}] ${err.message}`));
          }
          process.exit(1);
        }

        const config: NpmDeclarativeConfig = parsed.data;
        const manager = createManagerFromOptions({
          ...globalOpts,
          url: config.settings?.npm_url || globalOpts.url,
        });

        logger.info(`Starting reconciliation against ${manager.api.baseUrl}...`);
        if (opts.dryRun) {
          logger.warn("DRY RUN MODE: No changes will be applied to the server.");
        }

        await runReconciliation(manager, config, {
          dryRun: Boolean(opts.dryRun),
          prune: Boolean(opts.prune),
        });

        logger.success("Reconciliation complete!");
      } catch (err: any) {
        logger.error("Apply failed", err);
        process.exit(1);
      }
    });
}

async function runReconciliation(
  manager: NginxProxyManager,
  config: NpmDeclarativeConfig,
  options: { dryRun: boolean; prune: boolean }
) {
  // 1. Fetch current remote state
  const [remoteHosts, remoteCerts, remoteAccess] = await withSpinner(
    "Fetching current NPM remote state...",
    async () => {
      return await Promise.all([
        manager.hosts.list(),
        manager.certs.list(),
        manager.accessLists.list(),
      ]);
    }
  );

  const certLookup = new Map<string, number>();
  for (const c of remoteCerts) {
    if (c.nice_name) certLookup.set(c.nice_name.toLowerCase(), c.id);
    for (const d of c.domain_names || []) {
      certLookup.set(d.toLowerCase(), c.id);
    }
    certLookup.set(String(c.id), c.id);
  }

  const accessLookup = new Map<string, number>();
  for (const a of remoteAccess) {
    accessLookup.set(a.name.toLowerCase(), a.id);
    accessLookup.set(String(a.id), a.id);
  }

  // 2. Reconcile Certificates
  logger.title("1. Reconciling Certificates...");
  for (const certConf of config.certificates || []) {
    const certKey = (certConf.name || certConf.domain_names[0] || "").toLowerCase();
    const existingId = certLookup.get(certKey) || certLookup.get(certConf.domain_names[0]?.toLowerCase());

    if (existingId) {
      logger.dim(`  ✔ Certificate '${certKey}' already exists (ID: #${existingId})`);
    } else {
      if (options.dryRun) {
        logger.info(`  [DRY-RUN] Would create certificate for ${certConf.domain_names.join(", ")}`);
      } else {
        if (certConf.provider === "letsencrypt") {
          logger.info(`  Creating Let's Encrypt certificate for: ${certConf.domain_names.join(", ")}...`);
          const created = await manager.certs.createLetsEncrypt({
            domain_names: certConf.domain_names,
            meta: {
              letsencrypt_email:
                certConf.letsencrypt_email || config.settings?.default_email || "admin@example.com",
              letsencrypt_agree: true,
              dns_challenge: certConf.dns_challenge,
              dns_provider: certConf.dns_provider,
              dns_provider_credentials: certConf.dns_provider_credentials,
            },
          });
          certLookup.set(certKey, created.id);
          for (const d of created.domain_names || []) {
            certLookup.set(d.toLowerCase(), created.id);
          }
          logger.success(`  Created certificate #${created.id}`);
        } else if (certConf.provider === "custom" && certConf.certificate_path && certConf.key_path) {
          logger.info(`  Uploading custom certificate '${certConf.name}'...`);
          const created = await manager.certs.createCustom({
            nice_name: certConf.name || "Custom Certificate",
            certificate: certConf.certificate_path,
            certificate_key: certConf.key_path,
            intermediate_certificate: certConf.intermediate_path,
          });
          certLookup.set(certKey, created.id);
          logger.success(`  Uploaded custom certificate #${created.id}`);
        }
      }
    }
  }

  // 3. Reconcile Access Lists
  logger.title("2. Reconciling Access Lists...");
  for (const accessConf of config.access_lists || []) {
    const accessKey = accessConf.name.toLowerCase();
    const existingId = accessLookup.get(accessKey);

    if (existingId) {
      logger.dim(`  ✔ Access list '${accessConf.name}' already exists (ID: #${existingId})`);
    } else {
      if (options.dryRun) {
        logger.info(`  [DRY-RUN] Would create access list '${accessConf.name}'`);
      } else {
        const created = await manager.accessLists.create({
          name: accessConf.name,
          satisfy_any: accessConf.satisfy_any,
          pass_auth: accessConf.pass_auth,
          items: accessConf.items,
          clients: accessConf.clients,
        });
        accessLookup.set(accessKey, created.id);
        logger.success(`  Created access list '${accessConf.name}' (#${created.id})`);
      }
    }
  }

  // 4. Reconcile Proxy Hosts
  logger.title("3. Reconciling Proxy Hosts...");
  const processedHostIds = new Set<number>();

  for (const hostConf of config.proxy_hosts || []) {
    const primaryDomain = hostConf.domain_names[0]?.toLowerCase();
    const existing = remoteHosts.find((h) =>
      h.domain_names.some((d) => d.toLowerCase() === primaryDomain)
    );

    let resolvedCertId: number | 0 = 0;
    if (hostConf.certificate) {
      resolvedCertId = certLookup.get(hostConf.certificate.toLowerCase()) || 0;
    }

    let resolvedAccessId: number | 0 = 0;
    if (hostConf.access_list) {
      resolvedAccessId = accessLookup.get(hostConf.access_list.toLowerCase()) || 0;
    }

    const payload = {
      domain_names: hostConf.domain_names,
      forward_scheme: hostConf.forward_scheme,
      forward_host: hostConf.forward_host,
      forward_port: hostConf.forward_port,
      certificate_id: resolvedCertId,
      ssl_forced: hostConf.ssl_forced && resolvedCertId > 0,
      hsts_enabled: hostConf.hsts_enabled,
      hsts_subdomains: hostConf.hsts_subdomains,
      http2_support: hostConf.http2_support,
      block_exploits: hostConf.block_exploits,
      caching_enabled: hostConf.caching_enabled,
      allow_websocket_upgrade: hostConf.allow_websocket_upgrade,
      access_list_id: resolvedAccessId,
      advanced_config: hostConf.advanced_config || "",
      enabled: hostConf.enabled,
      locations: hostConf.locations || [],
    };

    if (existing) {
      processedHostIds.add(existing.id);

      // Check if update is needed
      const needsUpdate =
        existing.forward_host !== payload.forward_host ||
        existing.forward_port !== payload.forward_port ||
        existing.forward_scheme !== payload.forward_scheme ||
        Number(existing.certificate_id) !== Number(payload.certificate_id) ||
        Boolean(existing.ssl_forced) !== Boolean(payload.ssl_forced) ||
        Boolean(existing.allow_websocket_upgrade) !== Boolean(payload.allow_websocket_upgrade) ||
        Boolean(existing.block_exploits) !== Boolean(payload.block_exploits) ||
        Number(existing.access_list_id) !== Number(payload.access_list_id) ||
        Boolean(existing.enabled) !== Boolean(payload.enabled);

      if (needsUpdate) {
        if (options.dryRun) {
          logger.info(`  [DRY-RUN] Would update host #${existing.id} (${hostConf.domain_names.join(", ")})`);
        } else {
          await manager.hosts.update(existing.id, payload);
          logger.success(`  Updated host #${existing.id} (${hostConf.domain_names.join(", ")})`);
        }
      } else {
        logger.dim(`  ✔ Host '${hostConf.domain_names.join(", ")}' is up to date.`);
      }
    } else {
      if (options.dryRun) {
        logger.info(`  [DRY-RUN] Would create host for ${hostConf.domain_names.join(", ")} -> ${payload.forward_scheme}://${payload.forward_host}:${payload.forward_port}`);
      } else {
        const created = await manager.hosts.create(payload);
        processedHostIds.add(created.id);
        logger.success(`  Created host #${created.id} (${hostConf.domain_names.join(", ")})`);
      }
    }
  }

  // 5. Prune if requested
  if (options.prune) {
    logger.title("4. Pruning Undefined Proxy Hosts...");
    for (const remote of remoteHosts) {
      if (!processedHostIds.has(remote.id)) {
        if (options.dryRun) {
          logger.warn(`  [DRY-RUN] Would delete remote host #${remote.id} (${remote.domain_names.join(", ")})`);
        } else {
          await manager.hosts.delete(remote.id);
          logger.warn(`  Deleted remote host #${remote.id} (${remote.domain_names.join(", ")})`);
        }
      }
    }
  }
}
