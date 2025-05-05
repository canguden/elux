import { h } from "../../elux/core/vdom";
import { eState } from "../../elux/core/context";
import { print } from "../../elux/core/utils";

interface CounterProps {
  initialCount?: number;
  label?: string;
}

export function Counter({ initialCount = 0, label = "Count" }: CounterProps) {
  // Get count from global state with auto-tracking and reactivity
  const [getCount, setCount] = eState<number>("count", initialCount);

  // Get the current count value - this creates a dependency
  const currentCount = getCount();

  // Function to increment counter that directly updates DOM as well
  const increment = () => {
    // Get current value then update it
    const newCount = getCount() + 1;

    // Update the state
    setCount(newCount);

    // Log the increment
    print("Counter incremented:", newCount);
  };

  return (
    <div className="card card-default mt-4 mb-4 flex flex-col items-center py-4 px-4">
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
