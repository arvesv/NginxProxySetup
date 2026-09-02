import { Command } from "commander";
import fs from "node:fs";
import YAML from "yaml";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { withSpinner } from "../utils/spinner.js";
import type { NpmDeclarativeConfig } from "../types/config.js";

export function registerExportCommands(program: Command) {
  program
    .command("export")
    .description("Export full NPM configuration (hosts, certs, access lists, streams, redirects) to YAML/JSON")
    .option("-o, --output <file>", "Output file path (e.g. npm-backup.yaml or npm-backup.json)")
    .option("-f, --format <format>", "Output format if writing to stdout (yaml, json)", "yaml")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const config = await withSpinner("Exporting NPM configuration...", async () => {
          const [hosts, certs, accessLists, streams, redirects] = await Promise.all([
            manager.hosts.list(),
            manager.certs.list(),
            manager.accessLists.list(),
            manager.streams.list(),
            manager.redirects.list(),
          ]);

          const certMap = new Map<number, string>();
          for (const c of certs) {
            certMap.set(c.id, c.nice_name || (c.domain_names && c.domain_names[0]) || `cert-${c.id}`);
          }

          const accessMap = new Map<number, string>();
          for (const a of accessLists) {
            accessMap.set(a.id, a.name);
          }

          const declarative: NpmDeclarativeConfig = {
            version: "1.0",
            settings: {
              npm_url: manager.api.baseUrl,
            },
            certificates: certs.map((c) => ({
              name: c.nice_name || (c.domain_names && c.domain_names[0]) || `cert-${c.id}`,
              provider: c.provider === "letsencrypt" ? "letsencrypt" : "custom",
              domain_names: c.domain_names || [],
              letsencrypt_email: c.meta?.letsencrypt_email,
              dns_challenge: Boolean(c.meta?.dns_challenge),
              dns_provider: c.meta?.dns_provider,
              dns_provider_credentials: c.meta?.dns_provider_credentials,
            })),
            access_lists: accessLists.map((a) => ({
              name: a.name,
              satisfy_any: Boolean(a.satisfy_any),
              pass_auth: Boolean(a.pass_auth),
              items: (a.items || []).map((i) => ({
                address: i.address,
                directive: i.directive,
              })),
              clients: (a.clients || []).map((u) => ({
                username: u.username,
                password: u.password || "",
              })),
            })),
            proxy_hosts: hosts.map((h) => ({
              domain_names: h.domain_names,
              forward_scheme: h.forward_scheme,
              forward_host: h.forward_host,
              forward_port: h.forward_port,
              certificate: h.certificate_id ? (certMap.get(h.certificate_id) || String(h.certificate_id)) : undefined,
              ssl_forced: Boolean(h.ssl_forced),
              hsts_enabled: Boolean(h.hsts_enabled),
              hsts_subdomains: Boolean(h.hsts_subdomains),
              http2_support: Boolean(h.http2_support),
              block_exploits: Boolean(h.block_exploits),
              caching_enabled: Boolean(h.caching_enabled),
              allow_websocket_upgrade: Boolean(h.allow_websocket_upgrade),
              access_list: h.access_list_id ? (accessMap.get(h.access_list_id) || String(h.access_list_id)) : undefined,
              advanced_config: h.advanced_config || "",
              enabled: Boolean(h.enabled),
              locations: (h.locations || []).map((l) => ({
                path: l.path,
                forward_scheme: l.forward_scheme,
                forward_host: l.forward_host,
                forward_port: l.forward_port,
                advanced_config: l.advanced_config || "",
              })),
            })),
            streams: streams.map((s) => ({
              incoming_port: s.incoming_port,
              forwarding_host: s.forwarding_host,
              forwarding_port: s.forwarding_port,
              tcp_forwarding: Boolean(s.tcp_forwarding),
              udp_forwarding: Boolean(s.udp_forwarding),
              enabled: Boolean(s.enabled),
            })),
            redirections: redirects.map((r) => ({
              domain_names: r.domain_names,
              forward_http_code: r.forward_http_code,
              forward_scheme: r.forward_scheme,
              forward_domain_name: r.forward_domain_name,
              preserve_path: Boolean(r.preserve_path),
              certificate: r.certificate_id ? (certMap.get(r.certificate_id) || String(r.certificate_id)) : undefined,
              ssl_forced: Boolean(r.ssl_forced),
              hsts_enabled: Boolean(r.hsts_enabled),
              block_exploits: Boolean(r.block_exploits),
              enabled: Boolean(r.enabled),
            })),
          };

          return declarative;
        });

        const isJson = opts.output?.endsWith(".json") || opts.format === "json";
        const serialized = isJson
          ? JSON.stringify(config, null, 2)
          : YAML.stringify(config);

        if (opts.output) {
          fs.writeFileSync(opts.output, serialized, "utf-8");
          logger.success(`Configuration successfully exported to: ${opts.output}`);
        } else {
          logger.raw(serialized);
        }
      } catch (err: any) {
        logger.error("Failed to export NPM configuration", err);
        process.exit(1);
      }
    });
}
