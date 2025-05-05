import { VNode } from './renderer';

declare global {
  namespace JSX {
    interface Element extends VNode {}
    
    interface ElementClass {
      render: any;
    }
    
    interface ElementAttributesProperty {
      props: {};
    }
    
    interface ElementChildrenAttribute {
      children: {};
    }
    
    interface IntrinsicElements {
      // Allow all HTML elements
      [elemName: string]: any;
    }
    
    // Common attributes for all elements
    interface IntrinsicAttributes {
      key?: string | number;
      class?: string;
      className?: string;
      style?: string | { [key: string]: string | number };
    }
  }
}

export {}; 