export interface SessionSummary {
  pid?: number;
  sessionId: string;
  cwd: string;
  name?: string;
  kind: 'interactive' | 'background' | 'agent';
  startedAt: number;
  status: 'active' | 'completed' | 'killed' | 'error';
  display?: string;
  project: string;
  duration?: number;
}

export interface ClaudeSettings {
  env?: Record<string, string>;
  mcpServers?: Record<string, MCPServer>;
  theme?: string;
  effortLevel?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  model?: string;
}

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
}

// === MCP Tool Types ===

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ProjectSummary {
  slug: string;
  originalPath: string;
  sessionCount: number;
  totalSize: number;
  lastActivity: number;
  sessions: string[];
}

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  hasSkillMd: boolean;
  hasClaudeMd: boolean;
}

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

export interface TranscriptLine {
  type: string;
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  cwd?: string;
  message?: {
    role: 'user' | 'assistant';
    content: ContentBlock[];
  };
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }
  | { type: 'image'; source: { type: string; media_type: string; data: string } };
