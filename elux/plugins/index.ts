/**
 * Elux Plugin System
 * A flexible plugin system for extending Elux framework functionality
 */

import { print, printError } from "../core/utils";

// Plugin types
export type PluginEnvironment = "client" | "server" | "both";

// Plugin interface
export interface Plugin {
  name: string;
  version: string;
  environment: PluginEnvironment;
  setup: (options?: any) => Promise<void> | void;
  teardown?: () => Promise<void> | void;
  middleware?: any[];
  extends?: {
    router?: boolean;
    renderer?: boolean;
    app?: boolean;
  };
}

// Plugin registration options
export interface PluginRegistrationOptions {
  [key: string]: any;
}

// Plugin manager class
class PluginManager {
  private plugins: Map<string, { plugin: Plugin; options?: any }> = new Map();
  private activePlugins: Map<string, Plugin> = new Map();
  private isInitialized: boolean = false;

  // Register a plugin
  register(plugin: Plugin, options?: any): void {
    if (this.plugins.has(plugin.name)) {
      printError(`Plugin "${plugin.name}" is already registered. Skipping.`);
      return;
    }

    this.plugins.set(plugin.name, { plugin, options });
    print(`Plugin "${plugin.name}" v${plugin.version} registered.`);
  }

  // Initialize all registered plugins
  async initialize(environment: PluginEnvironment = "both"): Promise<void> {
    if (this.isInitialized) {
      print("Plugin manager already initialized. Skipping.");
      return;
    }

    // Initialize plugins that match the current environment
    for (const [name, { plugin, options }] of this.plugins.entries()) {
      if (plugin.environment === environment || plugin.environment === "both") {
        try {
          await plugin.setup(options);
          this.activePlugins.set(name, plugin);
          print(`Plugin "${name}" initialized successfully.`);
        } catch (error) {
          printError(`Failed to initialize plugin "${name}":`, error);
        }
      }
    }

    this.isInitialized = true;
    print(`${this.activePlugins.size} plugins initialized.`);
  }

  // Get an active plugin by name
  getPlugin<T extends Plugin>(name: string): T | undefined {
    return this.activePlugins.get(name) as T | undefined;
  }

  // Check if a plugin is active
  hasPlugin(name: string): boolean {
    return this.activePlugins.has(name);
  }

  // Get all active plugins
  getAllPlugins(): Plugin[] {
    return Array.from(this.activePlugins.values());
  }

  // Get all middleware from plugins
  getMiddleware(): any[] {
    const middleware: any[] = [];
    for (const plugin of this.activePlugins.values()) {
      if (plugin.middleware && Array.isArray(plugin.middleware)) {
        middleware.push(...plugin.middleware);
      }
    }
    return middleware;
  }

  // Teardown all active plugins
  async teardown(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [name, plugin] of this.activePlugins.entries()) {
      if (plugin.teardown) {
        try {
          const result = plugin.teardown();
          if (result instanceof Promise) {
            promises.push(result);
          }
          print(`Plugin "${name}" teardown initiated.`);
        } catch (error) {
          printError(`Failed to teardown plugin "${name}":`, error);
        }
      }
    }

    await Promise.all(promises);
    this.activePlugins.clear();
    this.isInitialized = false;
    print("All plugins torn down.");
  }
}

// Create and export a singleton instance
export const pluginManager = new PluginManager();

// Default plugin registration function
export function registerPlugin(plugin: Plugin, options?: any): void {
  pluginManager.register(plugin, options);
}

// Export all plugins
export * from "./theme";
export * from "./auth";
export * from "./prisma";
export * from "./stripe";
export * from "./ai";

// Export plugin loaders
import ThemePlugin from "./theme";
import AuthPlugin from "./auth";
import PrismaPlugin from "./prisma";
import StripePlugin from "./stripe";
import AIPlugin from "./ai";

// Standard plugins collection
export const plugins = {
  theme: ThemePlugin,
  auth: AuthPlugin,
  prisma: PrismaPlugin,
  stripe: StripePlugin,
  ai: AIPlugin,
};
