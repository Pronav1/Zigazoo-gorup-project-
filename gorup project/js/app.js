/* ========================================================================== */
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // Firebase References
        let db, auth, appId, currentUserId;
        let useFirebase = false;

        let offlineDB = null;
        let dbInitPromise = null;

/* ========================================================================== */
        let unsubUsers, unsubPosts, unsubProfile, unsubChats, unsubNotifs;

        async function handleFirebaseError(err) {
            console.warn("Firebase operation failed, falling back to local mode.", err);
            if (useFirebase) {
                useFirebase = false;
                if(unsubUsers) unsubUsers();
                if(unsubPosts) unsubPosts();
                if(unsubProfile) unsubProfile();
                if(unsubChats) unsubChats();
                if(unsubNotifs) unsubNotifs();
                
                const toast = document.createElement('div');
                toast.innerText = "Cloud restricted. Switched to offline mode.";
                toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#f4212e; color:#fff; padding:12px 24px; border-radius:50px; z-index:9999;";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
                
                // Ensure everything in memory is dumped to IDB
                for (let p of postsData) await putOfflineData('posts', p);
                for (let uid in globalUsers) await putOfflineData('globalUsers', globalUsers[uid]);
                await putOfflineData('profile', currentUser);
            }
        }

        // --- 4. FIREBASE & OFFLINE WRAPPERS ---
        async function saveProfileToDb(profileData) {
            if(useFirebase && currentUserId && !currentUserId.startsWith('local_') && !profileData.isGuest) {
                try {
                    // Save privately
                    await setDoc(doc(db, 'artifacts', appId, 'users', currentUserId, 'profile', 'data'), profileData);
                    // Save publicly for exploration/display globally
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUserId), profileData);
                } catch(e) {
                    await handleFirebaseError(e);
                    await fallbackSave();
                }
            } else if (!profileData.isGuest) {
                await fallbackSave();
            }
            
            async function fallbackSave() {
                await putOfflineData('profile', profileData);
                globalUsers[profileData.id] = profileData;
                await putOfflineData('globalUsers', profileData);
            }
        }

        async function savePostToDb(postObj) {
            if(useFirebase && currentUserId && !currentUserId.startsWith('local_')) {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', postObj.id), postObj);
                } catch (e) {
                    await handleFirebaseError(e);
                    await putOfflineData('posts', postObj);
                }
            } else {
                await putOfflineData('posts', postObj);
            }
        }

        async function removePostFromDb(postId) {
            if(useFirebase && currentUserId && !currentUserId.startsWith('local_')) {
                try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', postId)); } catch(e) { await handleFirebaseError(e); }
            } else {
                await deleteOfflineData('posts', postId);
            }
        }

        async function saveChatToDb(otherUserId, messages) {
            if(useFirebase && currentUserId && !currentUserId.startsWith('local_')) {
                try { 
                    // 1. Save normal messages to MY inbox
                    await setDoc(doc(db, 'artifacts', appId, 'users', currentUserId, 'chats', otherUserId), { messages }); 
                    
                    // 2. Save FLIPPED messages to THEIR inbox (True Multiplayer Sync)
                    if(otherUserId !== 'u_buddy' && !otherUserId.startsWith('local_')) {
                        const partnerMessages = messages.map(msg => ({
                            ...msg,
                            type: msg.type === 'sent' ? 'received' : 'sent'
                        }));
                        await setDoc(doc(db, 'artifacts', appId, 'users', otherUserId, 'chats', currentUserId), { messages: partnerMessages }); 
                    }
                } catch(e) {
                    await handleFirebaseError(e);
                    await putOfflineData('chats', { id: otherUserId, messages });
                }
            } else {
                await putOfflineData('chats', { id: otherUserId, messages });
            }
        }


        // --- 5. INITIALIZATION & DATABASE LISTENERS ---

        function setupDatabaseListeners() {
            // Setup Public Users Directory
            if(unsubUsers) unsubUsers();
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            unsubUsers = onSnapshot(usersRef, (snap) => {
                snap.docs.forEach(d => { globalUsers[d.id] = d.data(); });
                window.renderPosts(); 
                window.renderWhoToFollow();
                if(document.getElementById('explore-search-input').value) window.handleExploreSearch();
            }, (error) => {
                console.error("Firebase Read Error:", error);
            });

            // Setup Posts
            if(unsubPosts) unsubPosts();
            const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
            unsubPosts = onSnapshot(postsRef, (snapshot) => {
                postsData = snapshot.docs.map(d => d.data());
                postsData.sort((a,b) => parseInt(a.id) - parseInt(b.id));
                window.renderPosts();
            }, (error) => console.error("Posts Listen Error", error));

            if (currentUserId && !currentUserId.startsWith('local_')) {
                if(unsubProfile) unsubProfile();
                const profileRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'profile', 'data');
                unsubProfile = onSnapshot(profileRef, (docSnap) => {
                    if(docSnap.exists()) {
                        currentUser = { ...currentUser, ...docSnap.data(), isGuest: false };
                        window.applyTheme(currentUser.isLightMode);
                    } else {
                        currentUser.isGuest = true;
                    }
                    window.updateUIProfileElements();
                    window.renderWhoToFollow();
                    window.updateNotificationBadge();
                    
                    const lo = document.getElementById('loader-overlay');
                    const ac = document.getElementById('app-container');
                    if(lo) lo.style.display = 'none';
                    if(ac) ac.style.opacity = '1';
                }, (error) => {
                    console.error("Profile Listen Error", error);
                    const lo = document.getElementById('loader-overlay');
                    const ac = document.getElementById('app-container');
                    if (lo) lo.style.display = 'none';
                    if (ac) ac.style.opacity = '1';
                });

                if(unsubChats) unsubChats();
                const chatsRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'chats');
                unsubChats = onSnapshot(chatsRef, (snapshot) => {
                    globalChats = {};
                    snapshot.docs.forEach(d => { globalChats[d.id] = d.data().messages; });
                    window.renderChatList();
                    if(activeChatUserId) window.renderChatHistory();
                }, (error) => console.error("Chats Listen Error", error));
                
                if(unsubNotifs) unsubNotifs();
                const notifsRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'notifications');
                unsubNotifs = onSnapshot(notifsRef, (snapshot) => {
                    const incomingNotifs = snapshot.docs.map(d => d.data());
                    incomingNotifs.sort((a,b) => b.timestamp - a.timestamp);
                    notifications = incomingNotifs;
                    
                    window.updateNotificationBadge();
                    if(document.getElementById('notifications-page').style.display === 'block') {
                        window.renderNotifications();
                    }
                }, (error) => console.error("Notifs Listen Error", error));

            } else {
                const lo = document.getElementById('loader-overlay');
                const ac = document.getElementById('app-container');
                if(lo) lo.style.display = 'none';
                if(ac) ac.style.opacity = '1';
                window.updateUIProfileElements();
                window.renderWhoToFollow();
            }
        }

        async function startAppOffline() {
            console.log("Running in offline/in-memory mode with IndexedDB persistence");
            const lm = document.getElementById('loader-message');
            const ls = document.getElementById('loader-sub');
            if (lm) lm.textContent = 'Loading local data…';
            if (ls) ls.textContent = 'Reading saved posts and chats on this device';

            try {
                await initOfflineDB();
                
                const profiles = await getOfflineData('profile');
                if (profiles && profiles.length > 0) {
                    currentUser = { ...currentUser, ...profiles[0], isGuest: false };
                    window.applyTheme(currentUser.isLightMode);
                } else {
                    currentUser.isGuest = true;
                }

                const savedUsers = await getOfflineData('globalUsers');
                if (savedUsers && savedUsers.length > 0) {
                    savedUsers.forEach(u => globalUsers[u.id] = u);
                } else {
                    for(let k in mockUsers) await putOfflineData('globalUsers', mockUsers[k]);
                }

                const savedPosts = await getOfflineData('posts');
                if (savedPosts && savedPosts.length > 0) {
                    postsData = savedPosts.sort((a,b) => parseInt(a.id) - parseInt(b.id));
                } else {
                    postsData = [
                        { id: "1001", authorId: 'u1', authorName: mockUsers['u1'].name, authorHandle: mockUsers['u1'].handle, authorAvatar: mockUsers['u1'].avatar, date: 'Oct 24', content: 'Just discovered this amazing new AI tool! 🚀', media: null, likes: 42, likedByUsers: [], replies: [] }
                    ];
                    await putOfflineData('posts', postsData[0]);
                }

                const savedChats = await getOfflineData('chats');
                globalChats = {};
                if (savedChats) {
                    savedChats.forEach(c => { globalChats[c.id] = c.messages; });
                }
                
                const savedNotifs = await getOfflineData('notifications');
                if (savedNotifs) {
                    notifications = savedNotifs.filter(n => n.targetUserId === currentUser.id || (!n.targetUserId && !currentUser.isGuest));
                    notifications.sort((a,b) => b.timestamp - a.timestamp);
                }
                
            } catch(err) {
                console.error("Offline DB Error:", err);
                currentUser.isGuest = true;
                postsData = [
                    { id: "1001", authorId: 'u1', authorName: mockUsers['u1'].name, authorHandle: mockUsers['u1'].handle, authorAvatar: mockUsers['u1'].avatar, date: 'Oct 24', content: 'Just discovered this amazing new AI tool! 🚀', media: null, likes: 42, likedByUsers: [], replies: [] }
                ];
            }

            const lo = document.getElementById('loader-overlay');
            const ac = document.getElementById('app-container');
            if(lo) lo.style.display = 'none';
            if(ac) ac.style.opacity = '1';
            window.updateUIProfileElements();
            window.renderPosts();
            window.renderWhoToFollow();
            if(!currentUser.isGuest) {
                window.renderChatList();
                window.updateNotificationBadge();
            }
        }

        const myFirebaseConfig = {
          "projectId": "z---mini-blogging-app",
          "appId": "1:605370869757:web:f7bb1c99a39015de9e5b94",
          "storageBucket": "z---mini-blogging-app.firebasestorage.app",
          "apiKey": "AIzaSyBiQ_03h0pBfGEhnxNBkD8CSOxRzb1Ks7w",
          "authDomain": "z---mini-blogging-app.firebaseapp.com",
          "messagingSenderId": "605370869757",
          "measurementId": "G-W4TLPBPDBL",
          "projectNumber": "605370869757",
          "version": "2"
        };
        
        const isFirebaseConfigured = true; 

        if (isFirebaseConfigured || typeof __firebase_config !== 'undefined') {
            try {
                useFirebase = true;
                const configToUse = isFirebaseConfigured ? myFirebaseConfig : JSON.parse(__firebase_config);
                const app = initializeApp(configToUse);
                auth = getAuth(app);
                db = getFirestore(app);
                appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

                const initAuth = async () => {
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            try {
                                await signInWithCustomToken(auth, __initial_auth_token);
                            } catch (tokenError) {
                                console.warn("Custom token mismatch... proceeding without it.", tokenError);
                            }
                        }
                        if (!auth.currentUser) {
                            try {
                                await signInAnonymously(auth);
                            } catch (anonError) {
                                console.warn("Anonymous auth disabled in Firebase. Proceeding as guest (unauthenticated).", anonError);
                            }
                        }
                    } catch (authError) {
                        console.error("Auth init error", authError);
                    }
                };
                
                initAuth().then(() => {
                    onAuthStateChanged(auth, (user) => {
                        if (user) {
                            currentUserId = user.uid;
                            currentUser.id = currentUserId;
                        } else {
                            currentUserId = null;
                            currentUser.isGuest = true;
                        }
                        setupDatabaseListeners();
                    });
                });
            } catch (error) {
                console.error("Firebase connection error", error);
                useFirebase = false;
                startAppOffline();
            }
        } else {
            startAppOffline();
        }

        window.onload = () => {
            window.switchPage(null, 'home-page');
            document.getElementById('sidebar-user-avatar').style.background = currentUser.avatar;
            document.getElementById('home-compose-avatar').style.background = currentUser.avatar;
            document.getElementById('settings-account-handle').innerText = currentUser.handle;
            window.updateCharCount();
            const hint = document.getElementById('compose-shortcut-hint');
            if (hint && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
                hint.textContent = '⌘ + Enter to post';
            }
        };