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
    /*
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'https://raw.githubusercontent.com/GuanTing-Lin/church-vote/main/yilan.png',
        badge: 'https://raw.githubusercontent.com/GuanTing-Lin/church-vote/main/yilan.png',
        data: payload.notification.click_action
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
    */
});

// 4. 監聽使用者點擊通知的動作，並打開網頁
self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    try {
        const payload = event.data.json();
        const pushData = payload.data || {};
        
        const title = pushData.custom_title || "香草山旅遊指南";
        const body = pushData.custom_body || "";
        const badgeCount = parseInt(pushData.badge || "1", 10);
        
        // 🌟 核心改動：如果後端有傳大頭照過來，就用大頭照；沒有就用預設 Logo
        const notificationIcon = pushData.custom_icon || "yilan.png";

        const notificationOptions = {
            body: body,
            icon: notificationIcon, // 🌟 這裡動態換成留言者的大頭照網址！
            badge: "app-icon.png", // 狀態列小圖標維持固定的 App 剪影
            data: {
                click_action: "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=board"
            }
        };

        event.waitUntil(
            Promise.all([
                self.registration.showNotification(title, notificationOptions),
                ('setAppBadge' in navigator) ? navigator.setAppBadge(badgeCount) : Promise.resolve()
            ])
        );
    } catch (err) {
        console.error("背景收到推播處理失敗:", err);
    }
});