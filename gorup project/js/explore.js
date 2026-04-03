/* ========================================================================== */
        function handleExploreSearch() {
            const query = document.getElementById('explore-search-input').value.toLowerCase().trim();
            const resultsDiv = document.getElementById('explore-results');
            if(!query) return resultsDiv.innerHTML = `<div class="feed-empty" style="padding: 48px 16px;"><div class="feed-empty-icon" style="font-size: 40px;">🔎</div><h3 style="font-size: 18px;">Find your people</h3><p>Type a name or @handle to discover profiles.</p></div>`;

            const filtered = [currentUser, ...Object.values(globalUsers)].filter(u => u.name.toLowerCase().includes(query) || u.handle.toLowerCase().includes(query));
            if(filtered.length === 0) return resultsDiv.innerHTML = `<div class="feed-empty" style="padding: 40px 16px;"><div class="feed-empty-icon" style="font-size: 36px;">🤷</div><h3 style="font-size: 18px;">No matches</h3><p>Try another spelling or keyword.</p></div>`;

            const uniqueFiltered = Array.from(new Set(filtered.map(a => a.id))).map(id => filtered.find(a => a.id === id));

            resultsDiv.innerHTML = uniqueFiltered.map(user => `
                <div class="message-item" onclick="window.openProfile('${user.id}')">
                    <div class="message-avatar" style="background: ${user.avatar}; background-size: cover;"></div>
                    <div class="message-content" style="display:flex; flex-direction: column; justify-content: center;">
                        <div class="username">${escapeHtml(user.name)}</div>
                        <div class="handle">${escapeHtml(user.handle)}</div>
                    </div>
                </div>
            `).join('');
        }
        window.handleExploreSearch = handleExploreSearch;

        function renderWhoToFollow() {
            const container = document.getElementById('who-to-follow-widget');
            if(!container) return;
            container.innerHTML = '<div class="widget-header">Who to follow</div>';
            
            Object.values(globalUsers).filter(u => u.id !== currentUser.id).slice(0, 3).forEach(user => {
                const isF = currentUser.followingList.includes(user.id);
                container.innerHTML += `
                    <div class="message-item" style="border-bottom:none; padding: 12px 16px;">
                        <div class="message-avatar" style="background: ${user.avatar}; background-size:cover; width: 40px; height: 40px; cursor: pointer;" onclick="window.openProfile('${user.id}')"></div>
                        <div class="message-content" style="display:flex; align-items:center; justify-content:space-between;">
                            <div style="cursor: pointer;" onclick="window.openProfile('${user.id}')">
                                <div class="username">${escapeHtml(user.name)}</div>
                                <div class="handle">${escapeHtml(user.handle)}</div>
                            </div>
                            <button class="send-btn follow-btn ${isF ? 'following' : ''}" style="padding: 4px 12px; font-size: 13px; min-width: 75px;" onclick="window.checkAuthOrAction(event, () => window.toggleFollowUser('${user.id}'))">${isF ? 'Following' : 'Follow'}</button>
                        </div>
                    </div>
                `;
            });
        }
        window.renderWhoToFollow = renderWhoToFollow;

        function renderHomeFollowingList() {
            const container = document.getElementById('home-following-content');
            if(!container) return;
            container.innerHTML = '';
            if (currentUser.followingList.length === 0) return container.innerHTML = `<div style="padding: 40px; text-align: center; color: #71767b;">You aren't following anyone yet.</div>`;

            currentUser.followingList.forEach(id => {
                const u = globalUsers[id];
                if(!u) return;
                container.innerHTML += `
                    <div class="message-item" onclick="window.openAccountActionModal('${id}')">
                        <div class="message-avatar" style="background: ${u.avatar}; background-size:cover;"></div>
                        <div class="message-content" style="display:flex; align-items:center; justify-content:space-between;">
                            <div><div class="username">${escapeHtml(u.name)}</div><div class="handle">${escapeHtml(u.handle)}</div></div>
                            <button class="send-btn follow-btn following" style="padding: 6px 16px; font-size: 14px;">Following</button>
                        </div>
                    </div>
                `;
            });
        }
        window.renderHomeFollowingList = renderHomeFollowingList;