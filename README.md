# AllAnime – Seanime extension (AllManga.to)

A **Seanime** [Online Streaming Provider](https://seanime.gitbook.io/seanime-extensions/content-providers/online-streaming-provider) that streams anime from **[https://allmanga.to/anime](https://allmanga.to/anime)**.

The extension uses the same backend (GraphQL at `api.allanime.day`) as the [Aniyomi AllAnime extension](https://raw.githubusercontent.com/yuzono/anime-repo/repo/index.min.json) and resolves internal MP4/HLS sources.

## Files


| File                             | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `provider.ts`                    | Main provider implementation (search, episodes, video sources). |
| `online_streaming_provider.d.ts` | Seanime online streaming provider types.                        |
| `core.d.ts`                      | Minimal Seanime core API declarations (fetch, LoadDoc).         |
| `allanime-allmanga.json`         | Seanime extension manifest with embedded payload.               |


## Installation in Seanime

1. **From file (local)**
  - Copy **`allanime-allmanga.json`** into the **`extensions`** folder inside your [Seanime data directory](https://seanime.rahim.app/docs/config#data-directory).
  - The file **must** be named **`allanime-allmanga.json`** (same as the `id` in the manifest). If the name doesn’t match, Seanime won’t load it.
  - Restart Seanime (or use the in-app option to refresh extensions if available).
  - Data directory locations:
    - **Windows**: `%APPDATA%\\Seanime`
    - **macOS**: `~/Library/Application Support/Seanime`
    - **Linux**: typically `~/.config/Seanime` or `$XDG_CONFIG_HOME/Seanime`
2. **From Playground**
  In Seanime: **Playground → Extensions**, choose “Online Streaming Provider”, then paste the contents of `provider.ts` into the code field and run the methods you want to test.
3. **Shared / hosted**
  Host `allanime-allmanga.json` (e.g. on GitHub) and set `manifestURI` in the manifest to that URL. You can then [share the extension](https://seanime.rahim.app/community/extensions) via that manifest link.

## Playground usage

- **search**: Use `query` (e.g. `"One Piece"`) and optionally `dub: true/false`. The returned `id` is the extension’s anime id.
- **findEpisodes**: Use the **`id` from the search result** as the anime id (e.g. `ReooPAxPMsHM4KPMY<&sep><&sep>1p`). Do **not** use the app’s media id (e.g. `21`); the API only knows its own ids, so you get an empty list otherwise.
- **findEpisodeServer**: Use an episode from `findEpisodes` (the full episode object or at least its `id`).

## Behaviour

- **Search**: GraphQL `shows` with `search`, `translationType` (sub/dub), and `countryOrigin: "ALL"`.
- **Episodes**: GraphQL `show(_id)` → `availableEpisodesDetail` (sub/dub); episode IDs are normalized and filtered to integers. The `id` argument must be the extension’s anime id from search.
- **Video sources**: GraphQL `episode(showId, translationType, episodeString)` → `sourceUrls`. Only **internal** hosters are used; their URLs are resolved via the site’s `getVersion` → `episodeIframeHead` and the `/apivtwo/` clock JSON endpoint. You can **choose the server** in Seanime (e.g. **Default**, **Ac**, **Luf-mp4**, **Si-Hls**, …) to prefer a specific host; **Auto (all)** merges every server and lists qualities sorted by resolution (highest first).

## Servers and resolution

**What are the servers?**  
They are internal stream host names from the AllAnime/AllManga backend. Each one is a different source (CDN/encoder) that can have different availability and quality for a given episode. The same names are used in the Aniyomi AllAnime extension; there is no official public list of what each does. In practice:

- **Auto (all)** – Uses every available internal source and merges all qualities. Best if you want the widest choice.
- **Default**, **Ac**, **Ak**, **Kir**, **Luf-mp4**, **Si-Hls**, **S-mp4**, **Ac-Hls** – Each uses only that one source. Useful if one server works better for you (e.g. fewer buffering issues) or if you want to avoid mixing sources.

**How does resolution work?**  
The extension does **not** add a separate “resolution” setting. For each episode we return a list of **video sources** (each with a label like `1080p - Default` or `720p - Si-Hls`). We sort that list so the **highest resolution is first**. Seanime then decides how to use that list:

- If Seanime shows a **quality / source picker** when you play (e.g. in the player or in a menu), that list comes from our `videoSources`; the first option is the highest resolution we reported.
- If there is **no visible resolution selector**, Seanime is likely using the **first source** we return (i.e. the highest resolution we sent) or a global app preference. So you already get the best quality we have for the server you chose. To get different resolutions you can try another server (some may offer only 720p, others 1080p) or use **Auto (all)** so Seanime receives all qualities from all servers and can pick or show them.

Encrypted `sourceUrl` values (starting with `-`) are decrypted with the same logic as the Aniyomi extension (hex decode + XOR 56).

## References

- [Seanime extensions – Getting started](https://seanime.gitbook.io/seanime-extensions)
- [Seanime – Core APIs](https://seanime.gitbook.io/seanime-extensions/seanime/core-apis)
- [Online Streaming Provider](https://seanime.gitbook.io/seanime-extensions/content-providers/online-streaming-provider)
- Aniyomi AllAnime source: [Kohi-den/extensions-source](https://github.com/Kohi-den/extensions-source) (`src/en/allanime`)

