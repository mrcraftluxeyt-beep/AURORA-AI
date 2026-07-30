// ============================================================
//  AURORA — УПРОЩЁННАЯ ВЕРСИЯ (ГАРАНТИРОВАННО РАБОТАЕТ)
// ============================================================

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    apiUrl: 'https://lively-scene-08ef.mrcraftluxe.workers.dev/',
    defaultModel: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2048,
};

// ===== СОСТОЯНИЕ =====
const state = {
    model: localStorage.getItem('aurora_model') || CONFIG.defaultModel,
    temperature: parseFloat(localStorage.getItem('aurora_temp')) || CONFIG.temperature,
    messages: [],
    isProcessing: false,
};

// ============================================================
//  DOM ЭЛЕМЕНТЫ (проверяем существование)
// ============================================================
function getDomElements() {
    const elements = {
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
    
    // Проверяем, все ли элементы найдены
    for (const [key, el] of Object.entries(elements)) {
        if (!el) {
            console.warn(`⚠️ Элемент ${key} не найден на странице`);
        }
    }
    
    return elements;
}

let dom = {};

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================
function init() {
    console.log('🚀 AURORA запускается...');
    
    // Получаем DOM элементы
    dom = getDomElements();
    
    // Проверяем, что основные элементы есть
    if (!dom.messages || !dom.userInput || !dom.sendBtn) {
        console.error('❌ Критические элементы не найдены!');
        return;
    }
    
    // Загружаем настройки
    if (dom.modelSelect) dom.modelSelect.value = state.model;
    if (dom.temperature) {
        dom.temperature.value = state.temperature;
        dom.tempValue.textContent = state.temperature.toFixed(1);
    }
    if (dom.modelBadge) dom.modelBadge.textContent = state.model;

    // Загружаем историю
    const saved = localStorage.getItem('aurora_messages');
    if (saved) {
        try {
            state.messages = JSON.parse(saved);
            renderMessages();
        } catch (e) {
            console.warn('⚠️ Не удалось загрузить историю:', e);
        }
    }

    updateStatus('Готов');
    bindEvents();
    console.log('✅ AURORA готова к работе!');
}

// ============================================================
//  ОТОБРАЖЕНИЕ СООБЩЕНИЙ
// ============================================================
function renderMessages() {
    if (!dom.messages) return;
    
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
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function scrollToBottom() {
    if (!dom.messages) return;
    dom.messages.scrollTop = dom.messages.scrollHeight;
}

// ============================================================
//  ОТПРАВКА СООБЩЕНИЯ
// ============================================================
async function sendMessage() {
    if (!dom.userInput) return;
    
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
        updateStatus('❌ ' + err.message, 'error');
    } finally {
        dom.sendBtn.disabled = false;
        state.isProcessing = false;
        dom.userInput.focus();
    }
}

// ============================================================
//  🔥 ВЫЗОВ API
// ============================================================
async function callAI(userMessage) {
    const payload = { message: userMessage };

    console.log('📤 Отправка:', JSON.stringify(payload));

    try {
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('📊 Статус:', response.status);
        console.log('📄 Ответ:', responseText);

        if (!response.ok) {
            let errorMsg = `Ошибка ${response.status}`;
            try {
                const data = JSON.parse(responseText);
                errorMsg = data.error || data.details || data.message || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error('API вернул невалидный JSON');
        }

        let result = data.response || data.text || data.result || data.message;
        if (!result) {
            console.warn('⚠️ Не найден "response" в ответе:', data);
            result = '⚠️ Пустой ответ от модели';
        }
        
        return result;
    } catch (error) {
        console.error('❌ Ошибка API:', error);
        throw error;
    }
}

// ============================================================
//  СОХРАНЕНИЕ ИСТОРИИ
// ============================================================
function saveHistory() {
    try {
        localStorage.setItem('aurora_messages', JSON.stringify(state.messages));
    } catch (e) {
        console.warn('⚠️ Не удалось сохранить историю:', e);
    }
}

// ============================================================
//  СТАТУС
// ============================================================
function updateStatus(text, type = '') {
    if (!dom.statusText) return;
    
    dom.statusText.textContent = text;
    if (dom.dot) {
        dom.dot.className = 'dot';
        if (type === 'loading') {
            dom.dot.classList.add('loading');
        } else if (type === 'error') {
            dom.dot.style.background = '#f87171';
        } else {
            dom.dot.style.background = '#4ade80';
        }
    }
}

// ============================================================
//  СОБЫТИЯ
// ============================================================
function bindEvents() {
    if (!dom.sendBtn || !dom.userInput) return;
    
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

    if (dom.modelSelect) {
        dom.modelSelect.addEventListener('change', () => {
            state.model = dom.modelSelect.value;
            localStorage.setItem('aurora_model', state.model);
            if (dom.modelBadge) dom.modelBadge.textContent = state.model;
        });
    }

    if (dom.temperature) {
        dom.temperature.addEventListener('input', () => {
            const val = parseFloat(dom.temperature.value);
            dom.tempValue.textContent = val.toFixed(1);
            localStorage.setItem('aurora_temp', val);
        });
    }

    if (dom.clearBtn) {
        dom.clearBtn.addEventListener('click', () => {
            if (confirm('Удалить всю историю?')) {
                state.messages = [];
                localStorage.removeItem('aurora_messages');
                renderMessages();
                updateStatus('Чат очищен');
            }
        });
    }

    if (dom.menuToggle) {
        dom.menuToggle.addEventListener('click', () => {
            dom.sidebar.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && dom.sidebar && dom.menuToggle) {
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
