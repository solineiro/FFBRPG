// app.js

document.addEventListener('DOMContentLoaded', () => {
  // === НАВИГАЦИЯ МЕЖДУ СТРАНИЦАМИ ===
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
      // Убираем активный класс у всех кнопок и страниц
      navButtons.forEach(b => b.classList.remove('active'));
      Object.values(pages).forEach(p => p.classList.remove('active'));
      // Активируем выбранные
      btn.classList.add('active');
      if (pages[pageId]) pages[pageId].classList.add('active');
    });
  });

  // === АВАТАР: ЗАГРУЗКА ИЗОБРАЖЕНИЯ ===
  const avatarContainer = document.getElementById('avatarContainer');
  const avatarImg = document.getElementById('avatarImg');
  const avatarUpload = document.getElementById('avatarUpload');

  avatarContainer.addEventListener('click', () => {
    avatarUpload.click();
  });

  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        avatarImg.src = event.target.result;
        // В будущем здесь будет загрузка на сервер
        console.log('Аватар обновлён (локально)');
      };
      reader.readAsDataURL(file);
    }
  });

  // === МОДАЛЬНОЕ ОКНО МОНЕТ ===
  const gilCounter = document.getElementById('gilCounter');
  const gilModal = document.getElementById('gilModal');
  const closeGilModal = document.getElementById('closeGilModal');

  gilCounter.addEventListener('click', () => {
    gilModal.style.display = 'flex';
  });

  closeGilModal.addEventListener('click', () => {
    gilModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === gilModal) {
      gilModal.style.display = 'none';
    }
  });

  // === ИНВЕНТАРЬ: ВКЛАДКИ И ФИЛЬТРЫ ===
  const invTabs = document.querySelectorAll('.inv-tab');
  const equipFilters = document.getElementById('equipFilters');
  const itemsList = document.getElementById('itemsList');

  let currentTab = 'equip'; // 'equip', 'consumables', 'misc'
  let currentFilter = null; // 'weapon', 'head', etc.

  // Тестовые данные предметов (в будущем заменим на реальные)
  const testItems = [
    // Экипировка
    { id: 1, name: 'Мит. кинжал', type: 'weapon', category: 'equip', icon: '🗡️', count: 1 },
    { id: 2, name: 'Кожаная шляпа', type: 'head', category: 'equip', icon: '🧢', count: 1 },
    { id: 3, name: 'Кожаный доспех', type: 'armor', category: 'equip', icon: '🛡️', count: 1 },
    { id: 4, name: 'Железный меч', type: 'weapon', category: 'equip', icon: '🗡️', count: 1 },
    { id: 5, name: 'Бронзовый шлем', type: 'head', category: 'equip', icon: '🧢', count: 2 },
    // Расходники
    { id: 10, name: 'Зелье', type: 'consumable', category: 'consumables', icon: '🧪', count: 5 },
    { id: 11, name: 'Эфир', type: 'consumable', category: 'consumables', icon: '🔮', count: 2 },
    { id: 12, name: 'Антидот', type: 'consumable', category: 'consumables', icon: '💊', count: 3 },
    // Разное
    { id: 20, name: 'Ключ', type: 'misc', category: 'misc', icon: '🔑', count: 1 },
    { id: 21, name: 'Записка', type: 'misc', category: 'misc', icon: '📜', count: 1 },
  ];

  function renderItems() {
    let filtered = testItems.filter(item => {
      if (currentTab === 'equip' && item.category !== 'equip') return false;
      if (currentTab === 'consumables' && item.category !== 'consumables') return false;
      if (currentTab === 'misc' && item.category !== 'misc') return false;
      if (currentTab === 'equip' && currentFilter && item.type !== currentFilter) return false;
      return true;
    });

    // Сортировка: для экипировки по типу и возрастанию цены (пока без цены, просто по типу)
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

    // Добавляем обработчики кликов по предметам (позже: двойной тап / долгий тап)
    document.querySelectorAll('.item-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Обычный клик — пока ничего
        console.log('Выбран предмет:', row.dataset.id);
      });
      // Двойной тап / долгий тап будем обрабатывать позже
    });
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

  // Переключение вкладок
  invTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      invTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      // Показываем/скрываем фильтры
      equipFilters.style.display = currentTab === 'equip' ? 'flex' : 'none';
      currentFilter = null;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      renderItems();
    });
  });

  // Фильтры по типу экипировки
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
      renderItems();
    });
  });

  // Инициализация инвентаря
  renderItems();

  // === ЗАГЛУШКИ ДЛЯ БУДУЩИХ ФУНКЦИЙ ===
  // Экипировка (клик по слоту) - пока без логики
  document.querySelectorAll('.equip-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      console.log('Клик по слоту экипировки:', slot.dataset.slot);
      // В будущем: открыть модальное окно выбора предмета из инвентаря
    });
  });

  // Кнопки "Передать" и "Поглотить" (пока заглушки)
  document.getElementById('transferGilBtn')?.addEventListener('click', () => {
    alert('Передача монет (в разработке)');
  });
  document.getElementById('absorbGilBtn')?.addEventListener('click', () => {
    alert('Поглощение монет (в разработке)');
  });
});