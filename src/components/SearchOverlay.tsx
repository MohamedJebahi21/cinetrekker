import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { searchMulti, getImageUrl } from "@/services/tmdb";
import { useDebounce } from "@/hooks/useDebounce";
import { X, Search, Film, Tv, User, ArrowRight } from "lucide-react";
import type { Media } from "@/types/media";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { Image } from "@/components/ui/Image";

export default function SearchOverlay() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 500); // 500ms debounce for bot protection
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const language = i18n.language;

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-search-overlay", onOpen as EventListener);

    const onAppEscape = () => setOpen(false);
    window.addEventListener("app:escape", onAppEscape as EventListener);

    const onKey = (e: KeyboardEvent) => {
      // Ctrl+/ or Meta+/
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      // "/" to open search when not focused on input/textarea/select
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (!["input", "textarea", "select"].includes(tag)) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener(
        "open-search-overlay",
        onOpen as EventListener,
      );
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("app:escape", onAppEscape as EventListener);
    };
  }, []);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      id = setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
    return () => {
      if (id !== undefined) clearTimeout(id);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const input = inputRef.current;
    if (!input) return;

    const handleBeforeInput = (event: Event) => {
      const nativeEvent = event as InputEvent;
      if (nativeEvent.inputType === "insertReplacementText") {
        event.preventDefault();
      }
    };

    input.addEventListener("beforeinput", handleBeforeInput);
    return () => input.removeEventListener("beforeinput", handleBeforeInput);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select',
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["search-overlay", debounced, language, includeAdult],
    queryFn: () => searchMulti(debounced, 1, language, includeAdult),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const results = applySafetyFilter(
    data?.results || [],
    strictFiltering,
    moderateFiltering,
  ).slice(0, 10);

  const getItemRoute = (item: Media) => {
    if (item.media_type === "person") return `/person/${item.id}`;
    return `/${item.media_type}/${item.id}`;
  };

  const RECENTS_ID = "cinetrekker_recent_searches";
  const addToRecents = (q: string) => {
    if (!q || !q.trim()) return;
    try {
      const trimmed = q.trim();
      const stored = localStorage.getItem(RECENTS_ID);
      const prev: string[] = stored ? JSON.parse(stored) : [];
      const next = [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, 10);
      localStorage.setItem(RECENTS_ID, JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.search", "Search")}
            className="w-full max-w-3xl bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl"
          >
            <div className="flex items-center gap-2 p-3">
              <Search className="w-5 h-5 text-muted-foreground ml-2" />
              <div role="combobox" aria-expanded="false" aria-controls="search-results-list" className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={t(
                    "search.placeholder",
                    "Search movies, TV shows, and more",
                  )}
                  className="w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("common.close", "Close")}
                title="Close search overlay"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-auto">
              {isLoading ? (
                <div className="py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                      <div className="w-12 h-16 rounded poster-skeleton flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 skeleton-shimmer rounded w-3/4" />
                        <div className="h-3 skeleton-shimmer rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length > 0 ? (
                <ul>
                  {results.map((item: Media) => {
                    const thumbPath =
                      item.poster_path ?? item.profile_path ?? null;
                    return (
                      <li key={`${item.media_type}-${item.id}`}>
                        <button
                          onClick={() => {
                            navigate(getItemRoute(item));
                            setOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                        >
                          <div className="w-12 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                            {getImageUrl(thumbPath, "w92") ? (
                              <Image
                                src={getImageUrl(thumbPath, "w92")!}
                              srcSet={`${getImageUrl(thumbPath, "w92")!} 92w, ${getImageUrl(thumbPath, "w185")!} 185w`}
                              sizes="48px"
                              width={48}
                              height={64}
                              alt=""
                              className="w-full h-full object-cover bg-muted"
                              loading="lazy"
                            />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                {item.media_type === "person" ? (
                                  <User />
                                ) : item.media_type === "movie" ? (
                                  <Film />
                                ) : (
                                  <Tv />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {item.title || item.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.media_type}
                              {item.release_date
                                ? ` | ${new Date(item.release_date).getFullYear()}`
                                : ""}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  {debounced.length >= 2
                    ? t("search.noResults", `No results for "${debounced}"`)
                    : t("search.prompt", "Type at least 2 characters")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
