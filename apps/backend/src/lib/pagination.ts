/**
 * Encodes a row ID as an opaque pagination cursor
 * @param id The ID of the last row on the current page
 */
export function encodeCursor(id: number): string {
	return Buffer.from(String(id)).toString("base64");
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
