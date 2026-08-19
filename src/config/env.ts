import "dotenv/config";

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing env variable ${name}`);
  }

  return value;
};

export const env = {
  genesys: {
    clientId: requiredEnv("GENESYS_CLIENT_ID"),
    clientSecret: requiredEnv("GENESYS_CLIENT_SECERET"),
    region: requiredEnv("GENESYS_REGION"),
  },
};
