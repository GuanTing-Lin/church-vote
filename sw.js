// ==================================================
// 🚀 Firebase FCM 推播背景接收器 (終極穩定版)
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

// 讓 Firebase SDK 原生接管通知彈窗，保證通知 100% 跳出
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw.js] 收到背景推播：', payload);
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

// 監聽原生 push 事件做為雙重保險（確保 Android/部分 iOS 在背景能同步刷上數字）
self.addEventListener('push', function(event) {
    if (!event.data) return;
    try {
        const rawData = event.data.json();
        const pushData = rawData.data || rawData;
        if (pushData && pushData.badge) {
            const badgeCount = parseInt(pushData.badge, 10);
            if ('setAppBadge' in navigator) {
                event.waitUntil(navigator.setAppBadge(badgeCount).catch(() => {}));
            }
        }
    } catch (e) {}
});

// 監聽點擊通知動作：精準導流到留言板
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // 1. 動態解包：優先抓取後端傳來的公告專屬網址（內含 &notice=4位碼），若沒有則回退到留言板
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=board";
    if (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.notification && event.notification.data.FCM_MSG.notification.click_action) {
        baseUrl = event.notification.data.FCM_MSG.notification.click_action;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // 2. 核心優化：直接利用 client.navigate 強制原本已開啟的 PWA 視窗轉跳至新網址！
                // 這樣能徹底繞過 iOS 背景凍結的限制，強迫網頁重新解析網址參數！
                if ('navigate' in client && 'focus' in client) {
                    client.navigate(baseUrl);
                    return client.focus(); // 喚醒並推到最前台
                }
            }
            if (clients.openWindow) return clients.openWindow(baseUrl);
        })
    );
});