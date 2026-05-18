// ==========================================
// 🚀 Firebase FCM 推播背景接收器 (Service Worker)
// ==========================================

// 1. 引入 Firebase SDK (Service Worker 專用版)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 2. 初始化 Firebase (與前端 index.html 保持一致)
firebase.initializeApp({
    apiKey: "AIzaSyAibbxL5rnhH8iupuFC0gSxqSoJJftokgY",
    projectId: "trip-guide-cfdac",
    messagingSenderId: "464557372626",
    appId: "1:464557372626:web:c2bb8c82b90c6c094c290b"
});

const messaging = firebase.messaging();

// 3. 攔截背景推播並顯示 (會自動抓取 GAS 後台傳來的 title 和 body)
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw.js] 收到背景推播：', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'https://raw.githubusercontent.com/GuanTing-Lin/church-vote/main/yilan.png',
        badge: 'https://raw.githubusercontent.com/GuanTing-Lin/church-vote/main/yilan.png',
        data: payload.notification.click_action // 取出 GAS 裡設定的 click_action 網址
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. 監聽使用者點擊通知的動作，並打開網頁
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    // 如果推播有帶網址就開該網址，沒有就開首頁
    const urlToOpen = event.notification.data || "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1";
    event.waitUntil( clients.openWindow(urlToOpen) );
});