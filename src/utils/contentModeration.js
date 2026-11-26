// Local presentation policy; this does not modify records on the DeSo network.
const blockedUsernames = new Set(['makerdao']);

export function isBlockedUsername(username) {
  return typeof username === 'string' &&
    blockedUsernames.has(username.trim().replace(/^@/, '').toLowerCase());
}

// Filter before data enters React Query or server-rendered metadata. A post
// carrying a blocked author profile is removed together with its content.
export function filterBlockedContent(value) {
  if (Array.isArray(value)) {
    return value.map(filterBlockedContent).filter((item) => item !== null);
  }
  if (!value || typeof value !== 'object') return value;
  if (isBlockedUsername(value.Username) ||
      isBlockedUsername(value.ProfileEntryResponse?.Username) ||
      isBlockedUsername(value.Profile?.Username)) return null;

  return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, filterBlockedContent(item)]));
}
