export const runtime = 'edge';

import { Page } from '@/components/Page';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { SinglePostPageClient } from './SinglePostPageClient';
import { queryKeys, createServerQueryClient } from '@/queries';
import { getSinglePost } from '@/api/server/getSinglePost';
import { avatarUrl } from '@/utils/profileUtils';

export async function generateMetadata({ params }) {
  const { posthash } = await params
  const PostHashHex = decodeURIComponent(posthash);
  const response = await getSinglePost({ PostHashHex: PostHashHex, FetchParents: true });
  const post = response?.data?.PostFound;

  const displayName = post?.ProfileEntryResponse?.ExtraData?.DisplayName || post?.PosterPublicKeyBase58Check || 'Unknown';
  const description = post?.Body?.slice(0, 160) || 'No description available.';
  const image = avatarUrl(post?.ProfileEntryResponse);

  if (!post) {
    return { title: 'Post not found' };
  }

  return {
    title: `Post by ${displayName}`,
    description: description,
    openGraph: {
      title: `Post by ${displayName}`,
      description: description,
      images: image ? [{ url: image, width: 600, height: 600 }] : undefined,
    },
    twitter: {
      title: `Post by ${displayName}`,
      description: description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SinglePostPage({ params }) {
  const { username, posthash } = await params
  const rawParam = decodeURIComponent(username);
  const PostHashHex = decodeURIComponent(posthash);

  const queryClient = createServerQueryClient();
  const queryKey = queryKeys.singlePost(PostHashHex); // 🔥 For SSR, no userPublicKey — correct

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      const result = await getSinglePost({ PostHashHex: PostHashHex, FetchParents: true });
      return result?.success && result.data?.PostFound ? result.data.PostFound : null;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Page>
        <SinglePostPageClient postHash={PostHashHex} rawParam={rawParam} />
      </Page>
    </HydrationBoundary>
  );
}