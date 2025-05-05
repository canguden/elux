/**
 * Elux AI Plugin
 * Provides a unified API for multiple AI providers (OpenAI, Gemini, Anthropic, DeepSeek)
 */

import { Plugin, PluginEnvironment } from "./index";
import { print, printError } from "../core/utils";

// AI provider types
export type AIProvider = "openai" | "gemini" | "anthropic" | "deepseek";

// AI plugin options
export interface AIOptions {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  organization?: string; // OpenAI specific
}

// AI completion request
export interface CompletionRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  stop?: string[];
  context?: string[];
}

// AI chat message
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// AI chat request
export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  stop?: string[];
}

// AI completion response
export interface CompletionResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// AI chat response
export interface ChatResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// AI embedding request
export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

// AI embedding response
export interface EmbeddingResponse {
  embeddings: number[][];
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
  model: string;
}

// AI client interface
export interface AIClient {
  completion: (request: CompletionRequest) => Promise<CompletionResponse>;
  chat: (request: ChatRequest) => Promise<ChatResponse>;
  embed: (request: EmbeddingRequest) => Promise<EmbeddingResponse>;
  getProviderName: () => AIProvider;
  getDefaultModel: (type: "completion" | "chat" | "embedding") => string;
}

// AI service class
class AIService {
  private client: AIClient | null = null;
  private options: AIOptions | null = null;
  private initialized: boolean = false;

  // Set AI options
  setOptions(options: AIOptions): void {
    this.options = options;
  }

  // Initialize AI client
  async initialize(): Promise<void> {
    if (!this.options) {
      throw new Error("AI options not provided. Call setOptions() first.");
    }

    if (this.initialized) {
      return;
    }

    try {
      // In a real implementation, this would dynamically import and initialize the correct provider
      // For now, we'll just simulate it with a mock client
      this.client = createMockAIClient(this.options);
      this.initialized = true;
      print(`AI client initialized for provider: ${this.options.provider}`);
    } catch (error) {
      printError("Failed to initialize AI client:", error);
      throw error;
    }
  }

  // Get AI client instance
  getClient(): AIClient | null {
    if (!this.initialized) {
      printError("AI client not initialized. Call initialize() first.");
    }
    return this.client;
  }

  // Get text completion
  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.client) {
      throw new Error("AI client not initialized");
    }

    try {
      return await this.client.completion(request);
    } catch (error) {
      printError("AI completion error:", error);
      throw error;
    }
  }

  // Get chat completion
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error("AI client not initialized");
    }

    try {
      return await this.client.chat(request);
    } catch (error) {
      printError("AI chat error:", error);
      throw error;
    }
  }

  // Get embeddings
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error("AI client not initialized");
    }

    try {
      return await this.client.embed(request);
    } catch (error) {
      printError("AI embedding error:", error);
      throw error;
    }
  }

  // Get current provider name
  getProviderName(): AIProvider | null {
    return this.client?.getProviderName() || null;
  }
}

// Create a mock AI client for development
function createMockAIClient(options: AIOptions): AIClient {
  const { provider, defaultModel } = options;

  // Default models for each provider and type
  const defaultModels: Record<AIProvider, Record<string, string>> = {
    openai: {
      completion: "gpt-3.5-turbo-instruct",
      chat: "gpt-3.5-turbo",
      embedding: "text-embedding-ada-002",
    },
    gemini: {
      completion: "gemini-pro",
      chat: "gemini-pro",
      embedding: "embedding-001",
    },
    anthropic: {
      completion: "claude-instant-1",
      chat: "claude-2",
      embedding: "claude-embedding",
    },
    deepseek: {
      completion: "deepseek-coder",
      chat: "deepseek-chat",
      embedding: "deepseek-embedding",
    },
  };

  return {
    completion: async (
      request: CompletionRequest
    ): Promise<CompletionResponse> => {
      const model =
        request.model || defaultModel || defaultModels[provider].completion;
      print(
        `[${provider}] Completion request with model ${model}:`,
        request.prompt
      );

      // Simulate token counting
      const promptTokens = Math.ceil(request.prompt.length / 4);
      const completionTokens = Math.ceil(promptTokens * 0.5);

      // Generate a mock response
      let response = "";
      if (request.prompt.includes("hello") || request.prompt.includes("hi")) {
        response = "Hello! How can I assist you today?";
      } else if (request.prompt.includes("weather")) {
        response =
          "I don't have real-time weather data, but I can help you find a weather service.";
      } else if (
        request.prompt.includes("code") ||
        request.prompt.includes("function")
      ) {
        response =
          "Here's a simple example:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```";
      } else {
        response = "I understand your request. How else can I help you?";
      }

      return {
        text: response,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        model,
      };
    },

    chat: async (request: ChatRequest): Promise<ChatResponse> => {
      const model =
        request.model || defaultModel || defaultModels[provider].chat;
      print(
        `[${provider}] Chat request with model ${model}:`,
        request.messages
      );

      // Simulate token counting
      const promptTokens = Math.ceil(
        request.messages.reduce((acc, msg) => acc + msg.content.length, 0) / 4
      );
      const completionTokens = Math.ceil(promptTokens * 0.5);

      // Get the last user message
      const lastUserMessage =
        request.messages
          .slice()
          .reverse()
          .find((msg) => msg.role === "user")?.content || "";

      // Generate a mock response
      let response = "";
      if (lastUserMessage.includes("hello") || lastUserMessage.includes("hi")) {
        response = "Hello! How can I assist you today?";
      } else if (lastUserMessage.includes("weather")) {
        response =
          "I don't have real-time weather data, but I can help you find a weather service.";
      } else if (
        lastUserMessage.includes("code") ||
        lastUserMessage.includes("function")
      ) {
        response =
          "Here's a simple example:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```";
      } else {
        response = "I understand your request. How else can I help you?";
      }

      return {
        message: {
          role: "assistant",
          content: response,
        },
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        model,
      };
    },

    embed: async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
      const model = defaultModel || defaultModels[provider].embedding;
      print(`[${provider}] Embedding request with model ${model}`);

      // Convert input to array if it's a string
      const inputs = Array.isArray(request.input)
        ? request.input
        : [request.input];

      // Generate mock embeddings (32-dimensional)
      const embeddings = inputs.map(() => {
        return Array.from({ length: 32 }, () => Math.random() * 2 - 1);
      });

      // Simulate token counting
      const promptTokens = Math.ceil(
        inputs.reduce((acc, text) => acc + text.length, 0) / 4
      );

      return {
        embeddings,
        usage: {
          promptTokens,
          totalTokens: promptTokens,
        },
        model,
      };
    },

    getProviderName: (): AIProvider => {
      return provider;
    },

    getDefaultModel: (type: "completion" | "chat" | "embedding"): string => {
      return defaultModels[provider][type];
    },
  };
}

// Create the AI plugin
export const AIPlugin: Plugin = {
  name: "ai",
  version: "0.1.0",
  environment: "both" as PluginEnvironment,

  // Set up the AI plugin
  async setup(options?: AIOptions): Promise<void> {
    if (!options?.apiKey) {
      printError("AI plugin requires an API key to be configured");
      return;
    }

    if (!options?.provider) {
      printError("AI plugin requires a provider to be specified");
      return;
    }

    try {
      aiService.setOptions(options);
      await aiService.initialize();
      print(`AI plugin setup complete for provider: ${options.provider}`);
    } catch (error) {
      printError("Failed to setup AI plugin:", error);
      throw error;
    }
  },

  // Teardown the AI plugin
  async teardown(): Promise<void> {
    print("AI plugin teardown complete");
  },
};

// Create singleton AI service
const aiService = new AIService();

// Export AI service API for use in application
export const ai = {
  // Text completion
  completion: (request: CompletionRequest): Promise<CompletionResponse> => {
    return aiService.completion(request);
  },

  // Chat completion
  chat: (request: ChatRequest): Promise<ChatResponse> => {
    return aiService.chat(request);
  },

  // Get embeddings
  embed: (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
    return aiService.embed(request);
  },

  // Helper to create a system message
  system: (content: string): ChatMessage => {
    return { role: "system", content };
  },

  // Helper to create a user message
  user: (content: string): ChatMessage => {
    return { role: "user", content };
  },

  // Helper to create an assistant message
  assistant: (content: string): ChatMessage => {
    return { role: "assistant", content };
  },

  // Get current provider name
  getProvider: (): AIProvider | null => {
    return aiService.getProviderName();
  },
};

// Export default plugin
export default AIPlugin;
