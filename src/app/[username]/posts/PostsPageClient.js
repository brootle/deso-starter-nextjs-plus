'use client';

import { useDeSoApi } from '@/api/useDeSoApi';
import { isMaybePublicKey } from '@/utils/profileUtils';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';
import { Post } from '@/components/Post';
import { queryKeys } from '@/queries';

import { UserQuickLinks } from '@/components/UserQuickLinks';

import { useAuth } from '@/context/AuthContext';

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

  const { getSingleProfile, getPostsForPublicKey } = useDeSoApi();

  // Profile query (hydrated from server or fetched client-side)
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
  });

  // Posts query (with reader state if logged in)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeys.userPosts(lookupKey, userPublicKey),
    queryFn: async ({ pageParam = '' }) => {
      const response = await getPostsForPublicKey({
        PublicKeyBase58Check: isPublicKey ? lookupKey : undefined,
        Username: isPublicKey ? undefined : lookupKey,
        LastPostHashHex: pageParam,
        NumToFetch: POSTS_PER_PAGE,
        ReaderPublicKeyBase58Check: userPublicKey || undefined,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch posts');
      }

      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const posts = lastPage?.Posts || [];
      return posts.length < POSTS_PER_PAGE ? undefined : posts.at(-1)?.PostHashHex;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour    
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

  const posts = data?.pages.flatMap((page) => page.Posts || []) || [];

  return (
    <>
      <UserQuickLinks profile={userProfile} rawParam={rawParam} />

      {isLoading && posts.length === 0 && <p>Loading posts...</p>}
      {error && posts.length === 0 && (
        <p style={{ color: 'red' }}>{error.message}</p>
      )}
      {posts.length === 0 && !isLoading && !error && <p>No posts found.</p>}

      <div className={styles.postsContainer}>
        {posts.map((post) => (
          <div key={post.PostHashHex}>
            <Post
              post={post}
              username={rawParam}
              userProfile={userProfile}
            />
          </div>
        ))}
      </div>

      <div ref={loadMoreRef} style={{ height: '1px' }} />
      {isFetchingNextPage && <p>Loading more...</p>}
    </>
  );
};

/*
--------------------------------------------------------
📜 Component Behavior Notes:

- This component loads posts for a given profile (`lookupKey`), 
  supporting both anonymous and logged-in users.

- When there is a logged-in user, the public key is passed as 
  `ReaderPublicKeyBase58Check` to the API request. This enables 
  reader-specific metadata in each post, like:
    - PostEntryReaderState.LikedByReader
    - PostEntryReaderState.RepostedByReader
    - PostEntryReaderState.DiamondLevelBestowed

- The query key includes the reader's public key:
    queryKeys.userPosts(lookupKey, userPublicKey)

  This ensures separate cache entries for:
    - Anonymous visitors
    - Different logged-in users

- On first page load:
    - Posts load immediately (without waiting for auth check) 
      as anonymous if the auth state is still being determined.

- Once auth check completes:
    - If there is a logged-in user, the query refetches with 
      reader-specific data.

- When switching users:
    - A new request fires for the new user.
    - Switching back to a previous user retrieves posts from cache 
      (unless stale or garbage-collected).

- This approach intentionally favors fast UX with instant 
  page loads, while gracefully updating reader-specific metadata 
  when auth changes.

- ✅ Standard for social apps like Twitter, YouTube, etc.
--------------------------------------------------------
*/
