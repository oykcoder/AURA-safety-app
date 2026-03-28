export type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  /** Single emoji or short label for avatar placeholder */
  avatarEmoji: string;
  isPinned?: boolean;
  isMuted?: boolean;
  hasVoiceBait?: boolean;
};
