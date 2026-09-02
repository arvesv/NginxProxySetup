import { describe, it, expect } from "vitest";
import {
  formatProxyHostsTable,
  formatCertificatesTable,
  formatAccessListsTable,
} from "../src/utils/formatter.js";
import type { ProxyHost, Certificate, AccessList } from "../src/types/npm.js";

describe("CLI Formatters", () => {
  it("should format proxy hosts table", () => {
    const mockHosts: ProxyHost[] = [
      {
        id: 1,
        created_on: "2026-01-01",
        modified_on: "2026-01-01",
        owner_user_id: 1,
        domain_names: ["app.example.com"],
        forward_host: "192.168.1.100",
        forward_port: 8080,
        forward_scheme: "http",
        certificate_id: 1,
        ssl_forced: 1,
        hsts_enabled: 0,
        hsts_subdomains: 0,
        http2_support: 1,
        block_exploits: 1,
        caching_enabled: 0,
        allow_websocket_upgrade: 1,
        access_list_id: 0,
        advanced_config: "",
        enabled: 1,
      },
    ];

    const tableStr = formatProxyHostsTable(mockHosts);
    expect(tableStr).toContain("app.example.com");
    expect(tableStr).toContain("http://192.168.1.100:8080");
    expect(tableStr).toContain("Active");
  });

  it("should format certificates table", () => {
    const mockCerts: Certificate[] = [
      {
        id: 1,
        created_on: "2026-01-01",
        modified_on: "2026-01-01",
        owner_user_id: 1,
        provider: "letsencrypt",
        nice_name: "wildcard",
        domain_names: ["*.example.com", "example.com"],
        expires_on: "2026-12-31",
      },
    ];

    const tableStr = formatCertificatesTable(mockCerts);
    expect(tableStr).toContain("*.example.com");
    expect(tableStr).toContain("Let's Encrypt");
  });

  it("should format access lists table", () => {
    const mockAccess: AccessList[] = [
      {
        id: 1,
        created_on: "2026-01-01",
        modified_on: "2026-01-01",
        owner_user_id: 1,
        name: "Admin IP Whitelist",
        satisfy_any: 0,
        pass_auth: 0,
        items: [{ address: "192.168.1.0/24", directive: "allow" }],
        clients: [{ username: "admin" }],
      },
    ];

    const tableStr = formatAccessListsTable(mockAccess);
    expect(tableStr).toContain("Admin IP Whitelist");
    expect(tableStr).toContain("1 rules");
    expect(tableStr).toContain("1 users");
  });
});
