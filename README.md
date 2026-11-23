# freeFav

Equicord userplugin. Discord Favorites Nitro nélkül: a kliens 200-ig engedi a hozzáadást, a Discord által ingyen tárolt 3 csatornát szinkronban hagyja, a többit ezen a gépen tartja.

A Favorites a szerverlista tetején gyűjti a kitűzött csatornákat, DM-eket és csoportos DM-eket. Nitro (tier 2) nélkül a kliens 3 csatornánál megáll, és a szerver a 3 fölötti mentést 403-mal utasítja el. A kategóriák nem számítanak bele a 3-ba.

## Mit csinál

- A kliens limitjét 200-ra emeli, és elrejti a Nitro-upsellt.
- Mentéskor legfeljebb 3 csatornát, plusz azok szülő kategóriáit küldi el Discordnak. Ezek telefonon is megmaradnak.
- A 3 fölötti favorite-okat helyben tárolja, fiókonként. Újraindítás után is megvannak.
- Törlés, sorrend és becenév a helyi listán is működik. Ha egy szerveren tárolt hely felszabadul, egy helyi favorite lép a helyére.

A helyi lista csak ezen az Equicord kliensen látszik. A telefon a Discord által tárolt 3 csatornát mutatja.

## Telepítés

Equicord forrásbuild kell. A kész installer `.asar` nem tölti be. Az `install.sh` az `index.tsx` és `logic.ts` fájlt másolja a `src/userplugins/freeFav` mappába, mert a build csak a forrásfán belüli plugint fordítja.

```bash
./install.sh
cd "$HOME/Documents/Equicord"
pnpm build
```

Indítsd újra a Discordot, majd kapcsold be a **FreeFav** plugint: **Settings → Plugins**. A Favorites ikon a szerverlista tetején van. Ha nem látszik: **User Settings → Chat → Show Favorites Server**.

Jobb klikk egy csatornán vagy DM-en, majd **Add to Favorites**.

Ha az Equicord máshol van: `EQUICORD=/path/to/Equicord ./install.sh`

## Fejlesztés

```bash
node --experimental-strip-types --test tests/logic.test.ts
```

A teszt nem éri el a Discordot. A patch a kliens `favoriteLimit:…?200:3` és `FavoriteStore` kódjára illeszkedik, ezért egy Discord-frissítés után újra kell nézni.

GPL-3.0-or-later.
