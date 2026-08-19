import { FlowResponse } from "../types/flowResponse.js";
import { GenesysClient } from "./genesysClient.js";

export class FlowService {
  constructor(private readonly genesysClient: GenesysClient) {}

  async getFlowById(flowId: string): Promise<FlowResponse> {
    return this.genesysClient.get<FlowResponse>(
      `/flows/${flowId}/latestconfiguration`,
    );
  }
}
