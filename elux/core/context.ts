/**
 * Elux Framework - Context API
 * Provides automatic global state management inspired by React Context
 */

import { Signal, createSignal } from "./signals";
import { getCurrentComponent, reRenderComponent } from "../client/renderer";
import { print, printError } from "./utils";

// Global store for all context values
const globalStore: Record<string, Signal<any>> = {};

// Store component references for direct DOM updates
const componentRefs: Map<string, Function[]> = new Map();

// Store effect cleanup functions
const effectCleanups: Map<Function, (() => void)[]> = new Map();

// Initialize with default values
const initialState = {
  count: 0,
  title: "Elux Framework",
  description: "A TypeScript framework from scratch — no React required!",
};

// Set up initial store values
for (const [key, value] of Object.entries(initialState)) {
  globalStore[key] = createSignal(value);
}

// Force DOM update for specific elements (fallback for when signals fail)
function forceUpdateDOM(key: string, value: any) {
  if (key === "count" && typeof document !== "undefined") {
    // Find all counter elements
    const counterElements = document.querySelectorAll(
      ".text-primary.text-lg.font-bold"
    );
    counterElements.forEach((element) => {
      if (element.textContent && element.textContent.includes("Count:")) {
        // Update the counter text directly
        const label = element.textContent.split(":")[0];
        element.textContent = `${label}: ${value}`;
      }
    });
  }
}

/**
 * Get state from global store with auto-tracking for the current component
 * Elux Framework's signature state hook - unique from React's useState
 */
export function eState<T>(
  key: string,
  defaultValue?: T
): [() => T, (value: T) => void] {
  // Create the signal if it doesn't exist
  if (!globalStore[key] && defaultValue !== undefined) {
    globalStore[key] = createSignal(defaultValue);
  } else if (!globalStore[key]) {
    globalStore[key] = createSignal(null);
  }

  const signal = globalStore[key];

  // Register current component for this key if we have one
  const currentComponent = getCurrentComponent();
  if (currentComponent) {
    if (!componentRefs.has(key)) {
      componentRefs.set(key, [currentComponent]);
    } else if (!componentRefs.get(key)!.includes(currentComponent)) {
      componentRefs.get(key)!.push(currentComponent);
    }
  }

  // Return getter and setter functions
  return [
    // Getter function that reads the signal when called
    () => signal.get(),

    // Setter updates the value
    (newValue: T) => {
      signal.set(newValue);

      // For critical values like count, force DOM update as fallback
      forceUpdateDOM(key, newValue);

      // Also try to manually re-render any components registered for this key
      const components = componentRefs.get(key) || [];
      components.forEach((component) => {
        print(`Manually triggering re-render for ${key} component`);
        setTimeout(() => {
          try {
            reRenderComponent(component);
          } catch (e) {
            printError("Error re-rendering component:", e);
          }
        }, 0);
      });
    },
  ];
}

// For backwards compatibility - will be deprecated in future versions
export const useState = eState;

/**
 * Effect hook for handling side effects
 * Similar to React's useEffect but with Elux naming convention
 */
export function eFx(
  effect: () => void | (() => void),
  dependencies?: any[]
): void {
  const currentComponent = getCurrentComponent();
  if (!currentComponent) {
    printError("eFx called outside of component rendering");
    return;
  }

  // Create unique key for this effect instance
  const isFirstRender = !effectCleanups.has(currentComponent);

  // Run effect and store any cleanup function
  if (isFirstRender || !dependencies) {
    // Run the effect function
    runEffect(currentComponent, effect);
  } else if (dependencies && dependencies.length === 0) {
    // Empty deps array means "run only once"
    if (isFirstRender) {
      runEffect(currentComponent, effect);
    }
  } else {
    // We don't actually track dependencies in this implementation
    // Just run the effect each time
    runEffect(currentComponent, effect);
  }

  // Cleanup function to run when component unmounts
  if (isFirstRender) {
    const originalUnmount = currentComponent.prototype?.componentWillUnmount;
    currentComponent.prototype.componentWillUnmount = function () {
      // Run any stored cleanup functions
      const cleanups = effectCleanups.get(currentComponent) || [];
      cleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          printError("Error in effect cleanup:", e);
        }
      });

      // Call the original unmount if it exists
      if (originalUnmount) {
        originalUnmount.call(this);
      }
    };
  }
}

// Helper to run an effect and store its cleanup
function runEffect(
  component: Function,
  effect: () => void | (() => void)
): void {
  try {
    // Run the effect and get any cleanup function
    const cleanup = effect();

    // If the effect returned a cleanup function, store it
    if (typeof cleanup === "function") {
      if (!effectCleanups.has(component)) {
        effectCleanups.set(component, []);
      }
      effectCleanups.get(component)!.push(cleanup);
    }
  } catch (e) {
    printError("Error in effect:", e);
  }
}

// For backwards compatibility
export const useEffect = eFx;

/**
 * Get multiple state values at once
 */
export function useStore<T extends Record<string, any>>(
  selector: (state: Record<string, any>) => T
): T {
  // Build current state object
  const state: Record<string, any> = {};

  for (const [key, signal] of Object.entries(globalStore)) {
    // Reading each signal automatically tracks dependencies
    state[key] = signal.get();
  }

  // Return the selected slice of state
  return selector(state);
}

/**
 * Create a page context that mimics Next.js getServerSideProps
 */
export function createPageContext<T extends Record<string, any>>(
  initialData: T
): void {
  // Update the global store with initial data
  for (const [key, value] of Object.entries(initialData)) {
    if (globalStore[key]) {
      globalStore[key].set(value);
    } else {
      globalStore[key] = createSignal(value);
    }
  }
}

/**
 * Simplified API to provide a Next.js-like experience
 * Access state without explicitly passing props
 */
export function usePageProps<T>(): Record<string, () => any> {
  // Build and return current state with getter functions
  const state: Record<string, () => any> = {};

  for (const [key, signal] of Object.entries(globalStore)) {
    // Create a getter function for each signal
    state[key] = () => signal.get();
  }

  return state as unknown as Record<keyof T, () => any>;
}

/**
 * Direct access to update state
 */
export function updateState(update: Record<string, any>): void {
  for (const [key, value] of Object.entries(update)) {
    if (globalStore[key]) {
      globalStore[key].set(value);
      // For critical values, also force DOM update
      forceUpdateDOM(key, value);
    } else {
      globalStore[key] = createSignal(value);
    }
  }
}

/**
 * Initialize the state system with page data (like Next.js getServerSideProps)
 */
export function hydrateState(initialData: Record<string, any>): void {
  createPageContext(initialData);

  // Also make the data available on window for client hydration
  if (typeof window !== "undefined") {
    (window as any).__INITIAL_DATA__ = initialData;
  }
}
