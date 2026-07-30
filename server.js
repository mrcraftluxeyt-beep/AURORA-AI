const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Раздаём статику из текущей папки

// ===== GOOGLE OAuth =====
const GOOGLE_CLIENT_ID = '628204875071-e8h6pvurpbpnpj4f2ntii60i9qstuk31.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'ВАШ_GOOGLE_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// Отправляем пользователя в Google
app.get('/auth/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=email%20profile`;
    res.redirect(url);
});

// Обработка ответа от Google
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    try {
        // Получаем токен
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });
        
        const tokenData = await tokenResponse.json();
        const { access_token } = tokenData;
        
        // Получаем данные пользователя
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        
        const userData = await userResponse.json();
        
        // Отправляем данные на фронтенд
        res.send(`
            <script>
                localStorage.setItem('aurora_user', JSON.stringify({
                    id: 'google_' + Date.now(),
                    name: '${userData.name}',
                    email: '${userData.email}',
                    provider: 'google'
                }));
                window.location.href = '/';
            </script>
        `);
        
    } catch (error) {
        res.status(500).send('Ошибка авторизации');
    }
});

app.listen(3000, () => {
    console.log('🚀 Сервер запущен на http://localhost:3000');
});
