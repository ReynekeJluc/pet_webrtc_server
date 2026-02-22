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

app.get('/', (req: any, res: any) => {
	res.send('Hello World!');
});

io.on('connection', socket => {
	console.log('User connected:', socket.id);

	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id);
	});
});

server.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
