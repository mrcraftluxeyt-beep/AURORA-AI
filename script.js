// ===== СОСТОЯНИЕ =====
let chats = [];
let currentChatId = null;
let chatCounter = 0;
let isProcessing = false;

// ===== DOM ЭЛЕМЕНТЫ =====
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatList = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const currentChatName = document.getElementById('currentChatName');
const navBtns = document.querySelectorAll('.nav-btn');

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    loadFromStorage();
    if (chats.length === 0) {
        createNewChat();
    } else {
        const lastChat = chats[chats.length - 1];
        currentChatId = lastChat.id;
        renderChatList();
        renderMessages(currentChatId);
        updateCurrentChatName();
    }
    setupEventListeners();
    updateStatus();
}

// ===== РАБОТА С ХРАНИЛИЩЕМ =====
function saveToStorage() {
    try {
        localStorage.setItem('aurora_chats', JSON.stringify(chats));
        localStorage.setItem('aurora_counter', String(chatCounter));
    } catch (e) {}
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('aurora_chats');
        const counter = localStorage.getItem('aurora_counter');
        if (saved) {
            chats = JSON.parse(saved);
        }
        if (counter) {
            chatCounter = parseInt(counter) || 0;
        }
    } catch (e) {
        chats = [];
    }
}

// ===== СОЗДАНИЕ НОВОГО ЧАТА =====
function createNewChat() {
    chatCounter++;
    const newChat = {
        id: chatCounter,
        name: `Чат #${chatCounter}`,
        messages: [
            {
                role: 'bot',
                text: 'Привет! Я <strong>Aurora AI</strong>!<br />Задавай вопросы, проси нарисовать картинку или показать код! 🚀',
                time: 'только что'
            }
        ],
        createdAt: new Date().toISOString()
    };
    chats.push(newChat);
    currentChatId = newChat.id;
    renderChatList();
    renderMessages(currentChatId);
    updateCurrentChatName();
    saveToStorage();
    scrollToBottom();
}

// ===== ОТРИСОВКА СПИСКА ЧАТОВ =====
function renderChatList() {
    if (chats.length === 0) {
        chatList.innerHTML = '<div style="color:#6a6a80;font-size:13px;text-align:center;padding:20px 0;">Нет чатов</div>';
        return;
    }
    chatList.innerHTML = chats.map(chat => `
        <div class="chat-item ${chat.id === currentChatId ? 'active' : ''}" data-id="${chat.id}">
            <span class="chat-name">${chat.name}</span>
            <button class="chat-delete" data-id="${chat.id}">✕</button>
        </div>
    `).join('');

    // Обработчики для чатов
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-delete')) return;
            const id = parseInt(item.dataset.id);
            switchChat(id);
        });
        const deleteBtn = item.querySelector('.chat-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(deleteBtn.dataset.id);
                deleteChat(id);
            });
        }
    });
}

// ===== ПЕРЕКЛЮЧЕНИЕ ЧАТА =====
function switchChat(id) {
    if (id === currentChatId) return;
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    currentChatId = id;
    renderChatList();
    renderMessages(id);
    updateCurrentChatName();
    scrollToBottom();
}

// ===== УДАЛЕНИЕ ЧАТА =====
function deleteChat(id) {
    if (chats.length <= 1) {
        createNewChat();
        return;
    }
    chats = chats.filter(c => c.id !== id);
    if (currentChatId === id) {
        currentChatId = chats[chats.length - 1].id;
    }
    renderChatList();
    renderMessages(currentChatId);
    updateCurrentChatName();
    saveToStorage();
    scrollToBottom();
}

// ===== ОЧИСТКА ВСЕХ ЧАТОВ =====
function clearAllChats() {
    if (chats.length === 0) return;
    if (!confirm('Удалить все чаты?')) return;
    chats = [];
    chatCounter = 0;
    createNewChat();
    saveToStorage();
}

// ===== ОТРИСОВКА СООБЩЕНИЙ =====
function renderMessages(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    messagesContainer.innerHTML = chat.messages.map(msg => {
        const isUser = msg.role === 'user';
        const text = msg.text || '';
        return `
            <div class="message ${isUser ? 'user' : 'bot'}">
                <div class="message-avatar">${isUser ? '👤' : '🌌'}</div>
                <div class="message-content">
                    <div class="message-text">${text}</div>
                    ${msg.image ? `<img class="message-image" src="${msg.image}" alt="Сгенерированное изображение" />` : ''}
                    <div class="message-time">${msg.time || 'сейчас'}</div>
                </div>
            </div>
        `;
    }).join('');
    scrollToBottom();
}

// ===== ОБНОВЛЕНИЕ ИМЕНИ ТЕКУЩЕГО ЧАТА =====
function updateCurrentChatName() {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        currentChatName.textContent = chat.name;
    }
}

// ===== ПРОКРУТКА ВНИЗ =====
function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====
async function sendMessage() {
    if (isProcessing) return;
    const text = messageInput.value.trim();
    if (!text) return;

    // Определяем режим
    let mode = 'chat';
    if (text.toLowerCase().startsWith('нарисуй')) {
        mode = 'image';
    } else if (text.toLowerCase().startsWith('код')) {
        mode = 'code';
    }

    messageInput.value = '';
    isProcessing = true;

    // Добавляем сообщение пользователя
    const userMsg = {
        role: 'user',
        text: text,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push(userMsg);
        renderMessages(currentChatId);
        saveToStorage();
    }

    // Добавляем индикатор загрузки
    const loadingMsg = {
        role: 'bot',
        text: '⏳ Думаю...',
        time: '...'
    };
    chat.messages.push(loadingMsg);
    renderMessages(currentChatId);

    try {
        let responseText = '';
        let imageUrl = null;

        if (mode === 'image') {
            const prompt = text.replace(/^нарисуй/i, '').trim() || 'красивый пейзаж';
            const result = await generateImage(prompt);
            if (result.success) {
                imageUrl = result.url;
                responseText = `🎨 *Готово!*\n\nВот что получилось по запросу: "${prompt}"`;
            } else {
                responseText = `❌ Не удалось создать картинку. Попробуй другой запрос.\n\n${result.error || ''}`;
            }
        } else if (mode === 'code') {
            const codeQuery = text.replace(/^код/i, '').trim() || 'телеграм бот';
            responseText = await generateCode(codeQuery);
        } else {
            responseText = await getAIResponse(text);
        }

        // Убираем индикатор загрузки
        chat.messages.pop();
        const botMsg = {
            role: 'bot',
            text: responseText,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        };
        if (imageUrl) {
            botMsg.image = imageUrl;
        }
        chat.messages.push(botMsg);
        renderMessages(currentChatId);
        saveToStorage();

    } catch (error) {
        chat.messages.pop();
        chat.messages.push({
            role: 'bot',
            text: `❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        });
        renderMessages(currentChatId);
        saveToStorage();
    }

    isProcessing = false;
    scrollToBottom();
}

// ===== ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ =====
async function generateImage(prompt) {
    try {
        const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`);
        if (response.ok) {
            return { success: true, url: response.url };
        }
        return { success: false, error: 'Сервис недоступен' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ===== ГЕНЕРАЦИЯ КОДА =====
async function generateCode(query) {
    const q = query.toLowerCase();
    const codes = {
        'телеграм бот': `\`\`\`python\n# Telegram бот\nfrom telegram import Update\nfrom telegram.ext import Application, CommandHandler\n\nBOT_TOKEN = "ваш_токен"\n\nasync def start(update, context):\n    await update.message.reply_text("Привет! 🚀")\n\napp = Application.builder().token(BOT_TOKEN).build()\napp.add_handler(CommandHandler("start", start))\napp.run_polling()\n\`\`\``,
        'flask': `\`\`\`python\n# Flask приложение\nfrom flask import Flask, jsonify\n\napp = Flask(__name__)\n\n@app.route('/')\ndef index():\n    return "Hello World!"\n\nif __name__ == '__main__':\n    app.run(debug=True)\n\`\`\``,
        'requests': `\`\`\`python\n# HTTP запросы\nimport requests\n\nresponse = requests.get('https://api.example.com/data')\ndata = response.json()\nprint(data)\n\`\`\``
    };

    for (key, value) of Object.entries(codes)) {
        if (q.includes(key)) {
            return value;
        }
    }
    return `💻 *Код*\n\nНапиши:\n• код телеграм бот\n• код flask приложение\n• код requests запрос`;
}

// ===== ОТВЕТЫ AI =====
async function getAIResponse(question) {
    const q = question.toLowerCase().trim();
    const quickAnswers = {
        'привет': '🌌 Привет! Я Aurora AI! Задавай вопросы, проси нарисовать картинку или показать код! 🚀',
        'здравствуй': '🌌 Здравствуй! Я готов помочь! 💫',
        'как дела': '🌟 Всё отлично! Чем могу помочь? 😊',
        'кто ты': '🤖 Я Aurora AI — искусственный интеллект с доступом в интернет!',
        'спасибо': '🙏 Пожалуйста! Обращайся ещё! 😊',
        'что умеешь': `✨ *Я умею:*\n• 🌐 Отвечать на вопросы\n• 🎨 Рисовать картинки — напиши "нарисуй [описание]"\n• 💻 Показывать код — напиши "код [что нужно]"\n\nПросто пиши что хочешь! 🚀`,
        'помощь': `📝 *Как пользоваться:*\n\n🌐 *Вопрос* — просто напиши\n🎨 *Картинка* — нарисуй [описание]\n💻 *Код* — код [что нужно]`
    };

    for (const [key, value] of Object.entries(quickAnswers)) {
        if (q.includes(key)) {
            return value;
        }
    }

    // Поиск через DuckDuckGo API
    try {
        const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json&no_html=1&skip_disambig=1`);
        const data = await response.json();
        if (data.AbstractText) {
            return `🌐 *Нашёл в DuckDuckGo:*\n\n${data.AbstractText.slice(0, 500)}`;
        }
        if (data.Definition) {
            return `📝 *Определение:*\n\n${data.Definition}`;
        }
        if (data.Answer) {
            return `💡 *Ответ:*\n\n${data.Answer}`;
        }
    } catch (e) {}

    return `🌐 *Не нашел информации.*\n\n💡 Попробуй:\n• Переформулировать вопрос\n• Спросить на английском\n• Задать более конкретный вопрос`;
}

// ===== СТАТУС =====
function updateStatus() {
    const badge = document.getElementById('statusBadge');
    const dot = badge.querySelector('.status-dot');
    badge.innerHTML = `<span class="status-dot"></span> Онлайн`;
    badge.prepend(dot);
}

// ===== СОБЫТИЯ =====
function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    newChatBtn.addEventListener('click', () => {
        createNewChat();
        renderChatList();
        saveToStorage();
    });
    clearAllBtn.addEventListener('click', clearAllChats);

    // Навигация
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            if (mode === 'chat') {
                messageInput.placeholder = 'Напиши сообщение...';
            } else if (mode === 'image') {
                messageInput.placeholder = 'Опиши что нарисовать... (нарисуй кот в космосе)';
            } else if (mode === 'code') {
                messageInput.placeholder = 'Какой код нужен? (код телеграм бот)';
            }
        });
    });
}

// ===== ЗАПУСК =====
init();
