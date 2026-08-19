import { z } from "zod";
import { ivrService, flowService, docService } from "../services/index.js";

export const getFlowByNameTool = {
  name: "get_flow_by_name",
  description: "Get a documented Genesys flow by IVR name.",
  inputSchema: z.object({
    name: z.string().describe("IVR name"),
  }),
  handler: async ({ name }: { name: string }) => {
    const ivr = await ivrService.getIvr(name);
    if (!ivr.entities.length) {
      throw new Error(`IVR not found: ${name}`);
    }
    const flowId = ivr.entities[0].openHoursFlow?.id;
    if (!flowId) {
      throw new Error(`No open hours flow found for IVR: ${name}`);
    }
    const flow = await flowService.getFlowById(flowId);
    const doc = docService.generateReadme(flow, ivr.entities[0]);
    return {
      content: [
        {
          type: "text",
          text: doc,
        },
      ],
    };
  },
};
