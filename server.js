const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ============================================================
//  КОНФИГУРАЦИЯ
// ============================================================

// Google OAuth
const GOOGLE_CLIENT_ID = '628204875071-e8h6pvurpbpnpj4f2ntii60i9qstuk31.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '6LfLDW0tAAAAAOLrSk9fCKiAQAb0YzxeGFlvV9DA';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// reCAPTCHA
const RECAPTCHA_SECRET = '6LfLDW0tAAAAAOLrSk9fCKiAQAb0YzxeGFlvV9DA';

// ============================================================
//  НАСТРОЙКА EMAIL (Gmail)
// ============================================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mrcraftluxd@gmail.com',      // ← ВСТАВЬТЕ ВАШУ ПОЧТУ
        pass: 'kjav ohbn lqel xtzd'      // ← ВСТАВЬТЕ ПАРОЛЬ ПРИЛОЖЕНИЯ
    }
});

// ============================================================
//  ЭНДПОИНТ: ОТПРАВКА КОДА
// ============================================================
app.post('/send-code', async (req, res) => {
    const { email, code } = req.body;
    
    if (!email || !code) {
        return res.status(400).json({ error: 'Email и код обязательны' });
    }
    
    try {
        // Отправляем письмо
        await transporter.sendMail({
            from: '"AURORA AI" <ВАША_ПОЧТА@gmail.com>',
            to: email,
            subject: '🌌 Код подтверждения AURORA',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0b0d15; border-radius: 16px; color: #e8edf5;">
                    <h1 style="text-align: center; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px;">🌌 AURORA</h1>
                    <p style="text-align: center; color: #8892b0; font-size: 16px;">Ваш код подтверждения</p>
                    <div style="text-align: center; padding: 20px; background: #141824; border-radius: 12px; margin: 20px 0; border: 1px solid #2a2f42;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #a78bfa; font-family: monospace;">${code}</span>
                    </div>
                    <p style="text-align: center; color: #8892b0; font-size: 14px;">Этот код действителен в течение 10 минут.</p>
                    <p style="text-align: center; color: #4a4f62; font-size: 12px; margin-top: 20px;">Если вы не запрашивали код — проигнорируйте это письмо.</p>
                </div>
            `
        });
        
        console.log(`📧 Код ${code} отправлен на ${email}`);
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Ошибка отправки email:', error);
        res.status(500).json({ error: 'Не удалось отправить код' });
    }
});

// ============================================================
//  GOOGLE OAuth
// ============================================================
app.get('/auth/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=email%20profile`;
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
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
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();
        res.send(`
            <script>
                localStorage.setItem('aurora_user', JSON.stringify({
                    id: 'google_' + Date.now(),
                    name: '${userData.name}',
                    email: '${userData.email}',
                    provider: 'google',
                    avatar: '${userData.picture || ''}'
                }));
                window.location.href = '/';
            </script>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка авторизации через Google');
    }
});

// ============================================================
//  ПРОВЕРКА reCAPTCHA
// ============================================================
app.post('/verify-recaptcha', async (req, res) => {
    const { token } = req.body;
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${RECAPTCHA_SECRET}&response=${token}`
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  ЗАПУСК
// ============================================================
app.listen(3000, () => {
    console.log('🚀 Сервер AURORA запущен!');
    console.log('📡 Откройте http://localhost:3000');
    console.log('📧 Email отправка настроена');
});
