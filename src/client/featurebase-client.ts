import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "https://do.featurebase.app";
const API_VERSION = "2026-01-01.nova";

export class FeaturebaseClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Featurebase-Version": API_VERSION,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
    }
  ): Promise<T> {
    const url = new URL(path, BASE_URL);
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: this.headers(),
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const err = await res.json();
        detail = err.message || err.error || JSON.stringify(err);
      } catch {
        detail = await res.text();
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Featurebase API ${method} ${path} failed (${res.status}): ${detail}`
      );
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  get<T = unknown>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ) {
    return this.request<T>("GET", path, { query });
  }

  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body });
  }

  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body });
  }

  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T = unknown>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ) {
    return this.request<T>("DELETE", path, { query });
  }
}

export function handleToolError(error: unknown): { content: { type: "text"; text: string }[]; isError: true } {
  if (error instanceof McpError) {
    return {
      content: [{ type: "text", text: error.message }],
      isError: true,
    };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `Error: ${msg}` }],
    isError: true,
  };
}
