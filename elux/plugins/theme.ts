// Theme plugin for Elux
// Handles dark mode and theme management

// Theme types
export type Theme = "light" | "dark" | "system";

// Interface for theme plugin options
export interface ThemeOptions {
  defaultTheme?: Theme;
  storageKey?: string;
  disableTransition?: boolean;
}

// Default options
const defaultOptions: ThemeOptions = {
  defaultTheme: "system",
  storageKey: "elux-theme",
  disableTransition: false,
};

// Theme class for managing theme state
export class ThemeManager {
  private options: ThemeOptions;
  private _theme: Theme;
  private mediaQuery: MediaQueryList | null = null;

  constructor(options: ThemeOptions = {}) {
    this.options = { ...defaultOptions, ...options };

    // Initialize theme from storage or default
    this._theme = this.getInitialTheme();

    // Set up system theme detection
    if (typeof window !== "undefined") {
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      // Listen for system theme changes
      this.mediaQuery.addEventListener("change", this.handleMediaQueryChange);
    }

    // Apply initial theme
    this.applyTheme();
  }

  // Get current theme
  get theme(): Theme {
    return this._theme;
  }

  // Set theme
  set theme(value: Theme) {
    this._theme = value;

    // Save to storage
    if (typeof window !== "undefined") {
      localStorage.setItem(this.options.storageKey!, value);
    }

    // Apply theme
    this.applyTheme();
  }

  // Check if dark mode is active
  get isDarkMode(): boolean {
    if (this._theme === "system") {
      return this.systemIsDark();
    }
    return this._theme === "dark";
  }

  // Toggle between light and dark
  toggleTheme(): void {
    if (
      this._theme === "dark" ||
      (this._theme === "system" && this.systemIsDark())
    ) {
      this.theme = "light";
    } else {
      this.theme = "dark";
    }
  }

  // Handle system theme change
  private handleMediaQueryChange = (event: MediaQueryListEvent): void => {
    if (this._theme === "system") {
      this.applyTheme();
    }
  };

  // Get initial theme from storage or default
  private getInitialTheme(): Theme {
    if (typeof window === "undefined") {
      return this.options.defaultTheme!;
    }

    const storedTheme = localStorage.getItem(
      this.options.storageKey!
    ) as Theme | null;
    return storedTheme || this.options.defaultTheme!;
  }

  // Check if system theme is dark
  private systemIsDark(): boolean {
    if (typeof window === "undefined" || !this.mediaQuery) {
      return false;
    }
    return this.mediaQuery.matches;
  }

  // Apply the current theme to the document
  private applyTheme(): void {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;

    // Get the effective theme (accounting for system preference)
    const isDark = this.isDarkMode;

    // Disable transitions temporarily if needed
    if (this.options.disableTransition) {
      root.classList.add("disable-transitions");
    }

    // Apply theme attribute
    root.setAttribute("data-theme", isDark ? "dark" : "light");

    // Re-enable transitions
    if (this.options.disableTransition) {
      // Force a reflow
      root.offsetHeight;
      root.classList.remove("disable-transitions");
    }
  }

  // Clean up on destruction
  dispose(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener(
        "change",
        this.handleMediaQueryChange
      );
    }
  }
}

// Create a singleton theme manager
export const themeManager = new ThemeManager();

// Hook for using theme in components
export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
} {
  return {
    theme: themeManager.theme,
    setTheme: (theme: Theme) => {
      themeManager.theme = theme;
    },
    isDarkMode: themeManager.isDarkMode,
    toggleTheme: () => themeManager.toggleTheme(),
  };
}

// Theme UI component
export function ThemeToggle(): {
  type: number;
  tag: string;
  props: { className: string; onClick: () => void };
  children: any[];
} {
  const { isDarkMode, toggleTheme } = useTheme();

  return {
    type: 1, // ELEMENT
    tag: "button",
    props: {
      className: "theme-toggle",
      onClick: toggleTheme,
    },
    children: [
      {
        type: 1, // ELEMENT
        tag: "span",
        props: {},
        children: [
          {
            type: 0, // TEXT
            text: isDarkMode ? "🌞" : "🌙",
          },
        ],
      },
    ],
  };
}

// Utility to initialize the theme system
export function initializeTheme(options: ThemeOptions = {}): void {
  // Inject script to prevent flash of wrong theme
  if (typeof document !== "undefined") {
    const script = document.createElement("script");
    script.textContent = `
      (function() {
        try {
          const storageKey = ${JSON.stringify(
            options.storageKey || defaultOptions.storageKey
          )};
          const defaultTheme = ${JSON.stringify(
            options.defaultTheme || defaultOptions.defaultTheme
          )};
          
          function getTheme() {
            const stored = localStorage.getItem(storageKey);
            if (stored) return stored;
            
            if (defaultTheme === 'system') {
              return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            
            return defaultTheme;
          }
          
          const theme = getTheme();
          document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
        } catch (e) {
          console.error('Theme initialization error:', e);
        }
      })();
    `;
    document.head.appendChild(script);
  }
}
