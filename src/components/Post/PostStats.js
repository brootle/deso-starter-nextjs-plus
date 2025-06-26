"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { useEditorPost } from "@/context/EditorPostContext";
import { useDeSoApi } from "@/api/useDeSoApi";
import { useToast } from "@/hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/queries";

import { useFloating, offset, flip, shift, size as applySize, autoUpdate, FloatingPortal } from "@floating-ui/react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Dropdown } from "@/components/Dropdown";
import { MenuItem } from "@/components/MenuItem";

import { PostEditor } from "@/components/PostEditor";

import classNames from 'classnames';

import styles from "./Post.module.css";

// PostStats component handles the stats (💬 🔁 ❤️ 💎) display
// and manages the inline reply UI and submission logic.
export const PostStats = ({ post, username, ProfileEntryResponse, isStatsDisabled, onReply }) => {
  const {
    PostHashHex,
    CommentCount,
    LikeCount,
    DiamondCount,
    RepostCount,
    QuoteRepostCount,
    PostEntryReaderState
  } = post;

  const router = useRouter();

  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showRepostDropdown, setShowRepostDropdown] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  
  // ✅ Local state to track comment, repost, and quote counts for optimistic updates
  const [localCommentCount, setLocalCommentCount] = useState(CommentCount);
  const [localRepostCount, setLocalRepostCount] = useState(RepostCount);
  const [localQuoteCount, setLocalQuoteCount] = useState(QuoteRepostCount);

  // sync local counts with initial post data
  // This ensures that if the post data changes (e.g. via props update),
  useEffect(() => {
    setLocalCommentCount(CommentCount);
    setLocalRepostCount(RepostCount);
    setLocalQuoteCount(QuoteRepostCount);
  }, [CommentCount, RepostCount, QuoteRepostCount]);  

  const { userPublicKey, signAndSubmitTransaction } = useAuth();
  const { userProfile } = useUser();
  const { setQuotedPost } = useEditorPost();
  const { submitPost } = useDeSoApi();
  const { showErrorToast, showSuccessToast } = useToast();  
  const queryClient = useQueryClient();

  const {
    refs,
    floatingStyles,
  } = useFloating({
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(4), flip(), shift(), applySize({
      apply: ({ rects, elements }) => {
        Object.assign(elements.floating.style, {
          width: `${rects.reference.width}px`,
        });
      },
    })],
    whileElementsMounted: autoUpdate,
  });

  useClickOutside([refs.reference, refs.floating], () => {
    setShowRepostDropdown(false);
  });  

  const handleReplyClick = () => {    
    // Show the reply box
    setShowReplyBox((prev) => !prev);
  };

  const handleRepost = async () => {
    setIsReposting(true);
    setShowRepostDropdown(false);

    try {
      const settings = {
        UpdaterPublicKeyBase58Check: userPublicKey,
        RepostedPostHashHex: PostHashHex,
        BodyObj: {},
        MinFeeRateNanosPerKB: 1500,
      };

      const result = await submitPost(settings);

      if (result.error || !result.data?.TransactionHex) {
        throw new Error(result.error || "Missing transaction hex");
      }

      const tx = await signAndSubmitTransaction(result.data.TransactionHex);
      if (tx?.PostEntryResponse) {

        const username = userProfile?.Username || userPublicKey;


        await queryClient.invalidateQueries({
          queryKey: queryKeys.userPosts(username),
        });        

        setLocalRepostCount((prev) => prev + 1);

        showSuccessToast(
          <div>
            Reposted successfully 🎉 
            <br />
            <Link href={`/${username}/posts/`}>View in Posts</Link>
          </div>,
          { autoClose: 7000 }
        );
      } else {
        showErrorToast("Error submitting repost.");
      }
    } catch (error) {
      const msg = error?.message || 'Error submitting repost';
      showErrorToast(`Failed to submit repost. ${msg}`);
    } finally {
      setIsReposting(false);
    }
  };  

  const handleQuoteRepost = async () => {
    setShowRepostDropdown(false);
    setQuotedPost({
      post,
      username, 
      ProfileEntryResponse
    }); // Set the post to be quoted in the editor
    router.push('/compose/post'); // Navigate to the compose page with the quoted post
  }

  const getRepostTitle = () => {
    if (!userPublicKey) return "Login to repost";
    if (!post?.Body && !post?.ImageURLs?.length && !post?.VideoURLs?.length) {
      return "Can't repost empty post";
    }
    return "Repost options";
  };

  return (
    <>
      <div className={styles.stats}>
        {/* 💬 icon clickable only if user is authenticated */}
        <span className={styles.iconWrapper}>
          <span
            onClick={userPublicKey && !isStatsDisabled ? handleReplyClick : undefined}
            style={{ cursor: userPublicKey && !isStatsDisabled ? "pointer" : "default" }}
            title={userPublicKey ? "Reply to this post" : "Login to reply"}
          >
            💬 
          </span>
          {localCommentCount}
        </span>        

        {/* <span>🔁 {RepostCount + QuoteRepostCount}</span> */}
        <span className={styles.iconWrapper}>
          <span
            ref={refs.setReference}
            onClick={userPublicKey && !isStatsDisabled && !isReposting && (post?.Body || post?.ImageURLs || post?.VideoURLs) ? () => setShowRepostDropdown((prev) => !prev) : undefined}
            className={classNames(styles.repostIcon, {
              [styles.reposting]: isReposting,
              [styles.disabled]: isStatsDisabled || !userPublicKey || (!post?.Body && !post?.ImageURLs && !post?.VideoURLs),
            })}
            // title={userPublicKey ? "Repost options" : "Login to repost"}
            title={getRepostTitle()}
          >
            🔁
          </span>
          {localRepostCount + localQuoteCount}
        </span>   

        {showRepostDropdown && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={styles.dropdownContainer}
            >
              <Dropdown className={styles.repostDropdown}>
                <MenuItem onClick={handleRepost}>🔁 Repost</MenuItem>
                <MenuItem onClick={handleQuoteRepost}>💭 Quote</MenuItem>
              </Dropdown>
            </div>
          </FloatingPortal>
        )}

        <span className={styles.iconWrapper}>
          {PostEntryReaderState?.LikedByReader 
            ?<span>❤️</span> 
            :<span>🤍</span> 
          }
          {/* <span>❤️</span>   */}
          {LikeCount}
        </span>
        
        <span className={styles.iconWrapper}>
          <span>💎</span>  
          {DiamondCount}
        </span>
        
      </div>


      {/* Use PostEditor for inline reply box */}
      {showReplyBox && (
        <PostEditor 
          isComment={true} 
          ParentStakeID={PostHashHex}
          onClose={() => setShowReplyBox(false)}
          onReply={(newComment) => {
            setLocalCommentCount((prev) => prev + 1);
            setShowReplyBox(false);
            if (onReply) onReply(newComment); // propagate up
          }}
        />        
      )}      
    </>
  );
};