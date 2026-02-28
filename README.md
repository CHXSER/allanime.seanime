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
- The file **must** be named **`allanime-allmanga.json`**. If the name doesn’t match, Seanime won’t load it.
- Restart Seanime (or use the in-app option to refresh extensions if available).
- Data directory locations:
  - **Windows**: `%APPDATA%\\Seanime`
  - **macOS**: `~/Library/Application Support/Seanime`
  - **Linux**: typically `~/.config/Seanime` or `$XDG_CONFIG_HOME/Seanime`

2. Remotely
- On Seanime go to extensions > Add extensions
- Paste this `https://raw.githubusercontent.com/CHXSER/allanime.seanime/refs/heads/main/allanime-allmanga.json`
- Install

## References

- [Seanime extensions – Getting started](https://seanime.gitbook.io/seanime-extensions)
- [Seanime – Core APIs](https://seanime.gitbook.io/seanime-extensions/seanime/core-apis)
- [Online Streaming Provider](https://seanime.gitbook.io/seanime-extensions/content-providers/online-streaming-provider)
- Aniyomi AllAnime source: [Kohi-den/extensions-source](https://github.com/Kohi-den/extensions-source) (`src/en/allanime`)
