import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FeaturebaseClient } from "./client/featurebase-client.js";

import { registerPostsTools } from "./tools/posts.js";
import { registerPostVotersTools } from "./tools/post-voters.js";
import { registerCommentsTools } from "./tools/comments.js";
import { registerChangelogsTools } from "./tools/changelogs.js";
import { registerChangelogSubscribersTools } from "./tools/changelog-subscribers.js";
import { registerHelpCentersTools } from "./tools/help-centers.js";
import { registerCollectionsTools } from "./tools/collections.js";
import { registerArticlesTools } from "./tools/articles.js";
import { registerContactsTools } from "./tools/contacts.js";
import { registerConversationsTools } from "./tools/conversations.js";
import { registerConversationParticipantsTools } from "./tools/conversation-participants.js";
import { registerConversationRedactTools } from "./tools/conversation-redact.js";
import { registerBoardsTools } from "./tools/boards.js";
import { registerPostStatusesTools } from "./tools/post-statuses.js";
import { registerCompaniesTools } from "./tools/companies.js";
import { registerCompanyContactsTools } from "./tools/company-contacts.js";
import { registerTeamsTools } from "./tools/teams.js";
import { registerWebhooksTools } from "./tools/webhooks.js";
import { registerAdminsTools } from "./tools/admins.js";

const apiKey = process.env.FEATUREBASE_API_KEY;
if (!apiKey) {
  console.error("FEATUREBASE_API_KEY environment variable is required");
  process.exit(1);
}

const client = new FeaturebaseClient(apiKey);

const server = new McpServer({
  name: "featurebase",
  version: "1.0.0",
});

registerPostsTools(server, client);
registerPostVotersTools(server, client);
registerCommentsTools(server, client);
registerChangelogsTools(server, client);
registerChangelogSubscribersTools(server, client);
registerHelpCentersTools(server, client);
registerCollectionsTools(server, client);
registerArticlesTools(server, client);
registerContactsTools(server, client);
registerConversationsTools(server, client);
registerConversationParticipantsTools(server, client);
registerConversationRedactTools(server, client);
registerBoardsTools(server, client);
registerPostStatusesTools(server, client);
registerCompaniesTools(server, client);
registerCompanyContactsTools(server, client);
registerTeamsTools(server, client);
registerWebhooksTools(server, client);
registerAdminsTools(server, client);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Featurebase MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
