# LemmyTools

A small suite of tools to make Lemmy easier — now a Firefox WebExtension.

> **Note:** the original Greasemonkey/Tampermonkey userscript has been retired. The repository now ships only the Firefox addon under [`extension/`](./extension). The last userscript release was 0.2.1.0; the addon picks up at 0.3.0.0.

## Features (0.3.1.1)

- **LemmyTools bar** — top bar (default), or a flush-edge pull-tab on the left or right of the screen with a searchable list of your subscribed communities. The collapsed-state handle, gear icon, and helper button all pick up `--bs-primary` and other Bootstrap variables, so they blend with whichever Lemmy theme you're using.
- **Community Groups** — organize subscribed communities into named, collapsible groups in the LemmyTools bar
- **Community list sort** — alphabetical (default) or by most recently visited
- **Three ways into settings**
  - Click the LemmyTools toolbar button → quick-toggle popup
  - Click the gear (⚙) on the LemmyTools bar (works in top, left, and right layouts)
  - Type `!settings` (or `!options`) into the LemmyTools search box
  - Or use Firefox's `about:addons` → LemmyTools → Preferences
- **User Tagger** — click any user to attach a coloured note that follows them across the site
- **Content Block** — hide posts and comments matching keyword filters (compiled to a single regex for speed)
- **Image tools** — click-and-drag resize for expanded images, three-mode image-post picker (auto-open all, manual button, or neither), auto-unblur NSFW
- **Hide Lemmy's built-in sidebars** for more reading space
- **Browse/Subscribe** to a remote community on your home instance with one click
- **Open links in a new tab** — off, external links only, or all links (including internal Lemmy navigation), with `rel=noreferrer`

## Installing

See Releases Page

## Configuring

The most-used toggles are in the **toolbar button popup**:

- Bar position (top / right / left), keep bar always open, hide Lemmy sidebars
- Expandable images, auto-open image posts, auto-unblur NSFW
- Open all links in new tab, content blocking on/off

For the rest — instance URL, image size, expand-image speed, blocklist filters, etc. — open the full settings page (gear icon, `!settings` command, or popup footer button).

Settings are stored in `browser.storage.local` and applied live across all open Lemmy tabs without requiring a reload.

## Contributing

Issues and PRs welcome at <https://github.com/howdy-tsc/LemmyTools>.

Original userscript credits:

- **@cwagner@lemmy.cwagner.me** — coding, code cleanup, mentoring
- **Charles Machalow (csm10495)** — coding contributions
- **jimmyhiggs337** — coding contributions

## License

See [LICENSE](./LICENSE).
