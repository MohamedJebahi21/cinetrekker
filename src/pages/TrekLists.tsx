import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPinned, Plus, Trash2, Route } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { getMovieDetails, getTVDetails, getMediaTitle } from "@/services/tmdb";
import type { Media } from "@/types/media";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { FilmingLocationsMap } from "@/components/FilmingLocationsMap";
import { getFilmingLocation } from "@/lib/filmingLocations";
import {
  createTrekList,
  deleteTrekList,
  getUserTrekLists,
  toggleTrekListItem,
  TrekList,
  updateTrekList,
} from "@/lib/trekLists";

export default function TrekLists() {
  const { user } = useAuth();
  const { watchlist } = useUserLists();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [lists, setLists] = useState<TrekList[]>(() =>
    user ? getUserTrekLists(user.id) : [],
  );
  const [activeListId, setActiveListId] = useState<string | null>(lists[0]?.id || null);

  const { data: mediaDetails = [], isLoading } = useQuery({
    queryKey: ["trek-lists-media-details", watchlist.map((i) => `${i.mediaType}-${i.mediaId}`)],
    queryFn: async () => {
      const rows = await Promise.all(
        watchlist.map(async (item) => {
          try {
            const details = item.mediaType === "movie"
              ? await getMovieDetails(item.mediaId)
              : await getTVDetails(item.mediaId);
            return {
              ...details,
              media_type: item.mediaType,
            } as Media;
          } catch {
            return null;
          }
        }),
      );
      return rows.filter(Boolean) as Media[];
    },
    enabled: watchlist.length > 0,
  });

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) || null,
    [lists, activeListId],
  );

  useEffect(() => {
    setEditTitle(activeList?.title || "");
    setEditDescription(activeList?.description || "");
  }, [activeList?.id, activeList?.title, activeList?.description]);

  const selectedMedia = useMemo(() => {
    if (!activeList) return [];
    const selectedKeys = new Set(activeList.itemKeys);
    return mediaDetails.filter((media) => selectedKeys.has(`${media.media_type}-${media.id}`));
  }, [activeList, mediaDetails]);

  const routeStops = useMemo(() => {
    const grouped = new Map<string, { location: string; titles: string[] }>();
    selectedMedia.forEach((media) => {
      const location = getFilmingLocation(media).label;
      const prev = grouped.get(location);
      const titleText = getMediaTitle(media);
      if (prev) {
        prev.titles.push(titleText);
      } else {
        grouped.set(location, { location, titles: [titleText] });
      }
    });
    return Array.from(grouped.values());
  }, [selectedMedia]);

  const activeSeoTitle = activeList
    ? `Filming Locations for ${activeList.title} | CineTrekker`
    : "Trek Lists | CineTrekker";
  const activeSeoDescription = activeList
    ? `${activeList.title}: a cinematic itinerary with mapped filming locations and watchlist stops.`
    : "Build custom trek lists combining watchlists with filming-location itineraries.";

  const handleCreate = () => {
    if (!user || !title.trim()) return;
    const updated = createTrekList(user.id, title, description);
    setLists(updated);
    setActiveListId(updated[0]?.id || null);
    setTitle("");
    setDescription("");
  };

  const handleToggleItem = (itemKey: string) => {
    if (!user || !activeList) return;
    setLists(toggleTrekListItem(user.id, activeList.id, itemKey));
  };

  const handleDelete = (listId: string) => {
    if (!user) return;
    const updated = deleteTrekList(user.id, listId);
    setLists(updated);
    if (activeListId === listId) {
      setActiveListId(updated[0]?.id || null);
    }
  };

  const handleSaveEdit = () => {
    if (!user || !activeList) return;
    if (!editTitle.trim()) return;

    setLists(
      updateTrekList(user.id, activeList.id, {
        title: editTitle,
        description: editDescription,
      }),
    );
  };

  if (!user) {
    return (
      <div className="page-container pt-24 pb-24">
        <h1 className="heading-credits text-5xl text-white">Trek Lists</h1>
        <p className="editorial-copy mt-4 max-w-xl text-white/70">
          Sign in to build custom watchlist-plus-itinerary experiences like "My London Film Tour" with mapped filming stops.
        </p>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={activeSeoTitle}
        description={activeSeoDescription}
        canonical="https://cinetrekker.vercel.app/trek-lists"
        type="website"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="mb-8 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(9,12,20,0.94),rgba(6,7,12,0.95))] p-5 md:p-7">
          <div className="flex items-center gap-2 text-[#f2c572]">
            <MapPinned className="h-5 w-5" />
            <span className="heading-credits text-sm">Travel + Cinema</span>
          </div>
          <h1 className="heading-credits mt-2 text-5xl text-white md:text-6xl">Trek Lists</h1>
          <p className="editorial-copy mt-3 max-w-2xl text-sm text-white/75 md:text-base">
            Build custom routes that merge your watchlist with real-world filming locations. Create itineraries, collect titles, and explore each stop on a cinematic map.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/35 p-4">
              <h2 className="heading-credits text-2xl text-white">Create Trek List</h2>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="My London Film Tour"
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#f2c572]/45"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add notes about this itinerary..."
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#f2c572]/45"
              />
              <Button onClick={handleCreate} className="mt-3 w-full gap-2 bg-[#8d1e24] text-white hover:bg-[#a1252d]">
                <Plus className="h-4 w-4" />
                Create List
              </Button>
            </div>

            {activeList && (
              <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                <h2 className="heading-credits text-2xl text-white">Edit Active List</h2>
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  placeholder="List title"
                  className="mt-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#f2c572]/45"
                />
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  placeholder="List description"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#f2c572]/45"
                />
                <Button onClick={handleSaveEdit} className="mt-3 w-full gap-2 bg-[#8d1e24] text-white hover:bg-[#a1252d]">
                  Save Changes
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {lists.length === 0 && (
                <p className="rounded-lg border border-dashed border-white/15 bg-black/25 p-4 text-sm text-white/65">
                  No trek lists yet. Create one to start mapping your film tour.
                </p>
              )}
              {lists.map((list) => (
                <div
                  key={list.id}
                  className={`w-full rounded-xl border p-3 transition-colors ${
                    activeListId === list.id
                      ? "border-[#f2c572]/45 bg-[#1b1409]"
                      : "border-white/10 bg-black/30 hover:bg-black/45"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveListId(list.id)}
                      className="flex-1 text-left"
                      aria-label={`Select ${list.title}`}
                    >
                      <p className="heading-credits text-xl text-white">{list.title}</p>
                      <p className="mt-1 text-xs text-white/60">{list.itemKeys.length} titles</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(list.id)}
                      className="rounded-md p-1 text-white/65 hover:bg-white/10 hover:text-white"
                      aria-label={`Delete ${list.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h2 className="heading-credits text-3xl text-white">Watchlist Titles</h2>
              <p className="editorial-copy mt-1 text-sm text-white/70">
                Add titles to your active trek list. Filming stops are pulled in automatically.
              </p>
              {isLoading && <p className="mt-3 text-sm text-white/60">Loading watchlist details...</p>}
              {!isLoading && mediaDetails.length === 0 && (
                <p className="mt-3 text-sm text-white/60">No watchlist titles available yet.</p>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {mediaDetails.map((media) => {
                  const key = `${media.media_type}-${media.id}`;
                  const selected = !!activeList?.itemKeys.includes(key);
                  const location = getFilmingLocation(media);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleItem(key)}
                      disabled={!activeList}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-[#f2c572]/40 bg-[#1d160a]"
                          : "border-white/10 bg-black/35 hover:bg-black/50"
                      } ${!activeList ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-white">{getMediaTitle(media)}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#f2c572]">{location.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Route className="h-5 w-5 text-[#f2c572]" />
                <h2 className="heading-credits text-3xl text-white">Itinerary Route</h2>
              </div>
              {selectedMedia.length > 0 ? (
                <>
                  <FilmingLocationsMap items={selectedMedia} />
                  <div className="mt-4 space-y-2">
                    {routeStops.map((stop) => (
                      <div key={stop.location} className="rounded-lg border border-white/10 bg-black/35 p-3">
                        <p className="text-sm font-semibold text-[#f7d499]">{stop.location}</p>
                        <p className="mt-1 text-xs text-white/70">Stops: {stop.titles.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/65">
                  Select titles from your watchlist to build the travel route.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
