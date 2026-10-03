import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: { environment: "node", env: { SESSION_SECRET: "test-session-secret-0123456789abcdef", ENCRYPTION_KEY: "test-encryption-key-0123456789abcdef-xyz" } },
});
