/* ========================================================================== */
        const DEFAULT_AVATAR = "#536471 url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ffffff%22%3E%3Cpath d=%22M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%22/%3E%3C/svg%3E') center/60% no-repeat";
        const badWords = ["fuck", "shit", "bitch", "asshole", "damn", "crap"];

        let currentUser = {
            id: 'guest', name: "Guest User", handle: "Not signed in", bio: "Create an account to fully interact.",
            avatar: DEFAULT_AVATAR, followers: 0, followingList: [], isLightMode: false, isGuest: true, lastCheckedNotifs: 0
        };

        // Fallback dummy users
        let mockUsers = {
            'u_buddy': { id: 'u_buddy', name: 'Zigazoo Buddy', handle: '@zigazoobuddy', avatar: 'linear-gradient(45deg, #FF4D8C, #C084FC)', bio: 'I am a friendly bot! Send me a message or mention me in a post to test your notifications! 🤖', followers: 999, following: 1 },
            'u1': { id: 'u1', name: 'TechGuru', handle: '@techguru', avatar: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', bio: 'Sharing the latest in tech and AI.', followers: 15000, following: 300 },
            'u2': { id: 'u2', name: 'Alex Developer', handle: '@alexdev', avatar: '#fca311', bio: 'Building the web one div at a time.', followers: 800, following: 150 },
            'u3': { id: 'u3', name: 'Design Team', handle: '@designers', avatar: '#4ecdc4', bio: 'Pixels and perfection.', followers: 3200, following: 40 }
        };
        
        let globalUsers = { ...mockUsers };
        let postsData = [];
        let globalChats = {};
        let notifications = [];

        // UI Navigation & Operation States
        let currentViewedProfileId = 'me';
        let editingPostId = null;
        let activeReplyPostId = null; 
        let selectedActionUserId = null;
        let composeAttachedMedia = null;
        let chatAttachedMedia = null;
        let pendingAvatarUpdate = null;
        let activeEmojiInput = null;
        let activeChatUserId = null;