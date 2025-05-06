/**
 * Elux Framework - Reactive State Management
 * A lightweight signal-based reactivity system
 */

// Import the renderer's component tracking function
import { getCurrentComponent, reRenderComponent } from "../client/renderer";
import { print, printError } from "../core/utils";

// Type definitions
type Subscriber = () => void;
type Cleanup = () => void;

// Track components that depend on each signal
interface ComponentSubscription {
  component: Function;
  signals: Set<Signal<any>>;
}

// Map to track which components subscribe to which signals
const componentSubscriptions = new Map<Function, ComponentSubscription>();

// Current reactive context
let currentEffect: Subscriber | null = null;

/**
 * Signal - Reactive state container
 */
export class Signal<T> {
  private value: T;
  private subscribers = new Set<Subscriber>();
  private components = new Set<Function>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Get the current value and subscribe the current effect
   */
  get(): T {
    // Track this signal as a dependency of the current effect
    if (currentEffect) {
      this.subscribers.add(currentEffect);
    }

    // Track component dependencies for automatic re-rendering
    const currentComponent = getCurrentComponent();
    if (currentComponent) {
      // Add component as dependency of this signal
      this.components.add(currentComponent);

      // Register this signal with the component
      if (!componentSubscriptions.has(currentComponent)) {
        componentSubscriptions.set(currentComponent, {
          component: currentComponent,
          signals: new Set([this]),
        });
      } else {
        componentSubscriptions.get(currentComponent)!.signals.add(this);
      }
    }

    return this.value;
  }

  /**
   * Set a new value and notify subscribers
   */
  set(newValue: T): void {
    if (Object.is(this.value, newValue)) {
      return; // Skip update if value hasn't changed
    }

    // Update the value first
    this.value = newValue;

    // Then notify all subscribers about the change
    this.notify();
    
    // Force a manual DOM update for critical cases - especially important for counters
    if (typeof window !== "undefined" && typeof this.value === "number") {
      this.updateDomDirectly();
    }
  }

  /**
   * Direct DOM updates as a fallback for components that don't re-render properly
   */
  private updateDomDirectly(): void {
    setTimeout(() => {
      if (typeof window === "undefined" || !document) return;

      try {
        // Get the value for debugging
        const valueType = typeof this.value;
        let valueInfo = "unknown";
        
        if (valueType === "number" || valueType === "string" || valueType === "boolean") {
          valueInfo = String(this.value);
        } else if (Array.isArray(this.value)) {
          valueInfo = `array[${this.value.length}]`;
        } else if (valueType === "object" && this.value !== null) {
          valueInfo = `object{${Object.keys(this.value as object).join(',')}}`;
        }
        
        print(`[Signals] Direct DOM update for: ${valueInfo} (${valueType})`);
        
        // Find all elux components that might need updating
        const components = document.querySelectorAll("[data-elux-component]");
        
        // Dispatch a generic state change event
        window.dispatchEvent(new CustomEvent('elux-state-changed', {
          detail: { 
            value: this.value,
            valueType,
            timestamp: Date.now()
          }
        }));
        
        // Specific handling for common component types
        
        // 1. Counter components (number values)
        if (typeof this.value === "number") {
          const counterDisplays = document.querySelectorAll("[id^='counter-display']");
          counterDisplays.forEach(el => {
            if (el.textContent && el.textContent.includes("Count:")) {
              const label = el.textContent.split(":")[0];
              el.textContent = `${label}: ${this.value}`;
            }
          });
        }
        
        // 2. Todo components (arrays with specific structure)
        if (Array.isArray(this.value) && this.value.length > 0 && 
            typeof this.value[0] === 'object' && 'text' in this.value[0]) {
          
          // Find todo containers
          const todoContainers = document.querySelectorAll("[data-todo-id]");
          if (todoContainers.length > 0) {
            // Try to update each container
            todoContainers.forEach(container => {
              // Find the todo list element
              const todoList = container.querySelector('.todo-list');
              if (!todoList) return;
              
              // Update the list if possible
              const todos = this.value as any[];
              if (!todos || !Array.isArray(todos)) return;
              
              // Only proceed if this looks like our todo items
              if (todos.length > 0 && 'id' in todos[0] && 'text' in todos[0] && 'completed' in todos[0]) {
                // Force custom event to trigger component update
                window.dispatchEvent(new CustomEvent('todo-updated', {
                  detail: { 
                    action: 'refresh',
                    todos: todos,
                    stableId: container.getAttribute('data-todo-id')
                  }
                }));
              }
            });
          }
        }
        
        // 3. Generic component updates - any component might want to listen to state changes
        components.forEach(component => {
          try {
            // Create a component-specific event
            const componentName = component.getAttribute('data-component-name');
            if (componentName) {
              const componentEvent = new CustomEvent('elux-component-update', {
                bubbles: true,
                detail: {
                  componentName,
                  value: this.value,
                  valueType,
                  timestamp: Date.now()
                }
              });
              component.dispatchEvent(componentEvent);
            }
          } catch (e) {
            // Ignore errors in event dispatch
          }
        });
      } catch (e) {
        // Silently handle any errors in DOM updates
        printError("[Signals] Error in direct DOM update:", e);
      }
    }, 0);
  }

  /**
   * Update value using a function
   */
  update(fn: (prev: T) => T): void {
    this.set(fn(this.value));
  }

  /**
   * Notify all subscribers
   */
  private notify(): void {
    // Notify all regular subscribers
    const subscribers = Array.from(this.subscribers);
    for (const subscriber of subscribers) {
      try {
        subscriber();
      } catch (error) {
        console.error("Error in signal subscriber:", error);
      }
    }

    // Trigger re-renders for component subscribers
    if (this.components.size > 0) {
      print(`Notifying ${this.components.size} components about signal change`);

      // Copy the components set to avoid modification during iteration
      const componentsToUpdate = Array.from(this.components);

      // Trigger re-render for each component
      for (const component of componentsToUpdate) {
        print(
          `Triggering re-render for component: ${component.name || "Component"}`
        );
        try {
          reRenderComponent(component);
        } catch (error) {
          printError(`Error re-rendering component:`, error);
        }
      }
    }
  }

  /**
   * Remove a subscriber
   */
  unsubscribe(subscriber: Subscriber): void {
    this.subscribers.delete(subscriber);
  }

  /**
   * Remove a component subscription
   */
  unsubscribeComponent(component: Function): void {
    this.components.delete(component);

    // Also cleanup the component subscriptions map
    if (componentSubscriptions.has(component)) {
      const subscription = componentSubscriptions.get(component);
      if (subscription) {
        subscription.signals.delete(this);
        if (subscription.signals.size === 0) {
          componentSubscriptions.delete(component);
        }
      }
    }
  }
}

/**
 * Create a new signal with the given initial value
 */
export function createSignal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}

/**
 * Create an effect that runs when its dependencies change
 */
export function createEffect(fn: Subscriber): Cleanup {
  // Store the current effect to restore it after
  const prevEffect = currentEffect;

  // Setup dependency tracking
  currentEffect = fn;

  // Run the effect initially
  fn();

  // Reset current effect
  currentEffect = prevEffect;

  // Return cleanup function
  return () => {
    // Would remove all subscriptions if we tracked them
    // For now this is a no-op
  };
}

/**
 * Create a derived signal that depends on other signals
 */
export function computed<T>(computeFn: () => T): Signal<T> {
  const signal = createSignal<T>(computeFn());

  createEffect(() => {
    signal.set(computeFn());
  });

  return signal;
}

/**
 * Create a store with multiple values
 */
export function createStore<T extends Record<string, any>>(initialState: T) {
  // Create a signal for each property
  const signals: Record<string, Signal<any>> = {};

  // Initialize signals
  for (const [key, value] of Object.entries(initialState)) {
    signals[key] = createSignal(value);
  }

  // Create a reactive store object
  return {
    /**
     * Get a specific value
     */
    get<K extends keyof T>(key: K): T[K] {
      return signals[key as string].get();
    },

    /**
     * Set a specific value
     */
    set<K extends keyof T>(key: K, value: T[K]): void {
      signals[key as string].set(value);
    },

    /**
     * Update multiple values at once
     */
    setState(newState: Partial<T>): void {
      for (const [key, value] of Object.entries(newState)) {
        if (signals[key]) {
          signals[key].set(value);
        }
      }
    },

    /**
     * Get the entire state
     */
    getState(): T {
      const state = {} as T;

      for (const key of Object.keys(signals)) {
        state[key as keyof T] = signals[key].get();
      }

      return state;
    },

    /**
     * Subscribe to all state changes
     */
    subscribe(callback: () => void): Cleanup {
      let isRunning = true;

      createEffect(() => {
        // Need to access all signals to subscribe to them
        this.getState();

        if (isRunning) {
          callback();
        }
      });

      return () => {
        isRunning = false;
      };
    },
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
