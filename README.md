# freeFav

Equicord userplugin that unlocks Discord Favorites without Nitro. The client allows up to 200 favorites. The three channels Discord stores for free stay in sync, and the rest stay on this machine.

Favorites collects pinned channels, DMs, and group DMs at the top of the server list. Without Nitro (tier 2) the client stops at 3 channels, and the server rejects anything past that with a 403. Categories do not count toward the 3.

## What it does

- Raises the client limit to 200 and hides the Nitro upsell.
- On save, sends at most 3 channels plus their parent categories to Discord. Those still show up on your phone.
- Stores anything past those 3 locally, per account. They survive a restart.
- Remove, reorder, and nicknames work on the local list. When a server slot opens, a local favorite takes it.

The local list is visible only in this Equicord client. Your phone shows the 3 channels Discord stored.

## Install

A source build of Equicord is required. The stock installer `.asar` cannot load this plugin. `install.sh` copies `index.tsx` and `logic.ts` into `src/userplugins/freeFav`, because the build only compiles plugins inside the Equicord source tree.

```bash
./install.sh
cd "$HOME/Documents/Equicord"
pnpm build
```

Restart Discord, then enable **FreeFav** under **Settings → Plugins**. The Favorites icon sits at the top of the server list. If it is missing: **User Settings → Chat → Show Favorites Server**.

Right-click a channel or DM, then choose **Add to Favorites**.

If Equicord lives somewhere else: `EQUICORD=/path/to/Equicord ./install.sh`

## Development

```bash
node --experimental-strip-types --test tests/logic.test.ts
```

The test does not contact Discord. The patch matches the client's `favoriteLimit:…?200:3` check and `FavoriteStore`, so it needs another look after a Discord update.

GPL-3.0-or-later.
