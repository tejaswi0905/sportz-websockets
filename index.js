import express from "express";
import http from "http";
import { WebSocket, WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({
  server: server,
  path: "/ws",
  maxPayload: 1024 * 1024,
});

wss.on("connection", (socket) => {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send({ type: "Welcome" });
});
