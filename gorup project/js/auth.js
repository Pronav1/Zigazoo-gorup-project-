/* ========================================================================== */
        window.openAuthModal = () => document.getElementById('authModal').style.display = 'flex';
        window.closeAuthModal = () => document.getElementById('authModal').style.display = 'none';

        window.checkAuthOrAction = (event, actionFn) => {
            if(event) event.preventDefault();
            if (currentUser.isGuest) {
                window.openAuthModal();
            } else if (actionFn) {
                actionFn();
            }
        };

        window.signInWithGoogle = async () => {
            if (!useFirebase) {
                alert("Please add your Firebase config at the bottom of the code to enable Google Sign-In!");
                return;
            }

            if (window.location.protocol === 'file:') {
                alert("Google Sign-In cannot be used while opening the file directly from your computer (file:///).\n\nTo use Google Sign-In, you must host this file on a local server (like VS Code Live Server) or upload it to a web host.\n\nFor now, please use the 'Create account' button instead!");
                return;
            }
            
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                currentUserId = user.uid;

                const profileRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'profile', 'data');
                const docSnap = await getDoc(profileRef);

                if (!docSnap.exists()) {
                    const handleBase = user.displayName ? user.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user';
                    const newProfile = {
                        id: currentUserId,
                        name: user.displayName || "New User",
                        handle: `@${handleBase}${Math.floor(Math.random() * 1000)}`,
                        bio: "New to Z!",
                        avatar: user.photoURL ? `url('${user.photoURL}') center / cover no-repeat` : DEFAULT_AVATAR,
                        followers: 0,
                        followingList: [],
                        isLightMode: false,
                        isGuest: false,
                        lastCheckedNotifs: Date.now()
                    };
                    await saveProfileToDb(newProfile);
                    currentUser = newProfile;
                } else {
                    currentUser = { ...docSnap.data(), isGuest: false };
                }

                window.closeAuthModal();
                setupDatabaseListeners();
                window.updateUIProfileElements();
                window.renderPosts();
                window.renderWhoToFollow();
            } catch (error) {
                console.error("Google Sign-In Error", error);
                if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request' || error.message.includes('popup')) {
                    alert("Popup blocked! This usually happens in restricted preview environments. Please use the 'Create account' option below, or open the app in a new window/deploy it to use Google Sign-In.");
                } else {
                    alert("Failed to sign in with Google. " + error.message);
                }
            }
        };

        window.completeSignup = async () => {
            const name = document.getElementById('signup-name').value.trim();
            const handleRaw = document.getElementById('signup-handle').value.trim().replace(/^@+/, '');
            if(!name || !handleRaw) return alert("Please enter both a name and handle.");
            if (name.length > 50) return alert("Display name must be 50 characters or fewer.");
            if (!/^[a-zA-Z0-9_.]{2,30}$/.test(handleRaw)) return alert("Handle: 2–30 characters (letters, numbers, underscore, dot).");
            const handle = '@' + handleRaw;
            
            let newId = 'local_' + Date.now();
            if (useFirebase && auth && auth.currentUser) {
                newId = auth.currentUser.uid;
            }
            currentUserId = newId;
            
            currentUser = {
                id: newId,
                name: name,
                handle: handle,
                bio: "New to Zigazoo!",
                avatar: DEFAULT_AVATAR,
                followers: 0,
                followingList: [],
                isLightMode: false,
                isGuest: false,
                lastCheckedNotifs: Date.now()
            };

            await saveProfileToDb(currentUser);
            window.closeAuthModal();
            if (useFirebase) setupDatabaseListeners(); 
            window.updateUIProfileElements();
            window.renderPosts();
            window.renderWhoToFollow();
            showToast('Welcome to Zigazoo — glad you are here!', 'success');
        };

        window.signOutUser = async () => {
            if (useFirebase) {
                try {
                    await signOut(auth);
                    location.reload();
                } catch (error) {
                    console.error("Sign out error", error);
                }
            } else {
                location.reload();
            }
        };