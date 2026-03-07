export interface User {
	socketId: string;
	nickname: string;
	createdAt: Date;
}

export interface Room {
	id: string;
	users: Map<string, User>;
	createdAt: Date;
	deletedAt: Date | null;
}
