import { h } from "../../elux/core/vdom";
import { eState, eFx } from "../../elux/core/context";
import { print } from "../../elux/core/utils";
import { eHybrid } from "../../elux/core/components";

// Define the props interface
interface CounterProps {
  initialCount?: number;
  label?: string;
}

// First create the component function, then wrap it with eHybrid
function CounterComponent({ initialCount = 0, label = "Count" }: CounterProps) {
  // Use a stable identifier based on label to maintain component state
  const stableId = `counter-${label.replace(/\s+/g, "-").toLowerCase()}`;

  // Use a unique identifier for each counter instance to avoid conflicts
  const [getCount, setCount] = eState<number>(stableId, initialCount);

  // Get the current count value - this creates a dependency
  const currentCount = getCount();

  // Use eFx to run side effects when count changes
  eFx(() => {
    // Log to console when count changes
    print(`Counter value changed to: ${getCount()}`);

    // Listen for DOM updates triggered by other components
    if (typeof window !== "undefined") {
      const handleStateChange = (e: any) => {
        print("Received state change event:", e.detail);
      };

      window.addEventListener("elux-state-changed", handleStateChange);

      // Cleanup function when component unmounts or before next effect run
      return () => {
        print("Cleaning up previous counter effect");
        window.removeEventListener("elux-state-changed", handleStateChange);
        if (typeof document !== "undefined") {
          document.title = "Elux App";
        }
      };
    }

    return () => {
      print("Cleaning up previous counter effect");
      if (typeof document !== "undefined") {
        document.title = "Elux App";
      }
    };
  });

  // Function to increment counter
  const increment = () => {
    print("Increment clicked");
    const newValue = getCount() + 1;
    setCount(newValue);

    // Force update DOM directly for immediate feedback
    if (typeof document !== "undefined") {
      const display = document.getElementById("counter-display");
      if (display) {
        display.textContent = `${label}: ${newValue}`;
      }

      // Dispatch a custom event that can be listened to by other parts of the system
      window.dispatchEvent(
        new CustomEvent("counter-updated", {
          detail: { value: newValue },
        })
      );
    }
  };

  print(`Rendering Counter component with value: ${currentCount}`);

  // Always return a valid VDOM node
  return (
    <div
      className="card card-default mt-4 mb-4 flex flex-col items-center py-4 px-4"
      data-component-name="Counter"
      data-counter-id={stableId}
    >
      <div className="text-primary text-lg font-bold mb-4" id="counter-display">
        {`${label}: ${currentCount}`}
      </div>
      <button
        className="btn btn-primary"
        onClick={increment}
        id="increment-button"
      >
        Increment
      </button>
    </div>
  );
}

// Apply the eHybrid wrapper to the component function
export const Counter = eHybrid(CounterComponent);
