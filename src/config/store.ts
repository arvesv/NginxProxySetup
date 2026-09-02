import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import dotenv from "dotenv";
import type { CliConfigStore, ProfileConfig } from "../types/cli.js";

// Load local .env if available
dotenv.config();

const CONFIG_DIR = path.join(os.homedir(), ".npm-cli");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export class ConfigManager {
  private static ensureDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  public static loadStore(): CliConfigStore {
    try {
      this.ensureDir();
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // ignore parse errors and fallback
    }

    return {
      activeProfile: "default",
      profiles: {
        default: {},
      },
    };
  }

  public static saveStore(store: CliConfigStore) {
    this.ensureDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(store, null, 2), "utf-8");
  }

  public static getActiveProfileName(): string {
    return process.env.NPM_PROFILE || this.loadStore().activeProfile || "default";
  }

  public static getProfile(name?: string): ProfileConfig {
    const store = this.loadStore();
    const profileName = name || this.getActiveProfileName();
    return store.profiles[profileName] || {};
  }

  public static saveProfile(name: string, config: Partial<ProfileConfig>) {
    const store = this.loadStore();
    if (!store.profiles[name]) {
      store.profiles[name] = {};
    }
    store.profiles[name] = { ...store.profiles[name], ...config };
    store.activeProfile = name;
    this.saveStore(store);
  }

  public static deleteProfile(name: string) {
    const store = this.loadStore();
    delete store.profiles[name];
    if (store.activeProfile === name) {
      store.activeProfile = Object.keys(store.profiles)[0] || "default";
    }
    this.saveStore(store);
  }

  public static getResolvedCredentials(options?: {
    url?: string;
    token?: string;
    email?: string;
    password?: string;
    profile?: string;
  }): {
    url: string;
    token?: string;
    email?: string;
    password?: string;
  } {
    const profile = this.getProfile(options?.profile);

    const url =
      options?.url ||
      process.env.NPM_URL ||
      profile.url ||
      "http://localhost:81";

    const token =
      options?.token ||
      process.env.NPM_TOKEN ||
      profile.token;

    const email =
      options?.email ||
      process.env.NPM_EMAIL ||
      profile.email;

    const password =
      options?.password ||
      process.env.NPM_PASSWORD ||
      profile.password;

    return {
      url: url.replace(/\/+$/, ""), // strip trailing slashes
      token,
      email,
      password,
    };
  }
}
