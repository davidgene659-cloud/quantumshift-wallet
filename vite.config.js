import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import base44 from "@base44/vite-plugin";
import nodePolyfills from "vite-plugin-node-polyfills";

export default defineConfig({
  logLevel: "error",

  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === "true",
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true,
    }),

    react(),

    // Node polyfills for Buffer, crypto, stream, etc.
    nodePolyfills(),
  ],

  define: {
    global: "globalThis",
  },

  resolve: {
    alias: {
      buffer: "buffer",
    },
  },

  optimizeDeps: {
    include: ["buffer"],
  },
});
