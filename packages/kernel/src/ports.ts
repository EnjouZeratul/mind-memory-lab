import type { ChatMessage } from "./types/thinking.js";

export interface SessionPort {
  loadSession(sessionId: string): Promise<ChatMessage[]>;
  appendMessage(sessionId: string, msg: ChatMessage): Promise<void>;
}

export interface RecallPort {
  recallForPrompt(
    query: string,
    ftsLimit: number,
    maxApproxTokens: number,
  ): Promise<{ path: string; chunkId: string; excerpt: string }[]>;
}

export interface WorkspaceSnippetPort {
  searchSnippets(query: string, limit: number): Promise<{ path: string; text: string }[]>;
}
