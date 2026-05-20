// ==========================================
// 🚀 Firebase FCM 推播背景接收器 (Service Worker)
// ==========================================

// 1. 引入 Firebase SDK (Service Worker 專用版)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 2. 初始化 Firebase (與前端 index.html 保持一致)
firebase.initializeApp({
    apiKey: "AIzaSyAibbxL5rnhH8iupuFC0gSxqSoJJftokgY",
    projectId: "trip-guide-cfdac",
    messagingSenderId: "464557372626",
    appId: "1:464557372626:web:c2bb8c82b90c6c094c290b"
});

const messaging = firebase.messaging();

// 3. 攔截背景推播並顯示 (會自動抓取 GAS 後台傳來的 title 和 body)
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw.js] 收到背景推播：', payload);
    /*
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'https://raw.githubusercontent.com/GuanTing-Lin/church-vote/main/yilan.png',
        badge: 'https://raw.githubusercontent.com/GuanTing-Lin/church-vote/main/yilan.png',
        data: payload.notification.click_action
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
    */
});

// 4. 監聽使用者點擊通知的動作，並打開網頁
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // 預設首頁網址
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1";
    
    // 1. 嘗試從 FCM V1 的標準欄位抓取 click_action
    let urlToOpen = event.notification.clickAction || baseUrl;
    
    // 2. 防呆：如果上面沒抓到，嘗試從 data 裡面找
    if (event.notification.data && event.notification.data.click_action) {
        urlToOpen = event.notification.data.click_action;
    } else if (typeof event.notification.data === 'string' && event.notification.data.startsWith('http')) {
        urlToOpen = event.notification.data;
    }

    // 3. 檢查目前有沒有已經打開的網頁，有的話直接聚焦，沒有就開新視窗
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // 如果已經有開著的 App 畫面，就直接導向新網址並亮起來
                if ('navigate' in client && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // 如果都沒開，才開啟新視窗
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});