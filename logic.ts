/** Discord's free Favorites quota. Nitro (tier 2) raises this to 200 on the server. */
export const SERVER_CHANNEL_LIMIT = 3;

/** FavoriteChannelType.CATEGORY in the Discord client. */
export const CATEGORY = 2;

export interface PlainFavorite {
    id: string;
    nickname: string | null;
    type: number;
    channelType?: number;
    order: number;
    parentId: string | null;
}

export interface SavedFavorites {
    order: string[];
    items: Record<string, PlainFavorite>;
    /** Ids written to Discord on the last save. Membership still comes from `items`. */
    serverIds: string[];
}

export function countChannels(map: Record<string, { type?: number; } | undefined>): number {
    let count = 0;
    for (const item of Object.values(map)) {
        if (item && item.type !== CATEGORY) count++;
    }
    return count;
}

export function chooseServerIds(items: Record<string, PlainFavorite>, beforeIds: ReadonlySet<string>): string[] {
    const channels = Object.values(items)
        .filter(item => item.type !== CATEGORY)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const preferred = channels.filter(item => beforeIds.has(item.id));
    const rest = channels.filter(item => !beforeIds.has(item.id));
    const chosen = [...preferred, ...rest].slice(0, SERVER_CHANNEL_LIMIT);
    const keep = new Set(chosen.map(item => item.id));

    for (const channel of chosen) {
        let parent = channel.parentId;
        const seen = new Set<string>();
        while (parent && items[parent] && !seen.has(parent)) {
            seen.add(parent);
            keep.add(parent);
            parent = items[parent].parentId;
        }
    }

    return [...keep];
}

/** `null` when the whole list fits in Discord's free quota and no local copy is needed. */
export function toSaved(items: Record<string, PlainFavorite>, serverIds: string[]): SavedFavorites | null {
    if (countChannels(items) <= SERVER_CHANNEL_LIMIT) return null;
    const order = Object.values(items)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map(item => item.id);
    return { order, items, serverIds };
}

export function overlay(
    server: Record<string, PlainFavorite>,
    saved: SavedFavorites | null
): Record<string, PlainFavorite> {
    if (!saved) return server;

    const ordered: Record<string, PlainFavorite> = {};
    const seen = new Set<string>();
    let index = 0;

    for (const id of saved.order) {
        const item = saved.items[id];
        if (!item) continue;
        const live = server[id];
        ordered[id] = {
            ...item,
            ...(live ?? {}),
            id,
            type: item.type,
            parentId: item.parentId,
            nickname: live?.nickname ?? item.nickname,
            order: index++
        };
        seen.add(id);
    }

    for (const id of Object.keys(server)) {
        if (seen.has(id)) continue;
        ordered[id] = { ...server[id], order: index++ };
    }

    return ordered;
}
