DJAMMS WebSocket Server (Example)
================================

This folder contains a small reference implementation of a Socket.IO WebSocket server that demonstrates:

- JWT handshake enforcement (Fix 7)
- Venue room isolation and basic event broadcasting

This is an example to be adapted to your production backend. It is intentionally minimal so it can be integrated into your main backend service.

Quick start (in the `server/` folder):

```bash
npm install
# set JWT_SECRET environment variable
npm start
```

Security note: This example uses a simple JWT secret for demonstration. In production use a secure secret manager and rotate keys as needed.
