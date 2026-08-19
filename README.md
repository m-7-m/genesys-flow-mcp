# Genesys Flow MCP

Local MCP server that connects to Genesys Cloud, lists IVR routes, retrieves an IVR's configured open-hours flow, and produces readable Markdown documentation.

The generated document is structured for both business and technical readers:

- **Route** — IVR name, ID, state, DNIS (when available), and configured flow.
- **Business Focus** — the flow purpose and customer menu routing.
- **Technical Focus** — flow settings, variables, prompts/TTS, tasks, menus, and decision paths.
- **Integrations and Routing Dependencies** — Data Actions, Bot Flows, and ACD queues.

## Prerequisites

- Node.js 18 or later
- A Genesys Cloud OAuth client using the **Client Credentials** grant
- Permissions to read Architect IVRs and flows in the relevant Genesys Cloud organisation

## Install and configure

Install dependencies:

```powershell
cd <path-to-genesys-flow-mcp>
npm install
```

Create a `.env` file in the project root:

```env
GENESYS_CLIENT_ID=your-client-id
GENESYS_CLIENT_SECERET=your-client-secret
GENESYS_REGION=ie
```

> **Important:** `GENESYS_CLIENT_SECERET` is intentionally spelled this way because it matches the current source code. Do not rename it to `SECRET` unless you also update `src/config/env.ts`.

Set `GENESYS_REGION` to your Genesys Cloud region suffix, for example `ie` for `mypurecloud.ie`.

## Run locally

For development:

```powershell
npm run dev
```

For the compiled server used by desktop clients:

```powershell
npm run build
npm start
```

The server uses the MCP **stdio** transport. It is started by the MCP client; it does not expose a browser URL or HTTP port.

## Test with MCP Inspector

Use the MCP Inspector to test the server directly before connecting it to Claude Desktop:

```powershell
cd <path-to-genesys-flow-mcp>
npm run inspect
```

The Inspector opens a local browser interface. In it:

1. Connect to the server using the default stdio configuration.
2. Open the **Tools** tab.
3. Run `get_ivrs` to confirm Genesys authentication and route retrieval.
4. Run `get_flow_by_name` with an IVR name, for example:

   ```json
   {
     "name": "testt call"
   }
   ```

5. Check that the response starts with the **Route** section and includes the configured flow, prompts, and integrations.

## Available tools

### `get_ivrs`

Returns the Genesys Cloud routing/IVR list.

Example request:

```text
List the available Genesys IVRs.
```

### `get_flow_by_name`

Looks up an IVR by name, retrieves its configured open-hours flow, and returns Markdown documentation.

Input:

```json
{
  "name": "testt call"
}
```

Example request:

```text
Use get_flow_by_name for the IVR named "testt call".
```

If the IVR is not found, or it has no open-hours flow, the tool returns an error describing the problem.

## What the generated documentation includes

The documentation follows the relationship below:

```text
Genesys IVR Route
        ↓
Configured Open-Hours Flow
        ├── Business Focus: customer routing and menu choices
        └── Technical Focus: prompts, variables, tasks, menus, integrations
```

Integration detection covers the common Architect dependencies below:

| Architect element | Documented as |
|---|---|
| `DataAction` | Data Action / Web Services Data Action |
| `CallBotFlowAction` | Bot Flow, including name and flow ID |
| `TransferPureMatchAction` | ACD Queue |

All TTS prompts found in tasks and menu greetings are included in the technical flow walk.

## Test with Claude Desktop

1. Build the project:

   ```powershell
   cd <path-to-genesys-flow-mcp>
   npm run build
   ```

2. In **Claude Desktop**, open:

   ```text
   File → Settings → Developer → Edit Config
   ```

3. Add the following at the top level of the opened JSON file. Preserve any existing settings such as `preferences`.

   ```json
   {
     "mcpServers": {
       "genesys-flow": {
         "command": "node",
         "args": [
           "<path-to-genesys-flow-mcp>\\dist\\index.js"
         ],
         "env": {
           "GENESYS_CLIENT_ID": "your-client-id",
           "GENESYS_CLIENT_SECERET": "your-client-secret",
           "GENESYS_REGION": "ie"
         }
       }
     }
   }
   ```

   Replace `<path-to-genesys-flow-mcp>` with the full path to your local project folder. If the file already contains properties, add `mcpServers` alongside them and ensure the preceding property ends with a comma.

4. Fully quit and reopen Claude Desktop.

5. Start a new chat and ask:

   ```text
   What Genesys tools are available?
   ```

   Then test the documentation:

   ```text
   Use get_flow_by_name for the IVR named "testt call" and document its route, configured flow, prompts, and integrations.
   ```

Do not commit or share the Claude Desktop config if it contains your client secret. For a local test on a personal device, passing the credentials through the MCP `env` block is acceptable. Use a dedicated OAuth client with the minimum required Genesys permissions.

## Build check

Run the TypeScript build check after code changes:

```powershell
npm run build
```

## Project structure

```text
src/
├── config/       Environment variable validation
├── mcp/          MCP server and tool registration
├── services/     Genesys authentication, API access, and documentation generation
├── tools/        MCP tool handlers
└── types/        Genesys Cloud response types
```
