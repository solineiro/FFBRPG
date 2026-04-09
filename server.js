// server.js – Final Fantasy IX RPG Server
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ========== ЗАГРУЗКА БАЗ ДАННЫХ ==========
let weaponsDB = {
  daggers: [], thiefSwords: [], rods: [], spears: [], swords: [],
  knightSwords: [], claws: [], forks: [], rackets: [], flutes: [], staves: []
};
let abilitiesDB = { abilities: [] };
let bestiaryDB = { monsters: [] };
let monsterAttacksDB = { attacks: [] };

try {
  const weaponsPath = path.join(__dirname, 'data', 'weapons.json');
  if (fs.existsSync(weaponsPath)) {
    weaponsDB = JSON.parse(fs.readFileSync(weaponsPath, 'utf8'));
    console.log('✓ База оружия загружена');
  }
} catch (e) {
  console.warn('⚠ Ошибка загрузки weapons.json:', e.message);
}

try {
  const abilitiesPath = path.join(__dirname, 'data', 'abilities.json');
  if (fs.existsSync(abilitiesPath)) {
    abilitiesDB = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));
    console.log('✓ База способностей загружена');
  }
} catch (e) {
  console.warn('⚠ Ошибка загрузки abilities.json:', e.message);
}

try {
  const bestiaryPath = path.join(__dirname, 'data', 'bestiary.json');
  if (fs.existsSync(bestiaryPath)) {
    bestiaryDB = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));
    console.log('✓ Бестиарий загружен');
  }
} catch (e) {
  console.warn('⚠ Ошибка загрузки bestiary.json:', e.message);
}

try {
  const attacksPath = path.join(__dirname, 'data', 'monster_attacks.json');
  if (fs.existsSync(attacksPath)) {
    monsterAttacksDB = JSON.parse(fs.readFileSync(attacksPath, 'utf8'));
    console.log('✓ База атак монстров загружена');
  }
} catch (e) {
  console.warn('⚠ Ошибка загрузки monster_attacks.json:', e.message);
}

// ========== УЧЁТНЫЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ ==========
const users = {
  'zidan':   { password: 'thief123', role: 'player', character: 'zidan',   class: 'thief' },
  'steiner': { password: 'rusty',    role: 'player', character: 'steiner', class: 'warrior' },
  'master':  { password: 'master123', role: 'master' }
};

// ========== ИГРОВЫЕ СОСТОЯНИЯ ПЕРСОНАЖЕЙ ==========
const gameStates = {};

// Шаблоны предметов, которых нет в weapons.json (заглушки для брони и расходников)
const itemTemplates = {
  'head_stub':   { id: 'head_stub',   name: 'Кожаная шляпа',     type: 'head',      category: 'equip', icon: '🧢', class: ['thief', 'warrior'] },
  'gloves_stub': { id: 'gloves_stub', name: 'Кожаные перчатки',  type: 'gloves',    category: 'equip', icon: '🧤', class: ['thief', 'warrior'] },
  'armor_stub':  { id: 'armor_stub',  name: 'Кожаный доспех',    type: 'armor',     category: 'equip', icon: '🛡️', class: ['thief', 'warrior'] },
  'acc_stub':    { id: 'acc_stub',    name: 'Амулет',            type: 'accessory', category: 'equip', icon: '💍', class: ['thief', 'warrior'] },
  'c1':          { id: 'c1',          name: 'Зелье',             type: 'consumable', category: 'consumables', icon: '🧪' },
  'c2':          { id: 'c2',          name: 'Эфир',              type: 'consumable', category: 'consumables', icon: '🔮' }
};

// Функция инициализации нового персонажа
function initGameState(characterId, className) {
  return {
    name: characterId,
    class: className,
    level: 1,
    hp: { current: 105, max: 105 },
    mp: { current: 36, max: 36 },
    stats: { str: 21, mag: 18, spirit: 23, speed: 23 },
    equipment: { weapon: null, head: null, gloves: null, armor: null, accessory: null },
    inventory: [
      { id: 'dgr_mythril_dagger', count: 1 },  // мифриловый кинжал
      { id: 'head_stub', count: 1 },
      { id: 'armor_stub', count: 1 },
      { id: 'c1', count: 5 }
    ],
    gil: 1000,
    magicStones: 18,                // доступные очки способностей
    learnedAbilities: [],           // изученные способности (навсегда)
    abilityProgress: {}             // прогресс изучения { abilityId: { current, required } }
  };
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПРЕДМЕТОВ ==========
function getItemTemplate(id) {
  if (itemTemplates[id]) return itemTemplates[id];
  for (let category in weaponsDB) {
    const arr = weaponsDB[category];
    if (Array.isArray(arr)) {
      const found = arr.find(w => w.id === id);
      if (found) return found;
    }
  }
  return null;
}

function canEquipItem(item, className, slot) {
  if (!item) return false;
  if (item.type !== slot) return false;
  if (item.class && !item.class.includes(className)) return false;
  return true;
}

function removeItemFromInventory(state, itemId, count = 1) {
  const idx = state.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return false;
  const stack = state.inventory[idx];
  if (stack.count <= count) {
    state.inventory.splice(idx, 1);
  } else {
    stack.count -= count;
  }
  return true;
}

function addItemToInventory(state, itemId, count = 1) {
  const existing = state.inventory.find(i => i.id === itemId);
  if (existing) {
    existing.count += count;
  } else {
    state.inventory.push({ id: itemId, count });
  }
}

function handleEquip(state, slot, itemId, className) {
  const inventoryStack = state.inventory.find(i => i.id === itemId);
  if (!inventoryStack) return { success: false, message: 'Предмет не найден в инвентаре' };

  const itemTemplate = getItemTemplate(itemId);
  if (!itemTemplate) return { success: false, message: 'Неизвестный предмет' };

  if (!canEquipItem(itemTemplate, className, slot)) {
    return { success: false, message: 'Этот предмет нельзя экипировать в выбранный слот' };
  }

  // Снимаем старый предмет, если есть
  const oldItemId = state.equipment[slot];
  if (oldItemId) {
    addItemToInventory(state, oldItemId, 1);
  }

  // Убираем новый из инвентаря
  removeItemFromInventory(state, itemId, 1);

  // Надеваем
  state.equipment[slot] = itemId;

  // В будущем здесь будет пересчёт характеристик от бонусов предмета
  return { success: true };
}

// ========== УПРАВЛЕНИЕ КЛИЕНТАМИ ==========
const clients = new Map(); // логин -> { ws, role, character }

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

// ========== HTTP МАРШРУТЫ ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Раздача статики (CSS, JS, изображения, data) – без автоматического index.html
app.use(express.static(__dirname, { index: false }));

// ========== WEBSOCKET ОБРАБОТКА ==========
wss.on('connection', (ws) => {
  let authenticated = false;
  let currentLogin = null;
  let currentCharacter = null;
  let userRole = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // ----- АВТОРИЗАЦИЯ -----
      if (msg.type === 'login') {
        const { login, password } = msg;
        const user = users[login];
        if (user && user.password === password) {
          authenticated = true;
          currentLogin = login;
          currentCharacter = user.character || login;
          userRole = user.role;
          clients.set(login, { ws, role: user.role, character: currentCharacter });

          // Инициализируем состояние для игрока, если ещё нет
          if (user.role === 'player' && !gameStates[currentCharacter]) {
            gameStates[currentCharacter] = initGameState(currentCharacter, user.class);
          }

          // Отправляем клиенту подтверждение и начальные данные
          ws.send(JSON.stringify({
            type: 'login_success',
            role: user.role,
            character: currentCharacter,
            login: login,
            gameState: user.role === 'player' ? gameStates[currentCharacter] : null,
            players: user.role === 'master' ? getPlayersList() : null
          }));

          broadcastToMasters({
            type: 'player_connected',
            login: login,
            character: currentCharacter,
            role: user.role
          });

          console.log(`✅ Клиент ${login} (${user.role}) подключился`);
        } else {
          ws.send(JSON.stringify({ type: 'login_error', message: 'Неверный логин или пароль' }));
        }
        return;
      }

      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Не авторизован' }));
        return;
      }

      // ----- ДЕЙСТВИЯ ИГРОКА -----
      if (userRole === 'player') {
        const state = gameStates[currentCharacter];
        if (!state) return;

        switch (msg.type) {
          case 'equip_item': {
            const { slot, itemId } = msg;
            const result = handleEquip(state, slot, itemId, state.class);
            if (result.success) {
              ws.send(JSON.stringify({ type: 'state_update', gameState: state }));
              broadcastToMasters({
                type: 'player_state_changed',
                character: currentCharacter,
                gameState: state
              });
            } else {
              ws.send(JSON.stringify({ type: 'equip_error', message: result.message }));
            }
            break;
          }

          // Здесь будут обрабатываться другие команды: use_item, learn_ability, toggle_ability и т.д.

          default:
            console.log(`⚠ Неизвестный тип сообщения от игрока: ${msg.type}`);
        }
      }

      // ----- ДЕЙСТВИЯ МАСТЕРА -----
      if (userRole === 'master') {
        // В будущем: запуск боя, изменение параметров игроков и т.д.
        console.log(`👑 Мастер ${currentLogin} отправил:`, msg.type);
      }

    } catch (e) {
      console.error('❌ Ошибка обработки сообщения:', e);
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
      console.log(`🔌 Клиент ${currentLogin} отключился`);
    }
  });
});

// ========== ЗАПУСК СЕРВЕРА ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`   Откройте http://localhost:${PORT}`);
});
