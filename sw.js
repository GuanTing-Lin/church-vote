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
// 🎯 [sw.js 修正段落] 補上背景紅點與防止通知跳兩次核心
// =========================================================================
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("📥 [背景推播] 收到標準 FCM 封包，開始處理紅點與跳窗:", payload);

    // 1. 🎯【外面 APP 數字連線】：在背景收到通知時，強制撈取後台帶來的 badge 數量，並同步到外面桌面 APP 圖示上！
    let unreadCount = 1;
    if (payload.data && payload.data.badge) {
        unreadCount = parseInt(payload.data.badge, 10);
    } else if (payload.notification && payload.notification.badge) {
        unreadCount = parseInt(payload.notification.badge, 10);
    }
    
    if ('setAppBadge' in navigator) {
        navigator.setAppBadge(unreadCount).catch(() => {});
    }

    // 2. 🎯【防止重複跳兩次通知】：如果這則推播已經有標準的 notification 欄位，
    // Firebase SDK 本身就會自動強制跳窗了，這裡我們就直接 return，絕對不要再重複呼叫 showNotification！
    if (payload.notification) {
        console.log("🛑 Firebase SDK 預設已會處理跳窗，SW 攔截重複彈窗，僅默默更新外面數字。");
        return; 
    }

    // 3. 萬一後台發送的是純資料封包 (Data Message)，SDK 不會自動跳窗，才由 SW 來補發通知橫幅
    const notificationTitle = "留言板有新訊息";
    const notificationOptions = {
        body: payload.data ? payload.data.body : "趕快點擊 App 查看最新留言！",
        icon: '/app-icon.png',
        badge: '/app-icon.png',
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
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
            // 🌟 完美對齊 LINE 流程：熱啟動（App活在背景）全防護 Intent 衝擊波防死鎖版
            // =========================================================================
            if (targetClient && 'focus' in targetClient) {
                console.log("🎯 [熱啟動喚醒] 偵測到背景 PWA，執行 100% 零刷新直達導航...");
                
                // 1. 先把網頁拉回前景
                return targetClient.focus().then(function(focusedClient) {
                    // 2. 🚀【生命週期鎖定】：用 Promise 強制留住 Service Worker 的呼吸，確保 12 次高頻轟炸絕對不被系統中途掐死！
                    return new Promise(function(resolve) {
                        var attempts = 0;
                        var maxAttempts = 12;
                        
                        function blastIntentLoop() {
                            if (attempts >= maxAttempts) {
                                resolve(); // 12次發射完畢，這時才允許 Service Worker 休息關閉
                                return;
                            }
                            if (focusedClient && 'postMessage' in focusedClient) {
                                focusedClient.postMessage({
                                    action: 'urlNotificationClicked',
                                    url: baseUrl
                                });
                            }
                            attempts++;
                            setTimeout(blastIntentLoop, 80); // 每 80 毫秒發射一次，完美覆蓋整段解凍期
                        }
                        
                        blastIntentLoop(); // 轟炸引爆
                    });
                });
            }
            
            // 冷啟動路徑維持不變（App完全關閉時）：直接開新視窗
            if (clients.openWindow) {
                return clients.openWindow(baseUrl);
            }
            
        })
    );
});