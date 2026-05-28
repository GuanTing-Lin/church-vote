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

// =========================================================================
// 🎯 [sw.js 還原完全體] 拋棄所有本地靜音攔截，回歸標準通知推播與跳窗
// =========================================================================
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 🌟 請用你原本的 Firebase Config 設定直接貼在下方
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 🌟 背景收到 FCM 訊息時，不作任何邏輯干擾，100% 正常彈出手機系統橫幅
messaging.onBackgroundMessage((payload) => {
    console.log("📥 [背景推播] 收到標準 FCM 封包，準備正常跳出手機橫幅:", payload);

    const notificationTitle = payload.notification ? payload.notification.title : "留言板有新訊息";
    const notificationOptions = {
        body: payload.notification ? payload.notification.body : "趕快點擊 App 查看最新留言！",
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