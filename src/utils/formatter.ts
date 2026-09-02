import Table from "cli-table3";
import chalk from "chalk";
import YAML from "yaml";
import type {
  ProxyHost,
  Certificate,
  AccessList,
  Stream,
  RedirectionHost,
} from "../types/npm.js";

export function formatOutput(
  data: any,
  format?: "table" | "json" | "yaml",
  defaultTableRenderer?: () => string
): string {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }
  if (format === "yaml") {
    return YAML.stringify(data);
  }
  if (defaultTableRenderer) {
    return defaultTableRenderer();
  }
  return JSON.stringify(data, null, 2);
}

export function formatProxyHostsTable(hosts: ProxyHost[]): string {
  if (hosts.length === 0) {
    return chalk.dim("No proxy hosts found.");
  }

  const table = new Table({
    head: [
      chalk.cyan("ID"),
      chalk.cyan("Domain(s)"),
      chalk.cyan("Forward Target"),
      chalk.cyan("SSL"),
      chalk.cyan("Access"),
      chalk.cyan("Status"),
    ],
    style: { head: [], border: [] },
  });

  for (const h of hosts) {
    const domains = h.domain_names.join("\n");
    const target = `${h.forward_scheme}://${h.forward_host}:${h.forward_port}`;
    const ssl = h.certificate_id
      ? chalk.green("✔ Active") + (h.ssl_forced ? chalk.dim(" (Forced)") : "")
      : chalk.yellow("✖ None");
    const access = h.access_list_id ? `List #${h.access_list_id}` : chalk.dim("Public");
    const status = h.enabled
      ? chalk.green("Enabled")
      : chalk.red("Disabled");

    table.push([h.id, domains, target, ssl, access, status]);
  }

  return table.toString();
}

export function formatCertificatesTable(certs: Certificate[]): string {
  if (certs.length === 0) {
    return chalk.dim("No certificates found.");
  }

  const table = new Table({
    head: [
      chalk.cyan("ID"),
      chalk.cyan("Name / Domain(s)"),
      chalk.cyan("Provider"),
      chalk.cyan("Expires On"),
    ],
    style: { head: [], border: [] },
  });

  for (const c of certs) {
    const domains = (c.domain_names && c.domain_names.length > 0)
      ? c.domain_names.join(", ")
      : c.nice_name;
    const provider = c.provider === "letsencrypt" ? chalk.blue("Let's Encrypt") : chalk.magenta(c.provider);
    
    let expires = c.expires_on;
    if (c.expires_on) {
      const expDate = new Date(c.expires_on);
      const isExpiringSoon = expDate.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 14;
      expires = isExpiringSoon ? chalk.red(c.expires_on) : chalk.green(c.expires_on);
    } else {
      expires = chalk.dim("Unknown");
    }

    table.push([c.id, domains, provider, expires]);
  }

  return table.toString();
}

export function formatAccessListsTable(lists: AccessList[]): string {
  if (lists.length === 0) {
    return chalk.dim("No access lists found.");
  }

  const table = new Table({
    head: [
      chalk.cyan("ID"),
      chalk.cyan("Name"),
      chalk.cyan("IP Rules"),
      chalk.cyan("HTTP Auth Users"),
    ],
    style: { head: [], border: [] },
  });

  for (const l of lists) {
    const ipCount = l.items ? l.items.length : 0;
    const userCount = l.clients ? l.clients.length : 0;
    table.push([l.id, l.name, `${ipCount} rules`, `${userCount} users`]);
  }

  return table.toString();
}

export function formatStreamsTable(streams: Stream[]): string {
  if (streams.length === 0) {
    return chalk.dim("No streams found.");
  }

  const table = new Table({
    head: [
      chalk.cyan("ID"),
      chalk.cyan("Incoming Port"),
      chalk.cyan("Forward Target"),
      chalk.cyan("Protocols"),
      chalk.cyan("Status"),
    ],
    style: { head: [], border: [] },
  });

  for (const s of streams) {
    const protos = [s.tcp_forwarding ? "TCP" : "", s.udp_forwarding ? "UDP" : ""]
      .filter(Boolean)
      .join("/");
    const status = s.enabled ? chalk.green("Enabled") : chalk.red("Disabled");

    table.push([
      s.id,
      s.incoming_port,
      `${s.forwarding_host}:${s.forwarding_port}`,
      protos || "None",
      status,
    ]);
  }

  return table.toString();
}

export function formatRedirectionsTable(redirs: RedirectionHost[]): string {
  if (redirs.length === 0) {
    return chalk.dim("No redirection hosts found.");
  }

  const table = new Table({
    head: [
      chalk.cyan("ID"),
      chalk.cyan("Domain(s)"),
      chalk.cyan("Forward To"),
      chalk.cyan("Code"),
      chalk.cyan("SSL"),
      chalk.cyan("Status"),
    ],
    style: { head: [], border: [] },
  });

  for (const r of redirs) {
    const domains = r.domain_names.join(", ");
    const target = `${r.forward_scheme}://${r.forward_domain_name}`;
    const ssl = r.certificate_id ? chalk.green("✔") : chalk.yellow("✖");
    const status = r.enabled ? chalk.green("Enabled") : chalk.red("Disabled");

    table.push([r.id, domains, target, r.forward_http_code, ssl, status]);
  }

  return table.toString();
}
