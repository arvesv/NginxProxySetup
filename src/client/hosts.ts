import type { NpmApiClient } from "./api-client.js";
import type {
  ProxyHost,
  ProxyHostCreatePayload,
  ProxyHostUpdatePayload,
} from "../types/npm.js";

export class HostsClient {
  constructor(private client: NpmApiClient) {}

  /**
   * List all proxy hosts
   */
  public async list(expand = "owner,access_list,certificate"): Promise<ProxyHost[]> {
    return this.client.request<ProxyHost[]>({
      method: "GET",
      url: "/nginx/proxy-hosts",
      params: { expand },
    });
  }

  /**
   * Get single proxy host by ID
   */
  public async get(id: number, expand = "owner,access_list,certificate"): Promise<ProxyHost> {
    return this.client.request<ProxyHost>({
      method: "GET",
      url: `/nginx/proxy-hosts/${id}`,
      params: { expand },
    });
  }

  /**
   * Find proxy host by domain name
   */
  public async findByDomain(domain: string): Promise<ProxyHost | undefined> {
    const all = await this.list();
    const cleanDomain = domain.toLowerCase().trim();
    return all.find((h) =>
      h.domain_names.some((d) => d.toLowerCase().trim() === cleanDomain)
    );
  }

  /**
   * Create a new proxy host
   */
  public async create(payload: ProxyHostCreatePayload): Promise<ProxyHost> {
    // Normalise default values required by NPM
    const body: any = {
      domain_names: payload.domain_names,
      forward_scheme: payload.forward_scheme || "http",
      forward_host: payload.forward_host,
      forward_port: payload.forward_port,
      certificate_id: payload.certificate_id || 0,
      ssl_forced: payload.ssl_forced ? 1 : 0,
      hsts_enabled: payload.hsts_enabled ? 1 : 0,
      hsts_subdomains: payload.hsts_subdomains ? 1 : 0,
      http2_support: payload.http2_support !== undefined ? (payload.http2_support ? 1 : 0) : 1,
      block_exploits: payload.block_exploits !== undefined ? (payload.block_exploits ? 1 : 0) : 1,
      caching_enabled: payload.caching_enabled ? 1 : 0,
      allow_websocket_upgrade: payload.allow_websocket_upgrade !== undefined ? (payload.allow_websocket_upgrade ? 1 : 0) : 1,
      access_list_id: payload.access_list_id || 0,
      advanced_config: payload.advanced_config || "",
      enabled: payload.enabled !== undefined ? (payload.enabled ? 1 : 0) : 1,
      meta: payload.meta || { letsencrypt_agree: false, dns_challenge: false },
      locations: payload.locations || [],
    };

    return this.client.request<ProxyHost>({
      method: "POST",
      url: "/nginx/proxy-hosts",
      data: body,
    });
  }

  /**
   * Update an existing proxy host
   */
  public async update(id: number, payload: ProxyHostUpdatePayload): Promise<ProxyHost> {
    // Fetch existing first to merge seamlessly
    const current = await this.get(id);

    const merged = {
      domain_names: payload.domain_names || current.domain_names,
      forward_scheme: payload.forward_scheme || current.forward_scheme,
      forward_host: payload.forward_host || current.forward_host,
      forward_port: payload.forward_port || current.forward_port,
      certificate_id:
        payload.certificate_id !== undefined ? payload.certificate_id : current.certificate_id,
      ssl_forced:
        payload.ssl_forced !== undefined ? (payload.ssl_forced ? 1 : 0) : (current.ssl_forced ? 1 : 0),
      hsts_enabled:
        payload.hsts_enabled !== undefined ? (payload.hsts_enabled ? 1 : 0) : (current.hsts_enabled ? 1 : 0),
      hsts_subdomains:
        payload.hsts_subdomains !== undefined ? (payload.hsts_subdomains ? 1 : 0) : (current.hsts_subdomains ? 1 : 0),
      http2_support:
        payload.http2_support !== undefined ? (payload.http2_support ? 1 : 0) : (current.http2_support ? 1 : 0),
      block_exploits:
        payload.block_exploits !== undefined ? (payload.block_exploits ? 1 : 0) : (current.block_exploits ? 1 : 0),
      caching_enabled:
        payload.caching_enabled !== undefined ? (payload.caching_enabled ? 1 : 0) : (current.caching_enabled ? 1 : 0),
      allow_websocket_upgrade:
        payload.allow_websocket_upgrade !== undefined
          ? (payload.allow_websocket_upgrade ? 1 : 0)
          : (current.allow_websocket_upgrade ? 1 : 0),
      access_list_id:
        payload.access_list_id !== undefined ? payload.access_list_id : current.access_list_id,
      advanced_config:
        payload.advanced_config !== undefined ? payload.advanced_config : current.advanced_config,
      enabled:
        payload.enabled !== undefined ? (payload.enabled ? 1 : 0) : (current.enabled ? 1 : 0),
      meta: payload.meta || current.meta || {},
      locations: payload.locations !== undefined ? payload.locations : current.locations || [],
    };

    return this.client.request<ProxyHost>({
      method: "PUT",
      url: `/nginx/proxy-hosts/${id}`,
      data: merged,
    });
  }

  /**
   * Delete a proxy host by ID
   */
  public async delete(id: number): Promise<boolean> {
    return this.client.request<boolean>({
      method: "DELETE",
      url: `/nginx/proxy-hosts/${id}`,
    });
  }

  /**
   * Enable a proxy host
   */
  public async enable(id: number): Promise<boolean> {
    return this.client.request<boolean>({
      method: "POST",
      url: `/nginx/proxy-hosts/${id}/enable`,
    });
  }

  /**
   * Disable a proxy host
   */
  public async disable(id: number): Promise<boolean> {
    return this.client.request<boolean>({
      method: "POST",
      url: `/nginx/proxy-hosts/${id}/disable`,
    });
  }
}
