// ============================================================
//  AURORA — ПОЛНАЯ ВЕРСИЯ С РЕГИСТРАЦИЕЙ
// ============================================================

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    apiUrl: 'https://lively-scene-08ef.mrcraftluxe.workers.dev/',
    backendUrl: 'http://localhost:3000', // Для отправки email
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
    email: '',
    captchaCode: '',
};

// ===== DOM =====
const dom = {
    authPage: document.getElementById('authPage'),
    chatApp: document.getElementById('chatApp'),
    googleBtn: document.getElementById('googleBtn'),
    emailForm: document.getElementById('emailForm'),
    emailInput: document.getElementById('emailInput'),
    sendCodeBtn: document.getElementById('sendCodeBtn'),
    codeSection: document.getElementById('codeSection'),
    codeInput: document.getElementById('codeInput'),
    verifyCodeBtn: document.getElementById('verifyCodeBtn'),
    captchaText: document.getElementById('captchaText'),
    captchaInput: document.getElementById('captchaInput'),
    refreshCaptcha: document.getElementById('refreshCaptcha'),
    authStatus: document.getElementById('authStatus'),
    logoutBtn: document.getElementById('logoutBtn'),
    userName: document.getElementById('userName'),
    // Чат
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
//  ГЕНЕРАЦИЯ КАПЧИ
// ============================================================
function generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    state.captchaCode = code;
    dom.captchaText.textContent = code;
}

function refreshCaptcha() {
    generateCaptcha();
}

// ============================================================
//  GOOGLE ВХОД
// ============================================================
function initGoogleLogin() {
    dom.googleBtn.addEventListener('click', () => {
        // Имитация входа через Google (в реальности используйте Google Identity Services)
        const fakeUser = {
            name: 'Google User',
            email: 'user@gmail.com',
            id: 'google_123456',
            provider: 'google'
        };
        loginUser(fakeUser);
    });
}

// ============================================================
//  EMAIL + КОД
// ============================================================
async function sendVerificationCode(email) {
    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('verification_code', code);
    localStorage.setItem('verification_email', email);

    // В реальном проекте здесь отправка email через бэкенд
    console.log(`📧 Код подтверждения для ${email}: ${code}`);
    
    // Показываем в интерфейсе (для теста)
    dom.authStatus.textContent = `✅ Код отправлен на ${email} (для теста: ${code})`;
    dom.authStatus.style.color = '#4ade80';
    
    dom.codeSection.style.display = 'flex';
    dom.sendCodeBtn.disabled = true;
    dom.sendCodeBtn.textContent = 'Код отправлен';
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
        dom.authStatus.textContent = '✅ Успешный вход!';
        dom.authStatus.style.color = '#4ade80';
        return true;
    } else {
        dom.authStatus.textContent = '❌ Неверный код';
        dom.authStatus.style.color = '#f87171';
        return false;
    }
}

// ============================================================
//  ВХОД / ВЫХОД
// ============================================================
function loginUser(user) {
    state.user = user;
    state.isAuthenticated = true;
    localStorage.setItem('aurora_user', JSON.stringify(user));
    
    dom.authPage.style.display = 'none';
    dom.chatApp.style.display = 'flex';
    dom.userName.textContent = user.name || 'друг';
    
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
    localStorage.removeItem('aurora_messages_' + (state.user?.id || ''));
    
    dom.authPage.style.display = 'flex';
    dom.chatApp.style.display = 'none';
    dom.codeSection.style.display = 'none';
    dom.sendCodeBtn.disabled = false;
    dom.sendCodeBtn.textContent = 'Отправить код';
    dom.authStatus.textContent = '';
    dom.emailInput.value = '';
    dom.codeInput.value = '';
    dom.captchaInput.value = '';
    generateCaptcha();
}

// ============================================================
//  ОСТАЛЬНАЯ ЛОГИКА ЧАТА (как раньше)
// ============================================================
// ... (весь код чата из предыдущих версий)
// ============================================================

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================
function init() {
    // Проверяем, есть ли сохранённый пользователь
    const savedUser = localStorage.getItem('aurora_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            loginUser(user);
        } catch (_) {
            showAuthPage();
        }
    } else {
        showAuthPage();
    }
    
    generateCaptcha();
    initGoogleLogin();
    bindEvents();
}

function showAuthPage() {
    dom.authPage.style.display = 'flex';
    dom.chatApp.style.display = 'none';
}

function bindEvents() {
    // Отправка email
    dom.emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = dom.emailInput.value.trim();
        if (!email) {
            dom.authStatus.textContent = '❌ Введите email';
            dom.authStatus.style.color = '#f87171';
            return;
        }
        
        // Проверяем капчу
        const captchaInput = dom.captchaInput.value.trim().toUpperCase();
        if (captchaInput !== state.captchaCode) {
            dom.authStatus.textContent = '❌ Неверная капча';
            dom.authStatus.style.color = '#f87171';
            refreshCaptcha();
            dom.captchaInput.value = '';
            return;
        }
        
        state.email = email;
        await sendVerificationCode(email);
    });
    
    // Проверка кода
    dom.verifyCodeBtn.addEventListener('click', () => {
        const code = dom.codeInput.value.trim();
        if (code.length === 6) {
            verifyCode(code);
        } else {
            dom.authStatus.textContent = '❌ Введите 6-значный код';
            dom.authStatus.style.color = '#f87171';
        }
    });
    
    // Enter в поле кода
    dom.codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            dom.verifyCodeBtn.click();
        }
    });
    
    // Обновление капчи
    dom.refreshCaptcha.addEventListener('click', refreshCaptcha);
    
    // Выход
    dom.logoutBtn.addEventListener('click', logoutUser);
    
    // ===== Остальные события чата =====
    // (здесь весь код из предыдущего app.js: sendMessage, callAI и т.д.)
}

// ============================================================
//  ЗАПУСК
// ============================================================
document.addEventListener('DOMContentLoaded', init);
