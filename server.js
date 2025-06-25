import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { randomInt } from "node:crypto";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handler);

    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === "production" 
                ? "https://photography-ci2a.vercel.app" 
                : "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });

    // Track connected users to prevent duplicate connections
    const connectedUsers = new Set();

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('join-user-room', (userId) => {
            // Leave any existing rooms for this socket
            Object.keys(socket.rooms).forEach(room => {
                if (room.startsWith('user-') && room !== socket.id) {
                    socket.leave(room);
                }
            });

            // Join the new room
            socket.join(`user-${userId}`);
            connectedUsers.add(userId);
            console.log(`User ${userId} joined their notification room`);
        });

        socket.on('leave-user-room', (userId) => {
            socket.leave(`user-${userId}`);
            connectedUsers.delete(userId);
            console.log(`User ${userId} left their notification room`);
        });

        socket.on('mark-notification-read', (data) => {
            const { notificationId, userId } = data;
            // Broadcast to all clients in the user's room
            socket.to(`user-${userId}`).emit('notification-read', notificationId);
        });

        socket.on('mark-all-notifications-read', (data) => {
            const { userId } = data;
            // Broadcast to all clients in the user's room
            socket.to(`user-${userId}`).emit('all-notifications-read');
        });

        socket.on('send-notification', (data) => {
            console.log("Notification Data", data);

            if (data.userId && connectedUsers.has(data.userId)) {
                // Only send if user is actually connected
                io.to(`user-${data.userId}`).emit('new-notification', data);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
            // Clean up user from connected set if this was their only connection
            // Note: This is a simplified cleanup, in production you might want
            // to track which socket belongs to which user
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
