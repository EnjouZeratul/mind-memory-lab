import type { ThinkingInput, ThinkingOutput } from "./types/thinking.js";

export interface LLMProvider {
  readonly backendType: string;
  complete(input: ThinkingInput): Promise<ThinkingOutput>;
}
