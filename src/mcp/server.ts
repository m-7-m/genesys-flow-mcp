import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export function createMcpServer() {
  const server = new McpServer({
    name: "genesys-flow-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "add",
    {
      description: "Add two numbers",
      inputSchema: z.object({
        a: z.number(),
        b: z.number(),
      }),
    },
    async ({ a, b }) => {
      return {
        content: [
          {
            type: "text",
            text: String(a + b),
          },
        ],
      };
    },
  );

  return server;
}
