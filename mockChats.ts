import type { ChatItem } from "../types/chat";

/** Sahte sohbetler — PRD’deki kamuflaj senaryosu */
export const mockChats: ChatItem[] = [
  {
    id: "1",
    name: "Abim",
    lastMessage: "Geliyorum, 5 dakikaya oradayım",
    time: "14:32",
    unreadCount: 2,
    avatarEmoji: "👨",
    isPinned: true,
    hasVoiceBait: true,
  },
  {
    id: "2",
    name: "Canım Arkadaşım",
    lastMessage: "Yarın görüşürüz tamam mı 💚",
    time: "12:05",
    avatarEmoji: "🧑",
  },
  {
    id: "3",
    name: "Anne",
    lastMessage: "Akşam yemeğe gelir misin?",
    time: "Dün",
    unreadCount: 1,
    avatarEmoji: "👩",
  },
  {
    id: "4",
    name: "İş Grubu",
    lastMessage: "Mehmet: Toplantı 10'da",
    time: "Dün",
    avatarEmoji: "👔",
    isMuted: true,
  },
  {
    id: "5",
    name: "Kuzen",
    lastMessage: "Ses kaydını dinledin mi",
    time: "Pazartesi",
    avatarEmoji: "🎧",
    hasVoiceBait: true,
  },
  {
    id: "6",
    name: "Komşu",
    lastMessage: "Teşekkürler!",
    time: "Pazar",
    avatarEmoji: "🏠",
    isMuted: true,
  },
];
