// ============================================================
//  ⚙️  КОНФИГУРАЦИЯ — ЗДЕСЬ ВАШ API !
// ============================================================
const CONFIG = {
    // === ВАШ API-ЭНДПОИНТ (FreeLLM или другой) ===
    apiUrl: 'https://apifreellm.com/api/v1/chat',

    // === ВАШ API-КЛЮЧ (если нужен) ===
    apiKey: 'apf_v1uokmy6yofsgkkjmlvz0vgm',  // <-- ВСТАВЬТЕ СВОЙ КЛЮЧ

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
    console.log('🚀 AURORA запущена! API:', CONFIG.apiUrl);
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
        state.messages.push({
            role: 'assistant',
            content: `⚠️ Ошибка: ${err.message || 'Неизвестная ошибка'}`,
        });
        renderMessages();
        updateStatus('❌ Ошибка', 'error');
        console.error('AI error:', err);
    } finally {
        dom.sendBtn.disabled = false;
        state.isProcessing = false;
        dom.userInput.focus();
    }
}

// ============================================================
//  🔥 ВЫЗОВ ВАШЕГО API (FreeLLM)
// ============================================================
async function callAI(userMessage) {
    const model = dom.modelSelect.value;
    const temp = parseFloat(dom.temperature.value);

    // Формируем историю для контекста
    const history = state.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
    }));

    // Если сообщений слишком много — обрезаем (чтобы не переполнять контекст)
    const maxHistory = 20;
    const trimmedHistory = history.slice(-maxHistory);

    const payload = {
        model: model,
        messages: trimmedHistory,
        temperature: temp,
        max_tokens: CONFIG.maxTokens,
        stream: false,
    };

    const headers = {
        'Content-Type': 'application/json',
    };

    // Если есть ключ — добавляем
    if (CONFIG.apiKey && CONFIG.apiKey !== 'sk-your-secret-key-here') {
        headers['Authorization'] = `Bearer ${CONFIG.apiKey}`;
    }

    const resp = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
    });

    if (!resp.ok) {
        let errMsg = `HTTP ${resp.status}`;
        try {
            const errData = await resp.json();
            errMsg = errData.error?.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
    }

    const data = await resp.json();

    // Поддержка разных форматов ответа
    let result = data.choices?.[0]?.message?.content;
    if (!result) {
        result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    }
    if (!result) {
        result = data.response || data.text || 'Пустой ответ от модели';
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
//  УПРАВЛЕНИЕ СТАТУСОМ
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
//  СТАРТ
// ============================================================
document.addEventListener('DOMContentLoaded', init);
