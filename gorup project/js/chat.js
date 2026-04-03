/* ========================================================================== */
        function renderChatList() {
            const list = document.getElementById('global-messages-list');
            if(!list) return;
            list.innerHTML = '';
            
            const chatUsers = Object.keys(globalChats);
            
            if (chatUsers.length === 0) {
                list.innerHTML = '<div style="padding: 40px; text-align: center; color: #71767b;">Welcome to your inbox!<br><br>Search for a user above to start a conversation.</div>';
                return;
            }
            
            chatUsers.forEach(uid => {
                const u = globalUsers[uid] || mockUsers[uid];
                if(!u) return;
                const msgs = globalChats[uid] || [];
                const lastMsgObj = msgs[msgs.length-1];
                const lastMsg = lastMsgObj ? (lastMsgObj.text || '[Media]') : 'Start a conversation';
                const timeText = lastMsgObj ? window.timeAgo(lastMsgObj.id) : '';
                
                list.innerHTML += `
                    <li class="message-item" onclick="window.checkAuthOrAction(event, () => window.openChat('${uid}'))">
                        <div class="message-avatar" style="background: ${u.avatar}; background-size:cover;"></div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="username">${escapeHtml(u.name)}</span>
                                <span class="timestamp">${timeText}</span>
                            </div>
                            <div class="message-preview">${escapeHtml(lastMsg)}</div>
                        </div>
                    </li>
                `;
            });
            if (document.getElementById('message-search-input')?.value.trim()) window.filterMessageList();
        }
        window.renderChatList = renderChatList;

        window.filterMessageList = () => {
            const q = (document.getElementById('message-search-input')?.value || '').toLowerCase().trim();
            document.querySelectorAll('#global-messages-list .message-item').forEach((el) => {
                const text = (el.textContent || '').toLowerCase();
                el.style.display = !q || text.includes(q) ? '' : 'none';
            });
        };

        window.openChat = (userId, initialMsg = '') => {
            activeChatUserId = userId;
            const u = globalUsers[userId];
            if(!u) return;
            
            document.getElementById('active-chat-username').innerText = u.name;
            document.getElementById('active-chat-avatar').style.background = u.avatar;
            
            if(initialMsg && (!globalChats[userId] || globalChats[userId].length === 0)) {
                globalChats[userId] = [{ id: Date.now(), type: 'received', text: initialMsg, media: null }];
                saveChatToDb(userId, globalChats[userId]);
            } else if (!globalChats[userId]) {
                globalChats[userId] = [];
            }
            
            window.renderChatHistory();
            window.switchPage(null, 'chat-page');
        };

        window.openChatFromProfile = () => { if(currentViewedProfileId !== 'me' && currentViewedProfileId !== currentUser.id) window.openChat(currentViewedProfileId); };

        window.renderChatHistory = () => {
            const container = document.getElementById('chatHistory');
            container.innerHTML = '';
            const msgs = globalChats[activeChatUserId] || [];

            msgs.forEach(msg => {
                const safeText = msg.text ? msg.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
                let actions = msg.type === 'sent' ? `<div class="chat-bubble-actions"><button class="chat-action-btn" onclick="window.deleteMessage('${msg.id}')">Delete</button></div>` : '';
                let mediaHTML = msg.media ? (msg.media.isVideo ? `<video src="${msg.media.url}" controls class="chat-bubble-media"></video>` : `<img src="${msg.media.url}" class="chat-bubble-media">`) : '';

                container.innerHTML += `
                    <div class="chat-bubble-wrapper ${msg.type}">
                        <div class="chat-bubble ${msg.type}">${safeText}${mediaHTML}</div>
                        ${actions}
                    </div>
                `;
            });
            container.scrollTop = container.scrollHeight;
        };

        window.toggleChatSendButton = () => {
            document.getElementById('chatSendBtn').disabled = document.getElementById('chatInput').value.trim().length === 0 && !chatAttachedMedia;
        };

        window.sendChatMessage = async () => {
            const text = document.getElementById('chatInput').value.trim();
            if (window.containsProfanity(text)) return alert("Inappropriate language.");
            
            if (text || chatAttachedMedia) {
                if(!globalChats[activeChatUserId]) globalChats[activeChatUserId] = [];
                globalChats[activeChatUserId].push({ id: Date.now().toString(), type: 'sent', text: text, media: chatAttachedMedia });
                
                document.getElementById('chatInput').value = '';
                chatAttachedMedia = null;
                window.renderChatPreview();
                window.renderChatHistory(); // Optimistic update
                window.toggleChatSendButton();
                
                window.pushNotification(activeChatUserId, 'message', 'sent you a new message');
                
                await saveChatToDb(activeChatUserId, globalChats[activeChatUserId]);

                // --- BUDDY BOT AUTO-REPLY ---
                if (activeChatUserId === 'u_buddy') {
                    setTimeout(async () => {
                        const buddyReplies = ["Got your message! 🚀", "Messaging is working perfectly!", "Notifications should be popping up too! ✨", "Loud and clear!"];
                        const replyText = buddyReplies[Math.floor(Math.random() * buddyReplies.length)];
                        
                        globalChats['u_buddy'].push({ id: Date.now().toString(), type: 'received', text: replyText, media: null });
                        
                        const notif = {
                            id: Date.now().toString(),
                            type: 'message',
                            sourceUserId: 'u_buddy',
                            text: 'sent you a new message',
                            timestamp: Date.now(),
                            targetUserId: currentUser.id
                        };
                        notifications.unshift(notif);
                        await putOfflineData('notifications', notif);
                        
                        window.updateNotificationBadge();
                        if(document.getElementById('notifications-page').style.display === 'block') window.renderNotifications();
                        if(activeChatUserId === 'u_buddy') window.renderChatHistory();
                        window.renderChatList();
                        
                        await saveChatToDb('u_buddy', globalChats['u_buddy']);
                    }, 1500);
                }
            }
        };

        window.handleChatKeyPress = (e) => { if (e.key === 'Enter') window.sendChatMessage(); };

        window.deleteMessage = async (id) => {
            globalChats[activeChatUserId] = globalChats[activeChatUserId].filter(m => m.id != id);
            window.renderChatHistory(); // Optimistic update
            await saveChatToDb(activeChatUserId, globalChats[activeChatUserId]);
        };