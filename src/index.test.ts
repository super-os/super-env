import { describe, expect, test } from "bun:test";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { z } from "zod";
import {
	decrypt,
	decryptEnvFile,
	encrypt,
	encryptEnvFile,
	generateMasterKey,
	saveMasterKey,
} from "./core/encryption";
import { Env, createEnv, filterClientEnv } from "./core/env";

// Environment variable validation tests
describe("Environment variable validation", () => {
	// Setup test env vars
	process.env.TEST_VAR = "test-value";
	process.env.TEST_NUMBER = "123";

	test("should validate environment variables with Zod schema", () => {
		const schema = z.object({
			TEST_VAR: z.string(),
			TEST_NUMBER: z.string().transform((val) => Number.parseInt(val, 10)),
		});

		const env = createEnv(schema);

		expect(env.TEST_VAR).toBe("test-value");
		expect(env.TEST_NUMBER).toBe(123);
	});

	test("should filter client environment variables by prefix", () => {
		process.env.CLIENT_TEST = "client-value";
		process.env.SERVER_TEST = "server-value";

		const clientEnv = filterClientEnv(
			process.env as Record<string, string>,
			"CLIENT_",
		);

		expect(clientEnv.CLIENT_TEST).toBe("client-value");
		expect(clientEnv.SERVER_TEST).toBeUndefined();
	});

	test("should work with the Env class", () => {
		const schema = z.object({
			TEST_VAR: z.string(),
		});

		const env = new Env(schema);

		expect(env.get().TEST_VAR).toBe("test-value");
		expect(env.getValue("TEST_VAR")).toBe("test-value");
	});
});

// Encryption tests
describe("Encryption and decryption", () => {
	test("should generate and save a master key", () => {
		const key = generateMasterKey();
		expect(key).toBeDefined();
		expect(key.length).toBe(32);

		// Save to a test file
		const testKeyPath = ".test-master-key";
		saveMasterKey(key, testKeyPath);

		expect(existsSync(testKeyPath)).toBe(true);

		// Cleanup
		unlinkSync(testKeyPath);
	});

	test("should encrypt and decrypt a string", () => {
		const key = generateMasterKey();
		const testText = "This is a test string";

		const encrypted = encrypt(testText, key);
		expect(encrypted).not.toBe(testText);

		const decrypted = decrypt(encrypted, key);
		expect(decrypted).toBe(testText);
	});

	test("should encrypt and decrypt a .env file", () => {
		const key = generateMasterKey();
		const testKeyPath = ".test-master-key";
		saveMasterKey(key, testKeyPath);

		const testEnvPath = ".test-env";
		const testEncPath = ".test-env.enc";

		// Create a test .env file
		const testEnvContent = "TEST_KEY=test-value\nANOTHER_KEY=another-value\n";
		writeFileSync(testEnvPath, testEnvContent);

		// Encrypt it
		encryptEnvFile(testEnvPath, testEncPath, testKeyPath);
		expect(existsSync(testEncPath)).toBe(true);

		// Decrypt it
		decryptEnvFile(testEncPath, `${testEnvPath}.decrypted`, testKeyPath);

		// Compare original and decrypted content
		const decryptedContent = require("node:fs").readFileSync(
			`${testEnvPath}.decrypted`,
			"utf8",
		);
		expect(decryptedContent).toBe(testEnvContent);

		// Cleanup;
		unlinkSync(testKeyPath);
		unlinkSync(testEnvPath);
		unlinkSync(testEncPath);
		unlinkSync(`${testEnvPath}.decrypted`);
	});
});
