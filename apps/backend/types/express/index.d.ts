declare global {
	namespace Express {
		interface Request {
			session: {
				userId?: string;
			};
		}
	}
}

export {};
