/**
 * Elux Prisma Plugin
 * Database access layer using Prisma ORM
 */

import { Plugin, PluginEnvironment } from "./index";
import { print, printError } from "../core/utils";

// Prisma plugin options
export interface PrismaOptions {
  schemaPath?: string;
  connectionString?: string;
  logQueries?: boolean;
  maxPoolSize?: number;
}

// Define PrismaClient interface (simplified)
export interface PrismaClient {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
  $executeRaw: (query: string) => Promise<any>;
  $transaction: <T>(fn: (prisma: PrismaClient) => Promise<T>) => Promise<T>;
  [key: string]: any;
}

// Prisma service class
class PrismaService {
  private client: PrismaClient | null = null;
  private options: PrismaOptions = {};
  private initialized: boolean = false;

  // Set prisma options
  setOptions(options: PrismaOptions): void {
    this.options = options;
  }

  // Initialize Prisma client
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // In a real implementation, this would dynamically import and initialize Prisma
      // For now, we'll just simulate it with a proxy object
      this.client = createMockPrismaClient(this.options);
      await this.client.$connect();
      this.initialized = true;
      print("Prisma client initialized");
    } catch (error) {
      printError("Failed to initialize Prisma client:", error);
      throw error;
    }
  }

  // Get Prisma client instance
  getClient(): PrismaClient | null {
    if (!this.initialized) {
      printError("Prisma client not initialized. Call initialize() first.");
    }
    return this.client;
  }

  // Close Prisma client connection
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
      this.initialized = false;
      print("Prisma client disconnected");
    }
  }
}

// Create singleton Prisma service
const prismaService = new PrismaService();

// Create a mock Prisma client for development
function createMockPrismaClient(options: PrismaOptions): PrismaClient {
  // Create a proxy to simulate Prisma client
  return new Proxy(
    {
      $connect: async () => {
        print(`[Prisma] Connected to database`);
        return Promise.resolve();
      },
      $disconnect: async () => {
        print(`[Prisma] Disconnected from database`);
        return Promise.resolve();
      },
      $executeRaw: async (query: string) => {
        if (options.logQueries) {
          print(`[Prisma] Executing raw query: ${query}`);
        }
        return Promise.resolve({ count: 0 });
      },
      $transaction: async (fn: (prisma: any) => Promise<any>) => {
        print(`[Prisma] Starting transaction`);
        // Just use the client directly instead of using 'this'
        const result = await fn(prismaService.getClient());
        print(`[Prisma] Transaction completed`);
        return result;
      },
    },
    {
      get: (target, prop) => {
        // Handle known properties
        if (prop in target) {
          return target[prop as keyof typeof target];
        }

        // Simulate model access (user, post, etc.)
        return new Proxy(
          {},
          {
            get: (_, methodName) => {
              return async (...args: any[]) => {
                if (options.logQueries) {
                  print(
                    `[Prisma] ${String(prop)}.${String(
                      methodName
                    )} called with args:`,
                    args
                  );
                }
                // Return mock data based on the model and method
                if (methodName === "findMany") {
                  return [];
                }
                if (methodName === "findUnique" || methodName === "findFirst") {
                  return null;
                }
                if (
                  methodName === "create" ||
                  methodName === "update" ||
                  methodName === "upsert"
                ) {
                  return { id: "mock-id", ...args[0]?.data };
                }
                if (methodName === "delete") {
                  return { id: args[0]?.where?.id || "mock-id" };
                }
                if (methodName === "count") {
                  return 0;
                }
                return null;
              };
            },
          }
        );
      },
    }
  ) as PrismaClient;
}

// Create the Prisma plugin
export const PrismaPlugin: Plugin = {
  name: "prisma",
  version: "0.1.0",
  environment: "server" as PluginEnvironment,

  // Set up the Prisma plugin
  async setup(options?: PrismaOptions): Promise<void> {
    const prismaOptions = options || {};

    try {
      prismaService.setOptions(prismaOptions);
      await prismaService.initialize();
      print("Prisma plugin setup complete");
    } catch (error) {
      printError("Failed to setup Prisma plugin:", error);
      throw error;
    }
  },

  // Teardown the Prisma plugin
  async teardown(): Promise<void> {
    await prismaService.disconnect();
    print("Prisma plugin teardown complete");
  },
};

// Export Prisma client getter
export const prisma = {
  // Get Prisma client
  getClient: (): PrismaClient | null => {
    return prismaService.getClient();
  },

  // Run in transaction
  transaction: async <T>(
    fn: (client: PrismaClient) => Promise<T>
  ): Promise<T> => {
    const client = prismaService.getClient();
    if (!client) {
      throw new Error("Prisma client not initialized");
    }
    return client.$transaction(fn);
  },
};

// Utility to create a Prisma schema
export function createPrismaSchema(models: string[]): string {
  const header = `
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

  return header + models.join("\n\n");
}

// Export default plugin
export default PrismaPlugin;
