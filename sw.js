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

            if (targetClient && 'focus' in targetClient) {
                // 🌟【絕殺修改】：先呼叫 focus() 叫醒網頁，逼 iOS 解凍 JavaScript 執行緒
                return targetClient.focus().then(function() {
                    return new Promise(function(resolve) {
                        // 延遲 300 毫秒等網頁靈魂完全歸位，確保不漏接訊息
                        setTimeout(function() {
                            // 🌟【解鎖核心】：全面廣播！對所有控制下的視窗投遞跳轉指令
                            // 如此一來，不論通知從哪裡發出，背景的 PWA 都絕對能即時收到訊號！
                            windowClients.forEach(function(client) {
                                if (client && 'postMessage' in client) {
                                    client.postMessage({ action: 'urlNotificationClicked', url: baseUrl });
                                }
                            });
                            resolve();
                        }, 300);
                    });
                });
            }
            
            // 如果完全沒有開啟任何視窗（冷啟動），照常開新視窗
            if (clients.openWindow) return clients.openWindow(baseUrl);
        })
    );
});