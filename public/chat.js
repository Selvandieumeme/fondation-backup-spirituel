// public/chat.js
const socket = io();

socket.on('private message', ({ from, message }) => {
  const chatBox = document.getElementById('chat');
  const p = document.createElement('p');
  p.innerText = `📨 Soti nan ${from}: ${message}`;
  chatBox.appendChild(p);
});

function sendPrivateMessage() {
  const to = document.getElementById('toUser').value;
  const message = document.getElementById('message').value;
  socket.emit('private message', { to, message });

  const chatBox = document.getElementById('chat');
  const p = document.createElement('p');
  p.innerText = `✅ Ou voye: ${message}`;
  chatBox.appendChild(p);

  document.getElementById('message').value = '';
}
