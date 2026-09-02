import { Command } from "commander";
import inquirer from "inquirer";
import fs from "node:fs";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { formatOutput, formatCertificatesTable } from "../utils/formatter.js";
import { withSpinner } from "../utils/spinner.js";

export function registerCertsCommands(program: Command) {
  const certs = program.command("certs").description("Manage SSL Certificates (Let's Encrypt & Custom)");

  // LIST
  certs
    .command("list")
    .description("List all SSL certificates")
    .option("-f, --format <format>", "Output format (table, json, yaml)", "table")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const list = await withSpinner("Fetching certificates...", async () => {
          return await manager.certs.list();
        });

        logger.raw(
          formatOutput(list, opts.format, () => formatCertificatesTable(list))
        );
      } catch (err: any) {
        logger.error("Failed to list certificates", err);
        process.exit(1);
      }
    });

  // GET
  certs
    .command("get <id>")
    .description("Get certificate details by ID")
    .option("-f, --format <format>", "Output format (json, yaml)", "yaml")
    .action(async (idStr, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);
        const id = parseInt(idStr, 10);

        const cert = await withSpinner(`Fetching certificate #${id}...`, async () => {
          return await manager.certs.get(id);
        });

        if (!cert) {
          logger.error(`Certificate #${id} not found.`);
          process.exit(1);
        }

        logger.raw(formatOutput(cert, opts.format));
      } catch (err: any) {
        logger.error(`Failed to get certificate #${idStr}`, err);
        process.exit(1);
      }
    });

  // CREATE LET'S ENCRYPT
  certs
    .command("create-le")
    .description("Request a new Let's Encrypt SSL certificate (HTTP-01 or DNS-01 challenge)")
    .option("-d, --domain <domains...>", "Domain names (e.g. *.example.com, example.com)")
    .option("-e, --email <email>", "Let's Encrypt registration email")
    .option("--agree-tos", "Agree to Let's Encrypt Terms of Service", true)
    .option("--dns-challenge", "Use DNS-01 Challenge (required for wildcard certs)", false)
    .option("--dns-provider <provider>", "DNS Provider name (e.g. cloudflare, route53, digitalocean)")
    .option("--dns-credentials <creds>", "DNS Provider credentials string / config content")
    .option("--propagation-seconds <sec>", "DNS propagation wait seconds", parseInt)
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        let domains: string[] = opts.domain || [];
        let email = opts.email;
        let isDns = Boolean(opts.dnsChallenge);

        if (domains.length === 0 || !email) {
          const answers = await inquirer.prompt([
            {
              type: "input",
              name: "domains",
              message: "Domain names (comma-separated, e.g. *.domain.com, domain.com):",
              when: domains.length === 0,
              validate: (i) => (i.trim().length > 0 ? true : "Domains are required"),
            },
            {
              type: "input",
              name: "email",
              message: "Let's Encrypt Email Address:",
              default: globalOpts.email || "admin@example.com",
              when: !email,
            },
            {
              type: "confirm",
              name: "isDns",
              message: "Use DNS Challenge (recommended for Wildcard certs)?",
              default: false,
              when: opts.dnsChallenge === undefined,
            },
          ]);

          if (answers.domains) {
            domains = answers.domains.split(",").map((d: string) => d.trim()).filter(Boolean);
          }
          if (answers.email) email = answers.email;
          if (answers.isDns !== undefined) isDns = answers.isDns;
        }

        let dnsProvider = opts.dnsProvider;
        let dnsCredentials = opts.dnsCredentials;

        if (isDns && (!dnsProvider || !dnsCredentials)) {
          const dnsAnswers = await inquirer.prompt([
            {
              type: "list",
              name: "dnsProvider",
              message: "DNS Provider:",
              choices: [
                "cloudflare",
                "route53",
                "digitalocean",
                "duckdns",
                "ovh",
                "hetzner",
                "namecheap",
                "other",
              ],
              when: !dnsProvider,
            },
            {
              type: "editor",
              name: "dnsCredentials",
              message: "Enter DNS credentials (e.g. dns_cloudflare_api_token = xxx):",
              when: !dnsCredentials,
            },
          ]);
          if (dnsAnswers.dnsProvider) dnsProvider = dnsAnswers.dnsProvider;
          if (dnsAnswers.dnsCredentials) dnsCredentials = dnsAnswers.dnsCredentials;
        }

        const cert = await withSpinner(
          `Requesting Let's Encrypt certificate for ${domains.join(", ")}... (this may take up to a minute)`,
          async () => {
            return await manager.certs.createLetsEncrypt({
              domain_names: domains,
              meta: {
                letsencrypt_email: email,
                letsencrypt_agree: true,
                dns_challenge: isDns,
                dns_provider: dnsProvider,
                dns_provider_credentials: dnsCredentials,
                propagation_seconds: opts.propagationSeconds || 0,
              },
            });
          },
          `Let's Encrypt certificate created successfully!`
        );

        logger.raw(formatOutput(cert, "yaml"));
      } catch (err: any) {
        logger.error("Failed to create Let's Encrypt certificate", err);
        process.exit(1);
      }
    });

  // UPLOAD CUSTOM CERTIFICATE
  certs
    .command("upload-custom")
    .description("Upload custom SSL certificate files")
    .requiredOption("-n, --name <name>", "Nice name for this certificate")
    .requiredOption("-c, --cert <path>", "Path to certificate file (cert.pem / fullchain.pem)")
    .requiredOption("-k, --key <path>", "Path to private key file (privkey.pem / key.pem)")
    .option("-i, --intermediate <path>", "Path to intermediate / chain certificate file")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        if (!fs.existsSync(opts.cert)) {
          throw new Error(`Certificate file not found: ${opts.cert}`);
        }
        if (!fs.existsSync(opts.key)) {
          throw new Error(`Private key file not found: ${opts.key}`);
        }

        const cert = await withSpinner(
          `Uploading custom certificate '${opts.name}'...`,
          async () => {
            return await manager.certs.createCustom({
              nice_name: opts.name,
              certificate: opts.cert,
              certificate_key: opts.key,
              intermediate_certificate: opts.intermediate,
            });
          },
          `Custom certificate '${opts.name}' uploaded successfully!`
        );

        logger.raw(formatOutput(cert, "yaml"));
      } catch (err: any) {
        logger.error("Failed to upload custom certificate", err);
        process.exit(1);
      }
    });

  // RENEW
  certs
    .command("renew <id>")
    .description("Renew a Let's Encrypt certificate")
    .action(async (idStr, _, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);
        const id = parseInt(idStr, 10);

        await withSpinner(
          `Renewing certificate #${id}...`,
          async () => {
            return await manager.certs.renew(id);
          },
          `Certificate #${id} renewed successfully!`
        );
      } catch (err: any) {
        logger.error(`Failed to renew certificate #${idStr}`, err);
        process.exit(1);
      }
    });

  // DELETE
  certs
    .command("delete <id>")
    .description("Delete a certificate by ID")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (idStr, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);
        const id = parseInt(idStr, 10);

        if (!opts.yes) {
          const answer = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message: `Are you sure you want to delete certificate #${id}?`,
              default: false,
            },
          ]);
          if (!answer.confirm) {
            logger.info("Operation cancelled.");
            return;
          }
        }

        await withSpinner(`Deleting certificate #${id}...`, async () => {
          return await manager.certs.delete(id);
        });

        logger.success(`Certificate #${id} deleted successfully.`);
      } catch (err: any) {
        logger.error(`Failed to delete certificate #${idStr}`, err);
        process.exit(1);
      }
    });
}
