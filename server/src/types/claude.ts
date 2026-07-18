// === Session Types ===

export interface SessionFile {
  pid?: number;
  sessionId: string;
  cwd: string;
  name?: string;
  kind: 'interactive' | 'background' | 'agent';
  startedAt: number;
  procStart?: string;
  version?: string;
  peerProtocol?: number;
  entrypoint?: string;
  nameSource?: string;
}

export interface SessionSummary extends SessionFile {
  status: 'active' | 'completed' | 'killed' | 'error';
  display?: string;
  project: string;
  duration?: number;
}

export interface HistoryEntry {
  display: string;
  pastedContents?: Record<string, unknown>;
  timestamp: number;
  project: string;
  sessionId: string;
}

export interface TranscriptLine {
  type: 'user' | 'assistant' | 'attachment' | 'result' | 'queue-operation' | 'ai-title' | 'file-history-snapshot';
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  cwd?: string;
  version?: string;
  message?: {
    role: 'user' | 'assistant';
    content: ContentBlock[];
    model?: string;
    stop_reason?: string;
    usage?: Usage;
  };
  attachment?: Record<string, unknown>;
  [key: string]: unknown;
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; signature?: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown; is_error?: boolean }
  | { type: 'image'; source: { type: string; media_type: string; data: string } };

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// === Agent Types ===

export interface AgentInfo {
  pid: number;
  cwd: string;
  kind: string;
  startedAt: number;
  sessionId: string;
  name: string;
}

export interface SubAgentMeta {
  agentType?: string;
  description?: string;
  toolUseId?: string;
  spawnDepth?: number;
}

// === Dashboard Agent Types (for tracking spawned sub-agents) ===

export type DashboardAgentStatus = 'running' | 'completed' | 'error';

export interface DashboardAgentInfo {
  id: string;
  name: string;
  description: string;
  kind: string;
  status: DashboardAgentStatus;
  command?: string;
  detail?: string;
  parentId?: string;
  registeredAt: number;
  lastHeartbeat: number;
}

// === Unified Agent Types (for the new Agents page) ===

export type AgentStatus = 'running' | 'completed' | 'error' | 'pending';

export interface AgentActivity {
  type: 'tool_use' | 'tool_result' | 'thinking' | 'message' | 'error' | 'file_write';
  toolName?: string;
  toolInput?: unknown;
  thinking?: string;
  summary?: string;
  timestamp: string;
}

export interface AgentUnifiedNode {
  id: string;
  name: string;
  description: string;
  kind: string;
  status: AgentStatus;
  source: 'claude' | 'dashboard' | 'sub-agent';
  sessionId: string;
  pid?: number;
  cwd?: string;
  startedAt?: number;
  progress: number;
  activity: AgentActivity[];
  children: AgentUnifiedNode[];
}

// === MCP Server Types ===

export interface MCPServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPServerWithName extends MCPServer {
  name: string;
  status?: 'unknown' | 'alive' | 'error';
  error?: string;
  settingsPath?: string;
}

// === Settings Types ===

export interface ClaudeSettings {
  env?: Record<string, string>;
  mcpServers?: Record<string, MCPServer>;
  theme?: string;
  effortLevel?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  model?: string;
  skills?: Record<string, SkillDefinition>;
}

export interface ConfigProfile {
  name: string;
  description?: string;
  settings: ClaudeSettings;
  createdAt: string;
}

// === Skill Types ===

export interface SkillDefinition {
  name: string;
  description: string;
  model?: string;
  systemPromptPath?: string;
  references?: string[];
  triggers?: string[];
  enabled?: boolean;
}

// === Project Types ===

export interface ProjectSummary {
  slug: string;
  originalPath: string;
  sessionCount: number;
  totalSize: number;
  lastActivity: number;
  sessions: string[];
}

// === Chat Types ===

export interface ChatSession {
  sessionId: string;
  title: string;
  slug: string;
  turns: ChatTurn[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatTurn {
  turnId: string;
  prompt: string;
  startedAt: number;
  completedAt?: number;
  transcriptPath?: string;
  exitCode?: number | null;
  tokenUsage?: Usage;
}

// === MCP Tool Types ===

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPToolCallRequest {
  toolName: string;
  args: Record<string, unknown>;
}

// === Dashboard Types ===

export interface DashboardSummary {
  activeSessions: number;
  totalSessions: number;
  projectsCount: number;
  mcpsHealthy: number;
  mcpsTotal: number;
  lastActivity: number | null;
  claudeVersion: string;
  authStatus: 'logged_in' | 'logged_out' | 'unknown';
  activeAgents: number;
}

// === WebSocket Event Types ===

export interface WSLaunchOutput {
  type: 'launch:output';
  sessionId: string;
  text: string;
  stream: 'stdout' | 'stderr' | 'error';
}

export interface WSLaunchDone {
  type: 'launch:done';
  sessionId: string;
  exitCode: number | null;
  duration: number;
}

export interface WSLaunchError {
  type: 'launch:error';
  sessionId: string;
  error: string;
}

export interface WSAgentUpdate {
  type: 'agent:update';
  agents: AgentInfo[];
}

export interface WSAgentTreeUpdate {
  type: 'agent:tree-update';
  tree: any[];
}

export interface WSSettingsChanged {
  type: 'settings:changed';
  settings: ClaudeSettings;
}

export interface WSSessionEvent {
  type: 'session:created' | 'session:deleted' | 'session:updated';
  sessionId: string;
}

// === Chat WS Events ===

export interface WSChatOutput {
  type: 'chat:output';
  sessionId: string;
  turnId: string;
  line: TranscriptLine;
}

export interface WSChatDone {
  type: 'chat:done';
  sessionId: string;
  turnId: string;
  exitCode: number | null;
  duration?: number;
  tokenUsage?: Usage;
}

export interface WSChatError {
  type: 'chat:error';
  sessionId: string;
  turnId: string;
  error: string;
}

// === MCP WS Events ===

export interface WSMCPLog {
  type: 'mcp:log';
  serverName: string;
  text: string;
  stream: 'stdout' | 'stderr';
}

// === Dashboard Agent WS Events ===

export interface WSDashboardAgents {
  type: 'dashboard:agents';
  agents: DashboardAgentInfo[];
}

export interface WSAgentsSync {
  type: 'agents:sync';
  roots: AgentUnifiedNode[];
}

export type WSEvent = WSLaunchOutput | WSLaunchDone | WSLaunchError | WSAgentUpdate | WSAgentTreeUpdate | WSSettingsChanged | WSSessionEvent | WSChatOutput | WSChatDone | WSChatError | WSMCPLog | WSDashboardAgents | WSAgentsSync;

export type WSClientMessage =
  | { type: 'subscribe:launch'; sessionId: string }
  | { type: 'subscribe:agent-watch' }
  | { type: 'subscribe:logs' }
  | { type: 'subscribe:mcp-logs'; serverName: string }
  | { type: 'launch:input'; sessionId: string; text: string }
  | { type: 'launch:cancel'; sessionId: string }
  | { type: 'chat:input'; sessionId: string; turnId: string; text: string }
  | { type: 'chat:cancel'; sessionId: string; turnId: string };
