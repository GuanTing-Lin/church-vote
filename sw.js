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
// 🌟 完整替換 sw.js 最底部的 notificationclick 監聽器
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // 預設安全網址（改為首頁）
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=overview";
    
    // 智慧解包公告專屬連結
    if (event.notification.data) {
        const nData = event.notification.data;
        if (nData.click_url) baseUrl = nData.click_url;
        else if (nData.FCM_MSG && nData.FCM_MSG.data && nData.FCM_MSG.data.click_url) baseUrl = nData.FCM_MSG.data.click_url;
        else if (nData.FCM_MSG && nData.FCM_MSG.notification && nData.FCM_MSG.notification.click_action) baseUrl = nData.FCM_MSG.notification.click_action;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // 1. 【熱啟動防護】：如果發現 App 已經在後台開著了
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if ('focus' in client) {
                    // 🌟 核心修正：先呼叫 focus() 逼系統把背景凍結的網頁強制推到前台並解凍
                    return client.focus().then(function(focusedClient) {
                        // 建立一個延遲機制，等前台網頁的 JS 完全清醒後再投遞訊號，訊息絕不漏接！
                        return new Promise(function(resolve) {
                            setTimeout(function() {
                                if (focusedClient && 'postMessage' in focusedClient) {
                                    focusedClient.postMessage({ action: 'urlNotificationClicked', url: baseUrl });
                                }
                                resolve();
                            }, 250); // 延遲 250ms 等網頁靈魂歸位
                        });
                    });
                }
            }
            // 2. 【冷啟動】：如果 App 原本是徹底關閉的，直接開新視窗載入網址
            if (clients.openWindow) return clients.openWindow(baseUrl);
        })
    );
});