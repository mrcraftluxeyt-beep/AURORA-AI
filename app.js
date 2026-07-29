// ============================================================
//  ⚙️  КОНФИГУРАЦИЯ — ВАШ API
// ============================================================
const CONFIG = {
    // === ВАШ API-ЭНДПОИНТ ===
    apiUrl: 'https://cors-anywhere.herokuapp.com/https://apifreellm.com/api/v1/chat',
    
    // === ВАШ API-КЛЮЧ ===
    apiKey: 'apf_v1uokmy6yofsgkkjmlvz0vgm',
    
    // === МОДЕЛЬ ПО УМОЛЧАНИЮ ===
    defaultModel: 'gemini-1.5-flash',
    
    // === ПАРАМЕТРЫ ===
    temperature: 0.7,
    maxTokens: 2048,
};

// ============================================================
//  СОСТОЯНИЕ
// ============================================================
const state = {
    model: localStorage.getItem('aurora_model') || CONFIG.defaultModel,
    temperature: parseFloat(localStorage.getItem('aurora_temp')) || CONFIG.temperature,
    messages: [],
    isProcessing: false,
};

// ============================================================
//  DOM-ЭЛЕМЕНТЫ
// ============================================================
const dom = {
    messages: document.getElementById('messages'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    modelSelect: document.getElementById('modelSelect'),
    temperature: document.getElementById('temperature'),
    tempValue: document.getElementById('tempValue'),
    modelBadge: document.getElementById('modelBadge'),
    statusText: document.getElementById('statusText'),
    dot: document.querySelector('.dot'),
    clearBtn: document.getElementById('clearChatBtn'),
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menuToggle'),
};

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================
function init() {
    dom.modelSelect.value = state.model;
    dom.temperature.value = state.temperature;
    dom.tempValue.textContent = state.temperature.toFixed(1);
    dom.modelBadge.textContent = state.model;

    const saved = localStorage.getItem('aurora_messages');
    if (saved) {
        try {
            state.messages = JSON.parse(saved);
            renderMessages();
        } catch (_) {}
    }

    updateStatus('Готов');
    bindEvents();
    console.log('🚀 AURORA запущена!');
    console.log('📡 API:', CONFIG.apiUrl);
    console.log('🔑 Ключ:', CONFIG.apiKey ? '✅ Установлен' : '❌ Отсутствует');
}

// ============================================================
//  ОТОБРАЖЕНИЕ СООБЩЕНИЙ
// ============================================================
function renderMessages() {
    dom.messages.innerHTML = '';
    state.messages.forEach(msg => {
        dom.messages.appendChild(createMessageElement(msg.role, msg.content));
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
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function scrollToBottom() {
    dom.messages.scrollTop = dom.messages.scrollHeight;
}

// ============================================================
//  ОТПРАВКА СООБЩЕНИЯ
// ============================================================
async function sendMessage() {
    const text = dom.userInput.value.trim();
    if (!text || state.isProcessing) return;

    state.messages.push({ role: 'user', content: text });
    renderMessages();
    dom.userInput.value = '';
    dom.sendBtn.disabled = true;
    state.isProcessing = true;
    updateStatus('Думаю...', 'loading');

    try {
        const response = await callAI(text);
        state.messages.push({ role: 'assistant', content: response });
        renderMessages();
        saveHistory();
        updateStatus('Готов');
    } catch (err) {
        console.error('❌ Ошибка:', err);
        state.messages.push({
            role: 'assistant',
            content: `⚠️ Ошибка: ${err.message || 'Неизвестная ошибка'}`,
        });
        renderMessages();
        updateStatus('❌ Ошибка', 'error');
    } finally {
        dom.sendBtn.disabled = false;
        state.isProcessing = false;
        dom.userInput.focus();
    }
}

// ============================================================
//  🔥 ВЫЗОВ ВАШЕГО API
// ============================================================
async function callAI(userMessage) {
    const model = dom.modelSelect.value;
    const temp = parseFloat(dom.temperature.value);

    // Формируем историю (последние 20 сообщений для контекста)
    const history = state.messages.slice(-20).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
    }));

    // Пробуем разные форматы payload (если один не работает)
    const payload = {
        model: model,
        messages: history,
        temperature: temp,
        max_tokens: CONFIG.maxTokens,
        stream: false,
    };

    console.log('📤 Отправка запроса на:', CONFIG.apiUrl);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    console.log('📊 Статус ответа:', response.status);

    // Пробуем прочитать ответ (даже если ошибка)
    const responseText = await response.text();
    console.log('📄 Ответ сервера:', responseText);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        throw new Error('Невалидный JSON от сервера: ' + responseText.substring(0, 100));
    }

    console.log('📥 Распарсенный ответ:', data);

    // Парсим ответ (пробуем разные форматы)
    let result = data.choices?.[0]?.message?.content;
    if (!result) {
        result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    }
    if (!result) {
        result = data.response || data.text || data.result || data.message;
    }
    if (!result) {
        result = '⚠️ Пустой ответ от модели. Проверьте формат API.';
    }

    return result;
}

// ============================================================
//  СОХРАНЕНИЕ ИСТОРИИ
// ============================================================
function saveHistory() {
    try {
        localStorage.setItem('aurora_messages', JSON.stringify(state.messages));
    } catch (_) {}
}

// ============================================================
//  СТАТУС
// ============================================================
function updateStatus(text, type = '') {
    dom.statusText.textContent = text;
    dom.dot.className = 'dot';
    if (type === 'loading') {
        dom.dot.classList.add('loading');
    } else if (type === 'error') {
        dom.dot.style.background = '#f87171';
    } else {
        dom.dot.style.background = '#4ade80';
    }
}

// ============================================================
//  СОБЫТИЯ
// ============================================================
function bindEvents() {
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

    dom.modelSelect.addEventListener('change', () => {
        state.model = dom.modelSelect.value;
        localStorage.setItem('aurora_model', state.model);
        dom.modelBadge.textContent = state.model;
    });

    dom.temperature.addEventListener('input', () => {
        const val = parseFloat(dom.temperature.value);
        dom.tempValue.textContent = val.toFixed(1);
        localStorage.setItem('aurora_temp', val);
    });

    dom.clearBtn.addEventListener('click', () => {
        if (confirm('Удалить всю историю?')) {
            state.messages = [];
            localStorage.removeItem('aurora_messages');
            renderMessages();
            updateStatus('Чат очищен');
        }
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
//  ЗАПУСК
// ============================================================
document.addEventListener('DOMContentLoaded', init);
