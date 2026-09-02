import { Command } from "commander";
import { registerAuthCommands } from "../src/commands/auth.js";
import { registerHostsCommands } from "../src/commands/hosts.js";
import { registerCertsCommands } from "../src/commands/certs.js";
import { registerAccessCommands } from "../src/commands/access.js";
import { registerStreamsCommands } from "../src/commands/streams.js";
import { registerRedirectsCommands } from "../src/commands/redirects.js";
import { registerExportCommands } from "../src/commands/export.js";
import { registerApplyCommands } from "../src/commands/apply.js";

const program = new Command();

program
  .name("npm-cli")
  .description("A powerful TypeScript CLI and SDK for Nginx Proxy Manager (NPM)")
  .version("1.0.0")
  .option("-u, --url <url>", "NPM base URL (overrides config / NPM_URL)")
  .option("-t, --token <token>", "NPM Bearer JWT token (overrides config / NPM_TOKEN)")
  .option("-e, --email <email>", "NPM User email for auto-authentication")
  .option("-p, --password <password>", "NPM User password for auto-authentication")
  .option("--profile <profile>", "NPM configuration profile name");

// Register all command groups
registerAuthCommands(program);
registerHostsCommands(program);
registerCertsCommands(program);
registerAccessCommands(program);
registerStreamsCommands(program);
registerRedirectsCommands(program);
registerExportCommands(program);
registerApplyCommands(program);

program.parseAsync(process.argv).catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
