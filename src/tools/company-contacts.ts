import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerCompanyContactsTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_company_contacts",
    "List all contacts (customers) attached to a specific company with cursor-based pagination.",
    {
      id: z.string().describe("Company Featurebase internal ID"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of contacts to return (1-100, default 10)"),
      cursor: z
        .string()
        .optional()
        .describe(
          "Opaque cursor from a previous response's nextCursor field for pagination"
        ),
    },
    async ({ id, limit, cursor }) => {
      try {
        const result = await client.get(`/v2/companies/${id}/contacts`, {
          limit,
          cursor,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "add_company_contact",
    "Attach a contact (customer) to a company. This is additive - existing associations are preserved.",
    {
      id: z.string().describe("Company Featurebase internal ID"),
      contactId: z
        .string()
        .describe("Featurebase internal ID of the contact to attach"),
    },
    async ({ id, contactId }) => {
      try {
        const result = await client.post(`/v2/companies/${id}/contacts`, {
          contactId,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "remove_company_contact",
    "Remove a contact (customer) from a company. Removes the company association from the contact.",
    {
      id: z.string().describe("Company Featurebase internal ID"),
      contactId: z
        .string()
        .describe("Featurebase internal ID of the contact to remove"),
    },
    async ({ id, contactId }) => {
      try {
        const result = await client.delete(
          `/v2/companies/${id}/contacts/${contactId}`
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
