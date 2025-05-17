import { Page } from '@/components/Page';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { ProfilePageClient } from './ProfilePageClient';
import { isMaybePublicKey, avatarUrl } from '@/utils/profileUtils';
import { queryKeys } from '@/queries';
import { getSingleProfile } from '@/api/server/getSingleProfile';

export async function generateMetadata({ params }) {
  const { username } = await params
  const rawParam = decodeURIComponent(username);
  const isPublicKey = isMaybePublicKey(rawParam);
  const lookupKey = !isPublicKey && rawParam.startsWith('@') ? rawParam.slice(1) : rawParam;

  const response = isPublicKey
    ? await getSingleProfile({ PublicKeyBase58Check: rawParam })
    : await getSingleProfile({ Username: lookupKey });    

  // 📄 This logic runs on the server to generate SEO metadata (title + description).
  // We still use the same profile lookup logic, but do not throw on failure.
  // Instead, we fall back to a generic title/description if the profile doesn't exist.
  // Note: This path does not affect hydration or caching — it only impacts HTML metadata.

  if (!response.success || !response.data?.Profile) {
    return {
      title: `${rawParam} • Profile`,
      description: `Profile not found on DeSo`,
      openGraph: {
        title: `${rawParam} • Profile`,
        description: 'Profile not found on DeSo',
      },
      twitter: {
        title: `${rawParam} • Profile`,
        description: 'Profile not found on DeSo',
      },      
    };    
  }

  const profile = response.data.Profile;
  const displayName = profile?.ExtraData?.DisplayName || profile?.Username || rawParam;
  const description = profile?.Description || 'No description available.';
  const image = avatarUrl(profile);

  return {
    title: `${displayName} • Profile`,
    description,
    openGraph: {
      title: `${displayName} • Profile`,
      description,
      images: image ? [{ url: image, width: 600, height: 600 }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${displayName} • Profile`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProfilePage({ params }) {
  const { username } = await params
  const rawParam = decodeURIComponent(username);
  const isPublicKey = isMaybePublicKey(rawParam);
  const lookupKey = !isPublicKey && rawParam.startsWith('@') ? rawParam.slice(1) : rawParam;

  const queryClient = new QueryClient();

  const queryKey = isPublicKey
    ? queryKeys.profileByPublicKey(rawParam)
    : queryKeys.profileByUsername(lookupKey);

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      const result = isPublicKey
        ? await getSingleProfile({ PublicKeyBase58Check: rawParam })
        : await getSingleProfile({ Username: lookupKey });
      
      // see https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr

      // ⚠️ React Query does not dehydrate error states (only successful data is cached).
      // To avoid a client-side refetch and loading state for failed profile fetches,
      // we return `null` instead of throwing. The client will check for `data === null`
      // and render a "Profile not found" UI immediately without triggering another request.      
      
      return result?.success && result.data?.Profile ? result.data.Profile : null;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Page>
        <ProfilePageClient rawParam={rawParam} />
      </Page>
    </HydrationBoundary>
  );
}