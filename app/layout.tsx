/** @jsx h */
import { h } from "../elux/core/vdom";
import Link from "../elux/Link";

interface LayoutProps {
  children: any;
  params?: Record<string, string>;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-light dark:bg-gray800 text-gray900 dark:text-white mb-4">
      {/* Header */}
      <header className="bg-white dark:bg-gray900 shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              elux
            </Link>

            <nav className="flex space-x-6 gap-4">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
              <Link href="/about" className="hover:text-primary">
                About
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-8">{children}</main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray900 border-t border-gray300 dark:border-gray700 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p>
                © {new Date().getFullYear()} elux Framework. All rights
                reserved.
              </p>
            </div>

            <div className="flex gap-4">
              <a
                href="https://github.com/canguden/elux"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                GitHub
              </a>
              <Link href="/about" className="hover:text-primary">
                About
              </Link>
              <Link href="/notfound" className="hover:text-primary">
                404 Demo
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
