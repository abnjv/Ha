// ملف: ./js/auth_logic.js

document.addEventListener('DOMContentLoaded', () => {
    // تحديد العناصر الأساسية من الـ HTML
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');

    // وظيفة للتبديل بين نموذج تسجيل الدخول والتسجيل
    function switchForm(activeForm) {
        if (activeForm === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else if (activeForm === 'register') {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    }

    // إضافة مستمعي الأحداث لأزرار التبديل
    loginTab.addEventListener('click', () => switchForm('login'));
    registerTab.addEventListener('click', () => switchForm('register'));

    // وظيفة إظهار رسالة الإشعار (Toast)
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    window.showToast = showToast;

    // وظيفة لإظهار الـ Spinner (دوار التحميل)
    function showLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // معالجة حدث إرسال نموذج تسجيل الدخول
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showLoading(loginBtn, true);

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // محاكاة عملية تسجيل دخول
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (email === 'user@example.com' && password === 'password') {
            showToast('تم تسجيل الدخول بنجاح!', 'success');
            // هنا يمكنك إعادة توجيه المستخدم إلى صفحة الدردشة
            // window.location.href = 'index.html';
        } else {
            showToast('البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'error');
        }

        showLoading(loginBtn, false);
    });

    // معالجة حدث إرسال نموذج التسجيل
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showLoading(registerBtn, true);

        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (password !== confirmPassword) {
            showToast('كلمتا المرور غير متطابقتين!', 'error');
            showLoading(registerBtn, false);
            return;
        }

        // محاكاة عملية التسجيل
        await new Promise(resolve => setTimeout(resolve, 2000));

        showToast(`أهلاً بك يا ${username}! تم تسجيل حسابك بنجاح.`, 'success');

        showLoading(registerBtn, false);
        switchForm('login');
    });

});
