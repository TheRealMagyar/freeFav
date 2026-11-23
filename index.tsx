/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 TheRealMagyar and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { FavoriteStore, UserStore } from "@webpack/common";

import { chooseServerIds, countChannels, overlay as applyOverlay, PlainFavorite, SavedFavorites, toSaved } from "./logic";

const logger = new Logger("FreeFav");
const NITRO_TIER_2 = 2;

let cache: SavedFavorites | null = null;
let storageKey = "FreeFav.v1.pending";
let messageCtor: { create: (value: Record<string, unknown>) => unknown; } | null = null;

function accountKey() {
    const id = UserStore.getCurrentUser()?.id;
    return id ? `FreeFav.v1.${id}` : "FreeFav.v1.pending";
}

function hasFullNitro() {
    return (UserStore.getCurrentUser()?.premiumType ?? 0) === NITRO_TIER_2;
}

async function loadSaved() {
    storageKey = accountKey();
    try {
        const stored = await DataStore.get<SavedFavorites | null>(storageKey);
        cache = stored?.items && stored.order ? stored : null;
    } catch (error) {
        logger.error("Failed to load local favorites", error);
        cache = null;
    }
    emit();
}

function persist(next: SavedFavorites | null) {
    cache = next;
    const key = storageKey;
    const write = next
        ? DataStore.set(key, next)
        : DataStore.del(key).then(() => undefined);
    void write.catch(error => logger.error("Failed to save local favorites", error));
    emit();
}

function emit() {
    try {
        FavoriteStore.emitChange();
    } catch (error) {
        logger.error("Failed to refresh Favorites", error);
    }
}

function keysOf(map: object): string[] {
    const keys: string[] = [];
    for (const key in map) keys.push(key);
    return keys;
}

function rememberCtor(map: Record<string, { constructor?: { create?: (value: Record<string, unknown>) => unknown; }; }>) {
    if (messageCtor) return;
    for (const key in map) {
        const create = map[key]?.constructor?.create;
        if (typeof create === "function") {
            messageCtor = map[key].constructor as { create: (value: Record<string, unknown>) => unknown; };
            return;
        }
    }
}

function snapshot(map: Record<string, any>): Record<string, PlainFavorite> {
    const items: Record<string, PlainFavorite> = {};
    for (const id in map) {
        const entry = map[id];
        if (!entry) continue;
        const parent = entry.parentId;
        items[id] = {
            id,
            nickname: entry.nickname ? entry.nickname : null,
            type: entry.type,
            channelType: entry.channelType?.value,
            order: entry.position ?? 0,
            parentId: parent && parent !== "0" ? parent : null
        };
    }
    return items;
}

function inject(map: Record<string, unknown>, saved: SavedFavorites | null): string[] {
    if (!saved || !messageCtor) return [];
    const injected: string[] = [];
    for (const id of saved.order) {
        if (id in map) continue;
        const item = saved.items[id];
        if (!item) continue;
        map[id] = messageCtor.create({
            nickname: item.nickname ?? "",
            type: item.type,
            position: item.order,
            parentId: item.parentId ?? "0"
        });
        injected.push(id);
    }
    return injected;
}

function retain(map: Record<string, unknown>, keep: ReadonlySet<string>) {
    for (const id of keysOf(map)) {
        if (!keep.has(id)) delete map[id];
    }
}

function guard(update: (proto: { favoriteChannels?: Record<string, any>; }) => unknown) {
    return (proto: { favoriteChannels?: Record<string, any>; }) => {
        const map = proto?.favoriteChannels;
        if (!map || hasFullNitro()) {
            if (hasFullNitro() && cache) persist(null);
            return update(proto);
        }

        rememberCtor(map);
        const before = new Set(keysOf(map));
        const injected = inject(map, cache);
        const missed = cache
            ? cache.order.filter(id => cache!.items[id] && !(id in map))
            : [];
        const result = update(proto);
        if (result === false) {
            for (const id of injected) delete map[id];
            return false;
        }

        const items = snapshot(map);
        if (missed.length && cache) {
            for (const id of missed) items[id] = cache.items[id];
        }
        const serverIds = chooseServerIds(items, before);
        retain(map, new Set(serverIds));
        persist(toSaved(items, serverIds));
        return result;
    };
}

export default definePlugin({
    name: "FreeFav",
    description: "Add Discord Favorites without Nitro. The free server slots stay in sync, and anything past them is kept on this client.",
    authors: [{ name: "TheRealMagyar", id: 462651633709613056n }],
    tags: ["Utility"],

    patches: [
        {
            find: "canUpsellFavoriteLimit",
            replacement: {
                match: /favoriteLimit:\i\?200:3,canUpsellFavoriteLimit:!\i/,
                replace: "favoriteLimit:200,canUpsellFavoriteLimit:!1"
            }
        },
        {
            find: 'updateAsync("favorites"',
            replacement: {
                match: /updateAsync\("favorites",(\i),/,
                replace: 'updateAsync("favorites",$self.guard($1),'
            }
        },
        {
            find: 'displayName="FavoriteStore"',
            replacement: [
                {
                    match: /getFavoriteChannels\(\)\{return (\i)\}/,
                    replace: "getFavoriteChannels(){return $self.overlay($1)}"
                },
                {
                    match: /isFavorite\((\i)\)\{return null!=\1&&null!=\i\[\1\]\}/,
                    replace: "isFavorite($1){return null!=$1&&null!=this.getFavoriteChannels()[$1]}"
                },
                {
                    match: /getFavorite\((\i)\)\{if\(null!=\1\)return \i\[\1\]\}/,
                    replace: "getFavorite($1){if(null!=$1)return this.getFavoriteChannels()[$1]}"
                },
                {
                    match: /getFavoritesCount\(\)\{return \i\}/,
                    replace: "getFavoritesCount(){return Object.keys(this.getFavoriteChannels()).length}"
                },
                {
                    match: /getFavoritesCountAgainstLimit\(\)\{return \i\}/,
                    replace: "getFavoritesCountAgainstLimit(){return $self.countChannels(this.getFavoriteChannels())}"
                }
            ]
        }
    ],

    start: loadSaved,
    flux: {
        CONNECTION_OPEN: loadSaved
    },

    overlay(server: Record<string, PlainFavorite>) {
        return applyOverlay(server, cache);
    },
    countChannels,
    guard
});
