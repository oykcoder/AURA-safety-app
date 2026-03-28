import { useEffect, useRef } from "react";

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const THE_KEYWORDS = ["mavi elma", "blue apple"];

function normalizeTranscript(input: string) {
  // TR harflerini daha kararlı eşleştirmek için basitleştiriyoruz.
  // (Örn: ı -> i gibi)
  return input
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

export function useVoiceRecognition() {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const startedRef = useRef(false);
  const manuallyStoppedRef = useRef(false);
  const triedLanguagesRef = useRef({ trTR: false, enUS: false });
  const lastAlarmAtRef = useRef<number>(0);

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      console.warn("[Aura] SpeechRecognition desteklenmiyor.");
      return;
    }

    const recognition = new SpeechRecognitionCtor() as SpeechRecognitionInstance;
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const languages: Array<"tr-TR" | "en-US"> = ["tr-TR", "en-US"];
    let langIndex = 0;

    const setLang = (lang: "tr-TR" | "en-US") => {
      recognition.lang = lang;
      if (lang === "tr-TR") triedLanguagesRef.current.trTR = true;
      if (lang === "en-US") triedLanguagesRef.current.enUS = true;
    };

    setLang(languages[langIndex]);

    recognition.onresult = (event: any) => {
      // continuous + interimResults:false olduğu için genelde "final" gelir.
      for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res?.[0]?.transcript ?? "";
        const isFinal = res?.isFinal ?? true;

        if (!isFinal) continue;

        const normalized = normalizeTranscript(transcript);
        if (!normalized) continue;

        const matched = THE_KEYWORDS.some((k) => normalized.includes(k));
        if (!matched) continue;

        const now = Date.now();
        // Aynı tetiklemeyi üst üste spamlememek için kısa cooldown.
        if (now - lastAlarmAtRef.current < 5000) return;
        lastAlarmAtRef.current = now;

        // Sessiz tetikleme: arayüzü bozmadan sadece kısa titreşim + arka plan log.
        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        console.log("🚨 SOS Sinyali ve Konum Verisi Gönderildi");
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[Aura] SpeechRecognition error:", event);

      // Dil denenmemişse, hatadan sonra diğer dile geçmeyi deneyelim.
      const nextLangIndex = Math.min(langIndex + 1, languages.length - 1);
      if (nextLangIndex !== langIndex && !triedLanguagesRef.current.enUS) {
        langIndex = nextLangIndex;
        setLang(languages[langIndex]);
        try {
          recognition.stop();
        } catch {
          // ignore
        }
        // start hemen denenir; bazı tarayıcılar hata sonrası yeniden start ister.
        try {
          startedRef.current = false;
          recognition.start();
          startedRef.current = true;
        } catch {
          // ignore (tarayıcıya göre değişebilir)
        }
      }
    };

    recognition.onstart = () => {
      startedRef.current = true;
    };

    recognition.onend = () => {
      startedRef.current = false;
      if (manuallyStoppedRef.current) return;

      // Hem tr-TR hem en-US "dene" koşulu: recognition bitince sıradaki dili dene.
      if (langIndex < languages.length - 1) {
        langIndex += 1;
        setLang(languages[langIndex]);
      }

      try {
        recognition.start();
        startedRef.current = true;
      } catch {
        // ignore
      }
    };

    const start = () => {
      manuallyStoppedRef.current = false;
      try {
        recognition.start();
        startedRef.current = true;
      } catch (err) {
        // start bir "gesture" isterse tarayıcı hata verebilir; yine de konsola düşürelim.
        console.warn("[Aura] recognition.start failed:", err);
      }
    };

    // Sayfa yüklenir yüklenmez start.
    start();

    return () => {
      manuallyStoppedRef.current = true;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, []);
}

