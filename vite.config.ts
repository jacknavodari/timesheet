import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from 'vite-plugin-electron/simple'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/index.js',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  optimizeDeps: {
    exclude: ["bippy/dist/jsx-runtime", "bippy/dist/jsx-dev-runtime"]
  }
});