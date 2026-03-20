import { WebSocket, WebSocketServer } from "ws";

//Inside the matchSubscribers map, the key is matchId and the value is a set, and the set is a bunch of sockets objects that are subscribed to a specfic match. The reason for set is to avoid duplicates.

// The matchSubscribers is going to look like
// matchSubscribers =  {
//   1: {
//     socket1,
//     socket2,
//     socket3
//   }
// }

const matchSubscribers = new Map();

//Inside the subscribe helper function, we first check if there is an existing matchId or not. If not we create one. Then we add the socket object to the set.
function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

function unSubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId); // subscribers is the set() of subscribers of that matchId.
  if (!subscribers) {
    return;
  }

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    // Here we are deleting the mathcId from the matchSubscribers map if the subscribers set() count goes to 0, means people are no more interested in that match.
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unSubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }
    client.send(JSON.stringify(payload));
  }
}

function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (e) {
    console.error(e);
    sendJson(socket, {
      type: "error",
      message: "Invalid JSON",
    });
  }
  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, {
      type: "subscribed",
      matchId: message.matchId,
    });
    return;
  }
  if (message?.type === "unSubscribe" && Number.isInteger(message.matchId)) {
    unSubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.match);
    sendJson(socket, {
      type: "unSubscribed",
      matchId: message.matchId,
    });
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.subscriptions = new Set();

    socket.on("message", (data) => {
      handleMessage(socket, data);
    });
    socket.on("error", () => {
      socket.terminate();
    });
    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    sendJson(socket, { type: "Welcome" });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 3000);
  wss.on("close", () => {
    clearInterval(interval);
  });

  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, {
      type: "commentary",
      data: comment,
    });
  }
  return { broadcastMatchCreated, broadcastCommentary };
}
