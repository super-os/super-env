/**
 * Environment variables management with Zod for type safety
 */

import { existsSync } from "node:fs";
import dotenv from "dotenv";
import type { z } from "zod";

/**
 * Configuration options for creating type-safe environment variables
 */
export interface EnvOptions {
	/**
	 * The path to the .env file
	 * @default ".env"
	 */
	envFilePath?: string;

	/**
	 * Whether to log validation errors
	 * @default true
	 */
	logValidationErrors?: boolean;

	/**
	 * Whether to throw an error on validation failure
	 * @default true
	 */
	throwOnValidationFailure?: boolean;

	/**
	 * Skip loading .env file (useful when environment variables are already loaded)
	 * @default false
	 */
	skipEnvLoad?: boolean;
}

/**
 * Default options for environment variables validation
 */
const defaultOptions: EnvOptions = {
	envFilePath: ".env",
	logValidationErrors: true,
	throwOnValidationFailure: true,
	skipEnvLoad: false,
};

/**
 * Create a type-safe environment object from a Zod schema
 * @param schema - Zod schema for environment variables
 * @param options - Configuration options
 * @returns An object with the validated environment variables
 */
export function createEnv<T extends z.ZodType>(
	schema: T,
	options: EnvOptions = {},
): z.infer<T> {
	const mergedOptions = { ...defaultOptions, ...options };

	// Load variables from .env file if it exists and not skipped
	if (
		!mergedOptions.skipEnvLoad &&
		mergedOptions.envFilePath &&
		existsSync(mergedOptions.envFilePath)
	) {
		dotenv.config({ path: mergedOptions.envFilePath });
	}

	// Validate the environment variables against the schema
	const result = schema.safeParse(process.env);

	if (!result.success) {
		if (mergedOptions.logValidationErrors) {
			console.error("❌ Invalid environment variables:");
			result.error.errors.forEach((error) => {
				console.error(`- ${error.path.join(".")}: ${error.message}`);
			});
		}

		if (mergedOptions.throwOnValidationFailure) {
			throw new Error("Environment variables validation failed");
		}

		// Return an empty object if validation fails and we don't throw
		return {} as z.infer<T>;
	}

	return result.data;
}

/**
 * Filter environment variables that start with a given prefix
 * @param env The environment object
 * @param prefix The prefix to filter by
 * @returns An object with only the matching variables
 */
export function filterClientEnv(
	env: Record<string, string>,
	prefix: string,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(env).filter(([key]) => key.startsWith(prefix)),
	);
}

/**
 * A class to represent runtime environment variables with validation
 */
export class Env<T extends z.ZodType> {
	private schema: T;
	private cachedEnv: z.infer<T> | null = null;
	private options: EnvOptions;

	constructor(schema: T, options: EnvOptions = {}) {
		this.schema = schema;
		this.options = { ...defaultOptions, ...options };
	}

	/**
	 * Get the validated environment variables
	 */
	get(): z.infer<T> {
		if (this.cachedEnv) {
			return this.cachedEnv;
		}

		this.cachedEnv = createEnv(this.schema, this.options);
		return this.cachedEnv;
	}

	/**
	 * Get a specific environment variable
	 * @param key - The key of the environment variable
	 */
	getValue<K extends keyof z.infer<T>>(key: K): z.infer<T>[K] {
		return this.get()[key];
	}

	/**
	 * Get only the client-side environment variables (those with a specific prefix)
	 * @param prefix - The prefix for client-side variables
	 */
	getClientEnv(prefix: string): Partial<z.infer<T>> {
		const env = this.get();
		return filterClientEnv(env, prefix);
	}
}
