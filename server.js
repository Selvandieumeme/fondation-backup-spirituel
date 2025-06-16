<<<<<<< HEAD
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


io.on('connection', socket => {
  const userId = socket.userId; // ID moun ki konekte a (ou dwe mete li via sesyon)
  onlineUsers[userId] = socket.id;

  socket.on('private message', ({ to, message }) => {
    if (!onlineUsers[to]) return;
    io.to(onlineUsers[to]).emit('private message', { from: userId, message });
  });

  socket.on('disconnect', () => {
    delete onlineUsers[userId]; // Retire moun lan si li dekonekte
  });
});




// Middleware pou JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// API pou rekipere tout mesaj prive pou itilizatè a
app.get('/messages/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const messages = await Message.find({
      $or: [{ from: userId }, { to: userId }]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erè pandan chajman mesaj yo.' });
  }
});





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




const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server); // Socket.io konekte ak serve a

const onlineUsers = {}; // pou swiv moun ki konekte

// koneksyon chak itilizatè
io.on('connection', socket => {
  // ... mete tout kòd koneksyon la a
});

// Lanse serve a
server.listen(3000, () => {
  console.log("Serve ap koute sou port 3000");
});





// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const path = require('path');

const connectDB = require('./db');
const Message = require('./models/Message');

dotenv.config();
connectDB();

=======
const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();
>>>>>>> a2d0225 (Ajoute jsonwebtoken pou JWT)
const app = express();
const server = http.createServer(app);
const io = new Server(server);

<<<<<<< HEAD
const sessionMiddleware = session({
  secret: 'backup-fobas-sekre',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Sove id itilizatè ki konekte yo
const onlineUsers = {};

io.on('connection', (socket) => {
  const session = socket.request.session;
  const userId = session?.userId || 'anonim';

  onlineUsers[userId] = socket.id;

  socket.on('private message', async ({ to, message }) => {
    await Message.create({ from: userId, to, message });

    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit('private message', { from: userId, message });
=======
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'backupsecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
});

app.use(express.static('public'));
app.use(express.json());
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

const onlineUsers = {};

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let user = await User.findOne({ username });
  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    user = await User.create({ username, password: hash });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (valid) {
    req.session.username = username;
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

io.on('connection', socket => {
  const session = socket.request.session;
  if (!session || !session.username) return;

  const username = session.username;
  socket.username = username;
  onlineUsers[username] = socket.id;

  io.emit('users', Object.keys(onlineUsers));

  socket.on('private message', ({ to, message }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit('private message', { from: username, message });
>>>>>>> a2d0225 (Ajoute jsonwebtoken pou JWT)
    }
  });

  socket.on('disconnect', () => {
<<<<<<< HEAD
    delete onlineUsers[userId];
  });
});

server.listen(process.env.PORT, () => {
  console.log(`✅ Serveur ap koute sou http://localhost:${process.env.PORT}`);
});
=======
    delete onlineUsers[username];
    io.emit('users', Object.keys(onlineUsers));
  });

  socket.on('new user', () => {
    io.emit('users', Object.keys(onlineUsers));
  });
});

server.listen(3000, () => console.log('Serveur ap koute sou http://localhost:3000'));
>>>>>>> a2d0225 (Ajoute jsonwebtoken pou JWT)
