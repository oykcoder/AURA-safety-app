import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Edit2,
  HardDrive,
  Heart,
  LogOut,
  Mic,
  Moon,
  MoreVertical,
  Phone,
  Play,
  Save,
  Search,
  Send,
  Shield,
  Sun,
  User,
  Video,
} from "lucide-react";

// --- Tipler ---
export interface Message {
  id: string;
  sender: "me" | "other";
  text: string;
  time: string;
  hasAudio?: boolean;
  /** `public/sounds/` altındaki dosya adı, örn. erkek_abi.mp3 */
  audioFile?: string;
}

/** `public/sounds/` dosyası + WhatsApp tetik metni + AI yanıtı. Ses Havuzu’ndan düzenlenir. */
export interface VoicePoolEntry {
  id: string;
  audioFile: string;
  label: string;
  triggerText: string;
  responseText: string;
}

const DEFAULT_VOICE_POOL: VoicePoolEntry[] = [
  {
    id: "pool_erkek_abi",
    audioFile: "erkek_abi.mp3",
    label: "Erkek abi",
    triggerText: "kapıdayım",
    responseText: "5dkya ordayım ablacım.",
  },
  {
    id: "pool_erkek_sesi",
    audioFile: "erkek_sesi.mp3",
    label: "Erkek sesi",
    triggerText: "nerdesin",
    responseText: "Yoldayım geliyorum.",
  },
  {
    id: "pool_anne1",
    audioFile: "anne1.mp3",
    label: "Anne",
    triggerText: "annem",
    responseText: "Efendim kızım?",
  },
];

function playPublicSound(file: string) {
  const audio = new Audio(`/sounds/${file}`);
  void audio.play().catch((e) => console.error("Ses çalma hatası:", e));
}

export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  messages: Message[];
}

export interface VoiceVolunteer {
  id: string;
  name: string;
  gender: "male" | "female";
  description: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  active: boolean;
}

export type Theme = "wa-light" | "wa-dark" | "aura-dark";

const STORAGE_CHATS = "aura-context-chats";
const STORAGE_VOICES = "aura-assigned-voices";
const STORAGE_VOICE_POOL = "aura-voice-pool";
const STORAGE_EMERGENCY = "aura-emergency-contacts";
const STORAGE_THEME = "aura-wa-theme";
const STORAGE_SOS = "sosKeyword";

const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "e1", name: "Caner Kılınç", relation: "Eş", phone: "0532...", active: true },
  { id: "e2", name: "Ayşe Yıldız", relation: "Anne", phone: "0544...", active: true },
  { id: "e3", name: "Seda Korkmaz", relation: "Arkadaş", phone: "0505...", active: false },
];

function loadEmergencyContacts(): EmergencyContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_EMERGENCY);
    if (!raw) return DEFAULT_EMERGENCY_CONTACTS;
    const parsed = JSON.parse(raw) as EmergencyContact[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_EMERGENCY_CONTACTS;
    return parsed;
  } catch {
    return DEFAULT_EMERGENCY_CONTACTS;
  }
}

/** Profil’deki güvenlik kelimesi ile aynı mantık (ses + yazı). */
function normalizeSosText(t: string) {
  return t
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

export function textMatchesSosKeyword(text: string, sosKeyword: string): boolean {
  const t = text.toLowerCase();
  const parts = normalizeSosText(sosKeyword)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length > 0) {
    return parts.every((p) => t.includes(p) || normalizeSosText(text).includes(normalizeSosText(p)));
  }
  return t.includes(sosKeyword.toLowerCase());
}

function simulateEmergencyDispatch(contacts: EmergencyContact[]) {
  const active = contacts.filter((c) => c.active);
  const payload = {
    type: "aura.discrete_sos",
    at: new Date().toISOString(),
    recipients: active.map((c) => ({ name: c.name, phone: c.phone, relation: c.relation })),
    simulatedLocation: { lat: 41.0082, lng: 28.9784, label: "Konum (simülasyon)" },
  };
  console.log("[Aura] Gizli acil bildirim / konum simülasyonu:", payload);
}

function loadVoicePool(): VoicePoolEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_VOICE_POOL);
    if (!raw) return DEFAULT_VOICE_POOL;
    const parsed = JSON.parse(raw) as VoicePoolEntry[];
    if (!Array.isArray(parsed)) return DEFAULT_VOICE_POOL;
    const byId = new Map(parsed.map((e) => [e.id, e]));
    return DEFAULT_VOICE_POOL.map((d) => {
      const saved = byId.get(d.id);
      if (!saved) return d;
      return {
        ...d,
        triggerText: typeof saved.triggerText === "string" ? saved.triggerText : d.triggerText,
        responseText: typeof saved.responseText === "string" ? saved.responseText : d.responseText,
        audioFile: typeof saved.audioFile === "string" ? saved.audioFile : d.audioFile,
        label: typeof saved.label === "string" ? saved.label : d.label,
      };
    });
  } catch {
    return DEFAULT_VOICE_POOL;
  }
}

const defaultChats: Chat[] = [
  {
    id: "abim",
    name: "Abim",
    lastMessage: "Tamamdır.",
    time: "18:28",
    avatar: "bg-blue-400",
    messages: [{ id: "m1", sender: "other", text: "Tamamdır.", time: "18:28" }],
  },
  {
    id: "annem",
    name: "Annem",
    lastMessage: "Neredesin?",
    time: "18:10",
    avatar: "bg-red-400",
    messages: [{ id: "m2", sender: "other", text: "Neredesin?", time: "18:10" }],
  },
  {
    id: "is-grubu",
    name: "İş Grubu",
    lastMessage: "Dosyalar ektedir.",
    time: "17:55",
    avatar: "bg-green-500",
    messages: [{ id: "m3", sender: "other", text: "Dosyalar ektedir.", time: "17:55" }],
  },
];

function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(STORAGE_CHATS);
    if (!raw) return defaultChats;
    const parsed = JSON.parse(raw) as Chat[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaultChats;
  } catch {
    return defaultChats;
  }
}

function loadAssigned(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_VOICES);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function loadTheme(): Theme {
  const t = localStorage.getItem(STORAGE_THEME);
  if (t === "wa-light" || t === "wa-dark" || t === "aura-dark") return t;
  return "wa-dark";
}

function formatMsgTime(d = new Date()) {
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isCamouflaged: boolean;
  setIsCamouflaged: (status: boolean) => void;
  assignedVoices: Record<string, string>;
  assignVoice: (chatId: string, volunteerId: string) => void;
  chats: Chat[];
  updateChatName: (chatId: string, newName: string) => void;
  appendMessagesToChat: (chatId: string, messages: Message[]) => void;
  /** Sohbet ID → kayıtlı ses (blob URL, ot oturum) */
  chatVoiceUrls: Record<string, string>;
  setChatVoiceUrl: (chatId: string, url: string | null) => void;
  sosKeyword: string;
  setSosKeyword: (v: string) => void;
  voicePool: VoicePoolEntry[];
  updateVoicePoolEntry: (id: string, patch: Partial<Pick<VoicePoolEntry, "triggerText" | "responseText">>) => void;
  emergencyContacts: EmergencyContact[];
  toggleEmergencyContact: (id: string) => void;
  /** Mikrofon veya sohbette güvenlik kelimesi: pembe kalp + acil simülasyonu (tam ekran yok). */
  triggerDiscreteSos: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}

function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());
  const [isCamouflaged, setIsCamouflaged] = useState(true);
  const [assignedVoices, setAssignedVoices] = useState<Record<string, string>>(() => loadAssigned());
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [chatVoiceUrls, setChatVoiceUrlsState] = useState<Record<string, string>>({});
  const [sosKeyword, setSosKeywordState] = useState(() => localStorage.getItem(STORAGE_SOS) || "Mavi Elma");
  const [voicePool, setVoicePool] = useState<VoicePoolEntry[]>(() => loadVoicePool());
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() =>
    loadEmergencyContacts(),
  );
  const [sosHeartPhase, setSosHeartPhase] = useState<"off" | "show" | "fade">("off");
  const sosHeartTimersRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_EMERGENCY, JSON.stringify(emergencyContacts));
  }, [emergencyContacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CHATS, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_VOICES, JSON.stringify(assignedVoices));
  }, [assignedVoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_VOICE_POOL, JSON.stringify(voicePool));
  }, [voicePool]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  const setSosKeyword = useCallback((v: string) => {
    setSosKeywordState(v);
    localStorage.setItem(STORAGE_SOS, v);
  }, []);

  const assignVoice = useCallback((chatId: string, volunteerId: string) => {
    setAssignedVoices((prev) => {
      const next = { ...prev, [chatId]: volunteerId };
      return next;
    });
  }, []);

  const updateChatName = useCallback((chatId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, name: trimmed } : chat)),
    );
  }, []);

  const appendMessagesToChat = useCallback((chatId: string, newMessages: Message[]) => {
    if (!newMessages.length) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        const messages = [...c.messages, ...newMessages];
        const last = newMessages[newMessages.length - 1];
        const preview = last.text.length > 80 ? `${last.text.slice(0, 80)}…` : last.text;
        return {
          ...c,
          messages,
          lastMessage: preview,
          time: last.time,
        };
      }),
    );
  }, []);

  const setChatVoiceUrl = useCallback((chatId: string, url: string | null) => {
    setChatVoiceUrlsState((prev) => {
      const next = { ...prev };
      if (url == null) delete next[chatId];
      else next[chatId] = url;
      return next;
    });
  }, []);

  const updateVoicePoolEntry = useCallback(
    (id: string, patch: Partial<Pick<VoicePoolEntry, "triggerText" | "responseText">>) => {
      setVoicePool((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const toggleEmergencyContact = useCallback((id: string) => {
    setEmergencyContacts((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  }, []);

  const clearSosHeartTimers = useCallback(() => {
    sosHeartTimersRef.current.forEach((tid) => window.clearTimeout(tid));
    sosHeartTimersRef.current = [];
  }, []);

  const triggerDiscreteSos = useCallback(() => {
    clearSosHeartTimers();
    if ("vibrate" in navigator) navigator.vibrate([120, 80, 120]);
    simulateEmergencyDispatch(emergencyContacts);
    setSosHeartPhase("show");
    sosHeartTimersRef.current.push(
      window.setTimeout(() => setSosHeartPhase("fade"), 3000),
      window.setTimeout(() => setSosHeartPhase("off"), 4000),
    );
  }, [clearSosHeartTimers, emergencyContacts]);

  useEffect(() => () => clearSosHeartTimers(), [clearSosHeartTimers]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isCamouflaged,
      setIsCamouflaged,
      assignedVoices,
      assignVoice,
      chats,
      updateChatName,
      appendMessagesToChat,
      chatVoiceUrls,
      setChatVoiceUrl,
      sosKeyword,
      setSosKeyword,
      voicePool,
      updateVoicePoolEntry,
      emergencyContacts,
      toggleEmergencyContact,
      triggerDiscreteSos,
    }),
    [
      theme,
      setTheme,
      isCamouflaged,
      assignedVoices,
      assignVoice,
      chats,
      updateChatName,
      appendMessagesToChat,
      chatVoiceUrls,
      setChatVoiceUrl,
      sosKeyword,
      setSosKeyword,
      voicePool,
      updateVoicePoolEntry,
      emergencyContacts,
      toggleEmergencyContact,
      triggerDiscreteSos,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
      <DiscreteSosHeart phase={sosHeartPhase} />
    </SettingsContext.Provider>
  );
}

function DiscreteSosHeart({ phase }: { phase: "off" | "show" | "fade" }) {
  if (phase === "off") return null;
  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-6 z-[2000] transition-all duration-1000 ease-out motion-reduce:transition-none ${
        phase === "fade" ? "opacity-0 scale-75" : "opacity-100 scale-100"
      }`}
      aria-hidden
    >
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-[#ff2d85]/40 blur-xl motion-reduce:animate-none" />
        <Heart
          className="relative size-12 fill-[#ff2d85] text-[#ff2d85] drop-shadow-[0_0_18px_rgba(255,45,133,0.9)] motion-reduce:animate-none"
          strokeWidth={1.25}
        />
      </div>
    </div>
  );
}

/** Sesli tetikleyici — kelime Profil’deki SOS ile senkron; gizli pembe kalp + acil simülasyonu. */
function SpeechSosListener() {
  const { sosKeyword, triggerDiscreteSos } = useSettings();

  useEffect(() => {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        lang: string;
        start: () => void;
        stop: () => void;
        onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
      };
      SpeechRecognition?: new () => {
        continuous: boolean;
        lang: string;
        start: () => void;
        stop: () => void;
        onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
      };
    };
    const Ctor = w.webkitSpeechRecognition || w.SpeechRecognition;
    if (!Ctor) return;

    let cancelled = false;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.lang = "tr-TR";

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0]?.transcript ?? "";
      if (textMatchesSosKeyword(transcript, sosKeyword)) {
        console.log("[Aura] Güvenlik kelimesi (ses)");
        triggerDiscreteSos();
      }
    };

    recognition.onend = () => {
      if (!cancelled) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((x) => x.stop());
      } catch {
        /* ignore */
      }
      try {
        recognition.start();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    };
  }, [sosKeyword, triggerDiscreteSos]);

  return null;
}

const Avatar = ({ color, name }: { color: string; name: string }) => (
  <div
    className={`flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white/90 ${color}`}
  >
    {name.charAt(0)}
  </div>
);

function VoiceRecorder({
  chats,
  onAssign,
}: {
  chats: Chat[];
  onAssign: (chatId: string, url: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: chunksRef.current[0]?.type || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start();
      setRecording(true);
    } catch {
      alert("Mikrofon izni gerekli veya kayıt desteklenmiyor.");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setRecording(false);
    mediaRecorderRef.current = null;
  };

  return (
    <div className="rounded-3xl border border-[#ff2d85]/30 bg-black/40 p-6">
      <h4 className="mb-4 text-lg font-bold">Yeni ses kaydı oluştur</h4>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {!recording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="rounded-full bg-[#ff2d85] p-4 transition hover:scale-105"
            aria-label="Kaydı başlat"
          >
            <Mic size={24} />
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="animate-pulse rounded-full bg-red-600 p-4"
            aria-label="Kaydı durdur"
          >
            <div className="size-4 rounded-sm bg-white" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-400">
            {recording ? "Sesiniz kaydediliyor..." : "Kayıt için mikrofona basın."}
          </p>
          {audioUrl ? (
            <div className="mt-3 space-y-3">
              <audio src={audioUrl} controls className="h-10 w-full accent-[#ff2d85]" />
              <div>
                <p className="mb-2 text-xs text-gray-500">Kaydı sohbete ata:</p>
                <div className="flex flex-wrap gap-2">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => onAssign(chat.id, audioUrl)}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs hover:bg-[#ff2d85]/30"
                    >
                      {chat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VoicePoolEditor() {
  const { voicePool, updateVoicePoolEntry } = useSettings();
  const [drafts, setDrafts] = useState<Record<string, { triggerText: string; responseText: string }>>(
    () =>
      Object.fromEntries(
        voicePool.map((e) => [e.id, { triggerText: e.triggerText, responseText: e.responseText }]),
      ),
  );
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const e of voicePool) {
        if (next[e.id] === undefined) {
          next[e.id] = { triggerText: e.triggerText, responseText: e.responseText };
        }
      }
      return next;
    });
  }, [voicePool]);

  const setDraft = (id: string, field: "triggerText" | "responseText", value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = (entry: VoicePoolEntry) => {
    const d = drafts[entry.id];
    if (!d) return;
    updateVoicePoolEntry(entry.id, {
      triggerText: d.triggerText.trim(),
      responseText: d.responseText.trim(),
    });
    setSavedFlash(entry.id);
    window.setTimeout(() => setSavedFlash((x) => (x === entry.id ? null : x)), 1600);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#151825] via-[#1a1f2e] to-[#12151f] p-6 shadow-xl shadow-black/40">
      <div className="mb-6 flex flex-col gap-2 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Tetikleyici &amp; yanıt yönetimi
          </h2>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Her hazır ses için: hangi mesaj gelince tetiklensin ve AI hangi metni yazsın? Kaydet ile tarayıcıda saklanır (
            <code className="text-gray-500">localStorage</code>).
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#ff2d85]/25 bg-[#ff2d85]/10 px-3 py-2 text-xs text-[#ffa6cb]">
          <HardDrive size={14} className="shrink-0" aria-hidden />
          <span>{voicePool.length} hazır ses</span>
        </div>
      </div>

      <div className="space-y-4">
        {voicePool.map((entry) => {
          const d = drafts[entry.id] ?? {
            triggerText: entry.triggerText,
            responseText: entry.responseText,
          };
          const dirty =
            d.triggerText.trim() !== entry.triggerText.trim() ||
            d.responseText.trim() !== entry.responseText.trim();
          return (
            <div
              key={entry.id}
              className="grid gap-4 rounded-xl border border-white/[0.07] bg-[#1c2132]/80 p-4 backdrop-blur-sm transition hover:border-white/12 md:grid-cols-[auto_1fr_auto]"
            >
              <div className="flex flex-col items-center gap-3 md:w-36">
                <button
                  type="button"
                  onClick={() => playPublicSound(entry.audioFile)}
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#ff2d85]/20 text-[#ff2d85] ring-2 ring-[#ff2d85]/30 transition hover:scale-105 hover:bg-[#ff2d85]/30"
                  aria-label={`${entry.label} önizleme`}
                  title="Önizle"
                >
                  <Play size={22} fill="currentColor" className="ml-0.5" />
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">{entry.label}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-gray-500">{entry.audioFile}</p>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Hangi mesaj gelince bu ses aktif olsun?
                  </label>
                  <input
                    type="text"
                    value={d.triggerText}
                    onChange={(e) => setDraft(entry.id, "triggerText", e.target.value)}
                    placeholder="örn. neredesin"
                    className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#ff2d85]/40 focus:outline-none focus:ring-1 focus:ring-[#ff2d85]/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                    AI ne cevap yazsın?
                  </label>
                  <input
                    type="text"
                    value={d.responseText}
                    onChange={(e) => setDraft(entry.id, "responseText", e.target.value)}
                    placeholder="örn. Yoldayım geliyorum."
                    className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#ff2d85]/40 focus:outline-none focus:ring-1 focus:ring-[#ff2d85]/30"
                  />
                </div>
              </div>

              <div className="flex flex-col items-stretch justify-center gap-2 md:w-36">
                <button
                  type="button"
                  onClick={() => handleSave(entry)}
                  disabled={!dirty}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff2d85] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff2d85]/20 transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 disabled:shadow-none"
                >
                  <Save size={16} />
                  Kaydet
                </button>
                {savedFlash === entry.id ? (
                  <p className="text-center text-xs text-green-400">Kaydedildi</p>
                ) : dirty ? (
                  <p className="text-center text-xs text-amber-400/90">Kaydedilmemiş değişiklik</p>
                ) : (
                  <p className="text-center text-xs text-gray-600">Güncel</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChatListItem = ({ chat, onSelect }: { chat: Chat; onSelect: (chat: Chat) => void }) => {
  const { theme } = useSettings();
  const textColor = theme === "wa-light" ? "text-black" : "text-white";
  const lastMsgColor = theme === "wa-light" ? "text-gray-600" : "text-gray-400";
  const borderColor = theme === "wa-light" ? "border-gray-200" : "border-gray-800";

  return (
    <button
      type="button"
      onClick={() => onSelect(chat)}
      className={`flex w-full cursor-pointer items-center gap-4 border-b ${borderColor} p-2 pb-4 text-left transition-colors hover:bg-black/5`}
    >
      <Avatar color={chat.avatar} name={chat.name} />
      <div className="min-w-0 flex-1">
        <h3 className={`font-semibold ${textColor}`}>{chat.name}</h3>
        <p className={`truncate text-sm ${lastMsgColor}`}>{chat.lastMessage}</p>
      </div>
      <div className="shrink-0 space-y-1 text-right">
        <span className="text-xs font-medium text-[#25d366]">{chat.time}</span>
        {chat.id === "annem" && (
          <div className="ml-auto flex size-5 items-center justify-center rounded-full bg-[#25d366] text-[10px] text-white">
            1
          </div>
        )}
      </div>
    </button>
  );
};

function WhatsAppView() {
  const {
    theme,
    setTheme,
    setIsCamouflaged,
    chats,
    updateChatName,
    appendMessagesToChat,
    chatVoiceUrls,
    voicePool,
    sosKeyword,
    triggerDiscreteSos,
  } = useSettings();
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const selectedChat = openChatId ? chats.find((c) => c.id === openChatId) ?? null : null;

  const [isEditingName, setIsEditingName] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const aiReplyTimerRef = useRef<number | null>(null);

  const headerBg =
    theme === "wa-light" ? "bg-[#f0f2f5]" : theme === "aura-dark" ? "bg-[#1a1c2c]" : "bg-[#202c33]";
  const bodyBg =
    theme === "wa-light" ? "bg-white" : theme === "aura-dark" ? "bg-[#0f111a]" : "bg-[#0b141a]";
  const textColor = theme === "wa-light" ? "text-black" : "text-white";
  const secondaryTextColor = theme === "wa-light" ? "text-gray-600" : "text-[#8696a0]";
  const chatBg =
    theme === "wa-light" ? "bg-[#e5ddd5]" : theme === "aura-dark" ? "bg-[#0f111a]" : "bg-[#0b141a]";
  const msgMeBg = theme === "wa-light" ? "bg-[#dcf8c6]" : "bg-[#005c4b]";
  const msgOtherBg = theme === "wa-light" ? "bg-white" : "bg-[#202c33]";

  const startEditing = (currentName: string) => {
    setNewChatName(currentName);
    setIsEditingName(true);
    setShowChatMenu(false);
  };

  const handleSaveName = () => {
    if (!selectedChat) return;
    updateChatName(selectedChat.id, newChatName);
    setIsEditingName(false);
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !openChatId) return;
    const now = formatMsgTime();
    const trimmed = text.trim();
    const sentText = trimmed.toLowerCase();
    const myMsg: Message = { id: `${Date.now()}`, sender: "me", text: trimmed, time: now };
    appendMessagesToChat(openChatId, [myMsg]);
    setDraft("");

    if (textMatchesSosKeyword(trimmed, sosKeyword)) {
      if (aiReplyTimerRef.current) {
        window.clearTimeout(aiReplyTimerRef.current);
        aiReplyTimerRef.current = null;
      }
      setIsTyping(false);
      triggerDiscreteSos();
      return;
    }

    if (aiReplyTimerRef.current) window.clearTimeout(aiReplyTimerRef.current);
    setIsTyping(true);
    aiReplyTimerRef.current = window.setTimeout(() => {
      setIsTyping(false);
      const match = voicePool.find((e) => {
        const t = e.triggerText.trim().toLowerCase();
        return t.length > 0 && sentText.includes(t);
      });
      let aiMsg: Message;
      if (match) {
        aiMsg = {
          id: `${Date.now()}-ai`,
          sender: "other",
          text: match.responseText,
          time: formatMsgTime(),
          hasAudio: true,
          audioFile: match.audioFile,
        };
      } else {
        aiMsg = {
          id: `${Date.now()}-ai`,
          sender: "other",
          text: "Anladım canım, haberleşiriz.",
          time: formatMsgTime(),
        };
      }
      appendMessagesToChat(openChatId, [aiMsg]);
      aiReplyTimerRef.current = null;
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (aiReplyTimerRef.current) window.clearTimeout(aiReplyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onDoc = () => {
      setShowChatMenu(false);
      setShowThemeMenu(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className={`flex h-screen flex-col font-sans antialiased ${bodyBg} ${textColor}`}>
      <div className={`relative z-20 flex items-center justify-between p-4 ${headerBg}`}>
        <div className="flex items-center gap-2">
          {selectedChat && (
            <button
              type="button"
              onClick={() => {
                setOpenChatId(null);
                setIsEditingName(false);
                setDraft("");
                setIsTyping(false);
                if (aiReplyTimerRef.current) {
                  window.clearTimeout(aiReplyTimerRef.current);
                  aiReplyTimerRef.current = null;
                }
              }}
              className="-ml-2 p-2 text-[#25d366]"
              aria-label="Geri"
            >
              ←
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-[#25d366]">
              {selectedChat ? selectedChat.name : "Sohbetler"}
            </h1>
            {selectedChat ? (
              <span className={`text-[11px] ${secondaryTextColor}`}>
                {isTyping ? "yazıyor..." : "çevrimiçi"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="relative flex items-center gap-5">
          <Search size={22} className={secondaryTextColor} aria-hidden />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCamouflaged(false);
            }}
            className="group rounded-lg"
            title="Aura"
            aria-label="Aura paneli"
          >
            <Shield size={22} className="text-[#25d366] transition-colors group-hover:text-[#ff2d85]" />
          </button>
          {selectedChat ? (
            <div className="relative">
              <button
                type="button"
                className="rounded p-1"
                aria-label="Sohbet menüsü"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChatMenu((v) => !v);
                }}
              >
                <MoreVertical size={22} className={secondaryTextColor} />
              </button>
              {showChatMenu && (
                <div
                  className={`absolute right-0 top-full z-30 mt-2 w-40 rounded-lg border border-gray-700 shadow-xl ${headerBg}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => startEditing(selectedChat.name)}
                    className="flex w-full items-center gap-2 p-3 text-sm hover:bg-black/10"
                  >
                    <Edit2 size={16} /> İsmi değiştir
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-t border-gray-700 p-3 text-sm text-red-400 hover:bg-black/10"
                    onClick={() => alert("Sohbet silme (simülasyon).")}
                  >
                    Sohbeti sil
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                className="rounded p-1"
                aria-label="Tema menüsü"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowThemeMenu((v) => !v);
                }}
              >
                <MoreVertical size={22} className={secondaryTextColor} />
              </button>
              {showThemeMenu && (
                <div
                  className={`absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border border-gray-700 shadow-xl ${headerBg}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(
                    [
                      { name: "wa-light" as const, label: "Light Mode", icon: Sun },
                      { name: "wa-dark" as const, label: "Dark Mode", icon: Moon },
                      { name: "aura-dark" as const, label: "Aura Koyu", icon: Shield },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        setTheme(t.name);
                        setShowThemeMenu(false);
                      }}
                      className={`flex w-full items-center justify-between p-3 text-sm hover:bg-black/10 ${
                        theme === t.name ? "font-bold text-[#25d366]" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <t.icon size={16} /> {t.label}
                      </span>
                      {theme === t.name ? <Check size={16} /> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        {selectedChat ? (
          <div className={`absolute inset-0 flex flex-col ${chatBg}`}>
            {isEditingName && (
              <div className="flex items-center gap-2 bg-yellow-100 p-3 text-black">
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 p-2"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-2 text-sm text-gray-600"
                >
                  İptal
                </button>
              </div>
            )}
            <div className="flex-1 space-y-4 overflow-y-auto p-6 pb-32">
              {selectedChat.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[75%] rounded-xl p-3 text-sm shadow-sm ${msg.sender === "me" ? `${msgMeBg} rounded-tr-none` : `${msgOtherBg} rounded-tl-none`} ${msg.sender === "me" ? "text-white" : theme === "wa-light" ? "text-black" : "text-[#e9edef]"}`}
                  >
                    <p className="pr-6 text-[14.5px] leading-relaxed">{msg.text}</p>

                    {msg.hasAudio && msg.audioFile ? (
                      <button
                        type="button"
                        onClick={() => playPublicSound(msg.audioFile!)}
                        className={`mt-2 flex w-full cursor-pointer items-center gap-3 rounded-md border p-2 transition-all ${
                          msg.sender === "me"
                            ? theme === "wa-light"
                              ? "border-black/10 bg-black/10 hover:bg-black/15"
                              : "border-white/10 bg-black/15 hover:bg-black/25"
                            : "border-white/5 bg-black/20 hover:bg-black/30"
                        }`}
                      >
                        <div
                          className={`rounded-full p-1.5 ${msg.sender === "me" ? "bg-[#005c4b]" : "bg-[#202c33]"}`}
                        >
                          <Play size={16} className="text-[#25d366]" fill="currentColor" />
                        </div>
                        <div className="flex flex-1 items-end gap-0.5">
                          {[2, 4, 3, 5, 2, 4, 3].map((h, i) => (
                            <div
                              key={i}
                              className="w-0.5 rounded-full bg-gray-500"
                              style={{ height: `${h * 3}px` }}
                            />
                          ))}
                        </div>
                        <span className="font-mono text-[10px] text-gray-400">0:05</span>
                        <Mic size={14} className="shrink-0 text-blue-400" aria-hidden />
                      </button>
                    ) : null}

                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className={`text-[10px] uppercase ${secondaryTextColor}`}>{msg.time}</span>
                      {msg.sender === "me" ? <CheckCheck size={14} className="text-[#53bdeb]" /> : null}
                    </div>
                  </div>
                </div>
              ))}

              {chatVoiceUrls[selectedChat.id] ? (
                <div className="flex justify-start">
                  <div
                    className={`flex max-w-[85%] items-center gap-3 rounded-xl p-3 text-sm ${msgOtherBg} ${theme === "wa-light" ? "text-black" : "text-[#e9edef]"}`}
                  >
                    <span className="text-lg" aria-hidden>
                      🎤
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Atanan ses kaydı</p>
                      <audio
                        src={chatVoiceUrls[selectedChat.id]}
                        controls
                        className="mt-1 h-8 w-full max-w-[220px] accent-[#25d366]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const a = new Audio(chatVoiceUrls[selectedChat.id]);
                        a.volume = 1;
                        void a.play();
                      }}
                      className="shrink-0 rounded-full bg-[#25d366]/20 p-2 text-[#25d366]"
                      title="Oynat"
                      aria-label="Sesi oynat"
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              ) : null}

              {isTyping ? (
                <div className="flex justify-start animate-pulse">
                  <div
                    className={`flex max-w-[70%] items-center gap-1 rounded-xl p-3 text-sm ${msgOtherBg} ${theme === "wa-light" ? "text-black" : "text-[#e9edef]"}`}
                  >
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0ms" }}
                      aria-hidden
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "150ms" }}
                      aria-hidden
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "300ms" }}
                      aria-hidden
                    />
                    <span className="ml-2 text-xs italic text-gray-500">yazıyor...</span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className={`absolute bottom-0 left-0 right-0 flex items-center gap-3 border-t border-gray-800 p-4 ${headerBg}`}>
              <span className="text-gray-500">+</span>
              <input
                type="text"
                placeholder="Bir mesaj yazın"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(draft);
                  }
                }}
                className={`flex-1 rounded-full p-3 text-sm focus:outline-none ${bodyBg} ${textColor}`}
              />
              <button
                type="button"
                className="rounded-full bg-[#00a884] p-2.5 text-[#0b141a] transition-colors hover:bg-[#06cf9c]"
                aria-label="Gönder"
                onClick={() => handleSendMessage(draft)}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full space-y-5 overflow-y-auto p-6">
            {chats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} onSelect={(c) => setOpenChatId(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Destek merkezi — müsait kadın gönüllüler (simülasyon verisi). */
const SUPPORT_VOLUNTEER_WOMEN = [
  { id: "sw1", name: "Zeynep Yılmaz", initials: "ZY", available: true },
  { id: "sw2", name: "Elif Arslan", initials: "EA", available: true },
  { id: "sw3", name: "Merve Kaya", initials: "MK", available: true },
  { id: "sw4", name: "Deniz Öztürk", initials: "DÖ", available: true },
] as const;

const SUPPORT_SEEKERS = [
  { id: "sk1", text: "Kullanıcı 42 — Beşiktaş bölgesinde refakatçi arıyor" },
  { id: "sk2", text: "Kullanıcı 17 — Gece yolculuğunda sesli eşlik talep ediyor" },
  { id: "sk3", text: "Kullanıcı 91 — Topluluk alanında yüz yüze destek arıyor" },
  { id: "sk4", text: "Kullanıcı 08 — İş çıkışı güvenli takip için görüşme istiyor" },
] as const;

function AuraPanel() {
  const {
    setIsCamouflaged,
    chats,
    assignedVoices,
    assignVoice,
    setChatVoiceUrl,
    sosKeyword,
    setSosKeyword,
    emergencyContacts,
    toggleEmergencyContact,
    triggerDiscreteSos,
  } = useSettings();
  const [selectedTab, setSelectedTab] = useState<"havuz" | "destek" | "profil">("havuz");
  const [destekSubTab, setDestekSubTab] = useState<"volunteers" | "seekers">("volunteers");
  const [destekQuickLine, setDestekQuickLine] = useState("");

  const volunteers: VoiceVolunteer[] = [
    { id: "v1", name: "Caner Ö.", gender: "male", description: 'Metin: "5 dakikaya oradayım ablacım."' },
    { id: "v2", name: "Zeynep Y.", gender: "female", description: 'Metin: "Yoldayım anneciğim, merak etme."' },
    { id: "v3", name: "Burak T.", gender: "male", description: 'Metin: "Hayırlı işler abi, görüşürüz."' },
  ];

  const listChats = chats;

  const handleDestekQuickSubmit = () => {
    const t = destekQuickLine.trim();
    if (!t) return;
    if (textMatchesSosKeyword(t, sosKeyword)) {
      triggerDiscreteSos();
      setDestekQuickLine("");
      return;
    }
  };

  const simulateVoiceCall = (contextLabel: string) => {
    alert(`Sesli arama başlatılıyor (simülasyon): ${contextLabel}`);
  };
  const simulateVideoCall = (contextLabel: string) => {
    alert(`Görüntülü arama başlatılıyor (simülasyon): ${contextLabel}`);
  };

  return (
    <div className="flex h-screen bg-[#0f111a] font-sans text-white">
      <div className="flex w-1/4 flex-col justify-between bg-[#161926] p-8">
        <div className="space-y-10">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#ff2d85] p-2 shadow-lg shadow-[#ff2d85]/20">
              <Shield size={28} />
            </div>
            <h2 className="text-2xl font-bold tracking-wider">AURA</h2>
          </div>

          <nav className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedTab("havuz")}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 transition-all ${
                selectedTab === "havuz" ? "bg-[#ff2d85] shadow-lg shadow-[#ff2d85]/30" : "opacity-70 hover:bg-white/5"
              }`}
            >
              <Mic size={20} /> Ses havuzu
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("destek")}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 transition-all ${
                selectedTab === "destek" ? "bg-[#ff2d85]" : "opacity-70 hover:bg-white/5"
              }`}
            >
              <AlertTriangle size={20} /> Destek merkezi
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("profil")}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 transition-all ${
                selectedTab === "profil" ? "bg-[#ff2d85]" : "opacity-70 hover:bg-white/5"
              }`}
            >
              <User size={20} /> Profil
            </button>
          </nav>
        </div>

        <button
          type="button"
          onClick={() => setIsCamouflaged(true)}
          className="flex items-center gap-2 p-4 text-gray-400 transition-colors hover:text-white"
        >
          <LogOut size={20} /> Çıkış (maskeye dön)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-12">
        {selectedTab === "havuz" && (
          <div className="mx-auto max-w-5xl space-y-12">
            <VoicePoolEditor />

            <div className="border-t border-white/10 pt-10">
              <div className="mb-8 text-center">
                <h1 className="mb-3 text-3xl font-bold uppercase tracking-tighter text-white">
                  Ses gönüllüleri
                </h1>
                <p className="text-gray-400">
                  Metinleri seslendirerek toplumsal dayanışmaya destek olan gönüllülerimiz.
                </p>
              </div>

              <VoiceRecorder
                chats={listChats}
                onAssign={(chatId, url) => {
                  setChatVoiceUrl(chatId, url);
                  const name = listChats.find((c) => c.id === chatId)?.name ?? chatId;
                  alert(`Kayıt "${name}" sohbetine atandı. WhatsApp ekranında o sohbette dinleyebilirsiniz.`);
                }}
              />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {volunteers.map((v) => (
                <div key={v.id} className="flex flex-col gap-5 rounded-3xl border border-white/5 bg-[#1c2132] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`mb-2 inline-block rounded-full px-2 py-1 text-[10px] uppercase ${
                          v.gender === "male" ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"
                        }`}
                      >
                        {v.gender === "male" ? "Erkek gönüllü" : "Kadın gönüllü"}
                      </span>
                      <h3 className="text-xl font-bold">{v.name}</h3>
                      <p className="mt-2 text-sm italic text-gray-400">&quot;{v.description}&quot;</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-white/5 p-2 text-[#ff2d85]"
                      onClick={() => alert("Örnek dinle (simülasyon).")}
                      aria-label="Örnek dinle"
                    >
                      <Play size={20} fill="#ff2d85" />
                    </button>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <h4 className="mb-3 text-sm text-gray-500">Sohbet eşleştirme</h4>
                    <div className="flex flex-wrap gap-2">
                      {listChats.map((chat) => {
                        const isAssigned = assignedVoices[chat.id] === v.id;
                        return (
                          <button
                            key={chat.id}
                            type="button"
                            onClick={() => assignVoice(chat.id, v.id)}
                            className={`flex items-center gap-1 rounded-xl border px-4 py-2 text-xs transition-all ${
                              isAssigned
                                ? "border-[#ff2d85] bg-[#ff2d85]"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            }`}
                          >
                            {isAssigned ? <Check size={14} /> : null} {chat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {selectedTab === "destek" && (
          <div className="mx-auto max-w-4xl space-y-8 pb-16">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff2d85]/90">
                Dayanışma ağı
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white">Destek merkezi</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
                Gönüllü kadınlarla güvenli bağlantı ve yardım taleplerinin eşleştirilmesi. Tüm aramalar şu an
                simülasyondur; gerçek hat entegrasyonu ayrıca bağlanır.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#161926]/80 p-4 shadow-lg backdrop-blur-md">
              <label className="mb-2 block text-xs font-medium text-gray-500">
                Hızlı not veya güvenlik kelimesi (Enter) — sesli algılama tüm uygulamada açık
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={destekQuickLine}
                  onChange={(e) => setDestekQuickLine(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleDestekQuickSubmit();
                    }
                  }}
                  placeholder='Örn: "randevu onayı" veya Profildeki güvenlik kelimeniz'
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#ff2d85]/35 focus:outline-none focus:ring-1 focus:ring-[#ff2d85]/30"
                />
                <button
                  type="button"
                  onClick={handleDestekQuickSubmit}
                  className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15"
                >
                  Gönder
                </button>
              </div>
            </div>

            <div className="flex gap-1 rounded-2xl border border-white/10 bg-[#1c2132]/50 p-1">
              <button
                type="button"
                onClick={() => setDestekSubTab("volunteers")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  destekSubTab === "volunteers"
                    ? "bg-[#ff2d85] text-white shadow-md shadow-[#ff2d85]/25"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                Destek Olmak İsteyenler
              </button>
              <button
                type="button"
                onClick={() => setDestekSubTab("seekers")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  destekSubTab === "seekers"
                    ? "bg-[#ff2d85] text-white shadow-md shadow-[#ff2d85]/25"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                Destek Arayanlar
              </button>
            </div>

            {destekSubTab === "volunteers" ? (
              <ul className="space-y-3">
                {SUPPORT_VOLUNTEER_WOMEN.filter((v) => v.available).map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-[#1c2132] p-4 transition hover:border-[#ff2d85]/25"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-600 to-gray-800 text-sm font-bold text-white ring-2 ring-white/10"
                        aria-hidden
                      >
                        {v.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{v.name}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60 opacity-75 motion-reduce:animate-none" />
                            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                          </span>
                          Müsait · Çevrimiçi
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => simulateVoiceCall(v.name)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f111a] px-4 py-2.5 text-xs font-medium text-[#e9edef] transition hover:border-[#25d366]/50 hover:text-[#25d366]"
                        title="Sesli ara"
                      >
                        <Phone size={16} className="text-[#25d366]" />
                        Sesli ara
                      </button>
                      <button
                        type="button"
                        onClick={() => simulateVideoCall(v.name)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f111a] px-4 py-2.5 text-xs font-medium text-[#e9edef] transition hover:border-[#ff2d85]/50 hover:text-[#ff2d85]"
                        title="Görüntülü ara"
                      >
                        <Video size={16} className="text-[#ff2d85]" />
                        Görüntülü ara
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-3">
                {SUPPORT_SEEKERS.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-[#161926] p-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-500"
                        aria-hidden
                      >
                        <User size={18} />
                      </div>
                      <p className="text-sm leading-relaxed text-gray-300">{s.text}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => simulateVoiceCall(s.text)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#1c2132] px-4 py-2.5 text-xs font-medium text-[#e9edef] transition hover:border-[#25d366]/50 hover:text-[#25d366]"
                      >
                        <Phone size={16} className="text-[#25d366]" />
                        Sesli ara
                      </button>
                      <button
                        type="button"
                        onClick={() => simulateVideoCall(s.text)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#1c2132] px-4 py-2.5 text-xs font-medium text-[#e9edef] transition hover:border-[#ff2d85]/50 hover:text-[#ff2d85]"
                      >
                        <Video size={16} className="text-[#ff2d85]" />
                        Görüntülü ara
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-2xl border border-red-900/40 bg-red-950/25 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                  <AlertTriangle size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-red-200">Acil durum hattı</p>
                  <p className="mt-1 text-sm text-red-200/70">
                    Yaşam güvenliği riski varsa 112 / ALO 183. Uygulama içi gizli tetik için Profil’deki güvenlik
                    kelimenizi kullanın (sol altta pembe kalp).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert("ACİL DURUM — Konum ve bildirim simülasyonu (geliştirici modu).")}
                  className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Simülasyonu çalıştır
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "profil" && (
          <div className="mx-auto max-w-4xl space-y-10">
            <div className="relative flex items-center gap-8 rounded-3xl border border-white/5 bg-[#1c2132] p-8">
              <Avatar color="bg-[#ff2d85]" name="A" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">Aura kullanıcısı</h2>
                <p className="text-gray-400">kullanici@aura.app</p>
              </div>
              <div className="rounded-full bg-green-600/20 px-3 py-1 text-xs text-green-400">Aura aktif koruma</div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-[#1c2132] p-6">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-pink-400">
                <AlertTriangle size={18} /> Acil kelime (sesli tetik)
              </h3>
              <p className="mb-3 text-sm text-gray-500">
                Söylediğinizde, WhatsApp’ta veya Destek merkezindeki hızlı satırda yazdığınızda tam ekran kilit yok; sol
                altta pembe kalp ve acil kişi simülasyonu tetiklenir. Kelime localStorage’a kaydedilir.
              </p>
              <input
                type="text"
                value={sosKeyword}
                onChange={(e) => setSosKeyword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                placeholder="Örn: Mavi Elma"
              />
            </div>

            <div className="rounded-3xl border border-white/5 bg-[#1c2132] p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-red-400">Acil durum kişilerim</h3>
                <button
                  type="button"
                  className="rounded-xl bg-[#ff2d85] px-4 py-2 text-sm font-semibold hover:opacity-90"
                  onClick={() => alert("Kişi ekle (simülasyon).")}
                >
                  + Kişi ekle
                </button>
              </div>
              <div className="space-y-4">
                {emergencyContacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-black/20 p-5 hover:border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar color="bg-gray-600" name={c.name} />
                      <div>
                        <h4 className="font-semibold">
                          {c.name} <span className="text-xs text-gray-500">({c.relation})</span>
                        </h4>
                        <p className="text-sm text-gray-400">{c.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-md p-1 text-xs ${
                          c.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {c.active ? "Aktif" : "Pasif"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleEmergencyContact(c.id)}
                        className={`rounded-xl px-4 py-2 text-xs ${c.active ? "bg-red-900 text-red-200" : "bg-green-900 text-green-200"}`}
                      >
                        {c.active ? "Devre dışı" : "Aktif et"}
                      </button>
                      <MoreVertical size={20} className="text-gray-600" aria-hidden />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsumerShell() {
  const { isCamouflaged } = useSettings();
  return isCamouflaged ? <WhatsAppView /> : <AuraPanel />;
}

export default function App() {
  return (
    <SettingsProvider>
      <div className="h-screen antialiased">
        <SpeechSosListener />
        <ConsumerShell />
      </div>
    </SettingsProvider>
  );
}
