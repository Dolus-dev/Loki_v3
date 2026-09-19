interface APIErrorResponse {
	statusCode: number;
	details: string;
}

/**
 * Error thrown when a request to the Discord API fails
 * `statusCode` is Discord's HTTP status and `details` is Discord's error message.
 */
export class DiscordError extends Error implements APIErrorResponse {
	statusCode: number;
	details: string;

	constructor(statusCode: number, details: string, cause?: unknown) {
		super(details, { cause });
		this.name = "Discord API Error";
		this.statusCode = statusCode;
		this.details = details;
	}
}
