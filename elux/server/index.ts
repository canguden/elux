/**
 * Elux Server Core
 * Entry point for server-side functionality
 */

// Export server-side renderer
export { renderToString, type VNode } from './renderer';

// Export router functionality
export * from './router';

// Export SSR context type
export interface SSRContext {
  req?: any;
  res?: any;
  params: Record<string, string>;
  url?: string;
  isSSR?: boolean;
  isSSG?: boolean;
} 