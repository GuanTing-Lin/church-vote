// 監聽後台推播事件
self.addEventListener('push', function(event) {
    if (event.data) {
        // 這裡未來可以接 Firebase 傳來的資料
        console.log("收到推播資料:", event.data.text());
        
        // 為了讓這階段測試不報錯，先放一個簡單的預設通知
        const title = "收到新訊息";
        const options = {
            body: "有新的小組動態！",
            icon: "yilan.png",
            badge: "yilan.png"
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

// 點擊通知 Banner 時自動打開網頁
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/church-vote/')
    );
});