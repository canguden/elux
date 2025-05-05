/**
 * Global TypeScript Declarations for Elux Framework
 */

// Declare JSX namespace
declare namespace JSX {
  // The Element type returned by JSX expressions
  interface Element {
    type: any;
    props?: any;
    children?: any[];
    [key: string]: any;
  }

  // Element attributes
  interface IntrinsicAttributes {
    key?: string | number;
  }

  // Define the HTML elements
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Extend Window interface for global Elux objects
interface Window {
  EluxLink: (props: {
    href: string;
    children: any;
    className?: string;
    [key: string]: any;
  }) => JSX.Element;
}
