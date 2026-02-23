import { logger } from '@/libs/logger';
import { rooms, userRooms } from '@/states';
import { Room, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const log = logger.child({ module: 'rooms' });

export function createRoom(user: User): { success: true; roomId: string } {
	const roomId: string = uuidv4();

	const room: Room = {
		id: roomId,
		users: new Map(),
		createdAt: new Date(),
		deletedAt: null,
	};

	room.users.set(user.socketId, user);
	userRooms.set(user.socketId, roomId);
	rooms.set(roomId, room);

	log.info({ roomId, userSocketId: user.socketId }, `User created room`);

	return { success: true, roomId: roomId };
}

export function joinRoom(
	user: User,
	roomId: string,
): { success: boolean; error?: string } {
	const room: Room | undefined = rooms.get(roomId);
	if (!room) {
		log.warn({ roomId }, 'The room not found');
		return { success: false, error: 'The room not found' };
	}
	if (room.users.size >= 4) {
		log.warn({ roomId }, 'There are too many users');
		return { success: false, error: 'There are too many users' };
	}
	if (userRooms.has(user.socketId)) {
		const existingRoomId = userRooms.get(user.socketId);
		log.warn({ roomId, existingRoomId }, 'The user is already in the room');
		return { success: false, error: 'The user is already in the room' };
	}

	userRooms.set(user.socketId, roomId);
	room.users.set(user.socketId, user);

	log.info(
		{ roomId, userSocketId: user.socketId, userRooms },
		'The user joined the room',
	);

	return { success: true };
}

export function leaveRoom(
	user: User,
	roomId: string,
): { success: boolean; error?: string } {
	const room: Room | undefined = rooms.get(roomId);
	if (!room) {
		log.warn({ roomId }, 'The room not found');
		return { success: false, error: 'The room not found' };
	}

	room.users.delete(user.socketId);
	userRooms.delete(user.socketId);

	log.info({ roomId, userSocketId: user.socketId }, `The user left the room`);

	if (room.users.size === 0) {
		rooms.delete(roomId);
		log.info({ roomId }, `The room was deleted due to lack of users`);
	}

	return { success: true };
}
