/**
 * Link Component for Elux
 * Provides client-side navigation
 */

import { h, VNode } from './renderer';
import { navigate } from './fileRouter';

interface LinkProps {
  href: string;
  children: string | VNode | VNode[];
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
    activeClassName = '',
    prefetch = false,
    ...rest
  } = props;

  // Check if this link points to the current page
  const isActive = typeof window !== 'undefined' && 
    window.location.pathname === href;
  
  // Combine classes
  const classes = [
    className,
    isActive ? activeClassName : ''
  ].filter(Boolean).join(' ');

  // Handle click for client-side navigation
  const handleClick = (e: MouseEvent) => {
    // Skip navigation if modifier keys are pressed
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    
    // Skip for external links
    if (href.startsWith('http') || href.startsWith('//')) return;
    
    // Prevent default link behavior
    e.preventDefault();
    
    // Use the router to navigate
    navigate(href);
  };
  
  // Optional prefetch on hover
  const handleMouseEnter = () => {
    if (prefetch && !href.startsWith('http') && !href.startsWith('//')) {
      // This would prefetch the page - to be implemented in future
      console.log(`[Link] Prefetching ${href}`);
    }
  };

  return h('a', {
    href,
    className: classes || undefined,
    onClick: handleClick,
    onMouseEnter: prefetch ? handleMouseEnter : undefined,
    ...rest
  }, children);
}

export default Link;
