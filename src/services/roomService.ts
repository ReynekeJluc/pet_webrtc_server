import { logger } from '@/libs/logger';
import { Room, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const log = logger.child({ module: 'rooms' });

const rooms = new Map<string, Room>();
const userRooms = new Map<string, string>();

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

	log.info(
		{ roomId, userSocketId: user.socketId },
		`Пользователь создал комнату`,
	);

	return { success: true, roomId: roomId };
}

export function joinRoom(
	user: User,
	roomId: string,
): { success: boolean; error?: string } {
	const room: Room | undefined = rooms.get(roomId);
	if (!room) {
		log.warn({ roomId }, 'Комната не найдена');
		return { success: false, error: 'Комната не найдена' };
	}
	if (room.users.size >= 4) {
		log.warn({ roomId }, 'Слишком много пользователей');
		return { success: false, error: 'Слишком много пользователей' };
	}
	if (userRooms.has(user.socketId)) {
		const existingRoomId = userRooms.get(user.socketId);
		log.warn({ roomId, existingRoomId }, 'Пользователь уже в комнате');
		return { success: false, error: 'Пользователь уже в комнате' };
	}

	userRooms.set(user.socketId, roomId);
	room.users.set(user.socketId, user);

	log.info(
		{ roomId, userSocketId: user.socketId },
		'Пользователь присоединился',
	);

	return { success: true };
}

export function leaveRoom(
	user: User,
	roomId: string,
): { success: boolean; error?: string } {
	const room: Room | undefined = rooms.get(roomId);
	if (!room) {
		log.warn({ roomId }, 'Комната не найдена');
		return { success: false, error: 'Комната не найдена' };
	}

	room.users.delete(user.socketId);
	userRooms.delete(user.socketId);

	log.info(
		{ roomId, userSocketId: user.socketId },
		`Пользователь вышел из комнаты`,
	);

	if (room.users.size === 0) {
		rooms.delete(roomId);
		log.info({ roomId }, `Комната удалена, из-за отсутствия пользователей`);
	}

	return { success: true };
}
