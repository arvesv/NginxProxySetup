import type { NpmApiClient } from "./api-client.js";
import type { Stream, StreamCreatePayload } from "../types/npm.js";

export class StreamsClient {
  constructor(private client: NpmApiClient) {}

  /**
   * List all streams
   */
  public async list(expand = "owner"): Promise<Stream[]> {
    return this.client.request<Stream[]>({
      method: "GET",
      url: "/nginx/streams",
      params: { expand },
    });
  }

  /**
   * Get stream by ID
   */
  public async get(id: number, expand = "owner"): Promise<Stream> {
    return this.client.request<Stream>({
      method: "GET",
      url: `/nginx/streams/${id}`,
      params: { expand },
    });
  }

  /**
   * Create a new stream forwarding
   */
  public async create(payload: StreamCreatePayload): Promise<Stream> {
    const body = {
      incoming_port: payload.incoming_port,
      forwarding_host: payload.forwarding_host,
      forwarding_port: payload.forwarding_port,
      tcp_forwarding: payload.tcp_forwarding !== undefined ? (payload.tcp_forwarding ? 1 : 0) : 1,
      udp_forwarding: payload.udp_forwarding !== undefined ? (payload.udp_forwarding ? 1 : 0) : 0,
      enabled: payload.enabled !== undefined ? (payload.enabled ? 1 : 0) : 1,
    };

    return this.client.request<Stream>({
      method: "POST",
      url: "/nginx/streams",
      data: body,
    });
  }

  /**
   * Delete a stream
   */
  public async delete(id: number): Promise<boolean> {
    return this.client.request<boolean>({
      method: "DELETE",
      url: `/nginx/streams/${id}`,
    });
  }
}
