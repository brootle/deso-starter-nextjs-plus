'use client';

import { useDeSoApi } from '@/api/useDeSoApi';
import { isMaybePublicKey } from '@/utils/profileUtils';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';
import { Post } from '@/components/Post';
import { queryKeys } from '@/queries';

import { useAuth } from '@/context/AuthContext';

import { UserQuickLinks } from '@/components/UserQuickLinks';

import styles from './page.module.css';

const POSTS_PER_PAGE = 10;

export const PostsPageClient = ({ rawParam }) => {
  const { userPublicKey } = useAuth();

  const isPublicKey = isMaybePublicKey(rawParam);
  const lookupKey = isPublicKey
    ? rawParam
    : rawParam.startsWith('@')
    ? rawParam.slice(1)
    : rawParam;

  // const { getSingleProfile, getPostsForPublicKey } = useDeSoApi();
  const { getSingleProfile, getPostsStateless } = useDeSoApi();

  // Hydrated profile query
  const {
    data: userProfile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: isPublicKey
      ? queryKeys.profileByPublicKey(rawParam)
      : queryKeys.profileByUsername(lookupKey),
    queryFn: async () => {
      const response = isPublicKey
        ? await getSingleProfile({ PublicKeyBase58Check: rawParam })
        : await getSingleProfile({ Username: lookupKey });

      if (!response.success || !response.data?.Profile) {
        throw new Error(response.error || 'Failed to load profile');
      }

      return response.data.Profile;
    },
    // Using global defaults from QueryProvider
    // Global defaults: staleTime: 2min, gcTime: 10min, retry: networkAwareRetry,
    // refetchOnReconnect: false (fixes wake-from-sleep), etc.
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeys.followFeedPosts(isPublicKey ? lookupKey : userProfile?.PublicKeyBase58Check),
    queryFn: async ({ pageParam = '' }) => {
      const response = await getPostsStateless({
        ReaderPublicKeyBase58Check: isPublicKey ? lookupKey : userProfile?.PublicKeyBase58Check,
        GetPostsForFollowFeed: true,
        PostHashHex: pageParam,
        NumToFetch: POSTS_PER_PAGE,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch posts');
      }

      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const posts = lastPage?.PostsFound || [];
      return posts.length < POSTS_PER_PAGE ? undefined : posts.at(-1)?.PostHashHex;
    },
    // Only run when we have a valid public key for ReaderPublicKeyBase58Check:
    // - For public key URLs: use lookupKey immediately
    // - For username URLs: wait for userProfile query to complete and get PublicKeyBase58Check
    enabled: !!(isPublicKey ? lookupKey : userProfile?.PublicKeyBase58Check),
    
    // Using global defaults - much cleaner!
    // Optional: Only override if you need different behavior for feed posts
    staleTime: 1000 * 30, // 30 seconds for fresh follow feed
  });

  const loadMoreRef = useRef(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px 0px', threshold: 0 }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <p>Loading posts...</p>;
  if (error) return <p style={{ color: 'red' }}>{error.message}</p>;

  const posts = data?.pages.flatMap((page) => page.PostsFound || []) || [];

  // 🔥 Use the public key from the URL or the profile's PublicKeyBase58Check
  const currentFeedPublicKey = isPublicKey
    ? lookupKey
    : userProfile?.PublicKeyBase58Check;  

  return (
    <>

      <UserQuickLinks profile={userProfile} rawParam={rawParam} />

      {posts.length === 0 && <p>No posts found.</p>}

      <div className={styles.postsContainer}>
        {posts.map((post) => (
          <div key={post.PostHashHex}>
            <Post
              post={post} // in this case post will include the profile
              currentFeedPublicKey={currentFeedPublicKey} 
            />
          </div>
        ))}
      </div>

      <div ref={loadMoreRef} style={{ height: '1px' }} />
      {isFetchingNextPage && <p>Loading more...</p>}
    </>
  );
};