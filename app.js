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

            // 🌟 額外加固：每次 App 從背景熱啟動解凍時，強迫 SW 向伺服器發射一次最新版號比對
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    reg.update().catch(e => console.log("靜態版號檢查暫時忙碌中"));
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

let currentUser = { name: "", id: "", pictureUrl: "", initial: "?", isVoted: false, votedOption: null }; 
let lateVoteSelection = 0; let cachedPollData = null; let countdownTargetDate = 0;
let allMessages = []; let currentMsgPage = 1; const MSG_PER_PAGE = 10;
let adminNoticesArray = []; 
let userChecklistState = {}; let checklistData = []; let openCategories = {}; let isChecklistModified = false; 
let initialDataPromise = null; 
let isGuestViewEnabled = false;

// 宣告一個全域變數來存雲端的已讀 ID
let cloudLastReadId = null;

// 在 processLoadedData (監聽 Firebase 的地方) 加上這段監聽：
function listenToReadReceipts() {
    if (!currentUser.id) return;
    db.ref('readReceipts/' + currentUser.id).on('value', (snapshot) => {
        cloudLastReadId = snapshot.val();
        updateBadgeCount(); // 抓到雲端已讀紀錄後，重新計算紅點
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

function updateBadgeCount() {
    // 防呆：如果資料庫完全沒留言，直接隱藏紅點
    if (!allMessages || allMessages.length === 0) {
        const badge = document.getElementById('board-badge');
        if (badge) badge.style.display = 'none';
        if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
        return;
    }
    
    const lastReadId = cloudLastReadId; 
    let unreadCount = 0;
    
    if (!lastReadId) {
        // 🌟 依據新規則：完全沒紀錄的人，在點開或開開關前，什麼都不顯示
        unreadCount = 0;
    } else {
        let found = false;
        
        // allMessages 是反轉過的陣列，最新留言在最前面
        for (let i = 0; i < allMessages.length; i++) {
            if (allMessages[i].MsgID === lastReadId) {
                found = true; // 順利找到已讀基準點
                break;
            }
            unreadCount++; // 這代表此留言比已讀 ID 還要新，列入未讀計算
        }
        
        // 🌟【關鍵防呆】如果跑完現存留言，發現原本記錄的那則已讀 ID 被從後台刪除了（找不到對應編號）
        // 依據你的需求：直接歸零，什麼都不顯示！直到他下一次讀取到新 ID 再重新計算
        if (!found) {
            unreadCount = 0;
        }
    }

    // 1. 更新 App 內留言板旁邊的紅點
    const badge = document.getElementById('board-badge');
    if (badge) {
        if (unreadCount > 0 && !document.getElementById('view-board').classList.contains('active')) {
            badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // 2. 更新手機桌面的 App Icon 紅點數字
    if ('setAppBadge' in navigator) {
        if (unreadCount > 0) {
            navigator.setAppBadge(unreadCount).catch(error => console.error("桌面紅點設定失敗:", error));
        } else {
            navigator.clearAppBadge().catch(error => console.error("桌面紅點清除失敗:", error));
        }
    }
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
                            
                            db.ref('readReceipts/' + currentUser.id).once('value', (snap) => {
                                if (!snap.exists() && allMessages && allMessages.length > 0) {
                                    db.ref('readReceipts/' + currentUser.id).set(allMessages[0].MsgID);
                                }
                            });
                            
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

function clearBadge() {
    if (allMessages && allMessages.length > 0) {
        let msg = allMessages[0];
        let readMarker = msg.MsgID || "";
        
        if (currentUser && currentUser.id) {
            db.ref('readReceipts/' + currentUser.id).set(readMarker);
        }
    }
    
    // 1. 清除 App 內的紅點
    const badge = document.getElementById('board-badge');
    if (badge) badge.style.display = 'none';

    // 👇 2. 升級：清除手機桌面的 App Icon 紅點 👇
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(error => console.error("桌面紅點清除失敗:", error));
    }
}


function getLikesIgStyle(likesArray) {
    if (!likesArray || likesArray.length === 0) return "";
    
    let recentLikes = likesArray.slice(-3).reverse();
    let avatarsHtml = `<div class="like-avatar-stack">`;
    
    recentLikes.forEach((likeId, idx) => {
        let name = window.userNameMap[likeId] || likeId;
        let picUrl = window.userAvatarMap[likeId] || window.userAvatarMap[name];
        let zIndex = 3 - idx; 
        let fbText = name ? name[0] : "?";
        let avContent = picUrl 
            ? `<img src="${picUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
            : `<span style="font-size:9px; font-weight:800; color:white;">${fbText}</span>`;
        
        avatarsHtml += `<div class="like-avatar-tiny" style="background:linear-gradient(135deg, var(--primary-orange), #ff8c00); z-index:${zIndex};">${avContent}</div>`;
    });
    avatarsHtml += `</div>`;
    
    let lastNameOrId = likesArray[likesArray.length - 1];
    let lastDisplayName = window.userNameMap[lastNameOrId] || lastNameOrId;
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

// 2. 處理總開關切換動作
function handlePushMasterToggle(checkbox) {
    const isTurningOn = checkbox.checked;
    
    if (isTurningOn) {
        if (Notification.permission === 'default') {
            checkbox.checked = false; // 先把開關關回去，等他確認才打開
            
            document.getElementById('modal-title').innerText = "開啟推播通知？";
            document.getElementById('modal-desc').innerText = "開啟通知，才不會錯過重要訊息喔！";
            document.getElementById('modal-desc').style.display = 'block';
            document.getElementById('modal-btn-group').style.display = 'flex';
            
            const btnConfirm = document.getElementById('modal-btn-confirm');
            btnConfirm.innerText = "開啟";
            btnConfirm.onclick = function() {
                closeModal();
                requestPushPermission(true); 
            };
            document.getElementById('custom-modal').style.display = 'flex';
            
        } else if (Notification.permission === 'granted') {
            requestPushPermission(true);
        } else {
            checkbox.checked = false;
            showCustomAlert("無法開啟", "您已封鎖通知，請前往系統設定解除封鎖。");
        }
    } else {
        // 用戶想關閉通知：刪除 Token 並隱藏子選單
        if (currentUser && currentUser.id) {
            const myLocalToken = localStorage.getItem('myDeviceFCMToken');
            
            // 先偷看一下雲端的 Token 是不是我的
            db.ref('pushTokens/' + currentUser.id).once('value', snap => {
                if (snap.val() === myLocalToken) {
                    // 💡 只有當雲端 Token 是我這台機器的，我才有資格刪除它！
                    db.ref('pushTokens/' + currentUser.id).remove()
                    .then(() => {
                        console.log("🗑️ 已關閉通知，Token 刪除成功");
                    }).catch(err => console.error("刪除 Token 失敗", err));
                }
            });
            
            document.getElementById('push-sub-options').style.display = 'none';
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

function initMentionLogic() {
    const textarea = document.getElementById('new-msg-text');
    if (!textarea) return;

    // 1. 監聽打字事件
    textarea.addEventListener('input', (e) => {
        const val = textarea.value;
        const cursorPos = textarea.selectionStart;

        // 往前找，看看游標前面有沒有 @
        const textBeforeCursor = val.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            // 確保 @ 是在最前面，或者是接在空白/換行後面（避免 Email 格式觸發）
            const isStartOrSpaced = lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]);
            
            if (isStartOrSpaced) {
                mentionActive = true;
                mentionStartIndex = lastAtIndex;
                mentionFilter = textBeforeCursor.substring(lastAtIndex + 1); // 抓出 @ 後面的字
                updateMentionMenu();
                return;
            }
        }
        closeMentionMenu();
    });

    // 2. 監聽鍵盤方向鍵與 Enter 事件
    textarea.addEventListener('keydown', (e) => {
        if (!mentionActive) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault(); // 阻止游標亂跑
            mentionSelectedIndex = (mentionSelectedIndex + 1) % mentionList.length;
            renderMentionMenu();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            mentionSelectedIndex = (mentionSelectedIndex - 1 + mentionList.length) % mentionList.length;
            renderMentionMenu();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            selectMention(mentionList[mentionSelectedIndex]);
        } else if (e.key === 'Escape') {
            closeMentionMenu();
        }
    });

    // 3. 點擊旁邊空白處時，關閉選單
    document.addEventListener('click', (e) => {
        if (mentionActive && e.target.id !== 'new-msg-text' && !e.target.closest('.mention-menu')) {
            closeMentionMenu();
        }
    });
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

        await processLoadedData();
        return;
    } 
                
    const checkLiff = setInterval(async () => {
        if (typeof liff !== 'undefined') {
            clearInterval(checkLiff);
            try {
                await liff.init({ liffId: LIFF_ID });
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
                    
                    await processLoadedData();
                } else { liff.login(); }
            } catch (err) { 
                console.error('LIFF 失敗', err);
                document.getElementById('loading').innerHTML = '<h2 style="color:red;">登入失敗</h2><p>請確認 LIFF ID 設定。</p>';
            }
        }
    }, 100);
};

// 🌟 1. 在 app.js 的全域變數區（例如 cloudLastReadId 下方）補上這兩個旗標
let hasLoadedFromFirebase = false;
let isProfileChecked = false;

async function processLoadedData() {
    listenToReadReceipts();
    initMessageListeners(); // 啟動三劍客監聽

    // 🌟【新增】啟動 2 秒超時弱網防護定時器
    setTimeout(() => {
        if (!hasLoadedFromFirebase && !isProfileChecked) {
            console.log("⏳ 網路連線較慢，正在嘗試載入本地快取資料...");
            const cachedRaw = localStorage.getItem('trip_cache_data');
            if (cachedRaw) {
                try {
                    const cachedData = JSON.parse(cachedRaw);
                    
                    // 顯示「網路連線較慢」提示橫幅
                    const banner = document.getElementById('cache-warning-banner');
                    if (banner) banner.style.display = 'block';
                    
                    // 用快取先渲染畫面並解鎖進首頁
                    renderDynamicUI(cachedData);
                    
                    // 執行身分驗證邏輯
                    checkUserMemberStatus(cachedData);
                    // 讓快取路徑渲染完後安全解鎖
                    unlockMainApp();
                } catch(e) { console.error("快取解析失敗:", e); }
            }
        }
    }, 2000);

    // 👇 更新：同時監聽 Token (總開關) 與 Prefs (子開關)
    if (currentUser && currentUser.id) {
        // 監聽總開關
        db.ref('pushTokens/' + currentUser.id).on('value', snap => {
            const dbToken = snap.val();
            // 抓取這台手機自己保管的 Token
            const myLocalToken = localStorage.getItem('myDeviceFCMToken');
            
            // 💡 關鍵防護：雲端有 Token，而且必須「等於我的 Token」才算數！
            const isMyTokenActive = dbToken && (dbToken === myLocalToken);
            
            const masterToggle = document.getElementById('user-push-master-toggle');
            const subOptions = document.getElementById('push-sub-options');
            
            if (masterToggle) {
                const isOn = isMyTokenActive && Notification.permission === 'granted';
                masterToggle.checked = isOn;
                if (subOptions) subOptions.style.display = isOn ? 'block' : 'none';
            }
        });
        
        // 監聽子偏好設定
        db.ref('pushPrefs/' + currentUser.id).on('value', snap => {
            const prefs = snap.val() || { all: true, mentions: true, notices: true }; // 預設 notices 為 true
            const allToggle = document.getElementById('push-pref-all'); 
            const mentionsToggle = document.getElementById('push-pref-mentions');
            const noticesToggle = document.getElementById('push-pref-notices'); // 🌟 新增
            if (allToggle) allToggle.checked = prefs.all; 
            if (mentionsToggle) mentionsToggle.checked = prefs.mentions;
            if (noticesToggle) noticesToggle.checked = prefs.notices !== false; // 🌟 防呆
        });
    }

    

    // 3. 訂閱 Firebase 即時資料 (只要後台有變，這裡瞬間觸發！)
    db.ref('/').on('value', (snapshot) => {
        hasLoadedFromFirebase = true; // 🌟 標記雲端資料已順利接通
        let data = snapshot.val() || { config: {}, messages: [], votes: [] };
        
        // 🌟【精簡修正】：移除多餘重複宣告的 cachedPollData 與 Map 欄位，直接覆蓋最新手機快取
        localStorage.setItem('trip_cache_data', JSON.stringify(data));
        
        // 雲端接通了，立刻隱藏連線慢的提示橫幅
        const banner = document.getElementById('cache-warning-banner');
        if (banner) banner.style.display = 'none';
        
        cachedPollData = data;
        window.userAvatarMap = {};
        window.userNameMap = {};
        
        if (data.messages) {
            data.messages.forEach(m => {
                const id = m.LineID || m.UserId;
                if (id) window.userNameMap[id] = m.Name;
                if (id && m.AvatarUrl) window.userAvatarMap[id] = m.AvatarUrl;
                if (m.Name && m.AvatarUrl) window.userAvatarMap[m.Name] = m.AvatarUrl; 
            });
        }
        
        if (data.members) {
            data.members.forEach(v => {
                const id = v['LINE ID'] || v['LINEID']; 
                const name = v['LINE 名稱'] || v['LINE名稱'];
                const pic = v['AvatarUrl'] || v['pictureUrl'] || v['照片'];
                if (id) {
                    if (name) window.userNameMap[id] = name;
                    if (pic) window.userAvatarMap[id] = pic; 
                }
                if (name && pic) window.userAvatarMap[name] = pic;
            });
        }
        if (currentUser.id && currentUser.name) window.userNameMap[currentUser.id] = currentUser.name;
        if (currentUser.id && currentUser.pictureUrl) window.userAvatarMap[currentUser.id] = currentUser.pictureUrl;

        // 🌟 修正：身分驗證與解鎖改用獨立旗標控制，防止快取與雲端時間差漏掉驗證
        checkUserMemberStatus(data);

        // 更新畫面
        if (activeConfigUpdates === 0) renderDynamicUI(data);

        // 完成初次載入
        if (isInitialLoad) {
            isInitialLoad = false;
            document.getElementById('loading').style.display = 'none';
            const welcomeNameEl = document.getElementById('welcome-name');
            welcomeNameEl.innerHTML = `<span>${currentUser.name}</span>`;
            
            if (currentUser.votedOption === 3) document.getElementById('visitor-badge').style.display = 'inline-flex';
            else document.getElementById('visitor-badge').style.display = 'none';

            document.getElementById('lock-screen').style.display = 'none';
            unlockMainApp();
        }
    });
}

function checkUserMemberStatus(data) {
    if (isProfileChecked) return; // 確保只執行一次
    isProfileChecked = true;

    let vArray = data.members || [];
    let userIdx = vArray.findIndex(row => row['LINE ID'] === currentUser.id || row['LINEID'] === currentUser.id);
    if (userIdx > -1) {
        let userVote = vArray[userIdx]; currentUser.isVoted = true; const s = userVote['偏好行程'];
        if (s && s.includes("方案一")) currentUser.votedOption = 1;
        else if (s && s.includes("方案二")) currentUser.votedOption = 2;
        else currentUser.votedOption = 3;
        try { if(userVote['Checklist']) { userChecklistState = JSON.parse(userVote['Checklist']); } } catch(e) {}
    } else {
        currentUser.isVoted = true; currentUser.votedOption = 3; 
        vArray.push({ "LINEID": currentUser.id, "LINE名稱": currentUser.name, "AvatarUrl": currentUser.pictureUrl || "", "偏好行程": "無法參加(訪客查看)" });
        db.ref('members').set(vArray);
        
        // 🌟【重新接回你的設計】：全新訪客登入的瞬間，立刻同步將資料寫回 Google 試算表！
        fetch(GAS_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ 
                action: "vote", 
                userName: currentUser.name, 
                userId: currentUser.id, 
                pictureUrl: currentUser.pictureUrl || "", 
                choice_trip: "無法參加(訪客查看)", 
                time_opt1: "", 
                time_opt2: "" 
            }) 
        }).catch(e => console.error("GAS 新訪客寫回失敗:", e));
    }
    
    // 關閉轉圈圈並解鎖
    document.getElementById('loading').style.display = 'none';
    document.getElementById('lock-screen').style.display = 'none'; 
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

function showCustomPrompt(t, isPwd, cb) { 
    document.getElementById('modal-title').innerText=t; 
    document.getElementById('modal-desc').style.display='none'; 
    document.getElementById('modal-spinner').style.display='none'; 
    document.getElementById('modal-input-wrapper').style.display='block'; 
    const inp = document.getElementById('modal-input');
    inp.type = isPwd ? 'password' : 'text'; 
    inp.placeholder = isPwd ? "請輸入密碼" : "請輸入內容"; 
    document.getElementById('pwd-toggle').style.display = isPwd ? 'block' : 'none';
    document.getElementById('pwd-toggle').innerHTML = svgEye;
    document.getElementById('modal-textarea').style.display='none'; 
    document.getElementById('modal-btn-group').style.display='flex'; 
    document.getElementById('modal-btn-cancel').style.display='block'; 
    document.getElementById('modal-btn-confirm').style.display='block';
    document.getElementById('modal-btn-confirm').innerText="送出"; 
    document.body.classList.add('no-scroll');
    document.getElementById('modal-btn-confirm').onclick=function(){ let val = inp.value; closeModal(); cb(val); }; 
    document.getElementById('custom-modal').style.display='flex'; 
    setTimeout(()=>inp.focus(),100); 
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
    // 🎯 重點：在網址最後面加上 &openExternalBrowser=1
    const shareUrl = window.location.href.split('?')[0] + '?notice=' + id + '&openExternalBrowser=1';
    
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
    if (!data.config) return;
    const cfg = data.config;

    if(cfg.TripTitle) { document.getElementById('ui-trip-title').innerText = cfg.TripTitle; document.getElementById('vote-ui-title').innerText = cfg.TripTitle; }
    if(cfg.TripDate) { document.getElementById('ui-trip-date').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> <span>${cfg.TripDate}</span>`; }
    if(cfg.InfoAcc) document.getElementById('ui-info-acc').innerText = cfg.InfoAcc;
    if(cfg.InfoPpl) document.getElementById('ui-info-ppl').innerText = cfg.InfoPpl;
    if(cfg.InfoPrice) document.getElementById('ui-info-price').innerText = cfg.InfoPrice;
    if(cfg.DepartureDate) countdownTargetDate = new Date(cfg.DepartureDate).getTime();
    initDaysCountdown();

    // 🌟 處理補報名系統「確認提交」按鈕的鎖定狀態
    const voteBtn = document.getElementById('btn-submit-vote');
    const adminLockToggle = document.getElementById('admin-lock-toggle');

    // 判斷是否已經報名 (方案一或方案二代表已報名，方案三代表訪客/無法參加)
    const isAlreadyRegistered = currentUser.isVoted && (currentUser.votedOption === 1 || currentUser.votedOption === 2);

    if (String(cfg.VotingLocked).toLowerCase() === 'true') {
        // 狀況 1：系統全域鎖定
        if (voteBtn) { voteBtn.disabled = true; voteBtn.innerText = "系統已鎖定，停止報名"; }
        if (adminLockToggle) adminLockToggle.checked = true;
    } else if (isAlreadyRegistered) {
        // 狀況 2：系統未鎖定，但該使用者已經報名過
        if (voteBtn) { voteBtn.disabled = true; voteBtn.innerText = "您已報名"; }
        if (adminLockToggle) adminLockToggle.checked = false;
    } else {
        // 狀況 3：系統未鎖定，且使用者為訪客/無法參加狀態，可以補報名
        if (voteBtn) { voteBtn.disabled = false; voteBtn.innerText = "確認提交"; }
        if (adminLockToggle) adminLockToggle.checked = false;
    }

    const guestToggle = document.getElementById('admin-guest-toggle');
    if (guestToggle) {
        let isGuestOn = getConfigBool(cfg, 'GuestViewEnabled', false);
        guestToggle.checked = isGuestOn;
        const subOptionsDiv = document.getElementById('admin-guest-sub-options');
        if (subOptionsDiv) subOptionsDiv.style.display = isGuestOn ? 'block' : 'none';
    }
    
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

    applyVisitorPermissions(cfg);
    renderNoticesWithMagic(cfg); 
    
    setTimeout(() => {
        if (data.transport && data.transport.length > 0) {
            let carHtml = "";
            data.transport.forEach(car => {
                if (!car) return; // 🌟 安全防護：跳過 Firebase 陣列空位
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
                if (!item) return; // 🌟 安全防護：跳過 Firebase 陣列空位
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
                if (!item) return; // 🌟【關鍵安全鎖】：強勢攔截並跳過 Firebase 陣列 null 項目，絕不允許其發生中斷！
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
                if (!cat) return; // 🌟 安全防護：跳過空物件
                if (openCategories[cat.id] === undefined) openCategories[cat.id] = true; 
            });
        }
        
        renderChecklist(); // 💡 成功保護：前面就算有空項目也不會卡死，這裡絕對可以順利執行繪製清單！
    }, 50);

    renderPeoplePage(data);
    renderFeesPage(data);
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
                id: 'Notice' + i, // 🌟【關鍵修正】：從 Math.random() 改為固定字串 'Notice1'、'Notice2'，冷啟動網址對齊絕對成功！
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
    return str
        .replace(/\[前往民宿按鈕\]/g, `<span onclick="switchView('accommodation'); switchAccTab('info'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> 民宿資訊</span>`)
        .replace(/\[前往分房按鈕\]/g, `<span onclick="switchView('accommodation'); switchAccTab('rooms'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg> 分房名單</span>`)
        .replace(/\[前往行程按鈕\]/g, `<span onclick="switchView('itinerary'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 詳細行程</span>`)
        .replace(/\[前往物品按鈕\]/g, `<span onclick="switchView('prep'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v10H4z"></path><path d="M8 10V6a4 4 0 0 1 8 0v4"></path></svg> 攜帶物品</span>`)
        .replace(/\[前往留言板按鈕\]/g, `<span onclick="switchView('board'); event.stopPropagation();" class="magic-link-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 留言板</span>`);
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
    const topNav = document.querySelector('.top-nav');
    if (topNav) topNav.classList.remove('nav-hidden');

    let isMasterLocked = false;
    let isSectionLocked = false;

    if (cachedPollData && cachedPollData.config) {
        const cfg = cachedPollData.config;
        
        // 1. 訪客分區權限檢查 (僅限訪客身分)
        if (currentUser.votedOption === 3) {
            if (t !== 'admin' && t !== 'admin-notices' && t !== 'result' && t !== 'archive' && t !== 'voting') {
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
        document.getElementById('app').style.display = 'none';
        document.getElementById('bottom-nav-block').style.display = 'none';
        document.getElementById('guest-lock-screen').style.display = 'block';
        if (typeof refreshMessagesOnly === "function") refreshMessagesOnly(true); 
        return; 
    } else {
        document.getElementById('guest-lock-screen').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        if (currentUser.isVoted) {
            if (currentUser.votedOption !== 3 || (currentUser.votedOption === 3 && isGuestViewEnabled)) {
                document.getElementById('bottom-nav-block').style.display = 'flex';
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
        if (indicator) { indicator.style.width = activeTab.offsetWidth + 'px'; indicator.style.left = activeTab.offsetLeft + 'px'; }
    }

    if (typeof refreshMessagesOnly === "function") refreshMessagesOnly(true); 
    if (t === 'result') fetchResults();
    if (t === 'board') clearBadge();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🌟 完整替換 app.js 中的 unlockMainApp 函數
function unlockMainApp() {
    if (currentUser.votedOption === 3 && !isGuestViewEnabled) {
        document.getElementById('app').style.display = 'none';
        document.getElementById('bottom-nav-block').style.display = 'none';
        document.getElementById('bottom-blur-mask').style.display = 'none';
        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('guest-lock-screen').style.display = 'block';
        document.getElementById('bottom-nav-block').style.display = 'flex';
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
                    console.log("❄️ 發現開機帶有特定留言 ID，立刻啟動智慧分頁雷達...");
                    handleMessageDeepLink(targetMsgId); // 🌟【關鍵修正】：直接交給雷達去自動翻頁搜尋，不論第幾頁都挖得出來！
                } else {
                    switchView('board');
                }
            } else {
                switchView('overview');
            }

            // 🌟成功解鎖導流後，清除備份快取，防止重新整理時重複觸發
            sessionStorage.removeItem('pending_notice_id');
            sessionStorage.removeItem('pending_view');
            sessionStorage.removeItem('pending_msg_id');
            urlParamsCache = { view: null, msgId: null, noticeId: null };

            // 🌟成功定位後，在全域標記此公告 ID 已經在冷啟動處理完畢，防止熱啟動重複觸發
            if (noticeId) window.lastProcessedNoticeId = noticeId;

            // 清除網址列參數保持畫面乾淨
            const params = new URLSearchParams(window.location.search);
            window.history.replaceState({}, document.title, window.location.pathname + (params.get('openExternalBrowser') ? '?openExternalBrowser=1' : ''));

        }, 50);
    } else { 
        switchView('voting'); 
    }
}

function initDaysCountdown() {
    const targetDate = new Date(2026, 5, 27, 0, 0, 0); 
    
    const diffTime = targetDate.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 確保不會出現負數 (如果日期過了就顯示 0)
    const displayDays = Math.max(0, diffDays);
    
    document.getElementById('days-countdown').innerText = isNaN(displayDays) ? "--" : displayDays;
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

function openAdminNotices() {
    let html = "";
    adminNoticesArray.forEach((n) => { html += generateNoticeInputHTML(n); });
    document.getElementById('admin-notice-list-container').innerHTML = html;
    switchView('admin-notices'); 
    initAdminDragAndDrop();
}

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

function addAdminNoticeField() { 
    const container = document.getElementById('admin-notice-list-container'); 
    container.insertAdjacentHTML('beforeend', generateNoticeInputHTML()); 
}

function removeAdminNoticeField(btn) { btn.closest('.admin-notice-block').remove(); }

function initAdminDragAndDrop() {
    const container = document.getElementById('admin-notice-list-container');
    if (window.Sortable) { new Sortable(container, { handle: '.drag-handle', animation: 150, ghostClass: 'dragging' }); }
}

async function saveAdminNotices() {
    let tempNotices = [];
    let hasError = false; // 防呆旗標
    
    // 每次儲存前，先清除之前可能殘留的紅框警告樣式
    document.querySelectorAll('.admin-n-title').forEach(el => {
        el.style.border = "1px solid rgba(0,0,0,0.15)";
        el.style.boxShadow = "none";
    });

    // 檢查每一個公告區塊
    const blocks = document.querySelectorAll('.admin-notice-block');
    for (let block of blocks) {
        const titleInput = block.querySelector('.admin-n-title');
        const title = titleInput.value.trim();
        
        // 防呆：如果標題是空的
        if (!title) {
            hasError = true;
            // 讓輸入框變成紅色警告狀態
            titleInput.style.border = "2px solid #ff4d4f";
            titleInput.style.boxShadow = "0 0 8px rgba(255, 77, 79, 0.25)";
            
            // 平滑滾動到出錯的那個公告區塊，並把畫面置中
            block.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 滾動完後，自動將游標對焦進去讓使用者立刻打字 (延遲一下等捲動完)
            setTimeout(() => titleInput.focus(), 600);
            
            break; // 只要找到一個沒填的，就立刻中斷檢查迴圈
        }

        // 若檢查通過，把資料裝起來
        const id = block.getAttribute('data-id'); 
        const type = block.querySelector('.admin-n-type').value;
        let rawDateInput = block.querySelector('.admin-n-time').value.replace(/\[PIN\]/g, '').replace(/\[NEW\]/g, '').trim();
        const timeRaw = rawDateInput; 
        const time = type + timeRaw; 
        const desc = block.querySelector('.admin-n-desc').value.trim();
        const imgUrl = block.querySelector('.admin-n-img').value.trim();
        const isHidden = !block.querySelector('.admin-n-visible').checked; 
        
        tempNotices.push({ id, title, desc, imgUrl, timeRaw, time, type, isHidden });
    }
    if (hasError) return; 
    // ================== 防呆通過，開始正式寫入 ==================
    const btn = document.getElementById('btn-save-notices');
    btn.innerText = "資料儲存中..."; btn.disabled = true;
    
    let pinnedNotices = tempNotices.filter(n => n.type === '[PIN]');
    let normalNotices = tempNotices.filter(n => n.type !== '[PIN]');
    pinnedNotices.sort((a, b) => { return new Date(b.timeRaw.replace(/-/g, '/')).getTime() - new Date(a.timeRaw.replace(/-/g, '/')).getTime(); });
    let newNotices = [...pinnedNotices, ...normalNotices];
    
    showCustomAlert("資料儲存中", "資料正在寫入資料庫...", false);
    
    db.ref('config/NoticesData').set(JSON.stringify(newNotices)).then(() => {
        closeModal();
        switchView('overview');
        btn.innerText = "儲存所有變更"; btn.disabled = false;
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
function generateEventRowHTML(item = {Time:'', Title:'', Desc:'', Link:''}) {
            let time24 = convertTo24Hour(item.Time);
            return `
                <div class="admin-itin-item-row">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span class="itin-drag-handle">☰</span>
                            <input type="time" class="itin-edit-time" value="${time24}">
                        </div>
                        <button class="admin-delete-btn" onclick="this.closest('.admin-itin-item-row').remove()">刪除</button>
                    </div>
                    <input type="text" class="itin-edit-title" placeholder="行程名稱 (必填)" value="${item.Title || ''}">
                    <textarea class="itin-edit-desc" placeholder="詳細內容...">${item.Desc || ''}</textarea>
                    <input type="text" class="itin-edit-link" placeholder="Google Maps 連結 (選填)" value="${item.Link || ''}">
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
    let data = cachedPollData.itinerary || [];
    
    let grouped = { "Day 1": [], "Day 2": [] };
    
    data.forEach(item => {
        let d = item.Day || "";
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


async function saveAdminItinerary() {
    // 1. 每次儲存前，先清除之前可能殘留的紅框警告樣式
    document.querySelectorAll('.itin-edit-title').forEach(el => {
        el.style.border = "1px solid rgba(0,0,0,0.15)";
        el.style.boxShadow = "none";
    });

    const dayBlocks = document.querySelectorAll('.admin-day-block');
    let newItinData = [];
    let hasError = false; // 防呆旗標

    // 2. 檢查每一個行程區塊 (改用 for...of 才能用 break 中斷)
    for (let block of dayBlocks) {
        const dayKey = block.getAttribute('data-day'); 
        if (!dayKey) continue;

        const rows = block.querySelectorAll('.admin-itin-item-row');
        for (let row of rows) {
            const timeEl = row.querySelector('.itin-edit-time');
            const titleEl = row.querySelector('.itin-edit-title');
            const descEl = row.querySelector('.itin-edit-desc');
            const linkEl = row.querySelector('.itin-edit-link');
            
            const Time = timeEl ? timeEl.value.trim() : "08:00";
            const Title = titleEl ? titleEl.value.trim() : "";
            const Desc = descEl ? descEl.value.trim() : "";
            const Link = linkEl ? linkEl.value.trim() : "";

            // 🚨 防呆：如果標題是空的
            if (!Title) {
                hasError = true;
                // 讓輸入框變成紅色警告狀態
                titleEl.style.border = "2px solid #ff4d4f";
                titleEl.style.boxShadow = "0 0 8px rgba(255, 77, 79, 0.25)";
                
                // 平滑滾動到出錯的行程區塊，並把畫面置中
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 滾動完後，自動將游標對焦進去讓使用者立刻打字
                setTimeout(() => titleEl.focus(), 600);
                
                break; // 只要找到一個沒填的，就立刻中斷內層迴圈
            }

            newItinData.push({ Day: dayKey, Time, Title, Desc, Link });
        }
        
        // 如果內層發生錯誤，外層迴圈也必須跟著中斷
        if (hasError) break; 
    }

    // ================== 防呆攔截 ==================
    // 如果有錯，就直接停止，絕對不寫入資料庫
    if (hasError) return; 

    // ================== 防呆通過，開始正式寫入 ==================
    try {
        const btn = document.getElementById('btn-save-itinerary');
        if (btn) btn.disabled = true;
        showCustomAlert("正在儲存行程", "更新即時資料庫中...", false);

        if (newItinData.length === 0) newItinData = "";

        // 寫入 Firebase
        await db.ref('itinerary').set(newItinData);
        
        closeModal(); // 關閉讀取轉圈圈
        showCustomAlert("儲存成功", "詳細行程已更新！");
        
        setTimeout(() => { 
            closeModal();
            switchView('itinerary'); 
        }, 1000);

    } catch (e) {
        console.error("行程儲存錯誤:", e);
        closeModal();
        showCustomAlert("錯誤", "儲存失敗：" + e.message);
    } finally {
        const btn = document.getElementById('btn-save-itinerary');
        if (btn) btn.disabled = false;
    }
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
            itemsHtml += `
                <div class="prep-item ${isChecked ? 'checked' : ''}" onclick="toggleChecklistItem('${item.id}')">
                    <div class="prep-checkbox"></div>
                    <div class="prep-item-text">
                        <div class="prep-item-label">${item.label}</div>
                        ${item.desc ? `<div class="prep-item-desc">${item.desc}</div>` : ''}
                    </div>
                </div>
            `;
        });
        const isOpen = openCategories[cat.id] ? 'open' : ''; 
        html += `
            <div class="prep-cat-card">
                <div class="prep-cat-header" onclick="togglePrepCategory('${cat.id}')">
                    <div class="prep-cat-icon">${cat.icon}</div>
                    <div class="prep-cat-title-area">
                        <div class="prep-cat-title">${cat.title}</div>
                        <div class="prep-cat-subtitle" style="color:var(--primary-green)">${catChecked}/${catTotal} 項已準備</div>
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
    document.getElementById('prep-progress-text').innerText = `${totalChecked}/${totalItems} (${pct}%)`;
    document.getElementById('prep-progress-bar').style.width = `${pct}%`;
}

function togglePrepCategory(catId) {
    openCategories[catId] = !openCategories[catId];
    renderChecklist();
}

function toggleChecklistItem(itemId) {
    userChecklistState[itemId] = !userChecklistState[itemId];
    isChecklistModified = true; 
    renderChecklist(); 
    saveChecklistBackground();
}

async function saveChecklistBackground() {
    if (!isChecklistModified) return; 
    isChecklistModified = false; 
    
    let currentMembers = cachedPollData.members || [];
    let userIdx = currentMembers.findIndex(v => v['LINE ID'] === currentUser.id || v['LINEID'] === currentUser.id);
    
    if (userIdx > -1) {
        currentMembers[userIdx].Checklist = JSON.stringify(userChecklistState);
        
        db.ref('members').set(currentMembers).catch(e => isChecklistModified = true);

        fetch(GAS_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "updateChecklist", userId: currentUser.id, data: JSON.stringify(userChecklistState) }) 
        }).catch(e => console.error("Sheets 同步失敗:", e));
    }
}

async function toggleVotingLock(checkbox) {
    const isLocked = checkbox.checked;            
    
    // 1. Firebase 極速寫入
    db.ref('config/VotingLocked').set(isLocked ? "true" : "false");

    // 2. Google Sheets 背景同步 + UI 鎖定防打架
    activeConfigUpdates++;
    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: "updateConfigSingle", key: "VotingLocked", value: isLocked ? "true" : "false" }) 
    })
    .catch(e => console.error(e))
    .finally(() => { setTimeout(() => { activeConfigUpdates = Math.max(0, activeConfigUpdates - 1); }, 1500); });
}

async function toggleGuestViewLock(checkbox, key) {
    const isEnabled = checkbox.checked;
    if (key === 'GuestViewEnabled') {
        isGuestViewEnabled = isEnabled; 
        const subOptionsDiv = document.getElementById('admin-guest-sub-options');
        if (subOptionsDiv) {
            // 🌟 改為控制 display 來徹底隱藏
            subOptionsDiv.style.display = isEnabled ? 'block' : 'none';
        }
    }
    // 1. Firebase 極速寫入
    db.ref('config/' + key).set(isEnabled ? "true" : "false");
    
    // 2. Google Sheets 背景同步 + UI 鎖定防打架
    activeConfigUpdates++;
    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: "updateConfigSingle", key: key, value: isEnabled ? "true" : "false" }) 
    })
    .catch(e => console.error(e))
    .finally(() => { setTimeout(() => { activeConfigUpdates = Math.max(0, activeConfigUpdates - 1); }, 1500); });
}

function selectVote(o) { 
    lateVoteSelection = o; 
    document.querySelectorAll('.trip-card-vote').forEach(el => { el.classList.remove('selected'); el.querySelector('.vote-check').style.display = 'none'; }); 
    const selectedOpt = document.getElementById('vote-opt-' + o);
    selectedOpt.classList.add('selected'); selectedOpt.querySelector('.vote-check').style.display = 'block'; 
}

async function submitLateVote() {
    if (!lateVoteSelection) return showCustomAlert("提示", "請點選我要參加");
    if (cachedPollData?.config?.VotingLocked === 'true') return showCustomAlert("系統已鎖定", "主辦人已關閉報名系統。");
    // 👇 新增這行：防止已經報名的人重複觸發 API
        if (currentUser.isVoted && (currentUser.votedOption === 1 || currentUser.votedOption === 2)) return showCustomAlert("提示", "您已經完成報名囉！");

    showCustomAlert("資料傳送中", "請稍候...", false);
                
    let currentMembers = cachedPollData.members || [];
    let userIdx = currentMembers.findIndex(v => v['LINE ID'] === currentUser.id || v['LINEID'] === currentUser.id);
    
    const voteData = { 
        "LINEID": currentUser.id, "LINE名稱": currentUser.name, "AvatarUrl": currentUser.pictureUrl || "", 
        "偏好行程": "方案一：宜蘭深度放鬆 (二天一夜)", "time_opt1": "", "time_opt2": "V" 
    };

    if (userIdx > -1) currentMembers[userIdx] = { ...currentMembers[userIdx], ...voteData, Checklist: currentMembers[userIdx].Checklist || "" };
    else currentMembers.push(voteData);

    // 🌟 修改：改寫入 members 節點
    db.ref('members').set(currentMembers).then(() => {
        fetch(GAS_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: "vote", userName: currentUser.name, userId: currentUser.id, pictureUrl: currentUser.pictureUrl, choice_trip: "方案一：宜蘭深度放鬆 (二天一夜)", time_opt1: "", time_opt2: "V" }) 
        }).catch(e => console.error("Sheets 補報名同步失敗:", e));

        showCustomAlert("報名成功", "");
        
        // 更新使用者狀態為正式成員
        currentUser.isVoted = true; 
        currentUser.votedOption = 1;

        // 👇 呼叫畫面重繪：這步會確實拔除鎖頭、同時把提交按鈕變成「您已報名」
        if (cachedPollData) {
            renderDynamicUI(cachedPollData);
        }

        unlockMainApp();
    }).catch(e => showCustomAlert("錯誤", "網路異常，請稍後再試。"));
}

async function fetchResults() {
    const resultContainer = document.getElementById('result-chart-area');
    resultContainer.innerHTML = `<div style="text-align: center; margin-top: 60px;"><div class="spinner" style="margin: 0 auto 15px;"></div><h2 style="color: #4a5568;">統計中...</h2></div>`;
    try {
        // 🌟 修改：撈取資料從 cachedPollData.votes 改成 cachedPollData.members
        let data = cachedPollData ? cachedPollData.members : [];
        if (!cachedPollData) { 
            const response = await fetch(GAS_API_URL, { cache: 'no-store', redirect: 'follow' }); 
            cachedPollData = await response.json(); 
            data = cachedPollData.members || []; 
        }
        let totalVotes = 0; let votersHtml = ""; let t1_d1 = 0; let t1_d2 = 0; let t2_d1 = 0; let t2_d2 = 0; let unableCount = 0; let unableHtml = "";
        data.forEach(row => {
            // 🌟 同時支援舊版與新版的 ID 寫法
            const id = row['LINE ID'] || row['LINEID'];
            if (id === "test_user_001") return;

            totalVotes++; 
            const trip = row['偏好行程']; 
            // 🌟 同時支援舊版與新版的名字寫法
            const name = row['LINE 名稱'] || row['LINE名稱']; 
            
            if (trip && trip.includes("無法參加")) { 
                unableCount++; 
                if (name) unableHtml += `<div style="display: inline-block; background: rgba(255,255,255,0.4); padding: 4px 12px; border-radius: 20px; margin: 4px 6px 4px 0; font-size: 12px; border: 1px solid rgba(255,255,255,0.6); color: var(--text-muted); box-shadow: 0 2px 5px rgba(0,0,0,0.02);">${name}</div>`; 
                return; 
            }
            const isTrip1 = trip && trip.includes("方案一"); 
            const isTrip2 = trip && trip.includes("方案二");

            // 🌟 日期也加上相容防護
            const opt1 = row['time_opt1'] || row['6/13-6/14'];
            const opt2 = row['time_opt2'] || row['6/27-6/28'];

            if (isTrip1) { 
                if (opt1 === 'V') t1_d1++; 
                if (opt2 === 'V') t1_d2++; 
            } else if (isTrip2) { 
                if (opt1 === 'V') t2_d1++; 
                if (opt2 === 'V') t2_d2++; 
            }
            
            if (name && (isTrip1 || isTrip2)) {
                votersHtml += `<div style="display: inline-block; background: rgba(255,255,255,0.6); padding: 4px 12px; border-radius: 20px; margin: 4px 6px 4px 0; font-size: 12px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.6), 0 4px 10px rgba(0,0,0,0.04); color: var(--text-main); border: 1px solid rgba(255,255,255,0.8);">${name} <span style="color:var(--primary-green); font-size:11px; margin-left: 4px;">✔</span></div>`;
            }
        });
        const t1_max = Math.max(t1_d1, t1_d2); const t2_max = Math.max(t2_d1, t2_d2);
        const t1_d1_c = (t1_d1 === t1_max && t1_max > 0) ? 'var(--primary-orange)' : 'var(--text-main)';
        const t1_d2_c = (t1_d2 === t1_max && t1_max > 0) ? 'var(--primary-orange)' : 'var(--text-main)';
        const t2_d1_c = (t2_d1 === t2_max && t2_max > 0) ? 'var(--primary-blue)' : 'var(--text-main)';
        const t2_d2_c = (t2_d2 === t2_max && t2_max > 0) ? 'var(--primary-blue)' : 'var(--text-main)';
        resultContainer.innerHTML = `<div class="fade-in"><h2 style="text-align: center; color: var(--text-main); margin-top: 0; margin-bottom: 20px; text-shadow: 0 1px 2px rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; gap: 8px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> 投票結果統計</h2><div class="card" style="padding: 20px; background: rgba(255,255,255,0.45);"><div style="text-align: center; margin-bottom: 12px; font-weight: 700; font-size: 15px; color: var(--primary-orange);">方案一：宜蘭深度放鬆 (二天一夜)</div><div style="font-size: 14px; color: var(--text-main); background: rgba(255,255,255,0.4); padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.7); box-shadow: inset 0 1px 1px rgba(255,255,255,0.6);"><div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px;"><span style="color: var(--text-muted); display: flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> 6/13-6/14</span><span style="font-weight: 700; font-size: 15px; color: ${t1_d1_c};">${t1_d1} 票</span></div><div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted); display: flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> 6/27-6/28</span><span style="font-weight: 700; font-size: 15px; color: ${t1_d2_c};">${t1_d2} 票</span></div></div></div><div class="card" style="padding: 20px; background: rgba(255,255,255,0.45);"><div style="text-align: center; margin-bottom: 12px; font-weight: 700; font-size: 15px; color: var(--primary-blue);">方案二：基隆海派清涼 (一日遊)</div><div style="font-size: 14px; color: var(--text-main); background: rgba(255,255,255,0.4); padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.7); box-shadow: inset 0 1px 1px rgba(255,255,255,0.6);"><div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px;"><span style="color: var(--text-muted); display: flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> 6/13-6/14</span><span style="font-weight: 700; font-size: 15px; color: ${t2_d1_c};">${t2_d1} 票</span></div><div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted); display: flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> 6/27-6/28</span><span style="font-weight: 700; font-size: 15px; color: ${t2_d2_c};">${t2_d2} 票</span></div></div></div><div style="margin-top: 30px; text-align: center;"><div style="font-weight: 700; color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">已完成投票名單(${totalVotes} 人已投)：</div><div style="display: flex; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">${votersHtml || "<span style='color: #a0aec0; font-size: 12px;'>尚無人投票</span>"}</div></div>${unableCount > 0 ? `<div style="background: rgba(255,255,255,0.3); padding: 16px; border-radius: 14px; border: 1px dashed rgba(255,255,255,0.6); text-align: left; margin-top: 10px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);"><div style="font-weight: 700; color: #ff4d4f; font-size: 13px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> 無法參加(訪客查看) (${unableCount} 人)</div><div style="display: flex; flex-wrap: wrap;">${unableHtml}</div></div>` : ''}</div>`;
    } catch (error) { resultContainer.innerHTML = `<h3 style="color: #ff4d4f; text-align: center; margin-top: 50px;">連線超時，請重試。</h3>`; }
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
    img.src = url;
    viewer.style.display = 'flex';
    setTimeout(() => viewer.classList.add('show'), 10);
    
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }
}

function closeImageViewer() {
    const viewer = document.getElementById('image-viewer');
    viewer.classList.remove('show');
    setTimeout(() => {
        viewer.style.display = 'none';
        document.getElementById('viewer-img').src = ''; 
    }, 300);
    
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
            if(document.getElementById('view-accommodation').classList.contains('active') && !isTransitioning) {
                currentDomIndex++;
                isTransitioning = true;
                updateCarouselView();
            }
        }, 5000);
    }

    // 🌟 完整替換 app.js 中 if (accTrack) { ... } 的內部事件監聽
    if (accTrack) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        // 手指壓下：記錄起點、清除自動輪播、拔除動畫時間（立刻跟手）
        accTrack.addEventListener('touchstart', (e) => {
            if (isTransitioning) return;
            clearInterval(accAutoPlayTimer); 
            startX = e.touches[0].clientX;
            currentX = startX;
            accTrack.style.transition = 'none'; // 拔除動畫，讓圖片死死跟著手指
            isDragging = true;
        }, { passive: true });

        // 🌟 新增：手指移動中！不放開就能連續無限左右推拉
        accTrack.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let deltaX = currentX - startX;
            
            let trackWidth = accTrack.offsetWidth;
            let baseTranslate = -currentDomIndex * trackWidth;
            let currentTranslate = baseTranslate + deltaX;
            accTrack.style.transform = `translateX(${currentTranslate}px)`;
        }, { passive: true });

        // 手指放開：計算滑動比例，智慧判定要彈回原位還是滑向下一張
        accTrack.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            let deltaX = currentX - startX;
            let trackWidth = accTrack.offsetWidth;
            
            // 💡 智慧判定：手指只要推超過卡片寬度的 15%，放開時就判定切換
            if (Math.abs(deltaX) > trackWidth * 0.15) {
                if (deltaX < 0) {
                    currentDomIndex++; // 往左推，看下一張
                } else {
                    currentDomIndex--; // 往右推，看上一張
                }
            }
            
            isTransitioning = true;
            updateCarouselView(); // 彈簧吸附就位
            startAccAutoPlay();   // 重啟自動輪播
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
    const topNav = document.querySelector('.top-nav');
    const avatarMenuScroll = document.getElementById('avatar-menu'); 
    const hamburgerIconScroll = document.getElementById('hamburger-icon');
    const prepCard = document.querySelector('.prep-progress-card'); 

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop <= 0) {
            topNav.classList.remove('nav-hidden');
            if (prepCard) prepCard.classList.remove('shift-up'); 
            lastScrollTop = scrollTop;
            return;
        }

        if (scrollTop > lastScrollTop && scrollTop > 60) { 
            topNav.classList.add('nav-hidden');
            if (prepCard) prepCard.classList.add('shift-up'); 
            
            if (avatarMenuScroll && avatarMenuScroll.style.display === 'flex') {
                avatarMenuScroll.style.display = 'none';
                if (hamburgerIconScroll) hamburgerIconScroll.classList.remove('open');
            }
        } else if (scrollTop < lastScrollTop) { 
            topNav.classList.remove('nav-hidden');
            if (prepCard) prepCard.classList.remove('shift-up'); 
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
    }, { passive: true });

function renderPeoplePage(data) {
    const container = document.getElementById('ui-people-container');
    if (!container) return;
    
    const members = data.members || [];
    const groups = { "已報名": [], "訪客查看": [] };
    
    members.forEach(m => {
        let name = m['LINE 名稱'] || m['LINE名稱'] || "匿名";
        
        if (name === "開發者(測試)") return;
        
        let trip = m['偏好行程'] || "訪客查看";
        
        if (trip.includes("方案一") || trip.includes("方案二")) {
            groups["已報名"].push(name);
        } else {
            groups["訪客查看"].push(name);
        }
    });

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

function renderFeesPage(data) {
    const container = document.getElementById('ui-fees-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; opacity: 0.5;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p style="font-weight: 700; font-size: 15px;">此頁面施工中</p>
        </div>
    `;
}

// ==========================================
// 🚀 留言板核心系統：分頁 + 三劍客局部更新
// ==========================================
let isMessageListenerAttached = false;

function initMessageListeners() {
    if (isMessageListenerAttached) return;
    isMessageListenerAttached = true;

    const msgRef = db.ref('messages');

    // 1. 初次載入：抓取全部資料，負責陣列反轉與「分頁渲染」
    msgRef.once('value').then(snap => {
        const data = snap.val() || [];
        let tempMsgs = [];
        
        // Firebase 陣列轉換防呆處理
        for (let key in data) {
            if (data[key] && data[key].Content) {
                tempMsgs.push({ ...data[key], _firebaseKey: key });
            }
        }
        
        allMessages = tempMsgs.reverse(); // 最新留言在最上面
        renderMessagesPaginated(); // 渲染第一頁 (10筆)
        // ❄️ 補在 Firebase 留言區塊開機載入、跑完第一次 renderMessagesPaginated() 的正下方：
        if (urlParamsCache && urlParamsCache.msgId) {
            console.log("❄️ 偵測到冷啟動留言深層連結，目標 ID:", urlParamsCache.msgId);
            // 稍微延遲給予畫面緩衝，隨後引爆分頁展開雷達
            setTimeout(() => {
                handleMessageDeepLink(urlParamsCache.msgId);
            }, 500);
        }


        // 🌟 關鍵修正：當 messages 陣列確實載入完畢後，立刻強制觸發一次紅點計算！
        updateBadgeCount();

        // =====================================
        // 2. 啟動三劍客：接管後續的即時變更 (不重繪整頁)
        // =====================================
        
        // 🗡️ 劍客一：監聽新增
        msgRef.on('child_added', (snapshot) => {
            const key = snapshot.key;
            const msg = snapshot.val();
            if (!msg || !msg.Content) return;
            msg._firebaseKey = key;

            // 檢查這筆留言是否已經在 allMessages 中
            const exists = allMessages.find(m => m._firebaseKey === key);
            if (!exists) {
                allMessages.unshift(msg); // 放入陣列最前方
                const container = document.getElementById('msg-list-container');
                if (container) {
                    const emptyText = container.querySelector('.empty-msg');
                    if (emptyText) emptyText.remove();
                    
                    // 瞬間插入在最上方
                    container.insertAdjacentHTML('afterbegin', generateSingleMessageHTML(msg));
                }
                updateBadgeCount();
                
                // 🌟【關鍵修正】如果使用者目前正停留在留言板畫面上，代表他已經即時看到了這則新留言！
                // 必須立刻呼叫 clearBadge()，把最新這則留言的 ID 寫入 Firebase 的 readReceipts 節點！
                if (document.getElementById('view-board') && document.getElementById('view-board').classList.contains('active')) {
                    clearBadge();
                }
            }
        });

        // 🗡️ 劍客二：監聽修改 (按讚、編輯瞬間觸發)
        msgRef.on('child_changed', (snapshot) => {
            const key = snapshot.key;
            const msg = snapshot.val();
            if (!msg) return;
            msg._firebaseKey = key;

            // 更新背景陣列
            const idx = allMessages.findIndex(m => m._firebaseKey === key);
            if (idx > -1) allMessages[idx] = msg;
            
            // 🎯 局部抽換畫面元素 (絕對不會閃爍)
            updateSingleMessageUI(msg);
        });

        // 🗡️ 劍客三：監聽刪除
        msgRef.on('child_removed', (snapshot) => {
            const key = snapshot.key;
            allMessages = allMessages.filter(m => m._firebaseKey !== key);
            const dom = document.getElementById(`msg-item-node-${key}`);
            if (dom) dom.remove();
            
            // 🌟 修正：留言被刪除時，立刻重新計算未讀紅點！
            updateBadgeCount();
            
            // 🌟 修正：如果使用者正開著留言板，當最後一則被刪除時，立刻自動把已讀標記「即時向前滾動」到新的最後一則！
            if (document.getElementById('view-board') && document.getElementById('view-board').classList.contains('active')) {
                clearBadge();
            }
        });
    });
}

// 🎯 分頁渲染器 (取代原本的 renderMessages)
function renderMessagesPaginated() {
    const container = document.getElementById('msg-list-container');
    if (!container) return;
    
    let htmlStr = "";
    const msgsToShow = allMessages.slice(0, currentMsgPage * MSG_PER_PAGE);
    
    if (msgsToShow.length === 0) { 
        container.innerHTML = `<p class="empty-msg" style="text-align:center; color:#718096; font-size:14px; margin: 20px 0;">目前沒有留言，來搶頭香吧！</p>`; 
        return; 
    }
    
    msgsToShow.forEach(msg => {
        htmlStr += generateSingleMessageHTML(msg);
    });
    
    // 如果還有舊留言，就在最下方加上載入按鈕
    if (allMessages.length > msgsToShow.length) { 
        htmlStr += `<button id="load-more-btn" class="btn-primary" style="background: rgba(255,255,255,0.3); color: var(--text-main); margin-top: 15px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), 0 4px 15px rgba(0,0,0,0.02); border: 1px solid rgba(255,255,255,0.5);" onclick="loadMoreMessages()">載入較舊留言</button>`; 
    }
    
    container.innerHTML = htmlStr;
}


function loadMoreMessages() {
    currentMsgPage++;
    renderMessagesPaginated(); // 按下載入時，重新依照新頁數渲染
}

// 🎯 單一留言 HTML 產生器
function generateSingleMessageHTML(msg) {
    const key = msg._firebaseKey;
    let timeStr = msg.Time || "剛剛"; 
    const id = msg.LineID || msg.UserId;
    
    let picUrl = window.userAvatarMap[id] || window.userAvatarMap[msg.Name] || msg.AvatarUrl;
    let fallbackText = msg.AvatarText || (msg.Name ? msg.Name[0] : "?");
    
    let avatarHtml = picUrl 
        ? `<div style="position:relative; width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
                <span style="position:absolute; font-size:14px; font-weight:700;">${fallbackText}</span>
                <img src="${picUrl}" style="position:absolute; width:100%; height:100%; object-fit:cover; border-radius:50%; z-index:1;" onerror="this.style.display='none'">
            </div>` 
        : `<div style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;">${fallbackText}</div>`;
    
    let isMyMessage = (id && id === currentUser.id) || (msg.Name === currentUser.name);
    
    let likesArray = [];
    try {
        if (typeof msg.Likes === 'string') likesArray = JSON.parse(msg.Likes || "[]");
        else if (Array.isArray(msg.Likes)) likesArray = msg.Likes;
    } catch(e) {}
    
    let isLiked = likesArray.includes(currentUser.id) || likesArray.includes(currentUser.name);

    let editBtnHtml = isMyMessage ? `<span class="msg-edit-link" onclick="openEditMessage('${key}')">編輯</span>` : "";
    let isEditedHtml = (msg.IsEdited === "V" || msg.IsEdited === true || msg.IsEdited === "true") 
        ? `<span id="msg-edited-${key}" style="font-size:11px; color:#a0aec0; margin-left:6px; font-weight: 500;">(已編輯)</span>` 
        : `<span id="msg-edited-${key}" style="display:none; font-size:11px; color:#a0aec0; margin-left:6px; font-weight: 500;">(已編輯)</span>`;                
    
    let likesTextInner = getLikesIgStyle(likesArray);
    let likesText = `<div id="like-text-${key}" ${likesArray.length > 0 ? `onclick="showLikesDrawer('${key}')"` : ''} style="flex-grow: 1; display: flex; align-items: center; cursor: ${likesArray.length > 0 ? 'pointer' : 'default'}; text-align: left;">${likesTextInner}</div>`;

    let heartIconHtml = `<div id="like-btn-${key}" class="like-btn ${isLiked ? 'liked' : 'unliked'}" onclick="toggleLike('${key}')">
        ${svgHeart}
    </div>`;

    return `
        <div class="msg-item fade-in" id="msg-item-node-${key}" data-msg-id="${msg.MsgID || ''}">
            <div class="msg-avatar">${avatarHtml}</div>
            <div class="msg-body">
                <div class="msg-header">
                    <span class="msg-name">${msg.Name}</span>
                    <div class="msg-header-right">
                        <span class="msg-time">${timeStr}</span>
                        ${editBtnHtml}
                        ${isEditedHtml}
                    </div>
                </div>
                <div id="msg-content-${key}" class="msg-text" style="margin-bottom:12px;" data-raw="${encodeURIComponent(msg.Content)}">${msg.Content}</div>
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 8px; gap: 8px;">
                    ${likesText}
                    ${heartIconHtml}
                </div>
            </div>
        </div>`;
}

// 🎯 局部更新 UI 邏輯
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
    const contentEl = document.getElementById(`msg-content-${key}`);
    const editedEl = document.getElementById(`msg-edited-${key}`);

    if (btnEl) {
        if (isLiked) { btnEl.classList.remove('unliked'); btnEl.classList.add('liked'); } 
        else { btnEl.classList.remove('liked'); btnEl.classList.add('unliked'); }
        // 按讚時加入彈跳小動畫
        btnEl.style.transform = 'scale(1.2)';
        setTimeout(() => btnEl.style.transform = 'scale(1)', 200);
    }
    
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
    
    if (contentEl) {
        const currentRaw = decodeURIComponent(contentEl.getAttribute('data-raw') || '');
        if (currentRaw !== msg.Content) {
            contentEl.innerText = msg.Content;
            contentEl.setAttribute('data-raw', encodeURIComponent(msg.Content));
        }
    }
    
    if (editedEl) {
        editedEl.style.display = (msg.IsEdited === "V" || msg.IsEdited === true || msg.IsEdited === "true") ? 'inline' : 'none';
    }
}

// 🎯 按讚極速版
async function toggleLike(key) {
    if (navigator.vibrate) navigator.vibrate(50);
    
    // 只鎖定那一筆留言去抓取與寫入
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
        
        if (isAdding) likesArray.push(currentUser.id); 
        else likesArray.splice(idIdx, 1); 

        // 🚀 極速寫入：只覆蓋 Likes 欄位
        msgRef.child('Likes').set(JSON.stringify(likesArray));

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
    textarea.style.display = 'block'; textarea.value = msg.Content; 
    document.getElementById('modal-btn-cancel').style.display = 'block';
    
    const confirmBtn = document.getElementById('modal-btn-confirm');
    confirmBtn.style.display = 'block'; confirmBtn.innerText = "儲存變更";
    confirmBtn.onclick = function() {
        const newContent = textarea.value.trim();
        if (!newContent) return showCustomAlert("提示", "留言不能為空！");
        if (newContent === msg.Content) { closeModal(); return; }
        
        // 🚀 極速寫入：只更新 Content 跟 IsEdited
        db.ref(`messages/${key}`).update({
            Content: newContent,
            IsEdited: "V"
        }).then(() => closeModal());
    };
    document.getElementById('custom-modal').style.display = 'flex';
    setTimeout(() => textarea.focus(), 100);
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

// 🎯 發佈留言
async function postMessage() {
    const t = document.getElementById('new-msg-text'); const val = t.value.trim(); if (!val) return;
    const time = getFormattedTime();
    const msgId = "MSG_" + new Date().getTime();
    
    const newMsg = { 
        MsgID: msgId, LineID: currentUser.id, Name: currentUser.name, 
        AvatarText: currentUser.initial, AvatarUrl: currentUser.pictureUrl, 
        Time: time, Content: val, Likes: "[]" 
    };
    
    t.value = ''; 
    
    // 取得陣列長度做為 index，以符合你 Firebase 原本的儲存格式
    db.ref('messages').once('value').then(snap => {
        const currentMsgs = snap.val() || [];
        const newIndex = currentMsgs.length;
        db.ref(`messages/${newIndex}`).set(newMsg);
    });

    fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: "addMessage", msgId: msgId, userName: currentUser.name, userId: currentUser.id, avatarText: currentUser.initial, timeStr: time, content: val }) 
    }).catch(e => console.error("Sheets 留言同步失敗:", e));
}

function pushSingleNotice(noticeId, btn) {
    const blocks = document.querySelectorAll('.admin-notice-block');
    let isDirty = false;
    
    // 智慧比對：拿當前畫面的輸入文字，去比對資料庫原本下載的 adminNoticesArray
    for (let block of blocks) {
        if (block.getAttribute('data-id') === noticeId) {
            // 🌟 修正：拔除錯誤的 || 語法，改為標準精確選取器，徹底解決無反應崩潰
            const titleEl = block.querySelector('.admin-n-title');
            const descEl = block.querySelector('.admin-n-desc');
            
            const currentTitle = titleEl ? titleEl.value.trim() : "";
            const currentDesc = descEl ? descEl.value.trim() : "";
            
            const original = adminNoticesArray.find(n => n.id === noticeId);
            // 如果在原陣列找不到（代表是全新按新增的），或者文字被改過
            if (!original || original.title !== currentTitle || original.desc !== currentDesc) {
                isDirty = true;
            }
            break;
        }
    }
    
    // ❌ 攔截：如果發現有修改但沒按大儲存
    if (isDirty) {
        showCustomAlert("提示", "您修改了公告內容！\n請先「儲存所有變更」，才能發送最新通知。");
        return;
    }
    
    // ✅ 通過：內容一致，開始發送
    const targetNotice = adminNoticesArray.find(n => n.id === noticeId);
    if (!targetNotice) return;
    
    btn.innerText = "發送中..."; btn.disabled = true;
    
    fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: "pushNoticeBroadcast",
            title: targetNotice.title,
            content: targetNotice.desc,
            noticeId: noticeId
        })
    })
    .then(res => res.text())
    .then(resText => {
        showCustomAlert("發送成功", "公告已順利推播！");
    })
    .catch(err => {
        showCustomAlert("錯誤", "發送失敗：" + err.message);
    })
    .finally(() => {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: translateY(-0.5px);"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> 推播公告`;
        btn.disabled = false;
    });
}

// =========================================================================
// 💬 留言深層連結雷達：全自動跨頁搜尋、遞迴展開、絲滑置中與高亮系統 (實體分頁校正版)
// =========================================================================
function handleMessageDeepLink(msgId) {
    if (!msgId) return;

    // 1. 🌟【精準修正】：分頁 ID 必須是 'board'，完美對齊 index.html 的 view-board！
    if (typeof switchView === 'function') {
        switchView('board'); 
    }

    let checkCount = 0;
    const maxPages = 25; // 安全防護

    function findAndScroll() {
        // 🌟【精準修正】：透過前面綁定的 data-msg-id 進行絕對精準捕捉
        const targetCard = document.querySelector(`[data-msg-id="${msgId}"]`);
        
        if (targetCard) {
            console.log("🎯 智慧雷達成功捕獲目標留言！執行流暢置中與高亮特效:", msgId);
            
            setTimeout(() => {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 注入精緻的暖橘色高亮動態閃爍
                targetCard.style.transition = 'background-color 0.4s ease, transform 0.4s ease';
                targetCard.style.backgroundColor = 'rgba(249, 168, 38, 0.25)'; 
                targetCard.style.transform = 'scale(1.025)';
                
                setTimeout(() => {
                    targetCard.style.backgroundColor = '';
                    targetCard.style.transform = '';
                }, 2500);
            }, 350);

            // 成功就位後清理網址參數
            const params = new URLSearchParams(window.location.search);
            if (params.has('msgId')) {
                params.delete('msgId');
                const newSearch = params.toString() ? '?' + params.toString() : '';
                window.history.replaceState({}, document.title, window.location.pathname + newSearch);
            }
            return;
        }

        // 2. 如果當前 DOM 找不到，代表在第 10 則之後，驅動分頁計數器自動往下翻頁
        if (typeof currentMsgPage !== 'undefined' && typeof renderMessagesPaginated === 'function') {
            if (checkCount < maxPages) {
                console.log(`⏳ 當前頁面未見該留言，全自動往下展開第 ${currentMsgPage + 1} 頁...`);
                checkCount++;
                currentMsgPage++; 
                renderMessagesPaginated(); // 觸發下一頁渲染
                
                // 給予瀏覽器 300 毫秒異步繪製時間，隨後再次遞迴尋找
                setTimeout(findAndScroll, 300);
            }
        }
    }

    // 啟動雷達
    setTimeout(findAndScroll, 400);
}

// =========================================================================
// 🚀 終極完全體整合：熱啟動優化、廣播監聽與 3D 全體同頻導覽列水滴系統
// =========================================================================

document.addEventListener('visibilitychange', handleWarmStartNavigation);
window.addEventListener('popstate', handleWarmStartNavigation);

function handleWarmStartNavigation() {
    if (document.visibilityState === 'visible') {
        setTimeout(() => {
            const freshParams = new URLSearchParams(window.location.search);
            const noticeId = freshParams.get('notice');
            const msgId = freshParams.get('msgId'); 
            
            if (noticeId) {
                console.log("🎯 偵測到熱啟動公告通知，立刻執行滑動定位:", noticeId);
                switchView('overview');
                setTimeout(() => {
                    const card = document.getElementById('notice-card-' + noticeId);
                    if (card) {
                        card.classList.add('expanded');
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        window.history.replaceState({}, document.title, window.location.pathname + (freshParams.get('openExternalBrowser') ? '?openExternalBrowser=1' : ''));
                    }
                }, 450);
            } 
            else if (msgId) {
                console.log("🎯 偵測到熱啟動留言深層連結，執行定位:", msgId);
                handleMessageDeepLink(msgId);
            }
        }, 150);
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.action === 'urlNotificationClicked') {
            console.log("📥 [熱啟動解凍] 成功接收 SW 廣播訊號，執行免刷新秒轉:", event.data.url);
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
            window.lastProcessedNoticeId = noticeId; 
            switchView('overview'); 

            setTimeout(() => {
                const card = document.getElementById('notice-card-' + noticeId);
                if (card) {
                    card.classList.add('expanded'); 
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                }
            }, 300);
        } 
        else if (msgId) {
            console.log("📥 [熱啟動解凍] 收到 SW 留言推播廣播，立刻秒轉搜尋:", msgId);
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
            #bottom-nav-block .nav-item,
            #bottom-nav-block .nav-item.active,
            #bottom-nav-block .nav-item .nav-icon,
            #bottom-nav-block .nav-item.active .nav-icon,
            #bottom-nav-block .nav-item span,
            #bottom-nav-block .nav-item.active span {
                transform: scale(1) !important;
                transform: scale3d(1, 1, 1) !important;
                transition: color 0.25s ease, opacity 0.25s ease !important;
            }
        `;
        document.head.appendChild(style);
    }

    let startX = 0;
    let originLeft = 0;
    let originWidth = 0;
    let isTracking = false;
    let touchedTab = null;
    
    let transitionStart = 0;
    let currentDuration = 820; 

    function runLiveTabsTracking() {
        if (!indicator || !navBlock) return;
        
        let indRect = indicator.getBoundingClientRect();
        let indCenter = indRect.left + (indRect.width / 2);
        
        let navRect = navBlock.getBoundingClientRect();
        let relativeCenter = indCenter - navRect.left;
        
        const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
        let closestTab = null;
        let minDistance = Infinity;
        
        tabs.forEach(tab => {
            let tabCenter = tab.offsetLeft + (tab.offsetWidth / 2);
            let dist = Math.abs(relativeCenter - tabCenter);
            if (dist < minDistance) {
                minDistance = dist;
                closestTab = tab;
            }
        });
        
        if (closestTab) {
            tabs.forEach(tab => {
                if (tab !== closestTab) tab.classList.remove('active');
            });
            closestTab.classList.add('active'); 
        }
        
        if (Date.now() - transitionStart < currentDuration + 80) {
            requestAnimationFrame(runLiveTabsTracking);
        }
    }

    function startLiveTracking(duration) {
        transitionStart = Date.now();
        currentDuration = duration;
        requestAnimationFrame(runLiveTabsTracking);
    }

    navBlock.addEventListener('touchstart', (e) => {
        let touchX = e.touches[0].clientX;
        let navRect = navBlock.getBoundingClientRect();
        let relativeX = touchX - navRect.left;
        
        const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
        touchedTab = navBlock.querySelector('.nav-item.active'); 
        let minDistance = Infinity;

        tabs.forEach(tab => {
            let tabCenter = tab.offsetLeft + (tab.offsetWidth / 2);
            let dist = Math.abs(relativeX - tabCenter);
            if (dist < minDistance) {
                minDistance = dist;
                touchedTab = tab;
            }
        });

        if (!touchedTab) return;

        startX = touchX;
        originLeft = touchedTab.offsetLeft;
        originWidth = touchedTab.offsetWidth;
        isTracking = false; 

        navBlock.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        indicator.style.transition = 'left 0.45s cubic-bezier(0.19, 1, 0.22, 1), width 0.45s cubic-bezier(0.19, 1, 0.22, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), top 0.3s cubic-bezier(0.25, 1, 0.5, 1), bottom 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        
        navBlock.style.transform = 'scale(1.025)';
        indicator.style.top = '-5px';    
        indicator.style.bottom = '-5px'; 
        indicator.style.left = originLeft + 'px';
        indicator.style.width = originWidth + 'px';
        indicator.style.transform = 'scale3d(1.01, 1.06, 1)'; 

        tabs.forEach(tab => tab.classList.remove('active'));
        touchedTab.classList.add('active');

        startLiveTracking(450);
    }, { passive: true });

    navBlock.addEventListener('touchmove', (e) => {
        if (!touchedTab) return;
        let currentX = e.touches[0].clientX;
        let deltaX = currentX - startX;

        if (!isTracking && Math.abs(deltaX) > 5) {
            isTracking = true;
        }

        if (!isTracking) return;

        indicator.style.transition = 'none';
        let currentLeft = originLeft + deltaX;
        
        let minLeft = 4;
        let maxLeft = navBlock.offsetWidth - originWidth - 4;
        if (currentLeft < minLeft) {
            currentLeft = minLeft + (currentLeft - minLeft) * 0.12;
        } else if (currentLeft > maxLeft) {
            currentLeft = maxLeft + (currentLeft - maxLeft) * 0.12;
        }

        indicator.style.top = '-5px';    
        indicator.style.bottom = '-5px'; 
        indicator.style.left = currentLeft + 'px';
        indicator.style.width = originWidth + 'px';
        indicator.style.transform = 'scale3d(1.01, 1.06, 1)'; 

        indicator.style.background = 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(59, 208, 175, 0.04) 100%)';
        indicator.style.border = '1.5px solid rgba(255, 255, 255, 0.8)';
        indicator.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.95), 0 0 15px rgba(59, 208, 175, 0.35)';

        let navRect = navBlock.getBoundingClientRect();
        let relativeX = currentX - navRect.left;
        const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
        
        let closestTab = touchedTab;
        let minDistance = Infinity;

        tabs.forEach(tab => {
            let tabCenter = tab.offsetLeft + (tab.offsetWidth / 2);
            let dist = Math.abs(relativeX - tabCenter);
            if (dist < minDistance) {
                minDistance = dist;
                closestTab = tab;
            }
        });

        tabs.forEach(tab => tab.classList.remove('active'));
        if (closestTab) closestTab.classList.add('active');
    }, { passive: true });

    function handleTouchRelease() {
        if (!touchedTab) return;

        navBlock.style.transition = 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        indicator.style.transition = 'left 0.82s cubic-bezier(0.19, 1, 0.22, 1), width 0.82s cubic-bezier(0.19, 1, 0.22, 1), transform 0.6s cubic-bezier(0.19, 1, 0.22, 1), top 0.6s cubic-bezier(0.19, 1, 0.22, 1), bottom 0.6s cubic-bezier(0.19, 1, 0.22, 1)'; 
        
        navBlock.style.transform = 'scale(1)';
        indicator.style.top = '5px';    
        indicator.style.bottom = '5px';
        indicator.style.transform = 'scale3d(1, 1, 1)';
        
        indicator.style.background = '';
        indicator.style.border = '';
        indicator.style.boxShadow = '';
        
        const finalActiveTab = isTracking ? (navBlock.querySelector('.nav-item.active') || touchedTab) : touchedTab;
        
        if (finalActiveTab) {
            let targetView = finalActiveTab.id.replace('tab-', '');
            indicator.style.left = finalActiveTab.offsetLeft + 'px';
            indicator.style.width = finalActiveTab.offsetWidth + 'px';
            
            const tabs = Array.from(navBlock.querySelectorAll('.nav-item'));
            tabs.forEach(tab => tab.classList.remove('active'));
            finalActiveTab.classList.add('active');
            
            switchView(targetView); 
        }
        
        startLiveTracking(820);
        touchedTab = null; 
    }

    navBlock.addEventListener('touchend', handleTouchRelease, { passive: true });
    navBlock.addEventListener('touchcancel', handleTouchRelease, { passive: true });
}
