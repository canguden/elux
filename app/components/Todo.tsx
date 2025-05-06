import { h } from "../../elux/core/vdom";
import { eState, eFx } from "../../elux/core/context";
import { print } from "../../elux/core/utils";
import { eClient } from "../../elux/core/components";

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoProps {
  title?: string;
}

// A client-only Todo component using our properly fixed eClient decorator
export const Todo = eClient(function Todo({ title = "My Tasks" }: TodoProps) {
  // Create a stable ID for this component instance
  const stableId = `todo-${title.replace(/\s+/g, "-").toLowerCase()}`;

  // Initialize state with a stable ID to avoid conflicts
  const [getTodos, setTodos] = eState<TodoItem[]>(stableId, [
    { id: 1, text: "Learn Elux", completed: false },
    { id: 2, text: "Build an app", completed: false },
    { id: 3, text: "Deploy to production", completed: false },
  ]);

  // Track new todo input
  const [getNewTodo, setNewTodo] = eState<string>(`${stableId}-input`, "");

  // Helper function to directly update the DOM for immediate feedback
  const updateTodoListInDOM = (todos: TodoItem[]) => {
    if (typeof document === "undefined") return;

    try {
      // Find the todo list by its data attribute
      const todoContainer = document.querySelector(
        `[data-todo-id="${stableId}"]`
      );
      if (!todoContainer) return;

      // Update the list UI
      const listElement = todoContainer.querySelector("ul");
      if (listElement) {
        // Clear existing items
        listElement.innerHTML = "";

        // Recreate all items
        todos.forEach((todo) => {
          const listItem = document.createElement("li");
          listItem.className = "py-2 flex items-center justify-between";
          listItem.dataset.todoItemId = String(todo.id);

          const leftDiv = document.createElement("div");
          leftDiv.className = "flex items-center";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "mr-2";
          checkbox.checked = todo.completed;
          checkbox.addEventListener("change", () => toggleTodo(todo.id));

          const span = document.createElement("span");
          span.className = todo.completed ? "line-through text-gray-500" : "";
          span.textContent = todo.text;

          leftDiv.appendChild(checkbox);
          leftDiv.appendChild(span);

          const deleteButton = document.createElement("button");
          deleteButton.className = "text-red-500";
          deleteButton.textContent = "Delete";
          deleteButton.addEventListener("click", () => deleteTodo(todo.id));

          listItem.appendChild(leftDiv);
          listItem.appendChild(deleteButton);

          listElement.appendChild(listItem);
        });
      }

      // Update the todo count
      const todoCount = todoContainer.querySelector(".todo-count");
      if (todoCount) {
        const completedCount = todos.filter((t) => t.completed).length;
        todoCount.textContent = `${completedCount} of ${todos.length} tasks completed`;
      }
    } catch (error) {
      print("Error updating todo list in DOM:", error);
    }
  };

  // Add a new todo
  const addTodo = () => {
    const newTodoText = getNewTodo();
    if (newTodoText.trim() === "") return;

    const todos = getTodos();
    const newTodo: TodoItem = {
      id: Date.now(),
      text: newTodoText,
      completed: false,
    };

    print("Adding todo:", newTodoText);

    // Update state
    const newTodos = [...todos, newTodo];
    setTodos(newTodos);
    setNewTodo(""); // Clear input

    // Update DOM directly for immediate feedback
    updateTodoListInDOM(newTodos);

    // Also clear the input field in DOM
    if (typeof document !== "undefined") {
      const inputField = document.querySelector(
        `[data-todo-id="${stableId}"] input[type="text"]`
      );
      if (inputField) {
        (inputField as HTMLInputElement).value = "";
      }
    }

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("todo-updated", {
        detail: { action: "add", todoId: newTodo.id, stableId },
      })
    );
  };

  // Toggle a todo's completed status
  const toggleTodo = (id: number) => {
    const todos = getTodos();
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );

    print(`Toggling todo completion: ${id}`);
    setTodos(updatedTodos);

    // Update DOM directly for immediate feedback
    updateTodoListInDOM(updatedTodos);

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("todo-updated", {
        detail: { action: "toggle", todoId: id, stableId },
      })
    );
  };

  // Delete a todo
  const deleteTodo = (id: number) => {
    const todos = getTodos();
    const updatedTodos = todos.filter((todo) => todo.id !== id);

    print(`Deleting todo: ${id}`);
    setTodos(updatedTodos);

    // Update DOM directly for immediate feedback
    updateTodoListInDOM(updatedTodos);

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("todo-updated", {
        detail: { action: "delete", todoId: id, stableId },
      })
    );
  };

  // Use an effect to log changes and set up event listeners
  eFx(() => {
    print(`Todo list updated: ${getTodos().length} items`);

    // Setup listeners for external changes
    const handleExternalUpdate = (e: any) => {
      if (e.detail?.stableId === stableId) {
        print(`Received external todo update: ${e.detail.action}`);
      }
    };

    window.addEventListener("todo-updated", handleExternalUpdate);

    return () => {
      print("Cleaning up todo effect");
      window.removeEventListener("todo-updated", handleExternalUpdate);
    };
  });

  // Get current todos
  const todos = getTodos();
  const newTodoText = getNewTodo();

  print(`Rendering Todo component with ${todos.length} items`);

  return (
    <div
      className="card card-default mt-4 mb-4 p-4"
      data-component-name="Todo"
      data-todo-id={stableId}
    >
      <h3 className="text-xl font-bold mb-4">{title}</h3>

      <div className="flex mb-4">
        <input
          type="text"
          value={newTodoText}
          onInput={(e: Event) =>
            setNewTodo((e.target as HTMLInputElement).value)
          }
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTodo();
            }
          }}
          className="border rounded px-2 py-1 flex-grow"
          placeholder="Add new task..."
        />
        <button
          onClick={addTodo}
          className="ml-2 bg-blue-500 text-white px-4 py-1 rounded"
          id="add-todo-button"
        >
          Add
        </button>
      </div>

      <ul className="divide-y todo-list">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="py-2 flex items-center justify-between"
            data-todo-item-id={todo.id}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="mr-2"
              />
              <span
                className={todo.completed ? "line-through text-gray-500" : ""}
              >
                {todo.text}
              </span>
            </div>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-red-500"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-sm text-gray-500 todo-count">
        {todos.filter((t) => t.completed).length} of {todos.length} tasks
        completed
      </div>
    </div>
  );
});
