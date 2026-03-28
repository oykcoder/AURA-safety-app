import { Search } from "lucide-react";

export function ChatSearchBar() {
  return (
    <div className="shrink-0 bg-[var(--color-wa-header)] px-2 pb-2">
      <div
        className="flex h-9 items-center gap-6 rounded-lg bg-[var(--color-wa-search-input-bg)] px-3"
        role="search"
      >
        <Search
          className="size-4 shrink-0 text-[var(--color-wa-secondary)]"
          strokeWidth={2}
          aria-hidden
        />
        <span className="text-[15px] text-[var(--color-wa-secondary)]">Ara</span>
      </div>
    </div>
  );
}
