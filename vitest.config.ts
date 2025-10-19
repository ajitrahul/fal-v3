import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, ".");

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/__tests__/**/*.spec.ts", "tests/**/*.unit.spec.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": root, // supports "@/..." imports in tests, matching your tsconfig
    },
  },
});
