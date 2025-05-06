/** @jsx h */
import { h } from "./core/vdom";
import { navigate } from "./client/fileRouter";
import { print } from "./core/utils";

interface LinkProps {
  href: string;
  children: any;
  className?: string;
  [key: string]: any;
}

/**
 * Link Component for client-side navigation
 * Functions similar to Next.js Link component
 */
export default function Link({
  href,
  children,
  className,
  ...rest
}: LinkProps) {
  const handleClick = (e: MouseEvent) => {
    // Skip navigation for external links or modified clicks
    if (
      href.startsWith("http") ||
      href.startsWith("//") ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    // Prevent default browser navigation
    e.preventDefault();

    print(`[Link] Navigating to ${href}`);

    // Navigate using the file router
    navigate(href);
  };

  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
