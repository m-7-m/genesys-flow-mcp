import axios, { AxiosInstance } from "axios";
import { GenesysAuth } from "./genesysAuth.js";
import { env } from "../config/env.js";

export class GenesysClient {
  private client: AxiosInstance;

  constructor(private readonly auth: GenesysAuth) {
    this.client = axios.create({
      baseURL: `https://api.mypurecloud.${env.genesys.region}/api/v2`,
      headers: {
        Accept: "application/json",
      },
    });
  }

  async get<T>(path: string): Promise<T> {
    const token = this.auth.getAccessToken();

    const response = await this.client.get<T>(path, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }
}
