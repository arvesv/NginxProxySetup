import { ConfigManager } from "../config/store.js";
import { NginxProxyManager } from "../index.js";

export interface GlobalCliOptions {
  url?: string;
  token?: string;
  email?: string;
  password?: string;
  profile?: string;
}

export function createManagerFromOptions(opts: GlobalCliOptions): NginxProxyManager {
  const creds = ConfigManager.getResolvedCredentials({
    url: opts.url,
    token: opts.token,
    email: opts.email,
    password: opts.password,
    profile: opts.profile,
  });

  return new NginxProxyManager({
    baseUrl: creds.url,
    token: creds.token,
    email: creds.email,
    password: creds.password,
  });
}
