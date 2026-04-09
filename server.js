const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Загружаем базы данных
const weapons = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/weapons.json'), 'utf8'));
const abilities = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/abilities.json'), 'utf8'));
const bestiary = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/bestiary.json'), 'utf8'));
const monsterAttacks = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/monster_attacks.json'), 'utf8'));

// Хранилище пользователей
const users = {
  'zidan': { password: 'thief123', role: 'player', character: 'zidan', class: 'thief' },
  'steiner': { password: 'rusty', role: 'player', character: 'steiner', class: 'warrior' },
  'master': { password: 'master123', role: 'master' }
};

// Игровое состояние для каждого персонажа (ключ - имя персонажа, а не логин)
const gameStates = {};

// Инициализация состояния для нового персонажа
function initGameState(characterId, className) {
  // Заглушка начальных параметров (потом подтянем из карточек классов)
  return {
    name: characterId,
    class: className,
    level: 1,
    hp: { current: 105, max: 105 },
    mp: { current: 36, max: 36 },
    stats: { str: 21, mag: 18, spirit: 23, speed: 23 },
    equipment: { weapon: null, head: null, gloves: null, armor: null, accessory: null },
    inventory: [
      { id: 'dgr_mythril_dagger', count: 1 },
      { id: 'head_stub', count: 1 },
      { id: 'armor_stub', count: 1 },
      { id: 'c1', count: 5 }
    ],
    gil: 1000,
    magicStones: 18,
    learnedAbilities: [],
    abilityProgress: {} // id способности -> текущий AP
  };
}

// Активные соединения: логин -> { ws, role, character }
const clients = new Map();

// Вспомогательные функции отправки
function sendToClient(login, message) {
  const client = clients.get(login);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function broadcastToMasters(message) {
  for (let [login, client] of clients.entries()) {
    if (client.role === 'master' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

// Раздача статики
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.use(express.static(__dirname, { index: false }));

wss.on('connection', (ws) => {
  let authenticated = false;
  let currentLogin = null;
  let currentCharacter = null;

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
          currentCharacter = user.character || login;
          clients.set(login, { ws, role: user.role, character: currentCharacter });
          
          // Если состояние персонажа ещё не создано, инициализируем
          if (user.role === 'player' && !gameStates[currentCharacter]) {
            gameStates[currentCharacter] = initGameState(currentCharacter, user.class);
          }
          
          ws.send(JSON.stringify({
            type: 'login_success',
            role: user.role,
            character: currentCharacter,
            login: login,
            // Отправляем начальное состояние игроку
            gameState: user.role === 'player' ? gameStates[currentCharacter] : null,
            // Мастеру отправляем список всех игроков и их состояния
            players: user.role === 'master' ? getPlayersList() : null
          }));
          
          broadcastToMasters({
            type: 'player_connected',
            login: login,
            character: currentCharacter,
            role: user.role
          });
        } else {
          ws.send(JSON.stringify({ type: 'login_error', message: 'Неверный логин или пароль' }));
        }
        return;
      }
      
      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Не авторизован' }));
        return;
      }
      
      // Обработка действий игрока
      if (msg.type === 'equip_item') {
        const { slot, itemId } = msg;
        const state = gameStates[currentCharacter];
        if (!state) return;
        
        // Логика экипировки (упрощённая, позже синхронизируем с клиентом)
        const item = findItemInInventory(state, itemId);
        if (!item) return;
        
        // Проверка слота и класса
        // ... (реализация будет позже)
        
        // Снимаем старый предмет
        if (state.equipment[slot]) {
          returnItemToInventory(state, state.equipment[slot]);
        }
        
        // Экипируем новый
        removeItemFromInventory(state, itemId, 1);
        state.equipment[slot] = itemId;
        
        // Отправляем обновлённое состояние обратно игроку
        ws.send(JSON.stringify({
          type: 'state_update',
          gameState: state
        }));
        
        // Уведомляем мастеров
        broadcastToMasters({
          type: 'player_state_changed',
          character: currentCharacter,
          gameState: state
        });
      }
      
      // Добавим другие обработчики позже (передача монет, использование предметов и т.д.)
      
    } catch (e) {
      console.error('Ошибка обработки сообщения:', e);
    }
  });
  
  ws.on('close', () => {
    if (currentLogin) {
      clients.delete(currentLogin);
      broadcastToMasters({
        type: 'player_disconnected',
        login: currentLogin,
        character: currentCharacter
      });
    }
  });
});

// Вспомогательные функции инвентаря
function findItemInInventory(state, itemId) {
  return state.inventory.find(i => i.id === itemId);
}

function removeItemFromInventory(state, itemId, count) {
  const idx = state.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return false;
  const item = state.inventory[idx];
  if (item.count <= count) {
    state.inventory.splice(idx, 1);
  } else {
    item.count -= count;
  }
  return true;
}

function returnItemToInventory(state, itemId) {
  const existing = state.inventory.find(i => i.id === itemId);
  if (existing) {
    existing.count++;
  } else {
    // нужно получить шаблон предмета из базы (пока заглушка)
    state.inventory.push({ id: itemId, count: 1 });
  }
}

function getPlayersList() {
  const list = [];
  for (let [login, client] of clients.entries()) {
    if (client.role === 'player') {
      list.push({
        login,
        character: client.character,
        state: gameStates[client.character] || null
      });
    }
  }
  return list;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
