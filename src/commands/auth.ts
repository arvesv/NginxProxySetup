import { Command } from "commander";
import inquirer from "inquirer";
import { ConfigManager } from "../config/store.js";
import { createManagerFromOptions, type GlobalCliOptions } from "./common.js";
import { logger } from "../utils/logger.js";
import { withSpinner } from "../utils/spinner.js";

export function registerAuthCommands(program: Command) {
  program
    .command("login")
    .description("Authenticate with Nginx Proxy Manager and save credentials/token")
    .option("-u, --url <url>", "Nginx Proxy Manager base URL (e.g. http://192.168.1.100:81)")
    .option("-e, --email <email>", "User login email")
    .option("-p, --password <password>", "User password")
    .option("--save-creds", "Also persist email & password in local config for auto-reauth", true)
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const currentProfile = ConfigManager.getActiveProfileName();
        const stored = ConfigManager.getProfile(globalOpts.profile);

        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "url",
            message: "Nginx Proxy Manager URL:",
            default: opts.url || stored.url || process.env.NPM_URL || "http://localhost:81",
            when: !opts.url,
          },
          {
            type: "input",
            name: "email",
            message: "Admin Email:",
            default: opts.email || stored.email || process.env.NPM_EMAIL || "admin@example.com",
            when: !opts.email,
          },
          {
            type: "password",
            name: "password",
            message: "Password:",
            when: !opts.password,
          },
        ]);

        const url = (opts.url || answers.url || "http://localhost:81").replace(/\/+$/, "");
        const email = opts.email || answers.email;
        const password = opts.password || answers.password;

        const manager = createManagerFromOptions({
          url,
          email,
          password,
          profile: globalOpts.profile,
        });

        const tokenResp = await withSpinner("Authenticating with NPM...", async () => {
          return await manager.api.login(email, password);
        });

        const profileToSave = globalOpts.profile || currentProfile;
        ConfigManager.saveProfile(profileToSave, {
          url,
          token: tokenResp.token,
          tokenExpires: tokenResp.expires,
          ...(opts.saveCreds ? { email, password } : {}),
        });

        logger.success(`Logged in successfully to ${url}! Profile: [${profileToSave}]`);
      } catch (err: any) {
        logger.error("Login failed", err);
        process.exit(1);
      }
    });

  program
    .command("logout")
    .description("Clear stored token and session for the active profile")
    .action(() => {
      const active = ConfigManager.getActiveProfileName();
      ConfigManager.saveProfile(active, {
        token: undefined,
        tokenExpires: undefined,
      });
      logger.success(`Logged out from profile [${active}].`);
    });

  program
    .command("status")
    .description("Check NPM connection status and current user")
    .action(async (_, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals() as GlobalCliOptions;
        const manager = createManagerFromOptions(globalOpts);

        const status = await withSpinner("Connecting to NPM...", async () => {
          return await manager.api.getStatus();
        });

        logger.title("Nginx Proxy Manager Status");
        logger.raw(`  Connected to: ${manager.api.baseUrl}`);
        logger.raw(`  Authenticated user: ${status.user.name || status.user.nickname} (${status.user.email})`);
        logger.raw(`  Roles: ${status.user.roles.join(", ")}`);
        logger.raw(`  User ID: ${status.user.id}`);
      } catch (err: any) {
        logger.error("Failed to connect to NPM", err);
        process.exit(1);
      }
    });
}
