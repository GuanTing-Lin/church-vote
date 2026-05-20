importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyAibbxL5rnhH8iupuFC0gSxqSoJJftokgY",
    projectId: "trip-guide-cfdac",
    messagingSenderId: "464557372626",
    appId: "1:464557372626:web:c2bb8c82b90c6c094c290b"
});

const messaging = firebase.messaging();

// 🌟 使用 Firebase 標準背景監聽器，確保 iOS 喚醒 PWA 機制完全打通
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw.js] 收到背景推播：', payload);
    
    // 當你在其他分頁或 App 關閉時，叫系統強制更新一次桌面數字
    if (payload.data && payload.data.badge) {
        const badgeCount = parseInt(payload.data.badge, 10);
        if ('setAppBadge' in navigator) {
            navigator.setAppBadge(badgeCount).catch(() => {});
        }
    }
});

// 保留原有的推播事件，做雙重保險與點擊導流
self.addEventListener('push', function(event) {
    if (!event.data) return;
    try {
        const rawData = event.data.json();
        const pushData = rawData.data || rawData;
        const badgeCount = parseInt(pushData.badge || "1", 10);
        
        if ('setAppBadge' in navigator) {
            event.waitUntil(navigator.setAppBadge(badgeCount));
        }
    } catch (e) {}
});

// 監聽點擊通知跳轉留言板
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=board";
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if ('navigate' in client && 'focus' in client) {
                    client.navigate(baseUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(baseUrl);
        })
    );
});