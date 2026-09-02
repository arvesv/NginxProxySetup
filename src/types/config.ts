import { z } from "zod";

export const LocationConfigSchema = z.object({
  path: z.string(),
  forward_scheme: z.enum(["http", "https"]).default("http"),
  forward_host: z.string(),
  forward_port: z.number().int().min(1).max(65535),
  advanced_config: z.string().optional(),
});

export const ProxyHostConfigSchema = z.object({
  domain_names: z.array(z.string()).min(1),
  forward_scheme: z.enum(["http", "https"]).default("http"),
  forward_host: z.string(),
  forward_port: z.number().int().min(1).max(65535),
  certificate: z.string().optional(), // Certificate ID or name
  ssl_forced: z.boolean().default(true),
  hsts_enabled: z.boolean().default(false),
  hsts_subdomains: z.boolean().default(false),
  http2_support: z.boolean().default(true),
  block_exploits: z.boolean().default(true),
  caching_enabled: z.boolean().default(false),
  allow_websocket_upgrade: z.boolean().default(true),
  access_list: z.string().optional(), // Access list ID or name
  advanced_config: z.string().optional().default(""),
  enabled: z.boolean().default(true),
  locations: z.array(LocationConfigSchema).optional().default([]),
});

export const CertificateConfigSchema = z.object({
  name: z.string().optional(),
  provider: z.enum(["letsencrypt", "custom"]).default("letsencrypt"),
  domain_names: z.array(z.string()).min(1),
  letsencrypt_email: z.string().email().optional(),
  dns_challenge: z.boolean().default(false),
  dns_provider: z.string().optional(),
  dns_provider_credentials: z.string().optional(),
  // For custom certs
  certificate_path: z.string().optional(),
  key_path: z.string().optional(),
  intermediate_path: z.string().optional(),
});

export const AccessListConfigSchema = z.object({
  name: z.string(),
  satisfy_any: z.boolean().default(false),
  pass_auth: z.boolean().default(false),
  items: z
    .array(
      z.object({
        address: z.string(),
        directive: z.enum(["allow", "deny"]).default("allow"),
      })
    )
    .optional()
    .default([]),
  clients: z
    .array(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .optional()
    .default([]),
});

export const StreamConfigSchema = z.object({
  incoming_port: z.number().int().min(1).max(65535),
  forwarding_host: z.string(),
  forwarding_port: z.number().int().min(1).max(65535),
  tcp_forwarding: z.boolean().default(true),
  udp_forwarding: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const RedirectionConfigSchema = z.object({
  domain_names: z.array(z.string()).min(1),
  forward_http_code: z.number().default(301),
  forward_scheme: z.enum(["http", "https", "auto"]).default("https"),
  forward_domain_name: z.string(),
  preserve_path: z.boolean().default(true),
  certificate: z.string().optional(),
  ssl_forced: z.boolean().default(true),
  hsts_enabled: z.boolean().default(false),
  block_exploits: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export const NpmDeclarativeConfigSchema = z.object({
  version: z.string().optional().default("1.0"),
  settings: z
    .object({
      npm_url: z.string().url().optional(),
      default_email: z.string().email().optional(),
    })
    .optional(),
  certificates: z.array(CertificateConfigSchema).optional().default([]),
  access_lists: z.array(AccessListConfigSchema).optional().default([]),
  proxy_hosts: z.array(ProxyHostConfigSchema).optional().default([]),
  streams: z.array(StreamConfigSchema).optional().default([]),
  redirections: z.array(RedirectionConfigSchema).optional().default([]),
});

export type NpmDeclarativeConfig = z.infer<typeof NpmDeclarativeConfigSchema>;
export type ProxyHostConfig = z.infer<typeof ProxyHostConfigSchema>;
export type CertificateConfig = z.infer<typeof CertificateConfigSchema>;
export type AccessListConfig = z.infer<typeof AccessListConfigSchema>;
export type StreamConfig = z.infer<typeof StreamConfigSchema>;
export type RedirectionConfig = z.infer<typeof RedirectionConfigSchema>;
