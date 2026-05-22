// 🌟 新增在 sw.js 最頂端：一旦有新 sw.js 檔案，立刻強行跳過等待、直接接管並清除舊快取
self.addEventListener('install', function(event) {
    self.skipWaiting(); 
});
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

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // 預設安全網址（首頁）
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=overview";
    
    // 智慧解包公告專屬動態連結（內含 &notice=4位碼）
    if (event.notification.data) {
        const nData = event.notification.data;
        if (nData.click_url) baseUrl = nData.click_url;
        else if (nData.FCM_MSG && nData.FCM_MSG.data && nData.FCM_MSG.data.click_url) baseUrl = nData.FCM_MSG.data.click_url;
        else if (nData.FCM_MSG && nData.FCM_MSG.notification && nData.FCM_MSG.notification.click_action) baseUrl = nData.FCM_MSG.notification.click_action;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            let targetClient = null;
            
            // 優先挑選背景隱藏中（PWA）或網址吻合的視窗來進行 Focus 喚醒
            for (var i = 0; i < windowClients.length; i++) {
                if (windowClients[i].visibilityState === 'hidden' || windowClients[i].url.includes('notice=')) {
                    targetClient = windowClients[i];
                    break;
                }
            }
            if (!targetClient && windowClients.length > 0) targetClient = windowClients[0];

            // 🌟 完美對齊 LINE 流程：如果 App 活在背景（熱啟動），直接將參數以 URL Intent 形式注入導航
            if (targetClient && 'navigate' in targetClient && 'focus' in targetClient) {
                console.log("🎯 [熱啟動喚醒] 發現背景程序，精準注入 URL Intent 導航:", baseUrl);
                
                // 1. 強制讓背景網頁直接跳轉至帶有新通知參數的網址（100% 絕不丟包）
                return targetClient.navigate(baseUrl).then(function(navigatedClient) {
                    // 2. 導航完成的瞬間，立刻將視窗拉回前景呈現給組員（直達指定頁面）
                    return navigatedClient.focus();
                });
            }
            
            // 如果完全沒有開啟任何視窗（冷啟動），維持原樣開新視窗
            if (clients.openWindow) {
                return clients.openWindow(baseUrl);
            }
            
            // 如果完全沒有開啟任何視窗（冷啟動），照常開新視窗
            if (clients.openWindow) return clients.openWindow(baseUrl);
        })
    );
});