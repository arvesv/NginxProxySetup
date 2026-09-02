import type { NpmApiClient } from "./api-client.js";
import type { RedirectionHost, RedirectionHostCreatePayload } from "../types/npm.js";

export class RedirectsClient {
  constructor(private client: NpmApiClient) {}

  /**
   * List all redirection hosts
   */
  public async list(expand = "owner,certificate"): Promise<RedirectionHost[]> {
    return this.client.request<RedirectionHost[]>({
      method: "GET",
      url: "/nginx/redirection-hosts",
      params: { expand },
    });
  }

  /**
   * Get redirection host by ID
   */
  public async get(id: number, expand = "owner,certificate"): Promise<RedirectionHost> {
    return this.client.request<RedirectionHost>({
      method: "GET",
      url: `/nginx/redirection-hosts/${id}`,
      params: { expand },
    });
  }

  /**
   * Create a new redirection host
   */
  public async create(payload: RedirectionHostCreatePayload): Promise<RedirectionHost> {
    const body = {
      domain_names: payload.domain_names,
      forward_http_code: payload.forward_http_code || 301,
      forward_scheme: payload.forward_scheme || "https",
      forward_domain_name: payload.forward_domain_name,
      preserve_path: payload.preserve_path !== undefined ? (payload.preserve_path ? 1 : 0) : 1,
      certificate_id: payload.certificate_id || 0,
      ssl_forced: payload.ssl_forced ? 1 : 0,
      hsts_enabled: payload.hsts_enabled ? 1 : 0,
      hsts_subdomains: payload.hsts_subdomains ? 1 : 0,
      http2_support: payload.http2_support !== undefined ? (payload.http2_support ? 1 : 0) : 1,
      block_exploits: payload.block_exploits !== undefined ? (payload.block_exploits ? 1 : 0) : 1,
      advanced_config: payload.advanced_config || "",
      enabled: payload.enabled !== undefined ? (payload.enabled ? 1 : 0) : 1,
    };

    return this.client.request<RedirectionHost>({
      method: "POST",
      url: "/nginx/redirection-hosts",
      data: body,
    });
  }

  /**
   * Delete a redirection host
   */
  public async delete(id: number): Promise<boolean> {
    return this.client.request<boolean>({
      method: "DELETE",
      url: `/nginx/redirection-hosts/${id}`,
    });
  }
}
