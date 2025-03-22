import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Correct path based on your directory structure
      "jwt-decode": "jwt-decode/build/esm/jwt-decode.js",
    },
  },
});
