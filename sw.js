// ==================================================
// 🚀 Firebase FCM 推播背景接收器 (Service Worker 最終版)
// ==================================================

// 1. 引入 Firebase SDK (Service Worker 專用版) - 維持推播通道連線
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 2. 初始化 Firebase (維持不變)
firebase.initializeApp({
    apiKey: "AIzaSyAibbxL5rnhH8iupuFC0gSxqSoJJftokgY",
    projectId: "trip-guide-cfdac",
    messagingSenderId: "464557372626",
    appId: "1:464557372626:web:c2bb8c82b90c6c094c290b"
});

// 🌟 注意：我們不宣告 messaging.onBackgroundMessage 避免它搶走資料控制權！

// 3. 專職背景推播監聽器：全權接管純 data 數據
self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    try {
        // 💡 關鍵防護：相容處理資料來源格式
        let rawData = event.data.json();
        let pushData = rawData.data || rawData; // 如果直接就是 data 或是包在物件裡都能抓到

        const title = pushData.custom_title || "香草山旅遊指南";
        const body = pushData.custom_body || "";
        const badgeCount = parseInt(pushData.badge || "1", 10);
        
        // 抓取留言者頭貼，沒有就用預設
        const notificationIcon = pushData.custom_icon || "yilan.png";

        const notificationOptions = {
            body: body,
            icon: notificationIcon, 
            badge: "app-icon.png", 
            data: {
                click_action: "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1&view=board"
            }
        };

        event.waitUntil(
            Promise.all([
                // 顯示乾淨、沒有 from 的通知
                self.registration.showNotification(title, notificationOptions),
                // 在背景直接把紅點刷到桌面的圖示上
                ('setAppBadge' in navigator) ? navigator.setAppBadge(badgeCount) : Promise.resolve()
            ])
        );
    } catch (err) {
        console.error("背景收到推播處理失敗:", err);
    }
});

// 4. 監聽點擊通知後的導流動作 (記得補上，這樣點通知才會跳去留言板！)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    let baseUrl = "https://guanting-lin.github.io/church-vote/?openExternalBrowser=1";
    let urlToOpen = baseUrl;
    
    if (event.notification.data && event.notification.data.click_action) {
        urlToOpen = event.notification.data.click_action;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if ('navigate' in client && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});