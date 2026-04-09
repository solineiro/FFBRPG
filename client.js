// client.js – Final Fantasy IX RPG Client
// Полная интеграция с сервером: авторизация, синхронизация состояния, интерфейс персонажа и инвентаря.

let ws = null;
let currentUser = null;
let userRole = null;
let characterName = null;
let gameState = null;          // состояние персонажа (для игрока)
let playersList = [];          // для мастера

// DOM элементы (будут созданы после входа)
let appContainer = null;

// ========== WEBSOCKET И АВТОРИЗАЦИЯ ==========
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket соединение установлено');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleServerMessage(msg);
  };

  ws.onclose = () => {
    console.log('Соединение закрыто');
    if (currentUser) {
      // Показываем сообщение о потере связи
      alert('Соединение с сервером потеряно. Перезагрузите страницу.');
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket ошибка:', error);
    showError('Ошибка соединения с сервером');
  };
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'login_success':
      currentUser = msg.login;
      userRole = msg.role;
      characterName = msg.character;
      gameState = msg.gameState;
      playersList = msg.players || [];

      // ========== РЕГИСТРАЦИЯ НОВОГО ИГРОКА ==========
function showRegistrationPanel(login, password) {
  // Скрываем форму входа, показываем панель создания персонажа
  const loginBox = document.querySelector('.login-box');
  loginBox.innerHTML = `
    <h1>Создание персонажа</h1>
    <div class="class-selection">
      <p>Выберите класс:</p>
      <div class="class-grid" id="classGrid">
        <!-- Карточки будут добавлены через JS -->
      </div>
      <div class="reg-actions">
        <button class="login-btn" id="confirmRegBtn">Создать персонажа</button>
        <button class="login-btn secondary" id="cancelRegBtn">Назад</button>
      </div>
      <div id="regError" class="error-message"></div>
    </div>
  `;

  const classGrid = document.getElementById('classGrid');
  const classes = [
    { id: 'thief', name: 'Вор', icon: '🗡️', available: true },
    { id: 'warrior', name: 'Воин', icon: '⚔️', available: false },
    { id: 'dragoon', name: 'Драгун', icon: '🔱', available: false },
    { id: 'summoner', name: 'Призыватель', icon: '🔮', available: false },
    { id: 'bluemage', name: 'Синий маг', icon: '🍴', available: false },
    { id: 'whitemage', name: 'Белый маг', icon: '🎵', available: false },
    { id: 'blackmage', name: 'Чёрный маг', icon: '🔥', available: false },
    { id: 'ninja', name: 'Ниндзя', icon: '🐾', available: false }
  ];

  let selectedClass = 'thief';

  classes.forEach(cls => {
    const card = document.createElement('div');
    card.className = `class-card ${cls.available ? '' : 'disabled'} ${cls.id === selectedClass ? 'selected' : ''}`;
    card.dataset.class = cls.id;
    card.innerHTML = `
      <span class="class-icon-large">${cls.icon}</span>
      <span class="class-name">${cls.name}</span>
      ${!cls.available ? '<span class="coming-soon">Скоро</span>' : ''}
    `;
    if (cls.available) {
      card.addEventListener('click', () => {
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedClass = cls.id;
      });
    }
    classGrid.appendChild(card);
  });

  document.getElementById('confirmRegBtn').addEventListener('click', () => {
    sendMessage({
      type: 'register',
      login: login,
      password: password,
      class: selectedClass,
      name: login // можно потом дать возможность указать имя отдельно
    });
  });

  document.getElementById('cancelRegBtn').addEventListener('click', () => {
    location.reload(); // возвращаемся к форме входа
  });
}
      // Скрываем форму входа, показываем основной интерфейс
      showMainInterface();
      break;

    case 'login_error':
      showError(msg.message);
      break;

    case 'state_update':
      // Обновление состояния от сервера (например, после экипировки)
      gameState = msg.gameState;
      if (userRole === 'player') {
        updateCharacterSheetUI();
        renderInventory();
      }
      break;

    case 'equip_error':
      alert('Ошибка экипировки: ' + msg.message);
      break;

    case 'player_connected':
    case 'player_disconnected':
    case 'player_state_changed':
      // Для мастера: обновить список игроков
      if (userRole === 'master') {
        // Запросить актуальный список или обновить локально
        requestPlayersList();
      }
      break;

    default:
      console.log('Неизвестное сообщение от сервера:', msg);
  }
}

function sendMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else {
    console.error('WebSocket не готов');
  }
}

function requestPlayersList() {
  // Пока не реализовано на сервере отдельным запросом, но можно добавить
}

// ========== ИНТЕРФЕЙС ВХОДА ==========
const loginForm = document.getElementById('loginForm');
const errorDiv = document.getElementById('errorMessage');

function showError(text) {
  if (errorDiv) errorDiv.textContent = text;
}

// ========== ПОСТРОЕНИЕ ОСНОВНОГО ИНТЕРФЕЙСА ==========
function showMainInterface() {
  // Очищаем body и создаём структуру приложения
  document.body.innerHTML = '';
  appContainer = document.createElement('div');
  appContainer.className = 'app';
  document.body.appendChild(appContainer);

  // Навигация
  const nav = document.createElement('nav');
  nav.className = 'top-nav';
  nav.innerHTML = `
    <button class="nav-btn active" data-page="character">Персонаж</button>
    <button class="nav-btn" data-page="inventory">Инвентарь</button>
    <button class="nav-btn" data-page="abilities">Способности</button>
    <button class="nav-btn" data-page="bestiary">Бестиарий</button>
    <button class="nav-btn" data-page="notes">Заметки</button>
    ${userRole === 'master' ? '<button class="nav-btn master-btn" data-page="master">Мастер</button>' : ''}
  `;
  appContainer.appendChild(nav);

  // Контейнеры страниц
  const pages = ['character', 'inventory', 'abilities', 'bestiary', 'notes'];
  if (userRole === 'master') pages.push('master');

  pages.forEach(pageId => {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page' + (pageId === 'character' ? ' active' : '');
    pageDiv.id = `page-${pageId}`;
    appContainer.appendChild(pageDiv);
  });

  // Наполняем страницы содержимым
  buildCharacterPage();
  buildInventoryPage();
  buildAbilitiesPage();   // заглушка
  buildBestiaryPage();    // заглушка
  buildNotesPage();       // заглушка
  if (userRole === 'master') buildMasterPage(); // заглушка

  // Навигация по страницам
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pageId = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${pageId}`).classList.add('active');
    });
  });

  // Инициализация обработчиков событий для персонажа и инвентаря
  initCharacterEvents();
  initInventoryEvents();

  // Первичное обновление UI данными из gameState
  if (userRole === 'player' && gameState) {
    updateCharacterSheetUI();
    renderInventory();
  }
}

// ========== СТРАНИЦА ПЕРСОНАЖА ==========
function buildCharacterPage() {
  const page = document.getElementById('page-character');
  page.innerHTML = `
    <div class="character-sheet">
      <div class="top-section">
        <div class="avatar-container" id="avatarContainer">
          <img id="avatarImg" src="assets/default_avatar.png" alt="Аватар">
          <input type="file" id="avatarUpload" accept="image/*" capture style="display: none;">
        </div>
        <div class="info-panel">
          <div class="name-class-level">
            <input type="text" class="char-name" id="charNameInput" value="${gameState?.name || ''}" placeholder="Имя" maxlength="20" ${userRole === 'master' ? '' : 'readonly'}>
            <div class="class-icon" title="${gameState?.class || ''}">
              <img src="assets/icons/class_${gameState?.class || 'thief'}.png" alt="${gameState?.class || ''}">
            </div>
            <div class="level-box">
              <span class="level-label">Lv</span>
              <span class="level-value" id="levelValue">${gameState?.level || 1}</span>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">HP</span><span class="stat-value" id="hpValue">${gameState?.hp.current || 0} / ${gameState?.hp.max || 0}</span></div>
            <div class="stat-item"><span class="stat-label">MP</span><span class="stat-value" id="mpValue">${gameState?.mp.current || 0} / ${gameState?.mp.max || 0}</span></div>
            <div class="stat-item"><span class="stat-label">Сил</span><span class="stat-value" id="strValue">${gameState?.stats.str || 0}</span></div>
            <div class="stat-item"><span class="stat-label">Маг</span><span class="stat-value" id="magValue">${gameState?.stats.mag || 0}</span></div>
          </div>
        </div>
      </div>
      <div class="equipment-section">
        <div class="equip-slot" data-slot="weapon"><span class="slot-icon">⚔️</span><span class="slot-name">Оружие</span><span class="slot-item" id="weaponSlot">—</span></div>
        <div class="equip-slot" data-slot="head"><span class="slot-icon">🧢</span><span class="slot-name">Головной убор</span><span class="slot-item" id="headSlot">—</span></div>
        <div class="equip-slot" data-slot="gloves"><span class="slot-icon">🧤</span><span class="slot-name">Перчатки</span><span class="slot-item" id="glovesSlot">—</span></div>
        <div class="equip-slot" data-slot="armor"><span class="slot-icon">🛡️</span><span class="slot-name">Броня</span><span class="slot-item" id="armorSlot">—</span></div>
        <div class="equip-slot" data-slot="accessory"><span class="slot-icon">💍</span><span class="slot-name">Аксессуар</span><span class="slot-item" id="accessorySlot">—</span></div>
      </div>
      <div class="gil-counter" id="gilCounter">
        <img src="assets/icons/gil.png" alt="Gil" class="gil-icon">
        <span class="gil-value" id="gilValue">${gameState?.gil || 0}</span>
      </div>
    </div>
  `;

  // Модальное окно для монет
  const modalHTML = `
    <div class="modal-overlay" id="gilModal" style="display: none;">
      <div class="modal-content">
        <h3>Монеты</h3>
        <div class="modal-buttons">
          <button class="modal-btn" id="transferGilBtn">Передать</button>
          <button class="modal-btn" id="absorbGilBtn">Поглотить</button>
        </div>
        <button class="modal-close" id="closeGilModal">Закрыть</button>
      </div>
    </div>
  `;
  page.insertAdjacentHTML('beforeend', modalHTML);
}

function updateCharacterSheetUI() {
  if (!gameState) return;
  document.getElementById('levelValue').textContent = gameState.level;
  document.getElementById('hpValue').textContent = `${gameState.hp.current} / ${gameState.hp.max}`;
  document.getElementById('mpValue').textContent = `${gameState.mp.current} / ${gameState.mp.max}`;
  document.getElementById('strValue').textContent = gameState.stats.str;
  document.getElementById('magValue').textContent = gameState.stats.mag;
  document.getElementById('gilValue').textContent = gameState.gil.toLocaleString();

  // Обновление слотов экипировки
  const slots = ['weapon', 'head', 'gloves', 'armor', 'accessory'];
  slots.forEach(slot => {
    const itemId = gameState.equipment[slot];
    const slotEl = document.getElementById(`${slot}Slot`);
    if (itemId) {
      const item = findItemTemplate(itemId);
      slotEl.textContent = item ? item.name : itemId;
    } else {
      slotEl.textContent = '—';
    }
  });
}

// Вспомогательная функция поиска предмета (сначала в itemTemplates клиента)
function findItemTemplate(id) {
  // Локальный кеш шаблонов будет загружаться при старте, пока заглушка
  // В реальном коде нужно загрузить weapons.json и itemTemplates с сервера
  // Пока используем простой объект-заглушку
  const stubTemplates = {
    'dgr_mythril_dagger': { name: 'Мифриловый кинжал' },
    'head_stub': { name: 'Кожаная шляпа' },
    'armor_stub': { name: 'Кожаный доспех' },
    'c1': { name: 'Зелье' }
  };
  return stubTemplates[id] || null;
}

// ========== СТРАНИЦА ИНВЕНТАРЯ ==========
let currentTab = 'equip';
let currentFilter = null;

function buildInventoryPage() {
  const page = document.getElementById('page-inventory');
  page.innerHTML = `
    <div class="inventory-container">
      <div class="inventory-tabs">
        <button class="inv-tab active" data-tab="equip">Эквип</button>
        <button class="inv-tab" data-tab="consumables">Расходники</button>
        <button class="inv-tab" data-tab="misc">Разное</button>
      </div>
      <div class="filter-bar" id="equipFilters" style="display: flex;">
        <button class="filter-btn" data-type="weapon" title="Оружие">🗡️</button>
        <button class="filter-btn" data-type="head" title="Шляпа">🧢</button>
        <button class="filter-btn" data-type="armor" title="Доспех">🛡️</button>
        <button class="filter-btn" data-type="gloves" title="Перчатка">🧤</button>
        <button class="filter-btn" data-type="accessory" title="Аксессуар">💍</button>
      </div>
      <div class="items-list" id="itemsList"></div>
    </div>
    <!-- Модальное окно выбора предмета для экипировки -->
    <div class="modal-overlay" id="equipModal" style="display: none;">
      <div class="modal-content equip-modal">
        <h3 id="equipModalTitle">Выберите предмет</h3>
        <div class="modal-items-list" id="modalItemsList"></div>
        <button class="modal-close" id="closeEquipModal">Отмена</button>
      </div>
    </div>
  `;
}

function renderInventory() {
  if (!gameState) return;
  const itemsList = document.getElementById('itemsList');
  let inventory = gameState.inventory || [];

  // Фильтрация по вкладке и фильтру
  let filtered = inventory.filter(itemStack => {
    const item = findItemTemplate(itemStack.id);
    if (!item) return false;
    if (currentTab === 'equip' && item.category !== 'equip') return false;
    if (currentTab === 'consumables' && item.category !== 'consumables') return false;
    if (currentTab === 'misc' && item.category !== 'misc') return false;
    if (currentTab === 'equip' && currentFilter && item.type !== currentFilter) return false;
    return true;
  });

  // Сортировка
  if (currentTab === 'equip') {
    const typeOrder = ['weapon', 'head', 'armor', 'gloves', 'accessory'];
    filtered.sort((a, b) => {
      const itemA = findItemTemplate(a.id);
      const itemB = findItemTemplate(b.id);
      const typeA = typeOrder.indexOf(itemA?.type);
      const typeB = typeOrder.indexOf(itemB?.type);
      if (typeA !== typeB) return typeA - typeB;
      return (itemA?.name || '').localeCompare(itemB?.name || '');
    });
  } else if (currentTab === 'consumables') {
    filtered.sort((a, b) => {
      const itemA = findItemTemplate(a.id);
      const itemB = findItemTemplate(b.id);
      return (itemA?.name || '').localeCompare(itemB?.name || '');
    });
  }

  if (filtered.length === 0) {
    itemsList.innerHTML = '<div class="empty-message">Нет предметов</div>';
    return;
  }

  itemsList.innerHTML = filtered.map(stack => {
    const item = findItemTemplate(stack.id);
    return `
      <div class="item-row" data-id="${stack.id}" data-category="${item?.category || ''}" data-type="${item?.type || ''}">
        <span class="item-icon">${item?.icon || '📦'}</span>
        <div class="item-info">
          <span class="item-name">${item?.name || stack.id}</span>
          ${item?.type ? `<span class="item-type">${getTypeName(item.type)}</span>` : ''}
        </div>
        <span class="item-count">${stack.count}</span>
      </div>
    `;
  }).join('');
}

function getTypeName(type) {
  const names = {
    weapon: 'Оружие',
    head: 'Головной убор',
    armor: 'Броня',
    gloves: 'Перчатки',
    accessory: 'Аксессуар'
  };
  return names[type] || '';
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
let currentSlot = null;

function initCharacterEvents() {
  // Аватар
  const avatarContainer = document.getElementById('avatarContainer');
  const avatarUpload = document.getElementById('avatarUpload');
  const avatarImg = document.getElementById('avatarImg');
  if (avatarContainer) {
    avatarContainer.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => avatarImg.src = ev.target.result;
        reader.readAsDataURL(file);
        // В будущем: загрузка на сервер
      }
    });
  }

  // Клик по слотам экипировки
  document.querySelectorAll('.equip-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      currentSlot = slot.dataset.slot;
      openEquipModal(currentSlot);
    });
  });

  // Монеты
  const gilCounter = document.getElementById('gilCounter');
  const gilModal = document.getElementById('gilModal');
  if (gilCounter && gilModal) {
    gilCounter.addEventListener('click', () => gilModal.style.display = 'flex');
    document.getElementById('closeGilModal').addEventListener('click', () => gilModal.style.display = 'none');
    window.addEventListener('click', (e) => {
      if (e.target === gilModal) gilModal.style.display = 'none';
    });
    document.getElementById('transferGilBtn').addEventListener('click', () => alert('Передача монет (в разработке)'));
    document.getElementById('absorbGilBtn').addEventListener('click', () => alert('Поглощение монет (в разработке)'));
  }

  // Закрытие модалки экипировки
  const equipModal = document.getElementById('equipModal');
  if (equipModal) {
    document.getElementById('closeEquipModal').addEventListener('click', () => {
      equipModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
      if (e.target === equipModal) equipModal.style.display = 'none';
    });
  }
}

function initInventoryEvents() {
  // Вкладки
  document.querySelectorAll('.inv-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      document.getElementById('equipFilters').style.display = currentTab === 'equip' ? 'flex' : 'none';
      currentFilter = null;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      renderInventory();
    });
  });

  // Фильтры по типу
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if (currentFilter === type) {
        currentFilter = null;
        btn.classList.remove('active');
      } else {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = type;
      }
      renderInventory();
    });
  });
}

function openEquipModal(slot) {
  const modal = document.getElementById('equipModal');
  const title = document.getElementById('equipModalTitle');
  const listDiv = document.getElementById('modalItemsList');

  const slotNames = {
    weapon: 'Оружие',
    head: 'Головной убор',
    gloves: 'Перчатки',
    armor: 'Броня',
    accessory: 'Аксессуар'
  };
  title.textContent = `Выберите ${slotNames[slot].toLowerCase()}`;

  // Находим подходящие предметы в инвентаре
  const available = (gameState.inventory || []).filter(stack => {
    const item = findItemTemplate(stack.id);
    if (!item) return false;
    if (item.category !== 'equip') return false;
    if (item.type !== slot) return false;
    if (item.class && !item.class.includes(gameState.class)) return false;
    return true;
  });

  if (available.length === 0) {
    listDiv.innerHTML = '<div class="empty-message">Нет подходящих предметов</div>';
  } else {
    listDiv.innerHTML = available.map(stack => {
      const item = findItemTemplate(stack.id);
      return `
        <div class="item-row" data-id="${stack.id}">
          <span class="item-icon">${item?.icon || '📦'}</span>
          <div class="item-info">
            <span class="item-name">${item?.name || stack.id}</span>
            <span class="item-type">${getTypeName(item?.type)}</span>
          </div>
          <span class="item-count">${stack.count}</span>
        </div>
      `;
    }).join('');

    listDiv.querySelectorAll('.item-row').forEach(row => {
      row.addEventListener('click', () => {
        const itemId = row.dataset.id;
        // Отправляем команду на сервер
        sendMessage({ type: 'equip_item', slot: currentSlot, itemId });
        modal.style.display = 'none';
      });
    });
  }

  modal.style.display = 'flex';
}

// ========== ЗАГЛУШКИ ДЛЯ ОСТАЛЬНЫХ СТРАНИЦ ==========
function buildAbilitiesPage() {
  document.getElementById('page-abilities').innerHTML = '<div class="placeholder-page">Способности (в разработке)</div>';
}
function buildBestiaryPage() {
  document.getElementById('page-bestialy').innerHTML = '<div class="placeholder-page">Бестиарий (в разработке)</div>';
}
function buildNotesPage() {
  document.getElementById('page-notes').innerHTML = '<div class="placeholder-page">Заметки (в разработке)</div>';
}
function buildMasterPage() {
  document.getElementById('page-master').innerHTML = '<div class="placeholder-page">Панель мастера (в разработке)</div>';
}

// ========== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ==========
document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const login = document.getElementById('login').value.trim();
      const password = document.getElementById('password').value;
      if (!login || !password) {
        showError('Введите логин и пароль');
        return;
      }
      sendMessage({ type: 'login', login, password });
    });
  }
});
