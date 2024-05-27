const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const {
  createWhiteBoardTableIfNotExists,
  updateWhiteBoardFromRoomId,
  getWhiteBoardFromRoomId,
} = require("./database");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (token) {
    jwt.verify(token, "jwt_secret", (err, decoded) => {
      if (err) {
        return next(new Error("Authentication error"));
      }
      socket.user = decoded;
      next();
    });
  } else {
    next(new Error("Authentication error"));
  }
}).on("connection", (socket) => {
  socket.on("joinRoom", async ({ username, room }) => {
    try {
      // await createWhiteBoardTableIfNotExists();
      const previousData = await getWhiteBoardFromRoomId(room);
      socket.emit("message", previousData);
      socket.join(room);
      socket.broadcast
        .to(room)
        .emit("message", `${username} has joined the chat`);
    } catch (error) {
      socket.emit("error", error.message);
    }
  });

  // Listen for chat messages
  socket.on("canvas", async ({ room, message }) => {
    console.log("canvas");
    try {
      await updateWhiteBoardFromRoomId(room, socket.user.username, message);
      io.to(room).emit("message", { username: socket.user.username, message });
    } catch (error) {
      socket.emit("error", error.message);
    }
  });
});

server.listen(8080, () => {
  console.log("Server started at port: 8080");
});
