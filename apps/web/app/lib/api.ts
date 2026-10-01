// Base URL of the backend API. It has to be NEXT_PUBLIC_* to be available in client
// components; a plain env var is undefined in the browser and would silently fall back
// to localhost in production.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Error thrown by `fetcher` for a non-2xx response; `status` is the HTTP status code. */
export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

/** SWR fetcher for GET requests to the backend (sends the session cookie). */
export async function fetcher<T = unknown>(url: string): Promise<T> {
	const res = await fetch(url, {
		method: "GET",
		credentials: "include",
	});

	if (!res.ok) {
		throw new ApiError(res.status, `Request failed with status ${res.status}`);
	}

	return res.json();
}

export type SaveResult =
	| { ok: true }
	| {
			ok: false;
			/** HTTP status, or 0 if the request never reached the backend */
			status: number;
			/** The backend's `error` message, if it sent one */
			message: string;
			/** Validation details for a 400 (the backend's zod `treeifyError` output) */
			details?: unknown;
	  };

/** A node of zod's `treeifyError` output, as the backend sends it in a 400's `details`. */
type ErrorTree = {
	errors?: unknown;
	properties?: Record<string, ErrorTree>;
	items?: (ErrorTree | null | undefined)[];
};

/** The first error message anywhere in a tree node (its own, then its fields/items). */
function firstMessage(node: ErrorTree | null | undefined): string | undefined {
	if (!node || typeof node !== "object") {
		return undefined;
	}
	if (Array.isArray(node.errors) && typeof node.errors[0] === "string") {
		return node.errors[0];
	}
	for (const child of [
		...Object.values(node.properties ?? {}),
		...(node.items ?? []),
	]) {
		const message = firstMessage(child);
		if (message) {
			return message;
		}
	}
	return undefined;
}

/**
 * Turns a 400 response's `details` into one message per top-level field, e.g.
 * `{ cooldownSeconds: "Too big: expected number to be <=2147483647" }`. An error inside a
 * list (one bad item) is reported on the list's field. Errors about the body as a whole
 * are under `_form`.
 */
export function parseFieldErrors(details: unknown): Record<string, string> {
	const result: Record<string, string> = {};
	if (!details || typeof details !== "object") {
		return result;
	}

	const tree = details as ErrorTree;
	if (Array.isArray(tree.errors) && typeof tree.errors[0] === "string") {
		result._form = tree.errors[0];
	}
	for (const [field, node] of Object.entries(tree.properties ?? {})) {
		const message = firstMessage(node);
		if (message) {
			result[field] = message;
		}
	}
	return result;
}

/**
 * PATCHes JSON to a backend path (e.g. `/guilds/123/settings/bans`) and never throws:
 * the outcome is returned so a form can show a message. Notable statuses: 400 = invalid
 * body (see `details`), 403 = the user lacks edit access, 404 = guild not registered.
 */
export async function apiPatch(path: string, body: unknown): Promise<SaveResult> {
	let res: Response;

	try {
		res = await fetch(`${API_URL}${path}`, {
			method: "PATCH",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	} catch {
		return { ok: false, status: 0, message: "Could not reach the server" };
	}

	if (res.ok) {
		return { ok: true };
	}

	// Error bodies are JSON from the backend, but a proxy or crash may send something else
	const errorBody = await res.json().catch(() => null);

	return {
		ok: false,
		status: res.status,
		message:
			typeof errorBody?.error === "string"
				? errorBody.error
				: `Request failed with status ${res.status}`,
		details: errorBody?.details,
	};
}
