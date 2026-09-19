import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { ValueTransformer } from "typeorm";
import { env } from "../config/env";

// Marks a value as encrypted, and leaves room to change the scheme or rotate keys later
const VERSION_PREFIX = "v1:";
const IV_LENGTH_BYTES = 12;

const encryptionKey = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");

/**
 * Encrypts text with AES-256-GCM.
 * @returns `v1:<iv>:<auth tag>:<ciphertext>`, each part base64-encoded
 */
export function encryptWithKey(plain: string, key: Buffer): string {
	// A fresh random IV per value, so equal inputs never produce equal outputs
	const iv = randomBytes(IV_LENGTH_BYTES);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

	return [
		VERSION_PREFIX.slice(0, -1),
		iv.toString("base64"),
		cipher.getAuthTag().toString("base64"),
		ciphertext.toString("base64"),
	].join(":");
}

/**
 * Decrypts a value made by `encryptWithKey`.
 *
 * A value without the version prefix is treated as legacy plaintext and returned
 * as-is, so rows stored before encryption was added keep working until they are
 * next written.
 * @returns The plain text, or null if the value was tampered with or the key is wrong
 */
export function decryptWithKey(stored: string, key: Buffer): string | null {
	if (!stored.startsWith(VERSION_PREFIX)) {
		return stored;
	}

	try {
		const [ivPart, tagPart, ciphertextPart] = stored
			.slice(VERSION_PREFIX.length)
			.split(":");
		const decipher = createDecipheriv(
			"aes-256-gcm",
			key,
			Buffer.from(ivPart, "base64"),
		);
		decipher.setAuthTag(Buffer.from(tagPart, "base64"));

		return Buffer.concat([
			decipher.update(Buffer.from(ciphertextPart, "base64")),
			decipher.final(), // Throws if the auth tag doesn't match
		]).toString("utf8");
	} catch {
		console.warn("Could not decrypt a stored value (wrong key or corrupted data)");
		return null;
	}
}

/**
 * TypeORM transformer that encrypts a column when writing and decrypts it when reading.
 * An unreadable value comes back as null, which callers treat as "no token", so the
 * user is sent back to login rather than every read failing.
 */
export const encryptedColumn: ValueTransformer = {
	to: (value: string | null | undefined) =>
		value == null ? value : encryptWithKey(value, encryptionKey),
	from: (value: string | null | undefined) =>
		value == null ? value : decryptWithKey(value, encryptionKey),
};
