// ==================================================
// 🚀 Firebase FCM 推播背景接收器 (iOS/Android 終極相容版)
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

// 1. 當 App 處於背景，或使用者在使用其他分頁時觸發
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw.js] 攔截到背景資料：', payload);
    
    // 提取紅點數字
    let badgeCount = 1;
    if (payload.data && payload.data.badge) {
        badgeCount = parseInt(payload.data.badge, 10);
    }

    // 🌟 如果使用者開著 App 但在看其他分頁，動態把桌面跟網頁內的數字同步刷新
    if ('setAppBadge' in navigator) {
        navigator.setAppBadge(badgeCount).catch(() => {});
    }
});

// 2. 監聽標準 push 事件 (確保系統在各種休眠狀態下都能相容)
self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    try {
        const rawData = event.data.json();
        // 優先讀取自訂的 data 欄位
        const pushData = rawData.data || rawData;
        const badgeCount = parseInt(pushData.badge || "1", 10);
        
        if ('setAppBadge' in navigator) {
            event.waitUntil(navigator.setAppBadge(badgeCount).catch(() => {}));
        }
    } catch (e) {
        console.log("Push 事件背景處理略過");
    }
});

// 3. 監聽點擊通知動作 (直接跳轉至留言板分頁)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // 點擊直接開啟並切換至留言板
    let targetUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=board";
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // 如果已經有開著的 App 視窗，直接導航並導焦
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if ('navigate' in client && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // 如果都沒開，才開新視窗
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});