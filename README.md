# Featurebase MCP Server

An MCP (Model Context Protocol) server that wraps the [Featurebase API](https://docs.featurebase.app) (v2026-01-01.nova), giving AI assistants like Claude full access to your Featurebase organization.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/)
- A Featurebase API key (starts with `sk_`) — generate one from your Featurebase dashboard under **Settings > API**

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build

```bash
pnpm run build
```

### 3. Get your API key

Go to your Featurebase dashboard > **Settings** > **API** and create an API key. It will look like `sk_...`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FEATUREBASE_API_KEY` | Yes | — | Your Featurebase API key (starts with `sk_`) |
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | No | `3000` | Port for HTTP transport |
| `SERVER_URL` | No | `http://localhost:{PORT}` | Public URL of the server (used for OAuth callbacks in HTTP mode) |

## Usage

### Stdio transport (default)

This is the standard mode for use with Claude Desktop, Claude Code, and other MCP clients.

```bash
FEATUREBASE_API_KEY=sk_... pnpm start
```

Or for development with hot-reload:

```bash
FEATUREBASE_API_KEY=sk_... pnpm run dev
```

### HTTP transport

Set `MCP_TRANSPORT=http` to run as an HTTP server. This mode includes a built-in OAuth 2.1 provider for authentication.

```bash
MCP_TRANSPORT=http \
  PORT=3000 \
  SERVER_URL=https://your-domain.com \
  FEATUREBASE_API_KEY=sk_... \
  pnpm start
```

## Hosting (Remote HTTP Server)

Running the server remotely lets any MCP client connect over the network without needing the code installed locally.

### With Docker

```bash
docker build -t featurebase-mcp .

docker run -d \
  -p 3000:3000 \
  -e FEATUREBASE_API_KEY=sk_... \
  -e MCP_TRANSPORT=http \
  -e SERVER_URL=https://your-domain.com \
  --name featurebase-mcp \
  featurebase-mcp
```

### With Node directly

```bash
pnpm install && pnpm run build

MCP_TRANSPORT=http \
  PORT=3000 \
  SERVER_URL=https://your-domain.com \
  FEATUREBASE_API_KEY=sk_... \
  node dist/index.js
```

### Reverse proxy

Put the server behind a reverse proxy (nginx, Caddy, etc.) with HTTPS. The `SERVER_URL` must match the public URL so OAuth callbacks work correctly.

Example with Caddy:

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

### Endpoints

Once running, the server exposes:

| Endpoint | Description |
|----------|-------------|
| `/mcp` | MCP protocol endpoint (POST/GET/DELETE) |
| `/health` | Health check |
| `/.well-known/oauth-authorization-server` | OAuth 2.1 metadata discovery |
| `/register` | OAuth dynamic client registration |
| `/authorize` | OAuth authorization |
| `/token` | OAuth token exchange |

## Connecting Clients

### Local (stdio) — Claude Desktop

Add to your Claude Desktop config:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "featurebase": {
      "command": "node",
      "args": ["/absolute/path/to/featurebase-mcp/dist/index.js"],
      "env": {
        "FEATUREBASE_API_KEY": "sk_..."
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Local (stdio) — Claude Code

```bash
claude mcp add featurebase -- env FEATUREBASE_API_KEY=sk_... node /absolute/path/to/featurebase-mcp/dist/index.js
```

Or add manually to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "featurebase": {
      "command": "node",
      "args": ["/absolute/path/to/featurebase-mcp/dist/index.js"],
      "env": {
        "FEATUREBASE_API_KEY": "sk_..."
      }
    }
  }
}
```

### Remote (HTTP) — Claude Desktop

Point Claude Desktop at your hosted server instead of running locally:

```json
{
  "mcpServers": {
    "featurebase": {
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

### Remote (HTTP) — Claude Code

```bash
claude mcp add featurebase --transport http https://your-domain.com/mcp
```

Or add manually to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "featurebase": {
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

## Available Tools (69 total)

### Posts
| Tool | Description |
|------|-------------|
| `list_posts` | List and filter posts (feedback submissions) |
| `create_post` | Create a new post in a board |
| `get_post` | Get a post by ID |
| `update_post` | Update an existing post |
| `delete_post` | Delete a post |

### Post Voters
| Tool | Description |
|------|-------------|
| `list_post_voters` | List voters on a post |
| `add_post_voter` | Add a voter to a post |
| `remove_post_voter` | Remove a voter from a post |

### Comments
| Tool | Description |
|------|-------------|
| `list_comments` | List comments on a post or changelog |
| `create_comment` | Create a comment |
| `get_comment` | Get a comment by ID |
| `update_comment` | Update a comment |
| `delete_comment` | Delete a comment |

### Changelogs
| Tool | Description |
|------|-------------|
| `list_changelogs` | List changelogs |
| `create_changelog` | Create a changelog entry |
| `get_changelog` | Get a changelog by ID |
| `update_changelog` | Update a changelog |
| `delete_changelog` | Delete a changelog |
| `publish_changelog` | Publish a changelog |
| `unpublish_changelog` | Unpublish a changelog |

### Changelog Subscribers
| Tool | Description |
|------|-------------|
| `add_changelog_subscribers` | Subscribe contacts to changelogs |
| `remove_changelog_subscribers` | Unsubscribe contacts from changelogs |

### Help Centers
| Tool | Description |
|------|-------------|
| `list_help_centers` | List help centers |
| `get_help_center` | Get a help center by ID |

### Collections
| Tool | Description |
|------|-------------|
| `list_collections` | List help center collections |
| `create_collection` | Create a collection |
| `get_collection` | Get a collection by ID |
| `update_collection` | Update a collection |
| `delete_collection` | Delete a collection |

### Articles
| Tool | Description |
|------|-------------|
| `list_articles` | List help center articles |
| `create_article` | Create an article |
| `get_article` | Get an article by ID |
| `update_article` | Update an article |
| `delete_article` | Delete an article |

### Contacts
| Tool | Description |
|------|-------------|
| `list_contacts` | List contacts |
| `upsert_contact` | Create or update a contact |
| `get_contact` | Get a contact by ID |
| `delete_contact` | Delete a contact |
| `get_contact_by_user_id` | Get a contact by external user ID |
| `delete_contact_by_user_id` | Delete a contact by external user ID |
| `block_contact` | Block a contact |
| `unblock_contact` | Unblock a contact |

### Conversations
| Tool | Description |
|------|-------------|
| `list_conversations` | List conversations |
| `create_conversation` | Create a conversation |
| `get_conversation` | Get a conversation by ID |
| `update_conversation` | Update a conversation |
| `delete_conversation` | Delete a conversation |
| `reply_to_conversation` | Reply to a conversation |

### Conversation Participants
| Tool | Description |
|------|-------------|
| `add_conversation_participant` | Add a participant |
| `remove_conversation_participant` | Remove a participant |

### Conversation Redaction
| Tool | Description |
|------|-------------|
| `redact_conversation_part` | Redact a conversation message |

### Boards
| Tool | Description |
|------|-------------|
| `list_boards` | List boards (categories) |

### Post Statuses
| Tool | Description |
|------|-------------|
| `list_post_statuses` | List post statuses |
| `get_post_status` | Get a post status by ID |

### Companies
| Tool | Description |
|------|-------------|
| `list_companies` | List companies |
| `create_company` | Create a company |
| `get_company` | Get a company by ID |
| `delete_company` | Delete a company |

### Company Contacts
| Tool | Description |
|------|-------------|
| `list_company_contacts` | List contacts in a company |
| `add_company_contact` | Add a contact to a company |
| `remove_company_contact` | Remove a contact from a company |

### Teams
| Tool | Description |
|------|-------------|
| `list_teams` | List teams |
| `get_team` | Get a team by ID |

### Webhooks
| Tool | Description |
|------|-------------|
| `list_webhooks` | List webhooks |
| `create_webhook` | Create a webhook |
| `get_webhook` | Get a webhook by ID |
| `update_webhook` | Update a webhook |
| `delete_webhook` | Delete a webhook |

### Admins
| Tool | Description |
|------|-------------|
| `list_admin_roles` | List admin roles |

## License

MIT
