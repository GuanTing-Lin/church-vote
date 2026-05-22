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

            // =========================================================================
            // 🌟 完美對齊 LINE 流程：熱啟動（App活在背景）絕不重新整理網頁，改用高頻 Intent 轟炸
            // =========================================================================
            if (targetClient && 'focus' in targetClient) {
                console.log("🎯 [熱啟動喚醒] 偵測到背景 PWA，執行 100% 零刷新直達導航...");
                
                // 1. 先把網頁拉回前景
                return targetClient.focus().then(function(focusedClient) {
                    // 2. 🚀【Intent 衝擊波迴圈】：為了對抗手機硬體解凍 JavaScript 的時間差
                    // 我們在 1 秒內以極高頻率（每 80 毫秒）連續轟炸發射 12 次 postMessage
                    // 網頁不論在第幾毫秒清醒，都一定會無縫咬合接到參數，原地秒轉，完全不用重新整理！
                    var attempts = 0;
                    var maxAttempts = 12;
                    
                    function blastIntentLoop() {
                        if (attempts >= maxAttempts) return;
                        if (focusedClient && 'postMessage' in focusedClient) {
                            focusedClient.postMessage({
                                action: 'urlNotificationClicked',
                                url: baseUrl
                            });
                        }
                        attempts++;
                        setTimeout(blastIntentLoop, 80); // 每 80 毫秒發射一次，完美覆蓋整段解凍安全期
                    }
                    
                    blastIntentLoop(); // 轟炸引爆
                });
            }
            
            // 冷啟動路徑維持不變（App完全關閉時）：直接開新視窗
            if (clients.openWindow) {
                return clients.openWindow(baseUrl);
            }
            
        })
    );
});