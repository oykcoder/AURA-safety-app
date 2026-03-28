import { CircleDashed, MessageCircle, Phone, SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import { mockChats } from "../data/mockChats";
import type { ChatItem } from "../types/chat";
import { ChatListItem } from "./ChatListItem";
import { ChatSearchBar } from "./ChatSearchBar";
import { WhatsAppHeader } from "./WhatsAppHeader";

type Props = {
  onChatOpen?: (chat: ChatItem) => void;
  onToggleTheme?: () => void;
};

export function ChatListScreen({ onChatOpen, onToggleTheme }: Props) {
  return (
    <div className="relative mx-auto flex h-full max-w-lg flex-col bg-[var(--color-wa-panel)] shadow-xl">
      <WhatsAppHeader onToggleTheme={onToggleTheme} />
      <ChatSearchBar />
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-wa-item-bg)]">
        {mockChats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} onPress={onChatOpen} />
        ))}
      </div>
      <nav
        className="flex shrink-0 items-center justify-around border-t border-[var(--color-wa-border)] bg-[var(--color-wa-panel)] pb-[env(safe-area-inset-bottom,0px)] pt-1"
        aria-label="Alt menü"
      >
        <Tab icon={<MessageCircle className="size-6" strokeWidth={1.5} />} label="Sohbetler" active />
        <Tab icon={<CircleDashed className="size-6" strokeWidth={1.5} />} label="Durum" />
        <Tab icon={<Phone className="size-6" strokeWidth={1.5} />} label="Aramalar" />
      </nav>
      <button
        type="button"
        className="absolute bottom-20 right-4 flex size-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Yeni mesaj"
      >
        <SquarePen className="size-7" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function Tab({
  icon,
  label,
  active,
}: {
  icon?: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex flex-col items-center gap-0.5 px-4 py-2 text-[11px] font-medium ${
        active ? "text-[var(--color-wa-accent)]" : "text-[var(--color-wa-secondary)]"
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}
