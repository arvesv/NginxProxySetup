import { Command } from "commander";
import inquirer from "inquirer";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { formatOutput, formatAccessListsTable } from "../utils/formatter.js";
import { withSpinner } from "../utils/spinner.js";

export function registerAccessCommands(program: Command) {
  const access = program.command("access").description("Manage NPM Access Lists (IP whitelist/auth)");

  // LIST
  access
    .command("list")
    .description("List all access lists")
    .option("-f, --format <format>", "Output format (table, json, yaml)", "table")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const list = await withSpinner("Fetching access lists...", async () => {
          return await manager.accessLists.list();
        });

        logger.raw(
          formatOutput(list, opts.format, () => formatAccessListsTable(list))
        );
      } catch (err: any) {
        logger.error("Failed to list access lists", err);
        process.exit(1);
      }
    });

  // CREATE
  access
    .command("create")
    .description("Create a new access list")
    .option("-n, --name <name>", "Access list name")
    .option("--allow <ips...>", "IP addresses / CIDR ranges to allow (e.g. 192.168.1.0/24 10.0.0.1)")
    .option("--deny <ips...>", "IP addresses / CIDR ranges to deny")
    .option("--user <user:pass...>", "HTTP Basic auth user in username:password format")
    .option("--satisfy-any", "Satisfy any rule (IP or HTTP Basic auth)", false)
    .option("--pass-auth", "Pass Authorization header to target host", false)
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        let name = opts.name;
        if (!name) {
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Access List Name:",
              validate: (i) => (i.trim().length > 0 ? true : "Name is required"),
            },
          ]);
          name = answer.name;
        }

        const items: { address: string; directive: "allow" | "deny" }[] = [];
        if (opts.allow) {
          for (const ip of opts.allow) {
            items.push({ address: ip, directive: "allow" });
          }
        }
        if (opts.deny) {
          for (const ip of opts.deny) {
            items.push({ address: ip, directive: "deny" });
          }
        }

        const clients: { username: string; password?: string }[] = [];
        if (opts.user) {
          for (const userStr of opts.user) {
            const [username, password] = userStr.split(":");
            clients.push({ username, password: password || "" });
          }
        }

        const created = await withSpinner(
          `Creating access list '${name}'...`,
          async () => {
            return await manager.accessLists.create({
              name,
              satisfy_any: Boolean(opts.satisfyAny),
              pass_auth: Boolean(opts.passAuth),
              items,
              clients,
            });
          },
          `Access list '${name}' created successfully!`
        );

        logger.raw(formatOutput(created, "yaml"));
      } catch (err: any) {
        logger.error("Failed to create access list", err);
        process.exit(1);
      }
    });

  // DELETE
  access
    .command("delete <id>")
    .description("Delete an access list by ID")
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
              message: `Are you sure you want to delete access list #${id}?`,
              default: false,
            },
          ]);
          if (!answer.confirm) return;
        }

        await withSpinner(`Deleting access list #${id}...`, async () => {
          return await manager.accessLists.delete(id);
        });

        logger.success(`Access list #${id} deleted.`);
      } catch (err: any) {
        logger.error(`Failed to delete access list #${idStr}`, err);
        process.exit(1);
      }
    });
}
