// ===== CONFIG =====
const CONFIG = {
    API_URL: 'https://lively-scene-08ef.mrcraftluxe.workers.dev',
    MODEL: 'gpt-4o-mini',
    MAX_TOKENS: 4096,
};

// ===== STATE =====
let chats = [];
let currentChatId = null;
let isSending = false;

// ===== EMOJI SET =====
const EMOJIS = {
    user: '☯',
    assistant: '✦',
    newChat: '✧',
    delete: '✕',
    thinking: '⌛',
    error: '⚠',
    welcome: '⌛',
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
const messagesContainer = document.getElementById('messagesContainer');

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
    userInput.focus();
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
    return text
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function updateHeader(name) {
    const badge = document.querySelector('.model-badge');
    if (badge) badge.textContent = `✦ ${name}`;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isSending) return;

    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;

    // Add user message
    chat.messages.push({ role: 'user', content: text });
    saveChats();
    renderMessages(chat.messages);
    userInput.value = '';
    autoResizeInput();

    // Update chat name
    if (chat.messages.length === 1) {
        updateChatName(chat.id, text);
    }

    // Show typing indicator
    isSending = true;
    sendBtn.disabled = true;
    const typingEl = showTyping();

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: chat.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                model: CONFIG.MODEL,
                max_tokens: CONFIG.MAX_TOKENS,
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Ошибка ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '¯\\_(ツ)_/¯ Нет ответа';

        typingEl.remove();

        chat.messages.push({ role: 'assistant', content: reply });
        saveChats();
        renderMessages(chat.messages);

    } catch (error) {
        typingEl.remove();
        chat.messages.push({
            role: 'assistant',
            content: `${EMOJIS.error} Ой! ${error.message || 'Что-то пошло не так.'}`
        });
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
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        setTimeout(() => userInput.focus(), 100);
    });

    // Suggestions
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            userInput.value = btn.textContent;
            sendMessage();
        });
    });
}

console.log('✦ AURORA AI готов к работе!');
