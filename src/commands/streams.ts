import { Command } from "commander";
import inquirer from "inquirer";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { formatOutput, formatStreamsTable } from "../utils/formatter.js";
import { withSpinner } from "../utils/spinner.js";

export function registerStreamsCommands(program: Command) {
  const streams = program.command("streams").description("Manage TCP/UDP stream forwardings");

  // LIST
  streams
    .command("list")
    .description("List all streams")
    .option("-f, --format <format>", "Output format (table, json, yaml)", "table")
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const list = await withSpinner("Fetching streams...", async () => {
          return await manager.streams.list();
        });

        logger.raw(
          formatOutput(list, opts.format, () => formatStreamsTable(list))
        );
      } catch (err: any) {
        logger.error("Failed to list streams", err);
        process.exit(1);
      }
    });

  // CREATE
  streams
    .command("create")
    .description("Create a new stream forwarding")
    .requiredOption("-i, --in-port <port>", "Incoming port on NPM", parseInt)
    .requiredOption("-f, --forward-host <host>", "Target host/IP")
    .requiredOption("-p, --forward-port <port>", "Target port", parseInt)
    .option("--tcp", "Enable TCP forwarding", true)
    .option("--no-tcp", "Disable TCP forwarding")
    .option("--udp", "Enable UDP forwarding", false)
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const created = await withSpinner(
          `Creating stream on port ${opts.inPort} -> ${opts.forwardHost}:${opts.forwardPort}...`,
          async () => {
            return await manager.streams.create({
              incoming_port: opts.inPort,
              forwarding_host: opts.forwardHost,
              forwarding_port: opts.forwardPort,
              tcp_forwarding: Boolean(opts.tcp),
              udp_forwarding: Boolean(opts.udp),
            });
          },
          `Stream on port ${opts.inPort} created successfully!`
        );

        logger.raw(formatOutput(created, "yaml"));
      } catch (err: any) {
        logger.error("Failed to create stream", err);
        process.exit(1);
      }
    });

  // DELETE
  streams
    .command("delete <id>")
    .description("Delete a stream by ID")
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
              message: `Are you sure you want to delete stream #${id}?`,
              default: false,
            },
          ]);
          if (!answer.confirm) return;
        }

        await withSpinner(`Deleting stream #${id}...`, async () => {
          return await manager.streams.delete(id);
        });

        logger.success(`Stream #${id} deleted.`);
      } catch (err: any) {
        logger.error(`Failed to delete stream #${idStr}`, err);
        process.exit(1);
      }
    });
}
