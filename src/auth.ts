import crypto from "node:crypto";
import http from "node:http";
import { URL, URLSearchParams } from "node:url";

/**
 * Minimal OAuth 2.1 provider for MCP auth compliance.
 *
 * Flow:
 *  1. Claude discovers metadata at /.well-known/oauth-authorization-server
 *  2. Claude registers dynamically via POST /register
 *  3. Claude opens /authorize in a browser — user sees a simple "Authorize" page
 *  4. User clicks Authorize — server redirects back with an auth code
 *  5. Claude exchanges code for access token via POST /token
 *  6. Claude uses Bearer token on /mcp requests
 */

interface RegisteredClient {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
  clientName?: string;
}

interface AuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  expiresAt: number;
}

interface TokenRecord {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  expiresAt: number;
}

export class OAuthProvider {
  private clients = new Map<string, RegisteredClient>();
  private authCodes = new Map<string, AuthCode>();
  private tokens = new Map<string, TokenRecord>();
  private refreshTokenIndex = new Map<string, string>(); // refreshToken -> accessToken
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl.replace(/\/$/, "");
  }

  /** Handle all OAuth-related routes. Returns true if handled. */
  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
    const url = new URL(req.url || "/", this.serverUrl);
    const path = url.pathname;

    if (req.method === "GET" && path === "/.well-known/oauth-authorization-server") {
      this.handleMetadata(res);
      return true;
    }
    if (req.method === "POST" && path === "/register") {
      await this.handleRegister(req, res);
      return true;
    }
    if (req.method === "GET" && path === "/authorize") {
      this.handleAuthorize(url, res);
      return true;
    }
    if (req.method === "POST" && path === "/authorize") {
      await this.handleAuthorizePost(req, res);
      return true;
    }
    if (req.method === "POST" && path === "/token") {
      await this.handleToken(req, res);
      return true;
    }

    return false;
  }

  /** Validate Bearer token. Returns true if valid. */
  validateToken(req: http.IncomingMessage): boolean {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return false;
    const token = auth.slice(7);
    const record = this.tokens.get(token);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      this.tokens.delete(token);
      return false;
    }
    return true;
  }

  // --- Handlers ---

  private handleMetadata(res: http.ServerResponse) {
    const metadata = {
      issuer: this.serverUrl,
      authorization_endpoint: `${this.serverUrl}/authorize`,
      token_endpoint: `${this.serverUrl}/token`,
      registration_endpoint: `${this.serverUrl}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
      code_challenge_methods_supported: ["S256"],
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(metadata));
  }

  private async handleRegister(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await readBody(req);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_request" }));
      return;
    }

    const clientId = `client_${crypto.randomUUID()}`;
    const clientSecret = data.token_endpoint_auth_method === "client_secret_post"
      ? `secret_${crypto.randomUUID()}`
      : undefined;

    const client: RegisteredClient = {
      clientId,
      clientSecret,
      redirectUris: (data.redirect_uris as string[]) || [],
      clientName: data.client_name as string | undefined,
    };
    this.clients.set(clientId, client);

    const response: Record<string, unknown> = {
      client_id: clientId,
      redirect_uris: client.redirectUris,
      client_name: client.clientName,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: clientSecret ? "client_secret_post" : "none",
    };
    if (clientSecret) response.client_secret = clientSecret;

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  }

  private handleAuthorize(url: URL, res: http.ServerResponse) {
    const clientId = url.searchParams.get("client_id") || "";
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const state = url.searchParams.get("state") || "";
    const codeChallenge = url.searchParams.get("code_challenge") || "";
    const codeChallengeMethod = url.searchParams.get("code_challenge_method") || "S256";

    const client = this.clients.get(clientId);
    if (!client) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Unknown client</h1>");
      return;
    }

    // Show a simple authorize page
    const html = `<!DOCTYPE html>
<html><head><title>Authorize - Featurebase MCP</title>
<style>
  body { font-family: system-ui; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
  button { background: #5046e5; color: white; border: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 1rem; }
  button:hover { background: #4038c7; }
</style></head>
<body><div class="card">
  <h2>Featurebase MCP</h2>
  <p>Claude wants to connect to your Featurebase MCP server.</p>
  <form method="POST" action="/authorize">
    <input type="hidden" name="client_id" value="${escapeHtml(clientId)}">
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
    <input type="hidden" name="state" value="${escapeHtml(state)}">
    <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}">
    <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}">
    <button type="submit">Authorize</button>
  </form>
</div></body></html>`;

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  }

  private async handleAuthorizePost(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await readBody(req);
    const params = new URLSearchParams(body);

    const clientId = params.get("client_id") || "";
    const redirectUri = params.get("redirect_uri") || "";
    const state = params.get("state") || "";
    const codeChallenge = params.get("code_challenge") || "";
    const codeChallengeMethod = params.get("code_challenge_method") || "S256";

    const client = this.clients.get(clientId);
    if (!client) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Unknown client</h1>");
      return;
    }

    const code = crypto.randomUUID();
    this.authCodes.set(code, {
      code,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });

    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);

    res.writeHead(302, { Location: redirect.toString() });
    res.end();
  }

  private async handleToken(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    const grantType = params.get("grant_type");

    if (grantType === "authorization_code") {
      this.handleTokenAuthCode(params, res);
    } else if (grantType === "refresh_token") {
      this.handleTokenRefresh(params, res);
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unsupported_grant_type" }));
    }
  }

  private handleTokenAuthCode(params: URLSearchParams, res: http.ServerResponse) {
    const code = params.get("code") || "";
    const codeVerifier = params.get("code_verifier") || "";
    const clientId = params.get("client_id") || "";

    const authCode = this.authCodes.get(code);
    if (!authCode || authCode.clientId !== clientId || Date.now() > authCode.expiresAt) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_grant" }));
      return;
    }

    // Verify PKCE
    const expectedChallenge = base64UrlEncode(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );
    if (expectedChallenge !== authCode.codeChallenge) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_grant", error_description: "PKCE verification failed" }));
      return;
    }

    this.authCodes.delete(code);

    const accessToken = `at_${crypto.randomUUID()}`;
    const refreshToken = `rt_${crypto.randomUUID()}`;
    const expiresIn = 3600; // 1 hour

    this.tokens.set(accessToken, {
      accessToken,
      refreshToken,
      clientId,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    this.refreshTokenIndex.set(refreshToken, accessToken);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
    }));
  }

  private handleTokenRefresh(params: URLSearchParams, res: http.ServerResponse) {
    const refreshToken = params.get("refresh_token") || "";
    const oldAccessToken = this.refreshTokenIndex.get(refreshToken);

    if (!oldAccessToken) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_grant" }));
      return;
    }

    const oldRecord = this.tokens.get(oldAccessToken);
    if (!oldRecord) {
      this.refreshTokenIndex.delete(refreshToken);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_grant" }));
      return;
    }

    // Rotate tokens
    this.tokens.delete(oldAccessToken);
    this.refreshTokenIndex.delete(refreshToken);

    const newAccessToken = `at_${crypto.randomUUID()}`;
    const newRefreshToken = `rt_${crypto.randomUUID()}`;
    const expiresIn = 3600;

    this.tokens.set(newAccessToken, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      clientId: oldRecord.clientId,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    this.refreshTokenIndex.set(newRefreshToken, newAccessToken);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: newRefreshToken,
    }));
  }
}

// --- Helpers ---

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
