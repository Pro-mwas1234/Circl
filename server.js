const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Store active session timer intervals if needed
  const activeTimers = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-room', ({ sessionId, user }) => {
      socket.join(sessionId);
      socket.sessionId = sessionId;
      socket.user = user;

      io.to(sessionId).emit('user-joined', {
        user,
        socketId: socket.id,
      });
    });

    socket.on('goal-update', ({ sessionId, userId, goal }) => {
      io.to(sessionId).emit('goal-updated', { userId, goal });
    });

    socket.on('camera-toggle', ({ sessionId, userId, cameraOn }) => {
      io.to(sessionId).emit('camera-toggled', { userId, cameraOn });
    });

    socket.on('send-message', ({ sessionId, user, message }) => {
      io.to(sessionId).emit('chat-message', {
        id: Math.random().toString(),
        userId: user.id,
        username: user.username,
        text: message,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('status-update', ({ sessionId, userId, status }) => {
      io.to(sessionId).emit('status-updated', { userId, status });
    });

    socket.on('timer-sync', ({ sessionId, remainingSeconds, isPaused }) => {
      socket.to(sessionId).emit('timer-synced', { remainingSeconds, isPaused });
    });

    socket.on('disconnect', () => {
      if (socket.sessionId && socket.user) {
        io.to(socket.sessionId).emit('user-left', {
          userId: socket.user.id,
          socketId: socket.id,
        });
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
