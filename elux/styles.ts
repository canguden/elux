/**
 * Elux Styles
 * Lightweight CSS framework with utility classes
 */

import { print } from "./core/utils";

// CSS class generation functions
export interface StylesConfig {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  fontSizes: Record<string, string>;
  fontWeights: Record<string, number>;
  breakpoints: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  transitions: Record<string, string>;
  zIndex: Record<string, string | number>;
}

// Default configuration
export const defaultConfig: StylesConfig = {
  colors: {
    primary: "#3490dc",
    secondary: "#ffed4a",
    danger: "#e3342f",
    success: "#38c172",
    warning: "#f6993f",
    info: "#6574cd",
    light: "#f8fafc",
    dark: "#2d3748",
    black: "#000000",
    white: "#ffffff",
    gray100: "#f7fafc",
    gray200: "#edf2f7",
    gray300: "#e2e8f0",
    gray400: "#cbd5e0",
    gray500: "#a0aec0",
    gray600: "#718096",
    gray700: "#4a5568",
    gray800: "#2d3748",
    gray900: "#1a202c",
  },
  spacing: {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem",
    "20": "5rem",
    "24": "6rem",
    "32": "8rem",
    "40": "10rem",
    "48": "12rem",
    "56": "14rem",
    "64": "16rem",
    auto: "auto",
    full: "100%",
    screen: "100vh",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "4rem",
  },
  fontWeights: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
  borderRadius: {
    none: "0",
    sm: "0.125rem",
    default: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    default: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
    outline: "0 0 0 3px rgba(66, 153, 225, 0.5)",
  },
  transitions: {
    default: "all 0.3s ease",
    fast: "all 0.15s ease",
    slow: "all 0.5s ease",
  },
  zIndex: {
    auto: "auto",
    "0": 0,
    "10": 10,
    "20": 20,
    "30": 30,
    "40": 40,
    "50": 50,
  },
};

// CSS class generator interface
export interface StyleGenerator {
  generate: () => string;
  extend: (additionalConfig: Partial<StylesConfig>) => StyleGenerator;
  getConfig: () => StylesConfig;
}

// CSS class generator implementation
class StylesGenerator implements StyleGenerator {
  private config: StylesConfig;

  constructor(config: StylesConfig = defaultConfig) {
    this.config = { ...config };
  }

  // Generate CSS classes based on configuration
  generate(): string {
    print("Generating CSS classes...");

    const css = [
      this.generateColorClasses(),
      this.generateSpacingClasses(),
      this.generateTypographyClasses(),
      this.generateFlexClasses(),
      this.generateGridClasses(),
      this.generateBorderClasses(),
      this.generateEffectClasses(),
      this.generateLayoutClasses(),
    ].join("\n\n");

    print("CSS classes generated successfully");
    return css;
  }

  // Extend the configuration
  extend(additionalConfig: Partial<StylesConfig>): StyleGenerator {
    this.config = {
      ...this.config,
      ...additionalConfig,
      colors: { ...this.config.colors, ...additionalConfig.colors },
      spacing: { ...this.config.spacing, ...additionalConfig.spacing },
      fontSizes: { ...this.config.fontSizes, ...additionalConfig.fontSizes },
      fontWeights: {
        ...this.config.fontWeights,
        ...additionalConfig.fontWeights,
      },
      breakpoints: {
        ...this.config.breakpoints,
        ...additionalConfig.breakpoints,
      },
      borderRadius: {
        ...this.config.borderRadius,
        ...additionalConfig.borderRadius,
      },
      shadows: { ...this.config.shadows, ...additionalConfig.shadows },
      transitions: {
        ...this.config.transitions,
        ...additionalConfig.transitions,
      },
      zIndex: { ...this.config.zIndex, ...additionalConfig.zIndex },
    };

    return this;
  }

  // Get the current configuration
  getConfig(): StylesConfig {
    return { ...this.config };
  }

  // Generate color-related classes
  private generateColorClasses(): string {
    let css = "/* Color Classes */\n";

    // Text colors
    Object.entries(this.config.colors).forEach(([name, value]) => {
      css += `.text-${name} { color: ${value}; }\n`;
    });

    // Background colors
    Object.entries(this.config.colors).forEach(([name, value]) => {
      css += `.bg-${name} { background-color: ${value}; }\n`;
    });

    // Border colors
    Object.entries(this.config.colors).forEach(([name, value]) => {
      css += `.border-${name} { border-color: ${value}; }\n`;
    });

    return css;
  }

  // Generate spacing-related classes
  private generateSpacingClasses(): string {
    let css = "/* Spacing Classes */\n";

    // Margin classes
    Object.entries(this.config.spacing).forEach(([name, value]) => {
      css += `.m-${name} { margin: ${value}; }\n`;
      css += `.mx-${name} { margin-left: ${value}; margin-right: ${value}; }\n`;
      css += `.my-${name} { margin-top: ${value}; margin-bottom: ${value}; }\n`;
      css += `.mt-${name} { margin-top: ${value}; }\n`;
      css += `.mr-${name} { margin-right: ${value}; }\n`;
      css += `.mb-${name} { margin-bottom: ${value}; }\n`;
      css += `.ml-${name} { margin-left: ${value}; }\n`;
    });

    // Padding classes
    Object.entries(this.config.spacing).forEach(([name, value]) => {
      css += `.p-${name} { padding: ${value}; }\n`;
      css += `.px-${name} { padding-left: ${value}; padding-right: ${value}; }\n`;
      css += `.py-${name} { padding-top: ${value}; padding-bottom: ${value}; }\n`;
      css += `.pt-${name} { padding-top: ${value}; }\n`;
      css += `.pr-${name} { padding-right: ${value}; }\n`;
      css += `.pb-${name} { padding-bottom: ${value}; }\n`;
      css += `.pl-${name} { padding-left: ${value}; }\n`;
    });

    return css;
  }

  // Generate typography-related classes
  private generateTypographyClasses(): string {
    let css = "/* Typography Classes */\n";

    // Font size classes
    Object.entries(this.config.fontSizes).forEach(([name, value]) => {
      css += `.text-${name} { font-size: ${value}; }\n`;
    });

    // Font weight classes
    Object.entries(this.config.fontWeights).forEach(([name, value]) => {
      css += `.font-${name} { font-weight: ${value}; }\n`;
    });

    // Text alignment
    css += `.text-left { text-align: left; }\n`;
    css += `.text-center { text-align: center; }\n`;
    css += `.text-right { text-align: right; }\n`;
    css += `.text-justify { text-align: justify; }\n`;

    // Text decoration
    css += `.underline { text-decoration: underline; }\n`;
    css += `.line-through { text-decoration: line-through; }\n`;
    css += `.no-underline { text-decoration: none; }\n`;

    // Text transform
    css += `.uppercase { text-transform: uppercase; }\n`;
    css += `.lowercase { text-transform: lowercase; }\n`;
    css += `.capitalize { text-transform: capitalize; }\n`;
    css += `.normal-case { text-transform: none; }\n`;

    return css;
  }

  // Generate flex-related classes
  private generateFlexClasses(): string {
    let css = "/* Flexbox Classes */\n";

    // Display flex
    css += `.flex { display: flex; }\n`;
    css += `.inline-flex { display: inline-flex; }\n`;

    // Flex direction
    css += `.flex-row { flex-direction: row; }\n`;
    css += `.flex-row-reverse { flex-direction: row-reverse; }\n`;
    css += `.flex-col { flex-direction: column; }\n`;
    css += `.flex-col-reverse { flex-direction: column-reverse; }\n`;

    // Flex wrap
    css += `.flex-wrap { flex-wrap: wrap; }\n`;
    css += `.flex-wrap-reverse { flex-wrap: wrap-reverse; }\n`;
    css += `.flex-nowrap { flex-wrap: nowrap; }\n`;

    // Justify content
    css += `.justify-start { justify-content: flex-start; }\n`;
    css += `.justify-end { justify-content: flex-end; }\n`;
    css += `.justify-center { justify-content: center; }\n`;
    css += `.justify-between { justify-content: space-between; }\n`;
    css += `.justify-around { justify-content: space-around; }\n`;
    css += `.justify-evenly { justify-content: space-evenly; }\n`;

    // Align items
    css += `.items-start { align-items: flex-start; }\n`;
    css += `.items-end { align-items: flex-end; }\n`;
    css += `.items-center { align-items: center; }\n`;
    css += `.items-baseline { align-items: baseline; }\n`;
    css += `.items-stretch { align-items: stretch; }\n`;

    return css;
  }

  // Generate grid-related classes
  private generateGridClasses(): string {
    let css = "/* Grid Classes */\n";

    // Display grid
    css += `.grid { display: grid; }\n`;
    css += `.inline-grid { display: inline-grid; }\n`;

    // Grid template columns
    css += `.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }\n`;
    css += `.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n`;
    css += `.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }\n`;
    css += `.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }\n`;
    css += `.grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }\n`;
    css += `.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }\n`;
    css += `.grid-cols-none { grid-template-columns: none; }\n`;

    // Grid template rows
    css += `.grid-rows-1 { grid-template-rows: repeat(1, minmax(0, 1fr)); }\n`;
    css += `.grid-rows-2 { grid-template-rows: repeat(2, minmax(0, 1fr)); }\n`;
    css += `.grid-rows-3 { grid-template-rows: repeat(3, minmax(0, 1fr)); }\n`;
    css += `.grid-rows-4 { grid-template-rows: repeat(4, minmax(0, 1fr)); }\n`;
    css += `.grid-rows-5 { grid-template-rows: repeat(5, minmax(0, 1fr)); }\n`;
    css += `.grid-rows-6 { grid-template-rows: repeat(6, minmax(0, 1fr)); }\n`;
    css += `.grid-rows-none { grid-template-rows: none; }\n`;

    // Gap
    Object.entries(this.config.spacing).forEach(([name, value]) => {
      css += `.gap-${name} { gap: ${value}; }\n`;
      css += `.gap-x-${name} { column-gap: ${value}; }\n`;
      css += `.gap-y-${name} { row-gap: ${value}; }\n`;
    });

    return css;
  }

  // Generate border-related classes
  private generateBorderClasses(): string {
    let css = "/* Border Classes */\n";

    // Border width
    css += `.border { border-width: 1px; }\n`;
    css += `.border-0 { border-width: 0; }\n`;
    css += `.border-2 { border-width: 2px; }\n`;
    css += `.border-4 { border-width: 4px; }\n`;
    css += `.border-8 { border-width: 8px; }\n`;
    css += `.border-t { border-top-width: 1px; }\n`;
    css += `.border-r { border-right-width: 1px; }\n`;
    css += `.border-b { border-bottom-width: 1px; }\n`;
    css += `.border-l { border-left-width: 1px; }\n`;

    // Border style
    css += `.border-solid { border-style: solid; }\n`;
    css += `.border-dashed { border-style: dashed; }\n`;
    css += `.border-dotted { border-style: dotted; }\n`;
    css += `.border-double { border-style: double; }\n`;
    css += `.border-none { border-style: none; }\n`;

    // Border radius
    Object.entries(this.config.borderRadius).forEach(([name, value]) => {
      css += `.rounded${
        name === "default" ? "" : `-${name}`
      } { border-radius: ${value}; }\n`;
      css += `.rounded-t${
        name === "default" ? "" : `-${name}`
      } { border-top-left-radius: ${value}; border-top-right-radius: ${value}; }\n`;
      css += `.rounded-r${
        name === "default" ? "" : `-${name}`
      } { border-top-right-radius: ${value}; border-bottom-right-radius: ${value}; }\n`;
      css += `.rounded-b${
        name === "default" ? "" : `-${name}`
      } { border-bottom-right-radius: ${value}; border-bottom-left-radius: ${value}; }\n`;
      css += `.rounded-l${
        name === "default" ? "" : `-${name}`
      } { border-top-left-radius: ${value}; border-bottom-left-radius: ${value}; }\n`;
    });

    return css;
  }

  // Generate effect-related classes
  private generateEffectClasses(): string {
    let css = "/* Effect Classes */\n";

    // Box shadow
    Object.entries(this.config.shadows).forEach(([name, value]) => {
      css += `.shadow${
        name === "default" ? "" : `-${name}`
      } { box-shadow: ${value}; }\n`;
    });

    // Opacity
    [0, 25, 50, 75, 100].forEach((opacity) => {
      css += `.opacity-${opacity} { opacity: ${opacity / 100}; }\n`;
    });

    // Transitions
    Object.entries(this.config.transitions).forEach(([name, value]) => {
      css += `.transition${
        name === "default" ? "" : `-${name}`
      } { transition: ${value}; }\n`;
    });

    return css;
  }

  // Generate layout-related classes
  private generateLayoutClasses(): string {
    let css = "/* Layout Classes */\n";

    // Display
    css += `.block { display: block; }\n`;
    css += `.inline-block { display: inline-block; }\n`;
    css += `.inline { display: inline; }\n`;
    css += `.hidden { display: none; }\n`;

    // Position
    css += `.static { position: static; }\n`;
    css += `.fixed { position: fixed; }\n`;
    css += `.absolute { position: absolute; }\n`;
    css += `.relative { position: relative; }\n`;
    css += `.sticky { position: sticky; }\n`;

    // Width and height
    Object.entries(this.config.spacing).forEach(([name, value]) => {
      css += `.w-${name} { width: ${value}; }\n`;
      css += `.h-${name} { height: ${value}; }\n`;
    });

    // Z-index
    Object.entries(this.config.zIndex).forEach(([name, value]) => {
      css += `.z-${name} { z-index: ${value}; }\n`;
    });

    // Overflow
    css += `.overflow-auto { overflow: auto; }\n`;
    css += `.overflow-hidden { overflow: hidden; }\n`;
    css += `.overflow-visible { overflow: visible; }\n`;
    css += `.overflow-scroll { overflow: scroll; }\n`;
    css += `.overflow-x-auto { overflow-x: auto; }\n`;
    css += `.overflow-y-auto { overflow-y: auto; }\n`;
    css += `.overflow-x-hidden { overflow-x: hidden; }\n`;
    css += `.overflow-y-hidden { overflow-y: hidden; }\n`;

    // Container
    css += `.container { width: 100%; }\n`;
    Object.entries(this.config.breakpoints).forEach(([name, value]) => {
      css += `@media (min-width: ${value}) { .container { max-width: ${value}; } }\n`;
    });

    return css;
  }
}

// Create a default styles generator
export const stylesGenerator = new StylesGenerator();

// Generate CSS string
export const generateCSS = (config?: Partial<StylesConfig>): string => {
  if (config) {
    return stylesGenerator.extend(config as any).generate();
  }
  return stylesGenerator.generate();
};

// Generate and inject CSS into DOM
export const injectCSS = (config?: Partial<StylesConfig>): void => {
  if (typeof document === "undefined") {
    return;
  }

  const css = generateCSS(config);
  const style = document.createElement("style");
  style.textContent = css;
  style.setAttribute("id", "elux-styles");

  // Remove existing styles if any
  const existingStyle = document.getElementById("elux-styles");
  if (existingStyle && existingStyle.parentNode) {
    existingStyle.parentNode.removeChild(existingStyle);
  }

  // Add styles to head
  document.head.appendChild(style);
};

// Export default function for use in applications
export default function setupStyles(config?: Partial<StylesConfig>): void {
  injectCSS(config);
}
