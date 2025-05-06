/**
 * Elux Server Core
 * Entry point for server-side functionality
 */

// Export for server-side rendering
export { renderToString } from "./renderer";
export { handleRequest } from "./router";

// Export server component API
export {
  renderServerComponent,
  getHydrationData,
  renderWithHydration,
} from "./server";

// Export SSR context type
export interface SSRContext {
  req?: any;
  res?: any;
  params: Record<string, string>;
  url?: string;
  isSSR?: boolean;
  isSSG?: boolean;
}
