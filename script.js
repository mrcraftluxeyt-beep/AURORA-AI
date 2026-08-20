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

console.log('✅ Aurora AI загружен!');

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
    console.log('✅ Инициализация завершена, чатов:', chats.length);
}

// ===== РАБОТА С ХРАНИЛИЩЕМ =====
function saveToStorage() {
    try {
        localStorage.setItem('aurora_chats', JSON.stringify(chats));
        localStorage.setItem('aurora_counter', String(chatCounter));
    } catch (e) {
        console.log('⚠️ Ошибка сохранения:', e);
    }
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
        console.log('⚠️ Ошибка загрузки:', e);
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
    console.log('✅ Создан новый чат:', newChat.name);
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
        item.addEventListener('click', function(e) {
            if (e.target.classList.contains('chat-delete')) return;
            const id = parseInt(this.dataset.id);
            switchChat(id);
        });
        
        const deleteBtn = item.querySelector('.chat-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
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
    console.log('🔄 Переключен на чат:', chat.name);
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
    console.log('🗑️ Чат удален');
}

// ===== ОЧИСТКА ВСЕХ ЧАТОВ =====
function clearAllChats() {
    if (chats.length === 0) return;
    if (!confirm('Удалить все чаты?')) return;
    chats = [];
    chatCounter = 0;
    createNewChat();
    saveToStorage();
    console.log('🗑️ Все чаты удалены');
}

// ===== ОТРИСОВКА СООБЩЕНИЙ =====
function renderMessages(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
        console.log('⚠️ Чат не найден:', chatId);
        return;
    }
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
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, 100);
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====
async function sendMessage() {
    console.log('📤 Отправка сообщения...');
    
    if (isProcessing) {
        console.log('⏳ Уже обрабатывается');
        return;
    }
    
    const text = messageInput.value.trim();
    if (!text) {
        console.log('⚠️ Пустое сообщение');
        return;
    }

    console.log('📝 Текст:', text);

    // Определяем режим по тексту
    let mode = 'chat';
    const lowerText = text.toLowerCase();
    if (lowerText.startsWith('нарисуй')) {
        mode = 'image';
    } else if (lowerText.startsWith('код')) {
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
    if (!chat) {
        console.log('⚠️ Чат не найден');
        isProcessing = false;
        return;
    }
    
    chat.messages.push(userMsg);
    renderMessages(currentChatId);
    saveToStorage();

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
            console.log('🎨 Генерация картинки:', prompt);
            imageUrl = await generateImage(prompt);
            if (imageUrl) {
                responseText = `🎨 *Готово!*\n\nВот что получилось по запросу: "${prompt}"`;
            } else {
                responseText = `❌ Не удалось создать картинку. Попробуй другой запрос.`;
            }
        } else if (mode === 'code') {
            const codeQuery = text.replace(/^код/i, '').trim() || 'телеграм бот';
            console.log('💻 Генерация кода:', codeQuery);
            responseText = await generateCode(codeQuery);
        } else {
            console.log('💬 Поиск ответа на вопрос');
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
        console.log('✅ Ответ отправлен');

    } catch (error) {
        console.log('❌ Ошибка:', error);
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
        const encoded = encodeURIComponent(prompt);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        const response = await fetch(url);
        if (response.ok) {
            return response.url;
        }
        return null;
    } catch (e) {
        console.log('❌ Ошибка генерации картинки:', e);
        return null;
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

    for (const [key, value] of Object.entries(codes)) {
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
    } catch (e) {
        console.log('⚠️ Ошибка DuckDuckGo:', e);
    }

    return `🌐 *Не нашел информации.*\n\n💡 Попробуй:\n• Переформулировать вопрос\n• Спросить на английском\n• Задать более конкретный вопрос`;
}

// ===== СТАТУС =====
function updateStatus() {
    const badge = document.getElementById('statusBadge');
    if (badge) {
        badge.innerHTML = `<span class="status-dot"></span> Онлайн`;
    }
}

// ===== СОБЫТИЯ =====
function setupEventListeners() {
    console.log('🔧 Настройка обработчиков...');
    
    // Отправка по клику на кнопку
    if (sendBtn) {
        sendBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🖱️ Нажата кнопка отправки');
            sendMessage();
        });
    }
    
    // Отправка по Enter
    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                console.log('⌨️ Нажат Enter');
                sendMessage();
            }
        });
    }
    
    // Новый чат
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            console.log('➕ Создание нового чата');
            createNewChat();
        });
    }
    
    // Очистка всех чатов
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            console.log('🗑️ Очистка всех чатов');
            clearAllChats();
        });
    }
    
    console.log('✅ Обработчики настроены');
}

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен');
    init();
});

// Если DOM уже загружен
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 DOM уже загружен');
    init();
}
