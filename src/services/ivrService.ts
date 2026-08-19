import { IvrResponse } from "../types/ivrResponse.js";
import { GenesysClient } from "./genesysClient.js";

export class IvrService {
  constructor(private readonly genesysClient: GenesysClient) {}

  async getIvrs(): Promise<IvrResponse> {
    return this.genesysClient.get<IvrResponse>("/architect/ivrs");
  }

  async getIvr(name: string): Promise<IvrResponse> {
    return this.genesysClient.get<IvrResponse>(`/architect/ivrs?name=${name}`);
  }
}
