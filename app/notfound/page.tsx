import { h } from "../../elux/client/renderer";

export default function NotFoundPage() {
  return (
    <div className="container">
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-xl mb-8">
          Sorry, the page you're looking for doesn't exist.
        </p>
        <div className="bg-accent p-6 rounded-lg text-accent-foreground mb-8 max-w-lg">
          <h2 className="text-xl font-bold mb-2">How to add pages</h2>
          <p className="mb-4">
            With our automatic file-based routing, adding new pages is easy:
          </p>
          <ol className="list-decimal pl-5 mb-4 space-y-2">
            <li>
              Create a folder in the <code>app/</code> directory
            </li>
            <li>
              Add a <code>page.tsx</code> file in that folder
            </li>
            <li>Export a component as the default export</li>
          </ol>
          <p>
            The route will be automatically available at the path matching the
            folder structure!
          </p>
        </div>
        <a href="/" className="btn btn-primary">
          Back to Home
        </a>
      </div>
    </div>
  );
}
