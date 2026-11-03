import * as z from "zod";

/**
 * Encodes a row ID as an opaque pagination cursor
 * @param id The ID of the last row on the current page
 */
export function encodeCursor(id: number): string {
	return Buffer.from(String(id)).toString("base64");
}

/**
 * Encodes a JSON value as an opaque pagination cursor, for keyset pagination that needs more
 * than the row ID (e.g. the value of the column being sorted on)
 */
export function encodeJsonCursor(value: unknown): string {
	return Buffer.from(JSON.stringify(value)).toString("base64url");
}

// Row IDs are Postgres `integer` (serial) columns, so anything above this makes the
// query itself fail with "out of range for type integer"
const MAX_ROW_ID = 2_147_483_647;

/**
 * Parses a row ID received from a client (URL parameter or cursor)
 * @returns The ID, or null unless it is a whole number within the database's integer range
 */
export function parseRowId(value: string): number | null {
	// Number() and parseInt() would accept things like "12abc", "1e3" or "  5"
	if (!/^\d+$/.test(value)) {
		return null;
	}

	const id = Number(value);
	return id <= MAX_ROW_ID ? id : null;
}

/**
 * Decodes a cursor made by `encodeCursor`
 * @param cursor The base64 cursor sent by the client
 * @returns The row ID, or null if the cursor isn't a valid row ID
 */
export function decodeCursor(cursor: string): number | null {
	// Buffer.from never throws on bad base64; it just decodes to garbage
	return parseRowId(Buffer.from(cursor, "base64").toString("utf-8"));
}

/**
 * Decodes a cursor made by 1encodeJsonCursor` and checks its shape
 * @Returns The value, or null if the cursor isnt valid JSON matching `schema`
 */
export function decodeJsonCursor<T>(
	cursor: string,
	schema: z.ZodType<T>,
): T | null {
	try {
		const json = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
		const result = schema.safeParse(json);
		return result.success ? result.data : null;
	} catch {
		return null; // not JSON
	}
}
