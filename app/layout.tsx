import { h } from "../elux/core/vdom";
import { SSRContext } from "../elux/core";

interface LayoutProps {
  children: any;
  params?: Record<string, string>;
}

export default function RootLayout({ children }: LayoutProps) {
  // Create a simple layout with JSX
  return (
    <div className="app-container">
      {/* Content here will be the page */}
      {children}
    </div>
  );
}

// Get shared data for layout
export async function getLayoutProps(_context: SSRContext) {
  return {
    props: {
      nav: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Docs", href: "/docs" },
      ],
      title: "Elux - A Lightweight Framework",
    },
  };
}
