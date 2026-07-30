// ============================================================
//  AURORA — ПОЛНАЯ ВЕРСИЯ С РЕГИСТРАЦИЕЙ
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
    user: null,
    isAuthenticated: false,
    model: localStorage.getItem('aurora_model') || CONFIG.defaultModel,
    temperature: parseFloat(localStorage.getItem('aurora_temp')) || CONFIG.temperature,
    messages: [],
    isProcessing: false,
    captchaCode: '',
};

// ===== DOM =====
const dom = {};

// ============================================================
//  ГЕНЕРАЦИЯ КАПЧИ
// ============================================================
function generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    state.captchaCode = code;
    const captchaText = document.getElementById('captchaText');
    if (captchaText) captchaText.textContent = code;
}

function refreshCaptcha() {
    generateCaptcha();
}

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
    
    const authPage = document.getElementById('authPage');
    const chatApp = document.getElementById('chatApp');
    const userName = document.getElementById('userName');
    
    if (authPage) authPage.style.display = 'none';
    if (chatApp) chatApp.style.display = 'flex';
    if (userName) userName.textContent = user.name || 'друг';
    
    // Загружаем сохранённые сообщения
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
    state.user = null;
    state.isAuthenticated = false;
    state.messages = [];
    localStorage.removeItem('aurora_user');
    localStorage.removeItem('verification_code');
    localStorage.removeItem('verification_email');
    if (state.user) {
        localStorage.removeItem('aurora_messages_' + state.user.id);
    }
    
    const authPage = document.getElementById('authPage');
    const chatApp = document.getElementById('chatApp');
    const codeSection = document.getElementById('codeSection');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    
    if (authPage) authPage.style.display = 'flex';
    if (chatApp) chatApp.style.display = 'none';
    if (codeSection) codeSection.style.display = 'none';
    if (sendCodeBtn) {
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = 'Отправить код';
    }
    
    const authStatus = document.getElementById('authStatus');
    if (authStatus) authStatus.textContent = '';
    
    const emailInput = document.getElementById('emailInput');
    const codeInput = document.getElementById('codeInput');
    const captchaInput = document.getElementById('captchaInput');
    if (emailInput) emailInput.value = '';
    if (codeInput) codeInput.value = '';
    if (captchaInput) captchaInput.value = '';
    
    generateCaptcha();
}

// ============================================================
//  EMAIL + КОД
// ============================================================
async function sendVerificationCode(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('verification_code', code);
    localStorage.setItem('verification_email', email);

    console.log(`📧 Код подтверждения для ${email}: ${code}`);
    
    const authStatus = document.getElementById('authStatus');
    if (authStatus) {
        authStatus.textContent = `✅ Код отправлен на ${email} (для теста: ${code})`;
        authStatus.style.color = '#4ade80';
    }
    
    const codeSection = document.getElementById('codeSection');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    if (codeSection) codeSection.style.display = 'flex';
    if (sendCodeBtn) {
        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = 'Код отправлен';
    }
}

function verifyCode(inputCode) {
    const savedCode = localStorage.getItem('verification_code');
    const email = localStorage.getItem('verification_email');
    
    if (inputCode === savedCode) {
        const user = {
            name: email.split('@')[0],
            email: email,
            id: 'email_' + Date.now(),
            provider: 'email'
        };
        loginUser(user);
        const authStatus = document.getElementById('authStatus');
        if (authStatus) {
            authStatus.textContent = '✅ Успешный вход!';
            authStatus.style.color = '#4ade80';
        }
        return true;
    } else {
        const authStatus = document.getElementById('authStatus');
        if (authStatus) {
            authStatus.textContent = '❌ Неверный код';
            authStatus.style.color = '#f87171';
        }
        return false;
    }
}

// ============================================================
//  ОТОБРАЖЕНИЕ СООБЩЕНИЙ
// ============================================================
function renderMessages() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    state.messages.forEach(msg => {
        const el = createMessageElement(msg.role, msg.content);
        messagesContainer.appendChild(el);
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
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// ============================================================
//  ОТПРАВКА СООБЩЕНИЯ
// ============================================================
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!userInput) return;
    
    const text = userInput.value.trim();
    if (!text || state.isProcessing) return;

    state.messages.push({ role: 'user', content: text });
    renderMessages();
    userInput.value = '';
    if (sendBtn) sendBtn.disabled = true;
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
        if (sendBtn) sendBtn.disabled = false;
        state.isProcessing = false;
        if (userInput) userInput.focus();
    }
}

// ============================================================
//  🔥 ВЫЗОВ API
// ============================================================
async function callAI(userMessage) {
    const payload = { message: userMessage };

    console.log('📤 Отправка:', JSON.stringify(payload));

    const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('📊 Статус:', response.status);

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
        result = '⚠️ Пустой ответ от модели';
    }
    
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
        localStorage.setItem('aurora_messages', JSON.stringify(state.messages));
    } catch (e) {}
}

// ============================================================
//  СТАТУС
// ============================================================
function updateStatus(text, type = '') {
    const statusText = document.getElementById('statusText');
    const dot = document.querySelector('.dot');
    
    if (statusText) statusText.textContent = text;
    if (dot) {
        dot.className = 'dot';
        if (type === 'loading') {
            dot.classList.add('loading');
        } else if (type === 'error') {
            dot.style.background = '#f87171';
        } else {
            dot.style.background = '#4ade80';
        }
    }
}

// ============================================================
//  СОБЫТИЯ
// ============================================================
function bindEvents() {
    // Google вход
    const googleBtn = document.getElementById('googleBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            // Перенаправляем на Google OAuth
            window.location.href = '/auth/google';
        });
    }

    // Email форма
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('emailInput');
            const authStatus = document.getElementById('authStatus');
            const captchaInput = document.getElementById('captchaInput');
            
            if (!emailInput) return;
            const email = emailInput.value.trim();
            
            if (!email) {
                if (authStatus) {
                    authStatus.textContent = '❌ Введите email';
                    authStatus.style.color = '#f87171';
                }
                return;
            }
            
            // Проверяем капчу
            const captchaInputEl = document.getElementById('captchaInput');
            if (captchaInputEl) {
                const captchaInputValue = captchaInputEl.value.trim().toUpperCase();
                if (captchaInputValue !== state.captchaCode) {
                    if (authStatus) {
                        authStatus.textContent = '❌ Неверная капча';
                        authStatus.style.color = '#f87171';
                    }
                    refreshCaptcha();
                    captchaInputEl.value = '';
                    return;
                }
            }
            
            await sendVerificationCode(email);
        });
    }

    // Проверка кода
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', () => {
            const codeInput = document.getElementById('codeInput');
            const authStatus = document.getElementById('authStatus');
            
            if (!codeInput) return;
            const code = codeInput.value.trim();
            
            if (code.length === 6) {
                verifyCode(code);
            } else {
                if (authStatus) {
                    authStatus.textContent = '❌ Введите 6-значный код';
                    authStatus.style.color = '#f87171';
                }
            }
        });
    }

    // Enter в поле кода
    const codeInput = document.getElementById('codeInput');
    if (codeInput) {
        codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const verifyBtn = document.getElementById('verifyCodeBtn');
                if (verifyBtn) verifyBtn.click();
            }
        });
    }

    // Обновление капчи
    const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
    if (refreshCaptchaBtn) {
        refreshCaptchaBtn.addEventListener('click', refreshCaptcha);
    }

    // Выход
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Отправка сообщения
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
        });
    }

    // Модель
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            state.model = modelSelect.value;
            localStorage.setItem('aurora_model', state.model);
            const modelBadge = document.getElementById('modelBadge');
            if (modelBadge) modelBadge.textContent = state.model;
        });
    }

    // Температура
    const temperature = document.getElementById('temperature');
    if (temperature) {
        temperature.addEventListener('input', () => {
            const val = parseFloat(temperature.value);
            const tempValue = document.getElementById('tempValue');
            if (tempValue) tempValue.textContent = val.toFixed(1);
            localStorage.setItem('aurora_temp', val);
        });
    }

    // Очистка чата
    const clearBtn = document.getElementById('clearChatBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Удалить всю историю?')) {
                state.messages = [];
                localStorage.removeItem('aurora_messages');
                if (state.user) {
                    localStorage.removeItem('aurora_messages_' + state.user.id);
                }
                renderMessages();
                updateStatus('Чат очищен');
            }
        });
    }

    // Меню на мобилках
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && menuToggle) {
            const isSidebar = sidebar.contains(e.target);
            const isToggle = menuToggle.contains(e.target);
            if (!isSidebar && !isToggle) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================
function init() {
    console.log('🚀 AURORA запускается...');
    
    // Проверяем авторизацию
    const isAuth = checkAuth();
    
    // Загружаем настройки
    const modelSelect = document.getElementById('modelSelect');
    const temperature = document.getElementById('temperature');
    const tempValue = document.getElementById('tempValue');
    const modelBadge = document.getElementById('modelBadge');
    
    if (modelSelect) modelSelect.value = state.model;
    if (temperature) {
        temperature.value = state.temperature;
        if (tempValue) tempValue.textContent = state.temperature.toFixed(1);
    }
    if (modelBadge) modelBadge.textContent = state.model;
    
    // Если не авторизован, показываем страницу входа
    if (!isAuth) {
        const authPage = document.getElementById('authPage');
        const chatApp = document.getElementById('chatApp');
        if (authPage) authPage.style.display = 'flex';
        if (chatApp) chatApp.style.display = 'none';
        generateCaptcha();
    }
    
    bindEvents();
    console.log('✅ AURORA готова!');
}

// ============================================================
//  ЗАПУСК
// ============================================================
document.addEventListener('DOMContentLoaded', init);
