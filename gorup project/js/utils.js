/* ========================================================================== */
        function initOfflineDB() {
            if (offlineDB) return Promise.resolve(offlineDB);
            if (dbInitPromise) return dbInitPromise;
            
            dbInitPromise = new Promise((resolve, reject) => {
                try {
                    const req = window.indexedDB.open("Z_Local_DB", 3);
                    req.onupgradeneeded = e => {
                        const db = e.target.result;
                        if(!db.objectStoreNames.contains('posts')) db.createObjectStore('posts', {keyPath: 'id'});
                        if(!db.objectStoreNames.contains('profile')) db.createObjectStore('profile', {keyPath: 'id'});
                        if(!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', {keyPath: 'id'});
                        if(!db.objectStoreNames.contains('globalUsers')) db.createObjectStore('globalUsers', {keyPath: 'id'});
                        if(!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', {keyPath: 'id'});
                    };
                    req.onsuccess = e => { 
                        offlineDB = e.target.result; 
                        dbInitPromise = null; 
                        resolve(offlineDB); 
                    };
                    req.onerror = e => { 
                        dbInitPromise = null; 
                        reject(e.target.error); 
                    };
                } catch (e) {
                    reject(e);
                }
            });
            return dbInitPromise;
        }
        
        async function getOfflineData(storeName) {
            const db = await initOfflineDB();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const req = tx.objectStore(storeName).getAll();
                    req.onsuccess = e => resolve(e.target.result);
                    req.onerror = e => reject(e.target.error);
                } catch (e) { reject(e); }
            });
        }
        
        async function putOfflineData(storeName, data) {
            const db = await initOfflineDB();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    tx.objectStore(storeName).put(data);
                    tx.oncomplete = () => resolve();
                    tx.onerror = e => reject(e.target.error);
                } catch (e) { reject(e); }
            });
        }
        
        async function deleteOfflineData(storeName, id) {
            const db = await initOfflineDB();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    tx.objectStore(storeName).delete(id);
                    tx.oncomplete = () => resolve();
                    tx.onerror = e => reject(e.target.error);
                } catch (e) { reject(e); }
            });
        }

        function getTodayString() {
            const d = new Date();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[d.getMonth()]} ${d.getDate()}`;
        }
        window.getTodayString = getTodayString;

        window.timeAgo = (ms) => {
            const seconds = Math.floor((Date.now() - ms) / 1000);
            if (seconds < 60) return 'Just now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            return `${Math.floor(hours / 24)}d ago`;
        };

        function containsProfanity(text) {
            const regex = new RegExp("\\b(" + badWords.join("|") + ")\\b", "i");
            return regex.test(text);
        }
        window.containsProfanity = containsProfanity;

        function escapeHtml(s) {
            if (s == null || s === undefined) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
        window.escapeHtml = escapeHtml;

        function showToast(message, type = 'info') {
            const stack = document.getElementById('toast-stack');
            if (!stack || !message) return;
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            t.setAttribute('role', 'status');
            t.textContent = message;
            stack.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0';
                t.style.transform = 'translateY(10px)';
                t.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                setTimeout(() => t.remove(), 350);
            }, 3400);
        }
        window.showToast = showToast;

        window.updateCharCount = () => {
            const input = document.getElementById('tweetInput');
            const wrap = document.getElementById('char-count-wrap');
            const n = document.getElementById('char-count');
            if (!input || !wrap || !n) return;
            const len = input.value.length;
            n.textContent = String(len);
            wrap.classList.remove('warn', 'danger');
            if (len >= 260) wrap.classList.add('warn');
            if (len >= 280) wrap.classList.add('danger');
        };

        window.openAccountActionModal = (uid) => { selectedActionUserId = uid; document.getElementById('accountActionModal').style.display = 'flex'; };
        window.closeAccountActionModal = () => { document.getElementById('accountActionModal').style.display = 'none'; selectedActionUserId = null; };
        window.actionGoToProfile = () => { if(selectedActionUserId) { window.closeAccountActionModal(); window.openProfile(selectedActionUserId); } };
        window.actionGoToChat = () => { if(selectedActionUserId) { window.closeAccountActionModal(); window.openChat(selectedActionUserId); } };

        window.openSettingsSub = (id) => { document.getElementById('settings-main-menu').style.display = 'none'; document.getElementById(id).style.display = 'block'; window.scrollTo(0,0); };
        window.closeSettingsSub = () => { ['settings-account', 'settings-notifications', 'settings-display'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; }); const m = document.getElementById('settings-main-menu'); if(m) m.style.display = 'block'; };

        function switchPage(event, pageId) {
            if(event) event.preventDefault();
            document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
            const target = document.getElementById(pageId);
            if (target) target.style.display = 'block';

            if (pageId !== 'settings-page') {
                if (window.closeSettingsSub) window.closeSettingsSub();
            }
            
            if (pageId === 'notifications-page') {
                currentUser.lastCheckedNotifs = Date.now();
                if (!currentUser.isGuest) saveProfileToDb(currentUser);
                window.updateNotificationBadge();
                window.renderNotifications();
            }
            
            if (pageId === 'messages-page') {
                const searchInput = document.getElementById('message-search-input');
                if (searchInput) searchInput.value = '';
                window.renderChatList();
            }

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const targetNav = pageId === 'chat-page' ? 'messages-page' : pageId;
            document.querySelectorAll(`.nav-item[data-target="${targetNav}"]`).forEach(n => n.classList.add('active'));
            window.scrollTo(0, 0);
        }
        window.switchPage = switchPage;

        function switchHomeTab(tab) {
            if(tab === 'for-you') {
                document.getElementById('tab-for-you').classList.add('active');
                document.getElementById('tab-following').classList.remove('active');
                document.getElementById('home-for-you-content').style.display = 'block';
                document.getElementById('home-following-content').style.display = 'none';
            } else {
                document.getElementById('tab-for-you').classList.remove('active');
                document.getElementById('tab-following').classList.add('active');
                document.getElementById('home-for-you-content').style.display = 'none';
                document.getElementById('home-following-content').style.display = 'block';
                window.renderHomeFollowingList();
            }
        }
        window.switchHomeTab = switchHomeTab;

        function applyTheme(isLight) {
            const toggle = document.getElementById('themeToggle');
            if (toggle) toggle.checked = !!isLight;
            if (isLight) document.body.classList.add('light-mode');
            else document.body.classList.remove('light-mode');
        }
        window.applyTheme = applyTheme;

        function toggleTheme() {
            const toggle = document.getElementById('themeToggle');
            const isLight = toggle ? toggle.checked : false;
            currentUser.isLightMode = isLight;
            applyTheme(isLight);
            if(!currentUser.isGuest) saveProfileToDb(currentUser);
        }
        window.toggleTheme = toggleTheme;

        function handleMediaSelect(event, target) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const isVideo = file.type.startsWith('video/');
                if(target === 'post') {
                    composeAttachedMedia = { url: dataUrl, isVideo };
                    window.renderComposePreview();
                    window.toggleSendButton();
                } else if (target === 'chat') {
                    chatAttachedMedia = { url: dataUrl, isVideo };
                    window.renderChatPreview();
                    window.toggleChatSendButton();
                }
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }
        window.handleMediaSelect = handleMediaSelect;

        function renderComposePreview() {
            const container = document.getElementById('compose-media-preview-container');
            const content = document.getElementById('compose-media-content');
            if(composeAttachedMedia) {
                container.style.display = 'block';
                content.innerHTML = composeAttachedMedia.isVideo ? `<video src="${composeAttachedMedia.url}" controls class="media-preview-img"></video>` : `<img src="${composeAttachedMedia.url}" class="media-preview-img">`;
            } else {
                container.style.display = 'none';
                content.innerHTML = '';
            }
        }
        window.renderComposePreview = renderComposePreview;

        function renderChatPreview() {
            const container = document.getElementById('chat-media-preview-container');
            const content = document.getElementById('chat-media-content');
            if(chatAttachedMedia) {
                container.style.display = 'block';
                content.innerHTML = chatAttachedMedia.isVideo ? `<video src="${chatAttachedMedia.url}" controls class="media-preview-img" style="max-height: 150px;"></video>` : `<img src="${chatAttachedMedia.url}" class="media-preview-img" style="max-height: 150px;">`;
            } else {
                container.style.display = 'none';
                content.innerHTML = '';
            }
        }
        window.renderChatPreview = renderChatPreview;

        function removeMedia(target) {
            if(target === 'post') { composeAttachedMedia = null; window.renderComposePreview(); window.toggleSendButton(); } 
            else if (target === 'chat') { chatAttachedMedia = null; window.renderChatPreview(); window.toggleChatSendButton(); }
        }
        window.removeMedia = removeMedia;

        function toggleEmojiPicker(target) {
            const picker = document.getElementById('emoji-picker');
            if(picker.style.display === 'grid' && activeEmojiInput === target) {
                picker.style.display = 'none'; activeEmojiInput = null;
            } else {
                picker.style.display = 'grid'; activeEmojiInput = target;
            }
        }
        window.toggleEmojiPicker = toggleEmojiPicker;

        function insertEmoji(emoji) {
            if(activeEmojiInput === 'post') {
                const input = document.getElementById('tweetInput'); input.value += emoji; window.toggleSendButton(); window.updateCharCount(); input.focus();
            } else if (activeEmojiInput === 'chat') {
                const input = document.getElementById('chatInput'); input.value += emoji; window.toggleChatSendButton(); input.focus();
            }
            document.getElementById('emoji-picker').style.display = 'none';
            activeEmojiInput = null;
        }
        window.insertEmoji = insertEmoji;

        document.addEventListener('keydown', (e) => {
            if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return;
            const ta = document.getElementById('tweetInput');
            const sendBtn = document.getElementById('sendBtn');
            if (document.activeElement !== ta || !sendBtn || sendBtn.disabled) return;
            e.preventDefault();
            window.sendPost();
        });

        document.addEventListener('click', (e) => {
            const picker = document.getElementById('emoji-picker');
            if(picker && !e.target.closest('.emoji-picker') && !e.target.closest('.action-icon') && !e.target.closest('.chat-icon-btn')) {
                picker.style.display = 'none';
                activeEmojiInput = null;
            }
        });

        window.exportData = () => {
            const backupData = {
                profile: currentUser,
                users: globalUsers,
                posts: postsData,
                chats: globalChats,
                notifications: notifications
            };
            const blob = new Blob([JSON.stringify(backupData)], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Zigazoo_Backup_${window.getTodayString().replace(' ', '_')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Backup file downloaded', 'success');
        };

        window.importData = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const persistLocal = !useFirebase && offlineDB;

                    if (data.users) {
                        globalUsers = data.users;
                        if (persistLocal) {
                            for (const key in globalUsers) await putOfflineData('globalUsers', globalUsers[key]);
                        }
                    }
                    if (data.profile) {
                        currentUser = data.profile;
                        if (persistLocal) await putOfflineData('profile', currentUser);
                    }
                    if (data.posts) {
                        postsData = data.posts;
                        if (persistLocal) {
                            for (const p of postsData) await putOfflineData('posts', p);
                        }
                    }
                    if (data.chats) {
                        globalChats = data.chats;
                        if (persistLocal) {
                            for (const key in globalChats) await putOfflineData('chats', { id: key, messages: globalChats[key] });
                        }
                    }

                    if (useFirebase) {
                        showToast('Import applied for this session. Cloud data was not overwritten.', 'info');
                    } else {
                        showToast('Backup restored — you are all set!', 'success');
                    }
                    window.updateUIProfileElements();
                    window.renderPosts();
                    window.renderWhoToFollow();
                    window.renderChatList();
                    if(document.getElementById('explore-search-input').value) window.handleExploreSearch();
                } catch (err) {
                    alert("Invalid backup file. Could not import.");
                    console.error("Import error:", err);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        };