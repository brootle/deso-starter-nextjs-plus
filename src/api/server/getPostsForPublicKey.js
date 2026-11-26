import { filterBlockedContent, isBlockedUsername } from '../../utils/contentModeration';
import { DESO_API_BASE } from '@/config/desoConfig';

export async function getPostsForPublicKey(params) {
  if (isBlockedUsername(params?.Username)) {
    return { success: false, error: 'This account is unavailable.' };
  }
  try {
    const response = await fetch(`${DESO_API_BASE}/get-posts-for-public-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    return response.ok
      ? { success: true, data: filterBlockedContent(data) }
      : { success: false, error: data?.error || 'Unknown API error' };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Network error',
    };
  }
}
