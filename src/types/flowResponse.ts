// ==========================================
// 1. Primitive & Generic Config Types
// ==========================================

export type ConfigType =
  | "str"
  | "int"
  | "bln"
  | "dur"
  | "aud"
  | "pmt"
  | "que"
  | "usr"
  | "lac"
  | "str_coll"
  | "int_coll"
  | "cpx_agent_score_pair_coll"
  | "jsn__architect::skill_expression_filter_coll";

export interface ExpressionConfigItem {
  pos: number;
  text: string;
  type: ConfigType;
  val?: string;
}

export interface ExpressionOperand {
  lit?: ExpressionConfigItem;
  ref?: ExpressionConfigItem;
  sysref?: ExpressionConfigItem;
  GetAt?: ExpressionAST;
  ToAudioTTS?: ExpressionAST;
  Append?: ExpressionAST;
  [key: string]: any;
}

export interface ExpressionAST {
  pos?: number;
  operands?: ExpressionOperand[];
  type?: ConfigType;
  [key: string]: any;
}

export interface ExpressionConfig {
  lit?: ExpressionConfigItem;
  emp?: ExpressionConfigItem;
  sysref?: ExpressionConfigItem;
  AudioPlaybackOptions?: ExpressionAST;
  ToAudioTTS?: ExpressionAST;
  "=="?: ExpressionAST;
  [key: string]: any;
}

export interface ReferenceItem {
  id: string;
  type: ConfigType;
  isSysRef: boolean;
  name: string;
}

export interface ExpressionMetaData {
  references?: ReferenceItem[];
  [key: string]: any;
}

export interface ExpressionField {
  config: ExpressionConfig;
  text: string;
  type: ConfigType;
  uiMetaData?: {
    mode?: number;
    sequenceItems?: Array<{
      type: number;
      parameter?: string;
      error?: string;
    }>;
    customExpressionMode?: boolean;
    optional?: boolean;
  };
  metaData?: ExpressionMetaData;
  version?: number;
  outOfService?: boolean;
}

// ==========================================
// 2. Audio & Prompts Definitions
// ==========================================

export interface AudioPrompts {
  bargeInExpression: ExpressionField;
  flushExpression: ExpressionField;
  defaultAudio: ExpressionField;
  cases: any[];
}

export interface CommunicationBuilderPart {
  version: number;
  id: string;
  builderPartExpressions: ExpressionField[];
  builderPartDefId: string;
  outOfService: boolean;
}

export interface CommunicationField {
  text: string;
  type: string;
  uiMetaData: {
    mode: number;
    builder: {
      builderDefId: string;
      version: number;
      id: string;
      builderParts: CommunicationBuilderPart[];
    };
  };
  version: number;
  outOfService?: boolean;
}

// ==========================================
// 3. Schema & Data Action Contracts
// ==========================================

export interface SchemaProperty {
  type: "string" | "integer" | "boolean" | "array" | "object";
  name: string;
  required?: boolean;
  description?: string;
  items?: {
    type: string;
    description?: string;
  };
}

export interface JSONSchema {
  $schema?: string;
  title?: string;
  description?: string;
  type: "object" | "array" | string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
  additionalProperties?: boolean;
}

export interface DataActionContract {
  input: {
    inputSchemaFlattened: {
      schema: JSONSchema;
    };
  };
  output: {
    errorSchemaFlattened: {
      schema: JSONSchema;
    };
    successSchemaFlattened: {
      schema: JSONSchema;
    };
  };
}

export interface ActionServiceAction {
  id: string;
  name: string;
  category: string;
  contract: DataActionContract;
  result: string;
  inputSchema: JSONSchema;
  successSchema: JSONSchema;
  errorSchema: JSONSchema;
}

// ==========================================
// 4. Custom Property & DataType Definitions
// ==========================================

export interface CustomProperty {
  id: string;
  name: string;
  description: string;
  dataTypeId: ConfigType | string;
  isCollection: boolean;
  readOnly: boolean;
}

export interface DataTypeDefinition {
  id: string;
  name: string;
  dataTypeId: string;
  properties: CustomProperty[];
}

export interface CustomDefinitions {
  dataTypeDefinitions: DataTypeDefinition[];
}

// ==========================================
// 5. Actions Definitions (Flow Actions)
// ==========================================

export type ActionType =
  | "Task"
  | "DecisionAction"
  | "PlayAudioAction"
  | "DisconnectAction"
  | "TransferMenuAction"
  | "DataAction"
  | "TransferPureMatchAction"
  | "Menu";

export interface ActionPath {
  label: string;
  outputId: string;
  isCategory: boolean;
  nextActionId?: string;
  uiMetaData?: {
    collapsed: boolean;
  };
}

export interface BaseAction {
  id: string;
  name: string;
  trackingId: number;
  __type: ActionType;
  uiMetaData?: {
    collapsed: boolean;
  };
}

export interface DecisionAction extends BaseAction {
  __type: "DecisionAction";
  expression: ExpressionField;
  paths: ActionPath[];
}

export interface PlayAudioAction extends BaseAction {
  __type: "PlayAudioAction";
  nextAction?: string;
  prompts: AudioPrompts;
}

export interface DisconnectAction extends BaseAction {
  __type: "DisconnectAction";
}

export interface TransferMenuAction extends BaseAction {
  __type: "TransferMenuAction";
  menuReference: string;
  menuName: string;
}

export interface DataActionInputOutput {
  name: string;
  value: ExpressionField;
}

export interface DataAction extends BaseAction {
  __type: "DataAction";
  actionName: string;
  actionId: string;
  category: {
    id: string;
    name: string;
  };
  useSuggestedTimeout: boolean;
  nextAction?: string;
  errorBindings: any[];
  processingPrompt: ExpressionField;
  inputs: DataActionInputOutput[];
  outputs: DataActionInputOutput[];
  timeout: ExpressionField;
  paths: ActionPath[];
}

export interface TransferPureMatchAction extends BaseAction {
  __type: "TransferPureMatchAction";
  useDefaultHandling: boolean;
  nextAction?: string;
  appendSkills: ExpressionField;
  directAgent: ExpressionField;
  languageSkill: ExpressionField;
  preferredAgents: ExpressionField;
  priority: ExpressionField;
  queues: ExpressionField[];
  skills: any[];
  skillExpressionFilters: ExpressionField;
  errorBindings: Array<{
    name: string;
    value: ExpressionField;
  }>;
  preTransferAudio: AudioPrompts;
  preTransferCommunication: CommunicationField;
  failureTransferAudio: AudioPrompts;
  failureTransferCommunication: CommunicationField;
  paths: ActionPath[];
}

export type FlowAction =
  | DecisionAction
  | PlayAudioAction
  | DisconnectAction
  | TransferMenuAction
  | DataAction
  | TransferPureMatchAction;

// ==========================================
// 6. Flow Variables & Tasks
// ==========================================

export interface FlowVariable {
  id: string;
  isCollection: boolean;
  isInternal: boolean;
  isOutput: boolean;
  isInput: boolean;
  isSecure: boolean;
  version: string;
  __type: "StringVariable" | "BooleanVariable" | "IntegerVariable" | string;
  name: string;
  initialValue: ExpressionField;
}

export interface FlowSequenceTask {
  id: string;
  name: string;
  trackingId: number;
  startAction?: string;
  __type: "Task" | "Menu";
  uiMetaData?: {
    collapsed: boolean;
  };
  paths?: ActionPath[];
  actionList?: FlowAction[];
  variables?: FlowVariable[];
  [key: string]: any;
}

// ==========================================
// 7. Metadata, Manifest & Defaults
// ==========================================

export interface UIMetaDataItem {
  id: string;
  name: string;
}

export interface UIMetaData {
  task: UIMetaDataItem[];
  menu: UIMetaDataItem[];
  bridgeServerActions: any[];
  screenPops: any[];
  actionServiceActions: ActionServiceAction[];
}

export interface ManifestContextItem {
  id?: string;
  name?: string;
  actionName?: string;
}

export interface ManifestEntry {
  id: string;
  name?: string;
  context?: ManifestContextItem[];
}

export interface Manifest {
  dataAction: ManifestEntry[];
  queue: ManifestEntry[];
  ttsEngine: ManifestEntry[];
  ttsVoice: ManifestEntry[];
  language: Array<{ id: string }>;
  userPrompt: any[];
  systemPrompt: ManifestEntry[];
}

export interface DefaultSettings {
  PlayAudioOnSilenceAction?: Record<string, ExpressionField>;
  DetectSilenceAction?: Record<string, ExpressionField>;
  DataAction?: Record<string, ExpressionField>;
  CollectInputAction?: Record<string, ExpressionField>;
  DialExtensionAction?: Record<string, ExpressionField>;
  TransferUserAction?: Record<string, ExpressionField>;
  TransferExternalAction?: Record<string, ExpressionField>;
  TransferGroupAction?: Record<string, ExpressionField>;
  TransferFlowSecureAction?: Record<string, ExpressionField>;
  Menu?: Record<string, ExpressionField>;
  SpeechRec?: Record<string, ExpressionField>;
  [key: string]: Record<string, ExpressionField> | undefined;
}

export interface ErrorHandlingConfig {
  audio: AudioPrompts;
  queue: ExpressionField;
  handlingType: "Disconnect" | string;
}

// ==========================================
// 8. Root IVR Flow Document
// ==========================================

export interface FlowResponse {
  defaultLanguage: string;
  description: string;
  initialSequence: string;
  name: string;
  nextTrackingNumber: number;
  uiMetaData: UIMetaData;
  supportedLanguages: string[];
  manifest: Manifest;
  type: "inboundcall" | string;
  isSecure: boolean;
  debugSettings: Record<string, any>;
  disableAsr: ExpressionField;
  disableAsrCompanyDirectory: ExpressionField;
  errorHandling: ErrorHandlingConfig;
  initialPrompts: AudioPrompts;
  speechRecCompanyDirectory: ExpressionField;
  speechRecEngine: ExpressionField;
  suppressRecording: ExpressionField;
  customDefinitions: CustomDefinitions;
  defaultSettings: DefaultSettings;
  flowMetaData: {
    flowDocumentVersion: string;
    minimumServerVersion: string;
    ttsDataVersion: string;
  };
  flowSequenceItemList: FlowSequenceTask[];
}
