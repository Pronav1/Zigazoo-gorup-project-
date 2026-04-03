/* ========================================================================== */
        function updateUIProfileElements() {
            document.getElementById('sidebar-user-name').innerText = escapeHtml(currentUser.name);
            document.getElementById('sidebar-user-handle').innerText = escapeHtml(currentUser.handle);
            document.getElementById('sidebar-user-avatar').style.background = currentUser.avatar;
            document.getElementById('home-compose-avatar').style.background = currentUser.avatar;
            document.getElementById('settings-account-handle').innerText = escapeHtml(currentUser.handle);

            if (currentUser.isGuest) {
                document.getElementById('main-post-btn-text').innerText = "Sign Up to Post";
                document.getElementById('home-compose-area').style.opacity = '0.5';
                document.getElementById('settings-guest-prompt').style.display = 'block';
            } else {
                document.getElementById('main-post-btn-text').innerText = "Post";
                document.getElementById('home-compose-area').style.opacity = '1';
                document.getElementById('settings-guest-prompt').style.display = 'none';
            }
        }
        window.updateUIProfileElements = updateUIProfileElements;

        window.updateNotificationBadge = () => {
            const unreadCount = notifications.filter(n => n.timestamp > (currentUser.lastCheckedNotifs || 0)).length;
            const badge = document.getElementById('notif-badge');
            if(unreadCount > 0) {
                badge.style.display = 'block';
                badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.animation = 'pulse 2s infinite';
            } else {
                badge.style.display = 'none';
                badge.style.animation = 'none';
            }
        };
        
        window.clearNotifBadge = () => {
            currentUser.lastCheckedNotifs = Date.now();
            if(!currentUser.isGuest) saveProfileToDb(currentUser);
            window.updateNotificationBadge();
            window.renderNotifications();
        };

        window.renderNotifications = () => {
            const container = document.getElementById('notifications-list');
            if(notifications.length === 0) {
                container.innerHTML = '<div style="padding: 30px; text-align: center; color: #71767b;">You\'re all caught up! No notifications yet.</div>';
                return;
            }
            container.innerHTML = '';
            
            notifications.forEach(notif => {
                let icon = '';
                if(notif.type === 'like') {
                    icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="#f91880"><path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3C7.121 18.31 4.471 15.67 3.116 13.19 1.76 10.69 1.71 8.33 2.606 6.52c.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/></svg>';
                } else if(notif.type === 'follow') {
                    icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="var(--accent)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                } else if(notif.type === 'reply') {
                    icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="var(--accent)"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/></svg>';
                } else if(notif.type === 'message') {
                    icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.636V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"/></svg>';
                }
                
                const sourceUser = globalUsers[notif.sourceUserId] || { name: 'Someone', avatar: DEFAULT_AVATAR };
                const timeStr = window.timeAgo(notif.timestamp);
                const isUnread = notif.timestamp > (currentUser.lastCheckedNotifs || 0);
                const bgStyle = isUnread ? (currentUser.isLightMode ? 'background-color: rgba(29, 155, 240, 0.1);' : 'background-color: rgba(29, 155, 240, 0.15);') : '';

                container.innerHTML += `
                    <div class="message-item" style="${bgStyle}" onclick="window.openProfile('${notif.sourceUserId}')">
                        <div style="margin-right: 12px; display:flex; align-items:center;">${icon}</div>
                        <div class="message-avatar" style="background:${sourceUser.avatar}; background-size: cover; background-position: center; width:36px; height:36px;"></div>
                        <div class="message-content" style="display:flex; flex-direction:column; justify-content:center;">
                            <div><span class="username">${escapeHtml(sourceUser.name)}</span> <span style="color:#71767b; font-size:14px;">${escapeHtml(notif.text)}</span></div>
                            <div style="color:#71767b; font-size:13px; margin-top:4px;">${timeStr}</div>
                        </div>
                    </div>
                `;
            });
        };

        window.pushNotification = async (targetUserId, type, text) => {
            if (targetUserId === currentUser.id || currentUser.isGuest) return; 
            
            const notifId = Date.now().toString() + Math.floor(Math.random()*1000);
            const notif = {
                id: notifId,
                type: type,
                sourceUserId: currentUser.id,
                text: text,
                timestamp: Date.now()
            };
            
            try {
                if (useFirebase && currentUserId && !currentUserId.startsWith('local_')) {
                    await setDoc(doc(db, 'artifacts', appId, 'users', targetUserId, 'notifications', notifId), notif);
                } else {
                    notif.targetUserId = targetUserId;
                    await putOfflineData('notifications', notif);
                }
            } catch (err) {
                console.warn("Notification push restricted or failed.");
            }
        };

        function handleEditAvatarSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingAvatarUpdate = `url("${e.target.result}") center/cover no-repeat`;
                document.getElementById('editProfileAvatarPreview').style.background = pendingAvatarUpdate;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }
        window.handleEditAvatarSelect = handleEditAvatarSelect;

        function openProfile(userId) {
            currentViewedProfileId = userId;
            
            document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById('profile-posts-container').style.display = 'block';
            document.querySelectorAll('#profile-tabs .tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#profile-tabs .tab')[0].classList.add('active');

            let userObj = (userId === 'me' || userId === currentUser.id) ? currentUser : globalUsers[userId];
            if(!userObj) return;

            if (userId === 'me' || userId === currentUser.id) {
                document.getElementById('edit-profile-btn-group').style.display = 'flex';
                document.getElementById('other-profile-btn-group').style.display = 'none';
                document.getElementById('profile-following').innerHTML = `<span>${currentUser.followingList.length}</span> Following`;
                document.getElementById('profile-followers').innerHTML = `<span>${currentUser.followers}</span> Followers`;
            } else {
                document.getElementById('edit-profile-btn-group').style.display = 'none';
                document.getElementById('other-profile-btn-group').style.display = 'flex';
                const isFollowing = currentUser.followingList.includes(userId);
                const fBtn = document.getElementById('other-follow-btn');
                if (isFollowing) { fBtn.innerText = 'Following'; fBtn.className = 'follow-btn following'; } 
                else { fBtn.innerText = 'Follow'; fBtn.className = 'follow-btn not-following'; }
                
                let displayedFollowers = userObj.followers + (isFollowing ? 1 : 0);
                document.getElementById('profile-following').innerHTML = `<span>${userObj.followingList ? userObj.followingList.length : 0}</span> Following`;
                document.getElementById('profile-followers').innerHTML = `<span>${displayedFollowers}</span> Followers`;
            }

            document.getElementById('profile-header-name').innerText = escapeHtml(userObj.name);
            document.getElementById('main-profile-name').innerText = escapeHtml(userObj.name);
            document.getElementById('main-profile-handle').innerText = escapeHtml(userObj.handle);
            document.getElementById('main-profile-bio').innerText = escapeHtml(userObj.bio || '');
            document.getElementById('main-profile-avatar').style.background = userObj.avatar;
            document.getElementById('settings-account-handle').innerText = escapeHtml(currentUser.handle);
            
            window.renderPosts();
            window.switchPage(null, 'profile-page');
        }
        window.openProfile = openProfile;

        window.switchProfileTab = (event, targetId) => {
            document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(targetId).style.display = 'block';
            document.querySelectorAll('#profile-tabs .tab').forEach(t => t.classList.remove('active'));
            event.currentTarget.classList.add('active');
        };

        window.openEditProfileModal = () => {
            if(currentUser.isGuest) return window.openAuthModal();
            document.getElementById('editProfileModal').style.display = 'flex';
            document.getElementById('editName').value = currentUser.name;
            document.getElementById('editHandle').value = currentUser.handle;
            document.getElementById('editBio').value = currentUser.bio;
            pendingAvatarUpdate = currentUser.avatar;
            document.getElementById('editProfileAvatarPreview').style.background = pendingAvatarUpdate;
        };

        window.closeEditProfileModal = () => document.getElementById('editProfileModal').style.display = 'none';

        async function saveProfile() {
            const rawName = document.getElementById('editName').value.trim();
            const rawHandle = document.getElementById('editHandle').value.trim().replace(/^@+/, '');
            if (!rawName) return alert("Name cannot be empty.");
            if (rawName.length > 50) return alert("Display name must be 50 characters or fewer.");
            if (!/^[a-zA-Z0-9_.]{2,30}$/.test(rawHandle)) return alert("Handle: 2–30 characters (letters, numbers, underscore, dot).");
            currentUser.name = rawName;
            currentUser.handle = '@' + rawHandle;
            currentUser.bio = document.getElementById('editBio').value.trim().slice(0, 160);
            currentUser.avatar = pendingAvatarUpdate;

            await saveProfileToDb(currentUser);

            let changed = false;
            for(let p of postsData) {
                if(p.authorId === currentUser.id) {
                    p.authorName = currentUser.name;
                    p.authorHandle = currentUser.handle;
                    p.authorAvatar = currentUser.avatar;
                    await savePostToDb(p);
                    changed = true;
                }
            }

            window.updateUIProfileElements();
            window.openProfile('me');
            if(!useFirebase && changed) window.renderPosts(); // Fallback update
            window.closeEditProfileModal();
            showToast('Profile updated — looking good!', 'success');
        }
        window.saveProfile = saveProfile;

        async function toggleFollowUser(userId) {
            const index = currentUser.followingList.indexOf(userId);
            if (index === -1) {
                currentUser.followingList.push(userId);
                window.pushNotification(userId, 'follow', 'followed you');
            } else {
                currentUser.followingList.splice(index, 1);
            }
            
            await saveProfileToDb(currentUser);
            
            window.renderWhoToFollow();
            if(document.getElementById('tab-following').classList.contains('active')) window.renderHomeFollowingList();
            window.renderPosts();
            
            if (currentViewedProfileId === userId || currentViewedProfileId === 'me' || currentViewedProfileId === currentUser.id) {
                window.openProfile(currentViewedProfileId); 
            }
        }
        window.toggleFollowUser = toggleFollowUser;

        window.toggleFollowUserFromProfile = () => {
            if(currentViewedProfileId !== 'me' && currentViewedProfileId !== currentUser.id) {
                window.toggleFollowUser(currentViewedProfileId);
            }
        };