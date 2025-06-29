// Centralized query key registry for all React Query data

export const queryKeys = {
    // User profiles
    profileByUsername: (username) => ['profile-by-username', username],
    // Note: profileByPublicKey is used in both ProfilePage and search input when query is a full public key
    profileByPublicKey: (publicKey) => ['profile-by-publickey', publicKey],
  
    // Posts
    //userPosts: (lookupKey) => ['user-posts', lookupKey],       // By username or public key
    userPosts: (lookupKey, readerPublicKey) => 
        readerPublicKey 
            ? ['user-posts', lookupKey, readerPublicKey] 
            : ['user-posts', lookupKey],

    //singlePost: (postHash) => ['single-post', postHash],       // One post by hash
    // 🔥 🔗 Updated singlePost to be reader-aware
    singlePost: (postHash, readerPublicKey) => 
        readerPublicKey 
            ? ['single-post', postHash, readerPublicKey] 
            : ['single-post', postHash],    


    postComments: (postHash) => ['comments', postHash],        // Comments for a post
    // postComments: (postHash, readerPublicKey) => 
    //     readerPublicKey 
    //         ? ['comments', postHash, readerPublicKey] 
    //         : ['comments', postHash],    

    // Follow feed (posts from followed users)
    followFeedPosts: (publicKey) => ['follow-feed-posts', publicKey], // Feed for a user

    // Notifications for a user
    notifications: (publicKey) => ['notifications', publicKey],

    // Profile search
    searchProfilesByUsernamePrefix: (query) => ['search-profiles-by-username-prefix', query],
};
  