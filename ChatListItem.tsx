import { Pin, Play, VolumeX } from "lucide-react";
import type { MouseEvent } from "react";
import type { ChatItem } from "../types/chat";

type Props = {
  chat: ChatItem;
  onPress?: (chat: ChatItem) => void;
};

export function ChatListItem({ chat, onPress }: Props) {
  const handlePlayDeterrentAudio = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const audio = new Audio(
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    );
    audio.currentTime = 8;
    audio.volume = 0.95;
    void audio.play().catch((err) => {
      console.warn("[Aura] Ses oynatılamadı:", err);
    });
  };

  return (
    <button
      type="button"
      onClick={() => onPress?.(chat)}
      className="flex w-full cursor-pointer items-start gap-3 border-b border-[var(--color-wa-border)] bg-[var(--color-wa-item-bg)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-wa-item-hover)] active:bg-[var(--color-wa-item-active)]"
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-wa-avatar-bg)] text-2xl"
        aria-hidden
      >
        {chat.avatarEmoji}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[17px] font-medium text-[var(--color-wa-text-primary)]">
            {chat.name}
          </span>
          <span
            className={`shrink-0 text-xs ${
              chat.unreadCount
                ? "font-medium text-[#25d366]"
                : "text-[var(--color-wa-secondary)]"
            }`}
          >
            {chat.time}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          {chat.isPinned ? (
            <Pin
              className="size-3.5 shrink-0 text-[var(--color-wa-muted-icon)]"
              strokeWidth={2}
              aria-label="Sabitlendi"
            />
          ) : null}
          {chat.isMuted ? (
            <VolumeX
              className="size-3.5 shrink-0 text-[var(--color-wa-muted-icon)]"
              strokeWidth={2}
              aria-label="Sessiz"
            />
          ) : null}
          <span className="truncate text-[15px] text-[var(--color-wa-secondary)]">
            {chat.lastMessage}
          </span>
          {chat.hasVoiceBait ? (
            <button
              type="button"
              onClick={handlePlayDeterrentAudio}
              aria-label={`${chat.name} sesli mesajı oynat`}
              className="ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--color-wa-secondary)] transition-colors hover:bg-[var(--color-wa-item-hover)] hover:text-[var(--color-wa-text-primary)]"
            >
              <Play className="size-3.5" fill="currentColor" strokeWidth={1.7} />
            </button>
          ) : null}
        </div>
      </div>
      {chat.unreadCount ? (
        <div className="flex shrink-0 flex-col items-end justify-center self-center pt-1">
          <span className="flex min-w-[22px] items-center justify-center rounded-full bg-[#25d366] px-1.5 py-0.5 text-xs font-medium text-white">
            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
          </span>
        </div>
      ) : null}
    </button>
  );
}
