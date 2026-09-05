// ====== КОНФИГ ======
const API_URL = "https://myaitop4.nport.link/api/generate";
const MODEL = "qwen2.5:3b";
const USE_FALLBACK = true; // Если API не отвечает, используем встроенные ответы

// ====== DOM ======
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const contextMenu = document.getElementById('contextMenu');

let isProcessing = false;
let isApiAvailable = false;
let selectedMessage = null;
let selectedMessageId = null;
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
    div.dataset.reactions = '';
    
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
    
    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'reactions';
    reactionsDiv.dataset.reactions = '';
    div.appendChild(reactionsDiv);
    
    const time = document.createElement('span');
    time.className = 'timestamp';
    time.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    div.appendChild(time);
    
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, div);
    });
    
    let longPressTimer;
    div.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            const touch = e.touches[0];
            showContextMenu(touch.clientX, touch.clientY, div);
        }, 500);
    });
    div.addEventListener('touchend', () => clearTimeout(longPressTimer));
    div.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return id;
}

function addReaction(messageId, reaction) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;
    
    const reactionsDiv = messageEl.querySelector('.reactions');
    if (!reactionsDiv) return;
    
    let reactions = reactionsDiv.dataset.reactions ? reactionsDiv.dataset.reactions.split(',') : [];
    if (!reactions.includes(reaction)) {
        reactions.push(reaction);
        reactionsDiv.dataset.reactions = reactions.join(',');
        reactionsDiv.innerHTML = reactions.map(r => `<span class="reaction">${r}</span>`).join(' ');
    }
}

function updateMessage(id, newText) {
    const messageEl = document.querySelector(`[data-message-id="${id}"]`);
    if (!messageEl) return;
    
    const timestamp = messageEl.querySelector('.timestamp');
    const reactionsDiv = messageEl.querySelector('.reactions');
    messageEl.innerHTML = '';
    
    const lines = newText.split('\n');
    lines.forEach((line, index) => {
        if (index > 0) messageEl.appendChild(document.createElement('br'));
        messageEl.appendChild(document.createTextNode(line));
    });
    
    messageEl.appendChild(reactionsDiv);
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

// ====== FALLBACK ОТВЕТЫ (если API не работает) ======
function getFallbackResponse(prompt) {
    const lower = prompt.toLowerCase();
    
    const responses = {
        'привет': 'Приветствую! Чем могу помочь?',
        'как дела': 'У меня всё отлично! А у вас?',
        'кто ты': 'Я AURORA AI — ваш виртуальный помощник.',
        'пока': 'До свидания! Буду ждать новых вопросов.',
        'спасибо': 'Пожалуйста! Обращайтесь ещё.',
        'помощь': 'Я могу отвечать на вопросы, помогать с задачами и просто болтать.',
    };
    
    for (const [key, value] of Object.entries(responses)) {
        if (lower.includes(key)) {
            return value;
        }
    }
    
    if (lower.includes('сколько') || lower.includes('сумма') || lower.includes('плюс')) {
        const nums = prompt.match(/\d+/g);
        if (nums && nums.length >= 2) {
            const sum = nums.reduce((a, b) => parseInt(a) + parseInt(b), 0);
            return `Сумма чисел ${nums.join(' + ')} = ${sum}`;
        }
    }
    
    if (lower.includes('время') || lower.includes('часы') || lower.includes('который час')) {
        const now = new Date();
        return `Сейчас ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `Интересный вопрос! "${prompt}"\n\nК сожалению, API временно недоступен. Попробуйте позже или перезапустите Ollama.`;
}

// ====== КОНТЕКСТНОЕ МЕНЮ ======
function showContextMenu(x, y, messageEl) {
    const sender = messageEl.dataset.sender;
    const text = messageEl.dataset.text;
    const id = parseInt(messageEl.dataset.messageId);
    
    selectedMessage = messageEl;
    selectedMessageId = id;
    
    document.querySelectorAll('.message.selected').forEach(el => el.classList.remove('selected'));
    messageEl.classList.add('selected');
    
    const menuItems = contextMenu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const action = item.dataset.action;
        if (action === 'delete' && sender !== 'user') {
            item.style.display = 'none';
        } else if (action === 'regenerate' && sender !== 'bot') {
            item.style.display = 'none';
        } else if (action && (action.startsWith('react'))) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'flex';
        }
    });
    
    const menuWidth = 200;
    const menuHeight = 280;
    
    let left = x;
    let top = y;
    
    if (x + menuWidth > window.innerWidth - 10) {
        left = x - menuWidth;
    }
    if (y + menuHeight > window.innerHeight - 10) {
        top = y - menuHeight;
    }
    
    contextMenu.style.left = left + 'px';
    contextMenu.style.top = top + 'px';
    contextMenu.classList.remove('hidden');
}

function hideContextMenu() {
    contextMenu.classList.add('hidden');
    document.querySelectorAll('.message.selected').forEach(el => el.classList.remove('selected'));
    selectedMessage = null;
    selectedMessageId = null;
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        const action = item.dataset.action;
        if (!selectedMessage || !selectedMessageId) return;
        
        const text = selectedMessage.dataset.text;
        const sender = selectedMessage.dataset.sender;
        
        switch (action) {
            case 'copy':
                try {
                    await navigator.clipboard.writeText(text);
                    showToast('Скопировано');
                } catch (err) {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showToast('Скопировано');
                }
                break;
                
            case 'edit':
                if (sender === 'user') {
                    userInput.value = text;
                    userInput.focus();
                    deleteMessage(selectedMessageId);
                    showToast('Загружено для редактирования');
                } else {
                    const newText = prompt('Редактировать:', text);
                    if (newText !== null && newText.trim()) {
                        updateMessage(selectedMessageId, newText.trim());
                        showToast('Обновлено');
                    }
                }
                break;
                
            case 'delete':
                if (confirm('Удалить?')) {
                    deleteMessage(selectedMessageId);
                    showToast('Удалено');
                }
                break;
                
            case 'regenerate':
                if (sender === 'bot') {
                    const prevMessages = messagesEl.querySelectorAll('.message.user');
                    if (prevMessages.length > 0) {
                        const lastUserMsg = prevMessages[prevMessages.length - 1];
                        const userText = lastUserMsg.dataset.text;
                        deleteMessage(selectedMessageId);
                        await sendMessageToAPI(userText);
                    } else {
                        showToast('Нет предыдущего сообщения');
                    }
                }
                break;
                
            case 'react1':
                addReaction(selectedMessageId, '(◕‿◕) ❤️');
                showToast('❤️');
                break;
            case 'react2':
                addReaction(selectedMessageId, '(｡♥‿♥｡) 🔥');
                showToast('🔥');
                break;
            case 'react3':
                addReaction(selectedMessageId, '(╯°□°)╯ 🚀');
                showToast('🚀');
                break;
            case 'react4':
                addReaction(selectedMessageId, 'ᕙ(⇀‸↼‶)ᕗ 💪');
                showToast('💪');
                break;
            case 'react5':
                addReaction(selectedMessageId, '(づ｡◕‿‿◕｡)づ 🌟');
                showToast('🌟');
                break;
        }
        
        hideContextMenu();
    });
});

document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

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
        animation: fadeIn 0.2s ease;
        border: 1px solid #333;
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
        
        // Проверяем разные поля ответа
        if (data.response) {
            return data.response;
        } else if (data.message) {
            return data.message;
        } else if (data.content) {
            return data.content;
        } else if (data.text) {
            return data.text;
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
        // Проверяем доступность API
        if (!isApiAvailable) {
            await checkAPI();
            if (!isApiAvailable && USE_FALLBACK) {
                // Используем fallback
                await new Promise(resolve => setTimeout(resolve, 600));
                const fallbackReply = getFallbackResponse(text);
                typingIndicator.classList.add('hidden');
                addMessage(fallbackReply, 'bot');
                setStatus('офлайн (встроенный)', 'offline');
                return;
            } else if (!isApiAvailable) {
                throw new Error('API недоступен');
            }
        }

        const reply = await askAPI(text);
        typingIndicator.classList.add('hidden');
        addMessage(reply, 'bot');
        setStatus('онлайн', 'online');
    } catch (error) {
        typingIndicator.classList.add('hidden');
        setStatus('ошибка', 'error');
        
        // Используем fallback при ошибке
        if (USE_FALLBACK) {
            const fallbackReply = getFallbackResponse(text);
            addMessage(fallbackReply, 'bot');
            setStatus('офлайн (встроенный)', 'offline');
            showToast('API недоступен, использую встроенный режим');
        } else {
            let errorMsg = `⚠️ Ошибка API\n\n${error.message}`;
            addMessage(errorMsg, 'bot', true);
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
            const data = await response.json();
            console.log('✅ API подключён:', data);
            isApiAvailable = true;
            setStatus('онлайн', 'online');
            
            if (messagesEl.children.length === 0) {
                addMessage('🌟 Здравствуйте! Я AURORA AI.\n\nAPI подключён. Задавайте любые вопросы!', 'bot');
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('❌ API check error:', error);
        isApiAvailable = false;
        setStatus('офлайн', 'offline');
        
        if (messagesEl.children.length === 0) {
            if (USE_FALLBACK) {
                addMessage(
                    '🌟 Добро пожаловать в AURORA AI!\n\n' +
                    'API временно недоступен, но я работаю во встроенном режиме.\n' +
                    'Я могу отвечать на простые вопросы.\n\n' +
                    'Задавайте вопросы — я постараюсь помочь! ✨',
                    'bot'
                );
            } else {
                addMessage(
                    '⚠️ API недоступен\n\n' +
                    `URL: ${API_URL}\n` +
                    `Модель: ${MODEL}\n\n` +
                    `💡 Проверьте соединение или запустите Ollama.`,
                    'bot',
                    true
                );
            }
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
console.log(`🔄 Fallback: ${USE_FALLBACK ? 'Включён' : 'Выключен'}`);
checkAPI();
userInput.focus();

// Периодическая проверка API (каждые 30 секунд)
setInterval(() => {
    if (!isApiAvailable) {
        checkAPI();
    }
}, 30000);
