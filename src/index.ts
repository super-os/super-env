/**
 * super-env: Secure .env file management with type-safety
 */

// Core functionality
export * from "./core/env";
export * from "./core/encryption";

// Framework-specific integrations are available through submodules
// Example: import { createNextEnv } from 'super-env/nextjs';

/**
 * Create a framework-specific super-env instance
 * @param framework The framework to create a super-env instance for
 */
export const frameworks = {
  /**
   * Create a Next.js-compatible super-env instance
   */
  get nextjs() {
    return require("./nextjs");
  },
};
