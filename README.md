# Bank details of Habibur Rahman

A single static page, served from <https://bank.habibium.com/> (GitHub Pages, branch `main`,
root path, behind Cloudflare). No build step, no dependencies, no external resources: all
styling and script are inline, and every font, icon and manifest is same-origin.

## Offline

The page is an installable PWA and works fully offline after one online load.

- `manifest.webmanifest` + `/icons` make it installable. Installing it is what makes the
  cache durable: Safari evicts an uninstalled site's storage after 7 days without a visit,
  and Chrome may evict under storage pressure unless storage has been persisted.
- `sw.js` precaches every deployable file on install, drops old caches on activate, and
  serves precached URLs cache-first. Navigations fall back to the cached page when offline.
- `index.html` registers the worker with `updateViaCache: "none"` and then calls
  `navigator.storage.persist()`.

## Deploying

Pages serves the branch as-is, so **`sw.js` is a committed build artifact**:

```sh
node tools/gen-sw.mjs   # after changing any deployable file
git add sw.js && git commit
```

`tools/gen-sw.mjs` walks the deployable files, hashes each one, writes that map into
`sw.js` from `tools/sw.template.js`, and names the cache after the combined hash. Edit
`tools/sw.template.js`, never `sw.js`. `.github/workflows/verify-precache.yml` fails if the
committed `sw.js` is stale.

A new deploy changes the combined hash, so the next visit installs a fresh worker and
re-fetches every precached file once; until then clients keep serving the previous version.
