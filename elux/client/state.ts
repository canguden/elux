// Type definitions
type Subscriber = () => void;
type Cleanup = () => void;

// Current reactive context
let currentEffect: Subscriber | null = null;

// Signal implementation for reactive state
export class Signal<T> {
  private value: T;
  private subscribers = new Set<Subscriber>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  // Read the signal value and track dependencies
  get(): T {
    if (currentEffect) {
      this.subscribers.add(currentEffect);
    }
    return this.value;
  }

  // Update the signal value and notify subscribers
  set(newValue: T): void {
    if (Object.is(this.value, newValue)) {
      return; // Skip update if value hasn't changed
    }

    this.value = newValue;
    this.notify();
  }

  // Update using a function based on previous value
  update(fn: (prev: T) => T): void {
    this.set(fn(this.value));
  }

  // Notify all subscribers about the change
  private notify(): void {
    // Create a new set to avoid issues if subscribers modify the subscription list
    const subscribers = new Set(this.subscribers);
    subscribers.forEach((subscriber) => subscriber());
  }

  // Remove a subscriber
  unsubscribe(subscriber: Subscriber): void {
    this.subscribers.delete(subscriber);
  }
}

// Create a new signal
export function createSignal<T>(
  initialValue: T
): [() => T, (newValue: T) => void] {
  const signal = new Signal<T>(initialValue);

  const getter = () => signal.get();
  const setter = (newValue: T) => signal.set(newValue);

  return [getter, setter];
}

// Create a computed signal that derives from other signals
export function computed<T>(computation: () => T): () => T {
  const signal = new Signal<T>(undefined as unknown as T);

  // Effect that updates the computed value
  const update = () => {
    const newValue = computation();
    signal.set(newValue);
  };

  // Initial computation
  effect(update);

  return () => signal.get();
}

// Run an effect function that automatically tracks dependencies
export function effect(fn: Subscriber): Cleanup {
  const execute = () => {
    currentEffect = execute;
    try {
      fn();
    } finally {
      currentEffect = null;
    }
  };

  execute(); // Run initially

  // Return cleanup function
  return () => {
    // We would need to maintain a list of dependencies to properly clean up
    // This is a simplified implementation
  };
}

// Create a reactive store for more complex state
export function createStore<T extends object>(initialState: T) {
  const state = new Signal<T>(initialState);

  function getState(): T {
    return state.get();
  }

  function setState(newState: Partial<T>): void {
    state.set({ ...state.get(), ...newState });
  }

  function update(updater: (state: T) => Partial<T>): void {
    const currentState = state.get();
    setState(updater(currentState));
  }

  return {
    getState,
    setState,
    update,
  };
}

// Batch updates to prevent multiple re-renders
let batchDepth = 0;
const pendingEffects = new Set<Subscriber>();

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const effects = new Set(pendingEffects);
      pendingEffects.clear();
      effects.forEach((effect) => effect());
    }
  }
}

// Component for tracking component state and lifecycle
export type Component<P = {}> = (props: P) => any;

// Component context for lifecycle and render information
export interface ComponentContext {
  isMounted: boolean;
  update: () => void;
  cleanup: () => void;
}

// Component contexts by component instance
const componentContexts = new WeakMap<Component, ComponentContext>();

// Get context for the current component
export function getComponentContext(component: Component): ComponentContext {
  if (!componentContexts.has(component)) {
    const context: ComponentContext = {
      isMounted: false,
      update: () => {
        // To be implemented with the renderer
      },
      cleanup: () => {
        // Cleanup effects when component unmounts
      },
    };
    componentContexts.set(component, context);
  }

  return componentContexts.get(component)!;
}

// Hook-like API for component state
export function eState<T>(
  component: Component,
  initialValue: T
): [() => T, (newValue: T) => void] {
  const signal = new Signal<T>(initialValue);
  const context = getComponentContext(component);

  const getter = () => signal.get();
  const setter = (newValue: T) => {
    signal.set(newValue);
    context.update();
  };

  return [getter, setter];
}

// For backwards compatibility
export const useState = eState;

// Hook-like API for effects within components
export function useEffect(
  component: Component,
  effect: () => Cleanup | void,
  deps: any[] = []
): void {
  const context = getComponentContext(component);
  let cleanup: Cleanup | void;

  // Setup effect
  if (!context.isMounted) {
    cleanup = effect();
    if (typeof cleanup === "function") {
      context.cleanup = cleanup;
    }
  }
}
