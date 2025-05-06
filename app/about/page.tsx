import { h } from "../../elux/core/vdom";
import { SSRContext } from "../../elux/core";
import { eState } from "../../elux/core/context";

// About page component
export default function AboutPage() {
  // Use state hooks
  const [getTitle] = eState<string>("title", "About Elux");
  const [getDescription] = eState<string>(
    "description",
    "Elux is a lightweight, TypeScript-first framework designed to provide a modern development experience without React dependencies."
  );

  return (
    <div className="container">
      {/* Main content */}
      <main className="mt-4">
        <section className="py-4">
          <h1 className="mb-4">{getTitle()}</h1>
          <p className="mb-4">{getDescription()}</p>

          <div className="mt-4">
            <h2 className="mb-2">Philosophy</h2>
            <p className="mb-4">
              I believe in giving developers full control over their stack. By
              building from scratch, you understand every part of your
              application and can customize it to your exact needs. Great for
              learning and a lot of fun...
            </p>
          </div>

          <div className="mt-4">
            <h2 className="mb-2">Key Features</h2>
            <ul className="mb-4 pl-4">
              <li className="mb-2">Custom Virtual DOM implementation</li>
              <li className="mb-2">Reactive state management</li>
              <li className="mb-2">File-based routing system</li>
              <li className="mb-2">Server-side rendering</li>
              <li className="mb-2">TypeScript-first architecture</li>
              <li className="mb-2">No heavy dependencies</li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-copyright">
            {new Date().getFullYear()} Elux Framework
          </div>
          <div className="flex gap-4 space-x-4">
            <a href="https://github.com" className="footer-link">
              GitHub
            </a>
            <a
              href="https://canguden.github.io/elux-docs/"
              className="footer-link"
            >
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Server-side data fetching
export async function getServerSideProps(_context: SSRContext) {
  return {
    props: {
      title: "About Elux",
      description: "Learn about the Elux Framework and its capabilities",
    },
  };
}
