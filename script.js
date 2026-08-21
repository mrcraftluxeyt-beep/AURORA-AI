// ===== CONFIG =====
const CONFIG = {
    API_KEY: 'sk-cp_3e5a6dcfe685f554e140efb93d77b628f2ac58356b50bd5c',
    API_URL: 'https://completions.me/v1/chat/completions',
    MODEL: 'gpt-4o-mini',
    MAX_TOKENS: 4096,
};

// ===== STATE =====
let chats = [];
let currentChatId = null;
let isSending = false;

// ===== EMOJI SET (нестандартные) =====
const EMOJIS = {
    user: '☯',
    assistant: '✦',
    newChat: '✧',
    delete: '✕',
    thinking: '⌛',
    error: '⚠',
    welcome: '⌛',
    code: '⎚',
    idea: '✧',
    explain: '⊜',
    ai: '⏣',
    dot: '•',
    sparkle: '✦',
};

// ===== DOM REFS =====
const messagesEl = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcomeScreen');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatList = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadChats();
    if (chats.length === 0) {
        createNewChat();
    } else {
        renderChatList();
        loadChat(chats[0].id);
    }
    setupEventListeners();
    autoResizeInput();
});

// ===== CHAT CRUD =====
function createNewChat() {
    const chat = {
        id: Date.now().toString(),
        name: `Чат ${chats.length + 1}`,
        messages: [],
        created: new Date().toISOString(),
    };
    chats.unshift(chat);
    saveChats();
    renderChatList();
    loadChat(chat.id);
}

function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    renderChatList();
    renderMessages(chat.messages);
    updateHeader(chat.name);
}

function deleteChat(chatId, e) {
    e.stopPropagation();
    if (chats.length === 1) {
        // Очищаем сообщения, но не удаляем последний чат
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.messages = [];
            saveChats();
            loadChat(chatId);
        }
        return;
    }
    chats = chats.filter(c => c.id !== chatId);
    saveChats();
    if (currentChatId === chatId) {
        loadChat(chats[0].id);
    }
    renderChatList();
}

function updateChatName(chatId, firstMessage) {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.name === `Чат ${chats.indexOf(chat) + 1}`) {
        chat.name = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
        saveChats();
        renderChatList();
        updateHeader(chat.name);
    }
}

// ===== RENDER =====
function renderChatList() {
    chatList.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        div.innerHTML = `
            <span class="chat-icon">${EMOJIS.sparkle}</span>
            <span class="chat-name">${chat.name}</span>
            <button class="chat-delete" data-id="${chat.id}">${EMOJIS.delete}</button>
        `;
        div.addEventListener('click', () => loadChat(chat.id));
        const delBtn = div.querySelector('.chat-delete');
        delBtn.addEventListener('click', (e) => deleteChat(chat.id, e));
        chatList.appendChild(div);
    });
}

function renderMessages(messages) {
    if (messages.length === 0) {
        welcomeScreen.style.display = 'flex';
        messagesEl.innerHTML = '';
        return;
    }
    welcomeScreen.style.display = 'none';
    messagesEl.innerHTML = '';
    messages.forEach(msg => {
        messagesEl.appendChild(createMessageElement(msg));
    });
    scrollToBottom();
}

function createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    const avatar = msg.role === 'user' ? EMOJIS.user : EMOJIS.assistant;
    div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="content">${formatMessage(msg.content)}</div>
    `;
    return div;
}

function formatMessage(text) {
    // Простой Markdown-подобный формат
    return text
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function updateHeader(name) {
    document.querySelector('.model-badge').textContent = `✦ ${name}`;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isSending) return;

    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;

    // Добавляем сообщение пользователя
    chat.messages.push({ role: 'user', content: text });
    saveChats();
    renderMessages(chat.messages);
    userInput.value = '';
    autoResizeInput();

    // Обновляем название чата
    if (chat.messages.length === 1) {
        updateChatName(chat.id, text);
    }

    // Показываем индикатор печати
    isSending = true;
    sendBtn.disabled = true;
    const typingEl = showTyping();

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: chat.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                max_tokens: CONFIG.MAX_TOKENS,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `Ошибка ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '¯\\_(ツ)_/¯ Нет ответа';

        // Убираем индикатор
        typingEl.remove();

        // Добавляем ответ
        chat.messages.push({ role: 'assistant', content: reply });
        saveChats();
        renderMessages(chat.messages);

    } catch (error) {
        typingEl.remove();
        // Показываем ошибку с нестандартным эмодзи
        const errorMsg = {
            role: 'assistant',
            content: `${EMOJIS.error} Ой! ${error.message || 'Что-то пошло не так.'}\nПроверь API-ключ или попробуй позже.`,
        };
        chat.messages.push(errorMsg);
        saveChats();
        renderMessages(chat.messages);
    } finally {
        isSending = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = `
        <span>${EMOJIS.thinking}</span>
        <span>${EMOJIS.dot}</span>
        <span>${EMOJIS.dot}</span>
        <span>${EMOJIS.dot}</span>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
}

// ===== STORAGE =====
function saveChats() {
    try {
        localStorage.setItem('aurora_chats', JSON.stringify(chats));
    } catch (e) {}
}

function loadChats() {
    try {
        const data = localStorage.getItem('aurora_chats');
        if (data) {
            chats = JSON.parse(data);
        }
    } catch (e) {
        chats = [];
    }
}

// ===== HELPERS =====
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function autoResizeInput() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
}

// ===== EVENTS =====
function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    userInput.addEventListener('input', autoResizeInput);

    newChatBtn.addEventListener('click', () => {
        createNewChat();
        userInput.focus();
    });

    // Suggestions
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            userInput.value = btn.textContent;
            sendMessage();
        });
    });

    // Ctrl+Enter для отправки (запасной вариант)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            sendMessage();
        }
    });
}

console.log(`${EMOJIS.ai} AURORA AI готов к работе!`);
