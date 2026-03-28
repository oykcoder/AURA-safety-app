import { useEffect, useRef, useState } from "react";
import { Camera, EllipsisVertical, MessageCirclePlus } from "lucide-react";

export function WhatsAppHeader({ onToggleTheme }: { onToggleTheme?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const ellipsisButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        ellipsisButtonRef.current &&
        !ellipsisButtonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      className="flex shrink-0 flex-col bg-[var(--color-wa-header)] text-[var(--color-wa-header-icon)]"
    >
      <div className="flex h-14 items-center justify-between px-3 pt-[env(safe-area-inset-top,0px)]">
        <h1 className="text-xl font-semibold tracking-tight">Sohbetler</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="Kamera"
          >
            <Camera className="size-6" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="Yeni sohbet"
          >
            <MessageCirclePlus className="size-6" strokeWidth={1.75} />
          </button>
          <div className="relative">
            <button
              ref={ellipsisButtonRef}
              type="button"
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              aria-label="Menü"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <EllipsisVertical className="size-6" strokeWidth={1.75} />
            </button>

            {menuOpen ? (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-[var(--color-wa-border)] bg-[var(--color-wa-item-bg)] py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-wa-text-primary)] hover:bg-[var(--color-wa-item-hover)]"
                  onClick={() => {
                    onToggleTheme?.();
                    setMenuOpen(false);
                  }}
                >
                  Tema Değiştir
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
