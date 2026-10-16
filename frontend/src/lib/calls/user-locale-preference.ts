import { waitForAccessToken } from '@/lib/api/wait-for-access-token';
import {
  getUserChatPreferences,
  updateUserChatPreferences,
  type UserChatPreferences,
} from '@/lib/calls/model-chat-conversation';

export async function fetchUserChatPreferences(): Promise<UserChatPreferences | null> {
  try {
    await waitForAccessToken(8_000);
    return await getUserChatPreferences();
  } catch {
    return null;
  }
}

export async function patchUserPreferredLocale(preferredLocale: string): Promise<void> {
  await waitForAccessToken(8_000);
  await updateUserChatPreferences({ preferredLocale });
}
