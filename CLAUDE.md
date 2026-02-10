# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Build:** `pnpm run build` (runs `tsc`, output to `dist/`)
- **Dev:** `FEATUREBASE_API_KEY=sk_... pnpm run dev` (runs `tsx src/index.ts` on stdio)
- **Start:** `FEATUREBASE_API_KEY=sk_... pnpm start` (runs compiled `dist/index.js`)
- **Type-check only:** `npx tsc --noEmit`

No tests or linter configured yet.

## Architecture

MCP server wrapping the Featurebase API (v2026-01-01.nova) over stdio transport.

### Entry point: `src/index.ts`
Creates `FeaturebaseClient` (reads `FEATUREBASE_API_KEY` env var), instantiates `McpServer`, calls each `register*Tools(server, client)` function, then connects via `StdioServerTransport`.

### HTTP client: `src/client/featurebase-client.ts`
- `FeaturebaseClient` class — handles auth header (`Bearer sk_...`), version header (`Featurebase-Version: 2026-01-01.nova`), JSON serialization, error parsing. Exposes `get`, `post`, `patch`, `put`, `delete`, and raw `request` methods.
- `handleToolError(error)` — standardizes error responses for MCP tool handlers.
- DELETE endpoints that require a body must use `client.request("DELETE", path, { body })` directly since `client.delete()` only supports query params.

### Tool files: `src/tools/*.ts`
19 files, ~69 tools total. Each file exports a single `register*Tools(server: McpServer, client: FeaturebaseClient)` function.

**Pattern for adding a new tool:**
```ts
server.tool(
  "snake_case_name",
  "Description of what this tool does",
  { param: z.string().describe("..."), optionalParam: z.string().optional().describe("...") },
  async ({ param, optionalParam }) => {
    try {
      const result = await client.get("/v2/resource", { param, optionalParam });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return handleToolError(e);
    }
  }
);
```

**To add a new tool file:**
1. Create `src/tools/resource-name.ts` exporting `registerResourceNameTools(server, client)`
2. Import and call it in `src/index.ts`

## Featurebase API path quirks

Some API paths don't match the resource name casing you'd expect:
- Help center endpoints: `/v2/help_center/help_centers`, `/v2/help_center/collections`, `/v2/help_center/articles` (underscore, not hyphen)
- Post statuses: `/v2/post_statuses` (underscore)
- Admin roles: `/v2/admins/roles`
- Changelog subscribers: `/v2/changelogs/subscribers` (not per-changelog)
- Company contact removal: `/v2/companies/{id}/contacts/{contactId}` (contactId in path, not body)

## Package manager

Use **pnpm** (not npm/yarn).
