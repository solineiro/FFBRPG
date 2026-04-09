// client.js

let ws = null;
let currentUser = null;
let userRole = null;
let characterName = null;

const loginForm = document.getElementById('loginForm');
const errorDiv = document.getElementById('errorMessage');

// Подключение к WebSocket серверу
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
    // Показываем сообщение и возвращаем на страницу входа через 3 секунды
    setTimeout(() => {
      if (!currentUser) {
        window.location.reload();
      }
    }, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket ошибка:', error);
    showError('Ошибка соединения с сервером');
  };
}

// Обработка сообщений от сервера
function handleServerMessage(msg) {
  switch (msg.type) {
    case 'login_success':
      currentUser = msg.login;
      userRole = msg.role;
      characterName = msg.character;
      // Переход к основному интерфейсу
      showMainInterface();
      break;
    case 'login_error':
      showError(msg.message);
      break;
    default:
      console.log('Неизвестное сообщение от сервера:', msg);
  }
}

// Показать ошибку на форме
function showError(text) {
  errorDiv.textContent = text;
}

// Отправить запрос на авторизацию
function sendLogin(login, password) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'login',
      login: login,
      password: password
    }));
  } else {
    showError('Нет соединения с сервером');
  }
}

// Показать основной интерфейс (заглушка, потом заменим на реальный UI)
function showMainInterface() {
  // Скрываем форму входа, показываем контейнер приложения
  document.body.innerHTML = `
    <div class="app">
      <nav class="top-nav">
        <button class="nav-btn active" data-page="character">Персонаж</button>
        <button class="nav-btn" data-page="inventory">Инвентарь</button>
        <button class="nav-btn" data-page="abilities">Способности</button>
        <button class="nav-btn" data-page="bestiary">Бестиарий</button>
        <button class="nav-btn" data-page="notes">Заметки</button>
        ${userRole === 'master' ? '<button class="nav-btn master-btn" data-page="master">Мастер</button>' : ''}
      </nav>
      <div class="main-content">
        <h2>Добро пожаловать, ${currentUser} (${userRole === 'master' ? 'Мастер' : 'Игрок'})</h2>
        <p>Интерфейс в разработке...</p>
      </div>
    </div>
  `;
  // Здесь будет инициализация страниц персонажа, инвентаря и т.д.
  // Пока просто заглушка.
}

// Инициализация после загрузки страницы
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
      sendLogin(login, password);
    });
  }
});