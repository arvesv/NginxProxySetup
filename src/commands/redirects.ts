import { Command } from "commander";
import inquirer from "inquirer";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { formatOutput, formatRedirectionsTable } from "../utils/formatter.js";
import { withSpinner } from "../utils/spinner.js";

export function registerRedirectsCommands(program: Command) {
  const redirects = program.command("redirects").description("Manage HTTP Redirection Hosts (301/302)");

  // LIST
  redirects
    .command("list")
    .description("List all redirection hosts")
    .option("-f, --format <format>", "Output format (table, json, yaml)", "table")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const list = await withSpinner("Fetching redirection hosts...", async () => {
          return await manager.redirects.list();
        });

        logger.raw(
          formatOutput(list, opts.format, () => formatRedirectionsTable(list))
        );
      } catch (err: any) {
        logger.error("Failed to list redirection hosts", err);
        process.exit(1);
      }
    });

  // CREATE
  redirects
    .command("create")
    .description("Create a new redirection host")
    .requiredOption("-d, --domain <domains...>", "Domain name(s) to redirect from")
    .requiredOption("-t, --target <domain>", "Target domain name to redirect to (e.g. newdomain.com)")
    .option("-c, --code <code>", "HTTP redirect status code (301, 302, 307, 308)", parseInt, 301)
    .option("-s, --scheme <scheme>", "Forward scheme (http, https, auto)", "https")
    .option("--preserve-path", "Preserve URL path in redirection", true)
    .option("--cert-id <id>", "SSL Certificate ID", parseInt)
    .option("--force-ssl", "Force SSL", true)
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const created = await withSpinner(
          `Creating redirection for ${opts.domain.join(", ")} -> ${opts.target}...`,
          async () => {
            return await manager.redirects.create({
              domain_names: opts.domain,
              forward_domain_name: opts.target,
              forward_http_code: opts.code,
              forward_scheme: opts.scheme,
              preserve_path: Boolean(opts.preservePath),
              certificate_id: opts.certId || 0,
              ssl_forced: Boolean(opts.forceSsl && opts.certId),
            });
          },
          `Redirection created successfully!`
        );

        logger.raw(formatOutput(created, "yaml"));
      } catch (err: any) {
        logger.error("Failed to create redirection host", err);
        process.exit(1);
      }
    });

  // DELETE
  redirects
    .command("delete <id>")
    .description("Delete a redirection host by ID")
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
              message: `Are you sure you want to delete redirection host #${id}?`,
              default: false,
            },
          ]);
          if (!answer.confirm) return;
        }

        await withSpinner(`Deleting redirection host #${id}...`, async () => {
          return await manager.redirects.delete(id);
        });

        logger.success(`Redirection host #${id} deleted.`);
      } catch (err: any) {
        logger.error(`Failed to delete redirection host #${idStr}`, err);
        process.exit(1);
      }
    });
}
