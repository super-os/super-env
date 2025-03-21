/**
 * Next.js integration for super-env
 */

import { existsSync } from "node:fs";
import type { z } from "zod";
import { MASTER_KEY_FILENAME, decryptEnvFile } from "../../core/encryption";
import { type EnvOptions, createEnv } from "../../core/env";

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
 * Options for wrapping Next.js config
 */
export interface WithSuperEnvOptions {
	/**
	 * Path to the encrypted env file
	 * @default ".env.enc"
	 */
	encryptedEnvPath?: string;

	/**
	 * Path to output the decrypted env file
	 * @default ".env"
	 */
	outputEnvPath?: string;

	/**
	 * Path to the master key file
	 * @default "MASTER_KEY.key"
	 */
	keyFilePath?: string;

	/**
	 * Whether to skip decryption if the output file already exists
	 * @default true
	 */
	skipIfOutputExists?: boolean;
}

/**
 * Default options for Next.js integration
 */
const defaultNextOptions: NextEnvOptions = {
	clientPrefix: "NEXT_PUBLIC_",
};

/**
 * Default options for withSuperEnv
 */
const defaultWithSuperEnvOptions: WithSuperEnvOptions = {
	encryptedEnvPath: ".env.enc",
	outputEnvPath: ".env",
	keyFilePath: MASTER_KEY_FILENAME,
	skipIfOutputExists: true,
};

/**
 * Create a type-safe environment configuration for a Next.js app
 * @param schema - Schema containing client and server environment variables
 * @param options - Configuration options
 * @returns A flattened validated environment object with all variables
 */
export function createNextEnv<
	TServer extends z.ZodType,
	TClient extends z.ZodType,
>(
	schema: {
		client: TClient;
		server: TServer;
	},
	options: NextEnvOptions = {},
) {
	const mergedOptions = { ...defaultNextOptions, ...options };

	// Validate server-side environment variables
	const serverEnv = createEnv(schema.server, mergedOptions);

	// Validate client-side environment variables
	const clientEnv = createEnv(schema.client, {
		...mergedOptions,
		throwOnValidationFailure: false, // Client vars missing on server is ok
	});

	// Merge server and client variables into a single object
	const combinedEnv = {
		...serverEnv,
		...clientEnv,
	};

	return combinedEnv;
}

/**
 * Wrap Next.js config to automatically decrypt .env.enc file
 * @param nextConfig - The Next.js configuration object
 * @param options - Decryption options
 * @returns The modified Next.js configuration
 */
export function withSuperEnv(
	nextConfig = {},
	options: WithSuperEnvOptions = {},
) {
	const mergedOptions = { ...defaultWithSuperEnvOptions, ...options };
	const { encryptedEnvPath, outputEnvPath, keyFilePath, skipIfOutputExists } =
		mergedOptions;

	// Ensure we have the required paths
	const inputPath =
		encryptedEnvPath || defaultWithSuperEnvOptions.encryptedEnvPath!;
	const outputPath = outputEnvPath || defaultWithSuperEnvOptions.outputEnvPath!;
	const keyPath = keyFilePath || defaultWithSuperEnvOptions.keyFilePath!;

	// Check if the encrypted file exists
	if (!existsSync(inputPath)) {
		console.warn(`[super-env] Warning: Encrypted file ${inputPath} not found`);
		return nextConfig;
	}

	// Check if the key file exists
	if (!existsSync(keyPath)) {
		console.warn(`[super-env] Warning: Key file ${keyPath} not found`);
		return nextConfig;
	}

	// Skip decryption if output exists and skipIfOutputExists is true
	if (!(skipIfOutputExists && existsSync(outputPath))) {
		try {
			// Decrypt the file
			console.log(`[super-env] Decrypting ${inputPath} to ${outputPath}`);
			decryptEnvFile(inputPath, outputPath, keyPath);
			console.log("[super-env] Successfully decrypted environment variables");
		} catch (error) {
			console.error(
				"[super-env] Error decrypting environment variables:",
				error,
			);
		}
	}

	return nextConfig;
}

/**
 * Setup instructions for Next.js integration
 */
export const setupInstructions = `
To use super-env with Next.js:

1. Create an \`env.ts\` file in your project with:

\`\`\`typescript
import { z } from 'zod';
import { createNextEnv } from '@super-os/super-env/nextjs';

export const env = createNextEnv({
  server: z.object({
    DATABASE_URL: z.string().url(),
    API_KEY: z.string().min(1),
    NODE_ENV: z.enum(['development', 'test', 'production']),
  }),
  client: z.object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
  })
});
\`\`\`

2. Automatically decrypt .env.enc in \`next.config.js\`:

\`\`\`javascript
import { withSuperEnv } from '@super-os/super-env/nextjs';



const nextConfig = {
  // ...
};

export default withSuperEnv(nextConfig);
\`\`\`

3. Use the environment variables in your app:

\`\`\`typescript
import { env } from '@/env';

// Access any variable directly
console.log(env.DATABASE_URL);
console.log(env.NEXT_PUBLIC_APP_URL);

\`\`\`
`;

export const internal = { setupInstructions };
