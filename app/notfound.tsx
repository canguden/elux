/** @jsx h */
import { h } from "../elux/core/vdom";
import Link from "../elux/Link";

export default function NotFound({ params }: { params: { path?: string } }) {
  const path = params?.path || "unknown";

  return (
    <div className="container mx-auto p-4 text-center">
      <div className="max-w-lg mx-auto mt-12 p-8 bg-gray100 rounded-lg shadow">
        <h1 className="text-4xl font-bold mb-4 text-red">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>

        <p className="mb-6">
          The page <code className="bg-gray200 px-2 py-1 rounded">{path}</code>{" "}
          could not be found.
        </p>

        <p className="mb-6">
          Check the URL or navigate to one of our existing pages.
        </p>

        <div className="flex justify-center space-x-4">
          <Link href="/" className="btn btn-primary">
            Go to Home
          </Link>
          <Link href="/about" className="btn btn-secondary">
            About
          </Link>
        </div>
      </div>
    </div>
  );
}

// For server-side rendering
export async function getServerSideProps() {
  return {
    props: {
      title: "Page Not Found - 404",
      description: "The requested page could not be found.",
    },
  };
}
