const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ВАШ API КЛЮЧ ТУТ =====
const API_KEY = 'sk-cp_3e5a6dcfe685f554e140efb93d77b628f2ac58356b50bd5c';
const API_URL = 'https://completions.me/v1/chat/completions';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== API ПРОКСИ =====
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model = 'gpt-4o-mini', max_tokens = 4096 } = req.body;

        console.log('📤 Отправка запроса в API...');
        console.log('Сообщений:', messages.length);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY,
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: max_tokens,
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Ошибка API:', data);
            return res.status(response.status).json({ 
                error: data.error || 'Ошибка API',
                details: data
            });
        }

        console.log('✅ Ответ получен');
        res.json(data);

    } catch (error) {
        console.error('❌ Серверная ошибка:', error.message);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            message: error.message 
        });
    }
});

// ===== ОТДАЁМ HTML =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== ЗАПУСК =====
app.listen(PORT, () => {
    console.log('✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦');
    console.log('✦  AURORA AI ЗАПУЩЕН!        ✦');
    console.log('✦  Порт: ' + PORT);
    console.log('✦  http://localhost:' + PORT);
    console.log('✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦');
    console.log('☯ API ключ загружен');
    console.log('⌛ Жду запросов...');
});
