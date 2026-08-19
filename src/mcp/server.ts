import { McpServer } from "@modelcontextprotocol/server";
import { getIvrsTool, getFlowByNameTool } from "../tools/index.js";

export function createMcpServer() {
  const server = new McpServer({
    name: "genesys-flow-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    getIvrsTool.name,
    {
      description: getIvrsTool.description,
      inputSchema: getIvrsTool.inputSchema,
    },
    getIvrsTool.handler as any,
  );

  server.registerTool(
    getFlowByNameTool.name,
    {
      description: getFlowByNameTool.description,
      inputSchema: getFlowByNameTool.inputSchema,
    },
    getFlowByNameTool.handler as any,
  );

  return server;
}
