import { describe, it, expect, vi } from "vitest";
import { NpmApiClient } from "../src/client/api-client.js";
import { NginxProxyManager } from "../src/index.js";

describe("NginxProxyManager Client Setup", () => {
  it("should initialize subclients properly", () => {
    const manager = new NginxProxyManager({
      baseUrl: "http://localhost:81",
      email: "admin@example.com",
      password: "testpassword",
    });

    expect(manager.api.baseUrl).toBe("http://localhost:81");
    expect(manager.hosts).toBeDefined();
    expect(manager.certs).toBeDefined();
    expect(manager.accessLists).toBeDefined();
    expect(manager.streams).toBeDefined();
    expect(manager.redirects).toBeDefined();
  });

  it("should strip trailing slashes from baseUrl", () => {
    const client = new NpmApiClient({
      baseUrl: "http://my-npm-instance.local:81///",
    });

    expect(client.baseUrl).toBe("http://my-npm-instance.local:81");
  });

  it("should store and update token", () => {
    const client = new NpmApiClient({
      baseUrl: "http://localhost:81",
    });

    expect(client.getToken()).toBeUndefined();
    client.setToken("mock-jwt-token");
    expect(client.getToken()).toBe("mock-jwt-token");
  });
});
