import { z } from "zod";
import { ivrService } from "../services/index.js";

export const getIvrsTool = {
  name: "get_ivrs",
  description: "Get all available IVRs from Genesys Cloud.",
  inputSchema: z.object({}),
  handler: async () => {
    const result = await ivrService.getIvrs();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
