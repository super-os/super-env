/**
 * Next.js integration for super-env
 */

import { z } from "zod";
import { createEnv, filterClientEnv } from "../../core/env";
import type { EnvOptions } from "../../core/env";

/**
 * Configuration options for Next.js integration
 */
export interface NextEnvOptions extends EnvOptions {
  /**
   * Prefix for client-side environment variables
   * @default "NEXT_PUBLIC_"
   */
  clientPrefix?: string;
}

/**
 * Default options for Next.js integration
 */
const defaultNextOptions: NextEnvOptions = {
  clientPrefix: "NEXT_PUBLIC_",
};

/**
 * Create a type-safe environment configuration for a Next.js app
 * @param serverSchema - Zod schema for server-side environment variables
 * @param options - Configuration options
 * @returns A validated environment object with server and client properties
 */
export function createNextEnv<
  TServer extends z.ZodType,
  TClient extends z.ZodType = z.ZodType
>(serverSchema: TServer, clientSchema?: TClient, options: NextEnvOptions = {}) {
  const mergedOptions = { ...defaultNextOptions, ...options };
  const clientPrefix = mergedOptions.clientPrefix as string;

  // Validate server-side environment variables
  const serverEnv = createEnv(serverSchema, mergedOptions);

  // For client-side, either use provided schema or filter by prefix
  let clientEnv: any = {};

  if (clientSchema) {
    // If explicit client schema is provided, use it
    clientEnv = createEnv(clientSchema, {
      ...mergedOptions,
      throwOnValidationFailure: false, // Client vars missing on server is ok
    });
  } else {
    // Otherwise, filter environment variables by prefix
    clientEnv = filterClientEnv(process.env, clientPrefix);
  }

  return {
    server: serverEnv,
    client: clientEnv,
    /**
     * Helper function to expose environment variables in next.config.js
     * @returns Object with key-value pairs for environment variables
     */
    envObject() {
      const flattened: Record<string, string> = {};
      for (const [key, value] of Object.entries(serverEnv)) {
        flattened[key] = String(value);
      }
      for (const [key, value] of Object.entries(clientEnv)) {
        flattened[key] = String(value);
      }
      return flattened;
    },
  };
}

/**
 * Setup instructions for Next.js integration
 */
export const setupInstructions = `
To use super-env with Next.js:

1. Create an \`env.ts\` file in your project with:

\`\`\`typescript
import { z } from 'zod';
import { createNextEnv } from 'super-env/nextjs';

export const env = createNextEnv(
  z.object({
    DATABASE_URL: z.string().url(),
    API_KEY: z.string().min(1),
    NODE_ENV: z.enum(['development', 'test', 'production']),
    
    // Client-side variables (automatically available to the browser)
    NEXT_PUBLIC_APP_URL: z.string().url(),
  })
);
\`\`\`

2. To expose client-side variables in \`next.config.js\`:

\`\`\`javascript
const { env } = require('./env');

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: env.envObject(),
};

module.exports = nextConfig;
\`\`\`

3. Use the environment variables in your app:

\`\`\`typescript
import { env } from '@/env';

// Server-side (e.g. API route)
console.log(env.server.DATABASE_URL);

// Client-side (in components)
console.log(env.client.NEXT_PUBLIC_APP_URL);
\`\`\`
`;

export default { createNextEnv, setupInstructions };
