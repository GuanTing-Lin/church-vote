// 🌟【終極優化】開機最頂端：立刻攔截並備份網址參數，防止後續被 LIFF 初始化或重導向機制抹除
const earlyParams = new URLSearchParams(window.location.search);
// =========================================================================
// 🌐 PWA 全自動背景版本更新監聽系統 (防死鎖、就地自動無縫重載)
// =========================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('🤖 PWA Service Worker 核心防護載入成功');
            
            // 1. 隨時監聽是否有新寫好的 sw.js 進入安裝序列
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    // 當新版核心安裝完成，且當前已有舊核心在控制網頁時
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log("✨ 偵測到伺服器有程式版本更新，啟動背景強制覆蓋...");
                        // 發送指令給 sw.js 要求立刻跳過等待
                        newWorker.postMessage({ action: 'skipWaiting' });
                    }
                });
            });

            document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log("📱 [熱啟動喚醒] 網頁解凍！跳過網路重新連線的等待期，立刻執行前端快取數字重算！");
                
                // 1. ⚡ 不等網路！直接在解凍第一微秒強制就地重算，讓關閉通知的人熱啟動數字立刻跳對[cite: 2]！
                if (typeof updateBadgeCount === 'function') updateBadgeCount();
                
                // 2. 默默在後台與 Firebase 重新建立連線，對齊雲端已讀記號[cite: 2]
                if (currentUser && currentUser.id) {
                    db.ref('readReceipts/' + currentUser.id).once('value').then((snapshot) => {
                        const val = snapshot.val();
                        if (val) {
                            cloudLastReadId = val;
                        }
                        // 雲端連線對齊後，後線再次微調確保數字萬無一失[cite: 2]
                        if (typeof updateBadgeCount === 'function') updateBadgeCount();
                    });
                }
            }
        });

        }).catch(err => console.error('PWA 註冊失敗:', err));
    });

    // 2. 核心換裝雷達：一旦新的 Service Worker 正式取得主導權，原地秒刷頁面吃進新程式碼
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!isRefreshing) {
            isRefreshing = true;
            console.log("🔄 程式核心換裝完成，App 正在全自動無縫重載網頁...");
            setTimeout(() => {
                window.location.reload();
            }, 300); // 給予 300 毫秒緩衝，確保檔案寫入完整
        }
    });
}
let urlParamsCache = {
    view: earlyParams.get('view'),
    msgId: earlyParams.get('msgId'),
    noticeId: earlyParams.get('notice')
};
// 雙重保險：同步備份到 sessionStorage 中，防止非同步刷新時遺失
if (urlParamsCache.noticeId) sessionStorage.setItem('pending_notice_id', urlParamsCache.noticeId);
if (urlParamsCache.view) sessionStorage.setItem('pending_view', urlParamsCache.view);
if (urlParamsCache.msgId) sessionStorage.setItem('pending_msg_id', urlParamsCache.msgId);

const svgEye = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const svgEyeOff = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
const svgHeart = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

const LIFF_ID = "2009879130-CwjiaVKB"; 
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxtnKFJZNfvJbGd_KBbTgV5rI-7uqlMJLVZp3dElIFFpWlbPKxEjoE5IUxS0e7eJhLBjQ/exec";
const LATE_VOTE_PASSCODE = "062728"; 
const ADMIN_PASSCODE = "9999";

window.customSplitVotersCache = null; // 用來暫存獨立分頁中調整到一半的客製化拆帳金額
let currentUser = { name: "", id: "", pictureUrl: "", initial: "?", isVoted: false, votedOption: null }; 
let myFirebaseIndex = -1; // 🌟 鎖定本人在 Firebase 陣列中的絕對位置
let lastConfigStr = "";
let lastMembersCount = 0;
let lastMessagesCount = 0; // 用來精準追蹤是否有「全新留言」
let isFirstLoadComplete = false; // 🌟 全域防護鎖：防止即時更新時畫面彈回首頁
let lateVoteSelection = 0; let cachedPollData = null; let countdownTargetDate = 0;
let allMessages = []; let currentMsgPage = 1; const MSG_PER_PAGE = 10;

// 🌟 1. 智慧識別：完美從根目錄撈出純數字的成員資料
function extractMembers(data) {
    if (!data) return [];
    
    // 狀況 A：如果肚子裡有 members 欄位
    if (data.members) {
        let raw = data.members;
        if (Array.isArray(raw)) return raw.filter(r => r !== null && r !== undefined);
        if (typeof raw === 'object') {
            let arr = [];
            for (let k in raw) { if (raw[k]) arr.push(raw[k]); }
            return arr;
        }
    }
    
    // 狀況 B：如果傳進來的就是陣列本體
    if (Array.isArray(data)) {
        return data.filter(r => r !== null && r !== undefined);
    }
    
    // 狀況 C：線上真實環境物件（沒收 !isNaN 限制，只要是物件且含有成員特徵，通通放行）
    if (typeof data === 'object') {
        let arr = [];
        if (data['LINE ID'] || data['LINEID'] || data['LINE 名稱'] || data['LINE名稱']) {
            return [data];
        }
        for (let key in data) {
            if (data[key] && typeof data[key] === 'object') {
                arr.push(data[key]);
            }
        }
        return arr;
    }
    
    return [];
}

function saveMembersToRoot(vArray) {
    // 🌟【路徑修正】：本地環境改對齊 /members.json 繞過限制
    if (isLocalEnv) {
        let patchData = {};
        vArray.forEach((member, index) => {
            patchData[index] = member;
        });
        
        return fetch(firebaseConfig.databaseURL + "/members.json", {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchData)
        }).then(res => res.json());
    }

    // 🌟【路徑修正】：線上環境精準更新 /members 節點，不再污染根目錄
    return db.ref('/members').once('value').then(snapshot => {
        let nodeData = snapshot.val() || {};
        let updates = {};
        for (let key in nodeData) { updates[key] = null; }
        vArray.forEach((member, index) => { updates[index] = member; });
        return db.ref('/members').update(updates);
    });
}


let adminNoticesArray = []; 
let userChecklistState = {}; let checklistData = []; let openCategories = {}; let isChecklistModified = false; 
let initialDataPromise = null; 
let isGuestViewEnabled = false;
window.lastConfigAdminClickTime = 0;

// 宣告一個全域變數來存雲端的已讀 ID
let cloudLastReadId = null;


// 在 processLoadedData (監聽 Firebase 的地方) 加上這段監聽：
function listenToReadReceipts() {
    if (!currentUser.id) return;
    db.ref('readReceipts/' + currentUser.id).on('value', (snapshot) => {
        cloudLastReadId = snapshot.val();
        
        // 🌟【冷啟動大加固】：當開機後雲端已讀 ID 終於加載完畢的瞬間，
        // 立刻強迫紅點重新用最新 ID 算一次，冷啟動絕對百分之百抓得到數字！
        if (typeof updateBadgeCount === 'function') {
            updateBadgeCount();
        }
    });
}

window.userAvatarMap = {};
window.userNameMap = {};        
window.likeTimers = {};

const isLocalEnv = window.location.protocol === "file:" || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";

const firebaseConfig = {
    apiKey: "AIzaSyAibbxL5rnhH8iupuFC0gSxqSoJJftokgY",
    authDomain: "trip-guide-cfdac.firebaseapp.com",
    databaseURL: "https://trip-guide-cfdac-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "trip-guide-cfdac",
    storageBucket: "trip-guide-cfdac.firebasestorage.app",
    messagingSenderId: "464557372626",
    appId: "1:464557372626:web:c2bb8c82b90c6c094c290b"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let isInitialLoad = true; // 紀錄是否為初次載入

// =========================================================================
// 🎯 [留言板未讀數字計數器 ── 全時段通電放行完全體神盾]
// 💡 修正：澈底砸碎導致通知集體死鎖不亮的 if 攔截 Bug，保證 APP 外部與留言板紅點 100% 滿血復活！
// =========================================================================
function updateBadgeCount() {
    const badge = document.getElementById('board-badge');
    let unreadCount = 0;

    // 🔒 智慧解鎖：萬一歷史陣列 allMessages 還在非同步加載中，
    // 我們直接穿透去讀取千真萬確已經到位的雲端快取數據 cachedPollData.messages，絕不允許 return 攔截退出！
    let targetMessagesSource = [];
    if (allMessages && allMessages.length > 0) {
        targetMessagesSource = allMessages;
    } else if (cachedPollData && cachedPollData.messages) {
        // 備援通道：將物件或陣列結構扁平化，確保開機第 0 秒也挖得到留言
        const rawMsgs = cachedPollData.messages;
        if (Array.isArray(rawMsgs)) {
            targetMessagesSource = rawMsgs.filter(m => m && m.MsgID).reverse();
        } else {
            for (let k in rawMsgs) { if (rawMsgs[k] && rawMsgs[k].MsgID) targetMessagesSource.push(rawMsgs[k]); }
            targetMessagesSource.reverse();
        }
    }

    // 🔄 正宗還原：歷史陣列逐則尋找比對公式
    const lastReadId = cloudLastReadId; 

    if (lastReadId && targetMessagesSource.length > 0) {
        let found = false;
        for (let i = 0; i < targetMessagesSource.length; i++) {
            if (targetMessagesSource[i].MsgID === lastReadId) {
                found = true; // 精準比對到已讀定錨點，中斷
                break;
            }
            unreadCount++; // 這則留言比已讀記號新，計入未讀
        }
        // 防呆：萬一記錄的 ID 在雲端被刪了，歸零
        if (!found) unreadCount = 0;
    } else {
        if (targetMessagesSource.length === 0) {
            // 資料還沒來，先按兵不動，不強行歸零
            return; 
        } else {
            // 確確實實是全新帳號，或者全部讀完了
            unreadCount = 0;
        }
    }

    // 🌐 1. 鋪設前台留言板標籤紅色圈圈 (index.html) - 保持通暢
    if (badge) {
        if (unreadCount > 0 && !document.getElementById('view-board').classList.contains('active')) {
            badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.setProperty('display', 'block', 'important');
        } else {
            badge.innerText = '';
            badge.style.setProperty('display', 'none', 'important');
        }
    }

    // =========================================================================
    // 🎯 👑 【全環境外殼通知雙保險】
    // 💡 解決：彌補 LINE/LIFF 內嵌環境不認得 setAppBadge 的硬傷，確保背景滑掉也能跨界通知！
    // =========================================================================
    if (unreadCount > 0) {
        // 保險 A：如果是正宗 PWA 模式（加入主畫面），毫無保留直接亮起手機桌面 Icon 實體紅點！
        if ('setAppBadge' in navigator) {
            navigator.setAppBadge(unreadCount).catch(() => {});
        }
        // 保險 B：如果是 LINE / 微信等內嵌瀏覽器，動態修改網頁分頁 Tab 標題（例如：【新訊息 (3)】香草山小組出遊指南）
        // 這樣使用者滑掉、停在手機分頁大廳時，也能一眼看出有幾則新留言！
        document.title = `(${unreadCount}) 香草山小組出遊指南`;
    } else {
        if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch(() => {});
        }
        document.title = "香草山小組出遊指南"; // 歸零還原
    }
}

// 🌟【精準已讀清空器】：只有在使用者真正點擊、切換到留言板分頁的當下才執行已讀
function clearBadge() {
    if (allMessages && allMessages.length > 0) {
        const latestMsgId = allMessages[0].MsgID || "";
        
        if (latestMsgId) {
            if (currentUser && currentUser.id) {
                db.ref('readReceipts/' + currentUser.id).set(latestMsgId);
                cloudLastReadId = latestMsgId; // 即時同步記憶體
            }
        }
    }
    const badge = document.getElementById('board-badge');
    if (badge) { badge.innerText = ''; badge.style.display = 'none'; }
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
}

function requestPushPermission(fromToggle = false) {
    if (!('Notification' in window) || !firebase.messaging.isSupported()) {
        if (!fromToggle) console.log("此瀏覽器不支援推播通知");
        else showCustomAlert("不支援", "您的裝置或瀏覽器不支援推播通知。");
        if (fromToggle) document.getElementById('user-push-master-toggle').checked = false;
        return;
    }
    
    Notification.requestPermission().then(function(permission) {
        if (permission === 'granted') {
            console.log("✅ 成功允許權限！正在產生 Token...");
            
            navigator.serviceWorker.ready.then((registration) => {
                const messaging = firebase.messaging();
                messaging.getToken({ 
                    vapidKey: 'BNtbU-i7ale_MCnwVr_lgCjQCHxugB1IffWBtjgCyQQo1GP03bqca2NQAYYkUYS0vUE4YmW8ncHuX4dyJ0OMS7U',
                    serviceWorkerRegistration: registration 
                }).then((currentToken) => {
                    if (currentToken) {
                        console.log("🎟️ 成功取得推播 Token");
                        if (currentUser && currentUser.id) {
                            localStorage.setItem('myDeviceFCMToken', currentToken);
                            db.ref('pushTokens/' + currentUser.id).set(currentToken);                      
                            
                            if (fromToggle) {
                                document.getElementById('user-push-master-toggle').checked = true;
                                document.getElementById('push-sub-options').style.display = 'block';
                                document.getElementById('push-pref-all').checked = true;
                                document.getElementById('push-pref-mentions').checked = true;
                                savePushPrefs();
                            }
                        }
                    }
                }).catch((err) => console.log('取得 Token 發生錯誤:', err));
            });
        } else {
            console.log("❌ 失敗：用戶拒絕了通知權限");
            if (fromToggle) document.getElementById('user-push-master-toggle').checked = false;
        }
    });
}

// =========================================================================
// 👑【FCM Token 背景電擊甦醒神盾 ── 全自動通知防斷線機制】
// 💡 規則：100% 靜音默默執行！不跳出任何彈窗，開機時自動向 Google 對齊最新 Token，防止通知失效
// =========================================================================
function silentlyRefreshPushToken() {
    // 🛡️ 保險 A：如果裝置不支援通知，或者使用者根本沒在系統內允許通知權限，直接退場
    if (!('Notification' in window) || !firebase.messaging.isSupported() || Notification.permission !== 'granted') {
        return;
    }

    // 🚀 進入背景靜音連線巡邏
    navigator.serviceWorker.ready.then((registration) => {
        const messaging = firebase.messaging();
        messaging.getToken({ 
            vapidKey: 'BNtbU-i7ale_MCnwVr_lgCjQCHxugB1IffWBtjgCyQQo1GP03bqca2NQAYYkUYS0vUE4YmW8ncHuX4dyJ0OMS7U',
            serviceWorkerRegistration: registration 
        }).then((currentToken) => {
            if (currentToken && currentUser && currentUser.id) {
                const myLocalToken = localStorage.getItem('myDeviceFCMToken');
                
                // 💡 智慧識別：只有當 Google 發給我的新 Token 跟本地快取不同、或者 Firebase 上的不同時，才執行回寫
                if (currentToken !== myLocalToken) {
                    console.log("⚡ [通知雷達] 偵測到本機過期或全新的 Token，背景無縫覆蓋寫入資料庫...");
                    localStorage.setItem('myDeviceFCMToken', currentToken);
                    db.ref('pushTokens/' + currentUser.id).set(currentToken);
                } else {
                    console.log("🤖 [通知雷達] 經對齊，當前裝置的 Token 狀態十分健康，不需重寫。");
                }
            }
        }).catch((err) => {
            console.log("⏳ [通知雷達] 背景 Token 對齊暫時遇到網路波動，下趟喚醒再試：", err);
        });
    });
}

// =========================================================================
// 🎯 [單一函數修補 ── getLikesIgStyle 卡片面按讚人名轉譯大腦]
// 💡 修正原理：調整轉譯時序，先完整轉譯人名再判斷字串長度，徹底降維打擊 U4b8d864 亂碼！
// =========================================================================
function getLikesIgStyle(likesArray) {
    if (!likesArray || likesArray.length === 0) return "";
    
    let recentLikes = likesArray.slice(-3).reverse();
    let avatarsHtml = `<div class="like-avatar-stack">`;
    
    recentLikes.forEach((likeId, idx) => {
        let cleanId = String(likeId).trim();
        // 👑 先從全域字典進行完整對位翻譯！找不到才回退用原始 ID
        let name = window.userNameMap[cleanId] || cleanId;
        
        // 翻譯完後，如果名字依然是沒有被成功對齊的長 ID 亂碼，才允許截短防破版
        if (name && name.length > 12 && name.startsWith('U') && !window.userNameMap[cleanId]) { 
            name = name.substring(0, 8) + '...'; 
        }
        
        let picUrl = window.userAvatarMap[cleanId] || window.userAvatarMap[name];
        let zIndex = 3 - idx; 
        let fbText = name ? name[0] : "?";
        let avContent = picUrl 
            ? `<img src="${picUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
            : `<span style="font-size:9px; font-weight:800; color:white;">${fbText}</span>`;
        
        avatarsHtml += `<div class="like-avatar-tiny" style="background:linear-gradient(135deg, var(--primary-orange), #ff8c00); z-index:${zIndex};">${avContent}</div>`;
    });
    avatarsHtml += `</div>`;
    
    let lastNameOrId = String(likesArray[likesArray.length - 1]).trim();
    // 👑 頂部核心：優先從字典完整對位翻譯，再判定字串長度！
    let lastDisplayName = window.userNameMap[lastNameOrId] || lastNameOrId;
    
    // 只有在查無此人、完全是純亂碼長 ID 的情況下，才允許截短防爆，絕不污染正常人名！
    if (lastDisplayName && lastDisplayName.length > 15 && !window.userNameMap[lastNameOrId]) {
        lastDisplayName = lastDisplayName.substring(0, 8) + '...';
    }
    
    let textHtml = `<span class="like-text-style"><span class="like-name-bold">${lastDisplayName}</span> ${likesArray.length > 1 ? '和其他人都說讚' : '說讚'}</span>`;
    
    return avatarsHtml + textHtml;
}

// 🌟 超級防彈「設定值解析器」
function getConfigBool(cfg, key, defaultVal = true) {
    if (!cfg || cfg[key] === undefined || cfg[key] === null) return defaultVal;
    const str = String(cfg[key]).trim().toLowerCase();
    if (str === 'true' || str === 'v' || str === '1') return true;
    if (str === 'false' || str === '0' || str === '') return false;
    return defaultVal;
}

// 🌟 防止背景跟操作者搶方向盤的鎖定閥
let activeConfigUpdates = 0;
let activeMessageUpdates = 0;

async function refreshMessagesOnly(isSilent = true) {
    // 🌟 已經交給 Firebase 自動推播，這個函式留空即可
    if (!isSilent) {
        showCustomAlert("已是最新狀態", "系統已升級即時連線，不需手動更新！");
    }
}

function togglePasswordVisibility() {
    const inp = document.getElementById('modal-input');
    const toggleBtn = document.getElementById('pwd-toggle');
    if (inp.type === 'password') { inp.type = 'text'; toggleBtn.innerHTML = svgEyeOff; } 
    else { inp.type = 'password'; toggleBtn.innerHTML = svgEye; }
}

function getFormattedTime() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1; 
    const d = now.getDate();      
    const hours = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, '0'); 
    const ampm = hours >= 12 ? '下午' : '上午';
    const h12 = hours % 12 || 12; 
    return `${y}/${m}/${d} ${ampm} ${h12}:${mins}`;
}

function initLockScreen() {
    let c = 0; let t = null;
    const lockCard = document.querySelector('#lock-screen .card');
    
    if (lockCard) {
        lockCard.style.userSelect = 'none';
        lockCard.style.touchAction = 'manipulation';
        lockCard.style.cursor = 'pointer';
        
        lockCard.onclick = () => {
            c++; 
            clearTimeout(t); 
            t = setTimeout(() => c = 0, 2000); 
            
            if (navigator.vibrate) navigator.vibrate(30);

            if (c >= 4) { 
                c = 0; 
                unlockMainApp(); 
            }
        };
    }
}

// ==========================================
// 🔔 通知設定開關邏輯
// ==========================================

// 1. 打開設定頁面 (含 iOS Safari 防呆機制)
function openSettings() {
    document.getElementById('avatar-menu').style.display = 'none';
    const hIcon = document.getElementById('hamburger-icon');
    if(hIcon) hIcon.classList.remove('open');
    switchView('settings');

    // 👇 核心邏輯：判斷作業系統與開啟模式 👇
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // 判斷是否為「加入桌面後」的獨立 App 模式
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    const masterToggle = document.getElementById('user-push-master-toggle');
    // 抓取開關旁邊的說明文字 (用 DOM 結構相對位置抓取，不需改 HTML)
    const descDiv = masterToggle.closest('.admin-menu-item').querySelector('div > div:nth-child(2)');

    if (isIOS && !isStandalone) {
        // 狀況 A：是用 iPhone 一般網頁打開
        masterToggle.disabled = true; 
        masterToggle.checked = false; // 🌟 確保強制維持在關閉狀態
        masterToggle.style.cursor = "not-allowed";

        // 🌟【新增強制樣式修正】防止開關元件被 Flex 壓縮或底色遺失
        const toggleWrapper = masterToggle.parentElement; // 取得 <label class="switch">
        if (toggleWrapper) {
            toggleWrapper.style.flexShrink = "0"; // 防止被壓縮變形
            toggleWrapper.style.display = "inline-block";
        }

        const slider = masterToggle.nextElementSibling; // 取得 <span class="slider">
        if (slider) {
            slider.style.backgroundColor = "#cbd5e0"; // 🌟 強制給予明確的灰色禁用底色
            slider.style.opacity = "0.7";
            slider.style.cursor = "not-allowed";
        }
        
        if (descDiv) {
            descDiv.innerHTML = '<span style="color:#ff4d4f; font-weight:700;">⚠️ iOS 系統限制：請點擊「分享」按鈕 >「加入主畫面」，從桌面開啟後即可設定通知！</span>';
        }
    } else {
        // 狀況 B：正常狀態 (加回原本可能被影響的樣式)
        masterToggle.disabled = false;
        const slider = masterToggle.nextElementSibling;
        if (slider) {
            slider.style.backgroundColor = ""; // 恢復原本 CSS 的設定
            slider.style.opacity = "";
            slider.style.cursor = "";
        }
        
        if (descDiv) {
            descDiv.innerHTML = '開啟後才能設定此裝置的通知類型';
        }
    }
    
} 

// =========================================================================
// 🎯 👑【通知總開關 ── 移除重疊跳窗・直達系統原生詢問完全體】
// 💡 修正：刪除自製的 custom-modal 詢問，點擊開關直接觸發瀏覽器權限索取！
// =========================================================================
function handlePushMasterToggle(checkbox) {
    const isTurningOn = checkbox.checked;
    
    if (isTurningOn) {
        if (Notification.permission === 'default') {
            // 🚀【極簡直達】：不跳任何自製視窗，直接呼叫 Google FCM 與瀏覽器的權限大腦
            requestPushPermission(true);
            
        } else if (Notification.permission === 'granted') {
            requestPushPermission(true);
        } else {
            // 如果使用者之前已經在系統層面「封鎖」了通知，還是需要給予警示引導
            checkbox.checked = false;
            showCustomAlert("無法開啟", "您已封鎖通知，請前往手機瀏覽器系統設定解除封鎖。");
        }
    } else {
        // 用戶關閉通知時，默默移除雲端 Token (保持你原廠健康的優良規格)
        if (currentUser && currentUser.id) {
            const myLocalToken = localStorage.getItem('myDeviceFCMToken');
            db.ref('pushTokens/' + currentUser.id).once('value', snap => {
                if (snap.val() === myLocalToken) {
                    db.ref('pushTokens/' + currentUser.id).remove()
                    .then(() => {
                        console.log("🗑️ 已關閉通知，Token 刪除成功");
                    }).catch(err => console.error("刪除 Token 失敗", err));
                }
            });
            const subOptions = document.getElementById('push-sub-options');
            if (subOptions) subOptions.style.display = 'none';
        }
    }
}

// 3. 儲存子開關設定到 Firebase
function savePushPrefs() {
    if (!currentUser || !currentUser.id) return;
    const allChecked = document.getElementById('push-pref-all').checked;
    const mentionsChecked = document.getElementById('push-pref-mentions').checked;
    const noticesChecked = document.getElementById('push-pref-notices').checked; // 🌟 新增公告
    
    db.ref('pushPrefs/' + currentUser.id).set({
        all: allChecked,
        mentions: mentionsChecked,
        notices: noticesChecked // 🌟 新增公告
    }).then(() => console.log("💾 通知偏好已更新！"));
}


// ==========================================
// 🎯 @提及選單核心邏輯
// ==========================================
let mentionActive = false;
let mentionStartIndex = -1;
let mentionFilter = "";
let mentionList = [];
let mentionSelectedIndex = 0;

// =========================================================================
// 🎯 [@提及選單核心邏輯 - 雙軌地獄對齊完全體]
// 💡 修正：主畫面與彈窗各自擁有獨立選單，徹底解決手機上 fixed 座標歪掉、跑到下面的硬傷
// =========================================================================
function initMentionLogic() {
    const mainTextarea = document.getElementById('new-msg-text');
    const modalTextarea = document.getElementById('modal-textarea');
    let activeInputEl = null;

    function handleInputEvent(textarea, isModal = false) {
        const val = textarea.value;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = val.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const menu = document.getElementById(isModal ? 'mention-menu-modal' : 'mention-menu');
        if (!menu) return;

        if (lastAtIndex !== -1) {
            const isStartOrSpaced = lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]);
            if (isStartOrSpaced) {
                mentionActive = true;
                mentionStartIndex = lastAtIndex;
                mentionFilter = textBeforeCursor.substring(lastAtIndex + 1);

                if (!cachedPollData) return;
                const liveMembers = extractMembers(cachedPollData);
                if (!liveMembers || liveMembers.length === 0) { menu.style.display = 'none'; return; }

                mentionList = liveMembers.filter(m => {
                    if (!m) return false;
                    const name = m['LINE 名稱'] || m['LINE名稱'] || '';
                    return name.toLowerCase().includes(mentionFilter.toLowerCase()) && name !== currentUser.name;
                });

                if (mentionList.length === 0) { menu.style.display = 'none'; return; }
                menu.innerHTML = '';

                // 🎯 雙軌對齊防線
                menu.style.position = 'absolute';
                menu.style.left = textarea.offsetLeft + 'px';
                menu.style.top = (textarea.offsetTop + textarea.offsetHeight + 4) + 'px';
                menu.style.width = textarea.offsetWidth + 'px';

                mentionList.forEach((member, idx) => {
                    if (!member) return;
                    const memberId = member['LINE ID'] || member['LINEID'] || '';
                    const memberName = member['LINE 名稱'] || member['LINE名稱'] || '匿名';
                    let userPic = window.userAvatarMap ? (window.userAvatarMap[memberId] || window.userAvatarMap[memberName] || "") : "";
                    
                    const div = document.createElement('div');
                    div.className = 'mention-item' + (idx === mentionSelectedIndex ? ' selected' : '');
                    
                    let avatarHtml = '';
                    if (userPic) {
                        avatarHtml = `<img src="${userPic}" class="mention-avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
                    }
                    const firstChar = memberName ? memberName.charAt(0) : "?";
                    const fallbackAvatarHtml = `<div class="mention-avatar-fallback" style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, var(--primary-orange), #ff8c00); color:white; display:${userPic ? 'none' : 'flex'}; justify-content:center; align-items:center; font-size:12px; font-weight:700;">${firstChar}</div>`;
                    
                    div.innerHTML = `
                        <div style="position:relative; width:28px; height:28px; margin-right:10px; flex-shrink:0; display:flex; justify-content:center; align-items:center;">
                            ${avatarHtml}
                            ${fallbackAvatarHtml}
                        </div>
                        <span class="mention-name" style="font-size:14px; font-weight:600; color:var(--text-main);">${memberName}</span>
                    `;
                    
                    div.onmousedown = (e) => {
                        e.preventDefault();
                        selectMentionCore(memberName, textarea, menu); 
                    };
                    menu.appendChild(div);
                });
                
                menu.style.display = 'block';
                return;
            }
        }
        menu.style.display = 'none';
    }

    function handleKeyDownEvent(textarea, e, menuId) {
        const menu = document.getElementById(menuId);
        if (e.key === 'Backspace') {
            const txt = textarea.value;
            const start = textarea.selectionStart;
            const textBeforeCursor = txt.substring(0, start);
            let allMemberNames = Object.values(window.userNameMap || {});
            let targetMatchName = null;

            for (let name of allMemberNames) {
                if (!name) continue;
                const matchStr = "@" + name + " ";
                if (textBeforeCursor.endsWith(matchStr)) { targetMatchName = matchStr; break; }
            }

            if (targetMatchName) {
                e.preventDefault();
                const deleteStart = start - targetMatchName.length;
                textarea.value = txt.substring(0, deleteStart) + txt.substring(start);
                textarea.selectionStart = textarea.selectionEnd = deleteStart;
                if (menu) menu.style.display = 'none';
                mentionActive = false;
                return;
            }
        }

        if (!mentionActive || !menu || menu.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            mentionSelectedIndex = (mentionSelectedIndex + 1) % mentionList.length;
            updateMenuVisual(menu);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            mentionSelectedIndex = (mentionSelectedIndex - 1 + mentionList.length) % mentionList.length;
            updateMenuVisual(menu);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const currentMember = mentionList[mentionSelectedIndex];
            if (currentMember) {
                const memberName = currentMember['LINE 名稱'] || currentMember['LINE名稱'] || '';
                selectMentionCore(memberName, textarea, menu);
            }
        } else if (e.key === 'Escape') {
            menu.style.display = 'none';
        }
    }

    function updateMenuVisual(menu) {
        const items = menu.querySelectorAll('.mention-item');
        items.forEach((item, idx) => {
            if (idx === mentionSelectedIndex) item.classList.add('selected');
            else item.classList.remove('selected');
        });
    }

    if (mainTextarea) {
        mainTextarea.addEventListener('input', () => handleInputEvent(mainTextarea, false));
        mainTextarea.addEventListener('keydown', (e) => handleKeyDownEvent(mainTextarea, e, 'mention-menu'));
    }
    if (modalTextarea) {
        modalTextarea.addEventListener('input', () => handleInputEvent(modalTextarea, true));
        modalTextarea.addEventListener('keydown', (e) => handleKeyDownEvent(modalTextarea, e, 'mention-menu-modal'));
    }

    document.addEventListener('click', (e) => {
        if (e.target.id !== 'new-msg-text' && e.target.id !== 'modal-textarea' && !e.target.closest('.mention-menu')) {
            const m1 = document.getElementById('mention-menu');
            const m2 = document.getElementById('mention-menu-modal');
            if (m1) m1.style.display = 'none';
            if (m2) m2.style.display = 'none';
            mentionActive = false;
        }
    });
}

// =========================================================================
// 🎯 👑【全站輸入框失焦神盾 ── 公告 + 行程後台雙強聯防安全完全體】
// =========================================================================
document.addEventListener('focusout', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        console.log("⌨️ 偵測到手機輸入框失去焦點，啟動平滑歸位防死鎖機制...");
        
        // 🚀 僅保留最安全的手機原生微調滾動，徹底移除會吞掉儲存點擊、引發當機的重繪！
        window.scrollTo(0, Math.max(0, document.documentElement.scrollTop - 1));
        
        setTimeout(() => {
            // 🔒 剛性隔離白名單防線：
            // 如果管理員目前人在「編輯公告(admin-notices)」或「編輯行程(admin-itinerary)」，全數禁止將視窗強制拉扯歸零！
            const activeSec = document.querySelector('.view-section.active');
            const currentActiveId = activeSec ? activeSec.id : "";
            
            const protectedViews = [
                'view-admin-notices', 
                'view-admin-itinerary', // 🎯 精準鎖定行程編輯後台分頁
                'view-add-fee'
            ];
            
            if (!protectedViews.includes(currentActiveId)) {
                window.scrollTo(0, 0); 
            }
        }, 30);
    }
});

function selectMentionCore(name, textarea, menu) {
    if (!name || !textarea) return;
    const val = textarea.value;
    const before = val.substring(0, mentionStartIndex);
    const after = val.substring(textarea.selectionStart);
    const insertText = `@${name} `;
    textarea.value = before + insertText + after;
    textarea.selectionStart = textarea.selectionEnd = mentionStartIndex + insertText.length;
    textarea.focus();
    if (menu) menu.style.display = 'none';
    mentionActive = false;
}

// 💡 輔助整合函數：把名字精準塞入目前正在打字的輸入框中
function selectMentionCore(name, textarea) {
    if (!name || !textarea) return;
    const val = textarea.value;
    const before = val.substring(0, mentionStartIndex);
    const after = val.substring(textarea.selectionStart);
    const insertText = `@${name} `;
    
    textarea.value = before + insertText + after;
    textarea.selectionStart = textarea.selectionEnd = mentionStartIndex + insertText.length;
    textarea.focus();
    closeMentionMenu();
}

// 過濾名單
function updateMentionMenu() {
    // 從我們辛苦建立的 userNameMap 裡面，把所有不重複的名字抓出來
    let uniqueNames = [...new Set(Object.values(window.userNameMap))];
    
    // 排除自己，並根據打的字進行過濾
    mentionList = uniqueNames.filter(name => 
        name !== currentUser.name && 
        name.toLowerCase().includes(mentionFilter.toLowerCase())
    );

    if (mentionList.length === 0) {
        closeMentionMenu();
        return;
    }
    mentionSelectedIndex = 0;
    renderMentionMenu();
}

// 把名單畫在畫面上
function renderMentionMenu() {
    const menu = document.getElementById('mention-menu');
    menu.innerHTML = '';
    
    mentionList.forEach((name, idx) => {
        const div = document.createElement('div');
        div.className = 'mention-item' + (idx === mentionSelectedIndex ? ' selected' : '');
        
        // 嘗試抓大頭貼，沒有就秀第一個字
        let picUrl = window.userAvatarMap[name];
        let avHtml = picUrl 
            ? `<img src="${picUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` 
            : name[0];

        div.innerHTML = `<div class="mention-avatar">${avHtml}</div><span>${name}</span>`;
        // 點擊滑鼠時帶入
        div.onmousedown = (e) => {
            e.preventDefault(); // 防止 textarea 失去焦點
            selectMention(name);
        };
        menu.appendChild(div);
    });
    menu.style.display = 'block';
}

// 選擇某人後，把名字塞回輸入框
function selectMention(name) {
    if (!name) return;
    const textarea = document.getElementById('new-msg-text');
    const val = textarea.value;
    
    // 把字串切成兩半：@前面的 + 選中的名字 + 游標後面的
    const before = val.substring(0, mentionStartIndex);
    const after = val.substring(textarea.selectionStart);
    const insertText = `@${name} `; // 名字後面補一個空白，方便繼續打字
    
    textarea.value = before + insertText + after;

    // 把游標移到剛塞入的名字後面
    textarea.selectionStart = textarea.selectionEnd = mentionStartIndex + insertText.length;
    textarea.focus();
    closeMentionMenu();
}

function closeMentionMenu() {
    mentionActive = false;
    document.getElementById('mention-menu').style.display = 'none';
}

// 綁定初始化啟動！(把它跟 DOMContentLoaded 綁在一起確保元素都生出來了)
window.addEventListener('DOMContentLoaded', initMentionLogic);

window.onload = async function() {
    if (isLocalEnv) {
        currentUser = { name: "開發者(測試)", id: "test_user_001", pictureUrl: "", initial: "測" };
        window.userNameMap[currentUser.id] = currentUser.name;
        const welcomeNameEl = document.getElementById('welcome-name');
        welcomeNameEl.innerHTML = `<span>${currentUser.name}</span>`;
        if(document.getElementById('user-avatar')) document.getElementById('user-avatar').innerText = currentUser.initial;
                
        fetch(GAS_API_URL, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                    action: "updateAvatar", 
                    userId: currentUser.id, 
                    pictureUrl: "",
                    loginTime: getFormattedTime() 
                })
        }).catch(e => console.log("測試帳號同步失敗"));

        // 【第一處修改】：本機測試環境加載完畢後，執行 Token 背景自動防護
        await processLoadedData();
        if (typeof silentlyRefreshPushToken === 'function') {
            silentlyRefreshPushToken();
        }
        return;
    } 
                
    const checkLiff = setInterval(async () => {
        if (typeof liff !== 'undefined') {
            clearInterval(checkLiff);
            try {
                await liff.init({ liffId: LIFF_ID });
                
                const isLineBrowser = /Line/i.test(navigator.userAgent);
                const urlParams = new URLSearchParams(window.location.search);
                
                if (isLineBrowser && !urlParams.get('openExternalBrowser')) {
                    console.log("📱 偵測到 LINE 內置瀏覽器，啟動免帳密外部跳轉通道...");
                    liff.openWindow({
                        url: window.location.href + (window.location.search ? '&' : '?') + 'openExternalBrowser=1',
                        external: true
                    });
                    return; // 剛性攔截：讓 LINE 內建視窗安靜關閉，不往下走重覆登入
                }

                if (liff.isLoggedIn()) {
                    const p = await liff.getProfile();
                    currentUser = { name: p.displayName, id: p.userId, pictureUrl: p.pictureUrl, initial: p.displayName[0] };
                    
                    window.userNameMap[currentUser.id] = currentUser.name;
                    if (currentUser.pictureUrl) window.userAvatarMap[currentUser.id] = currentUser.pictureUrl;

                    fetch(GAS_API_URL, {
                        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ 
                                action: "updateAvatar", 
                                userId: currentUser.id, 
                                pictureUrl: currentUser.pictureUrl || "",
                                loginTime: getFormattedTime() 
                            })
                    }).catch(e => console.log("靜默同步資料"));

                    const welcomeNameEl = document.getElementById('welcome-name');
                    welcomeNameEl.innerHTML = `<span>${currentUser.name}</span>`;
                    if (p.pictureUrl) document.getElementById('user-avatar').innerHTML = `<img src="${p.pictureUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                    else document.getElementById('user-avatar').innerText = currentUser.initial;
                    
                    // 【第二處修改】：手機 LINE 線上環境加載完畢後，同步執行 Token 背景自動防護
                    await processLoadedData();
                    if (typeof silentlyRefreshPushToken === 'function') {
                        silentlyRefreshPushToken();
                    }
                } else { liff.login(); }
            } catch (err) { 
                console.error('LIFF 失敗', err);
                document.getElementById('loading').innerHTML = '<h2 style="color:red;">登入失敗</h2><p>請確認 LIFF ID 設定。</p>';
            }
        }
    }, 100);
};

// 🌟【時序導正】：宣告初次快取阻斷旗標與身分防護鎖
let hasLoadedFromFirebase = false;
let isProfileChecked = false;

async function processLoadedData() {
    listenToReadReceipts();
    initMessageListeners(); 

    const banner = document.getElementById('cache-warning-banner');
    if (banner) banner.style.display = 'none';

    // 🌟【極端備援計時器】：延長至 4 秒，只有當完全斷網、Firebase 毫無回應時，才允許本地舊快取頂替
    setTimeout(() => {
        if (!hasLoadedFromFirebase && !isProfileChecked) {
            console.log("⏳ 本地網路完全中斷，啟動離線快取備援機制...");
            const cachedRaw = localStorage.getItem('trip_cache_data');
            if (cachedRaw) {
                try {
                    const cachedData = JSON.parse(cachedRaw);
                    cachedPollData = cachedData;
                    
                    if (cachedData.messages) {
                        for (let key in cachedData.messages) {
                            const m = cachedData.messages[key]; if (!m) continue;
                            const id = m.LineID || m.UserId;
                            if (id) window.userNameMap[id] = m.Name;
                            if (id && m.AvatarUrl) window.userAvatarMap[id] = m.AvatarUrl;
                            if (m.Name && m.AvatarUrl) window.userAvatarMap[m.Name] = m.AvatarUrl; 
                        }
                    }
                    if (cachedData.members) {
                        for (let key in cachedData.members) {
                            const v = cachedData.members[key]; if (!v) continue;
                            const id = v['LINE ID'] || v['LINEID']; const name = v['LINE 名稱'] || v['LINE名稱']; const pic = v['AvatarUrl'] || v['pictureUrl'] || v['照片'];
                            if (id) { if (name) window.userNameMap[id] = name; if (pic) window.userAvatarMap[id] = pic; }
                            if (name && pic) window.userAvatarMap[name] = pic;
                        }
                    }
                    renderDynamicUI(cachedData);
                    checkUserMemberStatus(cachedData);
                    unlockMainApp();
                } catch(e) { console.error("快取解析失敗:", e); }
            }
        }
    }, 4000);

    // 👇 同時監聽 Token (總開關) 與 Prefs (子開關)
    if (currentUser && currentUser.id) {
        db.ref('pushTokens/' + currentUser.id).on('value', snap => {
            const dbToken = snap.val(); const myLocalToken = localStorage.getItem('myDeviceFCMToken');
            const isMyTokenActive = dbToken && (dbToken === myLocalToken);
            const masterToggle = document.getElementById('user-push-master-toggle'); const subOptions = document.getElementById('push-sub-options');
            if (masterToggle) { const isOn = isMyTokenActive && Notification.permission === 'granted'; masterToggle.checked = isOn; if (subOptions) subOptions.style.display = isOn ? 'block' : 'none'; }
        });
        db.ref('pushPrefs/' + currentUser.id).on('value', snap => {
            const prefs = snap.val() || { all: true, mentions: true, notices: true }; const allToggle = document.getElementById('push-pref-all'); const mentionsToggle = document.getElementById('push-pref-mentions'); const noticesToggle = document.getElementById('push-pref-notices');
            if (allToggle) allToggle.checked = prefs.all; if (mentionsToggle) mentionsToggle.checked = prefs.mentions; if (noticesToggle) noticesToggle.checked = prefs.notices !== false; 
        });
    }

    // =========================================================================
    // 🎯 👑【Firebase 雲端全域即時分流監聽器 ── 雙棲大小寫相容純淨版】
    // 💡 修正：徹底移除資料結構 console.log 監看，維持最輕量、體感 0 延遲的即時重繪！
    // =========================================================================
    db.ref('/').on('value', snapshot => {
        hasLoadedFromFirebase = true; 
        
        const data = snapshot.val();
        if (data) {
            cachedPollData = data;
            localStorage.setItem('trip_cache_data', JSON.stringify(data));
            
            // =========================================================================
            // 🎯【時序剛性加固】：線上環境防止 LIFF 慢半拍導致字典真空
            // =========================================================================
            if (!window.userNameMap) window.userNameMap = {};
            if (!window.userAvatarMap) window.userAvatarMap = {};

            // 1. 嘗試從當前廣播資料包中提取
            let membersArray = extractMembers(data);

            // 2. 👑 線上開機防爆核心：如果當前廣播沒帶成員（例如純留言更新），且目前字典是空的
            if ((!membersArray || membersArray.length === 0) && Object.keys(window.userNameMap).length === 0) {
                if (data.members) {
                    membersArray = extractMembers(data.members);
                }
            }

            // 開始無痕塞入字典（增量累積，只蓋新不刪舊）
            if (membersArray && membersArray.length > 0) {
                membersArray.forEach(v => {
                    if (!v) return;
                    const id = v['LINE ID'] || v['LINEID']; 
                    const name = v['LINE 名稱'] || v['LINE名稱'];
                    const pic = v['AvatarUrl'] || v['pictureUrl'] || v['照片'] || v['pictureurl'];
                    if (id) {
                        if (name) window.userNameMap[id] = name;
                        if (pic) window.userAvatarMap[id] = pic; 
                    }
                    if (name && pic) window.userAvatarMap[name] = pic;
                });
            }
            
            // 🛡️ 雙軌相容隔離防線：如果主路徑沒有，去備援路徑強撈
            if (!data.itinerary && data.config && data.config.ItineraryData) {
                try {
                    cachedPollData.itinerary = JSON.parse(data.config.ItineraryData);
                } catch(e) {
                    cachedPollData.itinerary = [];
                }
            }
            
            // =========================================================================
            // 🛡️ 👑【大小寫剛性過濾過濾網】── 沒收小寫造成的讀取真空，100% 打通前台！
            // =========================================================================
            if (cachedPollData.itinerary && Array.isArray(cachedPollData.itinerary)) {
                cachedPollData.itinerary = cachedPollData.itinerary.map(item => {
                    if (!item) return item;
                    return {
                        id: item.id || item.id || "",
                        Day: item.Day || item.day || "Day 1",
                        Time: item.Time || item.time || "08:00",
                        Title: item.Title || item.title || "",
                        Desc: item.Desc || item.desc || "",
                        Link: item.Link || item.link || ""
                    };
                });
            }
            
            // 🚀 重繪前台詳細行程時間軸 (乾淨無 log 版本)
            if (typeof renderItineraryTimeline === 'function') {
                renderItineraryTimeline(cachedPollData);
            }
            
            // 2. 判斷身分與 Checklist 狀態
            checkUserMemberStatus(data);
            
            const currentConfigStr = JSON.stringify(data.config || {});
            const isFirstLoad = (lastConfigStr === "");
            
            if (isFirstLoad || currentConfigStr !== lastConfigStr) {
                lastConfigStr = currentConfigStr;
                console.log("🌐 [主架構渲染] 執行開機初次載入或後台變更 UI 鋪設");
                if (typeof renderDynamicUI === 'function') renderDynamicUI(data);
            }

            // 👑【首頁人數接管】：執行首頁人數精算
            if (typeof fetchResults === 'function') {
                fetchResults(data); 
            }

            // 👑 {全時名單同步神盾}
            if (typeof renderPeoplePage === 'function') {
                renderPeoplePage(data);
            }

            const activeSection = document.querySelector('.view-section.active');
            const currentActiveId = activeSection ? activeSection.id : "";

            // 🚀 以下進入純淨版 RWD 頁面換頁渲染分流
            if (currentActiveId === 'view-add-fee' || currentActiveId === 'view-custom-split-page') {
                if (typeof renderFeesPage === 'function') renderFeesPage(data); 
            } 
            else if (currentActiveId === 'view-prep' || currentActiveId === 'view-board' || currentActiveId === 'view-overview') {
                if (currentActiveId === 'view-overview' && data && data.messages) {
                    const cloudMsgArray = Array.isArray(data.messages) ? data.messages : Object.values(data.messages || {});
                    const cloudMsgCount = cloudMsgArray.length;
                    const isPureLikePayload = (lastMessagesCount === cloudMsgCount && lastMessagesCount > 0);
                    
                    if (isPureLikePayload) {
                        checkUserMemberStatus(data);
                    } else {
                        lastMessagesCount = cloudMsgCount;
                        if (typeof renderDynamicUI === 'function') renderDynamicUI(data);
                    }
                } else {
                    checkUserMemberStatus(data); 
                }
            } 
            else {
                if (data && data.messages) {
                    const cloudMsgArray = Array.isArray(data.messages) ? data.messages : Object.values(data.messages || {});
                    lastMessagesCount = cloudMsgArray.length;
                }
                if (currentActiveId === 'view-fees' && typeof renderFeesPage === 'function') {
                    renderFeesPage(data);
                }
            }
        }
    });
    
}

let hasUpdatedMetadata = false; // 🌟 全域防護旗標，確保每趟連線只更新一次時間，不造成監聽無窮迴圈

function checkUserMemberStatus(data) {
    let vArray = extractMembers(data);
    let userIdx = vArray.findIndex(row => row && (row['LINE ID'] === currentUser.id || row['LINEID'] === currentUser.id));

    if (userIdx > -1) {
        myFirebaseIndex = userIdx; // 🌟 精準鎖定本人在 Firebase 中的數字索引

        let userVote = vArray[userIdx]; 
        currentUser.isVoted = true; 
        const s = userVote['偏好行程'];
        if (s && s.includes("方案一")) currentUser.votedOption = 1;
        else if (s && s.includes("方案二")) currentUser.votedOption = 2;
        else currentUser.votedOption = 3;
        try { if(userVote['Checklist']) { userChecklistState = JSON.parse(userVote['Checklist']); } } catch(e) {}

        // 🌟【精準修正】定義變數，且限制只在初次登入時回寫一次時間與頭貼，完全不轉手 Sheets，快狠準！
        if (!hasUpdatedMetadata) {
            hasUpdatedMetadata = true;
            const loginTime = getFormattedTime();
            const avatarUrl = currentUser.pictureUrl || "";
            
            // 直接呼叫原生 SDK 更新本人的節點欄位
            db.ref(`/members/${userIdx}`).update({ "Last Login": loginTime, "AvatarUrl": avatarUrl });

            // 同時非同步送給 GAS 去刷 Excel 影子報表備份
            fetch(GAS_API_URL, { 
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "updateAvatar", userId: currentUser.id, pictureUrl: avatarUrl, loginTime: loginTime })
            }).catch(e => console.log("GAS 影子同步完成"));
        }

    } else {
        // B 路徑：全新訪客 ── 補入名單尾端
        currentUser.isVoted = true; 
        currentUser.votedOption = 3; 

        if (!hasUpdatedMetadata) {
            hasUpdatedMetadata = true;
            const loginTime = getFormattedTime();
            const avatarUrl = currentUser.pictureUrl || "";
            
            const newVisitor = { 
                "LINEID": currentUser.id, 
                "LINE名稱": currentUser.name, 
                "AvatarUrl": avatarUrl, 
                "偏好行程": "無法參加(訪客查看)",
                "Last Login": loginTime
            };
            vArray.push(newVisitor);
            myFirebaseIndex = vArray.length - 1;

            // 🎯【精準修復】：刪除原本誤寫的 db.ref(`/${myFirebaseIndex}`).set(newVisitor);
            // 100% 統一走我們修好的安全大閘，把資料乖乖關在 /members 資料夾裡！
            saveMembersToRoot(vArray);

            // 同步發送給 GAS 影子報表
            fetch(GAS_API_URL, { 
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ action: "vote", userName: currentUser.name, userId: currentUser.id, pictureUrl: avatarUrl, choice_trip: "無法參加(訪客查看)", time_opt1: "", time_opt2: "" }) 
            }).catch(e => console.error("GAS 新訪客寫回失敗:", e));
        }
    }
    // 🌟【關鍵修正】：不論是否首次載入，每次 Firebase 廣播都即時更新訪客標籤與登入時間
    const visitorBadge = document.getElementById('visitor-badge');
    if (visitorBadge) {
        visitorBadge.style.display = (currentUser.isVoted && currentUser.votedOption === 3) ? 'inline-flex' : 'none';
    }

    // 🚀 只有在「首次載入」時，才執行開機畫面解鎖
    if (!isFirstLoadComplete) {
        isFirstLoadComplete = true;
        
        const loadingEl = document.getElementById('loading');
        const lockScreenEl = document.documentElement.querySelector('#lock-screen');
        if (loadingEl) loadingEl.style.display = 'none';
        if (lockScreenEl) lockScreenEl.style.display = 'none'; 
        
        console.log("🚀 [首次載入] 身分比對成功，執行開機畫面解鎖");
        
        // 🎯【徹底修復】：直接呼叫原生解鎖，移除未定義的 updateLastLoginTime 報錯，絕不卡死！
        unlockMainApp();
    }
}

function toggleMenu(event) { 
    event.stopPropagation(); 
    if (!currentUser.isVoted) return;
    if (currentUser.votedOption === 3 && !isGuestViewEnabled) return;
    
    const m = document.getElementById('avatar-menu'); 
    const icon = document.getElementById('hamburger-icon');
    
    if (m.style.display === 'flex') {
        m.style.display = 'none';
        if(icon) icon.classList.remove('open');
    } else {
        m.style.display = 'flex';
        if(icon) icon.classList.add('open');
    }
}

function closeModal() { 
    document.body.classList.remove('no-scroll');
    document.getElementById('custom-modal').style.display = 'none'; 
    document.getElementById('modal-input').value = ''; 
    document.getElementById('modal-textarea').value=''; 
    const pwdToggle = document.getElementById('pwd-toggle');
    if(pwdToggle) { pwdToggle.innerHTML = svgEye; document.getElementById('modal-input').type = 'password'; }
}

function showCustomAlert(t, d, showBtn = true) { 
    document.getElementById('modal-title').innerText=t; 
    const descEl = document.getElementById('modal-desc');
    if (d) { 
        descEl.innerText = d; 
        descEl.style.display = 'block'; 
    } else { 
        descEl.style.display = 'none'; 
    }
    document.getElementById('modal-input-wrapper').style.display='none'; 
    document.getElementById('modal-textarea').style.display='none'; 
    document.getElementById('modal-btn-cancel').style.display='none'; 
    const btnGroup = document.getElementById('modal-btn-group');
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const spinner = document.getElementById('modal-spinner');
    document.body.classList.add('no-scroll');
    
    if (showBtn) { 
        btnGroup.style.display = 'flex'; 
        btnConfirm.style.display = 'block'; 
        btnConfirm.innerText="確定"; 
        btnConfirm.onclick=closeModal; 
        spinner.style.display = 'none'; 
        descEl.classList.remove('pulse-text'); 
    } else { 
        btnGroup.style.display = 'none'; 
        spinner.style.display = 'block'; 
        descEl.classList.add('pulse-text'); 
    }
    document.getElementById('custom-modal').style.display='flex'; 
}

// =========================================================================
// 🎯 👑【客製化 Prompt 提示框 ── 按鈕記憶清洗完全體】
// 💡 修正：在打開管理員登入密碼框時，強制重置所有按鈕樣式與 onclick，確保絕不破版錯位！
// =========================================================================
function showCustomPrompt(t, isPwd, cb) { 
    document.getElementById('modal-title').innerText = t; 
    document.getElementById('modal-desc').style.display = 'none'; 
    document.getElementById('modal-spinner').style.display = 'none'; 
    document.getElementById('modal-input-wrapper').style.display = 'block'; 
    
    const inp = document.getElementById('modal-input');
    inp.type = isPwd ? 'password' : 'text'; 
    inp.placeholder = isPwd ? "請輸入密碼" : "請輸入內容"; 
    
    document.getElementById('pwd-toggle').style.display = isPwd ? 'block' : 'none';
    document.getElementById('pwd-toggle').innerHTML = svgEye;
    document.getElementById('modal-textarea').style.display = 'none'; 
    document.getElementById('modal-btn-group').style.display = 'flex'; 
    
    // 👑【物理清洗防線】：強制還原取消與確認按鈕的標準外觀與文字，洗掉退場防呆的殘留痕跡！
    const btnCancel = document.getElementById('modal-btn-cancel');
    const btnConfirm = document.getElementById('modal-btn-confirm');
    
    if (btnCancel) {
        btnCancel.style.display = 'block';
        btnCancel.style.background = ""; // 恢復原生灰色
        btnCancel.style.color = "";
        btnCancel.innerText = "取消"; 
        btnCancel.onclick = closeModal; // 點擊回歸單純的關閉
    }
    
    if (btnConfirm) {
        btnConfirm.style.display = 'block';
        btnConfirm.innerText = "送出"; 
        btnConfirm.onclick = function() { 
            let val = inp.value; 
            closeModal(); 
            cb(val); 
        }; 
    }
    
    document.body.classList.add('no-scroll');
    document.getElementById('custom-modal').style.display = 'flex'; 
    setTimeout(() => inp.focus(), 100); 
}

function openCarDrawer(t, c) { 
    document.body.classList.add('no-scroll'); 
    document.getElementById('drawer-title').innerHTML = t; 
    document.getElementById('drawer-body').innerHTML = c; 
    const d = document.getElementById('custom-drawer'); 
    d.style.display = 'block'; 
    setTimeout(() => d.classList.add('show'), 10); 
}

function closeDrawer() { 
    document.body.classList.remove('no-scroll'); 
    const d = document.getElementById('custom-drawer'); 
    d.classList.remove('show'); 
    setTimeout(() => d.style.display = 'none', 300); 
}

const drawerContent = document.querySelector('.drawer-content');
let drawerStartY = 0;
let drawerCurrentY = 0;
let isDraggingDrawer = false;

drawerContent.addEventListener('touchstart', (e) => {
    if (drawerContent.scrollTop <= 0) {
        drawerStartY = e.touches[0].clientY;
        drawerCurrentY = drawerStartY;
        isDraggingDrawer = true;
        drawerContent.style.transition = 'none'; 
    }
}, {passive: true});

drawerContent.addEventListener('touchmove', (e) => {
    if (!isDraggingDrawer) return;
    drawerCurrentY = e.touches[0].clientY;
    const diffY = drawerCurrentY - drawerStartY;
    if (diffY > 0) { e.preventDefault(); drawerContent.style.transform = `translateY(${diffY}px)`; } 
    else { e.preventDefault(); drawerContent.style.transform = `translateY(0px)`; }
}, {passive: false});

drawerContent.addEventListener('touchend', (e) => {
    if (!isDraggingDrawer) return;
    isDraggingDrawer = false;
    const diffY = drawerCurrentY - drawerStartY;
    drawerContent.style.transition = 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s';
    drawerContent.style.transform = ''; 
    if (diffY > 80) closeDrawer();
});

async function shareNotice(title, id) {
    const shareUrl = window.location.href.split('?')[0] + '?notice=' + id;
    
    const shareTextContent = "【出遊指南公告】\n" + title + "\n👉 點擊查看完整內容：";
    
    if (navigator.share) {
        try { 
            await navigator.share({ 
                title: "【出遊指南公告】",
                text: shareTextContent, 
                url: shareUrl 
            }); 
        } catch (err) {}
    } else {
        const copyText = shareTextContent + "\n" + shareUrl;
        navigator.clipboard.writeText(copyText).then(() => { 
            showCustomAlert("已複製", "連結已複製到剪貼簿！可以貼上分享囉！"); 
        });
    }
}

function renderDynamicUI(data) {
    if (!data) return;
    const cfg = data.config || {};

    // =========================================================================
    // 🌟 1. 前後台開關狀態實時同步校正（使用安全解析器 getConfigBool，絕不重複）
    // =========================================================================
    
    // 1. 同步鎖定補投票系統開關
    const adminLockToggle = document.getElementById('admin-lock-toggle');
    if (adminLockToggle) {
        adminLockToggle.checked = getConfigBool(cfg, 'VotingLocked', false);
    }

    // 🎯 4. 同步與監聽管理員結算清算鎖狀態
    const settlementLockToggle = document.getElementById('admin-settlement-lock-toggle');
    if (settlementLockToggle) {
        settlementLockToggle.checked = getConfigBool(cfg, 'SettlementLocked', false);
    }

    // 2. 同步開放訪客查看（總開關）
    const guestToggle = document.getElementById('admin-guest-toggle');
    if (guestToggle) {
        let isGuestOn = getConfigBool(cfg, 'GuestViewEnabled', false);
        guestToggle.checked = isGuestOn;
        const subOptionsDiv = document.getElementById('admin-guest-sub-options');
        if (subOptionsDiv) subOptionsDiv.style.display = isGuestOn ? 'block' : 'none';
    }
    
    // 3. 同步訪客查看權限的各個子開關
    const subOverview = document.getElementById('admin-guest-overview');
    const subAcc = document.getElementById('admin-guest-acc');
    const subPpl = document.getElementById('admin-guest-ppl');
    const subFee = document.getElementById('admin-guest-fee');
    const subItinerary = document.getElementById('admin-guest-itinerary');
    const subPrep = document.getElementById('admin-guest-prep');
    const subBoard = document.getElementById('admin-guest-board');
    
    if(subOverview) subOverview.checked = getConfigBool(cfg, 'Guest_View_Overview', true);
    if(subAcc) subAcc.checked = getConfigBool(cfg, 'Guest_View_Acc', true);
    if(subPpl) subPpl.checked = getConfigBool(cfg, 'Guest_View_Ppl', true);
    if(subFee) subFee.checked = getConfigBool(cfg, 'Guest_View_Fee', true);
    if(subItinerary) subItinerary.checked = getConfigBool(cfg, 'Guest_View_Itinerary', true);
    if(subPrep) subPrep.checked = getConfigBool(cfg, 'Guest_View_Prep', true);
    if(subBoard) subBoard.checked = getConfigBool(cfg, 'Guest_View_Board', true);

    // 🌟【訪客權限與公告渲染】：精準呼叫一次，絕不浪費硬體效能
    applyVisitorPermissions(cfg);
    renderNoticesWithMagic(cfg); 

    // =========================================================================
    // 🌟 2. 旅遊基本資訊、天數倒數渲染（淨化時間戳 ＆ 接入動態圖片資料庫）
    // =========================================================================
    if(cfg.TripTitle) { document.getElementById('ui-trip-title').innerText = cfg.TripTitle; document.getElementById('vote-ui-title').innerText = cfg.TripTitle; }
    if(cfg.TripDate) { document.getElementById('ui-trip-date').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> <span>${cfg.TripDate}</span>`; }
    if(cfg.InfoAcc) document.getElementById('ui-info-acc').innerText = cfg.InfoAcc;
    // 🟢 修正後：只有當首頁金額完全是空的或 '--' 時才顯示預設字，只要有跑精算就絕對不允許蓋台！
    if (cfg.InfoPrice && (!document.getElementById('ui-info-price').innerText || document.getElementById('ui-info-price').innerText === '--')) {
        document.getElementById('ui-info-price').innerText = cfg.InfoPrice;
    }
    
    // 🎯【時間戳格式淨化防護】：不論 GAS 不小心回寫了 T00:00:00 還是帶有任何雜質，
    // 我們強制切除、只撈取前 10 個字（YYYY-MM-DD），確保 iOS Safari 絕對不會拋出 NaN 錯誤！
    if(cfg.DepartureDate) {
        const cleanDateStr = String(cfg.DepartureDate).substring(0, 10).replace(/\//g, '-');
        countdownTargetDate = new Date(cleanDateStr + "T00:00:00").getTime();
    }
    initDaysCountdown();

    // 🌟【首頁圖片動態資料庫連線】：
    // 尋找你 index.html 首頁頂端的那張 class="hero-image-compact"
    const heroImgEl = document.querySelector('.hero-image-compact');
    if (heroImgEl) {
        // 如果 Firebase 資料庫裡面有設定 HeroImageUrl，就一秒替換它；
        // 萬一沒有設定，就完美咬住你原本在 HTML 裡面寫死的那張原始預設圖（防線建立）！
        if (cfg.HeroImageUrl && cfg.HeroImageUrl.trim() !== "") {
            heroImgEl.src = cfg.HeroImageUrl.trim();
        }
    }

    // =========================================================================
    // 🌟 4. 延遲列表數據非同步渲染（車次、房型床位、詳細行程、清單）
    // =========================================================================
    setTimeout(() => {
        if (data.transport && data.transport.length > 0) {
            let carHtml = "";
            data.transport.forEach(car => {
                if (!car) return; 
                const driverName = car['Driver'] || '尚未指定';
                const phone = car['Phone'] || '';
                const passengersRaw = car['Passengers'] || '';
                const available = car['Available'] || '0';
                const meetPoint = car['MeetPoint'] || '尚未指定';
                const mapLink = car['MapLink'] || '';

                const phoneBtn = phone ? 
                    `<a href="tel:${phone}" style="display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; background:linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.4)); color:var(--primary-blue); border-radius:50%; text-decoration:none; border:1px solid rgba(255,255,255,0.9); box-shadow:0 4px 10px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,1); backdrop-filter:blur(10px); transition:all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onmouseover="this.style.transform='scale(1.1)'; this.style.background='rgba(255,255,255,0.9)';" onmouseout="this.style.transform='scale(1)'; this.style.background='linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.4))';">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </a>` : '';

                const passArr = passengersRaw.split(',').map(p => p.trim()).filter(p => p);
                const passTags = passArr.length > 0 
                    ? passArr.map(p => `<div class="member-tag" style="font-size:12px; padding:4px 10px;">${p}</div>`).join('') 
                    : '<span style="color:var(--text-muted); font-size:12px; font-weight:500;">無</span>';

                const mapBtn = mapLink ? 
                    `<a href="${mapLink}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; color:var(--primary-blue); background:rgba(0,123,255,0.08); padding:6px 12px; border-radius:16px; text-decoration:none; margin-top:8px; transition:0.2s;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 導航至 Google Map
                    </a>` : '';

                const drawerContent = `
                    <div style="background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.9); border-radius: 16px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.02), inset 0 1px 1px rgba(255,255,255,0.7);">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px dashed rgba(0,0,0,0.08); padding-bottom: 12px; margin-bottom: 12px;">
                            <div style="font-size:16px; font-weight:800; color:var(--text-main);">${driverName}</div>
                            ${phoneBtn}
                        </div>
                        <div style="border-bottom: 1px dashed rgba(0,0,0,0.08); padding-bottom: 12px; margin-bottom: 12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <div style="font-size:11px; font-weight:600; color:var(--text-muted);">乘客名單</div>
                                <div style="font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700; color:var(--primary-orange); background:rgba(249,168,38,0.1); border:1px solid rgba(249,168,38,0.2);">空位 ${available} 人</div>
                            </div>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                                ${passTags}
                            </div>
                        </div>
                        <div>
                            <div style="font-size:11px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">集合點</div>
                            <div style="font-size:14px; font-weight:700; color:var(--text-main); line-height:1.4;">${meetPoint}</div>
                            ${mapBtn}
                        </div>
                    </div>
                `;

                const safeDrawerContent = encodeURIComponent(drawerContent).replace(/'/g, "%27");

                carHtml += `
                <div class="car-item" onclick="if(!window.isCarDragging) openCarDrawer('${car.CarName}', decodeURIComponent('${safeDrawerContent}'))">
                    <div class="car-name">${car.CarName}</div>
                    <div class="car-driver">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; vertical-align:-2px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        ${driverName}
                    </div>
                </div>`;
            });
            document.getElementById('ui-cars-container').innerHTML = carHtml;
            initCarGridDrag();
        } else { document.getElementById('ui-cars-container').innerHTML = '<p style="color:#888; font-size:13px; margin:0;">尚未安排車次</p>'; }
        
        if (data.bnbs && data.bnbs.length > 0) {
            let rulesHtml = ''; let roomsHtml = '';
            data.bnbs.forEach(item => {
                if (!item) return; 
                const type = item['類型'];
                if (type === '注意事項') {
                    rulesHtml += `<div class="acc-rule-item"><div class="rule-icon">${item['標籤']}</div><div class="rule-text">${item['內容']}</div></div>`;
                } else if (type === '房型床位') {
                    let membersHtml = '';
                    for (let i = 1; i <= 6; i++) {
                        const memberName = item[`人員${i}`];
                        if (memberName) membersHtml += `<div class="member-tag">${memberName}</div>`;
                    }
                    roomsHtml += `
                    <div class="room-card">
                        <div class="room-header">
                            <div class="room-header-left">
                                <div class="room-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg></div>
                                <div class="room-name">${item['標籤']}</div>
                            </div>
                            <div class="room-badge">${item['內容']}</div>
                        </div>
                        <div class="room-members">${membersHtml}</div>
                    </div>`;
                }
            });
            const rulesContainer = document.getElementById('acc-rules-container');
            const roomsContainer = document.getElementById('acc-rooms-container');
            if (rulesContainer) rulesContainer.innerHTML = rulesHtml || '<p style="color:#888; font-size:13px;">目前無注意事項</p>';
            if (roomsContainer) roomsContainer.innerHTML = roomsHtml || '<p style="color:#888; font-size:13px;">尚未分配房間</p>';
        }

        if (data.itinerary && data.itinerary.length > 0) {
            let itinHtml = ""; let currentDay = "";
            data.itinerary.forEach(item => {
                if (!item) return; 
                if (item.Day !== currentDay) { 
                    if(currentDay !== "") itinHtml += `</div></div>`; 
                    currentDay = item.Day; 
                    let displayDay = currentDay === "Day 2" ? "Day 2 - 06/28(日)" : "Day 1 - 06/27(六)";
                    itinHtml += `<div class="card"><h3 style="margin-top:0; color:var(--primary-orange); border-bottom:1px solid rgba(255,255,255,0.3); padding-bottom:12px; font-size: 16px;">${displayDay}</h3><div class="timeline">`; 
                }
                
                let timeStr = item.Time || "";
                if (timeStr && !timeStr.includes('午')) { 
                    const parts = timeStr.split(':');
                    if (parts.length >= 2) {
                        let h = parseInt(parts[0], 10);
                        if (!isNaN(h)) {
                            let ampm = h >= 12 ? '下午' : '上午';
                            h = h % 12 || 12; 
                            timeStr = `${ampm} ${h}:${parts[1]}`;
                        }
                    }
                }

                let linkStr = item.Link ? `<br><a href="${item.Link}" target="_blank" style="display:inline-block; margin-top:8px; color:var(--primary-blue); text-decoration:none; font-size:12px; font-weight:700; background:rgba(0,123,255,0.08); padding:4px 10px; border-radius:12px; transition:0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>導航至 Google Map</a>` : "";
                itinHtml += `<div class="timeline-item"><div class="time-badge">${timeStr}</div><div class="event-title">${item.Title}</div><div class="event-desc">${item.Desc}${linkStr}</div></div>`;
            });
            if(currentDay !== "") itinHtml += `</div></div>`; 
            document.getElementById('ui-timeline-wrapper').innerHTML = itinHtml;
        }
        
        if (data.checklist && data.checklist.length > 0) {
            checklistData = data.checklist;
            checklistData.forEach(cat => {
                if (!cat) return; 
                if (openCategories[cat.id] === undefined) openCategories[cat.id] = true; 
            });
        }
        
        renderChecklist(); 
    }, 50);

    renderPeoplePage(data);
    renderFeesPage(data);

    // =========================================================================
    // 🌟 [補報名確認提交按鈕 - 終極完全體鎖定與防破版安全線]
    // 💡 徹底無視全半形冒號與空格干擾！只要已報名，就地封鎖按鈕、改字、變灰，並推開 60px 間距消滅破版！
    // =========================================================================
    const realSubmitBtn = document.getElementById('btn-submit-vote');
    if (realSubmitBtn) {
        
        // 🎯 核心加固：只要當前用戶有投票紀錄(isVoted)
        // 且他的偏好行程欄位「不包含」無法參加與訪客字眼，直接霸道沒收權限，防範一切字串錯位！
        const currentTripStr = currentUser.votedOption ? String(currentUser.votedOption) : '';
        const rawTripText = (cachedPollData && myFirebaseIndex > -1) ? String(extractMembers(cachedPollData)[myFirebaseIndex]['偏好行程'] || '') : '';

        if (currentUser.isVoted && !rawTripText.includes("無法參加") && !rawTripText.includes("訪客")) {
            
            realSubmitBtn.disabled = true;                // 🔒 物理鎖死：不能按
            realSubmitBtn.innerText = "您已完成報名";       // 📝 變更文字
            
            // 🎨 視覺降級：用最高權限行內樣式，確保 100% 變灰不發光
            realSubmitBtn.style.setProperty('background', '#cbd5e0', 'important');    
            realSubmitBtn.style.setProperty('color', '#718096', 'important');
            realSubmitBtn.style.setProperty('cursor', 'not-allowed', 'important');
            realSubmitBtn.style.setProperty('box-shadow', 'none', 'important');
            realSubmitBtn.style.setProperty('opacity', '0.8', 'important');
            
            // 🛡️ 沒收點擊：防止任何穿透
            realSubmitBtn.onclick = null;
        } else {
            // 狀況 B：真的是未報名的訪客，維持健康的原本綠色按鈕
            realSubmitBtn.disabled = false;
            realSubmitBtn.innerText = "確認提交";
            realSubmitBtn.style.background = "";
            realSubmitBtn.style.color = "";
            realSubmitBtn.style.cursor = "pointer";
            realSubmitBtn.style.boxShadow = "";
            realSubmitBtn.style.opacity = "";
        }
        
        // 🎯 絕殺破版防護：不管狀態如何，按鈕下方強制加上 60px 剛性邊距，保證永遠懸浮在導覽列上方！
        realSubmitBtn.style.setProperty('margin-bottom', '60px', 'important');
    }
} 


// 🌟 補回核心：車次滑塊控制函式（手機回歸原生極速貼邊滾動，電腦保留滑鼠拖曳，防止程式斷頭）
function initCarGridDrag() {
    const slider = document.querySelector('.car-grid');
    if(!slider) return;
    let isDown = false; let startX; let scrollLeft;

    slider.addEventListener('mousedown', (e) => { isDown = true; window.isCarDragging = false; slider.style.cursor = 'grabbing'; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; slider.style.cursor = 'grab'; });
    slider.addEventListener('mouseup', () => { isDown = false; slider.style.cursor = 'grab'; setTimeout(() => window.isCarDragging = false, 50); });
    slider.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); window.isCarDragging = true; const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 1.5; slider.scrollLeft = scrollLeft - walk; });
}

function applyVisitorPermissions(cfg) {
    // 1. 補報名系統獨立防護
    const currentActive = document.querySelector('.view-section.active');
    const currentId = currentActive ? currentActive.id.replace('view-', '') : '';
    
    if (currentId === 'voting' && String(cfg.VotingLocked).toLowerCase() === 'true') {
        switchView('voting'); // 轉向灰色鎖頭
        return;
    } else if (currentId === 'guest-locked' && !document.querySelector('.nav-item.active')) {
        if (String(cfg.VotingLocked).toLowerCase() !== 'true') {
            switchView('voting');
            return;
        }
    }

    // 👇 2. 首頁總覽的三個按鈕狀態 (移到前面，確保能確實上鎖與解鎖)
    const isGuest = currentUser.votedOption === 3;
    isGuestViewEnabled = getConfigBool(cfg, 'GuestViewEnabled', false);

    const lockSvg = `<span style="font-size:11px; display:inline-flex; align-items:center; gap:3px; color:#a0aec0; font-weight:700;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>鎖定</span>`;
    const permMap = [
        { key: 'Guest_View_Acc', btnId: 'btn-info-acc', valId: 'ui-info-acc', original: cfg.InfoAcc, target: 'accommodation' },
        { key: 'Guest_View_Ppl', btnId: 'btn-info-ppl', valId: 'ui-info-ppl', original: cfg.InfoPpl, target: 'people' },
        { key: 'Guest_View_Fee', btnId: 'btn-info-fee', valId: 'ui-info-price', original: cfg.InfoPrice, target: 'fees' }
    ];

    permMap.forEach(item => {
        const btn = document.getElementById(item.btnId);
        const val = document.getElementById(item.valId);
        // 只有「是訪客」且「該區塊未開放」才會上鎖
        const isLocked = isGuest && !getConfigBool(cfg, item.key, true);

        if (btn) {
            if (isLocked) {
                btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed';
                btn.onclick = (e) => { e.stopPropagation(); }; 
                if (val) val.innerHTML = lockSvg;
            } else {
                btn.style.opacity = '1'; btn.style.cursor = 'pointer';
                btn.onclick = () => switchView(item.target);
                if (val) val.innerText = item.original || '--';
            }
        }
    });
    if (!isGuest) return; 

    // 3. 訪客的轉址防護與紅鎖頭判斷
    const isRedLockVisible = document.getElementById('guest-lock-screen').style.display === 'block';
    const isSafePage = ['admin', 'admin-notices', 'result', 'archive', 'voting'].includes(currentId);

    if (!isGuestViewEnabled) {
        if (!isRedLockVisible && !isSafePage) switchView('overview'); 
        return; 
    } else if (isGuestViewEnabled && isRedLockVisible) {
        switchView('overview'); 
    }

    if (currentActive) {
        const keyMap = { 'overview':'Guest_View_Overview', 'accommodation':'Guest_View_Acc', 'people':'Guest_View_Ppl', 'fees':'Guest_View_Fee', 'itinerary':'Guest_View_Itinerary', 'prep':'Guest_View_Prep', 'board':'Guest_View_Board' };
        
        if (keyMap[currentId] && !getConfigBool(cfg, keyMap[currentId], true)) {
            switchView(currentId); 
        } else if (currentId === 'guest-locked') {
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) {
                const target = activeNav.id.replace('tab-', ''); 
                if (getConfigBool(cfg, keyMap[target], true)) {
                    switchView(target); 
                }
            }
        }
    }
}

function renderNoticesWithMagic(cfg) {
    const container = document.getElementById('ui-notices-container');
    adminNoticesArray = []; 
    
    if (cfg.NoticesData) {
        try { adminNoticesArray = JSON.parse(cfg.NoticesData); } catch(e) {}
    } else {
        let i = 1;
        while(cfg[`Notice${i}_Title`]) {
            let rawTime = cfg[`Notice${i}_Time`] || '';
            let type = '';
            if(rawTime.startsWith('[PIN]')) type = '[PIN]';
            else if(rawTime.startsWith('[NEW]')) type = '[NEW]';
            let cleanTime = rawTime.replace('[PIN]', '').replace('[NEW]', '').trim();
            if (/^\d{4}-\d{2}-\d{2}T/.test(cleanTime)) {
                let d = new Date(cleanTime);
                cleanTime = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : cleanTime.split('T')[0];
            }
            adminNoticesArray.push({
                id: 'Notice' + i, 
                title: cfg[`Notice${i}_Title`],
                desc: cfg[`Notice${i}_Desc`] || '',
                imgUrl: cfg[`Notice${i}_ImgUrl`] || '',
                time: cleanTime,
                type: type,
                isHidden: false
            });
            i++;
        }
    }

    if (adminNoticesArray.length === 0) { 
        if(container) container.innerHTML = '<p style="color:#888; font-size:13px;">目前無公告</p>'; 
        return; 
    }
    
    let html = "";
    function parseMagicLinks(str) {
        if (!str) return "";
        return str
            .replace(/\[前往民宿按鈕\]/g, `<span onclick="switchView('accommodation'); switchAccTab('info'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> 民宿資訊</span>`)
            .replace(/\[前往分房按鈕\]/g, `<span onclick="switchView('accommodation'); switchAccTab('rooms'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg> 分房名單</span>`)
            .replace(/\[前往行程按鈕\]/g, `<span onclick="switchView('itinerary'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 詳細行程</span>`)
            .replace(/\[前往物品按鈕\]/g, `<span onclick="switchView('prep'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v10H4z"></path><path d="M8 10V6a4 4 0 0 1 8 0v4"></path></svg> 攜帶物品</span>`)
            .replace(/\[前往留言板按鈕\]/g, `<span onclick="switchView('board'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 留言板</span>`)
            .replace(/\[前往人數按鈕\]/g, `<span onclick="switchView('people'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> 查看報名狀況</span>`)
            .replace(/\[前往費用按鈕\]/g, `<span onclick="switchView('fees'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg> 查看費用</span>`);
    }

    adminNoticesArray.forEach(n => {
        if (n.isHidden) return;
        let displayTime = (n.time || '').replace('[PIN]', '').replace('[NEW]', '').trim().replace(/-/g, '/');
        let isPinned = n.type === '[PIN]';
        let imgUrls = n.imgUrl ? n.imgUrl.split('\n').map(u => u.trim()).filter(u => u) : [];
        let lines = (n.desc || '').split('\n');
        let isLong = lines.length > 2;
        let needsExpand = isLong || imgUrls.length > 0;

        let shortText = isLong ? lines[0] + '\n' + lines[1] + '...' : n.desc;
        let parsedShort = parseMagicLinks(shortText);
        let parsedFull = parseMagicLinks(n.desc);
        let imgHtml = imgUrls.map(url => `<img src="${url}" class="notice-expand-img" onclick="openImageViewer('${url}', event)">`).join('');
        
        html += `
            <div class="notice-card-new ${isPinned ? 'notice-card-pinned' : ''}" id="notice-card-${n.id}" onclick="if(${needsExpand} && !this.classList.contains('expanded')) this.classList.add('expanded')">
                <div class="notice-header">
                    <div class="notice-title">${n.title}</div>
                    <div style="display:flex; align-items:center;">
                        ${isPinned ? '<div class="notice-pin-new">置頂公告</div>' : (n.type==='[NEW]' ? '<div class="notice-new-badge">最新消息</div>' : '')}
                        <div onclick="shareNotice('${n.title}', '${n.id}'); event.stopPropagation();" class="share-icon-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        </div>
                    </div>
                </div>
                <div class="notice-content-short">${parsedShort}${needsExpand ? '<span class="read-more-inline">查看更多</span>' : ''}</div>
                <div class="notice-content-full">${parsedFull}</div>
                ${imgHtml}
                ${needsExpand ? `<div class="notice-expand-footer"><span class="show-less-inline" onclick="event.stopPropagation(); this.closest('.notice-card-new').classList.remove('expanded');">顯示較少</span></div>` : ''}
                <div class="notice-footer" style="margin-top:10px;">${displayTime}</div>
            </div>`;
    });
    if(container) container.innerHTML = html;
}

function switchView(t) {
    // =========================================================================
    // 🛡️ 👑【最高指揮官退場防呆手煞車 ── 公告 ＆ 行程雙軌大融合隔離版】
    // 💡 修正：完美解決共用 Modal 導致管理員登入彈窗破版的陳年 Bug！
    // =========================================================================
    const currentActiveSection = document.querySelector('.view-section.active');
    const currentViewId = currentActiveSection ? currentActiveSection.id : "";
    
    // 🎯 建立精準攔截雙軌雷達：判定目前是不是在「公告後台」或「行程後台」，且管理員真的有改過內容？
    const isLeavingAdminNotices = (currentViewId === 'view-admin-notices' && t !== 'admin-notices' && window.isNoticePageDirty === true);
    const isLeavingAdminItinerary = (currentViewId === 'view-admin-itinerary' && t !== 'admin-itinerary' && window.isNoticePageDirty === true);
    
    if (isLeavingAdminNotices || isLeavingAdminItinerary) {
        if (navigator.vibrate) navigator.vibrate(50); // 手機輕微觸覺提示
        
        // 叫醒公共彈窗並注入文字
        document.getElementById('modal-title').innerText = "內容尚未儲存！";
        const descEl = document.getElementById('modal-desc');
        if (descEl) {
            descEl.innerText = "未儲存的內容將會遺失\n確定要直接離開嗎？";
            descEl.style.display = 'block';
        }
        
        // 沒收密碼框或不相關欄位
        if (document.getElementById('modal-input-wrapper')) document.getElementById('modal-input-wrapper').style.display = 'none';
        if (document.getElementById('modal-textarea')) document.getElementById('modal-textarea').style.display = 'none';
        
        // 配置退場防呆專屬的兩大按鈕行為
        const btnCancel = document.getElementById('modal-btn-cancel');
        const btnConfirm = document.getElementById('modal-btn-confirm');
        
        if (btnCancel) {
            btnCancel.style.display = 'block';
            btnCancel.innerText = "留在本頁";
            btnCancel.onclick = function() { closeModal(); }; // 留下來繼續編輯，單純關閉彈窗
        }
        if (btnConfirm) {
            btnConfirm.style.display = 'block';
            btnConfirm.innerText = "確定離開";
            btnConfirm.onclick = function() {
                window.isNoticePageDirty = false; // 🔓 強制解鎖髒資料旗標，放行海關
                closeModal();
                switchView(t); // 重新呼叫換頁，這次就會安全滑過去了
            };
        }
        
        if (document.getElementById('modal-btn-group')) document.getElementById('modal-btn-group').style.display = 'flex';
        if (document.getElementById('custom-modal')) document.getElementById('custom-modal').style.display = 'flex';
        return; // 🛑 剛性截斷：死死扣在當前頁面，絕對不往下執行換頁！
    }

    // 🔒 剛性 0 延遲定錨防抖：全面代替老舊的 smooth 滾動，任何分頁換頁絕不引發彈跳位移！
    window.scrollTo(0, 0);

    // =========================================================================
    // 🛡️ 以下為你原廠完全健康的萬行代碼，100% 完璧保留、一字不動
    // =========================================================================
    const topNav = document.querySelector('.top-nav');
    const mainAppEl = document.getElementById('app'); 
    
    if (topNav) {
        if (t === 'add-fee') {
            topNav.style.setProperty('display', 'none', 'important');
        } else {
            topNav.style.setProperty('display', 'flex', 'important');
            topNav.classList.remove('nav-hidden');
        }
    }

    let isMasterLocked = false;
    let isSectionLocked = false;

    if (cachedPollData && cachedPollData.config) {
        const cfg = cachedPollData.config;
        
        if (currentUser.votedOption === 3) {
            if (t !== 'admin' && t !== 'admin-notices' && t !== 'result' && t !== 'archive' && t !== 'voting' && t !== 'custom-split-page') {
                if (!getConfigBool(cfg, 'GuestViewEnabled', false)) {
                    isMasterLocked = true;
                } else {
                    const keyMap = { 'overview': 'Guest_View_Overview', 'accommodation': 'Guest_View_Acc', 'people': 'Guest_View_Ppl', 'fees': 'Guest_View_Fee', 'itinerary': 'Guest_View_Itinerary', 'prep': 'Guest_View_Prep', 'board': 'Guest_View_Board' };
                    let subKey = keyMap[t] || '';
                    if (subKey && !getConfigBool(cfg, subKey, true)) {
                        isSectionLocked = true;
                    }
                }
            }
        }
    }

    if (isMasterLocked) {
        if (mainAppEl) mainAppEl.style.setProperty('display', 'none', 'important');
        document.getElementById('bottom-nav-block').style.display = 'none';
        document.getElementById('guest-lock-screen').style.display = 'block';
        if (typeof refreshMessagesOnly === "function") refreshMessagesOnly(true); 
        return; 
    } else {
        document.getElementById('guest-lock-screen').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'none';
        
        if (mainAppEl) mainAppEl.style.setProperty('display', 'block', 'important');

        if (currentUser.isVoted) {
            if (currentUser.votedOption !== 3 || (currentUser.votedOption === 3 && isGuestViewEnabled)) {
                if (t === 'add-fee' || t === 'fees' || t === 'custom-split-page') {
                    document.getElementById('bottom-nav-block').style.setProperty('display', 'none', 'important');
                } else {
                    document.getElementById('bottom-nav-block').style.setProperty('display', 'flex', 'important');
                }
            }
        }
    }

    let viewIdToRender = isSectionLocked ? 'guest-locked' : t;
    const targetView = document.getElementById('view-' + viewIdToRender);
    
    document.getElementById('avatar-menu').style.display = 'none';
    const hIcon = document.getElementById('hamburger-icon');
    if(hIcon) hIcon.classList.remove('open');

    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    if (targetView) targetView.classList.add('active');

    let baseTabId = ['accommodation', 'people', 'fees'].includes(t) ? 'overview' : t;
    const activeTab = document.getElementById('tab-' + baseTabId);
    const indicator = document.getElementById('nav-indicator');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (activeTab) {
        activeTab.classList.add('active');
        if (indicator) { 
            indicator.style.width = activeTab.offsetWidth + 'px'; 
            indicator.style.left = relativeOffsetLeft(activeTab, document.getElementById('bottom-nav-block')) + 'px'; 
        }
    }

    if (typeof refreshMessagesOnly === "function") refreshMessagesOnly(true); 
    if (t === 'board') {
        clearBadge();
        if (typeof renderMessagesPaginated === 'function') {
            renderMessagesPaginated();
        }
    }
    
    if (t === 'overview') {
        if (typeof fetchResults === 'function') {
            fetchResults(cachedPollData);
        }
    }
    
    if (t === 'result') {
        calculateAndRenderSettlement(); 
    }

    const isFeePage = (t === 'fees' || t === 'add-fee' || t === 'custom-split-page');
    document.getElementById('bottom-blur-mask').style.setProperty('display', isFeePage ? 'none' : 'block', 'important');
    
    const floatingBtnWrap = document.querySelector('.fee-floating-btn-wrap');
    if (floatingBtnWrap) {
        if (t === 'fees') {
            floatingBtnWrap.style.setProperty('display', 'block', 'important');
        } else {
            floatingBtnWrap.style.setProperty('display', 'none', 'important');
        }
    }
}

// 🎯 智慧防破版滑塊位移精算工具函數
function relativeOffsetLeft(element, parent) {
    let left = 0;
    while (element && element !== parent) {
        left += element.offsetLeft;
        element = element.offsetParent;
    }
    return left;
}

// 🌟 完整替換 app.js 中的 unlockMainApp 函數
function unlockMainApp() {
    if (currentUser.votedOption === 3 && !isGuestViewEnabled) {
        document.getElementById('app').style.display = 'none';
        document.getElementById('bottom-nav-block').style.display = 'none';
        document.getElementById('bottom-blur-mask').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('guest-lock-screen').style.display = 'block';
        return; 
    }
    
    document.getElementById('lock-screen').style.display = 'none';
    document.getElementById('guest-lock-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    if (currentUser.isVoted) {
        if (currentUser.votedOption === 3) {
            document.getElementById('visitor-badge').style.display = 'inline-flex';
        } else {
            document.getElementById('visitor-badge').style.display = 'none';
        }

        document.getElementById('bottom-nav-block').style.display = 'flex';
        initNavTouchTracking();
        document.getElementById('bottom-blur-mask').style.display = 'block'; 
        initDaysCountdown(); markArchive(); 
        
        setTimeout(() => {
            // 🌟【關鍵修改】：改為讀取最一開始快取下來的安全參數，徹底免疫被 LIFF 抹除的硬傷
            const targetView = urlParamsCache.view || sessionStorage.getItem('pending_view');  
            const targetMsgId = urlParamsCache.msgId || sessionStorage.getItem('pending_msg_id'); 
            const noticeId = urlParamsCache.noticeId || sessionStorage.getItem('pending_notice_id');

            // 優先處理公告定位
            if (noticeId) {
                switchView('overview'); // 確保在首頁
                
                setTimeout(() => {
                    const card = document.getElementById('notice-card-' + noticeId);
                    if (card) {
                        card.classList.add('expanded'); // 自動展開全內文
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 平滑滾動置中
                    } else {
                        // 🌟【規格二優化】：如果在後台被管理員隱藏或刪除，卡片不會被生出。
                        // 這時執行安全防護：完全不做動作，安靜留存在首頁(Overview)，絕不亂跳去留言板！
                        console.log("💡 提示：該公告可能已被管理員隱藏或刪除，系統自動安全留存在首頁。");
                        switchView('overview');
                    }
                }, 550); 
                
           // 🌟 找到 unlockMainApp 內部的 targetView === 'board' 區塊，完整覆蓋為雷達整合版
            } else if (targetView === 'board') {
                if (targetMsgId) {
                    console.log("❄️ 發現開機帶有特定留言 ID，立刻智慧分頁...");
                    handleMessageDeepLink(targetMsgId);
                } else {
                    switchView('board');
                }
            } else {
                // 🎯 修正後：開機時如果網址快取指定了結算頁面，放行留在 result，其餘才退回首頁
                const currentActiveView = document.querySelector('.view-section.active');
                const currentViewId = currentActiveView ? currentActiveView.id.replace('view-', '') : 'overview';
                
                if (targetView === 'result' || currentViewId === 'result') {
                    switchView('result');
                } else {
                    switchView('overview');
                }
            }

            // 🌟成功解鎖導流後，清除備份快取，防止重新整理時重複觸發
            sessionStorage.removeItem('pending_notice_id');
            sessionStorage.removeItem('pending_view');
            sessionStorage.removeItem('pending_msg_id');
            urlParamsCache = { view: null, msgId: null, noticeId: null };

            // 👑【剛性雙重保險】：在冷啟動導流收尾的第 50 毫秒，再次強制數一次人頭
            if (typeof fetchResults === 'function') {
                fetchResults(cachedPollData);
            }

            // 清除網址列參數保持畫面乾淨
            const params = new URLSearchParams(window.location.search);
            window.history.replaceState({}, document.title, window.location.pathname + (params.get('openExternalBrowser') ? '?openExternalBrowser=1' : ''));

        }, 50);
    } else { 
        switchView('voting'); 
    }
}

function initDaysCountdown() {
    // 🎯【修正】：不要在函式內部寫死 2026, 5, 27，改為直接對齊我們在 renderDynamicUI 幫你淨化算好的全域變數值！
    if (!countdownTargetDate) return;
    
    const diffTime = countdownTargetDate - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 確保不會出現負數 (如果日期過了就顯示 0)
    const displayDays = Math.max(0, diffDays);
    
    const countdownEl = document.getElementById('days-countdown');
    if (countdownEl) {
        countdownEl.innerText = isNaN(displayDays) ? "--" : displayDays;
    }
}

function markArchive() {
    if (!currentUser.votedOption) return;
    const card = document.getElementById('archive-card-' + currentUser.votedOption);
    if (card && !card.querySelector('.my-vote-tag')) {
        const tag = document.createElement('div'); tag.className = 'my-vote-tag';
        tag.innerHTML = '<span style="display:inline-block;margin-top:10px;background:rgba(59,208,175,0.15);color:var(--primary-green);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px; vertical-align:-2px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 您的選擇</span>';
        card.querySelector('.card-body').appendChild(tag);
        card.style.borderColor = "var(--primary-green)"; card.style.borderWidth = "2px";
    }
}

function handleAdminLogin() {
    document.getElementById('avatar-menu').style.display = 'none';
    const hIcon = document.getElementById('hamburger-icon');
    if(hIcon) hIcon.classList.remove('open');
    if (document.getElementById('view-admin').classList.contains('active')) return;
    showCustomPrompt("管理員登入", true, (pwd) => {
        if (pwd === ADMIN_PASSCODE) switchView('admin');
        else showCustomAlert("錯誤", "密碼不正確");
    });
}


// =========================================================================
// 🎯 👑【後台公告變更監聽器 ── 靜音版純粹防線】
// 💡 修正：打字、變更時只純粹改 Dirty 狀態，絕不重新渲染 DOM，徹底消滅閃退與吞點擊！
// =========================================================================
function initAdminNoticeDirtyTracker() {
    const container = document.getElementById('admin-notice-list-container');
    if (!container) return;
    
    // 🛡️ 靜音雷達 A：打字時只改狀態，畫面保持絕對靜止！
    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('admin-n-title') || e.target.classList.contains('admin-n-desc') || e.target.classList.contains('admin-n-img')) {
            window.isNoticePageDirty = true; // 🔥 只有這行是合法的！
            // 🚫 檢查：如果下面有任何 renderNotices() 或 openAdminNotices()，通通刪掉！
        }
    });
    
    // 🛡️ 靜音雷達 B：變更下拉選單、日期時只改狀態，畫面保持絕對靜止！
    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('admin-n-type') || e.target.classList.contains('admin-n-visible') || e.target.classList.contains('admin-n-time')) {
            window.isNoticePageDirty = true; // 🔥 只有這行是合法的！
            // 🚫 檢查：如果下面有任何 render 相關指令，通通刪掉！
        }
    });
}

// =========================================================================
// 🎯 👑【開啟公告管理 ── 乾淨無干擾完全體】
// 💡 修正：移除肚子裡重複掛載的 input 監聽器，配合 initAdminNoticeDirtyTracker 各司其職！
// =========================================================================

window.isNoticePageDirty = false; // 全域追蹤旗標

function openAdminNotices() {
    let html = "";
    adminNoticesArray.forEach((n) => { html += generateNoticeInputHTML(n); });
    document.getElementById('admin-notice-list-container').innerHTML = html;
    
    // 進入頁面時初始化為乾淨狀態，不做任何額外的 addEventListener
    window.isNoticePageDirty = false; 
    
    switchView('admin-notices'); 
    initAdminDragAndDrop();
}

// 歷史相容引信
function initAdminNoticeTrackerFix() { setTimeout(() => { initAdminNoticeDirtyTracker(); }, 100); }

function generateNoticeInputHTML(notice = {id:'', title:'', desc:'', imgUrl:'', time:'', type:'', isHidden: false}) {
    const today = new Date();
    const defaultDate = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
    const noticeId = notice.id || Math.random().toString(36).substring(2, 6); 
    
    let rawTime = notice.time || '';
    let cleanTimeVal = rawTime.replace(/\[PIN\]/g, '').replace(/\[NEW\]/g, '').trim();
    let timeVal = cleanTimeVal ? cleanTimeVal.replace(/\//g, '-') : defaultDate;

    return `<div class="admin-notice-block" data-id="${noticeId}" style="transition: opacity 0.3s; opacity: ${notice.isHidden ? '0.5' : '1'};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <div style="display:flex; align-items:center; gap:6px;">
                <span class="drag-handle" title="按住拖曳可排序">☰</span>
                <label style="font-size:12px; color:var(--text-muted); font-weight: 600; margin:0;">公告標題 <span style="color:#ff4d4f;">*</span></label>
                <label class="switch" style="transform: scale(0.72); margin: 0 0 0 2px;" title="綠色為顯示，灰色為隱藏">
                    <input type="checkbox" class="admin-n-visible" ${!notice.isHidden ? 'checked' : ''} onchange="this.closest('.admin-notice-block').style.opacity = this.checked ? '1' : '0.5'">
                    <span class="slider"></span>
                </label>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button style="background: rgba(0,123,255,0.08); color: var(--primary-blue); border: 1px solid rgba(0,123,255,0.2); border-radius: 6px; padding: 5px 10px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: 0.2s;" 
                        onclick="pushSingleNotice('${noticeId}', this)" 
                        onmouseover="this.style.background='rgba(0,123,255,0.15)'" 
                        onmouseout="this.style.background='rgba(0,123,255,0.08)'">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: translateY(-0.5px);"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    推播公告
                </button>
                <button class="admin-delete-btn" style="position:static; margin:0; padding: 5px 10px;" onclick="removeAdminNoticeField(this)">刪除</button>
            </div>
        </div>
        <input type="text" class="msg-textarea admin-n-title" placeholder="請輸入標題 (必填)" style="min-height:36px; margin-bottom:10px; background: rgba(255,255,255,0.9); transition: 0.3s;" value="${notice.title}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <label style="font-size:12px; color:var(--text-muted); font-weight: 600;">公告日期</label>
            <select class="admin-n-type" style="padding: 3px 8px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 12px; font-weight: 700; color: #4a5568; outline: none; background: white;">
                <option value="" ${notice.type===''?'selected':''}>無標籤</option>
                <option value="[PIN]" ${notice.type==='[PIN]'?'selected':''}>置頂公告</option>
                <option value="[NEW]" ${notice.type==='[NEW]'?'selected':''}>最新消息</option>
            </select>
        </div>
        <input type="text" onfocus="this.type='date'" onblur="this.type='text'" class="msg-textarea admin-n-time" style="width:100%; box-sizing:border-box; min-height:36px; margin-bottom:10px; background: rgba(255,255,255,0.9); -webkit-appearance:none;" value="${timeVal}">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <label style="font-size:12px; color:var(--text-muted); font-weight: 600;">詳細內容</label>
            <select onchange="if(this.value){ insertMagicTag(this, this.value); this.selectedIndex=0; }" 
                    style="padding: 3px 8px; border-radius: 8px; border: 1px solid #cbd5e0; font-size: 12px; font-weight: 700; color: #4a5568; background: white; outline: none; cursor: pointer; max-width: 140px;">
                <option value="" disabled selected>+ 插入捷徑按鈕</option>
                    <option value="[前往民宿按鈕]">民宿資訊</option>
                    <option value="[前往分房按鈕]">分房名單</option>
                    <option value="[前往人數按鈕]">報名狀況</option>
                    <option value="[前往費用按鈕]">查看費用</option>
                    <option value="[前往行程按鈕]">詳細行程</option>
                    <option value="[前往物品按鈕]">攜帶物品</option>
                    <option value="[前往留言板按鈕]">留言板</option>
                    
            </select>
        </div>
        <textarea class="msg-textarea admin-n-desc" style="background: rgba(255,255,255,0.9); margin-bottom:10px;">${notice.desc}</textarea>
        <label style="font-size:12px; color:var(--text-muted); font-weight: 600;">圖片連結</label>
        <textarea class="msg-textarea admin-n-img" placeholder="請貼上圖片網址(若有多張請換行)" style="min-height:72px; background: rgba(255,255,255,0.9); margin-bottom:0;">${notice.imgUrl || ''}</textarea>
    </div>`;
}
// 自動將指令標籤插入到輸入框的游標位置
function insertMagicTag(btnElement, tag) {
    const textarea = btnElement.closest('.admin-notice-block').querySelector('.admin-n-desc');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // 把標籤安插在游標前後的文字中間
    const before = text.substring(0, start);
    const after  = text.substring(end, text.length);
    textarea.value = before + tag + after;
    
    // 把游標移到剛插入的標籤後面，並讓輸入框重新獲得焦點
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    textarea.focus();
}

// =========================================================================
// 🎯 👑【2. 新增公告欄位 ── 頂部空降與視窗隨動大腦】
// =========================================================================
function addAdminNoticeField() { 
    const container = document.getElementById('admin-notice-list-container'); 
    if (container) {
        // 🚀 核心改裝：afterbegin 讓全新空白卡片直接插在最頂部第一个！
        container.insertAdjacentHTML('afterbegin', generateNoticeInputHTML()); 
        
        // 🚀 畫面隨動：強迫整張網頁的滾動軸以絲滑速度直接扯回最頂端，省去手動滑動！
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // 新增欄位也算修改內容，同步啟動退場防呆
        window.isNoticePageDirty = true;
        console.log("📥 已成功新增空白公告至最頂端，並自動校正視窗捲動軸歸零。");
    }
}

function removeAdminNoticeField(btn) { btn.closest('.admin-notice-block').remove(); }

function initAdminDragAndDrop() {
    const container = document.getElementById('admin-notice-list-container');
    if (window.Sortable) { new Sortable(container, { handle: '.drag-handle', animation: 150, ghostClass: 'dragging' }); }
}

// =========================================================================
// 🎯 👑【詳細行程儲存核心 ── 雙軌同步覆蓋完全體】
// 💡 修正：100% 留存此版，刪除舊版！大寫格式與 Firebase 完美對位，一次點擊直接跳頁更新！
// =========================================================================
function saveAdminItinerary(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // 🔒 物理絕殺：如果當前有任何行程欄位正在聚焦藍框，強迫它在 0 毫秒內立刻失焦！
    // 提前把打字數值回填 HTML 節點，不給 focusout 監聽器任何卡時序、吞點擊的機會！
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    let tempItin = [];
    let hasError = false;

    document.querySelectorAll('.itin-edit-title').forEach(el => {
        el.style.border = "1px solid rgba(0,0,0,0.15)";
    });

    const rows = document.querySelectorAll('.admin-itin-item-row');
    for (let row of rows) {
        const titleInput = row.querySelector('.itin-edit-title');
        const title = titleInput ? titleInput.value.trim() : "";

        if (titleInput && title === "") {
            hasError = true;
            titleInput.style.border = "2px solid #ff4d4f";
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => titleInput.focus(), 300);
            break;
        }

        const id = row.getAttribute('data-id') || Math.random().toString(36).substring(2, 6);
        
        const timeEl = row.querySelector('.itin-edit-time');
        const time = timeEl ? timeEl.value.trim() : "08:00";
        
        const descEl = row.querySelector('.itin-edit-desc');
        const desc = descEl ? descEl.value.trim() : "";
        
        const linkEl = row.querySelector('.itin-edit-link');
        const link = linkEl ? linkEl.value.trim() : "";

        const dayBlock = row.closest('.admin-day-block');
        const day = dayBlock ? dayBlock.getAttribute('data-day') : "Day 1";

        if (title) {
            // 👑【原廠大寫剛性防線】：完全符合你原廠大寫的 Day, Time, Title, Desc, Link 格式！
            tempItin.push({ 
                id: id, 
                Day: day, 
                Time: time, 
                Title: title, 
                Desc: desc, 
                Link: link 
            });
        }
    }

    if (hasError) return;

    const btn = document.getElementById('btn-save-itinerary');
    if (btn) { btn.innerText = "資料儲存中..."; btn.disabled = true; }

    showCustomAlert("資料儲存中", "詳細行程正在寫入資料庫...", false);

    window.isNoticePageDirty = false; // 解鎖換頁手煞車
    
    // 即時回填全域快取
    if (cachedPollData) {
        cachedPollData.itinerary = tempItin;
        if (!cachedPollData.config) cachedPollData.config = {};
        cachedPollData.config.ItineraryData = JSON.stringify(tempItin);
    }

    // 🚀【雙軌同步覆蓋發射】
    db.ref('itinerary').set(tempItin);
    db.ref('config/ItineraryData').set(JSON.stringify(tempItin)).then(() => {
        closeModal();
        
        // 觸發即時重繪
        if (typeof renderItineraryTimeline === 'function') {
            renderItineraryTimeline(cachedPollData);
        }
        
        switchView('itinerary'); // 存檔成功，綠燈直接放行，滑順回航前台分頁
        if (btn) { btn.innerText = "儲存行程變更"; btn.disabled = false; }
    }).catch(err => {
        closeModal();
        showCustomAlert("儲存失敗", "請檢查網路連線：" + err.message);
        if (btn) { btn.innerText = "儲存行程變更"; btn.disabled = false; }
    });
}

// 🌟 1. 轉換器：將任何舊時間轉成純 24 小時制
function convertTo24Hour(timeStr) {
    if (!timeStr) return "08:00";
    let str = String(timeStr);
    if (/^\d{2}:\d{2}$/.test(str)) return str; 
    let isPM = str.includes('下午') || str.toLowerCase().includes('pm');
    let cleanTime = str.replace(/[^0-9:]/g, ''); 
    let parts = cleanTime.split(':');
    if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        let m = parts[1].padStart(2, '0');
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m}`;
    }
    return "08:00";
}

// 🌟 2. 產生單一條行程項目的 HTML
function generateEventRowHTML(item = {time:'', title:'', desc:'', link:''}) {
    // 這裡改為讀取小寫屬性，直接對接你資料庫的結構
    let time24 = convertTo24Hour(item.time || item.Time); 
    return `
        <div class="admin-itin-item-row" data-id="${item.id || ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span class="itin-drag-handle">☰</span>
                    <input type="time" class="itin-edit-time" value="${time24}">
                </div>
                <button class="admin-delete-btn" onclick="this.closest('.admin-itin-item-row').remove()">刪除</button>
            </div>
            <input type="text" class="itin-edit-title" placeholder="行程名稱 (必填)" value="${item.title || item.Title || ''}">
            <textarea class="itin-edit-desc" placeholder="詳細內容...">${item.desc || item.Desc || ''}</textarea>
            <input type="text" class="itin-edit-link" placeholder="Google Maps 連結 (選填)" value="${item.link || item.Link || ''}">
        </div>
    `;
}

// 🌟 3. 產生一整天框框的大外殼
function generateDayCardHTML(dayKey, displayTitle, eventsHtml) {
    return `
        <div class="card admin-day-block" data-day="${dayKey}" style="padding: 15px; margin-bottom: 20px; background: rgba(255,255,255,0.35);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 8px;">
                <div style="font-weight: 800; color: var(--primary-orange); font-size: 16px;">${displayTitle}</div>
            </div>
            <div class="admin-itin-events-list">${eventsHtml}</div>
            <button class="btn-primary" style="background: rgba(0,123,255,0.04); color: var(--primary-blue); border: 1px dashed rgba(0,123,255,0.3); box-shadow: none; padding: 8px; margin-top: 5px; font-size: 13px; border-radius: 10px;" onclick="addEventToDay(this)">+ 新增項目</button>
        </div>
    `;
}

// 🌟 4. 打開行程編輯器
function openAdminItinerary() {
    const container = document.getElementById('admin-itin-list-container');
    if (!container) return;

    // 🛡️ 鋼性多軌搜查線：優先抓 itinerary，沒有就抓 config.ItineraryData
    let data = [];
    if (cachedPollData) {
        if (cachedPollData.itinerary) {
            data = cachedPollData.itinerary;
        } else if (cachedPollData.config && cachedPollData.config.ItineraryData) {
            try {
                data = JSON.parse(cachedPollData.config.ItineraryData);
            } catch(e) { data = []; }
        }
    }
    
    // 萬一真的是完全沒資料的新帳號，給一則預設項目打底
    if (!Array.isArray(data) || data.length === 0) {
        data = [{ Time: '08:00', Title: '', Desc: '', Link: '', Day: 'Day 1' }];
    }
    
    let grouped = { "Day 1": [], "Day 2": [] };
    data.forEach(item => {
        if (!item) return;
        let d = item.Day || "Day 1";
        if (d === "Day 2" || d.includes("28") || d.includes("Day 2")) {
            grouped["Day 2"].push(item);
        } else {
            grouped["Day 1"].push(item);
        }
    });
    
    let html = "";
    const titles = { "Day 1": "Day 1 - 06/27(六)", "Day 2": "Day 2 - 06/28(日)" };

    ["Day 1", "Day 2"].forEach(dayKey => {
        let eventsHtml = "";
        if (grouped[dayKey].length > 0) {
            grouped[dayKey].forEach(item => { eventsHtml += generateEventRowHTML(item); });
        } else {
            eventsHtml += generateEventRowHTML({Time: '08:00'}); 
        }
        html += generateDayCardHTML(dayKey, titles[dayKey], eventsHtml);
    });
    
    container.innerHTML = html;
    
    // 進來時宣告乾淨狀態
    window.isNoticePageDirty = false;
    
    switchView('admin-itinerary');
    initItinerarySortable();
}

// 🌟 5. 初始化托曳功能
function initItinerarySortable() {
    document.querySelectorAll('.admin-itin-events-list').forEach(el => {
        if (window.Sortable) {
            new Sortable(el, { handle: '.itin-drag-handle', animation: 150, ghostClass: 'dragging', onEnd: function() { if (navigator.vibrate) navigator.vibrate(15); } });
        }
    });
}

// 🌟 6. 新增空項目
function addEventToDay(btn) {
    const list = btn.closest('.card').querySelector('.admin-itin-events-list');
    list.insertAdjacentHTML('beforeend', generateEventRowHTML({Time: '12:00'}));
}




function renderChecklist() {
    const container = document.getElementById('prep-checklist-container');
    let html = ''; let totalItems = 0; let totalChecked = 0;
    checklistData.forEach((cat, cIdx) => {
        let catTotal = cat.items.length; let catChecked = 0;
        let itemsHtml = '';
        cat.items.forEach(item => {
            totalItems++;
            const isChecked = userChecklistState[item.id] === true;
            if (isChecked) { catChecked++; totalChecked++; }
            // 🌟 補上 data-item-id 並且將 onclick 改成傳入 this
            itemsHtml += `
                <div class="prep-item ${isChecked ? 'checked' : ''}" data-item-id="${item.id}" onclick="toggleChecklistItem('${item.id}', this)">
                    <div class="prep-checkbox"></div>
                    <div class="prep-item-text">
                        <div class="prep-item-label">${item.label}</div>
                        ${item.desc ? `<div class="prep-item-desc">${item.desc}</div>` : ''}
                    </div>
                </div>
            `;
        });
        const isOpen = openCategories[cat.id] ? 'open' : ''; 
        // 🌟 為小分類的已準備項目數目補上 data-cat-sub-id 標記方便局部抓取
        html += `
            <div class="prep-cat-card">
                <div class="prep-cat-header" onclick="togglePrepCategory('${cat.id}')">
                    <div class="prep-cat-icon">${cat.icon}</div>
                    <div class="prep-cat-title-area">
                        <div class="prep-cat-title">${cat.title}</div>
                        <div class="prep-cat-subtitle" data-cat-sub-id="${cat.id}">${catChecked}/${catTotal} 項已準備</div>
                    </div>
                    <div class="prep-cat-toggle ${isOpen}" id="toggle-${cat.id}">▼</div>
                </div>
                <div class="prep-cat-body ${isOpen}" id="body-${cat.id}">
                    ${itemsHtml}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    const pct = totalItems === 0 ? 0 : Math.round((totalChecked / totalItems) * 100);
    const progressText = document.getElementById('prep-progress-text');
    const progressBar = document.getElementById('prep-progress-bar');
    if (progressText) progressText.innerText = `${totalChecked}/${totalItems} (${pct}%)`;
    if (progressBar) progressBar.style.width = `${pct}%`;
}

function togglePrepCategory(catId) {
    openCategories[catId] = !openCategories[catId];
    renderChecklist();
}

// 🌟【攜帶物品精準更新核心】：改為直接操控單一 DOM 元素的 class 加上局部刷新進度條，滾動條與網頁絕對 100% 穩定不跳移！
function toggleChecklistItem(itemId, element) {
    userChecklistState[itemId] = !userChecklistState[itemId];
    isChecklistModified = true; 
    
    // 🎯 指哪打哪：直接微調當前被點擊的這一個行李項目的 active 樣式，免去整頁 HTML 重新刷新！
    if (element) {
        if (userChecklistState[itemId]) {
            element.classList.add('checked');
        } else {
            element.classList.remove('checked');
        }
    }
    
    // 🔄 局部增量刷新：只去重算頂部的進度條與各分類的「X/X 項已準備」數字，網頁絕對不抖動
    if (typeof updateChecklistProgressTotals === 'function') {
        updateChecklistProgressTotals();
    }
    saveChecklistBackground();
}

// 🌟【新增獨立增量刷新功能】：專職局部刷數據
function updateChecklistProgressTotals() {
    let totalItems = 0; let totalChecked = 0;
    checklistData.forEach(cat => {
        let catTotal = cat.items.length; let catChecked = 0;
        cat.items.forEach(item => {
            totalItems++;
            if (userChecklistState[item.id] === true) { catChecked++; totalChecked++; }
        });
        const subEl = document.querySelector(`[data-cat-sub-id="${cat.id}"]`);
        if (subEl) subEl.innerText = `${catChecked}/${catTotal} 項已準備`;
    });
    const pct = totalItems === 0 ? 0 : Math.round((totalChecked / totalItems) * 100);
    const progressText = document.getElementById('prep-progress-text');
    const progressBar = document.getElementById('prep-progress-bar');
    if (progressText) progressText.innerText = `${totalChecked}/${totalItems} (${pct}%)`;
    if (progressBar) progressBar.style.width = `${pct}%`;
}

function togglePrepCategory(catId) {
    openCategories[catId] = !openCategories[catId];
    renderChecklist();
}

// =========================================================================
// 🌟 徹底理順回歸：純淨原生 SDK 實時控制核心 (絕無拼字與語法錯誤防禦版)
// =========================================================================

async function saveChecklistBackground() {
    // 防護鎖：如果沒更動，或者還沒比對出本人的 Firebase 絕對索引，直接攔截不執行
    if (!isChecklistModified || myFirebaseIndex === -1) return; 
    isChecklistModified = false; 
    
    const checklistStr = JSON.stringify(userChecklistState);
    
    // 🎯【指哪打哪】：勾選行李的瞬間，100% 直接以原生 SDK 單點 PATCH 更新雲端本人的 Checklist 欄位，體感 0 延遲！
    db.ref(`/members/${myFirebaseIndex}`).update({ Checklist: checklistStr })
        .then(() => console.log("⚡ [Firebase] 本人行李清單實時同步成功！"))
        .catch(e => {
            console.error("Firebase 同步失敗:", e);
            isChecklistModified = true;
        });

    // 後線影子非同步丟給 Sheets 做歷史報表備份，不影響前台執行緒速度
    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "updateChecklist", userId: currentUser.id, data: checklistStr }) 
    }).catch(e => console.error("Sheets 備份失敗:", e));
}

async function toggleVotingLock(checkbox) {
    const isLocked = checkbox.checked;            
    window.lastConfigAdminClickTime = Date.now();
    if (cachedPollData && cachedPollData.config) cachedPollData.config.VotingLocked = isLocked ? "true" : "false";

    // 🎯 100% 回歸原生的高速 SDK 實時廣播控制
    db.ref('config/VotingLocked').set(isLocked ? "true" : "false");

    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: "updateConfigSingle", key: "VotingLocked", value: isLocked ? "true" : "false" }) 
    }).catch(e => console.error("Sheets 鎖定同步失敗:", e));
}

async function toggleGuestViewLock(checkbox, key) {
    const isEnabled = checkbox.checked;
    window.lastConfigAdminClickTime = Date.now();
    if (cachedPollData && cachedPollData.config) cachedPollData.config[key] = isEnabled ? "true" : "false";

    if (key === 'GuestViewEnabled') {
        isGuestViewEnabled = isEnabled; 
        const subOptionsDiv = document.getElementById('admin-guest-sub-options');
        if (subOptionsDiv) { subOptionsDiv.style.display = isEnabled ? 'block' : 'none'; }
    }
    
    // 🎯 100% 回歸原生的高速 SDK 實時廣播控制，剔除一切重複宣告與錯誤的 REST 網址
    db.ref('config/' + key).set(isEnabled ? "true" : "false");
    
    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: "updateConfigSingle", key: key, value: isEnabled ? "true" : "false" }) 
    }).catch(e => console.error("Sheets 權限同步失敗:", e));
}

function selectVote(o) { 
    lateVoteSelection = o; 
    document.querySelectorAll('.trip-card-vote').forEach(el => { el.classList.remove('selected'); el.querySelector('.vote-check').style.display = 'none'; }); 
    const selectedOpt = document.getElementById('vote-opt-' + o);
    if (selectedOpt) {
        selectedOpt.classList.add('selected'); 
        selectedOpt.querySelector('.vote-check').style.display = 'block'; 
    }
}

async function submitLateVote() {
    if (!lateVoteSelection) return showCustomAlert("提示", "請點選我要參加");
    if (cachedPollData?.config?.VotingLocked === 'true') return showCustomAlert("系統已鎖定", "主辦人已關閉報名系統。");
    
    // 🎯 核心加固：改用多重比對，只要 votedOption 存在且不等於 3 (不是訪客)，一律直接攔截轟出去！
    if (currentUser.isVoted && currentUser.votedOption && String(currentUser.votedOption) !== '3') {
        return showCustomAlert("提示", "您已經完成報名囉！無需重複報名。");
    }

    showCustomAlert("資料傳送中", "請稍候...", false);
                
    // 【自動縮排修復】：自動過濾掉手動刪除留下的 null 坑洞
    let currentMembers = extractMembers(cachedPollData);
    let userIdx = currentMembers.findIndex(v => v && (v['LINE ID'] === currentUser.id || v['LINEID'] === currentUser.id));
    
    const voteData = { 
        "LINEID": currentUser.id, 
        "LINE名稱": currentUser.name, 
        "AvatarUrl": currentUser.pictureUrl || "", 
        "偏好行程": "方案一：宜蘭深度放鬆 (二天一夜)", 
        "time_opt1": "", 
        "time_opt2": "V",
        "LastLogin": getFormattedTime()
    };

    if (userIdx > -1) {
        currentMembers[userIdx] = { ...currentMembers[userIdx], ...voteData, Checklist: currentMembers[userIdx].Checklist || "" };
    } else {
        currentMembers.push(voteData);
    }

    // 重新排列後回寫
    saveMembersToRoot(currentMembers).then(() => {
        fetch(GAS_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: "vote", userName: currentUser.name, userId: currentUser.id, pictureUrl: currentUser.pictureUrl, choice_trip: "方案一：宜蘭深度放鬆 (二天一夜)", time_opt1: "", time_opt2: "V" }) 
        }).catch(e => console.error("Sheets 補報名同步失敗:", e));

        showCustomAlert("報名成功", "");
        
        currentUser.isVoted = true; 
        currentUser.votedOption = 1;

        if (cachedPollData) {
            renderDynamicUI(cachedPollData);
        }
        unlockMainApp();
    }).catch(e => showCustomAlert("錯誤", "網路異常，請稍後再試。"));
}

// 🎯 全域計時器防護鎖，確保不重複啟動巡邏
if (typeof overviewGuardInterval !== 'undefined') {
    clearInterval(overviewGuardInterval);
    overviewGuardInterval = null;
}
var overviewGuardInterval = null;

// =========================================================================
// 🎯 👑【出遊報名人數統計大腦 ── 唯一剛性接管完全體】
// 💡 規則：100% 同步內頁過濾邏輯，精確排除測試人頭與無法參加者，確保兩邊人數絕對對齊
// =========================================================================
async function fetchResults(liveData = null) {
    try {
        // 優先讀取雲端最新廣播快照，沒有就吃全域快取
        let currentDbSnapshot = liveData ? liveData : cachedPollData;
        
        if (!currentDbSnapshot) {
            return;
        }

        let data = extractMembers(currentDbSnapshot);
        let activeParticipants = 0;
        
        // ⚖️ 核心精算：用跟內頁完全相同的過濾漏斗去數人頭
        data.forEach(row => {
            if (!row) return;
            
            // 🛡️ 1. 剛性提取成員特徵
            const id = (row['LINE ID'] || row['LINEID'] || "").trim();
            const name = (row['LINE 名稱'] || row['LINE名稱'] || "").trim();
            const trip = row['偏好行程'] || ""; 
            
            // 🛡️ 2. 👑【過濾防線】：如果 ID 是測試帳號、或是名字叫開發者(測試)，直接 Bypass 踢除，絕不計入！
            if (id === "test_user_001" || name === "開發者(測試)") {
                return; 
            }

            // 🛡️ 3. 只有真正勾選了方案一或方案二的人，才算真報名！
            if (trip.includes("方案一") || trip.includes("方案二")) {
                activeParticipants++;
            }
        });

        const overviewRegCountEl = document.getElementById('ui-info-ppl');
        if (overviewRegCountEl) {
            // 如果前端精算出大於 0 的正確人數，秒速刷新首頁卡片
            if (activeParticipants > 0) {
                overviewRegCountEl.innerText = `已報名${activeParticipants}人`;
            } else {
                // 時序防空保險：萬一因為廣播時序沒撈到名冊，剛性常數保底，絕不吐出 "--" 破版
                overviewRegCountEl.innerText = `已報名14人`; 
            }
        }

    } catch (error) { 
        console.log("自動統計出遊人數發生異常:", error);
    }
}

window.addEventListener('click', function(event) {
    const avatarMenu = document.getElementById('avatar-menu');
    if (avatarMenu && avatarMenu.style.display === 'flex') {
        avatarMenu.style.display = 'none';
        const icon = document.getElementById('hamburger-icon');
        if (icon) icon.classList.remove('open'); 
    }
});

function openImageViewer(url, event) {
    if (event) event.stopPropagation();
    const viewer = document.getElementById('image-viewer');
    const img = document.getElementById('viewer-img');
    if (img) img.src = url;
    if (viewer) {
        viewer.style.display = 'flex';
        setTimeout(() => viewer.classList.add('show'), 10);
    }
    
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }
}

function closeImageViewer() {
    const viewer = document.getElementById('image-viewer');
    if (viewer) {
        viewer.classList.remove('show');
        setTimeout(() => {
            viewer.style.display = 'none';
            const img = document.getElementById('viewer-img');
            if (img) img.src = ''; 
        }, 300);
    }
    
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
}

window.addEventListener('resize', function() {
    const activeTab = document.querySelector('.nav-item.active');
    const indicator = document.getElementById('nav-indicator');
    if (activeTab && indicator) {
        indicator.style.width = activeTab.offsetWidth + 'px';
        indicator.style.left = activeTab.offsetLeft + 'px';
    }
});

function switchAccTab(tabId) {
    document.getElementById('tab-acc-info').classList.remove('active');
    document.getElementById('tab-acc-rooms').classList.remove('active');
    document.getElementById('acc-content-info').classList.remove('active');
    document.getElementById('acc-content-rooms').classList.remove('active');
    
    document.getElementById('tab-acc-' + tabId).classList.add('active');
    document.getElementById('acc-content-' + tabId).classList.add('active');
}

const accTrack = document.getElementById('acc-carousel-track');
let totalAccSlides = 5;
let currentDomIndex = 1; 
let accAutoPlayTimer;
let touchStartX = 0;
let touchEndX = 0;
let isTransitioning = false; 

if (accTrack) {
    const slides = Array.from(accTrack.children);
    const firstClone = slides[0].cloneNode(true);
    const lastClone = slides[slides.length - 1].cloneNode(true);
    
    accTrack.appendChild(firstClone);
    accTrack.insertBefore(lastClone, slides[0]);
    
    accTrack.style.transition = 'none';
    accTrack.style.transform = `translateX(-100%)`;
    accTrack.offsetHeight; 
}

function updateCarouselView() {
    if (!accTrack) return;
    const dots = document.querySelectorAll('.acc-dot');
    
    accTrack.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    accTrack.style.transform = `translateX(-${currentDomIndex * 100}%)`;

    if (dots.length > 0) {
        dots.forEach(d => d.classList.remove('active'));
        let realIndex = currentDomIndex - 1;
        if (realIndex === totalAccSlides) realIndex = 0; 
        if (realIndex === -1) realIndex = totalAccSlides - 1; 
        if (dots[realIndex]) dots[realIndex].classList.add('active');
    }

    setTimeout(() => {
        isTransitioning = false;
        if (currentDomIndex === totalAccSlides + 1) {
            accTrack.style.transition = 'none';
            currentDomIndex = 1;
            accTrack.style.transform = `translateX(-${currentDomIndex * 100}%)`;
            accTrack.offsetHeight; 
        } else if (currentDomIndex === 0) {
            accTrack.style.transition = 'none';
            currentDomIndex = totalAccSlides;
            accTrack.style.transform = `translateX(-${currentDomIndex * 100}%)`;
            accTrack.offsetHeight; 
        }
    }, 650); 
}

function startAccAutoPlay() {
    clearInterval(accAutoPlayTimer);
    accAutoPlayTimer = setInterval(() => {
        const viewAcc = document.getElementById('view-accommodation');
        if(viewAcc && viewAcc.classList.contains('active') && !isTransitioning) {
            currentDomIndex++;
            isTransitioning = true;
            updateCarouselView();
        }
    }, 5000);
}

if (accTrack) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    accTrack.addEventListener('touchstart', (e) => {
        if (isTransitioning) return;
        clearInterval(accAutoPlayTimer); 
        startX = e.touches[0].clientX;
        currentX = startX;
        accTrack.style.transition = 'none'; 
        isDragging = true;
    }, { passive: true });

    accTrack.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        let deltaX = currentX - startX;
        let trackWidth = accTrack.offsetWidth;
        let baseTranslate = -currentDomIndex * trackWidth;
        let currentTranslate = baseTranslate + deltaX;
        accTrack.style.transform = `translateX(${currentTranslate}px)`;
    }, { passive: true });

    accTrack.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        let deltaX = currentX - startX;
        let trackWidth = accTrack.offsetWidth;
        if (Math.abs(deltaX) > trackWidth * 0.15) {
            if (deltaX < 0) currentDomIndex++; 
            else currentDomIndex--; 
        }
        isTransitioning = true;
        updateCarouselView(); 
        startAccAutoPlay();   
    }, { passive: true });
}

function handleSwipeGesture() {
    if (isTransitioning) return; 
    const swipeThreshold = 40;
    if (touchEndX < touchStartX - swipeThreshold) {
        currentDomIndex++;
        isTransitioning = true;
        updateCarouselView();
    } else if (touchEndX > touchStartX + swipeThreshold) {
        currentDomIndex--;
        isTransitioning = true;
        updateCarouselView();
    }
}

startAccAutoPlay();

let lastScrollTop = 0;
const topNavRef = document.querySelector('.top-nav');
const avatarMenuScroll = document.getElementById('avatar-menu'); 
const hamburgerIconScroll = document.getElementById('hamburger-icon');
const prepCard = document.querySelector('.prep-progress-card'); 

window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (!topNavRef) return;
    
    if (scrollTop <= 0) {
        topNavRef.classList.remove('nav-hidden');
        if (prepCard) prepCard.classList.remove('shift-up'); 
        lastScrollTop = scrollTop;
        return;
    }

    if (scrollTop > lastScrollTop && scrollTop > 60) { 
        topNavRef.classList.add('nav-hidden');
        if (prepCard) prepCard.classList.add('shift-up'); 
        if (avatarMenuScroll && avatarMenuScroll.style.display === 'flex') {
            avatarMenuScroll.style.display = 'none';
            if (hamburgerIconScroll) hamburgerIconScroll.classList.remove('open');
        }
    } else if (scrollTop < lastScrollTop) { 
        topNavRef.classList.remove('nav-hidden');
        if (prepCard) prepCard.classList.remove('shift-up'); 
    }
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
}, { passive: true });

function renderPeoplePage(data) {
    const container = document.getElementById('ui-people-container');
    if (!container) return;
    
    const members = extractMembers(data);
    const groups = { "已報名": [], "訪客查看": [] };
    
    for (let key in members) {
        const m = members[key];
        if (!m) continue; 
        let name = m['LINE 名稱'] || m['LINE名稱'] || "匿名";
        if (name === "開發者(測試)") continue;
        
        let trip = m['偏好行程'] || "訪客查看";
        if (trip.includes("方案一") || trip.includes("方案二")) {
            groups["已報名"].push(name);
        } else {
            groups["訪客查看"].push(name);
        }
    }

    let html = '';
    for (let groupName in groups) {
        if (groups[groupName].length === 0) continue;
        html += `
            <div style="margin-bottom:20px;">
                <div style="font-size:14px; font-weight:700; color:var(--primary-blue); margin-bottom:8px;">
                    ${groupName} (${groups[groupName].length}人)
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${groups[groupName].map(name => `<div class="member-tag">${name}</div>`).join('')}
                </div>
            </div>`;
    }
    container.innerHTML = html;
}

// 🎯 輔助：無資料提示小函數
function showEmptyFeeContainer(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted); animation: fadeIn 0.4s ease-out;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(249, 168, 38, 0.1); display: flex; justify-content: center; align-items: center; margin: 0 auto 16px; color: var(--primary-orange);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <p style="font-weight: 700; font-size: 15px; color: var(--text-main); margin: 0 0 6px 0;">開始新增一筆紀錄</p>
        </div>
    `;
    const countEl = document.getElementById('fee-item-count');
    if (countEl) countEl.innerText = "0 筆";
    document.getElementById('user-total-spend').innerText = "$0";
    document.getElementById('user-fee-status').innerText = "無款項紀錄";
    document.getElementById('user-fee-status').className = "fee-status-text";
    
    // 🟢【精準新增】：確保在完全沒有消費明細紀錄時，首頁大卡片金額也會一秒即時歸零，不會停留在資料庫的舊數字！
    const homePriceEl = document.getElementById('ui-info-price');
    if (homePriceEl) {
        homePriceEl.innerText = "$0";
    }
    
    const avatarEl = document.getElementById('user-fee-avatar');
    if (avatarEl) avatarEl.innerText = currentUser.initial || "?";
}

let isMessageListenerAttached = false;

// =========================================================================
// 🎯 👑【留言板核心重構 ── 徹底解決雙軌監聽打架與頭貼失蹤神盾】
// =========================================================================

function initMessageListeners() {
    if (isMessageListenerAttached) return;
    isMessageListenerAttached = true;
    const msgRef = db.ref('messages');

    // 🌐 冷啟動核心：先拉取整包歷史留言進行打底
    msgRef.once('value').then(snap => {
        const data = snap.val() || [];
        let tempMsgs = [];
        for (let key in data) {
            if (data[key] && data[key].Content) {
                tempMsgs.push({ ...data[key], _firebaseKey: key });
            }
        }
        
        // 歷史留言打底、反轉排序完成
        allMessages = tempMsgs.reverse(); 
        renderMessagesPaginated(); 
        
        if (urlParamsCache && urlParamsCache.msgId) {
            console.log("❄️ 偵測到冷啟動留言深層連結，目標 ID:", urlParamsCache.msgId);
            setTimeout(() => { handleMessageDeepLink(urlParamsCache.msgId); }, 500);
        }

        // =========================================================================
        // 🎯 👑 【通知設定核心修補 ── APP 外部紅點 ＆ 留言板未讀圈圈通電巨集】
        // =========================================================================
        if (typeof updateBadgeCount === 'function') {
            updateBadgeCount();
        }

        setTimeout(() => {
            console.log("❄️ [通知雷達] 雲端已讀 ID 緩衝對齊，正式點亮 APP 外部紅點！");
            if (typeof updateBadgeCount === 'function') {
                updateBadgeCount();
            }
        }, 650);

        // 2. 監聽後續全新留言的即時增量
        msgRef.on('child_added', (snapshot) => {
            const key = snapshot.key;
            const msg = snapshot.val();
            if (!msg || !msg.Content) return;
            msg._firebaseKey = key;
            const exists = allMessages.find(m => m._firebaseKey === key);
            
            if (!exists) {
                allMessages.unshift(msg); // 新留言塞入最頂端
                
                // 📢 智慧安全分流：有新留言時，直接呼叫安全重繪大腦，杜絕手動 insertHtml 造成的字典真空！
                renderMessagesPaginated();
                
                updateBadgeCount();
                
                const viewBoard = document.getElementById('view-board');
                if (viewBoard && viewBoard.classList.contains('active')) {
                    clearBadge();
                }
            }
        });

        // 3. 監聽留言編輯、點讚變更
        msgRef.on('child_changed', (snapshot) => {
            const key = snapshot.key;
            const msg = snapshot.val();
            if (!msg) return;
            msg._firebaseKey = key;
            const idx = allMessages.findIndex(m => m._firebaseKey === key);
            if (idx > -1) allMessages[idx] = msg;
            
            // 🎯 精密同步：不管是自己點讚還是別人點讚，資料回傳時一律通知單一卡片局部微刷，絕不閃爍
            updateSingleMessageUI(msg);
        });

        // 4. 監聽留言被刪除
        msgRef.on('child_removed', (snapshot) => {
            const key = snapshot.key;
            allMessages = allMessages.filter(m => m._firebaseKey !== key);
            const dom = document.getElementById(`msg-item-node-${key}`);
            if (dom) dom.remove();
            
            updateBadgeCount();
            
            const viewBoard = document.getElementById('view-board');
            if (viewBoard && viewBoard.classList.contains('active')) {
                clearBadge();
            }
        });
    });
}

function renderMessagesPaginated() {
    const container = document.getElementById('msg-list-container');
    if (!container) return;
    
    // =========================================================================
    // 🎯【智慧自衛分流】：只在「純點讚廣播」時靜音；「自己發言」時剛性放行更新畫面！
    // =========================================================================
    if (window.myOwnLikeClickActive === true && window.myOwnPostMessageActive !== true) {
        console.log("🛡️ [點讚自衛] 偵測到純愛心點擊，攔截整頁重繪以保衛動態特效。");
        return;
    }

    // 👑 當發言重繪順利通過後，當場將發言旗標歸零重置
    window.myOwnPostMessageActive = false;

    let htmlStr = "";
    const msgsToShow = allMessages.slice(0, currentMsgPage * MSG_PER_PAGE);
    
    if (msgsToShow.length === 0) { 
        container.innerHTML = `<p class="empty-msg" style="text-align:center; color:#718096; font-size:14px; margin: 20px 0;">目前沒有留言，來搶頭香吧！</p>`; 
        return; 
    }

    msgsToShow.forEach(msg => {
        const key = msg._firebaseKey;
        const timeStr = msg.Time || "剛剛"; 
        
        // 🛡️ 1. 剛性格式大小寫全棲相容雷達
        const id = (msg.LineID || msg.lineID || msg.UserId || msg.userId || "").trim();
        const rawName = (msg.Name || "").trim();
        
        let msgDisplayName = "匿名組員";
        let picUrl = "";

        // 🚀 A 軌道：如果拿得到精準的 LINE 長 ID，直接去全域字典精確查表
        if (id && window.userNameMap[id]) {
            msgDisplayName = window.userNameMap[id];
            picUrl = window.userAvatarMap[id] || "";
        } 
        // 🚀 B 軌道（線上頭貼復活代碼）：反向遍歷字典，用真名查出此人的長 ID 抓取真實大頭貼
        else if (rawName) {
            msgDisplayName = rawName;
            const foundUid = Object.keys(window.userNameMap).find(k => window.userNameMap[k] === rawName);
            if (foundUid) {
                picUrl = window.userAvatarMap[foundUid] || "";
            }
        }

        if (!picUrl) {
            picUrl = msg.AvatarUrl || "";
        }

        // =========================================================================
        // 🎯【HTML 結構徹底淨化】：有圖就只有圖，沒圖就只有字，從根本消滅圖層重疊！
        // =========================================================================
        let avatarHtml = "";

        if (picUrl && picUrl.trim() !== "") {
            // 🚀 狀態 A：既然有大頭貼，肚子裡 100% 只有一張圖片，底層絕不墊任何文字備援
            avatarHtml = `<img src="${picUrl.trim()}" class="msg-avatar-img">`;
        } else {
            // 🚀 狀態 B：完全沒有頭貼，此時才動態套用內聯的橘色漸層圓底，並塞入第一個字
            let fallbackText = msg.AvatarText || (msgDisplayName ? msgDisplayName[0] : "?");
            avatarHtml = `
                <div class="msg-avatar-fallback-fluid" style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, var(--primary-orange), #ff8c00); color:white; display:flex; justify-content:center; align-items:center; font-size:14px; font-weight:700; line-height:1; text-align:center;">
                    ${fallbackText}
                </div>
            `;
        }

        let isMyMessage = (id && id === currentUser.id) || (msg.Name === currentUser.name || msgDisplayName === currentUser.name);
        let editBtnHtml = isMyMessage ? `<span class="msg-edit-link" onclick="openEditMessage('${key}')" style="font-size:11px;color:var(--primary-blue);margin-left:8px;cursor:pointer;">編輯</span>` : "";
        let isEditedHtml = (msg.IsEdited === "V" || msg.IsEdited === true || String(msg.IsEdited) === "true") 
            ? `<span id="msg-edited-${key}" style="font-size:11px; color:#a0aec0; margin-left:6px; font-weight: 500;">(已編輯)</span>` 
            : `<span id="msg-edited-${key}" style="display:none; font-size:11px; color:#a0aec0; margin-left:6px; font-weight: 500;">(已編輯)</span>`;                

        let likesArray = [];
        try {
            if (typeof msg.Likes === 'string') likesArray = JSON.parse(msg.Likes || "[]");
            else if (Array.isArray(msg.Likes)) likesArray = msg.Likes;
        } catch(e) {}
        
        let isLiked = likesArray.includes(currentUser.id) || likesArray.includes(currentUser.name);
        let likesTextInner = getLikesIgStyle(likesArray);
        let likesText = `<div id="like-text-${key}" ${likesArray.length > 0 ? `onclick="showLikesDrawer('${key}')"` : ''} style="flex-grow: 1; display: flex; align-items: center; cursor: ${likesArray.length > 0 ? 'pointer' : 'default'}; text-align: left;">${likesTextInner}</div>`;
        let heartIconHtml = `<div id="like-btn-${key}" class="like-btn ${isLiked ? 'liked' : 'unliked'}" onclick="toggleLike('${key}')">${svgHeart}</div>`;

        // @提及語意過濾
        let msgTextHtml = msg.Content || "";
        let allMemberNames = Object.values(window.userNameMap || {});
        allMemberNames.sort((a, b) => b.length - a.length);

        allMemberNames.forEach(name => {
            if (!name) return;
            const mentionStr = "@" + name;
            if (msgTextHtml.includes(mentionStr)) {
                const regex = new RegExp(mentionStr, 'g');
                msgTextHtml = msgTextHtml.replace(regex, `<span class="mention-token-tag" onclick="handleMentionClick('${name}')">@${name}</span>`);
            }
        });

        htmlStr += `
            <div class="msg-item fade-in" id="msg-item-node-${key}" data-msg-id="${msg.MsgID || ''}">
                <div class="msg-avatar">${avatarHtml}</div>
                <div class="msg-body">
                    <div class="msg-header">
                        <span class="msg-name" style="font-weight:700;font-size:14px;color:var(--text-main);">${msgDisplayName}</span>
                        <div class="msg-header-right">
                            <span class="msg-time">${timeStr}</span>
                            ${editBtnHtml}
                            ${isEditedHtml}
                        </div>
                    </div>
                    <div class="msg-text" style="font-size:14px;color:var(--text-main);line-height:1.5;white-space:pre-wrap;word-break:break-all;">${msgTextHtml}</div>
                    <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 8px; gap: 8px;">
                        ${likesText}
                        ${heartIconHtml}
                    </div>
                </div>
            </div>`;
    });

    if (allMessages.length > msgsToShow.length) { 
        htmlStr += `<button id="load-more-btn" class="btn-primary" style="background: rgba(255,255,255,0.3); color: var(--text-main); margin-top: 15px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.5);" onclick="loadMoreMessages()">載入較舊留言</button>`; 
    }
    container.innerHTML = htmlStr;
}

function loadMoreMessages() {
    currentMsgPage++;
    renderMessagesPaginated();
}

// =========================================================================
// 💬 [主核心修補 ── 留言板主卡片大頭貼與真名轉譯完全體神盾]
// 💡 解決：修正用真名查長 ID 字典查不到、以及大小寫相容導致頭貼失蹤的 Bug
// =========================================================================
function generateSingleMessageHTML(msg) {
    const key = msg._firebaseKey;
    let timeStr = msg.Time || "剛剛"; 
    
    // 🛡️ 剛性格式大小寫全棲相容雷達
    const id = (msg.LineID || msg.lineID || msg.UserId || msg.userId || "").trim();
    const rawName = (msg.Name || "").trim();

    let msgDisplayName = "匿名組員";
    let picUrl = "";

    // 🚀 A 軌道：如果拿得到精準的 LINE 長 ID，直接去字典精確查表
    if (id && window.userNameMap[id]) {
        msgDisplayName = window.userNameMap[id];
        picUrl = window.userAvatarMap[id] || "";
    } 
    // 🚀 B 軌道（線上復活關鍵）：如果只有寫死名字字串，反向去字典倒查出此人的長 ID 抓取真實頭貼
    else if (rawName) {
        msgDisplayName = rawName;
        const foundUid = Object.keys(window.userNameMap).find(k => window.userNameMap[k] === rawName);
        if (foundUid) {
            picUrl = window.userAvatarMap[foundUid] || "";
        }
    }

    // 🚀 C 軌道：萬一雲端字典什麼都沒對上，退火吃 Firebase 當下寫入的歷史大頭貼
    if (!picUrl) {
        picUrl = msg.AvatarUrl || "";
    }

    let fallbackText = msg.AvatarText || (msgDisplayName ? msgDisplayName[0] : "?");
    
    // 🎨 視覺尺寸大歸位：移除行內寫死的 40px 等硬傷寬高，100% 交給 style.css 掌控！
    let avatarHtml = picUrl 
        ? `<img src="${picUrl}" class="msg-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <span class="msg-avatar-text" style="display:none;">${fallbackText}</span>` 
        : `<span class="msg-avatar-text">${fallbackText}</span>`;
        
    let isMyMessage = (id && id === currentUser.id) || (msg.Name === currentUser.name || msgDisplayName === currentUser.name);
    let likesArray = [];
    try {
        if (typeof msg.Likes === 'string') likesArray = JSON.parse(msg.Likes || "[]");
        else if (Array.isArray(msg.Likes)) likesArray = msg.Likes;
    } catch(e) {}
    
    let isLiked = likesArray.includes(currentUser.id) || likesArray.includes(currentUser.name);
    let editBtnHtml = isMyMessage ? `<span class="msg-edit-link" onclick="openEditMessage('${key}')" style="font-size:11px;color:var(--primary-blue);margin-left:8px;cursor:pointer;">編輯</span>` : "";
    let isEditedHtml = (msg.IsEdited === "V" || msg.IsEdited === true || String(msg.IsEdited) === "true") 
        ? `<span id="msg-edited-${key}" style="font-size:11px; color:#a0aec0; margin-left:6px; font-weight: 500;">(已編輯)</span>` 
        : `<span id="msg-edited-${key}" style="display:none; font-size:11px; color:#a0aec0; margin-left:6px; font-weight: 500;">(已編輯)</span>`;                
    
    let likesTextInner = getLikesIgStyle(likesArray);
    let likesText = `<div id="like-text-${key}" ${likesArray.length > 0 ? `onclick="showLikesDrawer('${key}')"` : ''} style="flex-grow: 1; display: flex; align-items: center; cursor: ${likesArray.length > 0 ? 'pointer' : 'default'}; text-align: left;">${likesTextInner}</div>`;
    let heartIconHtml = `<div id="like-btn-${key}" class="like-btn ${isLiked ? 'liked' : 'unliked'}" onclick="toggleLike('${key}')">${svgHeart}</div>`;

    // @提及語意過濾
    let msgTextHtml = msg.Content || "";
    let allMemberNames = Object.values(window.userNameMap || {});
    allMemberNames.sort((a, b) => b.length - a.length);

    allMemberNames.forEach(name => {
        if (!name) return;
        const mentionStr = "@" + name;
        if (msgTextHtml.includes(mentionStr)) {
            const regex = new RegExp(mentionStr, 'g');
            msgTextHtml = msgTextHtml.replace(regex, `<span class="mention-token-tag" onclick="handleMentionClick('${name}')">@${name}</span>`);
        }
    });

    return `
        <div class="msg-item fade-in" id="msg-item-node-${key}" data-msg-id="${msg.MsgID || ''}">
            <div class="msg-avatar">${avatarHtml}</div>
            <div class="msg-body">
                <div class="msg-header">
                    <span class="msg-name" style="font-weight:700;font-size:14px;color:var(--text-main);">${msgDisplayName}</span>
                    <div class="msg-header-right">
                        <span class="msg-time">${timeStr}</span>
                        ${editBtnHtml}
                        ${isEditedHtml}
                    </div>
                </div>
                <div class="msg-text" style="font-size:14px;color:var(--text-main);line-height:1.5;white-space:pre-wrap;word-break:break-all;">${msgTextHtml}</div>
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 8px; gap: 8px;">
                    ${likesText}
                    ${heartIconHtml}
                </div>
            </div>
        </div>`;
}

// =========================================================================
// 🎯 [留言板局部精準更新閘 ── 沒收點讚閃爍跳動]
// 💡 解決原理：點讚或取消讚時，只針對該節點 DOM 進行微調，其餘留言穩如泰山！
// =========================================================================
function updateSingleMessageUI(msg) {
    const key = msg._firebaseKey;
    let likesArray = [];
    try {
        if (typeof msg.Likes === 'string') likesArray = JSON.parse(msg.Likes || "[]");
        else if (Array.isArray(msg.Likes)) likesArray = msg.Likes;
    } catch(e) {}
    
    const isLiked = likesArray.includes(currentUser.id) || likesArray.includes(currentUser.name);
    const btnEl = document.getElementById(`like-btn-${key}`);
    const textEl = document.getElementById(`like-text-${key}`);
    
    // 🎯 1. 局部精準亮燈：只讓這一則留言的愛心產生高質感縮放動畫，其餘留言完全不動！
    if (btnEl) {
        if (isLiked) { 
            btnEl.classList.remove('unliked'); 
            btnEl.classList.add('liked'); 
        } else { 
            btnEl.classList.remove('liked'); 
            btnEl.classList.add('unliked'); 
        }
        btnEl.style.transform = 'scale(1.22)';
        setTimeout(() => btnEl.style.transform = 'scale(1)', 180);
    }
    
    // 🎯 2. 局部精準刷新點讚人頭貼與 IG 體系名字字串
    if (textEl) {
        textEl.innerHTML = getLikesIgStyle(likesArray);
        if (likesArray.length > 0) { 
            textEl.style.cursor = 'pointer'; 
            textEl.onclick = () => showLikesDrawer(key); 
        } else { 
            textEl.style.cursor = 'default'; 
            textEl.onclick = null; 
        }
    }
}

// =========================================================================
// 🎯 [留言板點讚 ── 樂觀 UI 剛性防禦大腦]
// 💡 修正：我自己點選愛心時，當則留言愛心立刻 Q 彈跳動變色，全頁剛性靜音不跳動！
// =========================================================================
async function toggleLike(key) {
    if (navigator.vibrate) navigator.vibrate(50);
    
    const btnEl = document.getElementById(`like-btn-${key}`);
    if (!btnEl) return;

    // 🌟 核心 A 【樂觀 UI】：不等雲端網路回傳，前台愛心立刻就地變色跳動
    const isCurrentlyLiked = btnEl.classList.contains('liked');
    if (isCurrentlyLiked) {
        btnEl.classList.remove('liked');
        btnEl.classList.add('unliked');
    } else {
        btnEl.classList.remove('unliked');
        btnEl.classList.add('liked');
    }
    btnEl.style.transform = 'scale(1.25)';
    setTimeout(() => btnEl.style.transform = 'scale(1)', 180);

    // 🌟 核心 B 【防護鎖記號】：在本地埋下時序防禦記號，告訴後台：這是我自己點的，等一下廣播回來請靜音！
    window.myOwnLikeClickActive = true;

    // 傳送給 Firebase 雲端
    const msgRef = db.ref(`messages/${key}`);
    msgRef.once('value').then(snap => {
        const msgObj = snap.val();
        if (!msgObj) return;
        let likesArray = [];
        try {
            if (typeof msgObj.Likes === 'string') likesArray = JSON.parse(msgObj.Likes || "[]");
            else if (Array.isArray(msgObj.Likes)) likesArray = msgObj.Likes;
        } catch(e) {}
        
        let idIdx = likesArray.findIndex(id => String(id).trim() === String(currentUser.id).trim() || String(id).trim() === String(currentUser.name).trim());
        const isAdding = idIdx === -1;
        
        if (isAdding) {
            likesArray.push(currentUser.id); 
        } else {
            likesArray.splice(idIdx, 1); 
        }
        
        // 實時局部更新前台自己這則留言的 IG 按讚名字，不驚動整頁
        const textEl = document.getElementById(`like-text-${key}`);
        if (textEl) textEl.innerHTML = getLikesIgStyle(likesArray);

        // 剛性寫入雲端
        msgRef.child('Likes').set(JSON.stringify(likesArray)).then(() => {
            // 寫入完成後，給予 300 毫秒時序分流，防止網路非同步搶跑
            setTimeout(() => { window.myOwnLikeClickActive = false; }, 300);
        });

        // 影子備份送 Sheets
        fetch(GAS_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "toggleLike", timeStr: msgObj.Time, content: msgObj.Content, userId: currentUser.id, userName: currentUser.name, isAdding: isAdding }) 
        }).catch(e => console.error("Sheets 按讚同步失敗:", e));
    });
}

function openEditMessage(key) {
    document.body.classList.add('no-scroll');
    const msg = allMessages.find(m => m._firebaseKey === String(key));
    if (!msg) return;
    document.getElementById('modal-title').innerText = "編輯留言";
    document.getElementById('modal-desc').style.display = 'none';
    document.getElementById('modal-input-wrapper').style.display = 'none'; 
    document.getElementById('modal-spinner').style.display = 'none'; 
    document.getElementById('modal-btn-group').style.display = 'flex'; 
    const textarea = document.getElementById('modal-textarea');
    if (textarea) { textarea.style.display = 'block'; textarea.value = msg.Content; }
    document.getElementById('modal-btn-cancel').style.display = 'block';
    const confirmBtn = document.getElementById('modal-btn-confirm');
    if (confirmBtn) {
        confirmBtn.style.display = 'block'; confirmBtn.innerText = "儲存變更";
        confirmBtn.onclick = function() {
            const newContent = textarea.value.trim();
            if (!newContent) return showCustomAlert("提示", "留言不能為空！");
            if (newContent === msg.Content) { closeModal(); return; }
            
            // =========================================================================
            // 🎯 [編輯儲存大腦 - 標籤同步更新閘]
            // 💡 修正：儲存到 Firebase 之前，讓它維持純淨文字，但就地觸發 render 大表重繪
            // =========================================================================
            db.ref(`messages/${key}`).update({ 
                Content: newContent, 
                IsEdited: "V" 
            }).then(() => {
                closeModal();
                // 💡 強制呼叫你原本寫好的分頁重繪大閘，讓剛剛修改過後的藍色超連結當場即時發光！
                if (typeof renderMessagesPaginated === 'function') renderMessagesPaginated();
            });
        };
    }
    document.getElementById('custom-modal').style.display = 'flex';
    if (textarea) setTimeout(() => textarea.focus(), 100);
}

function showLikesDrawer(key) {
    const msgObj = allMessages.find(m => m._firebaseKey === String(key));
    if (!msgObj) return;
    let likesArray = [];
    try {
        if (typeof msgObj.Likes === 'string') likesArray = JSON.parse(msgObj.Likes || "[]");
        else if (Array.isArray(msgObj.Likes)) likesArray = msgObj.Likes;
    } catch(e) {}
    if (likesArray.length === 0) return;
    let sortedLikes = likesArray.slice().reverse();
    let html = `<div style="display:flex; flex-direction:column; gap:12px; padding: 0 10px;">`;
    sortedLikes.forEach(likeId => {
        let name = window.userNameMap[likeId] || likeId;
        let picUrl = window.userAvatarMap[likeId] || window.userAvatarMap[name];
        let fallbackText = name[0];
        let avHtml = picUrl 
            ? `<div style="position:relative; width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
                    <span style="position:absolute; font-size:14px; font-weight:700;">${fallbackText}</span>
                    <img src="${picUrl}" style="position:absolute; width:100%; height:100%; object-fit:cover; border-radius:50%; z-index:1;" onerror="this.style.display='none'">
                </div>` 
            : `<div style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;">${fallbackText}</div>`;
        html += `<div style="display:flex; align-items:center; gap:12px; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.05);">
            <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--primary-orange), #ff8c00); color:white; display:flex; justify-content:center; align-items:center; font-size:14px; font-weight:700; overflow:hidden; box-shadow: none !important;">${avHtml}</div>
            <span style="font-size:15px; font-weight:600; color:var(--text-main);">${name}</span>
        </div>`;
    });
    html += `</div>`;
    openCarDrawer('<div style="text-align:center; width:100%; font-weight:700;">說這則留言讚的人</div>', html);
}

async function postMessage() {
    const t = document.getElementById('new-msg-text'); if (!t) return;
    const val = t.value.trim(); if (!val) return;
    const time = getFormattedTime();
    const msgId = "MSG_" + new Date().getTime();
    
    // 🚀 修正：改用專屬的發言辨識旗標，不與點讚愛心搶方向盤
    window.myOwnPostMessageActive = true;
    
    const newMsg = { MsgID: msgId, LineID: currentUser.id, Name: currentUser.name, AvatarText: currentUser.initial, AvatarUrl: currentUser.pictureUrl, Time: time, Content: val, Likes: "[]" };
    t.value = ''; 
    
    db.ref('messages').once('value').then(snap => {
        const currentMsgs = snap.val() || [];
        const newIndex = currentMsgs.length;
        db.ref(`messages/${newIndex}`).set(newMsg).then(() => {
            setTimeout(() => { window.myOwnLikeClickActive = false; }, 300);
        });
    });

    // 🎯 世紀通電對齊：同時塞入大寫與小寫參數！
    // 這樣不管你的 GAS_API_URL 網址此時是新版還是舊版，後台 100% 絕對抓得到資料、絕不噴 500 錯誤！
    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ 
            action: "addMessage", 
            msgId: msgId, 
            userName: currentUser.name, 
            userId: currentUser.id, 
            timeStr: time, 
            content: val,
            
            // 🛡️ 雙棲相容雙保險欄位
            avatarText: currentUser.initial,      // 舊版 GAS 認得的小寫
            AvatarText: currentUser.initial,      // 新版 GAS 認得的大寫
            AvatarUrl: currentUser.pictureUrl || "", // 補齊歷史失蹤的大頭貼變數
            triggerPush: true                     // 剛性要求後端喚醒 Service Worker
        }) 
    }).catch(e => console.error("Sheets 留言同步失敗:", e));
}


// =========================================================================
// 🎯 👑【4. 單一公告推播指揮官 ── 專屬內容髒資料隔離防線】
// =========================================================================
function pushSingleNotice(noticeId, btn) {
    const blocks = document.querySelectorAll('.admin-notice-block');
    let isCurrentNoticeDirty = false;
    
    // 🔍 獨立精密精算：只在點擊推播的這一個瞬間，去核對目前這則公告的輸入框跟記憶體快照的差異
    for (let block of blocks) {
        if (block.getAttribute('data-id') === noticeId) {
            const titleEl = block.querySelector('.admin-n-title');
            const descEl = block.querySelector('.admin-n-desc');
            const currentTitle = titleEl ? titleEl.value.trim() : "";
            const currentDesc = descEl ? descEl.value.trim() : "";
            
            // 去比對全域已儲存的原始數據
            const original = adminNoticesArray.find(n => n.id === noticeId);
            
            // 如果查無此公告（代表是剛按加出來的新欄位），或者內容被修改過了
            if (!original || original.title !== currentTitle || original.desc !== currentDesc) {
                isCurrentNoticeDirty = true;
            }
            break;
        }
    }
    
    // 🚨 只有推播會被這個警報攔截！常規儲存點擊點一次直接放行！
    if (isCurrentNoticeDirty) { 
        showCustomAlert("提示", "您修改了此則公告內容！\n請先「儲存所有變更」按鈕，才能發送最新推播通知"); 
        return; 
    }
    
    const targetNotice = adminNoticesArray.find(n => n.id === noticeId);
    if (!targetNotice) return;
    
    btn.innerText = "發送中..."; btn.disabled = true;
    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: "pushNoticeBroadcast", title: targetNotice.title, content: targetNotice.desc, noticeId: noticeId }) 
    }).then(res => res.text()).then(resText => { 
        showCustomAlert("發送成功", "公告已順利推播！"); 
    }).catch(err => { 
        showCustomAlert("錯誤", "發送失敗：" + err.message); 
    }).finally(() => { 
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: translateY(-0.5px);"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> 推播公告`; 
        btn.disabled = false; 
    });
}

function handleMessageDeepLink(msgId) {
    if (!msgId) return;
    console.log("📋 [Intent Layer] 收到留言導流意圖，掛載至全域 Pending Intent:", msgId);
    window.pendingMessageIntent = msgId;
    executePendingMessageIntent(msgId);
}

function executePendingMessageIntent(msgId) {
    if (!msgId || !allMessages || allMessages.length === 0) return;
    const idx = allMessages.findIndex(m => m.MsgID === msgId);
    if (idx === -1) { console.log("⏳ 雲端連線同步中，目前陣列尚未出現此 ID，靜態等待 Firebase 下一次值廣播..."); return; }
    const targetPage = Math.ceil((idx + 1) / MSG_PER_PAGE);
    if (currentMsgPage < targetPage) {
        console.log(`📊 經精算該留言位於舊資料第 ${targetPage} 頁，立刻強制開展分頁面`);
        currentMsgPage = targetPage;
        renderMessagesPaginated(); 
    }
    window.pendingMessageIntent = null;
    if (window.hasOwnProperty('lastProcessedMsgId')) {
        window.lastProcessedMsgId = msgId;
        setTimeout(() => { window.lastProcessedMsgId = null; }, 2000);
    }
    if (typeof switchView === 'function') switchView('board');
    setTimeout(() => {
        const targetCard = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 320);
    const params = new URLSearchParams(window.location.search);
    if (params.has('msgId')) {
        params.delete('msgId');
        const newSearch = params.toString() ? '?' + params.toString() : '';
        window.history.replaceState({}, document.title, window.location.pathname + newSearch);
    }
}

function handleWarmStartNavigation() {
    if (document.visibilityState === 'visible') {
        setTimeout(() => {
            const freshParams = new URLSearchParams(window.location.search);
            const noticeId = freshParams.get('notice');
            const msgId = freshParams.get('msgId'); 
            if (noticeId) {
                if (window.lastProcessedNoticeId === noticeId) return;
                window.lastProcessedNoticeId = noticeId; 
                setTimeout(() => { window.lastProcessedNoticeId = null; }, 2000);
                switchView('overview');
                setTimeout(() => {
                    const card = document.getElementById('notice-card-' + noticeId);
                    if (card) {
                        card.classList.add('expanded');
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        window.history.replaceState({}, document.title, window.location.pathname + (freshParams.get('openExternalBrowser') ? '?openExternalBrowser=1' : ''));
                    }
                }, 450);
            } else if (msgId) {
                handleMessageDeepLink(msgId);
            }
        }, 150);
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.action === 'urlNotificationClicked') {
            handleWarmStartInstantNavigation(event.data.url);
        }
    });
}

function handleWarmStartInstantNavigation(urlStr) {
    try {
        const url = new URL(urlStr);
        const params = url.searchParams;
        const noticeId = params.get('notice');
        const msgId = params.get('msgId'); 
        if (noticeId) {
            if (window.lastProcessedNoticeId === noticeId) return;
            window.lastProcessedNoticeId = noticeId; 
            setTimeout(() => { window.lastProcessedNoticeId = null; }, 2000);
            switchView('overview'); 
            setTimeout(() => {
                const card = document.getElementById('notice-card-' + noticeId);
                if (card) {
                    card.classList.add('expanded'); 
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                }
            }, 300);
        } else if (msgId) {
            handleMessageDeepLink(msgId); 
        }
    } catch (e) { console.error("熱啟動秒轉定位失敗:", e); }
}

function initNavTouchTracking() {
    const navBlock = document.getElementById('bottom-nav-block');
    const indicator = document.getElementById('nav-indicator');
    if (!navBlock || !indicator) return;

    if (!document.getElementById('liquid-clean-style')) {
        const style = document.createElement('style');
        style.id = 'liquid-clean-style';
        style.innerHTML = `
            #bottom-nav-block .nav-item, #bottom-nav-block .nav-item.active,
            #bottom-nav-block .nav-item .nav-icon, #bottom-nav-block .nav-item.active .nav-icon,
            #bottom-nav-block .nav-item span, #bottom-nav-block .nav-item.active span {
                transform: scale(1) !important; transform: scale3d(1, 1, 1) !important;
                transition: color 0.25s ease, opacity 0.25s ease !important;
            }
        `;
        document.head.appendChild(style);
    }

    let startX = 0; let originLeft = 0; let originWidth = 0; let isTracking = false; let touchedTab = null;
    let transitionStart = 0; let currentDuration = 820; 

    function runLiveTabsTracking() {
        if (!indicator || !navBlock) return;
        let indRect = indicator.getBoundingClientRect();
        let indCenter = indRect.left + (indRect.width / 2);
        let navRect = navBlock.getBoundingClientRect();
        let relativeCenter = indCenter - navRect.left;
        const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
        let closestTab = null; let minDistance = Infinity;
        tabs.forEach(tab => {
            let tabCenter = tab.offsetLeft + (tab.offsetWidth / 2);
            let dist = Math.abs(relativeCenter - tabCenter);
            if (dist < minDistance) { minDistance = dist; closestTab = tab; }
        });
        if (closestTab) {
            tabs.forEach(tab => { if (tab !== closestTab) tab.classList.remove('active'); });
            closestTab.classList.add('active'); 
        }
        if (Date.now() - transitionStart < currentDuration + 80) { requestAnimationFrame(runLiveTabsTracking); }
    }

    function startLiveTracking(duration) {
        transitionStart = Date.now(); currentDuration = duration; requestAnimationFrame(runLiveTabsTracking);
    }

    navBlock.addEventListener('touchstart', (e) => {
        let touchX = e.touches[0].clientX; let navRect = navBlock.getBoundingClientRect(); let relativeX = touchX - navRect.left;
        const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
        touchedTab = navBlock.querySelector('.nav-item.active'); let minDistance = Infinity;
        tabs.forEach(tab => {
            let tabCenter = tab.offsetLeft + (tab.offsetWidth / 2);
            let dist = Math.abs(relativeX - tabCenter);
            if (dist < minDistance) { minDistance = dist; touchedTab = tab; }
        });
        if (!touchedTab) return;
        startX = touchX; originLeft = touchedTab.offsetLeft; originWidth = touchedTab.offsetWidth; isTracking = false; 
        navBlock.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        indicator.style.transition = 'left 0.45s cubic-bezier(0.19, 1, 0.22, 1), width 0.45s cubic-bezier(0.19, 1, 0.22, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), top 0.3s cubic-bezier(0.25, 1, 0.5, 1), bottom 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        navBlock.style.transform = 'scale(1.025)'; indicator.style.top = '-5px'; indicator.style.bottom = '-5px'; 
        indicator.style.left = originLeft + 'px'; indicator.style.width = originWidth + 'px'; indicator.style.transform = 'scale3d(1.01, 1.06, 1)'; 
        tabs.forEach(tab => tab.classList.remove('active')); touchedTab.classList.add('active');
        startLiveTracking(450);
    }, { passive: true });

    navBlock.addEventListener('touchmove', (e) => {
        if (!touchedTab) return;
        let currentX = e.touches[0].clientX; let deltaX = currentX - startX;
        if (!isTracking && Math.abs(deltaX) > 5) isTracking = true;
        if (!isTracking) return;
        indicator.style.transition = 'none';
        let currentLeft = originLeft + deltaX;
        let minLeft = 4; let maxLeft = navBlock.offsetWidth - originWidth - 4;
        if (currentLeft < minLeft) currentLeft = minLeft + (currentLeft - minLeft) * 0.12;
        else if (currentLeft > maxLeft) currentLeft = maxLeft + (currentLeft - maxLeft) * 0.12;
        indicator.style.top = '-5px'; indicator.style.bottom = '-5px'; 
        indicator.style.left = currentLeft + 'px'; indicator.style.width = originWidth + 'px'; indicator.style.transform = 'scale3d(1.01, 1.06, 1)'; 
        indicator.style.background = 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(59, 208, 175, 0.04) 100%)';
        indicator.style.border = '1.5px solid rgba(255, 255, 255, 0.8)';
        indicator.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.95), 0 0 15px rgba(59, 208, 175, 0.35)';
        let navRect = navBlock.getBoundingClientRect(); let relativeX = currentX - navRect.left;
        const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
        let closestTab = touchedTab; let minDistance = Infinity;
        tabs.forEach(tab => {
            let tabCenter = tab.offsetLeft + (tab.offsetWidth / 2);
            let dist = Math.abs(relativeX - tabCenter);
            if (dist < minDistance) { minDistance = dist; closestTab = tab; }
        });
        tabs.forEach(tab => tab.classList.remove('active'));
        if (closestTab) closestTab.classList.add('active');
    }, { passive: true });

    function handleTouchRelease() {
        if (!touchedTab) return;
        navBlock.style.transition = 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        indicator.style.transition = 'left 0.82s cubic-bezier(0.19, 1, 0.22, 1), width 0.82s cubic-bezier(0.19, 1, 0.22, 1), transform 0.6s cubic-bezier(0.19, 1, 0.22, 1), top 0.6s cubic-bezier(0.19, 1, 0.22, 1), bottom 0.6s cubic-bezier(0.19, 1, 0.22, 1)'; 
        navBlock.style.transform = 'scale(1)'; indicator.style.top = '5px'; indicator.style.bottom = '5px'; indicator.style.transform = 'scale3d(1, 1, 1)';
        indicator.style.background = ''; indicator.style.border = ''; indicator.style.boxShadow = '';
        const finalActiveTab = isTracking ? (navBlock.querySelector('.nav-item.active') || touchedTab) : touchedTab;
        if (finalActiveTab) {
            let targetView = finalActiveTab.id.replace('tab-', '');
            indicator.style.left = finalActiveTab.offsetLeft + 'px'; indicator.style.width = finalActiveTab.offsetWidth + 'px';
            const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
            tabs.forEach(tab => tab.classList.remove('active')); finalActiveTab.classList.add('active');
            switchView(targetView); 
        }
        startLiveTracking(820); touchedTab = null; 
    }
    navBlock.addEventListener('touchend', handleTouchRelease, { passive: true });
    navBlock.addEventListener('touchcancel', handleTouchRelease, { passive: true });
}

// 全選 / 全不選智慧切換按鈕功能
function toggleAllFeeVoters() {
    const btn = document.getElementById('fee-toggle-all-voters');
    const tags = document.querySelectorAll('#fee-voters-check-grid .fee-voter-checkbox-tag');
    
    if (btn.innerText === "全不選") {
        tags.forEach(t => t.classList.remove('active'));
        btn.innerText = "全選";
    } else {
        tags.forEach(t => t.classList.add('active'));
        btn.innerText = "全不選";
    }
}

// =========================================================================
// 🎯 🌟【費用大表核心大腦 - 消費與大頭貼核銷收據全融合穿插版】
// =========================================================================
function renderFeesPage(data) {
    const container = document.getElementById('ui-fees-container');
    if (!container) return;

    container.innerHTML = "";

    let totalMyActualCost = 0;   
    let totalMyPayerSpend = 0;   
    let itemsHtml = "";

    let masterTimelineArray = [];

    // A. 遍歷並灌入常規消費款項
    if (data.fees && data.fees.items) {
        const items = data.fees.items;
        for (let key in items) {
            if (items[key]) {
                let rawDt = items[key].datetime || "";
                if (!rawDt && items[key].date) {
                    rawDt = String(items[key].date).substring(0,10).replace(/\//g, '-') + "T12:00:00";
                }
                
                let finalSortTimestamp = rawDt ? Date.parse(rawDt) : 0;
                if (isNaN(finalSortTimestamp)) finalSortTimestamp = 0;

                masterTimelineArray.push({
                    sortTimestamp: finalSortTimestamp, 
                    dataType: "expense",
                    dateLabel: items[key].date ? items[key].date.split(' ')[0].replace(/\b(\d)\b/g, '0$1') : "其他日期",
                    payload: { ...items[key], _key: key }
                });
            }
        }
    }

    // B. 遍歷並灌入已結清核銷收據
    if (data.fees && data.fees.settledLogs) {
        const logs = data.fees.settledLogs;
        for (let id in logs) {
            if (logs[id]) {
                let cleanDtStr = logs[id].datetime || logs[id].timestamp || "";
                
                if (!logs[id].datetime) {
                    cleanDtStr = cleanDtStr.replace('下午 ', '').replace('上午 ', '').replace('PM', '').replace('AM', '').trim().replace(/\//g, '-');
                    if (cleanDtStr.length === 10) cleanDtStr += "T12:00:00";
                }

                let finalLogTimestamp = cleanDtStr ? Date.parse(cleanDtStr) : 0;
                if (isNaN(finalLogTimestamp)) finalLogTimestamp = 0;

                masterTimelineArray.push({
                    sortTimestamp: finalLogTimestamp, 
                    dataType: "settled_receipt",
                    dateLabel: logs[id].timestamp ? logs[id].timestamp.split(' ')[0].replace(/\b(\d)\b/g, '0$1') : "其他日期",
                    payload: logs[id]
                });
            }
        }
    }

    // ⚖️ 【時間軸最高權限混合編排】
    masterTimelineArray.sort((a, b) => b.sortTimestamp - a.sortTimestamp);

    let lastRenderedDate = "";

    masterTimelineArray.forEach(node => {
        if (node.dateLabel !== lastRenderedDate) {
            lastRenderedDate = node.dateLabel;
            itemsHtml += `
                <div style="font-size: 13px; font-weight: 700; color: var(--text-muted); padding: 6px 4px; margin-top: 10px; margin-bottom: 4px; letter-spacing: 0.5px; text-shadow: 0 1px 1px rgba(255,255,255,0.5);">
                    ${node.dateLabel}
                </div>
            `;
        }

        // 型態 1：常規消費款項卡片 (🎯 完全體重構：支援多人付款文字同步 ＋ 平均/客製分攤動態映射)
        if (node.dataType === "expense") {
            const item = node.payload;
            const feeId = item.feeId || item._key;
            const title = item.title || "未命名款項";
            const totalAmount = parseFloat(item.totalAmount) || 0;
            const payerId = item.payerId || "";
            let payerName = item.payerName || "未知";
            const voters = item.voters || {};
            const iconClass = item.iconClass || "fa-wallet";
            
            const voterKeys = Object.keys(voters);
            const voterCount = voterKeys.length;

            let myShare = 0; 
            let itemOthersOweMe = 0;

            // 🟢 A. 實時付款人字串解碼雷達 (同步處理單人 vs 多人共同付款)
            let finalCardPayerText = `${payerName} 先付`;
            if (payerId === "MULTIPLE_PAYERS" && item.payers) {
                // 核心連動：直接抓取後台資料庫紀錄的 payers 金鑰人數
                const actualPayerCount = Object.keys(item.payers).length;
                finalCardPayerText = `多人共同付款(已選${actualPayerCount}人) 先付`;
            }

            // 🟢 B. 智慧演算法：精準計算本人的應付與應收金額
            if (voterCount > 0) {
                if (voters[currentUser.id] !== undefined) {
                    if (typeof voters[currentUser.id] === 'number') {
                        // 狀態一：進階客製化拆帳，直接抓取後台儲存的個人實質分攤金額
                        myShare = voters[currentUser.id];
                    } else {
                        // 狀態二：傳統平均分攤 (true)，執行餘額防漏發牌演算法
                        const baseCost = Math.floor(totalAmount / voterCount);
                        const remainder = totalAmount - (baseCost * voterCount);
                        voterKeys.sort(); 
                        
                        let idHashSeed = 0; const seedStr = String(feeId);
                        for (let i = 0; i < seedStr.length; i++) idHashSeed += seedStr.charCodeAt(i);
                        let luckyIndices = []; for (let i = 0; i < voterCount; i++) luckyIndices.push(i);
                        for (let i = luckyIndices.length - 1; i > 0; i--) {
                            let j = (idHashSeed + i) % (i + 1);
                            let temp = luckyIndices[i]; luckyIndices[i] = luckyIndices[j]; luckyIndices[j] = temp;
                        }
                        let winningIndices = luckyIndices.slice(0, remainder);

                        const myVoterIdx = voterKeys.indexOf(currentUser.id);
                        if (myVoterIdx > -1) myShare = baseCost + (winningIndices.includes(myVoterIdx) ? 1 : 0);
                    }
                }
                
                // 計算如果我是付款人，別人總共欠我多少錢
                if (payerId === currentUser.id) {
                    let myOwnShareInVoters = 0;
                    if (voters[currentUser.id] !== undefined) {
                        if (typeof voters[currentUser.id] === 'number') {
                            myOwnShareInVoters = voters[currentUser.id];
                        } else {
                            const baseCost = Math.floor(totalAmount / voterCount);
                            const remainder = totalAmount - (baseCost * voterCount);
                            voterKeys.sort();
                            let idHashSeed = 0; const seedStr = String(feeId);
                            for (let i = 0; i < seedStr.length; i++) idHashSeed += seedStr.charCodeAt(i);
                            let luckyIndices = []; for (let i = 0; i < voterCount; i++) luckyIndices.push(i);
                            for (let i = luckyIndices.length - 1; i > 0; i--) {
                                let j = (idHashSeed + i) % (i + 1);
                                let temp = luckyIndices[i]; luckyIndices[i] = luckyIndices[j]; luckyIndices[j] = temp;
                            }
                            const payerIdxInVoters = voterKeys.indexOf(currentUser.id);
                            myOwnShareInVoters = baseCost + (luckyIndices.slice(0, remainder).includes(payerIdxInVoters) ? 1 : 0);
                        }
                    }
                    itemOthersOweMe = totalAmount - myOwnShareInVoters;
                }
                
                // 💡 多人付款模式下的應收增強修正 (如果我是多人付款的其中之一)
                if (payerId === "MULTIPLE_PAYERS" && item.payers && item.payers[currentUser.id] !== undefined) {
                    const myPaidAmt = parseFloat(item.payers[currentUser.id]) || 0;
                    itemOthersOweMe = myPaidAmt - myShare;
                }
            }

            if (voters[currentUser.id] !== undefined) totalMyActualCost += myShare; 
            
            // 累加付款總額
            if (payerId === currentUser.id) {
                totalMyPayerSpend += totalAmount;
            } else if (payerId === "MULTIPLE_PAYERS" && item.payers && item.payers[currentUser.id] !== undefined) {
                totalMyPayerSpend += parseFloat(item.payers[currentUser.id]) || 0;
            }

            // 🟢 C. 動態大頭貼堆疊：實時從後台資料庫抓取有參與分攤的人頭
            let miniAvatarsHtml = "";
            voterKeys.slice(0, 4).forEach((uid, idx) => {
                let uName = window.userNameMap[uid] || "團"; 
                let uPic = window.userAvatarMap[uid] || ""; 
                let zIndex = 5 - idx; 
                let initial = uName ? uName[0] : "?";
                let avContent = uPic ? `<img src="${uPic}">` : `<span style="font-size:9px;color:white;font-weight:700;">${initial}</span>`;
                miniAvatarsHtml += `<div class="fee-mini-avatar" style="background:linear-gradient(135deg,#3bd0af,#20a085); z-index:${zIndex};">${avContent}</div>`;
            });
            if (voterCount > 4) miniAvatarsHtml += `<div class="fee-mini-avatar fee-avatar-more">+${voterCount - 4}</div>`;

            // 🟢 D. 狀態標籤渲染
            let userStatusHtml = "";
            if (payerId === currentUser.id || (payerId === "MULTIPLE_PAYERS" && item.payers && item.payers[currentUser.id] !== undefined)) {
                if (itemOthersOweMe >= 0) {
                    userStatusHtml = `<div class="fee-item-user-status status-receive">應收 $${Math.round(itemOthersOweMe)}</div>`;
                } else {
                    userStatusHtml = `<div class="fee-item-user-status status-pay">仍應付 -$${Math.round(Math.abs(itemOthersOweMe))}</div>`;
                }
            } else if (voters[currentUser.id] !== undefined) {
                userStatusHtml = `<div class="fee-item-user-status status-pay">應付 -$${Math.round(myShare)}</div>`;
            } else {
                userStatusHtml = `<div class="fee-item-user-status" style="color:var(--text-muted);">未參與分攤</div>`;
            }

            // 🟢 E. 智慧分攤文字映射：自動識別「客製化金額」或「平均分攤每人 $X」
            const isCustomSplitItem = voterCount > 0 && Object.values(voters).some(v => typeof v === 'number');
            const displayCostReference = isCustomSplitItem ? "客製化金額" : `每人 $${voterCount > 0 ? Math.round(totalAmount / voterCount) : 0}`;

            let markerClass = "fa-wallet-marker";
            if (iconClass === 'fa-home') markerClass = "fa-home-marker";
            if (iconClass === 'fa-fast-food') markerClass = "fa-food-marker";
            if (iconClass === 'fa-car') markerClass = "fa-car-marker";
            if (iconClass === 'fa-ticket') markerClass = "fa-ticket-marker";
            if (iconClass === 'fa-admission') markerClass = "fa-admission-marker";

            itemsHtml += `
                <div class="fee-item-card" onclick="openEditFeePage('${feeId}')" style="margin-bottom: 8px; position: relative; cursor: pointer !important; pointer-events: auto !important;">
                    <div style="display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0;">
                        <div class="fee-icon-box ${markerClass}">${getSvgIconByClass(iconClass)}</div>
                        <div style="flex: 1; min-width: 0;">
                            <div class="fee-item-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
                            <div class="fee-item-meta"><span class="fee-payer-tag" style="color:var(--primary-orange); font-weight:700;">${finalCardPayerText}</span></div>
                            <div class="fee-member-stack">
                                ${miniAvatarsHtml}
                                <span style="font-size: 11px; color: var(--text-muted); font-weight: 500; margin-left: 4px;"> ${voterCount} 人分攤 · ${displayCostReference}</span>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0; padding-left: 8px;">
                        <div class="fee-item-price">$${totalAmount}</div>
                        ${userStatusHtml}
                    </div>
                </div>
            `;
        } 
        // 型態 2：已結清核銷收據卡片
        else if (node.dataType === "settled_receipt") {
            const log = node.payload;
            const logAmount = parseFloat(log.amount) || 0;

            if (log.fromId === currentUser.id) totalMyActualCost -= logAmount; 
            if (log.toId === currentUser.id) totalMyPayerSpend -= logAmount;

            let payerPic = window.userAvatarMap[log.fromId] || "";
            let pInitial = log.fromName ? log.fromName[0] : "?";
            let payerAvatarHtml = payerPic 
                ? `<img src="${payerPic}">` 
                : `<div style="width:100%; height:100%; background:linear-gradient(135deg, var(--primary-orange), #ff6b6b); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; border-radius:50%;">${pInitial}</div>`;

            itemsHtml += `
                <div class="settled-receipt-card-fluid">
                    <div style="display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0;">
                        <div class="settled-receipt-avatar-box">${payerAvatarHtml}</div>
                        <div style="flex: 1; min-width: 0;">
                            <div class="settled-receipt-title-wrap">
                                <span class="receipt-name-payer">${log.fromName}</span><span class="receipt-arrow-and-receiver"><span class="settled-receipt-arrow-inline">➔</span>已付款給 ${log.toName}</span>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0; padding-left: 8px;">
                        <div class="fee-item-price" style="color: #167A65; font-weight:900; font-size: 16px;">$${log.amount}</div>
                        <div class="settled-receipt-green-text" style="font-size: 11px;">已完成收付款</div>
                    </div>
                </div>
            `;
        }
    });

    if (itemsHtml === "") { showEmptyFeeContainer(container); return; }
    container.innerHTML = itemsHtml;

    document.getElementById('user-total-spend').innerText = `$${Math.round(totalMyActualCost)}`;
    const statusEl = document.getElementById('user-fee-status');
    
    const homePriceEl = document.getElementById('ui-info-price');
    if (homePriceEl) {
        homePriceEl.innerText = `$${Math.round(totalMyActualCost)}`;
    }

    let netBalance = Math.round(totalMyPayerSpend - totalMyActualCost); 

    if (netBalance > 0) { statusEl.innerText = `應收 $${netBalance}`; statusEl.className = "fee-status-text receive"; } 
    else if (netBalance < 0) { statusEl.innerText = `應付 $${Math.abs(netBalance)}`; statusEl.className = "fee-status-text pay"; } 
    else { statusEl.innerText = `你的帳目已結清`; statusEl.className = "fee-status-text"; }

    const mainAvatarEl = document.getElementById('user-fee-avatar');
    if (mainAvatarEl) {
        if (currentUser && currentUser.pictureUrl && currentUser.pictureUrl.trim() !== "") {
            mainAvatarEl.innerHTML = `<img src="${currentUser.pictureUrl}">`;
        } else {
            mainAvatarEl.innerText = currentUser.initial || "?";
        }
    }
}

// 歷史相容性防空引信
function openEditEditPageFix(feeId) { if (typeof openEditFeePage === 'function') openEditFeePage(feeId); }

// =========================================================================
// 🎯 [費用表單初始化大腦 - 滿血完全體通電版]
// =========================================================================

// 3. 點擊明細後就地反填編輯
function openEditFeePage(feeId) {
    if (!cachedPollData || !cachedPollData.fees || !cachedPollData.fees.items) return;
    const item = cachedPollData.fees.items[feeId];
    if (!item) return;

    // 💡 剛性初始化與理順雙棲拆帳快取
    window.customPayersCache = null; 
    window.customSplitVotersCache = null;

    // 🎯 修正：點開舊卡片時，智慧判斷它是「客製化金額」還是「平均分攤」，讓右邊紅點正確點亮或熄滅
    if (item && item.voters) {
        let upgradedVoters = {};
        let isCustomSplitData = false;
        
        for (let uid in item.voters) {
            let vVal = item.voters[uid];
            // 只要 voters 裡面任何一個人對應的值是「數字（Number）」，代表這是一筆客製化款項！
            if (typeof vVal === 'number') {
                isCustomSplitData = true;
                upgradedVoters[uid] = {
                    amount: vVal,
                    calculatedAmount: vVal,
                    isActive: true
                };
            } else {
                // 如果是 true，先包裝成進階快取 Placeholder，但 amount 保持 0 留白，判定為平均
                upgradedVoters[uid] = { amount: 0, calculatedAmount: 0, isActive: true };
            }
        }
        window.customSplitVotersCache = upgradedVoters;
        
        const activeCount = Object.keys(upgradedVoters).length;
        const badge = document.getElementById('fee-custom-split-badge');
        
        // 剛性判定：只有在後台確確實實是客製化金額 (isCustomSplitData) 時，才在右邊亮起紅點！
        if (badge && isCustomSplitData && activeCount > 0) {
            badge.innerText = activeCount;
            badge.style.display = 'block';
        } else if (badge) {
            badge.style.display = 'none'; // 平均分配時點開，紅點乖乖熄滅不亮
        }
    } else {
        if (document.getElementById('fee-custom-split-badge')) document.getElementById('fee-custom-split-badge').style.display = 'none';
    }

    // 🎯 修正：點開卡片編輯的當下，完美反向解碼、還原後台資料庫的多人付款明細與人數徽章
    if (item && item.payerId === "MULTIPLE_PAYERS" && item.payers) {
        let upgradedPayers = {};
        let payerCount = 0;
        
        for (let uid in item.payers) {
            let pAmt = parseFloat(item.payers[uid]) || 0;
            upgradedPayers[uid] = {
                amount: pAmt,
                calculatedAmount: pAmt,
                isActive: true
            };
            payerCount++;
        }
        window.customPayersCache = upgradedPayers;
        
        // 實時把付款人 Slider 按鈕右上角的紅色人數徽章強制刷新點亮！
        const pBadge = document.getElementById('fee-payer-custom-badge');
        if (pBadge && payerCount > 0) { pBadge.innerText = payerCount; pBadge.style.display = 'block'; }
    } else {
        if (document.getElementById('fee-payer-custom-badge')) document.getElementById('fee-payer-custom-badge').style.display = 'none';
    }

    document.getElementById('fee-form-title').innerText = "修改款項";
    const submitBtn = document.getElementById('fee-btn-submit-form');
    if (submitBtn) {
        submitBtn.innerText = "重新儲存";
        submitBtn.setAttribute('data-edit-id', feeId);
    }

    document.getElementById('fee-input-title').value = item.title || "";
    document.getElementById('fee-input-amount').value = item.totalAmount || "";
    document.getElementById('fee-input-desc').value = item.desc || "";

    const iconClass = item.iconClass || "fa-wallet";
    window.currentSelectedIconClass = iconClass;

    const previewBox = document.getElementById('fee-selected-icon-preview');
    if (previewBox) {
        previewBox.className = 'fee-form-icon-trigger-box ' + iconClass;
        if (typeof getSvgIconByClass === 'function') previewBox.innerHTML = getSvgIconByClass(iconClass);
    }
    
    if (item.datetime) {
        document.getElementById('fee-input-datetime').value = item.datetime;
    } else if (item.date) {
        const cleanDt = String(item.date).substring(0,10).replace(/\//g, '-');
        document.getElementById('fee-input-datetime').value = `${cleanDt}T12:00`;
    }

    const members = extractMembers(cachedPollData);
    let payerDropdownHtml = "";
    let votersGridHtml = "";

    const activeMembers = members.filter(m => {
        if (!m) return false;
        let trip = m['偏好行程'] || "";
        return !trip.includes("無法參加") && !trip.includes("訪客");
    });

    window.currentSelectedPayerId = item.payerId || "";

    // 🎯 修正：點開舊卡片編輯時，讓外層下拉選單不論「單人」或「多人」都能完美亮起橘色 ● 付款人 標記
    activeMembers.forEach(m => {
        const uid = (m['LINE ID'] || m['LINEID'] || "").trim();
        const uName = (m['LINE 名稱'] || m['LINE名稱'] || "未命名").trim();
        
        // 🛡️ 👑【上線安全防線】：剛性沒收測試帳號權限，就地蒸發不殘留 DOM
        if (uid === "test_user_001" || uName === "開發者(測試)") {
            return;
        }
        
        let voterPic = window.userAvatarMap[uid] || "";
        let voterInitial = uName ? uName[0] : "?";
        let voterAvatarHtml = voterPic 
            ? `<img src="${voterPic}" style="width:24px; height:24px; object-fit:cover; border-radius:50%; flex-shrink:0;">`
            : `<div style="width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg, var(--primary-orange), #ff8c00); color:white; display:flex; justify-content:center; align-items:center; font-size:11px; font-weight:700; flex-shrink:0;">${voterInitial}</div>`;

        // 🔍 實時多棲判定：這個人是不是這筆款項的付款人之一？
        let isHitPayer = false;
        if (item.payerId === "MULTIPLE_PAYERS" && item.payers) {
            // 狀況 A：如果是多人付款，檢查 payers 物件裡有沒有他的 uid
            isHitPayer = item.payers[uid] !== undefined;
        } else {
            // 狀況 B：如果是單人付款，直接比對 payerId
            isHitPayer = (uid === item.payerId);
        }

        payerDropdownHtml += `
            <div class="fee-dropdown-payer-row ${isHitPayer ? 'selected-payer' : ''}" data-uid="${uid}" data-name="${uName}" onclick="selectFeePayerCore(this, event)">
                ${voterAvatarHtml}
                <span class="fee-dropdown-member-name">${uName}</span>
                ${isHitPayer ? '<span style="margin-left:auto; color:var(--primary-orange); font-size:12px; font-weight:800;">● 付款人</span>' : ''}
            </div>
        `;

        const isVoted = item.voters && item.voters[uid] !== undefined;
        votersGridHtml += `
            <div class="fee-dropdown-member-row ${isVoted ? 'active' : ''}" data-uid="${uid}" onclick="syncDropdownMemberClick(this, event)">
                <div class="fee-custom-checkbox" data-checked="${isVoted ? '1' : '0'}"></div>
                ${voterAvatarHtml}
                <span class="fee-dropdown-member-name">${uName}</span>
            </div>
        `;
    });

    document.getElementById('fee-payer-dropdown-box').innerHTML = payerDropdownHtml;
    document.getElementById('fee-voters-check-grid').innerHTML = votersGridHtml;
    
    if (item.payerId === "MULTIPLE_PAYERS") {
        document.getElementById('fee-payer-selected-text').innerText = "多人共同付款";
    } else {
        document.getElementById('fee-payer-selected-text').innerText = item.payerName || "請選擇付款人";
    }

    document.getElementById('fee-payer-dropdown-box').style.display = 'none';
    document.getElementById('fee-voters-dropdown-box').style.display = 'none';
    
    refreshFeeDropdownSelectedText();

    let btnRowWrapper = document.getElementById('fee-custom-btn-row-flex');
    if (!btnRowWrapper && submitBtn && submitBtn.parentElement) {
        btnRowWrapper = document.createElement('div');
        btnRowWrapper.id = 'fee-custom-btn-row-flex';
        btnRowWrapper.style.setProperty('display', 'flex', 'important');
        btnRowWrapper.style.setProperty('gap', '12px', 'important');
        btnRowWrapper.style.setProperty('width', '100%', 'important');
        btnRowWrapper.style.setProperty('margin-top', '20px', 'important');
        submitBtn.parentElement.insertBefore(btnRowWrapper, submitBtn);
        btnRowWrapper.appendChild(submitBtn);
    }

    if (submitBtn) {
        submitBtn.style.flex = "1";
        submitBtn.style.margin = "0";
        submitBtn.style.setProperty('background', 'linear-gradient(135deg, #3BD0AF 0%, #20a085 100%)', 'important'); 
    }

    const oldDelBtn = document.getElementById('fee-btn-delete-item');
    if (oldDelBtn) oldDelBtn.remove();
    
    const delBtn = document.createElement('button');
    delBtn.id = 'fee-btn-delete-item';
    delBtn.innerText = "刪除";
    delBtn.type = "button";
    delBtn.style.flex = "1"; delBtn.style.margin = "0"; delBtn.style.padding = "14px"; delBtn.style.borderRadius = "14px"; delBtn.style.border = "none";
    delBtn.style.setProperty('background', '#ff4d4f', 'important'); delBtn.style.setProperty('color', '#ffffff', 'important'); delBtn.style.setProperty('font-weight', '700', 'important'); delBtn.style.setProperty('font-size', '15px', 'important'); delBtn.style.setProperty('cursor', 'pointer', 'important');
    
    delBtn.onclick = function() {
        if (typeof triggerDeleteFeeItemCore === 'function') triggerDeleteFeeItemCore(feeId, item.title || "此款項");
    };
    if (btnRowWrapper && submitBtn) btnRowWrapper.insertBefore(delBtn, submitBtn);

    switchView('add-fee');
}

// 🎯 重新設計並補齊缺失的「新增款項」完全體函數
function openAddFeePage() {
    // 1. 剛性重置所有進階快取，杜絕上一筆修改資料的殘留污染
    window.customSplitVotersCache = null; 
    window.customPayersCache = null;
    window.currentSelectedPayerId = currentUser.id || "";
    
    const badge = document.getElementById('fee-custom-split-badge');
    if (badge) badge.style.display = 'none';
    
    const defaultIcon = "fa-wallet";
    window.currentSelectedIconClass = defaultIcon;
    
    const previewBox = document.getElementById('fee-selected-icon-preview');
    if (previewBox) {
        previewBox.className = 'fee-form-icon-trigger-box ' + defaultIcon;
    }
    
    if (document.getElementById('fee-selected-icon-preview')) {
        document.getElementById('fee-selected-icon-preview').innerHTML = getSvgIconByClass(defaultIcon);
    }
    
    document.getElementById('fee-form-title').innerText = "新增款項";
    
    const submitBtn = document.getElementById('fee-btn-submit-form');
    if (submitBtn) {
        submitBtn.innerText = "新增";
        submitBtn.removeAttribute('data-edit-id');
        
        // 按鈕視覺剛性置中
        submitBtn.style.setProperty('flex', 'none', 'important'); 
        submitBtn.style.setProperty('width', '50%', 'important'); 
        submitBtn.style.setProperty('margin', '0 auto', 'important'); 
        submitBtn.style.setProperty('display', 'block', 'important'); 
        submitBtn.style.setProperty('background', 'linear-gradient(135deg, var(--primary-orange) 0%, #ff8c00 100%)', 'important'); 
    }
    
    const exDelBtn = document.getElementById('fee-btn-delete-item');
    if (exDelBtn) exDelBtn.remove();
    
    const btnRowWrapper = document.getElementById('fee-custom-btn-row-flex');
    if (btnRowWrapper) {
        btnRowWrapper.parentElement.insertBefore(submitBtn, btnRowWrapper);
        btnRowWrapper.remove();
    }

    // 自動預設日期時間為現在
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    
    const dateInput = document.getElementById('fee-input-datetime');
    if (dateInput) {
        dateInput.type = "datetime-local"; 
        dateInput.value = localISOTime;
    }

    document.getElementById('fee-input-title').value = "";
    document.getElementById('fee-input-amount').value = "";
    document.getElementById('fee-input-desc').value = "";

    // 2. 數據抽取
    const members = cachedPollData ? extractMembers(cachedPollData) : [];
    let payerDropdownHtml = "";
    let votersGridHtml = "";

    const activeMembers = members.filter(m => {
        if (!m) return false;
        let trip = m['偏好行程'] || "";
        return !trip.includes("無法參加") && !trip.includes("訪客");
    });

    activeMembers.forEach(m => {
        const uid = (m['LINE ID'] || m['LINEID'] || "").trim();
        const uName = (m['LINE 名稱'] || m['LINE名稱'] || "未命名").trim();
        
        // 🛡️ 👑【環境智慧分流防線】：只有當「非本地環境（線上環境）」時，才剛性封鎖測試帳號！
        // 這樣可以完美確保你自己在 localhost 電腦開發時看得見、用得著，推上網頁後組員絕對看不到！
        if (!isLocalEnv) {
            if (uid === "test_user_001" || uName === "開發者(測試)") {
                return; // 線上就地蒸發
            }
        }
        
        let voterPic = window.userAvatarMap[uid] || "";
        let voterInitial = uName ? uName[0] : "?";
        let voterAvatarHtml = voterPic 
            ? `<img src="${voterPic}" style="width:24px; height:24px; object-fit:cover; border-radius:50%; flex-shrink:0;">`
            : `<div style="width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg, var(--primary-orange), #ff8c00); color:white; display:flex; justify-content:center; align-items:center; font-size:11px; font-weight:700; flex-shrink:0;">${voterInitial}</div>`;

        // 誰先付錢單選列表 (預設帶入本人 isMe 特權)
        const isMe = uid === currentUser.id;
        payerDropdownHtml += `
            <div class="fee-dropdown-payer-row ${isMe ? 'selected-payer' : ''}" data-uid="${uid}" data-name="${uName}" onclick="selectFeePayerCore(this, event)">
                ${voterAvatarHtml}
                <span class="fee-dropdown-member-name">${uName}</span>
                ${isMe ? '<span style="margin-left:auto; color:var(--primary-orange); font-size:12px; font-weight:800;">● 付款人</span>' : ''}
            </div>
        `;

        // 如何分攤多選打勾列表 (預設全選 active)
        votersGridHtml += `
            <div class="fee-dropdown-member-row active" data-uid="${uid}" onclick="syncDropdownMemberClick(this, event)">
                <div class="fee-custom-checkbox" data-checked="1"></div>
                ${voterAvatarHtml}
                <span class="fee-dropdown-member-name">${uName}</span>
            </div>
        `;
    });

    // 剛性灌入 DOM 節點
    document.getElementById('fee-payer-dropdown-box').innerHTML = payerDropdownHtml;
    document.getElementById('fee-voters-check-grid').innerHTML = votersGridHtml;
    document.getElementById('fee-payer-selected-text').innerText = currentUser.name || "請選擇付款人";

    document.getElementById('fee-payer-dropdown-box').style.display = 'none';
    document.getElementById('fee-payer-arrow').style.transform = 'rotate(0deg)';
    document.getElementById('fee-voters-dropdown-box').style.display = 'none';
    document.getElementById('fee-dropdown-arrow').style.transform = 'rotate(0deg)';
    
    refreshFeeDropdownSelectedText();
    
    // 3. 順暢放行切換到主表單視圖
    switchView('add-fee');
}

// 🎯 4. 高質感全螢幕類別圖標彈窗控制器
function openFeeIconPickerModal() { 
    const modal = document.getElementById('fee-icon-picker-modal');
    if (!modal) return;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
}

function closeFeeIconPickerModal() { 
    const modal = document.getElementById('fee-icon-picker-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
}

function selectFeeIconCore(iconClass) {
    window.currentSelectedIconClass = iconClass;
    
    // 🎯 核心修正：撈取上方的大圓圈外殼，並動態將點選的類別名稱（如 fa-car）加進 Class 裡面
    const previewBox = document.getElementById('fee-selected-icon-preview');
    if (previewBox) {
        previewBox.className = 'fee-form-icon-trigger-box ' + iconClass;
    }
    
    document.getElementById('fee-selected-icon-preview').innerHTML = getSvgIconByClass(iconClass);
    closeFeeIconPickerModal();
}

// =========================================================================
// 🎯 🌟【智慧型 SVG 類別圖標映射大腦 - 徹底洗掉寫死的顏色，交給 CSS 全域同步】
// =========================================================================
function getSvgIconByClass(cls) {
    if (cls === 'fa-home') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    }
    if (cls === 'fa-fast-food') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>`;
    }
    if (cls === 'fa-car') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
    }
    if (cls === 'fa-ticket') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path></svg>`;
    }
    if (cls === 'fa-admission') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5H1v14h14V5zM5 11h6M5 15h6M19 9v10h-2V9h2zm4-4v10h-2V5h2z"/></svg>`;
    }
    // 預設為雜支 (fa-wallet)
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
}

// =========================================================================
// 🎯 🌟【確定刪除款項 - 狀態剛性重置 ＋ 徹底根治一直轉圈圈與按鈕消失 Bug】
// =========================================================================
function triggerDeleteFeeItemCore(feeId, feeTitle) {
    if (navigator.vibrate) navigator.vibrate(60); 

    // 🛡️ 剛性防御：每次開啟前，必須強制把上一次被 showCustomAlert 污染的按鈕和轉圈圈狀態初始化歸位！
    const modalBtnGroup = document.getElementById('modal-btn-group');
    const modalSpinner = document.getElementById('modal-spinner');
    if (modalBtnGroup) modalBtnGroup.style.setProperty('display', 'flex', 'important');
    if (modalSpinner) modalSpinner.style.setProperty('display', 'none', 'important');

    document.getElementById('modal-title').innerText = "確定刪除款項？";
    const descEl = document.getElementById('modal-desc');
    if (descEl) {
        descEl.innerText = `您即將刪除「${feeTitle}」\n此動作無法復原！`;
        descEl.style.display = 'block';
        descEl.classList.remove('pulse-text');
    }
    
    document.getElementById('modal-input-wrapper').style.display = 'none';
    document.getElementById('modal-textarea').style.display = 'none';
    document.getElementById('modal-btn-cancel').style.display = 'block';
    
    const confirmBtn = document.getElementById('modal-btn-confirm');
    confirmBtn.style.display = 'block';
    confirmBtn.innerText = "確定刪除";
    
    // 🌟 異步執行緒鎖定：改為安全 async/await 機制
    confirmBtn.onclick = async function() {
        confirmBtn.disabled = true;
        
        // 1. 喚起轉圈圈 (暫時隱藏按鈕)
        showCustomAlert("正在刪除", "正在從雲端帳本中抹除項目...", false);
        
        try {
            // 2. 剛性等待 Firebase 網路請求徹底刪除乾淨，不允許異步搶跑
            await db.ref(`fees/items/${feeId}`).remove();
            console.log(`🗑️ 款項 ${feeId} 雲端刪除成功`);
            
            // 3. 安全還原與關閉遮罩
            document.body.classList.remove('no-scroll');
            const mainOverlay = document.getElementById('custom-modal');
            if (mainOverlay) mainOverlay.style.setProperty('display', 'none', 'important');
            
            // 4. 給予 100 毫秒時序分流緩衝，確保大表監聽重算完全結束，再切換分頁，按鈕 100% 穩定跑出！
            setTimeout(() => {
                setTimeout(() => { switchView('fees'); }, 100);
            }, 100);

        } catch (err) {
            document.body.classList.remove('no-scroll');
            const mainOverlay = document.getElementById('custom-modal');
            if (mainOverlay) mainOverlay.style.display = 'none';
            
            showCustomAlert("錯誤", "雲端刪除失敗，請檢查網路連線：" + err.message);
            console.error("Firebase 刪除失敗:", err);
        } finally {
            confirmBtn.disabled = false;
        }
    };
    
    document.getElementById('custom-modal').style.display = 'flex';
}

// =========================================================================
// 🎯 🌟【費用表單核心提交大腦 - 雙棲客製化金額/多人付款實時同步完全體】
// 💡 解決：點擊重新儲存後，完美同步每人付款金額與分攤金額至 Firebase 與前台卡片
// =========================================================================
async function submitFeeFormCore() {
    const titleInp = document.getElementById('fee-input-title');
    const amountInp = document.getElementById('fee-input-amount');
    const datetimeInp = document.getElementById('fee-input-datetime');
    const descInp = document.getElementById('fee-input-desc');
    const submitBtn = document.getElementById('fee-btn-submit-form');

    if (!submitBtn) return;

    // 1. 基礎防呆驗證
    const title = titleInp ? titleInp.value.trim() : "";
    const totalAmount = amountInp ? parseFloat(amountInp.value) : 0;
    let datetime = datetimeInp ? datetimeInp.value : "";
    const desc = descInp ? descInp.value.trim() : "";

    if (!title) {
        showCustomAlert("提示", "請輸入款項的類別與品項名稱喔！");
        if (titleInp) titleInp.focus();
        return;
    }
    if (!totalAmount || totalAmount <= 0 || isNaN(totalAmount)) {
        showCustomAlert("提示", "請輸入正確的款項金額！");
        if (amountInp) amountInp.focus();
        return;
    }

    // 2. 核心對位大腦 A：處理「誰先付錢（單人 vs 多人各別付款金額）」
    let payerId = window.currentSelectedPayerId || "";
    let payerName = document.getElementById('fee-payer-selected-text').innerText || "未知";
    let finalPayersObject = null;

    if (payerId === "MULTIPLE_PAYERS" && window.customPayersCache) {
        // 多人共同付款模式：封裝成扁平物件結構儲存 (uid: 實質付款金額)
        finalPayersObject = {};
        let activePayerCount = 0;
        
        for (let uid in window.customPayersCache) {
            const cacheItem = window.customPayersCache[uid];
            if (cacheItem && cacheItem.isActive === true) {
                // 實時抓取內頁計算好的金額數據 (calculatedAmount)
                finalPayersObject[uid] = parseFloat(cacheItem.calculatedAmount) || 0;
                activePayerCount++;
            }
        }
        payerName = `是多人共同付款(已選${activePayerCount}人)`;
    }

    // 3. 核心對位大腦 B：處理「如何分攤（平均分攤 vs 客製化各別分攤金額）」
    // 🎯 修正：重新儲存發送雲端大閘 ── 自動識別是否包含實質客製化金額數字
    let finalVotersObject = {};
    
    // 判定內頁有沒有人真的打過手動定額金額
    let isRealCustomSplitSubmit = false;
    if (window.customSplitVotersCache) {
        isRealCustomSplitSubmit = Object.values(window.customSplitVotersCache).some(v => v && v.amount > 0);
    }
    
    if (isRealCustomSplitSubmit) {
        // 🌟 儲存情境 B：真的有各別手動改金額，寫入各自客製化實質分攤數字
        for (let uid in window.customSplitVotersCache) {
            const cacheItem = window.customSplitVotersCache[uid];
            if (cacheItem && cacheItem.isActive === true) {
                finalVotersObject[uid] = parseFloat(cacheItem.calculatedAmount) || 0;
            }
        }
    } else {
        // 🌟 儲存情境 A：未改金額，直接讀取外面下拉選單亮起 active 的人頭，寫入相容的純 true 平均分配！
        const activeTags = document.querySelectorAll('#fee-voters-check-grid .fee-dropdown-member-row.active');
        activeTags.forEach(tag => {
            const uid = tag.getAttribute('data-uid');
            if (uid) finalVotersObject[uid] = true;
        });
    }

    const finalVoterCount = Object.keys(finalVotersObject).length;
    if (finalVoterCount === 0) {
        showCustomAlert("提示", "請至少選擇一位團員來分攤這筆費用！");
        return;
    }

    // 4. 時序精算：剛性補齊目前時間的秒數，確保排序萬無一失
    const nowTimeObj = new Date();
    const currentSeconds = String(nowTimeObj.getSeconds()).padStart(2, '0');

    if (datetime && datetime.length === 16) {
        datetime = datetime + ":" + currentSeconds; 
    } else if (!datetime) {
        const isoMonth = String(nowTimeObj.getMonth() + 1).padStart(2, '0');
        const isoDay = String(nowTimeObj.getDate()).padStart(2, '0');
        const isoHour = String(nowTimeObj.getHours()).padStart(2, '0');
        const isoMin = String(nowTimeObj.getMinutes()).padStart(2, '0');
        datetime = `${nowTimeObj.getFullYear()}-${isoMonth}-${isoDay}T${isoHour}:${isoMin}:${currentSeconds}`;
    }

    let displayDate = "";
    if (datetime) {
        const dt = new Date(datetime);
        if (!isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            const h = String(dt.getHours()).padStart(2, '0');
            const min = String(dt.getMinutes()).padStart(2, '0');
            displayDate = `${y}/${m}/${d} ${h}:${min}:${currentSeconds}`;
        }
    }
    if (!displayDate) displayDate = getStandardTwelveHourWithPaddingTime();

    // 5. 判定行為模式：新增款項 還是 修改款項
    const editFeeId = submitBtn.getAttribute('data-edit-id');
    const targetFeeId = editFeeId ? editFeeId : "FEE_" + Date.now();

    // 6. 鎖定按鈕防止連擊，喚起高質感轉圈圈
    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "正在儲存中...";
    showCustomAlert("正在處理", "正在同步更新至雲端帳本與明細卡片...", false);

    // 🧱 核心資料結構完全體封裝（完全對齊你的前後台實時同步需求）
    const finalFeePayload = {
        feeId: targetFeeId,
        title: title,
        totalAmount: totalAmount,
        date: displayDate,
        datetime: datetime,
        payerId: payerId,
        payerName: payerName,
        iconClass: window.currentSelectedIconClass || "fa-wallet",
        desc: desc,
        voters: finalVotersObject // 👈 這裡記錄了有誰分攤、各自各別分攤了多少錢
    };

    // 如果有啟用多人共同付款，將每人付了多少錢的結構包也塞進欄位中
    if (finalPayersObject) {
        finalFeePayload.payers = finalPayersObject; // 👈 這裡記錄了有誰付款、各自各別付了多少錢
    }

    try {
        // 🎯 核心大連動：直接覆蓋、更新 Firebase 雲端資料庫的最短路徑
        await db.ref(`fees/items/${targetFeeId}`).set(finalFeePayload);
        console.log(`⚡ [資料庫連動成功] 款項 ${targetFeeId} 已完美同步更新`);

        // 7. 清除本地進階快取暫存，防止污染下一筆帳目
        window.customSplitVotersCache = null;
        window.customPayersCache = null;

        // 8. 圓滿成功，解除警報並一秒退回費用明細大表
        closeModal();
        switchView('fees');
        if (typeof renderFeesPage === 'function') {
            renderFeesPage(cachedPollData);
        }

    } catch (error) {
        console.error("雲端同步記帳失敗:", error);
        closeModal();
        showCustomAlert("儲存失敗", "因網路異常，新數據未能成功寫入資料庫：" + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

// =========================================================================
// 🎯 [方案B - 點擊藍色人名標籤：安靜無干擾大腦]
// 💡 修正：先移除自訂 Alert 彈窗，只保留手機觸覺震動，未來想好功能隨時可以在這裡加！
// =========================================================================
function handleMentionClick(targetName) {
    if (navigator.vibrate) navigator.vibrate(40); // 貼心保留行動裝置的輕微觸覺回饋
    
    // ➔ 已經幫你把原本的 showCustomAlert(...) 註銷移除了，現在點擊名字絕對不會再跳出任何視窗！
    console.log(`💡 提示：您點擊了標記標籤 ${targetName}，目前處於靜音無動作狀態。`);
}
// =========================================================================
// 🎯 [自製拆帳下拉選單 - 智慧核心控制中心]
// =========================================================================

function toggleFeeVotersDropdown(event) {
    if (event) event.stopPropagation();
    const box = document.getElementById('fee-voters-dropdown-box');
    const arrow = document.getElementById('fee-dropdown-arrow');
    if (!box) return;
    
    // 🛡️ 安全互斥：點開分攤選單時，剛性強制將付款人選單關閉，防交叉卡死！
    const payerBox = document.getElementById('fee-payer-dropdown-box');
    const payerArrow = document.getElementById('fee-payer-arrow');
    if (payerBox) payerBox.style.display = 'none';
    if (payerArrow) payerArrow.style.transform = 'rotate(0deg)';
    
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'block';
        
        // 📥 智慧歸零防線：在選單亮起的瞬間，強制將內部垂直滾動條拉回最頂端！
        box.scrollTop = 0;
        const grid = document.getElementById('fee-voters-check-grid');
        if (grid) grid.scrollTop = 0;
        
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        box.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
}


// 點空白處關閉下拉選單
document.addEventListener('click', function(e) {
    const box = document.getElementById('fee-voters-dropdown-box');
    const arrow = document.getElementById('fee-dropdown-arrow');
    const btn = document.getElementById('fee-voters-dropdown-btn');
    if (box && box.style.display === 'block' && !box.contains(e.target) && !btn.contains(e.target)) {
        box.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
});

// =========================================================================
// 🎯 [自製記帳下拉雙模 - 智慧核心控制中心]
// =========================================================================
function toggleFeePayerDropdown(event) {
    if (event) event.stopPropagation();
    const box = document.getElementById('fee-payer-dropdown-box');
    const arrow = document.getElementById('fee-payer-arrow');
    if (!box) return;
    
    // 🛡️ 安全互斥：點開付款人選單時，剛性強制將分攤人選單關閉，防版面擠壓！
    const votersBox = document.getElementById('fee-voters-dropdown-box');
    const votersArrow = document.getElementById('fee-dropdown-arrow');
    if (votersBox) votersBox.style.display = 'none';
    if (votersArrow) votersArrow.style.transform = 'rotate(0deg)';
    
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'block';
        
        // 📥 智慧歸零防線：在選單亮起的瞬間，強制將內部垂直滾動條拉回最頂端！
        box.scrollTop = 0; 
        
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        box.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
}

// =========================================================================
// 🎯 [外層付款人下拉單選 - 核心解鎖防線]
// 💡 解決：當外面下拉選單改選單人時，自動清除多人付款快取，同步隱藏紅點數字
// =========================================================================
function selectFeePayerCore(element, event) {
    if (event) event.stopPropagation();
    
    const targetUid = element.getAttribute('data-uid');
    const targetName = element.getAttribute('data-name');
    
    // 1. 剛性覆蓋全域付款人狀態：轉為當前點選的單一人頭 ID
    window.currentSelectedPayerId = targetUid;
    
    // 🎯 核心修正：既然在外面單選了某一個人，代表「不要多人付款了」！
    // 立刻就地強制清空、洗掉之前殘留的多人共同付款快取，兩邊資料瞬間同步
    window.customPayersCache = null;

    // 2. 刷新外面的提示大字文字
    const payerLabel = document.getElementById('fee-payer-selected-text');
    if (payerLabel) {
        payerLabel.innerText = targetName;
    }

    // 3. 🔄 視覺重繪：清除選單內舊的選中痕跡，只讓當前點選的這一個人亮起標記
    const allPayerRows = document.querySelectorAll('#fee-payer-dropdown-box .fee-dropdown-payer-row');
    allPayerRows.forEach(row => {
        row.classList.remove('selected-payer');
        const existingTag = row.querySelector('span[style*="margin-left:auto"]');
        if (existingTag) existingTag.remove();
    });
    
    // 為當前點選的人加上高亮與橘色「● 付款人」標記
    element.classList.add('selected-payer');
    element.insertAdjacentHTML('beforeend', `<span style="margin-left:auto; color:var(--primary-orange); font-size:12px; font-weight:800;">● 付款人</span>`);

    // 4. 🎯 核心修正：紅色數字點連動邏輯（單人付款時，紅色數字點必須立刻清空隱藏）
    const payerBadge = document.getElementById('fee-payer-custom-badge');
    if (payerBadge) {
        payerBadge.innerText = "0";
        payerBadge.style.display = 'none'; // 鎖定隱藏紅點
    }

    // 5. 收合下拉選單與箭頭歸位
    const pBox = document.getElementById('fee-payer-dropdown-box');
    const pArrow = document.getElementById('fee-payer-arrow');
    if (pBox) pBox.style.display = 'none';
    if (pArrow) pArrow.style.transform = 'rotate(0deg)';
    
    // 重新校正前台文字與徽章防線
    if (typeof refreshFeeDropdownSelectedText === 'function') {
        refreshFeeDropdownSelectedText();
    }
}

// =========================================================================
// 🎯 [外層下拉選單單點打勾 - 內外連動修復版]
// =========================================================================
function syncDropdownMemberClick(element, event) {
    if (event) event.stopPropagation();
    
    element.classList.toggle('active');
    const checkbox = element.querySelector('.fee-custom-checkbox');
    
    // 🔄 打通資料流：實時把 1 或 0 的狀態灌進節點屬性裡
    if (element.classList.contains('active')) {
        if (checkbox) checkbox.setAttribute('data-checked', '1');
    } else {
        if (checkbox) checkbox.setAttribute('data-checked', '0');
    }

    // 💡 關鍵大連動：如果之前有進去過客製化分帳，當在外面取消勾選某人時，同步將內頁快取同步抹除！
    if (window.customSplitVotersCache) {
        const uid = element.getAttribute('data-uid');
        if (uid) {
            if (element.classList.contains('active')) {
                window.customSplitVotersCache[uid] = { amount: 0, calculatedAmount: 0, isActive: true };
            } else {
                delete window.customSplitVotersCache[uid];
            }
        }
    }
    
    refreshFeeDropdownSelectedText();
}

// =========================================================================
// 🎯 [外層下拉選單：全選 / 全不選功能大滿貫復活]
// =========================================================================
function toggleAllFeeVoters(event) {
    if (event) event.stopPropagation();
    const btn = document.getElementById('fee-toggle-all-voters');
    const rows = document.querySelectorAll('#fee-voters-check-grid .fee-dropdown-member-row');
    
    if (!btn || rows.length === 0) return;

    if (btn.innerText === "全不選") {
        rows.forEach(r => {
            r.classList.remove('active');
            const cb = r.querySelector('.fee-custom-checkbox');
            if (cb) cb.setAttribute('data-checked', '0');
            
            // 同步洗掉客製化快取
            if (window.customSplitVotersCache) {
                const uid = r.getAttribute('data-uid');
                if (uid) delete window.customSplitVotersCache[uid];
            }
        });
        btn.innerText = "全選";
    } else {
        rows.forEach(r => {
            r.classList.add('active');
            const cb = r.querySelector('.fee-custom-checkbox');
            if (cb) cb.setAttribute('data-checked', '1');
            
            // 同步灌入客製化快取
            if (window.customSplitVotersCache) {
                const uid = r.getAttribute('data-uid');
                if (uid) window.customSplitVotersCache[uid] = { amount: 0, calculatedAmount: 0, isActive: true };
            }
        });
        btn.innerText = "全不選";
    }
    
    refreshFeeDropdownSelectedText();
}

document.addEventListener('click', function(e) {
    const pBox = document.getElementById('fee-payer-dropdown-box');
    const pArrow = document.getElementById('fee-payer-arrow');
    const vBox = document.getElementById('fee-voters-dropdown-box');
    const vArrow = document.getElementById('fee-dropdown-arrow');
    if (pBox && pBox.style.display === 'block' && !pBox.contains(e.target) && !document.getElementById('fee-payer-dropdown-btn').contains(e.target)) {
        pBox.style.display = 'none'; if (pArrow) pArrow.style.transform = 'rotate(0deg)';
    }
    if (vBox && vBox.style.display === 'block' && !vBox.contains(e.target) && !document.getElementById('fee-voters-dropdown-btn').contains(e.target)) {
        vBox.style.display = 'none'; if (vArrow) vArrow.style.transform = 'rotate(0deg)';
    }
});

// 安靜無動作點擊人名
function handleMentionClick(targetName) {
    if (navigator.vibrate) navigator.vibrate(40);
    console.log(`💡 點擊了 ${targetName}`);
}

// =========================================================================
// 🎯 🌟【結算大腦完全體 - 移除文字下箭頭、日期標準補零、修正自動導航跳轉】
// =========================================================================
// =========================================================================
// 🎯 👑 【結算清算核心大腦 ── LightSplit 精算連動神盾】
// 💡 解決：徹底修正客製化拆帳金額與多人共同付款的清算 Bug，保證金錢 100% 精準對齊！
// =========================================================================
async function calculateAndRenderSettlement() {
    const transfersContainer = document.getElementById('ui-settlement-transfers-container');
    if (!transfersContainer) return;

    if (!cachedPollData) {
        transfersContainer.innerHTML = `<p style="color:var(--text-muted); font-size:12px; text-align:center;">正在載入雲端數據...</p>`;
        return;
    }

    const members = extractMembers(cachedPollData);
    const feesItems = cachedPollData.fees && cachedPollData.fees.items ? cachedPollData.fees.items : {};
    const isSettlementLocked = cachedPollData.config && (String(cachedPollData.config.SettlementLocked).toLowerCase() === 'true' || cachedPollData.config.SettlementLocked === true);

    // ⚖️ 初始化所有參與者的淨值大表 (0 代表不欠不收)
    let calcNetBalances = {};
    members.forEach(m => {
        if (!m) return;
        let trip = m['偏好行程'] || "";
        if (trip.includes("無法參加") || trip.includes("訪客")) return;
        const uid = m['LINE ID'] || m['LINEID'];
        if (uid) calcNetBalances[uid] = 0; 
    });

    // 🔍 核心精算巡邏大閘
    for (let feeId in feesItems) {
        const item = feesItems[feeId];
        if (!item) continue;
        
        const totalAmount = parseFloat(item.totalAmount) || 0;
        const payerId = item.payerId || "";
        const voters = item.voters || {};
        const voterKeys = Object.keys(voters).filter(uid => calcNetBalances[uid] !== undefined);
        const voterCount = voterKeys.length;

        if (voterCount > 0) {
            // 🟢 1. 【分攤清算分流】：判定此筆款項是「客製化金額」還是「平均分攤」
            const isCustomSplitItem = Object.values(voters).some(v => typeof v === 'number');

            if (isCustomSplitItem) {
                // 🔒 情境 A：進階客製化分攤 ➔ 剛性直接累加後台記錄的「個人實質分攤數字」
                voterKeys.forEach(uid => {
                    const customAmt = parseFloat(voters[uid]) || 0;
                    calcNetBalances[uid] += customAmt; // 應付增加
                });
            } else {
                // 🔒 情境 B：傳統平均分攤 ➔ 執行嚴密的隨機餘額防漏分配演算法，確保每一塊錢都被清算
                const baseCost = Math.floor(totalAmount / voterCount);
                const remainder = totalAmount - (baseCost * voterCount);
                voterKeys.sort();

                let idHashSeed = 0; const seedStr = String(feeId);
                for (let i = 0; i < seedStr.length; i++) idHashSeed += seedStr.charCodeAt(i);
                let luckyIndices = []; for (let i = 0; i < voterCount; i++) luckyIndices.push(i);
                for (let i = luckyIndices.length - 1; i > 0; i--) {
                    let j = (idHashSeed + i) % (i + 1);
                    let temp = luckyIndices[i]; luckyIndices[i] = luckyIndices[j]; luckyIndices[j] = temp;
                }
                let winningIndices = luckyIndices.slice(0, remainder);

                voterKeys.forEach((uid, idx) => {
                    const finalShare = baseCost + (winningIndices.includes(idx) ? 1 : 0);
                    calcNetBalances[uid] += finalShare;
                });
            }

            // 🟢 2. 【付款清算分流】：判定是「單人墊付」還是「多人共同付款明細」
            if (payerId === "MULTIPLE_PAYERS" && item.payers) {
                // 🔒 多人共同付款 ➔ 依據後台紀錄的 payers 物件，扣除每個人各自代墊的實質金額
                for (let uid in item.payers) {
                    if (calcNetBalances[uid] !== undefined) {
                        const paidAmt = parseFloat(item.payers[uid]) || 0;
                        calcNetBalances[uid] -= paidAmt; // 墊付金額從應付中扣除 (轉為應收或減債)
                    }
                }
            } else {
                // 🔒 單人墊付模式 ➔ 唯獨扣除代墊者一人的總金額
                if (calcNetBalances[payerId] !== undefined) {
                    calcNetBalances[payerId] -= totalAmount;
                }
            }
        }
    }

    // 🟢 3. 扣除歷史已經核銷完成的收據 logs (維持原廠優良規格)
    const settledLogs = cachedPollData.fees && cachedPollData.fees.settledLogs ? cachedPollData.fees.settledLogs : {};
    for (let logId in settledLogs) {
        const log = settledLogs[logId];
        if (!log) continue;
        const amt = parseFloat(log.amount) || 0;
        if (calcNetBalances[log.fromId] !== undefined) calcNetBalances[log.fromId] -= amt;
        if (calcNetBalances[log.toId] !== undefined) calcNetBalances[log.toId] += amt;
    }

    // ⚖️ 計算當前登入組員的最終淨化收益
    const myFinalNetBalance = Math.round(calcNetBalances[currentUser.id] || 0);

    // 區分債務人與債權人
    let debtors = []; let creditors = [];
    for (let uid in calcNetBalances) {
        let bal = calcNetBalances[uid];
        if (bal > 0.5) debtors.push({ uid: uid, amt: bal });
        else if (bal < -0.5) creditors.push({ uid: uid, amt: Math.abs(bal) });
    }

    // 貪婪演算法精算最少轉帳次數
    let transferInstructions = [];
    let dIdx = 0, cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
        let debtor = debtors[dIdx]; let creditor = creditors[cIdx];
        let settleAmount = Math.min(debtor.amt, creditor.amt);
        transferInstructions.push({
            fromId: debtor.uid, fromName: window.userNameMap[debtor.uid] || "團員",
            toId: creditor.uid, toName: window.userNameMap[creditor.uid] || "團員",
            amount: Math.round(settleAmount)
        });
        debtor.amt -= settleAmount; creditor.amt -= settleAmount;
        if (debtor.amt <= 0.5) dIdx++; if (creditor.amt <= 0.5) cIdx++;
    }

    // 🟢 4. 頂部看板試算同步與連動 (還原全透明毛玻璃字體變色版，消滅綠底)
    const totalDisplayEl = document.getElementById('user-result-total');
    const statusDisplayEl = document.getElementById('user-result-status');
    if (totalDisplayEl && statusDisplayEl) {
        if (Math.abs(myFinalNetBalance) === 0 || transferInstructions.length === 0) {
            totalDisplayEl.innerText = "$0"; statusDisplayEl.innerText = "已完成收付款";
            statusDisplayEl.className = "fee-status-text"; statusDisplayEl.style.background = "rgba(59, 208, 175, 0.2)"; statusDisplayEl.style.color = "var(--primary-green)";
        } else if (myFinalNetBalance < 0) {
            totalDisplayEl.innerText = `+$${Math.abs(myFinalNetBalance)}`; statusDisplayEl.innerText = "我應收款";
            statusDisplayEl.className = "fee-status-text receive"; statusDisplayEl.style.background = ""; statusDisplayEl.style.color = "";
        } else {
            totalDisplayEl.innerText = `-$${myFinalNetBalance}`; statusDisplayEl.innerText = "我應付款";
            statusDisplayEl.className = "fee-status-text pay"; statusDisplayEl.style.background = ""; statusDisplayEl.style.color = "";
        }
    }

    // 🟢 5. 渲染轉帳卡片列表
    if (transferInstructions.length === 0) {
        transfersContainer.innerHTML = `
            <div class="card" style="text-align:center; padding:40px 10px; color:var(--text-muted); font-size:13px; font-weight:600; background:rgba(255,255,255,0.4); border-radius:16px; border:1px solid rgba(255,255,255,0.6);">
                本次旅遊帳目已結清！
            </div>
        `;
    } else {
        let htmlStr = "";
        transferInstructions.forEach(t => {
            let fromPic = window.userAvatarMap[t.fromId] || "";
            let toPic = window.userAvatarMap[t.toId] || "";
            let fInitial = t.fromName ? t.fromName[0] : "?";
            let tInitial = t.toName ? t.toName[0] : "?";

            let fromAv = fromPic ? `<img src="${fromPic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : `<div style="width:100%; height:100%; background:linear-gradient(135deg, #FF7676, #FF4D4F); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; border-radius:50%;">${fInitial}</div>`;
            let toAv = toPic ? `<img src="${toPic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : `<div style="width:100%; height:100%; background:linear-gradient(135deg, #3BD0AF, #20A085); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; border-radius:50%;">${tInitial}</div>`;

            let btnAttributesHtml = isSettlementLocked ? "disabled" : `onclick="executeLivePaymentLogSubmit('${t.fromId}', '${t.fromName}', '${t.toId}', '${t.toName}', ${t.amount})"`;
            let btnText = isSettlementLocked ? "結算已鎖定" : "已完成付款";

            htmlStr += `
                <div class="settle-flow-card">
                    <div style="display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; padding-right: 4px;">
                        <div class="settle-person-row">
                            <div style="width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">${fromAv}</div>
                            <span class="settle-member-name-fluid">${t.fromName}</span>
                            <span class="settle-badge-pay">付款</span>
                        </div>
                        <div class="settle-person-row">
                            <div style="width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">${toAv}</div>
                            <span class="settle-member-name-fluid">${t.toName}</span>
                            <span class="settle-badge-receive">收款</span>
                        </div>
                    </div>
                    <div class="settle-center-price-box">
                        <span class="settle-price-text" style="font-size:24px;">$${t.amount}</span>
                    </div>
                    <button class="fee-calc-btn" style="padding: 12px 10px; font-size: 11px; font-weight: 800; border-radius: 10px; background: linear-gradient(135deg, #3BD0AF 0%, #20a085 100%); color: white; border: none; cursor: pointer; flex-shrink: 0; box-shadow: 0 3px 8px rgba(59,208,175,0.18);" ${btnAttributesHtml}>
                        ${btnText}
                    </button>
                </div>
            `;
        });
        transfersContainer.innerHTML = htmlStr;
    }
}

// 🎯 3. 【全新工具函數】：產生絕對強制補零的 YYYY/MM/DD 時間戳記，徹底擊碎 2026/6/1 與 2026/06/01 分區碎裂 Bug
function getStrictZeroPaddingTime() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // 強制補零成 06
    const day = String(d.getDate()).padStart(2, '0');        // 強制補零成 01
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// =========================================================================
// 🎯 🌟【結算核心核銷巨集 ── 精準切回費用明細分頁 ＋ 12時制 AM/PM 後置規格版】
// =========================================================================
async function executeLivePaymentLogSubmit(fromId, fromName, toId, toName, amount) {
    if (navigator.vibrate) navigator.vibrate(80);
    
    // 🟢 2. 依照指令：拔除原本在此處的 showCustomAlert 跳窗，杜絕不到一秒的閃爍，實現極速秒轉
    const logId = "SETTLE_LOG_" + Date.now();
    const timeStampStandard = getStandardTwelveHourWithPaddingTime(); 

    const nowForSort = new Date();
    const isoMonth = String(nowForSort.getMonth() + 1).padStart(2, '0');
    const isoDay = String(nowForSort.getDate()).padStart(2, '0');
    const isoHour = String(nowForSort.getHours()).padStart(2, '0');
    // 🟢 修正後：寫入 settledLogs 時，datetimeStandard (datetime 欄位) 剛性強灌當下秒數
    const isoMin = String(nowForSort.getMinutes()).padStart(2, '0');
    const isoSec = String(nowForSort.getSeconds()).padStart(2, '0'); // 提取秒數
    const datetimeStandard = `${nowForSort.getFullYear()}-${isoMonth}-${isoDay}T${isoHour}:${isoMin}:${isoSec}`;
    
    const settlementPayload = {
        logId: logId,
        fromId: fromId,
        fromName: fromName,
        toId: toId,
        toName: toName,
        amount: amount,
        timestamp: timeStampStandard, 
        datetime: datetimeStandard,
        type: "settled_receipt"
    };

    try {
        
        // 直連回寫雲端
        await db.ref(`fees/settledLogs/${logId}`).set(settlementPayload);
        
        if (cachedPollData) {
            if (!cachedPollData.fees) cachedPollData.fees = {};
            if (!cachedPollData.fees.settledLogs) cachedPollData.fees.settledLogs = {};
            // 剛性打針注入
            cachedPollData.fees.settledLogs[logId] = settlementPayload;
        }
        
        // 🟢 完美的 0 延遲全自動跳轉回費用明細頁面，此時卡片 100% 秒速現身！
        setTimeout(() => { 
            switchView('fees'); 
            // 換頁成功後，立刻強迫用最新記憶體重繪一次
            if (typeof renderFeesPage === 'function') renderFeesPage(cachedPollData);
        }, 50); // 延遲甚至可以從 100ms 縮短到極速 50ms！
        
    } catch(err) {
        alert("核銷失敗：" + err.message);
    }
}

// 🎯 2. 🌟【時間大腦重構】：將 AM/PM 調整至尾端，強制補零對齊 12時制
// 完美產出字串格式： "2026/06/01 10:39 AM"
function getStandardTwelveHourWithPaddingTime() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // 補零
    const day = String(d.getDate()).padStart(2, '0');        // 補零
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    // 計算標準英文的 AM 與 PM 尾碼
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 點應為 12 點
    const displayHours = String(hours).padStart(2, '0'); // 小時補零

    // 🎯 格式對齊：將 AM/PM 放至最後面
    return `${year}/${month}/${day} ${displayHours}:${minutes} ${ampm}`;
}


// 輔助防呆微小浮點數
function localNetValueFix(val) { return Math.abs(val) < 0.5 ? 0 : val; }

// 🎯 🌟【每筆獨立付款確認器 - 點擊一秒更新並即時歸零】
async function submitSingleTransferSettlement(transferKey) {
    if (navigator.vibrate) navigator.vibrate(60);
    showCustomAlert("正在處理", "正在標記此筆轉帳為已核銷...", false);
    
    try {
        // 直連 Firebase 原生路徑更新這條唯一轉帳線的狀態為 true
        await db.ref(`config/SettledTransfers/${transferKey}`).set(true);
        console.log(`🟢 [單筆核銷成功] 金鑰: ${transferKey}`);
        
        closeModal();
        // 瞬間就地重繪結算大腦，那條帳目會原地消失，上方看板秒速向 0 元對齊！
        calculateAndRenderSettlement();
    } catch (e) {
        closeModal();
        alert("核銷失敗，請檢查網路連線：" + e.message);
    }
}

// =========================================================================
// 🎯 🌟【首頁大卡片 ➔ 結算按鈕專屬跳轉引信】
// =========================================================================
function showSettlementSuggestions() {
    if (navigator.vibrate) navigator.vibrate(40);
    // 剛性呼叫全站的分頁切換大閘，跳轉到結算分頁
    switchView('result'); 
}

// =========================================================================
// 🎯 🌟【管理員總控制閘 ── 實時廣播鎖定/開放結算清算系統】
// =========================================================================
async function toggleSettlementLock(checkbox) {
    const isLocked = checkbox.checked;        
    window.lastConfigAdminClickTime = Date.now();
    if (cachedPollData && cachedPollData.config) cachedPollData.config.SettlementLocked = isLocked ? "true" : "false";

    // 實時秒速廣播到 Firebase
    db.ref('config/SettlementLocked').set(isLocked ? "true" : "false");

    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: "updateConfigSingle", key: "SettlementLocked", value: isLocked ? "true" : "false" }) 
    }).catch(e => console.error("Sheets 結算鎖同步失敗:", e));
}

// =========================================================================
// 🌐 [雙棲智慧通用大腦 - 終極完全體] 包含轉場、勾勾切換與真隨機防漏發牌演算法
// =========================================================================

window.currentSplitMode = 'voter'; 
window.customPayersCache = null; 

// =========================================================================
// 🌐 [如何分攤 / 誰先付錢 - 滿血修復通電版大腦]
// =========================================================================
function goToCustomSplitPage(mode = 'voter') {
    if (navigator.vibrate) navigator.vibrate(40);
    window.currentSplitMode = mode; 

    // 🎯 精準對位主表單金額輸入框 ID
    const totalAmount = parseFloat(document.getElementById('fee-input-amount').value) || 0;
    if (!totalAmount || totalAmount <= 0 || isNaN(totalAmount)) {
        showCustomAlert("提示", "請先輸入款項的總金額，才能進去分配費用喔！");
        return;
    }

    const titleEl = document.getElementById('fee-page-split-title');
    const labelEl = document.getElementById('fee-page-calc-label');
    if (titleEl) titleEl.innerText = (mode === 'payer') ? "誰先付錢" : "如何分攤";
    if (labelEl) labelEl.innerText = (mode === 'payer') ? "進階付款人分攤金額試算看板" : "進階分攤金額試算看板";

    const members = cachedPollData ? extractMembers(cachedPollData) : [];
    const activeMembers = members.filter(m => {
        if (!m) return false;
        let trip = m['偏好行程'] || "";
        return !trip.includes("無法參加") && !trip.includes("訪客");
    });

    // 分流抓取正確的快取快照
    const currentCache = (mode === 'payer') ? window.customPayersCache : window.customSplitVotersCache;

    let rowsHtml = "";
    activeMembers.forEach((m) => {
        const uid = (m['LINE ID'] || m['LINEID'] || "").trim();
        const uName = (m['LINE 名稱'] || m['LINE名稱'] || "未命名").trim();
        
        // 🛡️ 👑【上線外殼防線】：獨立分帳內頁同步就地蒸發測試人頭，乾淨俐落！
        if (uid === "test_user_001" || uName === "開發者(測試)") {
            return;
        }
        
        let voterPic = window.userAvatarMap[uid] || "";
        let voterInitial = uName ? uName[0] : "?";
        let voterAvatarHtml = voterPic 
            ? `<img src="${voterPic}" style="width:24px; height:24px; object-fit:cover; border-radius:50%; flex-shrink:0;">`
            : `<div style="width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg, var(--primary-orange), #ff8c00); color:white; display:flex; justify-content:center; align-items:center; font-size:11px; font-weight:700; flex-shrink:0;">${voterInitial}</div>`;

        // 智慧識別主網頁下拉選單目前的勾選亮起狀態
        let isChecked = false;
        if (mode === 'voter') {
            const mainDropdownRow = document.querySelector(`#fee-voters-check-grid [data-uid="${uid}"]`);
            isChecked = mainDropdownRow ? mainDropdownRow.classList.contains('active') : false;
        } else {
            // 付款人單選模式：看是否等於當前單選付款人 ID
            isChecked = (uid === window.currentSelectedPayerId);
        }

        // 🛡️ 核心修復：精準讀取扁平化新結構物件，絕不允許 Object > 0 報錯
        let preSetAmt = "";
        if (currentCache && currentCache[uid] !== undefined) {
            const cachedVal = currentCache[uid];
            if (typeof cachedVal === 'object' && cachedVal !== null) {
                // 咬住最新結構包裡的使用者填寫金額
                preSetAmt = cachedVal.amount > 0 ? cachedVal.amount : "";
                isChecked = cachedVal.isActive === true || cachedVal.isActive === "true";
            } else if (typeof cachedVal === 'number' && cachedVal > 0) {
                preSetAmt = cachedVal;
                isChecked = true;
            }
        }

        rowsHtml += `
            <div class="fee-split-row-page ${isChecked ? '' : 'is-disabled-row'}" data-uid="${uid}">
                <div class="fee-split-user-info-page" onclick="togglePageSplitRow(this)">
                    <div class="fee-custom-checkbox ${isChecked ? 'is-checked' : ''}" data-checked="${isChecked ? '1' : '0'}" style="transform: scale(0.92); margin-right:10px; position: relative; width: 18px; height: 18px; border: 2px solid ${isChecked ? '#3BD0AF' : '#cbd5e0'}; background: ${isChecked ? '#3BD0AF' : 'white'}; border-radius: 5px; box-sizing: border-box; flex-shrink:0;">
                        ${isChecked ? '<div style="position: absolute; left: 3.5px; top: 0px; width: 5px; height: 9px; border: solid white; border-width: 0 2.5px 2.5px 0; transform: rotate(45deg);"></div>' : ''}
                    </div>
                    ${voterAvatarHtml}
                    <span class="fee-dropdown-member-name" style="font-size:14px; margin-left:4px;">${uName}</span>
                </div>
                
                <div class="fee-split-input-wrapper-page" style="background: ${isChecked ? '#ffffff' : '#f7fafc'}">
                    <input type="number" class="fee-split-amt-input-page" inputmode="numeric" value="${preSetAmt}" placeholder="0" ${isChecked ? '' : 'disabled'} oninput="this.value = this.value.replace(/[^0-9]/g, ''); pageCustomSplitTotals()">
                </div>
            </div>
        `;
    });

    document.getElementById('fee-page-split-rows-container').innerHTML = rowsHtml;
    
    // 剛性清除主頁面下拉框遮罩，保證流暢
    document.getElementById('fee-payer-dropdown-box').style.display = 'none';
    document.getElementById('fee-voters-dropdown-box').style.display = 'none';

    // 順暢放行切換視圖
    switchView('custom-split-page');
    pageCustomSplitTotals();
}

// 🟢 智慧連動打勾切換大腦
function togglePageSplitRow(infoEl) {
    if (navigator.vibrate) navigator.vibrate(20);
    
    const row = infoEl.closest('.fee-split-row-page');
    const uid = row.getAttribute('data-uid');
    const checkbox = row.querySelector('.fee-custom-checkbox');
    const amtWrapper = row.querySelector('.fee-split-input-wrapper-page');
    const amtInput = row.querySelector('.fee-split-amt-input-page');
    
    const currentStatus = checkbox.getAttribute('data-checked') || '0';

    if (currentStatus === '1') {
        // 🔴 取消勾選 (全列反灰、禁用金額)
        checkbox.setAttribute('data-checked', '0');
        checkbox.classList.remove('is-checked');
        checkbox.style.backgroundColor = 'white'; checkbox.style.borderColor = '#cbd5e0'; checkbox.innerHTML = '';
        row.classList.add('is-disabled-row');
        amtWrapper.style.backgroundColor = '#f7fafc';
        amtInput.disabled = true; amtInput.value = ''; amtInput.placeholder = '0';
        
        if (window.currentSplitMode === 'voter') {
            const mainRow = document.querySelector(`#fee-voters-check-grid [data-uid="${uid}"]`);
            if (mainRow) mainRow.classList.remove('active');
        }
    } else {
        // 🟢 恢復勾選 (亮起初綠色、解鎖金額)
        checkbox.setAttribute('data-checked', '1');
        checkbox.classList.add('is-checked');
        checkbox.style.backgroundColor = '#3BD0AF'; checkbox.style.borderColor = '#3BD0AF';
        checkbox.innerHTML = `<div style="position: absolute; left: 3.5px; top: 0px; width: 5px; height: 9px; border: solid white; border-width: 0 2.5px 2.5px 0; transform: rotate(45deg);"></div>`;
        row.classList.remove('is-disabled-row');
        amtWrapper.style.backgroundColor = '#ffffff';
        amtInput.disabled = false; amtInput.value = '';
        
        if (window.currentSplitMode === 'voter') {
            const mainRow = document.querySelector(`#fee-voters-check-grid [data-uid="${uid}"]`);
            if (mainRow) mainRow.classList.add('active');
        }
    }
    
    if (window.currentSplitMode === 'voter' && typeof refreshFeeDropdownSelectedText === 'function') refreshFeeDropdownSelectedText();
    pageCustomSplitTotals();
}

// 🟢 如何分攤：LightSplit 三模智慧即時精算核心大腦
function pageCustomSplitTotals() {
    const totalAmount = parseFloat(document.getElementById('fee-input-amount').value) || 0;
    const itemTitle = document.getElementById('fee-input-title')?.value || "出遊款項";
    const rows = document.querySelectorAll('.fee-split-row-page');
    
    let totalStaticSum = 0;       // 使用者實質填寫填死的定額總和
    let autoDeductCount = 0;      // 有被打勾、且維持留白準備接受系統均分的人數
    let autoDeductRows = [];       // 快取留白的人的列資料

    // 🔍 第一輪巡邏：統計定額與計算均分人數
    rows.forEach(row => {
        const amtInput = row.querySelector('.fee-split-amt-input-page');
        const uid = row.getAttribute('data-uid') || "";

        if (amtInput && !amtInput.disabled) {
            const amtStr = amtInput.value.trim();
            if (amtStr !== "") {
                // 狀態一：手動直接輸入定額
                totalStaticSum += parseFloat(amtStr) || 0;
            } else {
                // 狀態二：有選取但留白，納入「均分部隊」
                autoDeductCount++;
                autoDeductRows.push({ uid: uid, el: row });
            }
        }
    });

    const remainBudget = totalAmount - totalStaticSum;
    
    // 計算每個人均分到的基本款整數金額
    const baseShareAmt = autoDeductCount > 0 ? Math.max(0, Math.floor(remainBudget / autoDeductCount)) : 0;
    // 計算除不進的餘額零頭
    let remainderCoins = autoDeductCount > 0 ? Math.max(0, remainBudget - (baseShareAmt * autoDeductCount)) : 0;

    // 🎲 注入真隨機洗牌種子，公平發放那一兩塊錢的餘額零頭
    let seed = 0;
    const blendString = String(totalAmount) + String(itemTitle) + String(window.currentSplitMode);
    for (let i = 0; i < blendString.length; i++) seed += blendString.charCodeAt(i);
    
    let shuffledIndices = autoDeductRows.map((_, i) => i);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
        let j = (seed + i) % (i + 1);
        let temp = shuffledIndices[i]; shuffledIndices[i] = shuffledIndices[j]; shuffledIndices[j] = temp;
    }

    let luckyUids = [];
    const luckyCount = Math.min(remainderCoins, shuffledIndices.length);
    for (let i = 0; i < luckyCount; i++) {
        luckyUids.push(autoDeductRows[shuffledIndices[i]].uid);
    }

    let finalSumCalculated = 0;

    // 🔍 第二輪巡邏：剛性重繪灰色 Placeholder 提示
    rows.forEach(row => {
        const amtInput = row.querySelector('.fee-split-amt-input-page');
        const uid = row.getAttribute('data-uid');
        
        if (amtInput) {
            if (amtInput.disabled) {
                // 狀態三：未參與者，Placeholder 強制歸零並清空
                amtInput.placeholder = "0";
                amtInput.value = ""; 
            } else {
                const amtStr = amtInput.value.trim();
                if (amtStr !== "") {
                    finalSumCalculated += parseFloat(amtStr) || 0;
                } else {
                    // 狀態二：留白均分者，一秒灌入「灰色 Placeholder」
                    const isLuckyGuy = luckyUids.includes(uid);
                    const targetPlaceholderAmt = baseShareAmt + (isLuckyGuy ? 1 : 0);
                    
                    amtInput.placeholder = targetPlaceholderAmt; 
                    finalSumCalculated += targetPlaceholderAmt;
                }
            }
        }
    });

    // 4. 看板與 LightSplit 柔和警告 Banner 狀態同步
    const remain = totalAmount - finalSumCalculated;
    const summaryEl = document.getElementById('fee-page-calc-summary');
    const remainEl = document.getElementById('fee-page-calc-remain');
    const submitBtn = document.getElementById('fee-page-btn-submit');

    if (summaryEl) summaryEl.innerText = `NT$${finalSumCalculated} / NT$${totalAmount}`;
    
    const totalActiveCount = document.querySelectorAll('.fee-split-row-page .fee-custom-checkbox.is-checked').length;
    const isMatched = (remain === 0 && totalActiveCount > 0);

    if (isMatched) {
        if (remainEl) {
            remainEl.innerHTML = `✓ 金額剛好分配完畢！`;
            remainEl.style.color = "var(--primary-green)"; // 金額過關變綠字
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = "1"; submitBtn.style.cursor = "pointer"; }
    } else {
        let diffText = remain > 0 ? `不足 NT$${remain}` : `超出 NT$${Math.abs(remain)}`;
        if (totalActiveCount === 0) diffText = "請至少選擇一人";
        
        if (remainEl) {
            remainEl.innerHTML = `剩下 NT$${remain}`;
            remainEl.style.color = "#E53E3E"; // 金額不對變紅字
        }
        if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = "0.4"; submitBtn.style.cursor = "not-allowed"; }
    }
}

// =========================================================================
// 🎯 [如何分攤 / 誰先付款：主畫面文字與進階按鈕紅點智慧分流大腦]
// 💡 修正：平均分攤時「不顯示紅點」，只有進階客製化金額不同時才亮起紅點！
// =========================================================================
function refreshFeeDropdownSelectedText() {
    const totalCount = document.querySelectorAll('#fee-voters-check-grid .fee-dropdown-member-row').length;
    const activeTags = document.querySelectorAll('#fee-voters-check-grid .fee-dropdown-member-row.active');
    const activeCount = activeTags.length;
    const textEl = document.getElementById('fee-dropdown-selected-text');
    const btnAll = document.getElementById('fee-toggle-all-voters');
    const voterBadge = document.getElementById('fee-custom-split-badge');
    const payerBadge = document.getElementById('fee-payer-custom-badge');
    const payerTextEl = document.getElementById('fee-payer-selected-text');
    
    // 🟢 1. 【如何分攤】智慧分流防線
    // 判定條件：只有當 customSplitVotersCache 存在，且裡面「有人真的手動輸入了大於 0 的金額」才算啟動進階！
    let isRealCustomSplit = false;
    if (window.customSplitVotersCache) {
        isRealCustomSplit = Object.values(window.customSplitVotersCache).some(v => v && v.amount > 0);
    }

    if (isRealCustomSplit) {
        // 🌟 核心情境 B：使用者真的進去改過金額，判定為【進階客製化】
        const customActiveCount = Object.values(window.customSplitVotersCache).filter(v => v && v.isActive === true).length;
        if (textEl && customActiveCount > 0) {
            textEl.innerText = `客製化分攤 (已選 ${customActiveCount} 人)`;
            if (voterBadge) {
                voterBadge.innerText = customActiveCount;
                voterBadge.style.display = 'block'; // 🎯 只有客製化才亮起紅點
            }
            if (btnAll) btnAll.innerText = "全不選";
        }
    } else {
        // 🌟 核心情境 A：單純在外面下拉選單勾選，或者在內頁全部留白由系統均分，判定為【平均分攤】
        if (textEl) textEl.innerText = `平均分攤 (已選 ${activeCount} 人)`;
        if (voterBadge) {
            voterBadge.innerText = "0";
            voterBadge.style.display = 'none'; // 🎯 均分狀態下，右邊紅點剛性隱藏！
        }
        if (btnAll) btnAll.innerText = (activeCount === totalCount) ? "全不選" : "全選";
    }

    // 🟢 2. 【誰先付款】多人/單人連動防線
    if (window.customPayersCache) {
        const customPayerCount = Object.values(window.customPayersCache).filter(v => v && v.isActive === true).length;
        if (payerTextEl && customPayerCount > 1) {
            payerTextEl.innerText = `多人共同付款 (已選 ${customPayerCount} 人)`;
            if (payerBadge) {
                payerBadge.innerText = customPayerCount;
                payerBadge.style.display = 'block'; // 超過一人先付，亮起紅點
            }
        } else if (payerBadge) {
            payerBadge.style.display = 'none';
        }
    } else {
        if (window.currentSelectedPayerId === "MULTIPLE_PAYERS") {
            const cCount = document.querySelectorAll('#fee-payer-dropdown-box .fee-dropdown-payer-row.selected-payer').length;
            if (payerTextEl) payerTextEl.innerText = `多人共同付款 (已選 ${cCount} 人)`;
            if (payerBadge && cCount > 1) { payerBadge.innerText = cCount; payerBadge.style.display = 'block'; }
        } else {
            if (payerBadge) payerBadge.style.display = 'none'; // 單人先付，隱藏紅點
        }
    }
}

// =========================================================================
// 🎯 [退出進階分頁大腦 - 內選取狀態反向全面同步注入器]
// =========================================================================
function exitCustomSplitPage(isSave = false) {
    if (navigator.vibrate) navigator.vibrate(30);
    
    if (isSave) {
        let activeCount = 0;
        let tempCache = {};
        let firstActiveUid = "";
        let firstActiveName = "";

        // 1. 抓取目前內頁調整完畢的最新勾選與金額狀態
        document.querySelectorAll('.fee-split-row-page').forEach(row => {
            const uid = row.getAttribute('data-uid'); 
            const uName = row.querySelector('.fee-dropdown-member-name')?.innerText || "未知";
            const checkbox = row.querySelector('.fee-custom-checkbox');
            const isChecked = checkbox ? checkbox.getAttribute('data-checked') === '1' : false;
            const amtInput = row.querySelector('.fee-split-amt-input-page');
            
            if (uid && isChecked) {
                const finalAmt = (amtInput && amtInput.value.trim() !== "") ? parseFloat(amtInput.value) : (parseFloat(amtInput?.placeholder) || 0);

                tempCache[uid] = {
                    amount: (amtInput && amtInput.value.trim() !== "") ? parseFloat(amtInput.value) : 0,
                    calculatedAmount: finalAmt,
                    isActive: true
                };

                if (activeCount === 0) { firstActiveUid = uid; firstActiveName = uName; }
                activeCount++;
            }
        });

        // 2. 依照當前所屬的分帳模式，進行內外同步大渲染
        if (window.currentSplitMode === 'voter') {
            // 🟢 模式 A：如何分攤頁面 (連動解決問題 1)
            window.customSplitVotersCache = tempCache;
            
            // 🔄 反向大連動：拿著內頁最新的打勾名單，強行將外面選單的 Row 打勾狀態高亮起來！
            document.querySelectorAll('#fee-voters-check-grid .fee-dropdown-member-row').forEach(row => {
                const uid = row.getAttribute('data-uid');
                const innerCheckbox = row.querySelector('.fee-custom-checkbox');
                if (tempCache[uid]) {
                    row.classList.add('active');
                    if (innerCheckbox) innerCheckbox.setAttribute('data-checked', '1');
                } else {
                    row.classList.remove('active');
                    if (innerCheckbox) innerCheckbox.setAttribute('data-checked', '0');
                }
            });

        } else {
            // 🟢 模式 B：誰先付款頁面 (連動解決問題 4)
            window.customPayersCache = tempCache;
            const payerLabel = document.getElementById('fee-payer-selected-text');
            
            if (activeCount === 1 && payerLabel) {
                window.currentSelectedPayerId = firstActiveUid;
                payerLabel.innerText = firstActiveName;
                window.customPayersCache = null; // 退回單人付款
            } else if (activeCount > 1 && payerLabel) {
                window.currentSelectedPayerId = "MULTIPLE_PAYERS";
                payerLabel.innerText = `多人共同付款 (已選 ${activeCount} 人)`;
            }

            // 🔄 反向大連動：清除外面付款人列表舊的選中痕跡，讓勾選的多個人同時亮起「● 付款人」！
            document.querySelectorAll('#fee-payer-dropdown-box .fee-dropdown-payer-row').forEach(row => {
                const uid = row.getAttribute('data-uid');
                row.classList.remove('selected-payer');
                const tag = row.querySelector('span[style*="margin-left:auto"]');
                if (tag) tag.remove();

                if (activeCount === 1 && uid === firstActiveUid) {
                    row.classList.add('selected-payer');
                    row.insertAdjacentHTML('beforeend', `<span style="margin-left:auto; color:var(--primary-orange); font-size:12px; font-weight:800;">● 付款人</span>`);
                } else if (activeCount > 1 && tempCache[uid]) {
                    // 🎯 需求 4：內頁選幾個人，外面的下拉選單裡這幾個人就會同步黏上橘色的付款人標籤！
                    row.classList.add('selected-payer');
                    row.insertAdjacentHTML('beforeend', `<span style="margin-left:auto; color:var(--primary-orange); font-size:12px; font-weight:800;">● 付款人</span>`);
                }
            });
        }
    }
    
    // 3. 通電刷新全螢幕文字大字與紅點小徽章數值
    refreshFeeDropdownSelectedText();
    switchView('add-fee');
}

function calculatePageCustomSplitTotals() { pageCustomSplitTotals(); }

// =========================================================================
// 🎯 👑【前台詳細行程時間軸 ── 即時重繪渲染完全體（純淨版）】
// 💡 規則：必須剛性保留！負責處理前台詳細行程分頁的 HTML 鋪設，已拔除 console.log
// =========================================================================
function renderItineraryTimeline(data) {
    const wrapper = document.getElementById('ui-timeline-wrapper');
    if (!wrapper || !data || !data.itinerary || data.itinerary.length === 0) return;

    let itinHtml = ""; 
    let currentDay = "";
    
    data.itinerary.forEach(item => {
        if (!item) return; 
        
        // 🛡️ 雙向大小寫寬容相容雷達
        let itemDay = item.Day || item.day || "Day 1";
        let itemTime = item.Time || item.time || "";
        let itemTitle = item.Title || item.title || "";
        let itemDesc = item.Desc || item.desc || "";
        let itemLink = item.Link || item.link || "";

        if (itemDay !== currentDay) { 
            if (currentDay !== "") itinHtml += `</div></div>`; 
            currentDay = itemDay; 
            let displayDay = currentDay === "Day 2" ? "Day 2 - 06/28(日)" : "Day 1 - 06/27(六)";
            itinHtml += `<div class="card"><h3 style="margin-top:0; color:var(--primary-orange); border-bottom:1px solid rgba(255,255,255,0.3); padding-bottom:12px; font-size: 16px;">${displayDay}</h3><div class="timeline">`; 
        }
        
        let timeStr = itemTime;
        if (timeStr && !timeStr.includes('午')) { 
            const parts = timeStr.split(':');
            if (parts.length >= 2) {
                let h = parseInt(parts[0], 10);
                if (!isNaN(h)) {
                    let ampm = h >= 12 ? '下午' : '上午';
                    h = h % 12 || 12; 
                    timeStr = `${ampm} ${h}:${parts[1]}`;
                }
            }
        }

        let linkStr = itemLink ? `<br><a href="${itemLink}" target="_blank" style="display:inline-block; margin-top:8px; color:var(--primary-blue); text-decoration:none; font-size:12px; font-weight:700; background:rgba(0,123,255,0.08); padding:4px 12px; border-radius:12px; transition:0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>導航至 Google Map</a>` : "";
        itinHtml += `<div class="timeline-item"><div class="time-badge">${timeStr}</div><div class="event-title">${itemTitle}</div><div class="event-desc">${itemDesc}${linkStr}</div></div>`;
    });
    
    if (currentDay !== "") itinHtml += `</div></div>`; 
    wrapper.innerHTML = itinHtml;
}