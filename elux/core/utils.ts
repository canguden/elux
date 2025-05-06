/**
 * Elux Framework - Utilities
 * Core utilities and helper functions
 */

// Config for print behavior
const DEBUG_MODE = true;
const PREFIX_COLOR = "#0070f3";

/**
 * Enhanced logging utility to replace console.log with print, my personal preference
 * Provides consistent formatting and can be toggled globally
 */
export function print(...args: any[]): void {
  if (!DEBUG_MODE) return;

  const prefix = `%c[Elux]`;
  const prefixStyle = `color: ${PREFIX_COLOR}; font-weight: bold;`;

  if (typeof window !== "undefined" && window.document) {
    // Browser environment
    console.log(prefix, prefixStyle, ...args);
  } else {
    // Node.js environment
    console.log(`[Elux]`, ...args);
  }
}

/**
 * Print error messages
 */
export function printError(...args: any[]): void {
  const prefix = `%c[Elux Error]`;
  const prefixStyle = `color: #e53e3e; font-weight: bold;`;

  if (typeof window !== "undefined" && window.document) {
    console.error(prefix, prefixStyle, ...args);
  } else {
    console.error(`[Elux Error]`, ...args);
  }
}

/**
 * Print warning messages
 */
export function printWarn(...args: any[]): void {
  const prefix = `%c[Elux Warning]`;
  const prefixStyle = `color: #dd6b20; font-weight: bold;`;

  if (typeof window !== "undefined" && window.document) {
    console.warn(prefix, prefixStyle, ...args);
  } else {
    console.warn(`[Elux Warning]`, ...args);
  }
}

/**
 * Enable or disable debug logging
 */
export function setDebugMode(enabled: boolean): void {
  (window as any).__ELUX_DEBUG__ = enabled;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return typeof window !== "undefined"
    ? (window as any).__ELUX_DEBUG__ === true
    : DEBUG_MODE;
}
