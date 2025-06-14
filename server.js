// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const socketio = require('socket.io');
const path = require('path');

// Koneksyon MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB konekte avèk siksè"))
  .catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

// Kreye aplikasyon an
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware pou JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesyon Express
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 jou
}));

// Bay aksè ak fichye yo (front-end)
app.use(express.static(path.join(__dirname, 'public')));

// Ranmase tout rout yo
app.use('/auth', require('./routes/auth'));
app.use('/friends', require('./routes/friends'));

// Socket.IO pou chat la
const connectedUsers = {};

io.on('connection', socket => {
  console.log("🟢 Yon itilizatè konekte");

  socket.on('login', userId => {
    connectedUsers[userId] = socket.id;
    io.emit('update-online-users', Object.keys(connectedUsers));
  });

  socket.on('send-private-message', ({ senderId, recipientId, message }) => {
    const recipientSocket = connectedUsers[recipientId];
    if (recipientSocket) {
      io.to(recipientSocket).emit('receive-private-message', {
        senderId,
        message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log("🔴 Yon itilizatè dekonekte");
    for (const [userId, sockId] of Object.entries(connectedUsers)) {
      if (sockId === socket.id) {
        delete connectedUsers[userId];
        break;
      }
    }
    io.emit('update-online-users', Object.keys(connectedUsers));
  });
});

// Demare sèvè a
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Sèvè a ap kouri sou pò ${PORT}`));






// enskri yon nouvo itilizatè
app.post('/api/auth/register', ...);

// konekte yon itilizatè
app.post('/api/auth/login', ...);

// dekonekte
app.post('/api/auth/logout', ...);

// voye demand zanmi
app.post('/api/friends/request', requireAuth, ...);

// aksepte ou refize demand zanmi
app.post('/api/friends/respond', requireAuth, ...);

// jwenn tout zanmi aksepte ou
app.get('/api/friends/list', requireAuth, ...);
