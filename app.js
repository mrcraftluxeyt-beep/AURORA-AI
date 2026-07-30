// ============================================================
//  AURORA — С GOOGLE ВХОДОМ И reCAPTCHA
// ============================================================

const CONFIG = {
    apiUrl: 'https://lively-scene-08ef.mrcraftluxe.workers.dev/',
    defaultModel: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2048,
};

const state = {
    user: null,
    isAuthenticated: false,
    model: localStorage.getItem('aurora_model') || CONFIG.defaultModel,
    temperature: parseFloat(localStorage.getItem('aurora_temp')) || CONFIG.temperature,
    messages: [],
    isProcessing: false,
};

// ============================================================
//  ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================
function checkAuth() {
    const savedUser = localStorage.getItem('aurora_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            loginUser(user);
            return true;
        } catch (_) {}
    }
    return false;
}

// ============================================================
//  ВХОД / ВЫХОД
// ============================================================
function loginUser(user) {
    state.user = user;
    state.isAuthenticated = true;
    localStorage.setItem('aurora_user', JSON.stringify(user));
    
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('chatApp').style.display = 'flex';
    document.getElementById('userName').textContent = user.name || 'друг';
    
    const saved = localStorage.getItem('aurora_messages_' + user.id);
    if (saved) {
        try {
            state.messages = JSON.parse(saved);
            renderMessages();
        } catch (_) {}
    }
    
    updateStatus('Готов');
    console.log('👤 Вход выполнен:', user);
}

function logoutUser() {
    if (state.user) {
        localStorage.removeItem('aurora_messages_' + state.user.id);
    }
    state.user = null;
    state.isAuthenticated = false;
    state.messages = [];
    localStorage.removeItem('aurora_user');
    localStorage.removeItem('verification_code');
    localStorage.removeItem('verification_email');
    
    document.getElementById('authPage').style.display = 'flex';
    document.getElementById('chatApp').style.display = 'none';
    document.getElementById('codeSection').style.display = 'none';
    
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = 'Отправить код';
    
    document.getElementById('authStatus').textContent = '';
    document.getElementById('emailInput').value = '';
    document.getElementById('codeInput').value = '';
    
    // Сброс reCAPTCHA
    if (window.grecaptcha) {
        grecaptcha.reset();
    }
}

// ============================================================
//  EMAIL + КОД
// ============================================================
function sendVerificationCode(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('verification_code', code);
    localStorage.setItem('verification_email', email);

    const authStatus = document.getElementById('authStatus');
    authStatus.innerHTML = `✅ Код отправлен на ${email}<br><span style="font-size:24px;color:#a78bfa;">${code}</span>`;
    authStatus.style.color = '#4ade80';
    
    document.getElementById('codeSection').style.display = 'flex';
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = 'Код отправлен';
}

function verifyCode(inputCode) {
    const savedCode = localStorage.getItem('verification_code');
    const email = localStorage.getItem('verification_email');
    
    if (inputCode === savedCode) {
        const user = {
            name: email.split('@')[0],
            email: email,
            id: 'user_' + Date.now(),
            provider: 'email'
        };
        loginUser(user);
        document.getElementById('authStatus').textContent = '✅ Успешный вход!';
        document.getElementById('authStatus').style.color = '#4ade80';
        return true;
    } else {
        document.getElementById('authStatus').textContent = '❌ Неверный код';
        document.getElementById('authStatus').style.color = '#f87171';
        return false;
    }
}

// ============================================================
//  ОТОБРАЖЕНИЕ СООБЩЕНИЙ
// ============================================================
function renderMessages() {
    const container = document.getElementById('messages');
    container.innerHTML = '';
    state.messages.forEach(msg => {
        container.appendChild(createMessageElement(msg.role, msg.content));
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
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function scrollToBottom() {
    const container = document.getElementById('messages');
    container.scrollTop = container.scrollHeight;
}

// ============================================================
//  ОТПРАВКА СООБЩЕНИЯ
// ============================================================
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const text = userInput.value.trim();
    if (!text || state.isProcessing) return;

    state.messages.push({ role: 'user', content: text });
    renderMessages();
    userInput.value = '';
    document.getElementById('sendBtn').disabled = true;
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
        document.getElementById('sendBtn').disabled = false;
        state.isProcessing = false;
        userInput.focus();
    }
}

// ============================================================
//  🔥 ВЫЗОВ API
// ============================================================
async function callAI(userMessage) {
    const payload = { message: userMessage };
    const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
        let errorMsg = `Ошибка ${response.status}`;
        try {
            const data = JSON.parse(responseText);
            errorMsg = data.error || data.details || data.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
    }

    const data = JSON.parse(responseText);
    let result = data.response || data.text || data.result || data.message;
    if (!result) result = '⚠️ Пустой ответ от модели';
    return result;
}

// ============================================================
//  СОХРАНЕНИЕ ИСТОРИИ
// ============================================================
function saveHistory() {
    try {
        if (state.user) {
            localStorage.setItem('aurora_messages_' + state.user.id, JSON.stringify(state.messages));
        }
    } catch (e) {}
}

// ============================================================
//  СТАТУС
// ============================================================
function updateStatus(text, type = '') {
    document.getElementById('statusText').textContent = text;
    const dot = document.querySelector('.dot');
    dot.className = 'dot';
    if (type === 'loading') {
        dot.classList.add('loading');
    } else if (type === 'error') {
        dot.style.background = '#f87171';
    } else {
        dot.style.background = '#4ade80';
    }
}

// ============================================================
//  СОБЫТИЯ
// ============================================================
function bindEvents() {
    // Google вход
    document.getElementById('googleBtn').addEventListener('click', (e) => {
        if (window.location.hostname.includes('github.io')) {
            e.preventDefault();
            document.getElementById('authStatus').innerHTML = '🔧 Google вход работает через сервер.<br>Запустите <code>node server.js</code> локально.';
            document.getElementById('authStatus').style.color = '#facc15';
        }
    });

    // Email форма
    document.getElementById('emailForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value.trim();
        if (!email) {
            document.getElementById('authStatus').textContent = '❌ Введите email';
            document.getElementById('authStatus').style.color = '#f87171';
            return;
        }
        sendVerificationCode(email);
    });

    // Проверка кода
    document.getElementById('verifyCodeBtn').addEventListener('click', () => {
        const code = document.getElementById('codeInput').value.trim();
        if (code.length === 6) {
            verifyCode(code);
        } else {
            document.getElementById('authStatus').textContent = '❌ Введите 6-значный код';
            document.getElementById('authStatus').style.color = '#f87171';
        }
    });

    document.getElementById('codeInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('verifyCodeBtn').click();
    });

    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    
    document.getElementById('userInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.getElementById('userInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    document.getElementById('modelSelect').addEventListener('change', function() {
        state.model = this.value;
        localStorage.setItem('aurora_model', state.model);
        document.getElementById('modelBadge').textContent = state.model;
    });

    document.getElementById('temperature').addEventListener('input', function() {
        const val = parseFloat(this.value);
        document.getElementById('tempValue').textContent = val.toFixed(1);
        localStorage.setItem('aurora_temp', val);
    });

    document.getElementById('clearChatBtn').addEventListener('click', () => {
        if (confirm('Удалить всю историю?')) {
            state.messages = [];
            if (state.user) {
                localStorage.removeItem('aurora_messages_' + state.user.id);
            }
            renderMessages();
            updateStatus('Чат очищен');
        }
    });

    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.getElementById('menuToggle');
            if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// ============================================================
//  ЗАПУСК
// ============================================================
function init() {
    console.log('🚀 AURORA запускается...');
    
    const isAuth = checkAuth();
    
    document.getElementById('modelSelect').value = state.model;
    document.getElementById('temperature').value = state.temperature;
    document.getElementById('tempValue').textContent = state.temperature.toFixed(1);
    document.getElementById('modelBadge').textContent = state.model;
    
    if (!isAuth) {
        document.getElementById('authPage').style.display = 'flex';
        document.getElementById('chatApp').style.display = 'none';
    }
    
    bindEvents();
    console.log('✅ AURORA готова!');
}

document.addEventListener('DOMContentLoaded', init);
