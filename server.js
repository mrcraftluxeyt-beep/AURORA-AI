const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// API прокси (чтобы скрыть ключ на фронте)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model = 'gpt-4o-mini', max_tokens = 4096 } = req.body;

        const response = await fetch('https://completions.me/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_KEY || 'sk-cp_3e5a6dcfe685f554e140efb93d77b628f2ac58356b50bd5c'}`,
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens,
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error || 'Ошибка API' });
        }

        res.json(data);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Отдаём index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✦ AURORA AI запущен на http://localhost:${PORT}`);
    console.log(`☯ Используй API: http://localhost:${PORT}/api/chat`);
});
