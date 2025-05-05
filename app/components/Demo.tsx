import { h } from "../../elux/core/vdom";

interface DemoProps {
  title?: string;
}

export function Demo({ title = "Demo Component" }: DemoProps) {
  return (
    <div className="card mt-4 py-4 px-4 bg-accent text-accent-foreground rounded-md">
      <h2 className="text-accent-foreground font-bold mb-2">{title}</h2>
      <p className="font-bold mb-2">THIS IS THE DEMO COMPONENT!</p>
      <p className="mb-2">
        This is a demo component that demonstrates components in Elux!
      </p>
      <p>
        Edit me in{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-sm">
          app/components/Demo.tsx
        </code>{" "}
        to see changes.
      </p>
    </div>
  );
}
