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
