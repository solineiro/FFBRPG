// app.js

// Глобальное состояние игры (временное, позже заменим на серверное)
const gameState = {
  character: {
    name: 'Зидан',
    class: 'thief', // класс определяет доступные предметы
    level: 23,
    hp: { current: 234, max: 450 },
    mp: { current: 56, max: 120 },
    stats: { str: 21, mag: 18 },
    equipment: {
      weapon: null,   // ID предмета
      head: null,
      gloves: null,
      armor: null,
      accessory: null
    }
  },
  inventory: [
    // Экипировка
    { id: 'w1', name: 'Мит. кинжал', type: 'weapon', category: 'equip', icon: '🗡️', count: 1, class: ['thief'], attack: 18 },
    { id: 'h1', name: 'Кожаная шляпа', type: 'head', category: 'equip', icon: '🧢', count: 1, class: ['thief', 'warrior'], defense: 5 },
    { id: 'a1', name: 'Кожаный доспех', type: 'armor', category: 'equip', icon: '🛡️', count: 1, class: ['thief', 'warrior'], defense: 10 },
    { id: 'w2', name: 'Железный меч', type: 'weapon', category: 'equip', icon: '🗡️', count: 1, class: ['warrior'], attack: 16 },
    { id: 'h2', name: 'Бронзовый шлем', type: 'head', category: 'equip', icon: '🧢', count: 2, class: ['warrior'], defense: 8 },
    // Расходники
    { id: 'c1', name: 'Зелье', type: 'consumable', category: 'consumables', icon: '🧪', count: 5 },
    { id: 'c2', name: 'Эфир', type: 'consumable', category: 'consumables', icon: '🔮', count: 2 },
    { id: 'c3', name: 'Антидот', type: 'consumable', category: 'consumables', icon: '💊', count: 3 },
    // Разное
    { id: 'm1', name: 'Ключ', type: 'misc', category: 'misc', icon: '🔑', count: 1 },
    { id: 'm2', name: 'Записка', type: 'misc', category: 'misc', icon: '📜', count: 1 },
  ],
  gil: 123456
};

// Сопоставление слотов с типами предметов
const slotTypeMap = {
  weapon: 'weapon',
  head: 'head',
  gloves: 'gloves',
  armor: 'armor',
  accessory: 'accessory'
};

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Получить предмет по ID
function getItemById(id) {
  return gameState.inventory.find(item => item.id === id);
}

// Проверить, может ли персонаж экипировать предмет
function canEquip(item, slot) {
  if (!item) return false;
  if (item.type !== slotTypeMap[slot]) return false;
  if (item.class && !item.class.includes(gameState.character.class)) return false;
  return true;
}

// Экипировать предмет в указанный слот
function equipItem(itemId, slot) {
  const item = getItemById(itemId);
  if (!item) return false;
  if (!canEquip(item, slot)) return false;

  // Если в слоте уже есть предмет, снимаем его (возвращаем в инвентарь)
  const currentEquippedId = gameState.character.equipment[slot];
  if (currentEquippedId) {
    unequipItem(slot);
  }

  // Уменьшаем количество предмета в инвентаре
  if (item.count > 1) {
    item.count--;
  } else {
    // Удаляем предмет из инвентаря
    gameState.inventory = gameState.inventory.filter(i => i.id !== itemId);
  }

  // Устанавливаем предмет в слот
  gameState.character.equipment[slot] = itemId;

  // Обновляем интерфейс
  updateCharacterSheet();
  renderInventory();
  return true;
}

// Снять предмет из слота
function unequipItem(slot) {
  const itemId = gameState.character.equipment[slot];
  if (!itemId) return false;

  // Ищем предмет в инвентаре (возможно, он там уже есть с count > 0)
  const existingItem = gameState.inventory.find(i => i.id === itemId);
  if (existingItem) {
    existingItem.count++;
  } else {
    // Создаём копию предмета (если он был полностью удалён)
    // В реальном приложении нужно хранить шаблоны предметов, пока сделаем так:
    const itemTemplate = {
      weapon: { id: 'w1', name: 'Мит. кинжал', type: 'weapon', category: 'equip', icon: '🗡️', class: ['thief'], attack: 18 },
      // ... нужно дополнить остальными, но для простоты восстановим из knownItems
    };
    // Для демонстрации просто добавим предмет обратно как новый
    // В будущем используем реестр предметов
    if (itemId === 'w1') {
      gameState.inventory.push({ ...itemTemplate.weapon, count: 1 });
    } else if (itemId === 'h1') {
      gameState.inventory.push({ id: 'h1', name: 'Кожаная шляпа', type: 'head', category: 'equip', icon: '🧢', count: 1, class: ['thief', 'warrior'], defense: 5 });
    } else if (itemId === 'a1') {
      gameState.inventory.push({ id: 'a1', name: 'Кожаный доспех', type: 'armor', category: 'equip', icon: '🛡️', count: 1, class: ['thief', 'warrior'], defense: 10 });
    }
  }

  // Очищаем слот
  gameState.character.equipment[slot] = null;

  updateCharacterSheet();
  renderInventory();
  return true;
}

// Обновление отображения листа персонажа
function updateCharacterSheet() {
  const char = gameState.character;
  document.getElementById('hpValue').textContent = `${char.hp.current} / ${char.hp.max}`;
  document.getElementById('mpValue').textContent = `${char.mp.current} / ${char.mp.max}`;
  document.getElementById('strValue').textContent = char.stats.str;
  document.getElementById('magValue').textContent = char.stats.mag;
  document.getElementById('levelValue').textContent = char.level;
  document.getElementById('gilValue').textContent = gameState.gil.toLocaleString();

  // Обновляем слоты экипировки
  const slots = ['weapon', 'head', 'gloves', 'armor', 'accessory'];
  slots.forEach(slot => {
    const itemId = char.equipment[slot];
    const slotElement = document.getElementById(`${slot}Slot`);
    if (itemId) {
      const item = getItemById(itemId) || { name: '???' }; // fallback
      slotElement.textContent = item.name;
    } else {
      slotElement.textContent = '—';
    }
  });
}

// === ИНВЕНТАРЬ ===
let currentTab = 'equip';
let currentFilter = null;

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

function renderInventory() {
  const itemsList = document.getElementById('itemsList');
  let filtered = gameState.inventory.filter(item => {
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
      const typeA = typeOrder.indexOf(a.type);
      const typeB = typeOrder.indexOf(b.type);
      if (typeA !== typeB) return typeA - typeB;
      return a.name.localeCompare(b.name);
    });
  } else if (currentTab === 'consumables') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (filtered.length === 0) {
    itemsList.innerHTML = '<div class="empty-message">Нет предметов</div>';
    return;
  }

  itemsList.innerHTML = filtered.map(item => `
    <div class="item-row" data-id="${item.id}" data-category="${item.category}" data-type="${item.type || ''}">
      <span class="item-icon">${item.icon}</span>
      <div class="item-info">
        <span class="item-name">${item.name}</span>
        ${item.type ? `<span class="item-type">${getTypeName(item.type)}</span>` : ''}
      </div>
      <span class="item-count">${item.count}</span>
    </div>
  `).join('');
}

// === МОДАЛЬНОЕ ОКНО ВЫБОРА ПРЕДМЕТА ===
const equipModal = document.getElementById('equipModal');
const modalTitle = document.getElementById('equipModalTitle');
const modalItemsList = document.getElementById('modalItemsList');
let currentSlot = null;

function openEquipModal(slot) {
  currentSlot = slot;
  const slotName = {
    weapon: 'Оружие',
    head: 'Головной убор',
    gloves: 'Перчатки',
    armor: 'Броня',
    accessory: 'Аксессуар'
  }[slot];
  modalTitle.textContent = `Выберите ${slotName.toLowerCase()}`;

  // Фильтруем предметы, подходящие для слота и класса
  const availableItems = gameState.inventory.filter(item => {
    if (item.category !== 'equip') return false;
    if (item.type !== slotTypeMap[slot]) return false;
    if (item.class && !item.class.includes(gameState.character.class)) return false;
    return true;
  });

  if (availableItems.length === 0) {
    modalItemsList.innerHTML = '<div class="empty-message">Нет подходящих предметов</div>';
  } else {
    modalItemsList.innerHTML = availableItems.map(item => `
      <div class="item-row" data-id="${item.id}">
        <span class="item-icon">${item.icon}</span>
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-type">${getTypeName(item.type)}</span>
        </div>
        <span class="item-count">${item.count}</span>
      </div>
    `).join('');

    // Обработчики клика по предмету в модалке
    modalItemsList.querySelectorAll('.item-row').forEach(row => {
      row.addEventListener('click', () => {
        const itemId = row.dataset.id;
        const success = equipItem(itemId, currentSlot);
        if (success) {
          equipModal.style.display = 'none';
        } else {
          alert('Не удалось экипировать предмет');
        }
      });
    });
  }

  equipModal.style.display = 'flex';
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  // Навигация
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = {
    character: document.getElementById('page-character'),
    inventory: document.getElementById('page-inventory'),
    abilities: document.getElementById('page-abilities'),
    bestiary: document.getElementById('page-bestialy'),
    notes: document.getElementById('page-notes')
  };

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pageId = btn.dataset.page;
      navButtons.forEach(b => b.classList.remove('active'));
      Object.values(pages).forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      if (pages[pageId]) pages[pageId].classList.add('active');
    });
  });

  // Аватар
  const avatarContainer = document.getElementById('avatarContainer');
  const avatarImg = document.getElementById('avatarImg');
  const avatarUpload = document.getElementById('avatarUpload');
  avatarContainer.addEventListener('click', () => avatarUpload.click());
  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { avatarImg.src = event.target.result; };
      reader.readAsDataURL(file);
    }
  });

  // Монеты
  const gilCounter = document.getElementById('gilCounter');
  const gilModal = document.getElementById('gilModal');
  document.getElementById('closeGilModal').addEventListener('click', () => gilModal.style.display = 'none');
  gilCounter.addEventListener('click', () => gilModal.style.display = 'flex');
  window.addEventListener('click', (e) => { if (e.target === gilModal) gilModal.style.display = 'none'; });

  // Экипировка: клик по слоту
  document.querySelectorAll('.equip-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      openEquipModal(slot.dataset.slot);
    });
  });

  // Закрытие модалки экипировки
  document.getElementById('closeEquipModal').addEventListener('click', () => {
    equipModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => { if (e.target === equipModal) equipModal.style.display = 'none'; });

  // Инвентарь: вкладки и фильтры
  const invTabs = document.querySelectorAll('.inv-tab');
  const equipFilters = document.getElementById('equipFilters');
  invTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      invTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      equipFilters.style.display = currentTab === 'equip' ? 'flex' : 'none';
      currentFilter = null;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      renderInventory();
    });
  });

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

  // Заглушки кнопок монет
  document.getElementById('transferGilBtn').addEventListener('click', () => alert('Передача монет (в разработке)'));
  document.getElementById('absorbGilBtn').addEventListener('click', () => alert('Поглощение монет (в разработке)'));

  // Инициализация отображения
  updateCharacterSheet();
  renderInventory();
});