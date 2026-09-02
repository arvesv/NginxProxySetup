import fs from "node:fs";
import FormData from "form-data";
import type { NpmApiClient } from "./api-client.js";
import type {
  Certificate,
  LetsEncryptCreatePayload,
  CustomCertificateCreatePayload,
} from "../types/npm.js";

export class CertsClient {
  constructor(private client: NpmApiClient) {}

  /**
   * List all certificates
   */
  public async list(expand = "owner"): Promise<Certificate[]> {
    return this.client.request<Certificate[]>({
      method: "GET",
      url: "/nginx/certificates",
      params: { expand },
    });
  }

  /**
   * Get certificate by ID
   */
  public async get(id: number, expand = "owner"): Promise<Certificate> {
    return this.client.request<Certificate>({
      method: "GET",
      url: `/nginx/certificates/${id}`,
      params: { expand },
    });
  }

  /**
   * Find certificate by domain name or nice name
   */
  public async findByDomainOrName(query: string): Promise<Certificate | undefined> {
    const all = await this.list();
    const clean = query.toLowerCase().trim();
    return all.find(
      (c) =>
        c.nice_name?.toLowerCase().trim() === clean ||
        c.domain_names?.some((d) => d.toLowerCase().trim() === clean)
    );
  }

  /**
   * Create / Request a Let's Encrypt Certificate
   */
  public async createLetsEncrypt(payload: LetsEncryptCreatePayload): Promise<Certificate> {
    const body = {
      provider: "letsencrypt",
      domain_names: payload.domain_names,
      meta: {
        letsencrypt_email: payload.meta.letsencrypt_email,
        letsencrypt_agree: Boolean(payload.meta.letsencrypt_agree),
        dns_challenge: Boolean(payload.meta.dns_challenge),
        dns_provider: payload.meta.dns_provider || "",
        dns_provider_credentials: payload.meta.dns_provider_credentials || "",
        propagation_seconds: payload.meta.propagation_seconds || 0,
      },
    };

    return this.client.request<Certificate>({
      method: "POST",
      url: "/nginx/certificates",
      data: body,
      timeout: 120000, // Let's encrypt challenge can take up to 2 mins
    });
  }

  /**
   * Upload and register a custom SSL certificate
   */
  public async createCustom(payload: CustomCertificateCreatePayload): Promise<Certificate> {
    // 1. Create the placeholder custom certificate record
    const certRecord = await this.client.request<Certificate>({
      method: "POST",
      url: "/nginx/certificates",
      data: {
        provider: "other",
        nice_name: payload.nice_name,
      },
    });

    const certId = certRecord.id;

    // 2. Upload the certificate files via FormData
    const form = new FormData();

    if (fs.existsSync(payload.certificate)) {
      form.append("certificate", fs.createReadStream(payload.certificate));
    } else {
      form.append("certificate", Buffer.from(payload.certificate), "cert.pem");
    }

    if (fs.existsSync(payload.certificate_key)) {
      form.append("certificate_key", fs.createReadStream(payload.certificate_key));
    } else {
      form.append("certificate_key", Buffer.from(payload.certificate_key), "key.pem");
    }

    if (payload.intermediate_certificate) {
      if (fs.existsSync(payload.intermediate_certificate)) {
        form.append(
          "intermediate_certificate",
          fs.createReadStream(payload.intermediate_certificate)
        );
      } else {
        form.append(
          "intermediate_certificate",
          Buffer.from(payload.intermediate_certificate),
          "chain.pem"
        );
      }
    }

    return this.client.request<Certificate>({
      method: "POST",
      url: `/nginx/certificates/${certId}/upload`,
      data: form,
      headers: form.getHeaders(),
    });
  }

  /**
   * Renew a Let's Encrypt Certificate
   */
  public async renew(id: number): Promise<Certificate> {
    return this.client.request<Certificate>({
      method: "POST",
      url: `/nginx/certificates/${id}/renew`,
      timeout: 120000,
    });
  }

  /**
   * Delete a certificate by ID
   */
  public async delete(id: number): Promise<boolean> {
    return this.client.request<boolean>({
      method: "DELETE",
      url: `/nginx/certificates/${id}`,
    });
  }
}
