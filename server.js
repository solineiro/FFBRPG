const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Раздача статических файлов из корневой папки
app.use(express.static(__dirname));

// Маршрут для страницы входа по умолчанию
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Хранилище пользователей (в реальном проекте заменить на БД)
const users = {
  'zidan': { password: 'thief123', role: 'player', character: 'zidan' },
  'steiner': { password: 'rusty', role: 'player', character: 'steiner' },
  'master': { password: 'master123', role: 'master' }
};

// Активные соединения: ключ — логин, значение — объект { ws, role, character }
const clients = new Map();

// Вспомогательная функция отправки сообщения конкретному клиенту
function sendToClient(login, message) {
  const client = clients.get(login);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

// Рассылка всем мастерам
function broadcastToMasters(message) {
  for (let [login, client] of clients.entries()) {
    if (client.role === 'master' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

// WebSocket обработка подключений
wss.on('connection', (ws) => {
  let authenticated = false;
  let currentLogin = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      // Авторизация
      if (msg.type === 'login') {
        const { login, password } = msg;
        const user = users[login];
        if (user && user.password === password) {
          authenticated = true;
          currentLogin = login;
          clients.set(login, { ws, role: user.role, character: user.character });
          
          // Отправляем подтверждение и роль
          ws.send(JSON.stringify({
            type: 'login_success',
            role: user.role,
            character: user.character || null,
            login: login
          }));
          
          // Уведомляем мастеров о подключении игрока
          broadcastToMasters({
            type: 'player_connected',
            login: login,
            role: user.role
          });
          
          console.log(`Клиент ${login} (${user.role}) подключился`);
        } else {
          ws.send(JSON.stringify({ type: 'login_error', message: 'Неверный логин или пароль' }));
        }
        return;
      }
      
      // Все остальные сообщения требуют авторизации
      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Не авторизован' }));
        return;
      }
      
      // Пересылка сообщений между клиентами (например, для боя, обновления персонажа)
      if (msg.target) {
        sendToClient(msg.target, { ...msg, from: currentLogin });
      }
      
      // Обработка специальных типов сообщений (будет расширяться)
      if (msg.type === 'update_character') {
        // Сохраняем изменения персонажа (пока просто пересылаем мастеру)
        broadcastToMasters({
          type: 'character_updated',
          login: currentLogin,
          data: msg.data
        });
      }
      
    } catch (e) {
      console.error('Ошибка обработки сообщения:', e);
    }
  });
  
  ws.on('close', () => {
    if (currentLogin) {
      clients.delete(currentLogin);
      broadcastToMasters({
        type: 'player_disconnected',
        login: currentLogin
      });
      console.log(`Клиент ${currentLogin} отключился`);
    }
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});