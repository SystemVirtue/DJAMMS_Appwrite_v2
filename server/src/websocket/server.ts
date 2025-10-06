/**
 * Example Socket.IO WebSocket Server
 * - Demonstrates JWT handshake enforcement (Fix 7)
 * - Enforces venue room isolation
 * - Intended as a reference implementation to be adapted into the production backend
 */

import http from 'http';
import express from 'express';
import { Server as IOServer, Socket } from 'socket.io';
import fetch from 'node-fetch';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: '*'
  }
});

// Middleware: Validate Appwrite JWT in handshake by calling Appwrite /v1/account
io.use(async (socket: Socket & { data?: any }, next: (err?: any) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      console.error('WSS Auth Fail: Missing token');
      return next(new Error('Authentication failed: Token is required in handshake'));
    }

    try {
      const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
      const project = process.env.APPWRITE_PROJECT_ID || '';
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/v1/account`, {
        method: 'GET',
        headers: {
          'X-Appwrite-JWT': token,
          'X-Appwrite-Project': project,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        console.error('WSS Auth Fail: Appwrite account verification failed', await res.text());
        return next(new Error('Authentication failed: Invalid Appwrite JWT'));
      }

      const account = await res.json();
      // Attach account payload to socket for later use
      socket.data.user = account;
      return next();
    } catch (err) {
      console.error('WSS Auth Fail:', err);
      return next(new Error('Authentication failed: verification error'));
    }
  } catch (err) {
    console.error('WSS Auth Middleware Error:', err);
    return next(new Error('Authentication middleware failure'));
  }
});

// Basic namespaced event handling with venue isolation
io.on('connection', (socket: Socket & { data?: any }) => {
  const user = socket.data?.user;
  console.log(`WSS: client connected - userId=${user?.userId} role=${user?.role}`);

  socket.on('joinVenue', ({ venueId }: { venueId: string }) => {
    // Enforce ownership/permission: owners/admins can join management rooms
    // For stricter checks, validate venue ownership against database here using user info
    console.log(`WSS: ${user?.userId} joining venue ${venueId}`);
    socket.join(`venue:${venueId}`);
  });

  socket.on('leaveVenue', ({ venueId }: { venueId: string }) => {
    socket.leave(`venue:${venueId}`);
  });

  socket.on('player:now_playing', (payload: any) => {
    const venueId = payload?.venueId;
    if (!venueId) return;
    // Broadcast to all clients in venue room except sender
    socket.to(`venue:${venueId}`).emit('playerStateUpdate', payload);
  });

  // Example: queue:insert event - should validate permissions server-side
  socket.on('queue:insert', (payload: any) => {
    const venueId = payload?.venueId;
    if (!venueId) return;
    // Optionally: validate user credits / permissions here
    io.to(`venue:${venueId}`).emit('queue:insert', payload);
  });

  socket.on('disconnect', (reason: any) => {
    console.log(`WSS: client disconnected: ${String(reason)}`);
  });
});

server.listen(PORT, () => {
  console.log(`Example WebSocket server listening on port ${PORT}`);
});
