export interface ApiError {
  error: string;
}

export interface TranscriptResponse {
  sessionId: string;
  total: number;
  returned: number;
  offset: number;
  lines: import('./claude').TranscriptLine[];
}

export interface HealthCheckResponse {
  name: string;
  alive: boolean;
  error?: string;
}

// === Chat API ===

export interface CreateChatSessionRequest {
  cwd?: string;
  model?: string;
  effort?: string;
  initialPrompt?: string;
}

export interface CreateChatSessionResponse {
  sessionId: string;
  title: string;
}

export interface StartTurnRequest {
  text: string;
}

export interface StartTurnResponse {
  sessionId: string;
  turnId: string;
}

// === MCP API ===

export interface MCPToolListResponse {
  serverName: string;
  tools: import('./claude').MCPTool[];
  cached: boolean;
}

export interface MCPToolCallResponse {
  toolName: string;
  result: unknown;
  duration: number;
}
