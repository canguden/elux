/** @jsx h */
import { h } from "../core/vdom";
import { eState, eFx } from "../core/context";
import { print } from "../core/utils";

// Minimal terminal-style debug panel component
export default function DebugPanel() {
  // Skip rendering on server side
  if (typeof window === "undefined") {
    return null;
  }

  // Use eState for state management
  const [isMinimized, setIsMinimized] = eState<boolean>(
    "debugPanelMinimized",
    false
  );
  const [logs, setLogs] = eState<string[]>("debugPanelLogs", []);
  const [memory, setMemory] = eState<number>("debugMemoryUsage", 0);
  const [networkRequests, setNetworkRequests] = eState<number>(
    "debugNetworkReqs",
    0
  );
  const [fps, setFps] = eState<number>("debugFps", 0);
  const [stats, setStats] = eState<string>(
    "debugStats",
    JSON.stringify({
      renderedComponents: 0,
      eventListeners: 0,
      loadTime: 0,
      domNodes: 0,
      cssRules: 0,
    })
  );

  // Use eFx for side effects
  eFx(() => {
    // Log mount message
    print("[Elux] Debug panel mounted");
    window.__debugPanelMounted = true;

    // Get performance data
    const loadTime = window.performance ? Math.round(performance.now()) : 0;

    // Count DOM elements and other stats
    const renderedComponents = document.querySelectorAll(
      "[data-elux-component]"
    ).length;
    const domNodes = document.querySelectorAll("*").length;
    let cssRules = 0;

    // Count CSS rules
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          cssRules += document.styleSheets[i].cssRules.length;
        } catch (e) {
          // Skip cross-origin stylesheets
        }
      }
    } catch (e) {
      // Skip if can't access stylesheets
    }

    // Update stats
    setStats(
      JSON.stringify({
        renderedComponents,
        eventListeners: window.__eluxEventListeners || 0,
        loadTime,
        domNodes,
        cssRules,
      })
    );

    // Initialize logs
    setLogs([
      `Elux Framework v1.0.0 | ${process.env.NODE_ENV || "development"}`,
      `Page loaded in ${loadTime}ms | ${domNodes} DOM nodes`,
      `Memory: loading... | FPS: calculating...`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
    ]);

    // Monitor network requests
    const originalFetch = window.fetch;
    let requestCount = 0;

    window.fetch = function (...args) {
      requestCount++;
      setNetworkRequests(requestCount);
      return originalFetch.apply(this, args);
    };

    // Monitor XMLHttpRequest
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      requestCount++;
      setNetworkRequests(requestCount);
      return originalXHR.call(this, method, url, async, username, password);
    };

    // Setup memory tracking
    const memoryTimer = setInterval(() => {
      try {
        // Check if performance.memory exists (Chrome only)
        if (window.performance && "memory" in window.performance) {
          // Use type assertion to access memory
          const memoryInfo = (performance as any).memory;
          if (memoryInfo && memoryInfo.usedJSHeapSize) {
            setMemory(Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024)));
          }
        }
      } catch (e) {
        console.error("Error reading memory stats:", e);
      }
    }, 2000);

    // Setup FPS counter
    let frameCount = 0;
    let lastTime = performance.now();

    function countFrame() {
      frameCount++;
      const now = performance.now();

      // Update FPS every second
      if (now - lastTime > 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(countFrame);
    }

    requestAnimationFrame(countFrame);

    // Intercept console logs
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Override console methods
    console.log = (...args) => {
      // Call original method
      originalConsoleLog(...args);

      // Only log framework and important messages
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      if (
        message.includes("[Elux]") ||
        message.includes("Elux") ||
        message.includes("Error") ||
        message.includes("Warning")
      ) {
        const currentLogs = logs();
        setLogs([...currentLogs, message].slice(-50));

        // Auto-scroll logs if panel is visible
        setTimeout(() => {
          const logsContainer = document.querySelector(".elux-debug-logs");
          if (logsContainer && !isMinimized()) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
          }
        }, 10);
      }
    };

    console.error = (...args) => {
      // Call original method
      originalConsoleError(...args);

      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      const currentLogs = logs();
      setLogs([...currentLogs, `ERROR: ${message}`].slice(-50));

      // Auto-scroll logs
      setTimeout(() => {
        const logsContainer = document.querySelector(".elux-debug-logs");
        if (logsContainer && !isMinimized()) {
          logsContainer.scrollTop = logsContainer.scrollHeight;
        }
      }, 10);
    };

    console.warn = (...args) => {
      // Call original method
      originalConsoleWarn(...args);

      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      if (message.includes("[Elux]") || message.includes("Elux") || true) {
        const currentLogs = logs();
        setLogs([...currentLogs, `WARN: ${message}`].slice(-50));

        // Auto-scroll logs
        setTimeout(() => {
          const logsContainer = document.querySelector(".elux-debug-logs");
          if (logsContainer && !isMinimized()) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
          }
        }, 10);
      }
    };

    // Return cleanup function
    return () => {
      // Restore original methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.fetch = originalFetch;
      window.XMLHttpRequest.prototype.open = originalXHR;

      // Clear intervals
      clearInterval(memoryTimer);
    };
  }, []);

  // Parse stats from string
  const getParsedStats = () => {
    try {
      return JSON.parse(stats());
    } catch {
      return {
        renderedComponents: 0,
        eventListeners: 0,
        loadTime: 0,
        domNodes: 0,
        cssRules: 0,
      };
    }
  };

  // Minimal styling with just black and green
  const panelStyles = {
    position: "fixed",
    right: "0",
    bottom: isMinimized() ? "0" : "0",
    width: isMinimized() ? "100%" : "500px",
    height: isMinimized() ? "25px" : "400px",
    backgroundColor: "#000",
    color: "#0f0",
    border: "1px solid #0f0",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: 9999,
    overflow: "hidden",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
    transition: "height 0.3s ease-in-out",
  };

  // Toggle minimized state
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized());
  };

  // Get parsed stats
  const statsData = getParsedStats();

  // Format current date/time
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString();
  };

  return (
    <div className="elux-debug-panel" style={panelStyles}>
      {/* Minimal header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 8px",
          borderBottom: isMinimized() ? "none" : "1px solid #0f0",
          backgroundColor: "#001100",
          cursor: "pointer",
        }}
        onClick={toggleMinimized}
      >
        <div>Elux Debug Console</div>
        <div style={{ display: "flex", gap: "10px" }}>
          <span>Memory: {memory()}MB</span>
          <span>FPS: {fps()}</span>
          <span>{isMinimized() ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Only show content when not minimized */}
      {!isMinimized() && (
        <div
          style={{
            height: "calc(100% - 25px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Stats Section */}
          <div style={{ padding: "8px", borderBottom: "1px dashed #0f0" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  Performance
                </div>
                <div>Load Time: {statsData.loadTime}ms</div>
                <div>Memory: {memory()}MB</div>
                <div>FPS: {fps()}</div>
              </div>

              <div>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  DOM
                </div>
                <div>Elements: {statsData.domNodes}</div>
                <div>Components: {statsData.renderedComponents}</div>
                <div>CSS Rules: {statsData.cssRules}</div>
              </div>

              <div>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  Network
                </div>
                <div>Requests: {networkRequests()}</div>
                <div>Route: {window.location.pathname}</div>
                <div>Time: {getCurrentTime()}</div>
              </div>
            </div>
          </div>

          {/* Logs Section */}
          <div
            className="elux-debug-logs"
            style={{
              flex: 1,
              padding: "6px",
              overflowY: "auto",
              backgroundColor: "#000500",
            }}
          >
            <div
              style={{ fontWeight: "bold", marginBottom: "4px", color: "#0ff" }}
            >
              CONSOLE LOG:
            </div>
            {logs().map((log, index) => (
              <div
                key={index}
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  fontSize: "11px",
                  padding: "2px 0",
                  borderBottom: "1px dotted #001100",
                  opacity: log.includes("ERROR") ? 1 : 0.9,
                  color: log.includes("ERROR")
                    ? "#f33"
                    : log.includes("WARN")
                    ? "#ff3"
                    : "#0f0",
                }}
              >
                &gt; {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Server-safe version that won't cause hydration issues
export function ServerSafeDebugPanel() {
  return (
    <div suppressHydrationWarning style={{ display: "contents" }}>
      {typeof window !== "undefined" && <DebugPanel />}
    </div>
  );
}

// Add TypeScript type for window
declare global {
  interface Window {
    __debugPanelMounted?: boolean;
    __eluxEventListeners?: number;
  }
}
