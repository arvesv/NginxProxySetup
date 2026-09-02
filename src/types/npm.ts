export interface TokenResponse {
  token: string;
  expires: string;
}

export interface NpmUser {
  id: number;
  created_on: string;
  modified_on: string;
  is_deleted: number;
  email: string;
  name: string;
  nickname: string;
  avatar: string;
  roles: string[];
}

export interface ProxyHostLocation {
  path: string;
  forward_scheme: "http" | "https";
  forward_host: string;
  forward_port: number;
  advanced_config?: string;
}

export interface ProxyHost {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  domain_names: string[];
  forward_host: string;
  forward_port: number;
  forward_scheme: "http" | "https";
  certificate_id: number | "new" | 0;
  ssl_forced: number | boolean;
  hsts_enabled: number | boolean;
  hsts_subdomains: number | boolean;
  http2_support: number | boolean;
  block_exploits: number | boolean;
  caching_enabled: number | boolean;
  allow_websocket_upgrade: number | boolean;
  access_list_id: number | 0;
  advanced_config: string;
  enabled: number | boolean;
  meta?: Record<string, any>;
  locations?: ProxyHostLocation[];
  certificate?: Certificate;
  access_list?: AccessList;
}

export interface ProxyHostCreatePayload {
  domain_names: string[];
  forward_scheme: "http" | "https";
  forward_host: string;
  forward_port: number;
  certificate_id?: number | "new" | 0;
  ssl_forced?: boolean | number;
  hsts_enabled?: boolean | number;
  hsts_subdomains?: boolean | number;
  http2_support?: boolean | number;
  block_exploits?: boolean | number;
  caching_enabled?: boolean | number;
  allow_websocket_upgrade?: boolean | number;
  access_list_id?: number | 0;
  advanced_config?: string;
  enabled?: boolean | number;
  meta?: {
    letsencrypt_agree?: boolean;
    dns_challenge?: boolean;
    [key: string]: any;
  };
  locations?: ProxyHostLocation[];
}

export interface ProxyHostUpdatePayload extends Partial<ProxyHostCreatePayload> {}

export interface Certificate {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  provider: "letsencrypt" | "other" | string;
  nice_name: string;
  domain_names: string[];
  expires_on: string;
  meta?: {
    letsencrypt_email?: string;
    letsencrypt_agree?: boolean;
    dns_challenge?: boolean;
    dns_provider?: string;
    dns_provider_credentials?: string;
    [key: string]: any;
  };
}

export interface LetsEncryptCreatePayload {
  domain_names: string[];
  meta: {
    letsencrypt_email: string;
    letsencrypt_agree: boolean;
    dns_challenge?: boolean;
    dns_provider?: string;
    dns_provider_credentials?: string;
    propagation_seconds?: number;
  };
}

export interface CustomCertificateCreatePayload {
  nice_name: string;
  certificate: string; // certificate file content or path handled via form-data
  certificate_key: string;
  intermediate_certificate?: string;
}

export interface AccessListClient {
  id?: number;
  address: string;
  directive: "allow" | "deny";
}

export interface AccessListUser {
  id?: number;
  username: string;
  password?: string;
  hint?: string;
}

export interface AccessList {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  name: string;
  satisfy_any: boolean | number;
  pass_auth: boolean | number;
  items?: AccessListClient[];
  clients?: AccessListUser[];
  meta?: Record<string, any>;
}

export interface AccessListCreatePayload {
  name: string;
  satisfy_any?: boolean | number;
  pass_auth?: boolean | number;
  items?: { address: string; directive: "allow" | "deny" }[];
  clients?: { username: string; password?: string }[];
  meta?: Record<string, any>;
}

export interface Stream {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  incoming_port: number;
  forwarding_host: string;
  forwarding_port: number;
  tcp_forwarding: boolean | number;
  udp_forwarding: boolean | number;
  enabled: boolean | number;
  meta?: Record<string, any>;
}

export interface StreamCreatePayload {
  incoming_port: number;
  forwarding_host: string;
  forwarding_port: number;
  tcp_forwarding?: boolean | number;
  udp_forwarding?: boolean | number;
  enabled?: boolean | number;
}

export interface RedirectionHost {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  domain_names: string[];
  forward_http_code: 301 | 302 | 307 | 308 | number;
  forward_scheme: "http" | "https" | "auto";
  forward_domain_name: string;
  preserve_path: boolean | number;
  certificate_id: number | 0;
  ssl_forced: boolean | number;
  hsts_enabled: boolean | number;
  hsts_subdomains: boolean | number;
  http2_support: boolean | number;
  block_exploits: boolean | number;
  advanced_config: string;
  enabled: boolean | number;
  meta?: Record<string, any>;
}

export interface RedirectionHostCreatePayload {
  domain_names: string[];
  forward_http_code: number;
  forward_scheme: "http" | "https" | "auto";
  forward_domain_name: string;
  preserve_path?: boolean | number;
  certificate_id?: number | 0;
  ssl_forced?: boolean | number;
  hsts_enabled?: boolean | number;
  hsts_subdomains?: boolean | number;
  http2_support?: boolean | number;
  block_exploits?: boolean | number;
  advanced_config?: string;
  enabled?: boolean | number;
}

export interface DeadHost {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  domain_names: string[];
  certificate_id: number | 0;
  ssl_forced: boolean | number;
  hsts_enabled: boolean | number;
  hsts_subdomains: boolean | number;
  http2_support: boolean | number;
  advanced_config: string;
  enabled: boolean | number;
}
