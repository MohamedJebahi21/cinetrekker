import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ChevronRight,
  FolderHeart,
  LibraryBig,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MediaGrid } from "@/components/MediaGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollections, useCollectionItems, useCreateCollection, useDeleteCollection, useAddToCollection, useUpdateCollection, type Collection } from "@/hooks/useCollections";
import { enrichMediaItems } from "@/lib/mediaEnrichment";
import { searchMulti } from "@/services/tmdb";
import type { Media } from "@/types/media";
import { cn } from "@/lib/utils";

function CollectionFormDialog({
  collection,
  trigger,
}: {
  collection?: Collection;
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    if (collection) {
      await updateCollection.mutateAsync({ id: collection.id, name, description });
    } else {
      await createCollection.mutateAsync({ name, description });
    }

    setOpen(false);
    if (!collection) {
      setName("");
      setDescription("");
    }
  };

  const pending = createCollection.isPending || updateCollection.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-border/70 bg-card/95 backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {collection
              ? t("collections.editTitle", "Edit collection")
              : t("collections.createTitle", "Create a collection")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "collections.formDescription",
              "Give your curation a name people will remember. You can add titles from the collection page.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="collection-name" className="text-sm font-semibold text-foreground">
              {t("collections.nameLabel", "Collection name")}
            </label>
            <Input
              id="collection-name"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("collections.namePlaceholder", "Comfort watches for rainy nights")}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="collection-description" className="text-sm font-semibold text-foreground">
              {t("collections.descriptionLabel", "Description")}
            </label>
            <Textarea
              id="collection-description"
              value={description}
              maxLength={220}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("collections.descriptionPlaceholder", "What makes this list special?")}
              className="min-h-24 resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {collection ? t("common.saveChanges", "Save changes") : t("collections.createAction", "Create collection")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const { t } = useTranslation();
  const deleteCollection = useDeleteCollection();
  const itemCount = typeof collection.itemCount === "number" ? collection.itemCount : (Array.isArray(collection.items) ? collection.items.length : 0);

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-5 shadow-[0_16px_45px_hsl(var(--background)/0.25)] transition duration-200 hover:-translate-y-1 hover:border-primary/30 hover:bg-card/80">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <Link to={`/collections/${collection.id}`} className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <FolderHeart className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="line-clamp-2 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {collection.name}
          </h2>
          <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">
            {collection.description || t("collections.noDescription", "A personal selection waiting for its first story.")}
          </p>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={t("collections.moreActions", "More collection actions")}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <CollectionFormDialog
              collection={collection}
              trigger={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("common.edit", "Edit")}
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                if (window.confirm(t("collections.deleteConfirm", "Delete this collection?"))) {
                  deleteCollection.mutate(collection.id);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("common.delete", "Delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Link to={`/collections/${collection.id}`} className="relative mt-5 flex items-center justify-between border-t border-border/50 pt-4 text-xs font-semibold text-muted-foreground transition hover:text-primary">
        <span>{t("collections.itemCount", "{{count}} titles", { count: itemCount })}</span>
        <span className="inline-flex items-center gap-1">
          {t("collections.openCollection", "Open collection")}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </article>
  );
}

function CollectionsIndex() {
  const { t } = useTranslation();
  const { data: collectionsResult, isLoading } = useCollections();
  const collections = collectionsResult?.data ?? [];
  const collectionsFetchStatus = collectionsResult?.fetchStatus ?? "idle";

  return (
    <div className="page-container min-h-screen pb-28 pt-24 md:pb-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("collections.eyebrow", "Your curation studio")}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
              {t("collections.title", "Collections")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {t(
                "collections.subtitle",
                "Turn your taste into lists worth sharing — moods, eras, comfort rewatches, and everything in between.",
              )}
            </p>
          </div>
          <CollectionFormDialog
            trigger={
              <Button className="min-h-11 gap-2 rounded-xl shadow-[0_12px_28px_hsl(var(--primary)/0.2)]">
                <Plus className="h-4 w-4" />
                {t("collections.newCollection", "New collection")}
              </Button>
            }
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-56 rounded-3xl border border-border/50 bg-card/50 skeleton-shimmer" />)}
          </div>
        ) : collectionsFetchStatus === "schema_missing" ? (
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/5 p-8 text-center">
            <LibraryBig className="mx-auto h-10 w-10 text-amber-300" />
            <h2 className="mt-4 text-xl font-bold text-foreground">{t("collections.schemaTitle", "Collections are almost ready")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {t("collections.schemaBody", "This account does not have the collections storage enabled yet. Your other CineTrekker features remain available while it is being connected.")}
            </p>
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-10 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <FolderHeart className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-foreground">{t("collections.emptyTitle", "Start your first collection")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {t("collections.emptyBody", "Make a list with a point of view. The best collections feel like a recommendation from a friend.")}
            </p>
            <CollectionFormDialog
              trigger={<Button className="mt-6 gap-2"><Plus className="h-4 w-4" />{t("collections.createFirst", "Create your first collection")}</Button>}
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionDetail() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const { data: collectionsResult } = useCollections();
  const collections = collectionsResult?.data ?? [];
  const collection = collections.find((item) => item.id === Number(collectionId));
  const { data: rawItems = [], isLoading: itemsLoading } = useCollectionItems(collection?.id);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const addToCollection = useAddToCollection();
  const searchQuery = useQuery({
    queryKey: ["collection-title-search", searchTerm, i18n.language],
    enabled: searchTerm.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const response = await searchMulti(searchTerm.trim(), 1, i18n.language);
      return response.results.slice(0, 8);
    },
  });

  const mediaQuery = useQuery({
    queryKey: ["collection-media", collection?.id, rawItems, i18n.language],
    enabled: rawItems.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: () => enrichMediaItems(rawItems, {
      language: i18n.language,
      getReference: (item) => ({ mediaId: item.media_id, mediaType: item.media_type }),
      logScope: "collection-media",
    }),
  });

  const mediaItems = mediaQuery.data ?? [];

  if (!collection) {
    return (
      <div className="page-container min-h-screen pb-28 pt-24 md:pb-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-card/60 p-10 text-center">
          <FolderHeart className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">{t("collections.notFound", "Collection not found")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("collections.notFoundBody", "It may have been removed or is still loading.")}</p>
          <Button className="mt-6" onClick={() => navigate("/collections")}>{t("collections.backToCollections", "Back to collections")}</Button>
        </div>
      </div>
    );
  }

  const handleAdd = (item: Media) => {
    const mediaType = item.media_type === "tv" ? "tv" : "movie";
    addToCollection.mutate({ collection_id: collection.id, media_id: item.id, media_type: mediaType });
    setSearchTerm("");
    setSearchOpen(false);
  };

  return (
    <div className="page-container min-h-screen pb-28 pt-24 md:pb-16">
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => navigate("/collections")} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowLeft className="h-4 w-4" />
          {t("collections.backToCollections", "Back to collections")}
        </button>
        <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,hsla(var(--primary)/0.2),transparent_45%),linear-gradient(135deg,hsla(var(--card)/0.98),hsla(var(--background)/0.94))] p-6 md:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary"><FolderHeart className="h-6 w-6" /></span>
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">{collection.name}</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{collection.description || t("collections.noDescription", "A personal selection waiting for its first story.")}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">{t("collections.privateByDefault", "Private by default · curated by you")}</p>
            </div>
            <CollectionFormDialog
              collection={collection}
              trigger={<Button variant="outline" className="min-h-11 gap-2 bg-background/35"><Pencil className="h-4 w-4" />{t("common.edit", "Edit")}</Button>}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("collections.yourTitles", "Your titles")}</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{t("collections.collectionLineup", "The lineup")}</h2>
              </div>
              <span className="text-sm text-muted-foreground">{t("collections.itemCount", "{{count}} titles", { count: rawItems.length })}</span>
            </div>
            <MediaGrid items={mediaItems} isLoading={itemsLoading || mediaQuery.isLoading} columns="normal" />
          </section>

          <aside className="rounded-3xl border border-border/60 bg-card/60 p-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground"><BookmarkPlus className="h-4 w-4 text-primary" />{t("collections.addTitles", "Add titles")}</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("collections.addTitlesBody", "Search any movie or show and give it a place in this list.")}</p>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearchTerm(event.target.value); setSearchOpen(true); }} placeholder={t("collections.searchPlaceholder", "Search titles...")} className="h-11 pl-9" />
              {searchOpen && searchTerm.trim().length >= 2 && (
                <div className="absolute inset-x-0 top-12 z-20 overflow-hidden rounded-2xl border border-border/70 bg-popover p-1 shadow-2xl">
                  {searchQuery.isFetching ? <div className="p-3 text-xs text-muted-foreground">{t("common.searching", "Searching...")}</div> : searchQuery.data?.length ? searchQuery.data.map((item) => (
                    <button key={`${item.media_type}-${item.id}`} type="button" onClick={() => handleAdd(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.title || item.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.media_type === "tv" ? t("common.tv", "TV") : t("common.movie", "Movie")}</span>
                    </button>
                  )) : <div className="p-3 text-xs text-muted-foreground">{t("common.noResults", "No results available")}</div>}
                </div>
              )}
            </div>
            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
              <Sparkles className="mb-1 h-4 w-4 text-primary" />
              {t("collections.curatorTip", "Curator tip: a strong collection has a clear mood and a title people can instantly understand.")}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function Collections() {
  return (
    <ProtectedRoute>
      {useParams<{ collectionId: string }>().collectionId ? <CollectionDetail /> : <CollectionsIndex />}
    </ProtectedRoute>
  );
}
