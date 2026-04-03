/* ========================================================================== */
        function renderPosts() {
            const feed = document.getElementById('feedContent');
            const profileFeed = document.getElementById('profile-posts-container');
            if(feed) feed.innerHTML = '';
            if(profileFeed) profileFeed.innerHTML = '';
            
            [...postsData].reverse().forEach((post, idx) => {
                const stagger = Math.min(idx * 0.045, 0.85);
                const isMine = post.authorId === currentUser.id;
                const likedByMe = post.likedByUsers && post.likedByUsers.includes(currentUser.id);
                
                // Prioritize globalUsers data to keep it updated for everyone globally
                const liveAuthor = globalUsers[post.authorId];
                const displayName = escapeHtml(liveAuthor ? liveAuthor.name : post.authorName);
                const displayHandle = escapeHtml(liveAuthor ? liveAuthor.handle : post.authorHandle);
                const displayAvatar = liveAuthor ? liveAuthor.avatar : post.authorAvatar;
                
                let contentHTML = '';
                if(editingPostId === post.id) {
                    contentHTML = `
                        <textarea id="edit-post-input-${post.id}" class="edit-input" style="padding: 12px 0; min-height: 60px;">${escapeHtml(post.content)}</textarea>
                        <div style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="send-btn" style="padding: 4px 12px; font-size: 13px;" onclick="window.saveEditPost('${post.id}')">Save</button>
                            <button class="send-btn" style="padding: 4px 12px; font-size: 13px; background: transparent; border: 1px solid #536471; color: inherit;" onclick="window.cancelEditPost()">Cancel</button>
                        </div>
                    `;
                } else {
                    const safeText = post.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
                    contentHTML = `<div class="tweet-content">${safeText}</div>`;
                }

                if(post.media) {
                    const mediaElement = post.media.isVideo ? `<video src="${post.media.url}" controls></video>` : `<img src="${post.media.url}">`;
                    contentHTML += `<div class="tweet-media">${mediaElement}</div>`;
                }

                let postOptionsHTML = '';
                if (isMine && editingPostId !== post.id) {
                    postOptionsHTML = `
                        <div class="post-options">
                            <button class="chat-action-btn" onclick="window.startEditPost('${post.id}')">Edit</button>
                            <button class="chat-action-btn" onclick="window.deletePost('${post.id}')" style="color: #f4212e;">Delete</button>
                        </div>
                    `;
                }

                let inlineFollowBtn = '';
                if(!isMine && post.authorId && !currentUser.isGuest) {
                    const isFollowing = currentUser.followingList.includes(post.authorId);
                    const btnText = isFollowing ? 'Following' : 'Follow';
                    const btnClass = isFollowing ? 'follow-btn following' : 'follow-btn';
                    inlineFollowBtn = `<button class="send-btn ${btnClass}" style="padding: 2px 8px; font-size: 12px; margin-left: 8px;" onclick="window.checkAuthOrAction(event, () => window.toggleFollowUser('${post.authorId}'))">${btnText}</button>`;
                }

                let repliesHTML = '';
                (post.replies || []).forEach(reply => {
                    const liveReplier = globalUsers[reply.authorId];
                    const replierName = liveReplier ? liveReplier.name : reply.name;
                    const replierHandle = liveReplier ? liveReplier.handle : reply.handle;
                    const replierAvatar = liveReplier ? liveReplier.avatar : reply.avatar;
                    const safeReply = reply.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    repliesHTML += `
                        <div class="reply-item">
                            <div class="user-avatar" style="width: 28px; height: 28px; background: ${replierAvatar}; flex-shrink: 0; margin: 0; background-size: cover; cursor: pointer;" onclick="window.openProfile('${reply.authorId}')"></div>
                            <div style="flex: 1;">
                                <div style="display:flex; align-items: center; gap: 4px; cursor: pointer;" onclick="window.openProfile('${reply.authorId}')">
                                    <span style="font-weight: bold; color: inherit;">${escapeHtml(replierName)}</span>
                                    <span style="color: #71767b; font-size: 13px;">${escapeHtml(replierHandle)}</span>
                                </div>
                                <div style="margin-top: 2px; color: inherit;">${safeReply}</div>
                            </div>
                        </div>
                    `;
                });

                let replySectionHTML = `
                    <div id="reply-section-${post.id}" style="display: ${activeReplyPostId === post.id ? 'block' : 'none'}; margin-top: 12px; width: 100%;">
                        <div style="display: flex; gap: 8px; align-items: center; border-top: 1px solid #2f3336; padding-top: 12px;">
                            <input type="text" id="reply-input-${post.id}" placeholder="Post your reply..." style="flex: 1; background: transparent; border: 1px solid #2f3336; padding: 8px 12px; border-radius: 50px; color: inherit; outline: none; font-size: 14px;" onfocus="window.checkAuthOrAction(event)">
                            <button class="send-btn" style="padding: 6px 16px; font-size: 14px;" onclick="window.checkAuthOrAction(event, () => window.submitReply('${post.id}'))">Reply</button>
                        </div>
                        ${repliesHTML}
                    </div>
                `;

                const hasRepliedByMe = (post.replies || []).some(r => r.authorId === currentUser.id);
                const replyFill = hasRepliedByMe ? 'var(--accent)' : 'currentColor';
                const replyStyle = hasRepliedByMe ? 'color: var(--accent);' : '';
                const replyIconPath = hasRepliedByMe 
                    ? 'M12 2C6.48 2 2 5.58 2 10c0 2.39 1.4 4.54 3.65 5.86l-.88 3.54c-.1.39.26.74.63.63l3.86-1.12C10.15 19.68 11.06 20 12 20c5.52 0 10-3.58 10-8s-4.48-8-10-8z'
                    : 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z';

                const likeFill = likedByMe ? '#f91880' : 'currentColor';
                const likeStyle = likedByMe ? 'color: #f91880;' : '';
                const likeIconPath = likedByMe 
                    ? 'M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3C7.121 18.31 4.471 15.67 3.116 13.19 1.76 10.69 1.71 8.33 2.606 6.52c.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z'
                    : 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z';

                const html = `
                    <div class="tweet tweet-animated" style="flex-direction: column; --stagger: ${stagger}s;">
                        <div style="display: flex; gap: 12px; width: 100%;">
                            <div class="tweet-avatar" style="background: ${displayAvatar};" onclick="window.openProfile('${post.authorId}')"></div>
                            <div class="tweet-body">
                                <div class="tweet-header-info">
                                    <span class="username" onclick="window.openProfile('${post.authorId}')">${displayName}</span>
                                    <span class="handle">${displayHandle}</span>
                                    <span class="timestamp">· ${post.date}</span>
                                    ${inlineFollowBtn}
                                    ${postOptionsHTML}
                                </div>
                                ${contentHTML}
                                <div class="tweet-actions">
                                    <div class="tweet-action" style="${replyStyle}" onclick="window.toggleReplySection('${post.id}')">
                                        <div class="tweet-action-icon"><svg viewBox="0 0 24 24" fill="${replyFill}"><path d="${replyIconPath}"/></svg></div>
                                        <span>${(post.replies||[]).length}</span>
                                    </div>
                                    <div class="tweet-action like" style="${likeStyle}" onclick="window.checkAuthOrAction(event, () => window.toggleLikePost('${post.id}'))">
                                        <div class="tweet-action-icon"><svg viewBox="0 0 24 24" fill="${likeFill}"><path d="${likeIconPath}"/></svg></div>
                                        <span>${post.likes}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${replySectionHTML}
                    </div>
                `;

                if(feed) feed.innerHTML += html;
                if (profileFeed && (currentViewedProfileId === post.authorId || (currentViewedProfileId==='me' && isMine))) {
                    profileFeed.innerHTML += html;
                }
            });

            if (feed && postsData.length === 0) {
                feed.innerHTML = `
                    <div class="feed-empty">
                        <div class="feed-empty-icon">✨</div>
                        <h3>Your feed is ready for takeoff</h3>
                        <p>Posts from people you follow will land here. Go explore—or drop your first post above.</p>
                    </div>`;
            }

            const profileViewId = currentViewedProfileId === 'me' ? currentUser.id : currentViewedProfileId;
            const hasProfilePosts = postsData.some(p => p.authorId === profileViewId);
            if (profileFeed && !hasProfilePosts) {
                const isMe = currentViewedProfileId === 'me' || currentViewedProfileId === currentUser.id;
                profileFeed.innerHTML = isMe
                    ? `<div class="feed-empty"><div class="feed-empty-icon">📝</div><h3>No posts yet</h3><p>Say hello to the world—your first post is one tap away.</p></div>`
                    : `<div class="feed-empty"><div class="feed-empty-icon">🌙</div><h3>No posts yet</h3><p>This user has not posted anything yet.</p></div>`;
            }

            const myCount = postsData.filter(p => p.authorId === (currentViewedProfileId==='me'?currentUser.id:currentViewedProfileId)).length;
            if(document.getElementById('profile-header-posts')) document.getElementById('profile-header-posts').innerText = `${myCount} posts`;

            renderMediaGallery();
        }
        window.renderPosts = renderPosts;

        function renderMediaGallery() {
            const container = document.getElementById('media-gallery-feed');
            if (!container) return;
            const withMedia = postsData.filter(p => p.media && p.media.url);
            if (withMedia.length === 0) {
                container.innerHTML = `
                    <div class="media-empty">
                        <h3>No media yet</h3>
                        <p>When anyone shares a photo or video in a post, it will show up here in one scrollable gallery.</p>
                    </div>`;
                return;
            }
            const sorted = [...withMedia].sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
            container.innerHTML = sorted.map(post => {
                const liveAuthor = globalUsers[post.authorId];
                const name = escapeHtml(liveAuthor ? liveAuthor.name : post.authorName);
                const handle = escapeHtml(liveAuthor ? liveAuthor.handle : post.authorHandle);
                const avatar = liveAuthor ? liveAuthor.avatar : post.authorAvatar;
                const captionRaw = (post.content || '').trim();
                const caption = captionRaw
                    ? escapeHtml(captionRaw).replace(/\n/g, '<br>')
                    : '';
                const mediaEl = post.media.isVideo
                    ? `<video src="${post.media.url}" controls playsinline preload="metadata"></video>`
                    : `<img src="${post.media.url}" alt="" loading="lazy" decoding="async">`;
                return `
                    <article class="media-card">
                        <div class="media-card-visual-wrap">${mediaEl}</div>
                        <div class="media-card-footer">
                            <div class="media-card-avatar" style="background:${avatar}; background-size:cover;" role="button" tabindex="0" onclick="window.openProfile('${post.authorId}')"></div>
                            <div class="media-card-text">
                                <div class="media-card-name" onclick="window.openProfile('${post.authorId}')">${name}</div>
                                <div class="media-card-handle">${handle}</div>
                                ${caption ? `<div class="media-card-caption">${caption}</div>` : ''}
                            </div>
                        </div>
                    </article>`;
            }).join('');
        }
        window.renderMediaGallery = renderMediaGallery;

        window.toggleSendButton = () => {
            const btn = document.getElementById('sendBtn');
            btn.disabled = document.getElementById('tweetInput').value.trim().length === 0 && !composeAttachedMedia;
            window.updateCharCount();
        };

        const MAX_POST_LENGTH = 280;

        async function sendPost() {
            const inputField = document.getElementById('tweetInput');
            const content = inputField.value;

            if (window.containsProfanity(content)) {
                alert("Your post contains inappropriate language and cannot be published.");
                return;
            }
            if (content.length > MAX_POST_LENGTH) {
                alert(`Posts are limited to ${MAX_POST_LENGTH} characters.`);
                return;
            }

            if (content.trim().length > 0 || composeAttachedMedia) {
                const newPost = {
                    id: Date.now().toString(),
                    authorId: currentUser.id,
                    authorName: currentUser.name,
                    authorHandle: currentUser.handle,
                    authorAvatar: currentUser.avatar,
                    date: window.getTodayString(),
                    content: content,
                    media: composeAttachedMedia,
                    likes: 0,
                    likedByUsers: [],
                    replies: []
                };
                
                inputField.value = '';
                composeAttachedMedia = null;
                window.renderComposePreview();
                window.toggleSendButton();
                
                postsData.push(newPost);
                window.renderPosts();
                await savePostToDb(newPost);
                showToast('Posted — your thoughts are live!', 'success');

                // --- BUDDY BOT AUTO-INTERACTION ---
                if (content.toLowerCase().includes('@zigazoobuddy')) {
                    setTimeout(async () => {
                        const post = postsData.find(p => p.id === newPost.id);
                        if (post) {
                            if(!post.likedByUsers) post.likedByUsers = [];
                            post.likedByUsers.push('u_buddy');
                            post.likes++;
                            
                            post.replies.push({
                                authorId: 'u_buddy',
                                name: globalUsers['u_buddy'].name,
                                handle: globalUsers['u_buddy'].handle,
                                avatar: globalUsers['u_buddy'].avatar,
                                text: 'I see you mentioned me! Looking good! ✨'
                            });
                            
                            const likeNotif = { id: Date.now().toString()+'L', type: 'like', sourceUserId: 'u_buddy', text: 'liked your post', timestamp: Date.now(), targetUserId: currentUser.id };
                            const replyNotif = { id: Date.now().toString()+'R', type: 'reply', sourceUserId: 'u_buddy', text: 'replied to your post', timestamp: Date.now(), targetUserId: currentUser.id };
                            
                            notifications.unshift(likeNotif, replyNotif);
                            await putOfflineData('notifications', likeNotif);
                            await putOfflineData('notifications', replyNotif);
                            
                            window.updateNotificationBadge();
                            if(document.getElementById('notifications-page').style.display === 'block') window.renderNotifications();
                            window.renderPosts();
                            await savePostToDb(post);
                        }
                    }, 2000);
                }
            }
        }
        window.sendPost = sendPost;

        window.startEditPost = (id) => {
            editingPostId = id; window.renderPosts();
            setTimeout(() => { const el = document.getElementById(`edit-post-input-${id}`); if(el) { el.focus(); el.selectionStart = el.value.length; } }, 0);
        };

        window.cancelEditPost = () => { editingPostId = null; window.renderPosts(); };

        window.saveEditPost = async (id) => {
            const newContent = document.getElementById(`edit-post-input-${id}`).value.trim();
            if (newContent.length > MAX_POST_LENGTH) return alert(`Posts are limited to ${MAX_POST_LENGTH} characters.`);
            if (window.containsProfanity(newContent)) return alert("Inappropriate language.");
            
            const idx = postsData.findIndex(p => p.id === id);
            if(idx !== -1) {
                postsData[idx].content = newContent;
                window.renderPosts();
                await savePostToDb(postsData[idx]);
            }
            editingPostId = null;
            if(!useFirebase) window.renderPosts();
        };

        window.deletePost = async (id) => {
            postsData = postsData.filter(p => p.id !== id);
            window.renderPosts();
            await removePostFromDb(id);
        };

        window.toggleLikePost = async (id) => {
            const post = postsData.find(p => p.id === id);
            if(post) {
                if(!post.likedByUsers) post.likedByUsers = [];
                const lIdx = post.likedByUsers.indexOf(currentUser.id);
                if(lIdx > -1) {
                    post.likedByUsers.splice(lIdx, 1);
                    post.likes--;
                } else {
                    post.likedByUsers.push(currentUser.id);
                    post.likes++;
                    window.pushNotification(post.authorId, 'like', 'liked your post');
                }
                window.renderPosts();
                await savePostToDb(post);
            }
        };

        window.toggleReplySection = (id) => { activeReplyPostId = (activeReplyPostId === id) ? null : id; window.renderPosts(); };

        window.submitReply = async (postId) => {
            const text = document.getElementById(`reply-input-${postId}`).value.trim();
            if (window.containsProfanity(text)) return alert("Inappropriate language.");
            
            const post = postsData.find(p => p.id === postId);
            if(post && text) {
                if(!post.replies) post.replies = [];
                post.replies.push({
                    authorId: currentUser.id,
                    name: currentUser.name,
                    handle: currentUser.handle,
                    avatar: currentUser.avatar,
                    text: text
                });
                
                window.renderPosts();
                window.pushNotification(post.authorId, 'reply', `replied to your post: "${text.substring(0,25)}${text.length > 25 ? '...' : ''}"`);
                await savePostToDb(post);
            }
        };