# Nginx Proxy Manager CLI & TypeScript SDK (`npm-cli`)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg)](LICENSE)

A command-line tool and TypeScript/Node.js client library to automate and manage [Nginx Proxy Manager](https://nginxproxymanager.com/) (NPM) hosts, SSL certificates (Let's Encrypt / Custom), access lists, TCP/UDP streams, HTTP redirections, and declarative GitOps configurations.

---

## Features

- **Full Command-Line Interface (`npm-cli`)**:
  - Manage **Proxy Hosts**: Create, list, get, update, delete, enable/disable reverse proxies with SSL, WebSocket, HTTP/2, HSTS, and custom location blocks.
  - Manage **SSL Certificates**: Request Let's Encrypt certificates (HTTP-01 and DNS-01 challenges like Cloudflare, Route53, etc.), upload custom SSL certificates, and trigger renewals.
  - Manage **Access Lists**: Configure IP whitelists/blacklists and HTTP Basic Auth credentials.
  - Manage **Streams & Redirections**: Set up raw TCP/UDP port forwarding and 301/302 HTTP redirects.
  - **Interactive Prompts**: Prompts guide you when required options are omitted.
- **Declarative GitOps & Backup Sync**:
  - `npm-cli export`: Dump existing NPM state into clean YAML or JSON.
  - `npm-cli apply`: Reconcile state against a declarative `config.yaml` with `--dry-run` and `--prune` support.
- **Programmatic TypeScript SDK**:
  - Fully typed API client for embedding into scripts, CI/CD pipelines, or microservices.
- **Persistent Profiles & Env Support**:
  - Connect via `~/.npm-cli/config.json`, `.env` file, or standard environment variables (`NPM_URL`, `NPM_TOKEN`, `NPM_EMAIL`, `NPM_PASSWORD`).

---

## Installation & Setup

### 1. Build locally or link CLI globally

```bash
# Clone and install dependencies
git clone https://github.com/your-repo/NginxProxySetup.git
cd NginxProxySetup
npm install

# Build binary
npm run build

# Link CLI globally (optional)
npm link
```

Now you can run `npm-cli` directly from anywhere in your terminal!

---

## Authentication & Configuration

You can configure authentication via **CLI login**, **environment variables**, or **CLI flags**.

### Method 1: Interactive Login (Saves to `~/.npm-cli/config.json`)
```bash
npm-cli login --url http://192.168.1.100:81 --email admin@example.com
```

### Method 2: Environment Variables
Create a `.env` file or export environment variables:
```bash
export NPM_URL="http://192.168.1.100:81"
export NPM_EMAIL="admin@example.com"
export NPM_PASSWORD="changeme"
# Or provide pre-existing Bearer token:
# export NPM_TOKEN="your-jwt-token"
```

### Method 3: Test Connectivity
```bash
npm-cli status
```

---

## CLI Command Reference

### 1. Proxy Hosts (`npm-cli hosts`)

```bash
# List all proxy hosts (in terminal table)
npm-cli hosts list

# Output as JSON or YAML
npm-cli hosts list --format json
npm-cli hosts list --format yaml

# Create a proxy host
npm-cli hosts create \
  --domain app.example.com \
  --forward http://192.168.1.50:8080 \
  --force-ssl \
  --http2 \
  --websocket

# Create a proxy host with specific certificate & access list
npm-cli hosts create \
  --domain vault.example.com \
  --forward http://192.168.1.55:8000 \
  --cert-id 1 \
  --force-ssl \
  --access-list 2

# Inspect a host
npm-cli hosts get app.example.com
npm-cli hosts get 1

# Update a host
npm-cli hosts update app.example.com --forward http://192.168.1.51:8080

# Disable / Enable
npm-cli hosts disable app.example.com
npm-cli hosts enable app.example.com

# Delete a host
npm-cli hosts delete app.example.com --yes
```

---

### 2. SSL Certificates (`npm-cli certs`)

```bash
# List all certificates & expiration dates
npm-cli certs list

# Request Let's Encrypt Certificate (HTTP-01 challenge)
npm-cli certs create-le \
  --domain example.com \
  --email admin@example.com

# Request Let's Encrypt Wildcard Certificate (DNS-01 challenge with Cloudflare)
npm-cli certs create-le \
  --domain "*.example.com,example.com" \
  --email admin@example.com \
  --dns-challenge \
  --dns-provider cloudflare \
  --dns-credentials "dns_cloudflare_api_token = 0123456789abcdef"

# Upload Custom SSL Certificate
npm-cli certs upload-custom \
  --name "My Custom Wildcard" \
  --cert /path/to/cert.pem \
  --key /path/to/privkey.pem \
  --intermediate /path/to/chain.pem

# Renew certificate
npm-cli certs renew 1

# Delete certificate
npm-cli certs delete 1 --yes
```

---

### 3. Access Lists (`npm-cli access`)

```bash
# List access lists
npm-cli access list

# Create IP Whitelist + Basic Auth access list
npm-cli access create \
  --name "Internal Only" \
  --allow 192.168.1.0/24 10.0.0.1 \
  --deny 0.0.0.0/0 \
  --user admin:supersecretpassword

# Delete access list
npm-cli access delete 1 --yes
```

---

### 4. TCP/UDP Streams & Redirections

```bash
# Forward raw TCP port 2222 -> internal server SSH port 22
npm-cli streams create --in-port 2222 --forward-host 192.168.1.60 --forward-port 22 --tcp

# Create 301 HTTP Redirection
npm-cli redirects create \
  --domain oldsite.com \
  --target newsite.com \
  --code 301 \
  --scheme https
```

---

### 5. Declarative GitOps Sync (`npm-cli export` & `npm-cli apply`)

Manage your entire reverse proxy infrastructure as code!

#### Export current NPM configuration:
```bash
npm-cli export --output npm-config.yaml
```

#### Declarative YAML Specification (`npm-config.yaml`):
```yaml
version: "1.0"
settings:
  npm_url: "http://localhost:81"
  default_email: "admin@example.com"

certificates:
  - name: "wildcard-example-com"
    provider: "letsencrypt"
    domain_names:
      - "*.example.com"
      - "example.com"
    dns_challenge: true
    dns_provider: "cloudflare"
    dns_provider_credentials: "dns_cloudflare_api_token = xxx"

access_lists:
  - name: "internal-network"
    items:
      - address: "192.168.1.0/24"
        directive: "allow"
    clients:
      - username: "admin"
        password: "secretpassword"

proxy_hosts:
  - domain_names: ["app.example.com"]
    forward_scheme: "http"
    forward_host: "192.168.1.50"
    forward_port: 8080
    ssl_forced: true
    http2_support: true
    allow_websocket_upgrade: true
    certificate: "wildcard-example-com"
    access_list: "internal-network"
    locations:
      - path: "/api"
        forward_scheme: "http"
        forward_host: "192.168.1.51"
        forward_port: 3000
```

#### Test changes with Dry Run:
```bash
npm-cli apply --file npm-config.yaml --dry-run
```

#### Apply and Prune removed hosts:
```bash
npm-cli apply --file npm-config.yaml --prune
```

---

## Programmatic TypeScript SDK Usage

You can import `NginxProxyManager` directly into any Node/TypeScript project:

```typescript
import { NginxProxyManager } from "@arvesv/npm-manager-cli";

const npm = new NginxProxyManager({
  baseUrl: "http://192.168.1.100:81",
  email: "admin@example.com",
  password: "adminpassword",
});

async function main() {
  // 1. List existing proxy hosts
  const hosts = await npm.hosts.list();
  console.log(`Found ${hosts.length} hosts.`);

  // 2. Create a proxy host
  const host = await npm.hosts.create({
    domain_names: ["myservice.example.com"],
    forward_scheme: "http",
    forward_host: "192.168.1.50",
    forward_port: 3000,
    ssl_forced: true,
    allow_websocket_upgrade: true,
  });

  console.log(`Created proxy host #${host.id}`);
}

main().catch(console.error);
```

---

## Development & Testing

```bash
# Run tests
npm test

# Run CLI in watch mode
npm run dev -- --help

# Build distribution packages
npm run build
```

---

## License
 
GNU General Public License v2.0 (GPL-2.0). See [LICENSE](LICENSE) for details.
