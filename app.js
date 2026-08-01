// ============================================================
//  🌌 AURORA — ПОЛНАЯ ВЕРСИЯ (ИСПРАВЛЕННАЯ)
// ============================================================

// ===== СОСТОЯНИЕ =====
const state = {
    chats: [],
    currentChatId: null,
    settings: {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        apiUrl: 'https://lively-scene-08ef.mrcraftluxe.workers.dev/'
    },
    isProcessing: false
};

// ============================================================
//  DOM
// ============================================================
const dom = {
    chatList: document.getElementById('chatList'),
    messages: document.getElementById('messages'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    deleteChatBtn: document.getElementById('deleteChatBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    modelSelect: document.getElementById('modelSelect'),
    temperature: document.getElementById('temperature'),
    tempValue: document.getElementById('tempValue'),
    apiUrl: document.getElementById('apiUrl'),
    chatTitle: document.getElementById('chatTitle'),
    chatDate: document.getElementById('chatDate'),
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.getElementById('sidebar')
};

// ============================================================
//  ЗАГРУЗКА / СОХРАНЕНИЕ
// ============================================================

function loadChats() {
    try {
        const saved = localStorage.getItem('aurora_chats');
        if (saved) {
            state.chats = JSON.parse(saved);
            return true;
        }
    } catch (e) {
        console.warn('⚠️ Ошибка загрузки чатов:', e);
    }
    return false;
}

function saveChats() {
    try {
        localStorage.setItem('aurora_chats', JSON.stringify(state.chats));
    } catch (e) {
        console.warn('⚠️ Ошибка сохранения чатов:', e);
    }
}

// ============================================================
//  СОЗДАНИЕ ЧАТА
// ============================================================

function createChat(name) {
    const chat = {
        id: Date.now().toString(),
        name: name || 'Новый чат',
        createdAt: new Date().toISOString(),
        messages: [
            {
                role: 'bot',
                content: 'Привет! Я AURORA. Чем могу помочь? ✨'
            }
        ]
    };
    state.chats.unshift(chat);
    saveChats();
    return chat;
}

function getCurrentChat() {
    return state.chats.find(c => c.id === state.currentChatId) || null;
}

// ============================================================
//  ОТОБРАЖЕНИЕ
// ============================================================

function renderChatList() {
    if (state.chats.length === 0) {
        dom.chatList.innerHTML = `
            <div style="text-align:center; color:#4a4f62; padding:40px 0; font-size:14px;">
                Нет чатов<br>
                <span style="font-size:12px;">Нажмите "Новый чат"</span>
            </div>
        `;
        return;
    }
    
    dom.chatList.innerHTML = '';
    state.chats.forEach(chat => {
        const el = document.createElement('div');
        el.className = 'chat-item' + (chat.id === state.currentChatId ? ' active' : '');
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'chat-name';
        nameSpan.textContent = chat.name;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'chat-time';
        timeSpan.textContent = getTimeAgo(chat.createdAt);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'chat-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'display:flex; align-items:center; gap:8px; flex:1; min-width:0;';
        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(timeSpan);
        
        el.appendChild(infoDiv);
        el.appendChild(deleteBtn);
        
        el.addEventListener('click', () => switchChat(chat.id));
        dom.chatList.appendChild(el);
    });
}

function renderMessages() {
    const chat = getCurrentChat();
    if (!chat) {
        dom.messages.innerHTML = `
            <div class="message bot">
                <div class="avatar">🌌</div>
                <div class="bubble">
                    <p>Создайте новый чат, чтобы начать общение ✨</p>
                </div>
            </div>
        `;
        dom.chatTitle.textContent = 'Нет чатов';
        dom.chatDate.textContent = '';
        return;
    }
    
    dom.chatTitle.textContent = chat.name;
    dom.chatDate.textContent = new Date(chat.createdAt).toLocaleDateString('ru-RU');
    
    dom.messages.innerHTML = '';
    chat.messages.forEach(msg => {
        const el = createMessageElement(msg.role, msg.content);
        dom.messages.appendChild(el);
    });
    scrollToBottom();
}

function createMessageElement(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '👤' : '🌌';
    
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = formatContent(content);
    
    div.appendChild(role === 'user' ? bubble : avatar);
    div.appendChild(role === 'user' ? avatar : bubble);
    return div;
}

function formatContent(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes}м`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}ч`;
    return `${Math.floor(hours / 24)}д`;
}

function scrollToBottom() {
    dom.messages.scrollTop = dom.messages.scrollHeight;
}

// ============================================================
//  ПЕРЕКЛЮЧЕНИЕ ЧАТОВ
// ============================================================

function switchChat(chatId) {
    state.currentChatId = chatId;
    renderChatList();
    renderMessages();
    dom.userInput.focus();
}

// ============================================================
//  УДАЛЕНИЕ ЧАТОВ
// ============================================================

function deleteChat(chatId) {
    if (!confirm('Удалить этот чат?')) return;
    state.chats = state.chats.filter(c => c.id !== chatId);
    if (state.currentChatId === chatId) {
        state.currentChatId = state.chats.length > 0 ? state.chats[0].id : null;
    }
    saveChats();
    renderChatList();
    if (state.currentChatId) {
        renderMessages();
    } else {
        dom.messages.innerHTML = `
            <div class="message bot">
                <div class="avatar">🌌</div>
                <div class="bubble">
                    <p>Создайте новый чат, чтобы начать общение ✨</p>
                </div>
            </div>
        `;
        dom.chatTitle.textContent = 'Нет чатов';
        dom.chatDate.textContent = '';
    }
}

function deleteAllChats() {
    if (!confirm('Удалить все чаты?')) return;
    state.chats = [];
    state.currentChatId = null;
    saveChats();
    renderChatList();
    dom.messages.innerHTML = `
        <div class="message bot">
            <div class="avatar">🌌</div>
            <div class="bubble">
                <p>Все чаты удалены. Создайте новый, чтобы начать ✨</p>
            </div>
        </div>
    `;
    dom.chatTitle.textContent = 'Нет чатов';
    dom.chatDate.textContent = '';
}

// ============================================================
//  ОТПРАВКА СООБЩЕНИЯ
// ============================================================

async function sendMessage() {
    const text = dom.userInput.value.trim();
    if (!text || state.isProcessing) return;
    
    let chat = getCurrentChat();
    if (!chat) {
        chat = createChat(text.substring(0, 30) + '...');
        state.currentChatId = chat.id;
        renderChatList();
    }
    
    chat.messages.push({ role: 'user', content: text });
    dom.userInput.value = '';
    dom.sendBtn.disabled = true;
    state.isProcessing = true;
    renderMessages();
    saveChats();
    
    try {
        const response = await callAI(text);
        chat.messages.push({ role: 'bot', content: response });
        renderMessages();
        saveChats();
        
        if (chat.name === 'Новый чат' || chat.name.startsWith('Новый чат')) {
            chat.name = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            renderChatList();
        }
    } catch (err) {
        console.error('❌ Ошибка:', err);
        chat.messages.push({
            role: 'bot',
            content: `⚠️ Ошибка: ${err.message || 'Неизвестная ошибка'}`
        });
        renderMessages();
    } finally {
        dom.sendBtn.disabled = false;
        state.isProcessing = false;
        dom.userInput.focus();
    }
}

// ============================================================
//  🔥 ВЫЗОВ API — ВАШ URL
// ============================================================

async function callAI(message) {
    const apiUrl = "https://lively-scene-08ef.mrcraftluxe.workers.dev/";
    
    // Ваш Worker ожидает { "message": "текст" }
    const payload = {
        message: message
    };
    
    console.log('📤 Отправка в Worker:', JSON.stringify(payload, null, 2));
    console.log('📡 URL:', apiUrl);
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📊 Статус:', response.status);
        
        const responseText = await response.text();
        console.log('📄 Ответ Worker:', responseText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 100)}`);
        }
        
        const data = JSON.parse(responseText);
        console.log('📥 Данные:', data);
        
        // Ваш Worker возвращает { "response": "текст" }
        let result = data.response || data.text || data.result || data.message;
        
        if (!result) {
            return '⚠️ Пустой ответ от модели. Попробуйте ещё раз.';
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        
        if (error.message.includes('Failed to fetch')) {
            return '⚠️ Не удалось подключиться к серверу. Проверьте интернет и URL API.';
        }
        
        return `⚠️ Ошибка: ${error.message}`;
    }
}

// ============================================================
//  НАСТРОЙКИ
// ============================================================

function openSettings() {
    dom.modelSelect.value = state.settings.model;
    dom.temperature.value = state.settings.temperature;
    dom.tempValue.textContent = state.settings.temperature.toFixed(1);
    dom.apiUrl.value = state.settings.apiUrl;
    dom.settingsModal.classList.add('show');
}

function closeSettings() {
    dom.settingsModal.classList.remove('show');
    state.settings.model = dom.modelSelect.value;
    state.settings.temperature = parseFloat(dom.temperature.value);
    state.settings.apiUrl = dom.apiUrl.value.trim() || state.settings.apiUrl;
    localStorage.setItem('aurora_settings', JSON.stringify(state.settings));
}

// ============================================================
//  СОБЫТИЯ
// ============================================================

function bindEvents() {
    dom.newChatBtn.addEventListener('click', () => {
        const chat = createChat('Новый чат');
        state.currentChatId = chat.id;
        renderChatList();
        renderMessages();
        dom.userInput.focus();
    });
    
    dom.sendBtn.addEventListener('click', sendMessage);
    dom.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    dom.userInput.addEventListener('input', () => {
        dom.userInput.style.height = 'auto';
        dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 120) + 'px';
    });
    
    dom.deleteChatBtn.addEventListener('click', () => {
        if (state.currentChatId) {
            deleteChat(state.currentChatId);
        }
    });
    
    dom.clearAllBtn.addEventListener('click', deleteAllChats);
    
    dom.settingsBtn.addEventListener('click', openSettings);
    dom.closeSettingsBtn.addEventListener('click', closeSettings);
    dom.settingsModal.addEventListener('click', (e) => {
        if (e.target === dom.settingsModal) closeSettings();
    });
    
    dom.temperature.addEventListener('input', () => {
        const val = parseFloat(dom.temperature.value);
        dom.tempValue.textContent = val.toFixed(1);
    });
    
    dom.menuToggle.addEventListener('click', () => {
        dom.sidebar.classList.toggle('open');
    });
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const isSidebar = dom.sidebar.contains(e.target);
            const isToggle = dom.menuToggle.contains(e.target);
            if (!isSidebar && !isToggle) {
                dom.sidebar.classList.remove('open');
            }
        }
    });
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

function init() {
    console.log('🚀 AURORA запускается...');
    
    try {
        const savedSettings = localStorage.getItem('aurora_settings');
        if (savedSettings) {
            state.settings = JSON.parse(savedSettings);
            dom.modelSelect.value = state.settings.model;
            dom.temperature.value = state.settings.temperature;
            dom.tempValue.textContent = state.settings.temperature.toFixed(1);
            dom.apiUrl.value = state.settings.apiUrl;
        }
    } catch (e) {}
    
    const hasChats = loadChats();
    
    if (hasChats && state.chats.length > 0) {
        state.currentChatId = state.chats[0].id;
        renderChatList();
        renderMessages();
    } else {
        const chat = createChat('Новый чат');
        state.currentChatId = chat.id;
        renderChatList();
        renderMessages();
    }
    
    bindEvents();
    console.log('✅ AURORA готова!');
    console.log('📡 URL:', state.settings.apiUrl);
}

document.addEventListener('DOMContentLoaded', init);
