// vite.config.ts
import { defineConfig } from "file:///C:/Users/cangu/Desktop/elux/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import fs from "fs";
import fg from "file:///C:/Users/cangu/Desktop/elux/node_modules/fast-glob/out/index.js";
var __vite_injected_original_dirname = "C:\\Users\\cangu\\Desktop\\elux";
function eluxFileRouterPlugin() {
  let scanAndGenerateRoutes;
  const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === "true";
  return {
    name: "elux-file-router",
    enforce: "pre",
    async buildStart() {
      await scanAndGenerateRoutes();
    },
    configureServer(server) {
      scanAndGenerateRoutes = async () => {
        if (VERBOSE_LOGGING) {
          console.log("\u{1F50D} Scanning for routes in app directory...");
        }
        try {
          const pages = await fg("app/**/page.{tsx,ts,jsx,js}");
          const routes = {};
          for (const page of pages) {
            const route = page.replace(/^app/, "").replace(/\/page\.(tsx|ts|jsx|js)$/, "").replace(/^\/+/, "");
            const routePath = route === "" ? "/" : `/${route}`;
            const importPath = `/${page.replace(/\.(tsx|ts|jsx|js)$/, "")}`;
            routes[routePath] = importPath;
            if (VERBOSE_LOGGING) {
              console.log(`\u{1F4C4} Route: ${routePath} -> ${importPath}`);
            }
          }
          const file = `// Auto-generated routes file - DO NOT EDIT
export const routes = {
${Object.entries(routes).map(([path, file2]) => `  "${path}": () => import("${file2}")`).join(",\n")}
};
`;
          const routesFilePath = resolve("elux/routes.ts");
          fs.writeFileSync(routesFilePath, file);
          if (VERBOSE_LOGGING) {
            console.log(`\u2705 Routes generated at ${routesFilePath}`);
          } else {
            process.stdout.write(".");
          }
        } catch (error) {
          console.error("\u274C Error generating routes:", error);
        }
      };
      scanAndGenerateRoutes();
      server.watcher.on("add", (path) => {
        if (path.includes("/app/") && path.endsWith("page.tsx")) {
          scanAndGenerateRoutes();
        }
      });
      server.watcher.on("unlink", (path) => {
        if (path.includes("/app/") && path.endsWith("page.tsx")) {
          scanAndGenerateRoutes();
        }
      });
    }
  };
}
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname),
      app: resolve(__vite_injected_original_dirname, "app"),
      elux: resolve(__vite_injected_original_dirname, "elux")
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  },
  esbuild: {
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "Fragment"
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: "transform",
      jsxFactory: "h",
      jsxFragment: "Fragment"
    },
    include: ["express"]
  },
  server: {
    port: 3e3,
    hmr: {
      protocol: "ws",
      host: "localhost",
      overlay: true
    },
    watch: {
      usePolling: true
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__vite_injected_original_dirname, "index.html")
      },
      output: {
        manualChunks: {
          vendor: ["express"]
        }
      }
    }
  },
  css: {
    devSourcemap: true
  },
  plugins: [eluxFileRouterPlugin()]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjYW5ndVxcXFxEZXNrdG9wXFxcXGVsdXhcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGNhbmd1XFxcXERlc2t0b3BcXFxcZWx1eFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvY2FuZ3UvRGVza3RvcC9lbHV4L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IGZnIGZyb20gXCJmYXN0LWdsb2JcIjtcclxuXHJcbi8vIEZpbGUgUm91dGVyIFBsdWdpbiB0aGF0IHNjYW5zIHRoZSBhcHAgZGlyZWN0b3J5IGFuZCBnZW5lcmF0ZXMgcm91dGVzXHJcbmZ1bmN0aW9uIGVsdXhGaWxlUm91dGVyUGx1Z2luKCk6IFBsdWdpbiB7XHJcbiAgLy8gU3RvcmUgcmVmZXJlbmNlcyB0byBtZXRob2RzIG91dHNpZGUgb2YgcGx1Z2luIHNjb3BlXHJcbiAgbGV0IHNjYW5BbmRHZW5lcmF0ZVJvdXRlczogKCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHJcbiAgLy8gQ2hlY2sgdmVyYm9zZSBsb2dnaW5nIG1vZGVcclxuICBjb25zdCBWRVJCT1NFX0xPR0dJTkcgPSBwcm9jZXNzLmVudi5WRVJCT1NFX0xPR0dJTkcgPT09IFwidHJ1ZVwiO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogXCJlbHV4LWZpbGUtcm91dGVyXCIsXHJcbiAgICBlbmZvcmNlOiBcInByZVwiLFxyXG4gICAgYXN5bmMgYnVpbGRTdGFydCgpIHtcclxuICAgICAgYXdhaXQgc2NhbkFuZEdlbmVyYXRlUm91dGVzKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgLy8gRGVmaW5lIHRoZSBmdW5jdGlvbiB0byBzY2FuIGFuZCBnZW5lcmF0ZSByb3V0ZXNcclxuICAgICAgc2NhbkFuZEdlbmVyYXRlUm91dGVzID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIC8vIE9ubHkgbG9nIGluIHZlcmJvc2UgbW9kZVxyXG4gICAgICAgIGlmIChWRVJCT1NFX0xPR0dJTkcpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXHVEODNEXHVERDBEIFNjYW5uaW5nIGZvciByb3V0ZXMgaW4gYXBwIGRpcmVjdG9yeS4uLlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAvLyBGaW5kIGFsbCBwYWdlLnRzeCBmaWxlcyBpbiB0aGUgYXBwIGRpcmVjdG9yeVxyXG4gICAgICAgICAgY29uc3QgcGFnZXMgPSBhd2FpdCBmZyhcImFwcC8qKi9wYWdlLnt0c3gsdHMsanN4LGpzfVwiKTtcclxuICAgICAgICAgIGNvbnN0IHJvdXRlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG5cclxuICAgICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBwYWdlcykge1xyXG4gICAgICAgICAgICAvLyBDb252ZXJ0IGZpbGUgcGF0aCB0byByb3V0ZSBwYXRoXHJcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gcGFnZVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9eYXBwLywgXCJcIilcclxuICAgICAgICAgICAgICAucmVwbGFjZSgvXFwvcGFnZVxcLih0c3h8dHN8anN4fGpzKSQvLCBcIlwiKVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9eXFwvKy8sIFwiXCIpO1xyXG5cclxuICAgICAgICAgICAgLy8gRm9ybWF0IHRoZSBmaW5hbCByb3V0ZVxyXG4gICAgICAgICAgICBjb25zdCByb3V0ZVBhdGggPSByb3V0ZSA9PT0gXCJcIiA/IFwiL1wiIDogYC8ke3JvdXRlfWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGltcG9ydFBhdGggPSBgLyR7cGFnZS5yZXBsYWNlKC9cXC4odHN4fHRzfGpzeHxqcykkLywgXCJcIil9YDtcclxuXHJcbiAgICAgICAgICAgIHJvdXRlc1tyb3V0ZVBhdGhdID0gaW1wb3J0UGF0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIE9ubHkgbG9nIGluIHZlcmJvc2UgbW9kZVxyXG4gICAgICAgICAgICBpZiAoVkVSQk9TRV9MT0dHSU5HKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFx1RDgzRFx1RENDNCBSb3V0ZTogJHtyb3V0ZVBhdGh9IC0+ICR7aW1wb3J0UGF0aH1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEdlbmVyYXRlIHRoZSByb3V0ZXMgZmlsZVxyXG4gICAgICAgICAgY29uc3QgZmlsZSA9IGAvLyBBdXRvLWdlbmVyYXRlZCByb3V0ZXMgZmlsZSAtIERPIE5PVCBFRElUXHJcbmV4cG9ydCBjb25zdCByb3V0ZXMgPSB7XHJcbiR7T2JqZWN0LmVudHJpZXMocm91dGVzKVxyXG4gIC5tYXAoKFtwYXRoLCBmaWxlXSkgPT4gYCAgXCIke3BhdGh9XCI6ICgpID0+IGltcG9ydChcIiR7ZmlsZX1cIilgKVxyXG4gIC5qb2luKFwiLFxcblwiKX1cclxufTtcclxuYDtcclxuXHJcbiAgICAgICAgICAvLyBFbnN1cmUgdGhlIGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgIGNvbnN0IHJvdXRlc0ZpbGVQYXRoID0gcmVzb2x2ZShcImVsdXgvcm91dGVzLnRzXCIpO1xyXG4gICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhyb3V0ZXNGaWxlUGF0aCwgZmlsZSk7XHJcblxyXG4gICAgICAgICAgLy8gT25seSBsb2cgaW4gdmVyYm9zZSBtb2RlXHJcbiAgICAgICAgICBpZiAoVkVSQk9TRV9MT0dHSU5HKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBcdTI3MDUgUm91dGVzIGdlbmVyYXRlZCBhdCAke3JvdXRlc0ZpbGVQYXRofWApO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoXCIuXCIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiXHUyNzRDIEVycm9yIGdlbmVyYXRpbmcgcm91dGVzOlwiLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gUnVuIHRoZSBpbml0aWFsIHNjYW5cclxuICAgICAgc2NhbkFuZEdlbmVyYXRlUm91dGVzKCk7XHJcblxyXG4gICAgICAvLyBTZXQgdXAgZmlsZSB3YXRjaGVycyBmb3Igcm91dGUgY2hhbmdlc1xyXG4gICAgICBzZXJ2ZXIud2F0Y2hlci5vbihcImFkZFwiLCAocGF0aCkgPT4ge1xyXG4gICAgICAgIGlmIChwYXRoLmluY2x1ZGVzKFwiL2FwcC9cIikgJiYgcGF0aC5lbmRzV2l0aChcInBhZ2UudHN4XCIpKSB7XHJcbiAgICAgICAgICBzY2FuQW5kR2VuZXJhdGVSb3V0ZXMoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgc2VydmVyLndhdGNoZXIub24oXCJ1bmxpbmtcIiwgKHBhdGgpID0+IHtcclxuICAgICAgICBpZiAocGF0aC5pbmNsdWRlcyhcIi9hcHAvXCIpICYmIHBhdGguZW5kc1dpdGgoXCJwYWdlLnRzeFwiKSkge1xyXG4gICAgICAgICAgc2NhbkFuZEdlbmVyYXRlUm91dGVzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcmVzb2x2ZShfX2Rpcm5hbWUpLFxyXG4gICAgICBhcHA6IHJlc29sdmUoX19kaXJuYW1lLCBcImFwcFwiKSxcclxuICAgICAgZWx1eDogcmVzb2x2ZShfX2Rpcm5hbWUsIFwiZWx1eFwiKSxcclxuICAgIH0sXHJcbiAgICBleHRlbnNpb25zOiBbXCIudHNcIiwgXCIudHN4XCIsIFwiLmpzXCIsIFwiLmpzeFwiLCBcIi5qc29uXCJdLFxyXG4gIH0sXHJcbiAgZXNidWlsZDoge1xyXG4gICAganN4OiBcInRyYW5zZm9ybVwiLFxyXG4gICAganN4RmFjdG9yeTogXCJoXCIsXHJcbiAgICBqc3hGcmFnbWVudDogXCJGcmFnbWVudFwiLFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBlc2J1aWxkT3B0aW9uczoge1xyXG4gICAgICBqc3g6IFwidHJhbnNmb3JtXCIsXHJcbiAgICAgIGpzeEZhY3Rvcnk6IFwiaFwiLFxyXG4gICAgICBqc3hGcmFnbWVudDogXCJGcmFnbWVudFwiLFxyXG4gICAgfSxcclxuICAgIGluY2x1ZGU6IFtcImV4cHJlc3NcIl0sXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDAsXHJcbiAgICBobXI6IHtcclxuICAgICAgcHJvdG9jb2w6IFwid3NcIixcclxuICAgICAgaG9zdDogXCJsb2NhbGhvc3RcIixcclxuICAgICAgb3ZlcmxheTogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICB3YXRjaDoge1xyXG4gICAgICB1c2VQb2xsaW5nOiB0cnVlLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBvdXREaXI6IFwiZGlzdFwiLFxyXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsIFwiaW5kZXguaHRtbFwiKSxcclxuICAgICAgfSxcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XHJcbiAgICAgICAgICB2ZW5kb3I6IFtcImV4cHJlc3NcIl0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBjc3M6IHtcclxuICAgIGRldlNvdXJjZW1hcDogdHJ1ZSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtlbHV4RmlsZVJvdXRlclBsdWdpbigpXSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlEsU0FBUyxvQkFBb0I7QUFDMVMsU0FBUyxlQUFlO0FBQ3hCLE9BQU8sUUFBUTtBQUdmLE9BQU8sUUFBUTtBQUxmLElBQU0sbUNBQW1DO0FBUXpDLFNBQVMsdUJBQStCO0FBRXRDLE1BQUk7QUFHSixRQUFNLGtCQUFrQixRQUFRLElBQUksb0JBQW9CO0FBRXhELFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxJQUNULE1BQU0sYUFBYTtBQUNqQixZQUFNLHNCQUFzQjtBQUFBLElBQzlCO0FBQUEsSUFFQSxnQkFBZ0IsUUFBUTtBQUV0Qiw4QkFBd0IsWUFBWTtBQUVsQyxZQUFJLGlCQUFpQjtBQUNuQixrQkFBUSxJQUFJLG1EQUE0QztBQUFBLFFBQzFEO0FBRUEsWUFBSTtBQUVGLGdCQUFNLFFBQVEsTUFBTSxHQUFHLDZCQUE2QjtBQUNwRCxnQkFBTSxTQUFpQyxDQUFDO0FBRXhDLHFCQUFXLFFBQVEsT0FBTztBQUV4QixrQkFBTSxRQUFRLEtBQ1gsUUFBUSxRQUFRLEVBQUUsRUFDbEIsUUFBUSw0QkFBNEIsRUFBRSxFQUN0QyxRQUFRLFFBQVEsRUFBRTtBQUdyQixrQkFBTSxZQUFZLFVBQVUsS0FBSyxNQUFNLElBQUksS0FBSztBQUNoRCxrQkFBTSxhQUFh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
