import { GenesysAuth } from "./genesysAuth.js";
import { GenesysClient } from "./genesysClient.js";
import { IvrService } from "./ivrService.js";
import { FlowService } from "./flowService.js";
import { DocService } from "./docService.js";

const genesysAuth = new GenesysAuth();

export const genesysClient = new GenesysClient(genesysAuth);

export const ivrService = new IvrService(genesysClient);

export const flowService = new FlowService(genesysClient);

export const docService = new DocService();
