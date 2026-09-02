import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { TokenResponse, NpmUser } from "../types/npm.js";

export interface NpmClientConfig {
  baseUrl: string;
  token?: string;
  email?: string;
  password?: string;
  timeout?: number;
}

export class NpmApiClient {
  private axiosInstance: AxiosInstance;
  public baseUrl: string;
  private token?: string;
  private email?: string;
  private password?: string;

  constructor(config: NpmClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.token = config.token;
    this.email = config.email;
    this.password = config.password;

    this.axiosInstance = axios.create({
      baseURL: `${this.baseUrl}/api`,
      timeout: config.timeout || 60000, // Let's Encrypt DNS or HTTP challenges can take up to 60s
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.axiosInstance.interceptors.request.use((reqConfig) => {
      if (this.token) {
        reqConfig.headers.Authorization = `Bearer ${this.token}`;
      }
      return reqConfig;
    });
  }

  public setToken(token: string) {
    this.token = token;
  }

  public getToken(): string | undefined {
    return this.token;
  }

  /**
   * Authenticates with Nginx Proxy Manager and saves token internally
   */
  public async login(email?: string, password?: string): Promise<TokenResponse> {
    const identity = email || this.email;
    const secret = password || this.password;

    if (!identity || !secret) {
      throw new Error("Missing email or password for NPM authentication.");
    }

    const response = await this.axiosInstance.post<TokenResponse>("/tokens", {
      identity,
      secret,
    });

    this.token = response.data.token;
    this.email = identity;
    this.password = secret;
    return response.data;
  }

  /**
   * Ensure the client has an active token, logging in if necessary
   */
  public async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      if (this.email && this.password) {
        await this.login(this.email, this.password);
      } else {
        throw new Error(
          "Not authenticated. Please run 'npm-cli login' or specify NPM_TOKEN / NPM_EMAIL and NPM_PASSWORD."
        );
      }
    }
  }

  /**
   * Test connection and retrieve current authenticated user/status
   */
  public async getStatus(): Promise<{ user: NpmUser; version?: string }> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get<NpmUser>("/users/me");
    return { user: response.data };
  }

  /**
   * Generic request method with automatic re-auth retry on 401
   */
  public async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    await this.ensureAuthenticated();
    try {
      const response = await this.axiosInstance.request<T>(config);
      return response.data;
    } catch (error: any) {
      // If unauthorized and we have credentials, try refreshing token once
      if (error.response?.status === 401 && this.email && this.password) {
        await this.login(this.email, this.password);
        const retryResponse = await this.axiosInstance.request<T>(config);
        return retryResponse.data;
      }
      throw error;
    }
  }
}
