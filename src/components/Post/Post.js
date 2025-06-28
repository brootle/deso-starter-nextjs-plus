"use client";

import { useDeSoApi } from '@/api/useDeSoApi';
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

import { useAuth } from '@/context/AuthContext'; 

import { MarkdownText } from '@/components/MarkdownText';
import { Avatar } from '@/components/Avatar';
import { isMaybePublicKey } from '@/utils/profileUtils';
import { formatTimestampNanos } from '@/utils/dateUtils';

import { PostThread } from '@/components/PostThread';

import { PostStats } from './PostStats';
import { VideoGallery } from './VideoGallery';
import { ImageGallery } from './ImageGallery';
import { EmbedMedia } from './EmbedMedia';

import { queryKeys, uiKeys } from '@/queries';

import classNames from 'classnames';
import styles from './Post.module.css';

const COMMENT_LIMIT = 10;

export const Post = ({ post, username, userProfile, isQuote, isComment, isInThread, isHighlighted, currentFeedPublicKey, isStatsDisabled = false }) => {

  // Avoid hydration mismatch by skipping render until fully mounted.
  // This prevents server-rendered HTML from differing from client-rendered DOM.  
  // const [isHydrated, setIsHydrated] = useState(false);
  // useEffect(() => setIsHydrated(true), []);

  const {
    PostHashHex,
    Body,
    ImageURLs,
    VideoURLs,
    CommentCount,
    ParentPosts,
    RepostedPostEntryResponse,
    PosterPublicKeyBase58Check,
    ProfileEntryResponse,
    TimestampNanos,
    PostExtraData
  } = post;

  const { userPublicKey } = useAuth(); 

  const { getSinglePost } = useDeSoApi();
  const queryClient = useQueryClient();

  const shouldFetchFirstPage = useRef(false);

  // const [showRaw, setShowRaw] = useState(() => {
  //   return queryClient.getQueryData(uiKeys.rawVisible(PostHashHex)) ?? false;
  // });  

  // We initialize to `false` and update after hydration to avoid SSR mismatch.
  // Do NOT use `useState(() => queryClient.getQueryData(...))` here, as it causes
  // React hydration errors when the server and client render different values.  
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const cached = queryClient.getQueryData(uiKeys.rawVisible(PostHashHex));
    if (cached !== undefined) {
      setShowRaw(cached);
    }
  }, [PostHashHex]);  

  // const [showReplies, setShowReplies] = useState(() => {
  //   return queryClient.getQueryData(uiKeys.commentsVisible(PostHashHex)) ?? false;
  // });

  const [showReplies, setShowReplies] = useState(false);

  useEffect(() => {
    const cached = queryClient.getQueryData(uiKeys.commentsVisible(PostHashHex));
    if (cached !== undefined) {
      setShowReplies(cached);
    }
  }, [PostHashHex]);  

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    //queryKey: queryKeys.postComments(PostHashHex),
    queryKey: queryKeys.postComments(PostHashHex, userPublicKey),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await getSinglePost({
        PostHashHex,
        CommentOffset: pageParam,
        CommentLimit: COMMENT_LIMIT,
        ReaderPublicKeyBase58Check: userPublicKey || undefined,
      });

      if (!response.success) throw new Error(response.error || 'Failed to fetch comments');

      const newComments = response.data?.PostFound?.Comments || [];

      //const existing = queryClient.getQueryData(queryKeys.postComments(PostHashHex));
      const existing = queryClient.getQueryData(queryKeys.postComments(PostHashHex, userPublicKey));
      const existingHashes = new Set(
        existing?.pages.flatMap(p => p.comments.map(c => c.PostHashHex)) || []
      );

      const filteredComments = newComments.filter(
        (c) => !existingHashes.has(c.PostHashHex)
      );

      return {
        comments: filteredComments,
        nextOffset: pageParam + COMMENT_LIMIT,
        hasMore: newComments.length === COMMENT_LIMIT,
      };
    }, 
    getNextPageParam: (lastPage, pages) => {
      // Count both local comments and promoted comments (originally local)
      const localAndPromotedCount = pages[0]?.comments?.filter(c => c.isLocal || c.isPromoted)?.length || 0;
      const totalLoaded = pages.flatMap(p => p.comments).length - localAndPromotedCount;
      return lastPage.hasMore ? totalLoaded : undefined;
    },    
    enabled: showReplies,

    // Comment-specific cache behavior (different from global defaults):
    staleTime: Infinity, // Comments never become stale - keep cached indefinitely
    gcTime: Infinity, // Keep comments in cache forever

    // These match global defaults, so we could remove them, but keeping for clarity:
    refetchOnWindowFocus: false,
    refetchOnMount: false, 
    refetchOnReconnect: false, // Important: prevents wake-from-sleep issues
    retry: false, // Don't retry failed comment loads
  });

  const rawUsername =
    username || ProfileEntryResponse?.Username || PosterPublicKeyBase58Check || 'Unknown';

  const isPublicKey = isMaybePublicKey(rawUsername);
  const lookupKey = !isPublicKey && rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const displayName = ProfileEntryResponse?.ExtraData?.DisplayName || userProfile?.ExtraData?.DisplayName;  

  const comments = data?.pages.flatMap((page) => page.comments) || [];


  // const newCommentsVisible = queryClient.getQueryData(uiKeys.newCommentsVisible(PostHashHex)) ?? true;

  const [newCommentsVisible, setNewCommentsVisible] = useState(true);

  useEffect(() => {
    const cached = queryClient.getQueryData(uiKeys.newCommentsVisible(PostHashHex));
    if (cached !== undefined) setNewCommentsVisible(cached);
  }, [PostHashHex]);  

  const injectedComments = newCommentsVisible
    ? data?.pages?.[0]?.comments?.filter(c => c.isLocal) || []
    : [];  

    
  const toggleReplies = () => {
    const newVisible = !showReplies;

    queryClient.setQueryData(uiKeys.commentsVisible(PostHashHex), newVisible);
    // Only set newCommentsVisible to false when showing replies, keep it true when hiding
    if (newVisible) {
      queryClient.setQueryData(uiKeys.newCommentsVisible(PostHashHex), true);
    }
    setShowReplies(newVisible);

    if (!newVisible) {
      // ✅ Promote injected comments to permanent with isPromoted flag
      // queryClient.setQueryData(queryKeys.postComments(PostHashHex), (data) => {
      queryClient.setQueryData(queryKeys.postComments(PostHashHex, userPublicKey), (data) => {
        if (!data) return;

        const page0 = data.pages[0];
        const injected = page0.comments.filter(c => c.isLocal);
        const rest = page0.comments.filter(c => !c.isLocal);

        // Mark promoted comments so they can be identified later
        const promoted = injected.map(c => ({ ...c, isLocal: undefined, isPromoted: true }));
        const merged = [...promoted, ...rest];

        return {
          ...data,
          pages: [
            {
              ...page0,
              comments: merged,
            },
            ...data.pages.slice(1),
          ],
        };
      });

      return;
    }

    if (shouldFetchFirstPage.current) {
      shouldFetchFirstPage.current = false;

      // Get current query data
      const currentData = queryClient.getQueryData(queryKeys.postComments(PostHashHex));
      const existingComments = currentData?.pages?.[0]?.comments || [];
      
      const localComments = existingComments.filter(c => c.isLocal);
      const hasServerData = existingComments.some(c => !c.isLocal && !c.isPromoted);

      // If we already have server data, just promote local comments without refetching
      if (hasServerData) {
        //queryClient.setQueryData(queryKeys.postComments(PostHashHex), (data) => {
          queryClient.setQueryData(queryKeys.postComments(PostHashHex, userPublicKey), (data) => {
          if (!data) return;

          const page0 = data.pages[0];
          const local = page0.comments.filter(c => c.isLocal);
          const nonLocal = page0.comments.filter(c => !c.isLocal);

          const promoted = local.map(c => ({ ...c, isLocal: undefined, isPromoted: true }));
          const merged = [...promoted, ...nonLocal];

          return {
            ...data,
            pages: [
              {
                ...page0,
                comments: merged,
              },
              ...data.pages.slice(1),
            ],
          };
        });
      } else {
        // Only refetch if we don't have server data yet
        const promotedComments = existingComments.filter(c => c.isPromoted);

        refetch().then(() => {
          //queryClient.setQueryData(queryKeys.postComments(PostHashHex), (newData) => {
          queryClient.setQueryData(queryKeys.postComments(PostHashHex, userPublicKey), (newData) => {
            if (!newData) return;

            const serverHashes = new Set(
              newData.pages.flatMap(p => p.comments.map(c => c.PostHashHex))
            );

            // Promote current local comments and preserve existing promoted comments
            const promotedLocal = localComments
              .filter(c => !serverHashes.has(c.PostHashHex))
              .map(c => ({ ...c, isLocal: undefined, isPromoted: true }));

            const preservedPromoted = promotedComments
              .filter(c => !serverHashes.has(c.PostHashHex));

            const allUserComments = [...promotedLocal, ...preservedPromoted];
            const merged = [...allUserComments, ...newData.pages[0].comments];

            return {
              ...newData,
              pages: [
                {
                  ...newData.pages[0],
                  comments: merged,
                },
                ...newData.pages.slice(1),
              ],
            };
          });
        });
      }
    }
  };

  // 🔒 Safe render guard
  // if (!post || !isHydrated) {
  //   return <div style={{ visibility: 'hidden', height: 0 }} />; // Or loading skeleton
  // }  

  // If post is not defined, return null to avoid rendering issues
  if (!post) {
    return null
  }    

  // ✅ NOW CHECK FOR THREAD RENDERING - AFTER ALL HOOKS
  const hasParentPosts = ParentPosts && Array.isArray(ParentPosts) && ParentPosts.length > 0;
  
  if (hasParentPosts && !isInThread) {
    return (
      <PostThread 
        parentPosts={ParentPosts}
        currentPost={post}
        username={username}
        userProfile={userProfile}
      />
    );
  }    

  return (
    <div 
      className={classNames(styles.post, {
        [styles.quote]: isQuote,
        [styles.comment]: isComment,
        [styles.highlighted]: isHighlighted
      })}    
      // className={`${styles.post} ${isQuote ? styles.quote : ''} ${isComment ? styles.comment : ''}`}
    >

      {!isComment && (
        <div className={styles.avatarContainer}>
          <Avatar profile={ProfileEntryResponse || userProfile} size={48} />
        </div>
      )}

      <div className={styles.postContentContainer}>
        <div className={styles.header}>
          {isComment ? (
            <Avatar profile={ProfileEntryResponse || userProfile} size={40} />
          ) : (
            <div className={styles.mobileAvatarContainer}>
              <Avatar profile={ProfileEntryResponse || userProfile} size={45} />
            </div>
          )}

          <div className={styles.postSummary}>
            <div className={styles.postLinks}>
              <div className={styles.userLinksWrapper}>
                {displayName && (
                  <Link href={`/${lookupKey}`} className={styles.displayName} prefetch={false}>{displayName}</Link>
                )}
                {isPublicKey ? (
                  <Link href={`/${lookupKey}`} className={styles.publicKey} prefetch={false}>{lookupKey}</Link>
                ) : (
                  <Link href={`/${lookupKey}`} className={styles.username} prefetch={false}>@{lookupKey}</Link>
                )}
              </div>
              <div className={styles.postLinkWrapper}>
                <Link href={`/${lookupKey}/posts/${PostHashHex}`} className={styles.postLink} prefetch={false}>{TimestampNanos && <>{formatTimestampNanos(TimestampNanos)}. </>}{PostHashHex}</Link>                
              </div>
            </div>
            <div className={styles.postControls}>
              {(Body || (ImageURLs && ImageURLs.length > 0)) && (
                <button 
                  onClick={() => {
                    setShowRaw(prev => {
                      const newVal = !prev;
                      queryClient.setQueryData(uiKeys.rawVisible(PostHashHex), newVal);
                      return newVal;
                    });
                  }} 
                  className={styles.toggleRawButton}
                >
                  {showRaw ? 'Show Rendered 📄' : 'Show Raw 📝'}
                </button>                
              )}
            </div>
          </div>
        </div>

        {Body && (
          <div className={styles.postBody}>
            {showRaw ? <pre>{Body.replace(/\\/g, '\\\\')}</pre> : <MarkdownText text={Body} />}
          </div>
        )}


        <ImageGallery ImageURLs={ImageURLs} showRaw={showRaw} />

        <VideoGallery Body={Body} VideoURLs={VideoURLs} showRaw={showRaw} />

        {PostExtraData?.EmbedVideoURL && (
          showRaw ? (
            <div className={styles.embedMediaRaw}>
              <pre>{PostExtraData.EmbedVideoURL}</pre>
            </div>
          ) : (
            <EmbedMedia
              url={PostExtraData.EmbedVideoURL}
            />
          )
        )}

        {RepostedPostEntryResponse && (
          <div className={styles.repost}>
            <Post post={RepostedPostEntryResponse} isQuote isStatsDisabled={isStatsDisabled} isInThread={isInThread}/>
          </div>
        )}


        <PostStats
          post={post}
          username={username}
          ProfileEntryResponse={userProfile}
          isStatsDisabled={isStatsDisabled}
          onReply={(newReply) => {
            if (!showReplies) {
              shouldFetchFirstPage.current = true; // mark that we need to fetch backend later
            }

            const commentWithFlag = { ...newReply, isLocal: true };

            // queryClient.setQueryData(queryKeys.postComments(PostHashHex), (oldData) => {
            queryClient.setQueryData(queryKeys.postComments(PostHashHex, userPublicKey), (oldData) => {
              if (!oldData) {
                return {
                  pages: [{ comments: [commentWithFlag] }],
                  pageParams: [null],
                };
              }

              const exists = oldData.pages.some(page =>
                page.comments.some(c => c.PostHashHex === commentWithFlag.PostHashHex)
              );
              if (exists) return oldData;

              const firstPage = oldData.pages[0];
              return {
                ...oldData,
                pages: [
                  {
                    ...firstPage,
                    comments: [commentWithFlag, ...firstPage.comments],
                  },
                  ...oldData.pages.slice(1),
                ],
              };
            });
          }}
          currentFeedPublicKey={currentFeedPublicKey} 
        />

        {/* disable interaction including replies button and don't show any comments */}
        { !isStatsDisabled && (
          <>
            {CommentCount > 0 && (
              <button onClick={toggleReplies} className={styles.repliesButton}>
                {isLoading
                  ? 'Loading replies...'
                  : showReplies
                  ? 'Hide replies'
                  : 'See replies...'}
              </button>
            )}

            {!showReplies && injectedComments.length > 0 && (
              <div className={styles.repliesContainer}>
                <div className={styles.replies}>
                  {injectedComments.map((comment) => (
                    <Post key={comment.PostHashHex} post={comment} isComment isInThread={isInThread}/>
                  ))}
                </div>
              </div>
            )}        

            {showReplies && (
              <div className={styles.repliesContainer}>
                <div className={styles.replies}>
                  {comments.map((comment) => (
                    <Post key={comment.PostHashHex} post={comment} isComment isInThread={isInThread}/>
                  ))}
                </div>
                {hasNextPage && (
                  <button
                    onClick={fetchNextPage}
                    disabled={isFetchingNextPage}
                    className={styles.loadMoreButton}
                  >
                    {isFetchingNextPage ? 'Loading more...' : 'Load more replies'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};