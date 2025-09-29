// ======================================================
// تحميل بيانات info.json ثم تشغيل التطبيق
// ======================================================

let CONFIG = {};

fetch('info.json')
    .then(response => {
        if (!response.ok) throw new Error('فشل تحميل info.json');
        return response.json();
    })
    .then(data => {
        CONFIG = data;
        // بدء التحقق من حالة الدخول بعد تحميل الإعدادات
        checkLogin();
    })
    .catch(err => {
        console.error('خطأ بتحميل ملف الإعدادات:', err);
        alert('❌ لم يتم العثور على ملف info.json أو حدث خطأ في قراءته.');
    });

// مفتاح التخزين المحلي
const STORAGE_KEY = "sales_info_data";

// عناصر DOM
const loginForm = document.getElementById('login-form');
const salesForm = document.getElementById('sales-form');
const loginMessage = document.getElementById('login-message');
const statusMessage = document.getElementById('status-message');
const salesList = document.getElementById('sales-list');

// ======================================================
// 1. إدارة الدخول والخروج
// ======================================================

function checkLogin() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        loginForm.classList.add('hidden');
        salesForm.classList.remove('hidden');
        loadSalesHistory();
    } else {
        loginForm.classList.remove('hidden');
        salesForm.classList.add('hidden');
    }
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    loginMessage.textContent = '';

    if (username === CONFIG.manager_username && password === CONFIG.manager_password) {
        localStorage.setItem('isLoggedIn', 'true');
        checkLogin();
    } else {
        loginMessage.textContent = '❌ اسم المستخدم أو كلمة السر غير صحيحة.';
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    checkLogin();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    statusMessage.textContent = '';
}

// ======================================================
// 2. معالجة وحفظ البيانات
// ======================================================

function getSalesData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveSalesData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatTelegramMessage(data) {
    const date = new Date(data.timestamp).toLocaleString('ar-IQ', {
        dateStyle: 'short',
    });

    return `
💰 *عملية مبيعات جديدة!* 💰
---------------------------------

 * ✨النوع:* ${data.category}

 * 💸 المبلغ:* ${data.price_iqd.toLocaleString('ar-IQ')} دينار عراقي

 *⏰ التاريخ:* ${date}

 *📄 الملاحظات:* ${data.notes}

---------------------------------
`;
}

function handleSubmit(event) {
    event.preventDefault();

    const salesData = {
        category: document.getElementById('category').value,
        price_iqd: parseFloat(document.getElementById('price').value),
        notes: document.getElementById('notes').value.trim() || 'لا توجد ملاحظات',
        timestamp: new Date().toISOString()
    };

    const history = getSalesData();
    history.push(salesData);
    saveSalesData(history);

    const formattedMessage = formatTelegramMessage(salesData);

    fetch(`https://api.telegram.org/bot${CONFIG.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CONFIG.chat_id,
                text: formattedMessage,
                parse_mode: 'Markdown'
            })
        })
        .then(r => r.json())
        .then(d => console.log('Telegram Response:', d))
        .catch(e => console.error('Error sending to Telegram:', e));


    statusMessage.textContent = `✅ تم الحفظ بنجاح! تم إرسال الرسالة التالية لمحاكاة النشر: \n${formattedMessage}`;
    statusMessage.classList.remove('error-msg');
    statusMessage.classList.add('success-msg');

    loadSalesHistory();
    document.getElementById('category').value = "";
    document.getElementById('price').value = "";
    document.getElementById('notes').value = "";
}

// ======================================================
// 3. عرض سجل البيانات
// ======================================================

function loadSalesHistory() {
    const history = getSalesData().reverse();
    salesList.innerHTML = '';

    if (history.length === 0) {
        salesList.innerHTML = '<li style="color: #6c757d;">لا توجد عمليات مبيعات مسجلة بعد.</li>';
        return;
    }

    history.forEach(data => {
        const date = new Date(data.timestamp).toLocaleDateString('ar-IQ');
        const time = new Date(data.timestamp).toLocaleTimeString('ar-IQ');

        const listItem = document.createElement('li');
        listItem.style.borderBottom = '1px dashed #ddd';
        listItem.style.padding = '8px 0';
        listItem.style.fontSize = '14px';
        listItem.innerHTML = `
            <strong>${data.category}</strong> - ${data.price_iqd.toLocaleString('ar-IQ')} د.ع
            <span style="float: left; color: #6c757d; font-size: 12px;">${date} ${time}</span>
            <div style="font-size: 12px; color: #333;">${data.notes.substring(0, 40)}...</div>
        `;
        salesList.appendChild(listItem);
    });
}

// ======================================================
// 4. تحميل نسخة من info.json (السجل) محلياً
// ======================================================

function downloadData() {
    const data = getSalesData();
    const json = JSON.stringify(data, null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'info.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("تم تحميل ملف info.json بنجاح!");
}