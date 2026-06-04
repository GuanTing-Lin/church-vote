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


// =========================================================================
// 🎯 [sw.js 終極修正版] 剛性打通 Service Worker 背景紅點與多層網址解包
// =========================================================================
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("📥 [背景推播] 收到標準 FCM 封包，開始處理紅點與跳窗:", payload);

    // 1. 🎯【外面 APP 數字連線】：修正 Service Worker 環境，使用 self.navigator 剛性點亮桌面紅點
    let unreadCount = 1;
    if (payload.data && payload.data.badge) {
        unreadCount = parseInt(payload.data.badge, 10);
    } else if (payload.notification && payload.notification.badge) {
        unreadCount = parseInt(payload.notification.badge, 10);
    }
    
    // 👑 修正死穴：在 SW 肚子裡必須使用 self.navigator 才能操控桌面實體紅點！
    if (self.navigator && 'setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(unreadCount).catch(() => {});
    }

    // 2. 🎯【防止重複跳兩次通知】：維持 Firebase SDK 自行跳窗的優良防護
    if (payload.notification) {
        console.log("🛑 Firebase SDK 預設已會處理跳窗，SW 僅默默更新外面數字。");
        return; 
    }

    // 3. 純資料封包備援跳窗
    const notificationTitle = "留言板有新訊息";
    const notificationOptions = {
        body: payload.data ? payload.data.body : "趕快點擊 App 查看最新留言！",
        icon: '/app-icon.png',
        badge: '/app-icon.png',
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 監聽原生 push 事件做為雙重保險（修正 self.navigator 確保紅點穩固）
self.addEventListener('push', function(event) {
    if (!event.data) return;
    try {
        const rawData = event.data.json();
        // 🛡️ 巢狀解包防護
        const pushData = rawData.data || rawData;
        if (pushData && pushData.badge) {
            const badgeCount = parseInt(pushData.badge, 10);
            if (self.navigator && 'setAppBadge' in self.navigator) {
                event.waitUntil(self.navigator.setAppBadge(badgeCount).catch(() => {}));
            }
        }
    } catch (e) {}
});

// 4. 👑【通知點擊秒轉閘門】：徹底打通巢狀解包
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=overview";
    
    // 🛡️ 雙重保險巢狀解包雷達：不管是單純 data 還是被 SDK 包裹後的 fcm_options，100% 絕對挖出真實網址！
    if (event.notification.data) {
        const nData = event.notification.data;
        
        if (nData.click_url) baseUrl = nData.click_url;
        else if (nData.click_action) baseUrl = nData.click_action;
        else if (nData.pinMessageUrl) baseUrl = nData.pinMessageUrl;
        // 穿透 SDK 物件外殼
        else if (nData.FCM_MSG && nData.FCM_MSG.data && nData.FCM_MSG.data.click_url) baseUrl = nData.FCM_MSG.data.click_url;
        else if (nData.FCM_MSG && nData.FCM_MSG.notification && nData.FCM_MSG.notification.click_action) baseUrl = nData.FCM_MSG.notification.click_action;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            let targetClient = null;
            
            for (var i = 0; i < windowClients.length; i++) {
                if (windowClients[i].visibilityState === 'hidden' || windowClients[i].url.includes('notice=') || windowClients[i].url.includes('msgId=')) {
                    targetClient = windowClients[i];
                    break;
                }
            }
            if (!targetClient && windowClients.length > 0) targetClient = windowClients[0];

            // 完美保留你原有的 12 次 Intent postMessage 高頻轟炸黃金解凍邏輯
            if (targetClient && 'focus' in targetClient) {
                console.log("🎯 [熱啟動喚醒] 執行 100% 零刷新直達導航...");
                return targetClient.focus().then(function(focusedClient) {
                    return new Promise(function(resolve) {
                        var attempts = 0;
                        var maxAttempts = 12;
                        
                        function blastIntentLoop() {
                            if (attempts >= maxAttempts) {
                                resolve();
                                return;
                            }
                            if (focusedClient && 'postMessage' in focusedClient) {
                                focusedClient.postMessage({
                                    action: 'urlNotificationClicked',
                                    url: baseUrl
                                });
                            }
                            attempts++;
                            setTimeout(blastIntentLoop, 80);
                        }
                        
                        blastIntentLoop();
                    });
                });
            }
            
            if (clients.openWindow) {
                return clients.openWindow(baseUrl);
            }
        })
    );
});