import { Page } from '@/components/Page';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { NotificationsPageClient } from './NotificationsPageClient';
import { isMaybePublicKey, avatarUrl } from '@/utils/profileUtils';
import { getSingleProfile } from '@/api/server/getSingleProfile';
import { queryKeys, createServerQueryClient } from '@/queries';

export async function generateMetadata({ params }) {
  const { username } = await params;
  const rawParam = decodeURIComponent(username);
  const isPublicKey = isMaybePublicKey(rawParam);
  const lookupKey = !isPublicKey && rawParam.startsWith('@') ? rawParam.slice(1) : rawParam;

  const response = isPublicKey
    ? await getSingleProfile({ PublicKeyBase58Check: rawParam })
    : await getSingleProfile({ Username: lookupKey });

  if (!response.success || !response.data?.Profile) {
    return {
      title: `Notifications for ${lookupKey}`,
      description: `Notifications for ${lookupKey} on DeSo blockchain`,
      openGraph: {
        title: `Notifications for ${lookupKey}`,
        description: `Notifications for ${lookupKey} on DeSo blockchain`,
      },
    };
  }

  const profile = response.data.Profile;
  const displayName = profile?.ExtraData?.DisplayName || profile?.Username || lookupKey;
  const avatar = avatarUrl(profile);
  const description = `Notifications for ${displayName} on DeSo blockchain`;

  return {
    title: `Notifications for ${displayName}`,
    description,
    openGraph: {
      title: `Notifications for ${displayName}`,
      description,
      images: avatar ? [{ url: avatar, width: 600, height: 600 }] : undefined,
    },
    twitter: {
      title: `Notifications for ${displayName}`,
      description,
      images: avatar ? [avatar] : undefined,
    },
  };
}

export default async function NotificationsPage({ params }) {
  const { username } = await params;
  const rawParam = decodeURIComponent(username);
  const isPublicKey = isMaybePublicKey(rawParam);
  const lookupKey = !isPublicKey && rawParam.startsWith('@') ? rawParam.slice(1) : rawParam;

  const queryClient = createServerQueryClient();

  const queryKey = isPublicKey
    ? queryKeys.profileByPublicKey(rawParam)
    : queryKeys.profileByUsername(lookupKey);

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      const result = isPublicKey
        ? await getSingleProfile({ PublicKeyBase58Check: rawParam })
        : await getSingleProfile({ Username: lookupKey });

      return result?.success && result.data?.Profile ? result.data.Profile : null;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Page>
        <NotificationsPageClient rawParam={rawParam} />
      </Page>
    </HydrationBoundary>
  );
}