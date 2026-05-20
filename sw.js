// ==================================================
// 🚀 Firebase FCM 推播背景接收器 (安全復原版)
// ==================================================

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyAibbxL5rnhH8iupuFC0gSxqSoJJftokgY",
    projectId: "trip-guide-cfdac",
    messagingSenderId: "464557372626",
    appId: "1:464557372626:web:c2bb8c82b90c6c094c290b"
});

const messaging = firebase.messaging();

// 🌟 讓 Firebase SDK 原生接管背景通知，這能 100% 保證通知絕對跳得出來
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw.js] 收到背景推播：', payload);
    
    // 如果系統有支援，且收到的資料有 badge，嘗試在背景更新紅點
    try {
        if (payload.data && payload.data.badge) {
            const badgeCount = parseInt(payload.data.badge, 10);
            if ('setAppBadge' in navigator) {
                navigator.setAppBadge(badgeCount).catch(() => {});
            }
        }
    } catch (e) {
        console.error("更新紅點失敗", e);
    }
});

// 監聽點擊通知動作：精準導流到留言板
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