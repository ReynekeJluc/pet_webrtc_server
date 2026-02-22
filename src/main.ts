import { logger } from '@/libs/logger';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const app = express();
const port = 5000;
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
});

logger.info('logger worked!');

app.get('/', (req: any, res: any) => {
	res.send('Hello World!');
});

io.on('connection', socket => {
	const log = logger.child({ socketId: socket.id });
	log.info('Connected');

	socket.on('disconnect', () => {
		log.info('Disconnected');
	});
});

server.listen(port, () => {
	logger.info(`app start listening on port ${port}`);
});
