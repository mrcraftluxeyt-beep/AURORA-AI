// ============================================================
//  ОТПРАВКА КОДА НА EMAIL
// ============================================================
async function sendCodeToEmail(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    state.pendingEmail = email;
    
    try {
        const response = await fetch('/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем код для проверки
            localStorage.setItem('verification_code', code);
            localStorage.setItem('verification_email', email);
            
            const authStatus = document.getElementById('authStatus');
            authStatus.innerHTML = `✅ Код отправлен на ${email}`;
            authStatus.style.color = '#4ade80';
            
            // ⭐ ПОКАЗЫВАЕМ ПОЛЕ ДЛЯ КОДА
            const codeSection = document.getElementById('codeSection');
            if (codeSection) {
                codeSection.style.display = 'flex';  // ← ЭТА СТРОКА ОТВЕЧАЕТ ЗА ПОКАЗ
            }
            
            // Меняем кнопку
            const sendCodeBtn = document.getElementById('sendCodeBtn');
            if (sendCodeBtn) {
                sendCodeBtn.disabled = true;
                sendCodeBtn.textContent = 'Код отправлен';
            }
            
            console.log(`📧 Код ${code} отправлен на ${email}`);
        } else {
            throw new Error(data.error || 'Ошибка отправки');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        const authStatus = document.getElementById('authStatus');
        authStatus.textContent = '❌ Не удалось отправить код. Попробуйте позже.';
        authStatus.style.color = '#f87171';
    }
}
