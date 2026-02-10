import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerCompaniesTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_companies",
    "List all companies in the organization with cursor-based pagination.",
    {
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of companies to return (1-100, default 10)"),
      cursor: z
        .string()
        .optional()
        .describe(
          "Opaque cursor from a previous response's nextCursor field for pagination"
        ),
    },
    async ({ limit, cursor }) => {
      try {
        const result = await client.get("/v2/companies", { limit, cursor });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "create_company",
    "Create a new company or update an existing one. Uses the external companyId for upsert matching.",
    {
      companyId: z
        .string()
        .describe("External company ID from your system (unique identifier for upsert)"),
      name: z.string().describe("Company name"),
      monthlySpend: z
        .number()
        .optional()
        .describe("Monthly spend/revenue from this company"),
      industry: z.string().optional().describe("Industry the company operates in"),
      website: z.string().optional().describe("Company website URL"),
      plan: z.string().optional().describe("Current plan/subscription name"),
      companySize: z
        .number()
        .optional()
        .describe("Number of employees in the company"),
      createdAt: z
        .string()
        .optional()
        .describe("When the company was created (ISO 8601)"),
    },
    async ({ companyId, name, monthlySpend, industry, website, plan, companySize, createdAt }) => {
      try {
        const body: Record<string, unknown> = { companyId, name };
        if (monthlySpend !== undefined) body.monthlySpend = monthlySpend;
        if (industry !== undefined) body.industry = industry;
        if (website !== undefined) body.website = website;
        if (plan !== undefined) body.plan = plan;
        if (companySize !== undefined) body.companySize = companySize;
        if (createdAt !== undefined) body.createdAt = createdAt;

        const result = await client.post("/v2/companies", body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_company",
    "Retrieve a single company by its Featurebase internal ID.",
    {
      id: z.string().describe("Company Featurebase internal ID"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/companies/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_company",
    "Permanently delete a company. This also removes the company from all linked users' associations.",
    {
      id: z.string().describe("Company Featurebase internal ID"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/companies/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
