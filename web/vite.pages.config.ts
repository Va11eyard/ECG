import path from "node:path";
import { defineConfig, mergeConfig } from "vite";

import base from "./vite.config";

// CI-only overlay: the working-tree vite.config.ts carries locally pending
// entries, so the Pages workflow builds the public surface with this config.
export default mergeConfig(
  base,
  defineConfig({
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          login: path.resolve(__dirname, "login.html"),
        },
      },
    },
  }),
);
