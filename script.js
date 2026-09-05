// ====== КОНФИГ ======
const API_URL = "https://myaitop4.nport.link/api/generate";
const MODEL = "qwen2.5:3b";
const USE_FALLBACK = true;

// ====== DOM ======
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');

let isProcessing = false;
let isApiAvailable = false;
let messageCounter = 0;

// ====== Вспомогательные функции ======
function getMessageId() {
    return ++messageCounter;
}

function addMessage(text, sender, isError = false) {
    const id = getMessageId();
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.dataset.messageId = id;
    div.dataset.sender = sender;
    div.dataset.text = text;
    
    if (isError) {
        const errorSpan = document.createElement('span');
        errorSpan.className = 'error-text';
        errorSpan.textContent = text;
        div.appendChild(errorSpan);
    } else {
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            if (index > 0) div.appendChild(document.createElement('br'));
            div.appendChild(document.createTextNode(line));
        });
    }
    
    const time = document.createElement('span');
    time.className = 'timestamp';
    time.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    div.appendChild(time);
    
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return id;
}

function updateMessage(id, newText) {
    const messageEl = document.querySelector(`[data-message-id="${id}"]`);
    if (!messageEl) return;
    
    const timestamp = messageEl.querySelector('.timestamp');
    messageEl.innerHTML = '';
    
    const lines = newText.split('\n');
    lines.forEach((line, index) => {
        if (index > 0) messageEl.appendChild(document.createElement('br'));
        messageEl.appendChild(document.createTextNode(line));
    });
    
    messageEl.appendChild(timestamp);
    messageEl.dataset.text = newText;
}

function deleteMessage(id) {
    const messageEl = document.querySelector(`[data-message-id="${id}"]`);
    if (messageEl) {
        messageEl.style.transition = 'opacity 0.15s';
        messageEl.style.opacity = '0';
        setTimeout(() => messageEl.remove(), 150);
    }
}

function setStatus(text, type = 'online') {
    statusText.textContent = text;
    statusDot.className = 'dot';
    if (type === 'online') {
        statusDot.classList.add('online');
    } else if (type === 'offline') {
        statusDot.classList.add('offline');
    } else if (type === 'error') {
        statusDot.classList.add('error');
    }
}

// ====== FALLBACK ОТВЕТЫ ======
function getFallbackResponse(prompt) {
    const lower = prompt.toLowerCase();
    
    // Математика
    const numbers = prompt.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
        const sum = numbers.reduce((a, b) => parseInt(a) + parseInt(b), 0);
        return `Сумма чисел ${numbers.join(' + ')} = ${sum}`;
    }
    
    // Приветствия
    if (lower.match(/привет|здравствуй|hello|hi|hey/)) {
        return `Приветствую! Чем могу помочь?`;
    }
    
    if (lower.includes('кто ты') || lower.includes('ты кто')) {
        return `Я AURORA AI — ваш виртуальный помощник.`;
    }
    
    if (lower.includes('время') || lower.includes('часы') || lower.includes('который час')) {
        const now = new Date();
        return `Сейчас ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    if (lower.includes('погода')) {
        return `Проверьте погоду в приложении — я не имею доступа к интернету.`;
    }
    
    if (lower.includes('спасиб') || lower.includes('благодар')) {
        return `Пожалуйста! Всегда рада помочь.`;
    }
    
    return `Хороший вопрос! Для развёрнутого ответа нужен доступ к API.\n\n` +
           `Попробуйте запустить Ollama локально:\n` +
           `1. ollama serve\n` +
           `2. ollama pull qwen2.5:3b\n` +
           `3. Обновите страницу`;
}

// ====== TOAST ======
function showToast(text) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #222;
        color: #e0e0e0;
        padding: 0.4rem 1.2rem;
        font-size: 0.8rem;
        z-index: 9999;
        border: 1px solid #333;
        animation: fadeIn 0.2s ease;
    `;
    toast.textContent = text;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.2s';
        setTimeout(() => toast.remove(), 200);
    }, 1500);
}

// ====== ЗАПРОС К API ======
async function askAPI(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (data.response) {
            return data.response;
        } else if (data.message) {
            return data.message;
        } else if (data.content) {
            return data.content;
        } else {
            return JSON.stringify(data, null, 2);
        }
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

// ====== ОТПРАВКА СООБЩЕНИЯ ======
async function sendMessageToAPI(text) {
    if (!text || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendBtn.disabled = true;

    typingIndicator.classList.remove('hidden');

    try {
        if (!isApiAvailable && USE_FALLBACK) {
            await new Promise(resolve => setTimeout(resolve, 600));
            const fallbackReply = getFallbackResponse(text);
            typingIndicator.classList.add('hidden');
            addMessage(fallbackReply, 'bot');
            setStatus('офлайн', 'offline');
            return;
        } else if (!isApiAvailable) {
            throw new Error('API недоступен');
        }

        const reply = await askAPI(text);
        typingIndicator.classList.add('hidden');
        addMessage(reply, 'bot');
        setStatus('онлайн', 'online');
    } catch (error) {
        typingIndicator.classList.add('hidden');
        setStatus('ошибка', 'error');
        
        if (USE_FALLBACK) {
            const fallbackReply = getFallbackResponse(text);
            addMessage(fallbackReply, 'bot');
            setStatus('офлайн', 'offline');
            showToast('API недоступен, использую встроенный режим');
        } else {
            addMessage(`⚠️ Ошибка API\n\n${error.message}`, 'bot', true);
        }
    }

    isProcessing = false;
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isProcessing) return;

    userInput.value = '';
    addMessage(text, 'user');
    setStatus('печатает...', 'online');
    
    await sendMessageToAPI(text);
}

// ====== ПРОВЕРКА API ======
async function checkAPI() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: 'ping',
                stream: false,
                options: { temperature: 0 }
            }),
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            isApiAvailable = true;
            setStatus('онлайн', 'online');
            if (messagesEl.children.length === 0) {
                addMessage('Здравствуйте! Я AURORA AI. Задавайте вопросы.', 'bot');
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('API check error:', error);
        isApiAvailable = false;
        setStatus('офлайн', 'offline');
        
        if (messagesEl.children.length === 0) {
            addMessage(
                'Добро пожаловать в AURORA AI!\n\n' +
                'API временно недоступен, я работаю во встроенном режиме.\n' +
                'Задавайте простые вопросы — я постараюсь помочь.',
                'bot'
            );
        }
    }
}

// ====== ОБРАБОТЧИКИ ======
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ====== ЗАПУСК ======
console.log('🚀 AURORA AI запущен');
console.log(`📡 API: ${API_URL}`);
console.log(`🧠 Модель: ${MODEL}`);
checkAPI();
userInput.focus();

// Периодическая проверка
setInterval(() => {
    if (!isApiAvailable) {
        checkAPI();
    }
}, 30000);
