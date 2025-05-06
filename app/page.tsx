/** @jsx h */
import { h } from "../elux/core/vdom";
import Link from "../elux/Link";
import { eState } from "../elux/core/context";
import { Counter } from "./components/Counter";
import { Todo } from "./components/Todo";

export default function HomePage() {
  // Use state hooks
  const [getTitle] = eState<string>("title", "Welcome to elux Framework");

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">{getTitle()}</h1>
          <p className="text-xl mb-6">
            A TypeScript-first framework with file-based routing
          </p>
        </header>

        <section className="bg-gray100 p-6 rounded-lg shadow mb-8">
          <h2 className="text-2xl font-semibold mb-4">File-Based Routing</h2>
          <p className="mb-4">
            Elux uses a Next.js-inspired file-based routing system. Pages are
            automatically registered based on their file path in the{" "}
            <code className="bg-gray200 px-1">app</code> directory.
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">
              <code className="bg-gray200 px-1">app/page.tsx</code> →{" "}
              <code className="bg-gray200 px-1">/</code>
            </li>
            <li className="mb-2">
              <code className="bg-gray200 px-1">app/about/page.tsx</code> →{" "}
              <code className="bg-gray200 px-1">/about</code>
            </li>
            <li className="mb-2">
              <code className="bg-gray200 px-1">app/blog/[slug]/page.tsx</code>{" "}
              → <code className="bg-gray200 px-1">/blog/:slug</code>
            </li>
          </ul>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray100 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Navigation</h2>
            <p className="mb-4">
              Use the <code className="bg-gray200 px-1">Link</code> component
              for client-side navigation:
            </p>
            <div className="flex space-x-4">
              <Link href="/about" className="btn btn-primary">
                About
              </Link>

              <Link href="/test" className="btn btn-secondary">
                Test 404
              </Link>
            </div>
          </div>

          <div className="bg-gray100 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">State Management</h2>
            <p className="mb-4">
              Elux includes a simple but powerful state management system:
            </p>
            <div className="mb-4 flex justify-center">
              <Counter />
            </div>
          </div>
        </section>

        <section className="bg-gray100 p-6 rounded-lg shadow mb-8">
          <h2 className="text-2xl font-semibold mb-4">Client Components</h2>
          <p className="mb-4">
            Elux supports advanced client components with automatic hydration:
          </p>
          <Todo title="Home Tasks" />
        </section>

        <section className="bg-gray100 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Client-Side Features</h2>
          <ul className="list-disc pl-6">
            <li className="mb-2">Automatic route detection</li>
            <li className="mb-2">Client-side navigation without page reload</li>
            <li className="mb-2">
              Dynamic route params (e.g.,{" "}
              <code className="bg-gray200 px-1">/blog/:slug</code>)
            </li>
            <li className="mb-2">Nested layouts support</li>
            <li className="mb-2">404 page handling for missing routes</li>
            <li className="mb-2">Client/Server component architecture</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

// For server-side rendering
export async function getStaticProps() {
  return {
    props: {
      title: "Elux - A TypeScript Framework",
      description: "A modern, lightweight framework with file-based routing.",
    },
  };
}
