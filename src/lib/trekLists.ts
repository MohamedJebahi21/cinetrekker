export interface TrekList {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  itemKeys: string[];
}

const TREK_LISTS_KEY = "cinetrekker_trek_lists_v1";

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(allLists: TrekList[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TREK_LISTS_KEY, JSON.stringify(allLists));
}

function getAll(): TrekList[] {
  if (typeof window === "undefined") return [];
  return parse<TrekList[]>(localStorage.getItem(TREK_LISTS_KEY), []);
}

export function getUserTrekLists(userId: string): TrekList[] {
  return getAll()
    .filter((list) => list.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function createTrekList(userId: string, title: string, description: string): TrekList[] {
  const all = getAll();
  const next: TrekList = {
    id: createId(),
    userId,
    title: title.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    itemKeys: [],
  };
  const updated = [next, ...all];
  save(updated);
  return getUserTrekLists(userId);
}

export function updateTrekList(userId: string, listId: string, patch: Partial<Pick<TrekList, "title" | "description" | "itemKeys">>): TrekList[] {
  const all = getAll();
  const updated = all.map((list) => {
    if (list.id !== listId || list.userId !== userId) return list;
    return {
      ...list,
      title: patch.title !== undefined ? patch.title.trim() : list.title,
      description: patch.description !== undefined ? patch.description.trim() : list.description,
      itemKeys: patch.itemKeys !== undefined ? patch.itemKeys : list.itemKeys,
    };
  });
  save(updated);
  return getUserTrekLists(userId);
}

export function deleteTrekList(userId: string, listId: string): TrekList[] {
  const all = getAll();
  const updated = all.filter((list) => !(list.id === listId && list.userId === userId));
  save(updated);
  return getUserTrekLists(userId);
}

export function toggleTrekListItem(userId: string, listId: string, itemKey: string): TrekList[] {
  const all = getAll();
  const updated = all.map((list) => {
    if (list.id !== listId || list.userId !== userId) return list;
    const hasItem = list.itemKeys.includes(itemKey);
    return {
      ...list,
      itemKeys: hasItem
        ? list.itemKeys.filter((key) => key !== itemKey)
        : [...list.itemKeys, itemKey],
    };
  });
  save(updated);
  return getUserTrekLists(userId);
}
