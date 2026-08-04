// vite.config.ts
import { defineConfig } from "file:///E:/PWB/2026-07-29-23-18-46/node_modules/vite/dist/node/index.js";
import react from "file:///E:/PWB/2026-07-29-23-18-46/node_modules/@vitejs/plugin-react/dist/index.js";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///E:/PWB/2026-07-29-23-18-46/vite.config.ts";
var EM_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function emHeaders(proxyReq) {
  proxyReq.setHeader("Referer", "https://quote.eastmoney.com/");
  proxyReq.setHeader("User-Agent", EM_UA);
}
function sinaHeaders(proxyReq) {
  proxyReq.setHeader("Referer", "https://finance.sina.com.cn");
  proxyReq.setHeader("User-Agent", EM_UA);
}
function thsHeaders(proxyReq) {
  proxyReq.setHeader("Referer", "http://stockpage.10jqka.com.cn/");
  proxyReq.setHeader("User-Agent", EM_UA);
}
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  server: {
    port: 5173,
    host: true,
    // Dev proxy: avoid CORS for public A-share market data APIs.
    // Production should use a backend gateway that forwards these paths.
    proxy: {
      "/em": {
        target: "https://push2.eastmoney.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/em/, ""),
        configure: (proxy) => proxy.on("proxyReq", emHeaders)
      },
      "/emh": {
        target: "https://push2his.eastmoney.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/emh/, ""),
        configure: (proxy) => proxy.on("proxyReq", emHeaders)
      },
      "/ems": {
        target: "https://searchapi.eastmoney.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ems/, ""),
        configure: (proxy) => proxy.on("proxyReq", emHeaders)
      },
      "/sina": {
        target: "https://hq.sinajs.cn",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/sina/, ""),
        configure: (proxy) => proxy.on("proxyReq", sinaHeaders)
      },
      "/tc": {
        target: "https://qt.gtimg.cn",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tc/, "")
      },
      "/ths": {
        target: "http://d.10jqka.com.cn",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ths/, ""),
        configure: (proxy) => proxy.on("proxyReq", thsHeaders)
      }
    }
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          echarts: ["echarts"],
          motion: ["framer-motion"],
          query: ["@tanstack/react-query"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxQV0JcXFxcMjAyNi0wNy0yOS0yMy0xOC00NlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcUFdCXFxcXDIwMjYtMDctMjktMjMtMTgtNDZcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L1BXQi8yMDI2LTA3LTI5LTIzLTE4LTQ2L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHR5cGUgeyBDbGllbnRSZXF1ZXN0IH0gZnJvbSAnbm9kZTpodHRwJztcblxuY29uc3QgRU1fVUEgPVxuICAnTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyMC4wLjAuMCBTYWZhcmkvNTM3LjM2JztcblxuZnVuY3Rpb24gZW1IZWFkZXJzKHByb3h5UmVxOiBDbGllbnRSZXF1ZXN0KSB7XG4gIHByb3h5UmVxLnNldEhlYWRlcignUmVmZXJlcicsICdodHRwczovL3F1b3RlLmVhc3Rtb25leS5jb20vJyk7XG4gIHByb3h5UmVxLnNldEhlYWRlcignVXNlci1BZ2VudCcsIEVNX1VBKTtcbn1cblxuZnVuY3Rpb24gc2luYUhlYWRlcnMocHJveHlSZXE6IENsaWVudFJlcXVlc3QpIHtcbiAgcHJveHlSZXEuc2V0SGVhZGVyKCdSZWZlcmVyJywgJ2h0dHBzOi8vZmluYW5jZS5zaW5hLmNvbS5jbicpO1xuICBwcm94eVJlcS5zZXRIZWFkZXIoJ1VzZXItQWdlbnQnLCBFTV9VQSk7XG59XG5cbmZ1bmN0aW9uIHRoc0hlYWRlcnMocHJveHlSZXE6IENsaWVudFJlcXVlc3QpIHtcbiAgcHJveHlSZXEuc2V0SGVhZGVyKCdSZWZlcmVyJywgJ2h0dHA6Ly9zdG9ja3BhZ2UuMTBqcWthLmNvbS5jbi8nKTtcbiAgcHJveHlSZXEuc2V0SGVhZGVyKCdVc2VyLUFnZW50JywgRU1fVUEpO1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICAvLyBEZXYgcHJveHk6IGF2b2lkIENPUlMgZm9yIHB1YmxpYyBBLXNoYXJlIG1hcmtldCBkYXRhIEFQSXMuXG4gICAgLy8gUHJvZHVjdGlvbiBzaG91bGQgdXNlIGEgYmFja2VuZCBnYXRld2F5IHRoYXQgZm9yd2FyZHMgdGhlc2UgcGF0aHMuXG4gICAgcHJveHk6IHtcbiAgICAgICcvZW0nOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vcHVzaDIuZWFzdG1vbmV5LmNvbScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHApID0+IHAucmVwbGFjZSgvXlxcL2VtLywgJycpLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4gcHJveHkub24oJ3Byb3h5UmVxJywgZW1IZWFkZXJzKSxcbiAgICAgIH0sXG4gICAgICAnL2VtaCc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9wdXNoMmhpcy5lYXN0bW9uZXkuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocCkgPT4gcC5yZXBsYWNlKC9eXFwvZW1oLywgJycpLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4gcHJveHkub24oJ3Byb3h5UmVxJywgZW1IZWFkZXJzKSxcbiAgICAgIH0sXG4gICAgICAnL2Vtcyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9zZWFyY2hhcGkuZWFzdG1vbmV5LmNvbScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHApID0+IHAucmVwbGFjZSgvXlxcL2Vtcy8sICcnKSxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHByb3h5Lm9uKCdwcm94eVJlcScsIGVtSGVhZGVycyksXG4gICAgICB9LFxuICAgICAgJy9zaW5hJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2hxLnNpbmFqcy5jbicsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHApID0+IHAucmVwbGFjZSgvXlxcL3NpbmEvLCAnJyksXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiBwcm94eS5vbigncHJveHlSZXEnLCBzaW5hSGVhZGVycyksXG4gICAgICB9LFxuICAgICAgJy90Yyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9xdC5ndGltZy5jbicsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHApID0+IHAucmVwbGFjZSgvXlxcL3RjLywgJycpLFxuICAgICAgfSxcbiAgICAgICcvdGhzJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vZC4xMGpxa2EuY29tLmNuJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocCkgPT4gcC5yZXBsYWNlKC9eXFwvdGhzLywgJycpLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4gcHJveHkub24oJ3Byb3h5UmVxJywgdGhzSGVhZGVycyksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxNTAwLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICByZWFjdDogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgIGVjaGFydHM6IFsnZWNoYXJ0cyddLFxuICAgICAgICAgIG1vdGlvbjogWydmcmFtZXItbW90aW9uJ10sXG4gICAgICAgICAgcXVlcnk6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1EsU0FBUyxvQkFBb0I7QUFDblMsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZSxXQUFXO0FBRjhILElBQU0sMkNBQTJDO0FBS2xOLElBQU0sUUFDSjtBQUVGLFNBQVMsVUFBVSxVQUF5QjtBQUMxQyxXQUFTLFVBQVUsV0FBVyw4QkFBOEI7QUFDNUQsV0FBUyxVQUFVLGNBQWMsS0FBSztBQUN4QztBQUVBLFNBQVMsWUFBWSxVQUF5QjtBQUM1QyxXQUFTLFVBQVUsV0FBVyw2QkFBNkI7QUFDM0QsV0FBUyxVQUFVLGNBQWMsS0FBSztBQUN4QztBQUVBLFNBQVMsV0FBVyxVQUF5QjtBQUMzQyxXQUFTLFVBQVUsV0FBVyxpQ0FBaUM7QUFDL0QsV0FBUyxVQUFVLGNBQWMsS0FBSztBQUN4QztBQUdBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLElBQ3REO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQSxJQUdOLE9BQU87QUFBQSxNQUNMLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxTQUFTLEVBQUU7QUFBQSxRQUNyQyxXQUFXLENBQUMsVUFBVSxNQUFNLEdBQUcsWUFBWSxTQUFTO0FBQUEsTUFDdEQ7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxVQUFVLEVBQUU7QUFBQSxRQUN0QyxXQUFXLENBQUMsVUFBVSxNQUFNLEdBQUcsWUFBWSxTQUFTO0FBQUEsTUFDdEQ7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxVQUFVLEVBQUU7QUFBQSxRQUN0QyxXQUFXLENBQUMsVUFBVSxNQUFNLEdBQUcsWUFBWSxTQUFTO0FBQUEsTUFDdEQ7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxXQUFXLEVBQUU7QUFBQSxRQUN2QyxXQUFXLENBQUMsVUFBVSxNQUFNLEdBQUcsWUFBWSxXQUFXO0FBQUEsTUFDeEQ7QUFBQSxNQUNBLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxTQUFTLEVBQUU7QUFBQSxNQUN2QztBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLE1BQU0sRUFBRSxRQUFRLFVBQVUsRUFBRTtBQUFBLFFBQ3RDLFdBQVcsQ0FBQyxVQUFVLE1BQU0sR0FBRyxZQUFZLFVBQVU7QUFBQSxNQUN2RDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUix1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixPQUFPLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2hELFNBQVMsQ0FBQyxTQUFTO0FBQUEsVUFDbkIsUUFBUSxDQUFDLGVBQWU7QUFBQSxVQUN4QixPQUFPLENBQUMsdUJBQXVCO0FBQUEsUUFDakM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
