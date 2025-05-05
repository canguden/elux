/**
 * Elux Framework - Link Component
 * For client-side navigation between routes
 */

import { h, VNode } from './core/vdom';
import { router } from './core/router';

export interface LinkProps {
  href: string;
  children: any;
  className?: string;
  activeClassName?: string;
  prefetch?: boolean;
  [key: string]: any;
}

export function Link(props: LinkProps): VNode {
  const { 
    href, 
    children, 
    className = '', 
    activeClassName,
    prefetch,
    ...rest 
  } = props;

  // Check if this link is active
  const isActive = 
    typeof window !== 'undefined' && 
    router.getCurrentPath() === href;

  // Combine classes
  const finalClassName = [
    className,
    isActive && activeClassName
  ].filter(Boolean).join(' ');

  // Handle click for client-side navigation
  const handleClick = (e: MouseEvent) => {
    // Skip for modified clicks or external links
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      href.startsWith('http') ||
      href.startsWith('//')
    ) {
      return;
    }

    // Prevent default browser navigation
    e.preventDefault();

    // Navigate with the router
    router.navigate(href);
  };

  return h('a', {
    href,
    className: finalClassName || undefined,
    onClick: handleClick,
    ...rest
  }, children);
}

export default Link; 