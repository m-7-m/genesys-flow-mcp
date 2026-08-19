import axios from "axios";
import { env } from "../config/env.js";

export class GenesysAuth {
  private accessToken?: string;
  private expiresAt = 0;

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${env.genesys.clientId}:${env.genesys.clientSecret}`,
    ).toString("base64");

    const response = await axios.post(
      `https://login.mypurecloud.${env.genesys.region}/oauth/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    this.accessToken = response.data.access_token;
    this.expiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

    if (!this.accessToken) {
      throw new Error("Failed to obtain access token");
    }

    return this.accessToken;
  }
}
