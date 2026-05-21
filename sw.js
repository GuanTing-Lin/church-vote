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

// 🌟 完整替換 sw.js 最底部的 notificationclick 監聽器
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=overview";
    
    if (event.notification.data) {
        const nData = event.notification.data;
        if (nData.click_url) baseUrl = nData.click_url;
        else if (nData.FCM_MSG && nData.FCM_MSG.data && nData.FCM_MSG.data.click_url) baseUrl = nData.FCM_MSG.data.click_url;
        else if (nData.FCM_MSG && nData.FCM_MSG.notification && nData.FCM_MSG.notification.click_action) baseUrl = nData.FCM_MSG.notification.click_action;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // 🌟 終極解法：只要 App 在背景開著，直接用 navigate 強制變更該視窗的網址！
            // 這會強制叫醒 iPhone 凍結的執行緒，並直接讓它走最穩定的網址路由解析軌道
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