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
