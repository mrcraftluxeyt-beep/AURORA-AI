// ===== СОСТОЯНИЕ =====
const state = {
    apiKey: localStorage.getItem('apf_v1uokmy6yofsgkkjmlvz0vgm') || '',
    model: localStorage.getItem('https://apifreellm.com/api/v1/chat') || 'gemini-1.5-flash',
    temperature: parseFloat(localStorage.getItem('aurora_temp')) || 0.7,
    messages: [],
    isProcessing: false,
};

// ===== DOM-ЭЛЕМЕНТЫ =====
const dom = {
    messages: document.getElementById('messages'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    apiKey: document.getElementById('apiKey'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
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

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    dom.apiKey.value = state.apiKey;
    dom.modelSelect.value = state.model;
    dom.temperature.value = state.temperature;
    dom.tempValue.textContent = state.temperature.toFixed(1);
    dom.modelBadge.textContent = state.model.replace(/-/g, ' ');

    // Загружаем сохранённую историю
    const saved = localStorage.getItem('aurora_messages');
    if (saved) {
        try {
            state.messages = JSON.parse(saved);
            renderMessages();
        } catch (e) { /* игнорируем */ }
    }

    updateStatus(state.apiKey ? 'Готов' : 'Вставьте API-ключ');
    bindEvents();
}

// ===== ОТОБРАЖЕНИЕ СООБЩЕНИЙ =====
function renderMessages() {
    dom.messages.innerHTML = '';
    state.messages.forEach(msg => {
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
    // Базовое форматирование: переносы строк
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function scrollToBottom() {
    dom.messages.scrollTop = dom.messages.scrollHeight;
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====
async function sendMessage() {
    const text = dom.userInput.value.trim();
    if (!text || state.isProcessing) return;

    const key = state.apiKey || dom.apiKey.value.trim();
    if (!key) {
        setStatus('❌ Вставьте API-ключ!', 'error');
        return;
    }

    // Сохраняем ключ, если его не было
    if (!state.apiKey && key) {
        state.apiKey = key;
        localStorage.setItem('aurora_api_key', key);
    }

    // Добавляем сообщение пользователя
    state.messages.push({ role: 'user', content: text });
    renderMessages();
    dom.userInput.value = '';
    dom.sendBtn.disabled = true;
    state.isProcessing = true;
    setStatus('Думаю...', 'loading');

    try {
        const response = await callGemini(key, text);
        state.messages.push({ role: 'assistant', content: response });
        renderMessages();
        saveHistory();
        setStatus('Готов');
    } catch (err) {
        state.messages.push({
            role: 'assistant',
            content: `⚠️ Ошибка: ${err.message || 'Неизвестная ошибка'}`,
        });
        renderMessages();
        setStatus('❌ Ошибка', 'error');
        console.error('Gemini error:', err);
    } finally {
        dom.sendBtn.disabled = false;
        state.isProcessing = false;
        dom.userInput.focus();
    }
}

// ===== ВЫЗОВ GEMINI API =====
async function callGemini(apiKey, text) {
    const model = dom.modelSelect.value;
    const temp = parseFloat(dom.temperature.value);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
            {
                parts: [{ text }],
                role: 'user'
            }
        ],
        generationConfig: {
            temperature: temp,
            maxOutputTokens: 2048,
        }
    };

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!resp.ok) {
        let errMsg = `HTTP ${resp.status}`;
        try {
            const errData = await resp.json();
            errMsg = errData.error?.message || errMsg;
        } catch (_) { /* ignore */ }
        throw new Error(errMsg);
    }

    const data = await resp.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) throw new Error('Пустой ответ от модели');
    return result;
}

// ===== СОХРАНЕНИЕ ИСТОРИИ =====
function saveHistory() {
    try {
        localStorage.setItem('aurora_messages', JSON.stringify(state.messages));
    } catch (_) { /* ignore */ }
}

// ===== УПРАВЛЕНИЕ СТАТУСОМ =====
function setStatus(text, type = '') {
    dom.statusText.textContent = text;
    dom.dot.className = 'dot';
    if (type === 'loading') dom.dot.classList.add('loading');
    else if (type === 'error') dom.dot.style.background = '#f87171';
    else dom.dot.style.background = '#4ade80';
}

function updateStatus(text, type = '') {
    setStatus(text, type);
}

// ===== СОБЫТИЯ =====
function bindEvents() {
    // Отправка
    dom.sendBtn.addEventListener('click', sendMessage);
    dom.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    // Авто-высота textarea
    dom.userInput.addEventListener('input', () => {
        dom.userInput.style.height = 'auto';
        dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 120) + 'px';
    });

    // Сохранение ключа
    dom.saveKeyBtn.addEventListener('click', () => {
        const key = dom.apiKey.value.trim();
        if (key) {
            state.apiKey = key;
            localStorage.setItem('aurora_api_key', key);
            setStatus('✅ Ключ сохранён!');
            dom.apiKey.value = '';
        } else {
            setStatus('❌ Введите ключ', 'error');
        }
    });

    // Смена модели
    dom.modelSelect.addEventListener('change', () => {
        state.model = dom.modelSelect.value;
        localStorage.setItem('aurora_model', state.model);
        dom.modelBadge.textContent = state.model.replace(/-/g, ' ');
    });

    // Температура
    dom.temperature.addEventListener('input', () => {
        const val = parseFloat(dom.temperature.value);
        dom.tempValue.textContent = val.toFixed(1);
        localStorage.setItem('aurora_temp', val);
    });

    // Очистка чата
    dom.clearBtn.addEventListener('click', () => {
        if (confirm('Удалить всю историю?')) {
            state.messages = [];
            localStorage.removeItem('aurora_messages');
            renderMessages();
            setStatus('Чат очищен');
        }
    });

    // Меню на мобилках
    dom.menuToggle.addEventListener('click', () => {
        dom.sidebar.classList.toggle('open');
    });
    // Закрытие по клику вне сайдбара
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

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', init);
