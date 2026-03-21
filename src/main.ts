import 'dotenv/config';

import { logger } from '@/libs/logger';
import { rooms, userRooms } from '@/states';
import { User } from '@/types';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createRoom, joinRoom, leaveRoom } from './services/roomService';

const app = express();
const port = process.env.API_PORT || 5000;
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: process.env.CLIENT_URL,
		methods: ['GET', 'POST'],
	},
});

logger.info('logger worked!');

app.get('/', (req: any, res: any) => {
	res.send('Hello World!');
});

io.on('connection', socket => {
	const user: User = {
		socketId: socket.id,
		nickname: '',
		createdAt: new Date(),
	};

	const log = logger.child({ socketId: socket.id });
	log.info('User connected');

	socket.on('create-room', callback => {
		const res = createRoom();

		if (res.success) {
			// socket.join(res.roomId);
			callback({ success: true, roomId: res.roomId });
		}
	});

	socket.on('join-room', (data, callback) => {
		user.nickname = data.nickname;

		const res = joinRoom(user, data.roomId);

		if (res.success) {
			socket.join(data.roomId);

			socket.to(data.roomId).emit('peer-joined', {
				socketId: socket.id,
				nickname: data.nickname,
			});

			const room = rooms.get(data.roomId);
			if (room) {
				const existingParticipants = Array.from(room.users.values())
					.filter(u => u.socketId !== socket.id)
					.map(u => ({
						socketId: u.socketId,
						nickname: u.nickname,
					}));
				// existingParticipants.push(socket.id);

				log.info(
					{ participants: existingParticipants },
					'existing participants',
				);
				socket.emit('existing-participants', {
					participants: existingParticipants,
				});
			}

			callback({ success: true });
		} else {
			callback({ success: false, error: res.error });
		}
	});

	socket.on(
		'relay-sdp',
		(data: {
			targetSocketId: string;
			sdp: {
				type: string;
				sdp: string;
			};
		}) => {
			log.info(
				{ targetId: data.targetSocketId, sdpType: data.sdp.type },
				'sending SDP',
			);
			io.to(data.targetSocketId).emit('sdp-received', {
				fromSocketId: socket.id,
				sdp: data.sdp,
			});
		},
	);

	socket.on('relay-ice', (data: { targetSocketId: string; candidate: any }) => {
		log.info({ targetId: data.targetSocketId }, 'sending ICE');
		io.to(data.targetSocketId).emit('ice-received', {
			fromSocketId: socket.id,
			candidate: data.candidate,
		});
	});

	socket.on('check-room', (data: { roomId: string }, callback) => {
		const room = rooms.get(data.roomId);
		if (room) {
			callback({ success: true });
		} else {
			callback({ success: false });
		}
	});

	socket.on('leave-room', callback => {
		const roomId = userRooms.get(socket.id);

		log.info({ roomId }, `Leave room`);
		if (roomId) {
			leaveRoom(user, roomId);
			socket.leave(roomId);
			socket.to(roomId).emit('peer-disconnected', socket.id);
			callback({ success: true });
		} else {
			log.warn({ socketId: socket.id }, 'Room not found for user');
			callback({ success: false, error: 'Room not found' });
		}
	});

	socket.on('disconnect', () => {
		const roomId = userRooms.get(socket.id);

		log.info('Disconnected');
		if (roomId) {
			leaveRoom(user, roomId);
			socket.to(roomId).emit('peer-disconnected', socket.id);
		}
	});
});

server.listen(port, () => {
	logger.info(`app start listening on port ${port}`);
});
