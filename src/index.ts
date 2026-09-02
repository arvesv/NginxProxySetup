import { NpmApiClient, type NpmClientConfig } from "./client/api-client.js";
import { HostsClient } from "./client/hosts.js";
import { CertsClient } from "./client/certs.js";
import { AccessListsClient } from "./client/access-lists.js";
import { StreamsClient } from "./client/streams.js";
import { RedirectsClient } from "./client/redirects.js";

export class NginxProxyManager {
  public api: NpmApiClient;
  public hosts: HostsClient;
  public certs: CertsClient;
  public accessLists: AccessListsClient;
  public streams: StreamsClient;
  public redirects: RedirectsClient;

  constructor(config: NpmClientConfig) {
    this.api = new NpmApiClient(config);
    this.hosts = new HostsClient(this.api);
    this.certs = new CertsClient(this.api);
    this.accessLists = new AccessListsClient(this.api);
    this.streams = new StreamsClient(this.api);
    this.redirects = new RedirectsClient(this.api);
  }

  public static fromConfig(config: NpmClientConfig): NginxProxyManager {
    return new NginxProxyManager(config);
  }
}

export * from "./types/npm.js";
export * from "./types/config.js";
export * from "./types/cli.js";
export * from "./client/api-client.js";
export * from "./client/hosts.js";
export * from "./client/certs.js";
export * from "./client/access-lists.js";
export * from "./client/streams.js";
export * from "./client/redirects.js";
export * from "./config/store.js";
export * from "./utils/logger.js";
export * from "./utils/formatter.js";
export * from "./utils/spinner.js";
