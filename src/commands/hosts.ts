import { Command } from "commander";
import inquirer from "inquirer";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { formatOutput, formatProxyHostsTable } from "../utils/formatter.js";
import { withSpinner } from "../utils/spinner.js";
import type { ProxyHostCreatePayload } from "../types/npm.js";

function parseForwardUrl(forwardStr: string): { scheme: "http" | "https"; host: string; port: number } {
  let scheme: "http" | "https" = "http";
  let host = forwardStr;
  let port = 80;

  if (forwardStr.startsWith("https://")) {
    scheme = "https";
    forwardStr = forwardStr.slice(8);
    port = 443;
  } else if (forwardStr.startsWith("http://")) {
    scheme = "http";
    forwardStr = forwardStr.slice(7);
    port = 80;
  }

  if (forwardStr.includes(":")) {
    const parts = forwardStr.split(":");
    host = parts[0];
    port = parseInt(parts[1], 10) || port;
  } else {
    host = forwardStr;
  }

  return { scheme, host, port };
}

export function registerHostsCommands(program: Command) {
  const hosts = program.command("hosts").description("Manage NPM reverse proxy hosts");

  // LIST
  hosts
    .command("list")
    .description("List all proxy hosts")
    .option("-f, --format <format>", "Output format (table, json, yaml)", "table")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const list = await withSpinner("Fetching proxy hosts...", async () => {
          return await manager.hosts.list();
        });

        logger.raw(
          formatOutput(list, opts.format, () => formatProxyHostsTable(list))
        );
      } catch (err: any) {
        logger.error("Failed to list proxy hosts", err);
        process.exit(1);
      }
    });

  // GET
  hosts
    .command("get <target>")
    .description("Get detailed information about a proxy host by ID or domain")
    .option("-f, --format <format>", "Output format (json, yaml)", "yaml")
    .action(async (target, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const host = await withSpinner(`Fetching host ${target}...`, async () => {
          const id = parseInt(target, 10);
          if (!isNaN(id)) {
            return await manager.hosts.get(id);
          } else {
            return await manager.hosts.findByDomain(target);
          }
        });

        if (!host) {
          logger.error(`Proxy host '${target}' not found.`);
          process.exit(1);
        }

        logger.raw(formatOutput(host, opts.format));
      } catch (err: any) {
        logger.error(`Failed to get proxy host '${target}'`, err);
        process.exit(1);
      }
    });

  // CREATE
  hosts
    .command("create")
    .description("Create a new proxy host")
    .option("-d, --domain <domains...>", "Domain name(s) (e.g. app.example.com)")
    .option("-f, --forward <target>", "Forward target (e.g. http://192.168.1.50:8080 or 192.168.1.50:8080)")
    .option("--forward-host <host>", "Forward host/IP (e.g. 192.168.1.50)")
    .option("--forward-port <port>", "Forward port", parseInt)
    .option("--forward-scheme <scheme>", "Forward scheme (http or https)")
    .option("--cert-id <id>", "SSL Certificate ID (or pass --ssl to prompt)")
    .option("--ssl", "Enable SSL and select certificate interactively")
    .option("--force-ssl", "Force SSL / HTTPS redirection", true)
    .option("--no-force-ssl", "Do not force SSL")
    .option("--http2", "Enable HTTP/2 Support", true)
    .option("--hsts", "Enable HSTS", false)
    .option("--websocket", "Allow WebSocket upgrades", true)
    .option("--block-exploits", "Block common exploits", true)
    .option("--access-list <id>", "Access List ID", parseInt)
    .option("--advanced <config>", "Custom Nginx configuration block")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        let domains: string[] = opts.domain || [];
        let forwardHost = opts.forwardHost;
        let forwardPort = opts.forwardPort;
        let forwardScheme: "http" | "https" = opts.forwardScheme || "http";

        if (opts.forward) {
          const parsed = parseForwardUrl(opts.forward);
          forwardHost = parsed.host;
          forwardPort = parsed.port;
          forwardScheme = parsed.scheme;
        }

        // Interactive prompts if arguments not supplied
        if (domains.length === 0 || !forwardHost || !forwardPort) {
          const answers = await inquirer.prompt([
            {
              type: "input",
              name: "domains",
              message: "Domain names (comma separated):",
              when: domains.length === 0,
              validate: (input) => (input.trim().length > 0 ? true : "Domain is required"),
            },
            {
              type: "input",
              name: "forward",
              message: "Forward Target (e.g. http://192.168.1.50:8080):",
              when: !forwardHost || !forwardPort,
              validate: (input) => (input.trim().length > 0 ? true : "Forward target is required"),
            },
          ]);

          if (answers.domains) {
            domains = answers.domains.split(",").map((d: string) => d.trim()).filter(Boolean);
          }
          if (answers.forward) {
            const parsed = parseForwardUrl(answers.forward);
            forwardHost = parsed.host;
            forwardPort = parsed.port;
            forwardScheme = parsed.scheme;
          }
        }

        let certId = opts.certId ? parseInt(opts.certId, 10) : 0;
        if (opts.ssl && !certId) {
          const certs = await manager.certs.list();
          if (certs.length > 0) {
            const certChoices = [
              { name: "None (HTTP Only)", value: 0 },
              ...certs.map((c) => ({
                name: `#${c.id} - ${c.nice_name || c.domain_names.join(", ")} (${c.provider})`,
                value: c.id,
              })),
            ];
            const chosen = await inquirer.prompt([
              {
                type: "list",
                name: "certId",
                message: "Select SSL Certificate:",
                choices: certChoices,
              },
            ]);
            certId = chosen.certId;
          }
        }

        const payload: ProxyHostCreatePayload = {
          domain_names: domains,
          forward_scheme: forwardScheme,
          forward_host: forwardHost,
          forward_port: forwardPort,
          certificate_id: certId,
          ssl_forced: Boolean(opts.forceSsl && certId),
          http2_support: Boolean(opts.http2),
          hsts_enabled: Boolean(opts.hsts),
          allow_websocket_upgrade: Boolean(opts.websocket),
          block_exploits: Boolean(opts.blockExploits),
          access_list_id: opts.accessList || 0,
          advanced_config: opts.advanced || "",
        };

        const created = await withSpinner(
          `Creating proxy host for ${domains.join(", ")}...`,
          async () => {
            return await manager.hosts.create(payload);
          },
          `Proxy host #${domains.join(", ")} created successfully!`
        );

        logger.raw(formatOutput(created, "yaml"));
      } catch (err: any) {
        logger.error("Failed to create proxy host", err);
        process.exit(1);
      }
    });

  // UPDATE
  hosts
    .command("update <target>")
    .description("Update an existing proxy host")
    .option("-d, --domain <domains...>", "New domain names")
    .option("-f, --forward <target>", "New forward target (e.g. 192.168.1.50:8080)")
    .option("--cert-id <id>", "New SSL Certificate ID", parseInt)
    .option("--force-ssl", "Force SSL")
    .option("--no-force-ssl", "Do not force SSL")
    .option("--websocket", "Allow WebSockets")
    .option("--block-exploits", "Block exploits")
    .option("--access-list <id>", "Access List ID", parseInt)
    .option("--advanced <config>", "Custom Nginx configuration block")
    .action(async (target, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        let hostId = parseInt(target, 10);
        if (isNaN(hostId)) {
          const found = await manager.hosts.findByDomain(target);
          if (!found) {
            logger.error(`Proxy host '${target}' not found.`);
            process.exit(1);
          }
          hostId = found.id;
        }

        const updateData: any = {};
        if (opts.domain) updateData.domain_names = opts.domain;
        if (opts.forward) {
          const parsed = parseForwardUrl(opts.forward);
          updateData.forward_scheme = parsed.scheme;
          updateData.forward_host = parsed.host;
          updateData.forward_port = parsed.port;
        }
        if (opts.certId !== undefined) updateData.certificate_id = opts.certId;
        if (opts.forceSsl !== undefined) updateData.ssl_forced = opts.forceSsl;
        if (opts.websocket !== undefined) updateData.allow_websocket_upgrade = opts.websocket;
        if (opts.blockExploits !== undefined) updateData.block_exploits = opts.blockExploits;
        if (opts.accessList !== undefined) updateData.access_list_id = opts.accessList;
        if (opts.advanced !== undefined) updateData.advanced_config = opts.advanced;

        const updated = await withSpinner(
          `Updating proxy host #${hostId}...`,
          async () => {
            return await manager.hosts.update(hostId, updateData);
          },
          `Proxy host #${hostId} updated successfully!`
        );

        logger.raw(formatOutput(updated, "yaml"));
      } catch (err: any) {
        logger.error(`Failed to update proxy host '${target}'`, err);
        process.exit(1);
      }
    });

  // DELETE
  hosts
    .command("delete <target>")
    .description("Delete a proxy host by ID or domain")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (target, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        let hostId = parseInt(target, 10);
        let domainLabel = target;
        if (isNaN(hostId)) {
          const found = await manager.hosts.findByDomain(target);
          if (!found) {
            logger.error(`Proxy host '${target}' not found.`);
            process.exit(1);
          }
          hostId = found.id;
          domainLabel = found.domain_names.join(", ");
        }

        if (!opts.yes) {
          const answer = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message: `Are you sure you want to delete proxy host #${hostId} (${domainLabel})?`,
              default: false,
            },
          ]);
          if (!answer.confirm) {
            logger.info("Operation cancelled.");
            return;
          }
        }

        await withSpinner(`Deleting proxy host #${hostId}...`, async () => {
          return await manager.hosts.delete(hostId);
        });

        logger.success(`Proxy host #${hostId} deleted successfully.`);
      } catch (err: any) {
        logger.error(`Failed to delete proxy host '${target}'`, err);
        process.exit(1);
      }
    });

  // ENABLE / DISABLE
  hosts
    .command("enable <target>")
    .description("Enable a proxy host")
    .action(async (target, _, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);
        let hostId = parseInt(target, 10);
        if (isNaN(hostId)) {
          const found = await manager.hosts.findByDomain(target);
          if (!found) {
            logger.error(`Proxy host '${target}' not found.`);
            process.exit(1);
          }
          hostId = found.id;
        }

        await withSpinner(`Enabling proxy host #${hostId}...`, async () => {
          return await manager.hosts.enable(hostId);
        });
        logger.success(`Proxy host #${hostId} enabled.`);
      } catch (err: any) {
        logger.error(`Failed to enable proxy host '${target}'`, err);
        process.exit(1);
      }
    });

  hosts
    .command("disable <target>")
    .description("Disable a proxy host")
    .action(async (target, _, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);
        let hostId = parseInt(target, 10);
        if (isNaN(hostId)) {
          const found = await manager.hosts.findByDomain(target);
          if (!found) {
            logger.error(`Proxy host '${target}' not found.`);
            process.exit(1);
          }
          hostId = found.id;
        }

        await withSpinner(`Disabling proxy host #${hostId}...`, async () => {
          return await manager.hosts.disable(hostId);
        });
        logger.success(`Proxy host #${hostId} disabled.`);
      } catch (err: any) {
        logger.error(`Failed to disable proxy host '${target}'`, err);
        process.exit(1);
      }
    });
}
