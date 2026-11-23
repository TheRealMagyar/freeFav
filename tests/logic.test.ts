import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chooseServerIds, countChannels, overlay, toSaved, type PlainFavorite } from "../logic.ts";

function item(id: string, order: number, parentId: string | null = null, type = 1): PlainFavorite {
    return { id, nickname: null, type, order, parentId };
}

describe("chooseServerIds", () => {
    it("keeps the three channels already stored on Discord and their categories", () => {
        const items = {
            cat: item("cat", 0, null, 2),
            a: item("a", 1, "cat"),
            b: item("b", 2, "cat"),
            c: item("c", 3, null),
            d: item("d", 4, null)
        };
        const keep = new Set(chooseServerIds(items, new Set(["a", "b", "c", "cat"])));
        assert.deepEqual([...keep].sort(), ["a", "b", "c", "cat"]);
        assert.equal(keep.has("d"), false);
    });

    it("promotes a local channel when a server slot opens", () => {
        const items = {
            a: item("a", 0),
            b: item("b", 1),
            d: item("d", 2)
        };
        const keep = chooseServerIds(items, new Set(["a", "b"]));
        assert.deepEqual(keep.sort(), ["a", "b", "d"]);
    });
});

describe("toSaved", () => {
    it("does not keep a local copy while the list fits in the free quota", () => {
        const items = { a: item("a", 0), b: item("b", 1), cat: item("cat", 2, null, 2) };
        assert.equal(toSaved(items, ["a", "b", "cat"]), null);
        assert.equal(countChannels(items), 2);
    });
});

describe("overlay", () => {
    it("shows local favorites ahead of a server echo that does not know them yet", () => {
        const server = {
            a: item("a", 0),
            b: item("b", 1)
        };
        const shown = overlay(server, {
            order: ["b", "a", "local"],
            serverIds: ["a", "b"],
            items: {
                b: item("b", 0),
                a: item("a", 1),
                local: item("local", 2)
            }
        });
        assert.deepEqual(Object.keys(shown), ["b", "a", "local"]);
        assert.equal(shown.local.order, 2);
        assert.equal(shown.b.order, 0);
    });

    it("appends a favorite that appeared on the server from another client", () => {
        const server = { a: item("a", 0), remote: item("remote", 1) };
        const shown = overlay(server, {
            order: ["a"],
            serverIds: ["a"],
            items: { a: item("a", 0) }
        });
        assert.deepEqual(Object.keys(shown), ["a", "remote"]);
    });
});
