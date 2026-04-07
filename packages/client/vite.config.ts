import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import path from "path";
// import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    // visualizer({
    //   open: true,
    // }),
  ],
  clearScreen: false,
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  server: {
    host: host || "0.0.0.0",
    open: true,
    port: 4091,
    strictPort: true,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:4090",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        if (warning.code === "COMMONJS_VARIABLE_IN_ESM") return;
        if (
          warning.message &&
          warning.message.includes("dynamic import will not move module into another chunk")
        )
          return;
        if (warning.message && warning.message.includes("externalized for browser compatibility"))
          return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes("lucide-react")) {
            return "lucide";
          }
        },
      },
    },
  },
  envDir: "../../",
});
