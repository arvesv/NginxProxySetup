import type { NpmApiClient } from "./api-client.js";
import type { AccessList, AccessListCreatePayload } from "../types/npm.js";

export class AccessListsClient {
  constructor(private client: NpmApiClient) {}

  /**
   * List all access lists
   */
  public async list(expand = "owner,items,clients"): Promise<AccessList[]> {
    return this.client.request<AccessList[]>({
      method: "GET",
      url: "/nginx/access-lists",
      params: { expand },
    });
  }

  /**
   * Get access list by ID
   */
  public async get(id: number, expand = "owner,items,clients"): Promise<AccessList> {
    return this.client.request<AccessList>({
      method: "GET",
      url: `/nginx/access-lists/${id}`,
      params: { expand },
    });
  }

  /**
   * Find access list by name
   */
  public async findByName(name: string): Promise<AccessList | undefined> {
    const all = await this.list();
    const clean = name.toLowerCase().trim();
    return all.find((a) => a.name?.toLowerCase().trim() === clean);
  }

  /**
   * Create an access list
   */
  public async create(payload: AccessListCreatePayload): Promise<AccessList> {
    const body = {
      name: payload.name,
      satisfy_any: payload.satisfy_any ? 1 : 0,
      pass_auth: payload.pass_auth ? 1 : 0,
      items: payload.items || [],
      clients: payload.clients || [],
      meta: payload.meta || {},
    };

    return this.client.request<AccessList>({
      method: "POST",
      url: "/nginx/access-lists",
      data: body,
    });
  }

  /**
   * Delete an access list
   */
  public async delete(id: number): Promise<boolean> {
    return this.client.request<boolean>({
      method: "DELETE",
      url: `/nginx/access-lists/${id}`,
    });
  }
}
