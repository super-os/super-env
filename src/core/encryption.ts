/**
 * Encryption utilities for secure .env file management
 */

import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Default name for the master key file
 */
export const MASTER_KEY_FILENAME = "MASTER_KEY.key";

/**
 * Generates a random master key for encryption
 * @returns {Buffer} The generated key
 */
export function generateMasterKey(): Buffer {
	return randomBytes(32); // 256 bits
}

/**
 * Save the master key to a file
 * @param {Buffer} key - The master key to save
 * @param {string} filePath - Path to save the key file (default: MASTER_KEY.key)
 */
export function saveMasterKey(
	key: Buffer,
	filePath: string = MASTER_KEY_FILENAME,
): void {
	writeFileSync(filePath, key);
}

/**
 * Load the master key from a file
 * @param {string} filePath - Path to the key file (default: MASTER_KEY.key)
 * @returns {Buffer} The loaded key
 * @throws {Error} If the key file does not exist
 */
export function loadMasterKey(filePath: string = MASTER_KEY_FILENAME): Buffer {
	if (!existsSync(filePath)) {
		throw new Error(`Master key file not found: ${filePath}`);
	}
	return readFileSync(filePath);
}

/**
 * Encrypt a string using the master key
 * @param {string} text - The text to encrypt
 * @param {Buffer} masterKey - The master key for encryption
 * @returns {string} The encrypted text in base64 format
 */
export function encrypt(text: string, masterKey: Buffer): string {
	// Generate a random initialization vector
	const iv = randomBytes(16);

	// Create a cipher using the master key and iv
	const key = scryptSync(masterKey, "salt", 32);
	const cipher = createCipheriv("aes-256-cbc", key, iv);

	// Encrypt the text
	let encrypted = cipher.update(text, "utf8", "base64");
	encrypted += cipher.final("base64");

	// Prepend the iv to the encrypted text (we'll need it for decryption)
	// Format: iv:encrypted
	return `${iv.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt a string using the master key
 * @param {string} encryptedText - The encrypted text to decrypt (format: iv:encrypted)
 * @param {Buffer} masterKey - The master key for decryption
 * @returns {string} The decrypted text
 */
export function decrypt(encryptedText: string, masterKey: Buffer): string {
	// Split the encrypted text into iv and encrypted parts
	const [ivBase64, encrypted] = encryptedText.split(":");
	if (!ivBase64 || !encrypted) {
		throw new Error("Invalid encrypted text format");
	}

	// Convert the iv from base64 to Buffer
	const iv = Buffer.from(ivBase64, "base64");

	// Create a decipher using the master key and iv
	const key = scryptSync(masterKey, "salt", 32);
	const decipher = createDecipheriv("aes-256-cbc", key, iv);

	// Decrypt the text
	let decrypted = decipher.update(encrypted, "base64", "utf8");
	decrypted += decipher.final("utf8");

	return decrypted;
}

/**
 * Encrypt a .env file
 * @param {string} inputFilePath - Path to the .env file to encrypt
 * @param {string} outputFilePath - Path to save the encrypted .env file
 * @param {string} keyFilePath - Path to the master key file
 */
export function encryptEnvFile(
	inputFilePath = ".env",
	outputFilePath = ".env.enc",
	keyFilePath: string = MASTER_KEY_FILENAME,
): void {
	// Load the master key
	const masterKey = loadMasterKey(keyFilePath);

	// Read the .env file
	const envContent = readFileSync(inputFilePath, "utf8");

	// Encrypt the content
	const encrypted = encrypt(envContent, masterKey);

	// Save the encrypted content to the output file
	writeFileSync(outputFilePath, encrypted);
}

/**
 * Decrypt a .env file
 * @param {string} inputFilePath - Path to the encrypted .env file
 * @param {string} outputFilePath - Path to save the decrypted .env file
 * @param {string} keyFilePath - Path to the master key file
 */
export function decryptEnvFile(
	inputFilePath = ".env.enc",
	outputFilePath = ".env",
	keyFilePath: string = MASTER_KEY_FILENAME,
): void {
	// Load the master key
	const masterKey = loadMasterKey(keyFilePath);

	// Read the encrypted .env file
	const encryptedContent = readFileSync(inputFilePath, "utf8");

	// Decrypt the content
	const decrypted = decrypt(encryptedContent, masterKey);

	// Save the decrypted content to the output file
	writeFileSync(outputFilePath, decrypted);
}
