interface APIErrorResponse {
	statusCode: number;
	details: string;
}

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
