# LemmyTools

A small suite of tools to make Lemmy easier — now a Firefox WebExtension.

> **Note:** the original Greasemonkey/Tampermonkey userscript has been retired. The repository now ships only the Firefox addon under [`extension/`](./extension). The last userscript release was 0.2.1.0; the addon picks up at 0.3.0.0.

## Features (0.3.0.0)

- **LemmyTools bar** — top bar (default), or a flush-edge pull-tab on the left or right of the screen with a searchable list of your subscribed communities. The collapsed-state handle, gear icon, and helper button all pick up `--bs-primary` and other Bootstrap variables, so they blend with whichever Lemmy theme you're using.
- **Three ways into settings**
  - Click the LemmyTools toolbar button → quick-toggle popup
  - Click the gear (⚙) on the LemmyTools bar (works in top, left, and right layouts)
  - Type `!settings` (or `!options`) into the LemmyTools search box
  - Or use Firefox's `about:addons` → LemmyTools → Preferences
- **User Tagger** — click any user to attach a coloured note that follows them across the site
- **Content Block** — hide posts and comments matching keyword filters (compiled to a single regex for speed)
- **Image tools** — click-and-drag resize for expanded images, auto-expand image posts, auto-unblur NSFW, "Show all images" button
- **Hide Lemmy's built-in sidebars** for more reading space
- **Browse/Subscribe** to a remote community on your home instance with one click
- **Open all links in a new tab** with `rel=noreferrer` (optional)

## Installing

### Temporary install (any Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…**
3. Select `extension/manifest.json` (or `lemmytools-0.3.0.0.xpi` if you've packaged it)

The addon stays loaded until Firefox restarts.

### Permanent install (XPI)

A packaged `lemmytools-0.3.0.0.xpi` lives in the repo root. To install it:

- **Firefox Developer Edition, Nightly, or ESR** — open `about:config`, set `xpinstall.signatures.required` to `false`, then drag the `.xpi` onto the Firefox window
- **Stable Firefox** — the addon must be signed via AMO. Submit the XPI to <https://addons.mozilla.org/developers/> for review

### Repackaging from source

```bash
# with zip
cd extension
zip -r -FS ../lemmytools-0.3.0.0.xpi . -x '*.DS_Store'

# or, if you don't have zip installed (e.g. plain WSL)
cd extension
python3 -c "import zipfile,os
with zipfile.ZipFile('../lemmytools-0.3.0.0.xpi','w',zipfile.ZIP_DEFLATED) as z:
    for r,_,fs in os.walk('.'):
        for f in fs:
            p=os.path.join(r,f)
            z.write(p, os.path.relpath(p,'.'))"
```

Either form must be run from inside `extension/` so `manifest.json` lands at the archive root — Firefox rejects XPIs where the manifest is nested in a subdirectory.

## Configuring

The most-used toggles are in the **toolbar button popup**:

- Bar position (top / right / left), keep bar always open, hide Lemmy sidebars
- Expandable images, auto-open image posts, auto-unblur NSFW
- Open all links in new tab, content blocking on/off

For the rest — instance URL, image size, expand-image speed, blocklist filters, etc. — open the full settings page (gear icon, `!settings` command, or popup footer button).

Settings are stored in `browser.storage.local` and applied live across all open Lemmy tabs without requiring a reload.

## Layout

```
extension/
├── manifest.json
├── background/background.js          # default-settings install + openOptionsPage routing
├── content/
│   ├── lemmytools.js                 # main content script, MutationObserver-based
│   └── lemmytools.css                # CSP-clean stylesheet, theme-variable driven
├── lib/storage.js                    # async storage wrapper + one-time userscript migration
├── options/{options.html, options.css, options.js}
├── popup/{popup.html, popup.css, popup.js}
└── icons/lemmy-logo.webp
```

## Migrating from the userscript

If you previously used the Greasemonkey/Tampermonkey userscript, your settings, user tags, and cached community list are imported automatically the first time the addon runs on a Lemmy page. The migration runs once and is then idempotent — you can safely uninstall the userscript afterwards.

## Contributing

Issues and PRs welcome at <https://github.com/howdy-tsc/LemmyTools>.

Original userscript credits:

- **@cwagner@lemmy.cwagner.me** — coding, code cleanup, mentoring
- **Charles Machalow (csm10495)** — coding contributions
- **jimmyhiggs337** — coding contributions

## License

See [LICENSE](./LICENSE).
