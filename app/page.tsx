/** @jsx h */
import { h } from "../elux/core/vdom";
import { Link } from "../elux/Link";
import { SSRContext } from "../elux/core";
import { Counter } from "./components/Counter";
import { eState } from "../elux/core/context";

// Define the type for our page props

// Home page component that gets data automatically from context
export default function HomePage() {
  // Use direct state hooks for the values we need
  const [getTitle] = eState<string>("title", "Elux Framework");
  const [getDescription] = eState<string>(
    "description",
    "Built from scratch to set you free — Elux is a fully hackable, transparent framework made by developers, for developers. No black boxes. No limits. Just pure control and creativity."
  );
  const [getCount] = eState<number>("count", 0);

  return (
    <div className="container">
      <header className="py-4 text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">{getTitle()}</h1>
        <p className="text-muted-foreground">{getDescription()}</p>
      </header>

      <section className="mb-4">
        <div className="card card-default">
          <h3 className="card-title">Welcome to Elux Framework 1.0</h3>
          <p>A lightweight framework with custom VDOM implementation</p>
        </div>

        <Counter initialCount={getCount()} />

        <div className="grid gap-4 mt-4">
          <div className="card card-default">
            <h3 className="card-title">💡 Custom Render</h3>
            <p>
              Built with a lightweight VDOM implementation, no React needed.
            </p>
          </div>
          <div className="card card-default">
            <h3 className="card-title">🔥 Signal-based State</h3>
            <p>Reactive programming with fine-grained updates.</p>
          </div>
          <div className="card card-default">
            <h3 className="card-title">⚡ File-based Routing</h3>
            <p>Intuitive app directory structure.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-4 mt-4 mb-4">
        <Link href="/about" className="btn btn-primary">
          About Us
        </Link>
        <Link href="/docs" className="btn btn-outline">
          Documentation
        </Link>
        <Link href="/test" className="btn btn-outline">
          Test
        </Link>
      </div>
    </div>
  );
}

// Server-side data fetching - similar to Next.js getServerSideProps
export async function getServerSideProps(context: SSRContext) {
  console.log("getServerSideProps called with context:", context);

  // This data will be automatically available to the component via usePageProps()
  return {
    props: {
      title: "Elux - A Lightweight Framework",
      description: "A fully hackable TypeScript-first framework from scratch",
      count: 0,
    },
  };
}
