'use client';

import { useDeSoApi } from '@/api/useDeSoApi';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/queries';
import { Page } from "@/components/Page";
import { Post } from "@/components/Post";
import { useAuth } from '@/context/AuthContext';

export const SinglePostPageClient = ({ postHash, rawParam }) => {
  const { getSinglePost } = useDeSoApi();
  const { userPublicKey } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    //queryKey: queryKeys.singlePost(postHash),
    queryKey: queryKeys.singlePost(postHash, userPublicKey), // 🔥 ADDED userPublicKey to key
    queryFn: async () => {
      const response = await getSinglePost({
        PostHashHex: postHash,
        FetchParents: true,
        ReaderPublicKeyBase58Check: userPublicKey || undefined, // 🔥 ADDED reader state
      });
      if (!response.success) throw new Error(response.error || 'Failed to fetch post');
      return response.data?.PostFound || null;
    },
    // Using global defaults from QueryProvider
    // Global defaults: staleTime: 2min, gcTime: 10min, retry: networkAwareRetry,
    // refetchOnReconnect: false (fixes wake-from-sleep), etc.
  });

  const currentFeedPublicKey = data?.PostFound?.PosterPublicKeyBase58Check || userPublicKey;

  if (isLoading) return <Page><p>Loading post...</p></Page>;
  if (isError) return <Page><p style={{ color: 'red' }}>{error.message}</p></Page>;
  if (!data) return <Page><p>Post not found.</p></Page>;

  return (
    <Post 
      post={data} 
      username={rawParam} 
      currentFeedPublicKey={currentFeedPublicKey} // 🔥 Pass feed key to Post
    />
  );
}