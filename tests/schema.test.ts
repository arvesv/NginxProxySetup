import { describe, it, expect } from "vitest";
import { NpmDeclarativeConfigSchema } from "../src/types/config.js";
import fs from "node:fs";
import YAML from "yaml";

describe("Declarative Config Schema Validation", () => {
  it("should validate a valid configuration file", () => {
    const raw = fs.readFileSync("example.config.yaml", "utf-8");
    const parsedYaml = YAML.parse(raw);
    const result = NpmDeclarativeConfigSchema.safeParse(parsedYaml);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.proxy_hosts.length).toBe(2);
      expect(result.data.certificates.length).toBe(1);
      expect(result.data.access_lists.length).toBe(1);
      expect(result.data.streams.length).toBe(1);
      expect(result.data.redirections.length).toBe(1);
    }
  });

  it("should reject invalid port numbers in proxy hosts", () => {
    const invalidConfig = {
      proxy_hosts: [
        {
          domain_names: ["test.example.com"],
          forward_scheme: "http",
          forward_host: "10.0.0.1",
          forward_port: 999999, // invalid port (>65535)
        },
      ],
    };

    const result = NpmDeclarativeConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it("should reject empty domain names list", () => {
    const invalidConfig = {
      proxy_hosts: [
        {
          domain_names: [],
          forward_scheme: "http",
          forward_host: "10.0.0.1",
          forward_port: 8080,
        },
      ],
    };

    const result = NpmDeclarativeConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
