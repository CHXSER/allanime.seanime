/// <reference path="./core.d.ts" />
/// <reference path="./online_streaming_provider.d.ts" />

const API_BASE = "https://api.allanime.day";
const SITE_URL = "https://allmanga.to";
const PAGE_SIZE = 26;

const SEARCH_QUERY = `query(
  $search: SearchInput
  $limit: Int
  $page: Int
  $translationType: VaildTranslationTypeEnumType
  $countryOrigin: VaildCountryOriginEnumType
) {
  shows(
    search: $search
    limit: $limit
    page: $page
    translationType: $translationType
    countryOrigin: $countryOrigin
  ) {
    pageInfo { total }
    edges {
      _id
      name
      thumbnail
      englishName
      nativeName
      slugTime
    }
  }
}`;

const EPISODES_QUERY = `query ($_id: String!) {
  show(_id: $_id) {
    _id
    availableEpisodesDetail
  }
}`;

const STREAMS_QUERY = `query(
  $showId: String!,
  $translationType: VaildTranslationTypeEnumType!,
  $episodeString: String!
) {
  episode(
    showId: $showId
    translationType: $translationType
    episodeString: $episodeString
  ) {
    sourceUrls
  }
}`;

type SearchVariables = {
  search: { query?: string; allowAdult: boolean; allowUnknown: boolean };
  limit: number;
  page: number;
  translationType: string;
  countryOrigin: string;
};

type EpisodesVariables = { _id: string };

type StreamsVariables = {
  showId: string;
  translationType: string;
  episodeString: string;
};

type GraphQLResponse<T> = { data: T };

type SearchEdge = {
  _id: string;
  name: string;
  thumbnail: string;
  englishName?: string | null;
  nativeName?: string | null;
  slugTime?: string | null;
};

type EpisodesDetail = { sub?: string[] | null; dub?: string[] | null };

type SourceUrlEntry = {
  sourceUrl: string;
  type: string;
  sourceName: string;
  priority?: number;
};

function decryptSourceUrl(encrypted: string): string {
  if (encrypted.indexOf("-") !== 0) return encrypted;
  const hexStr = encrypted.substring(encrypted.lastIndexOf("-") + 1);
  let out = "";
  for (let i = 0; i < hexStr.length; i += 2) {
    const byte = parseInt(hexStr.substr(i, 2), 16);
    out += String.fromCharCode((byte ^ 56) & 0xff);
  }
  return out;
}

function slugify(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

async function gqlPost<T>(variables: Record<string, unknown>, query: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api`, {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json; charset=utf-8",
      Origin: SITE_URL,
      Referer: `${API_BASE}/`,
    },
    body: JSON.stringify({ variables, query }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = (await res.json()) as GraphQLResponse<T>;
  return json.data;
}

const INTERNAL_SERVERS = [
  "Auto (all)",
  "Default",
  "Ac",
  "Ak",
  "Kir",
  "Luf-mp4",
  "Si-Hls",
  "S-mp4",
  "Ac-Hls",
];

function serverMatchesSource(serverKey: string, sourceName: string): boolean {
  if (serverKey === "Auto (all)") return true;
  const s = serverKey.toLowerCase();
  const n = sourceName.toLowerCase();
  return n === s || n.indexOf(s + "-") === 0;
}

function parseResolutionFromQuality(quality: string): number {
  const match = quality.match(/(\d+)\s*p/i);
  return match ? parseInt(match[1], 10) : 0;
}

function sortVideoSourcesByResolution(sources: VideoSource[]): void {
  sources.sort((a, b) => {
    const resA = parseResolutionFromQuality(a.quality);
    const resB = parseResolutionFromQuality(b.quality);
    return resB - resA;
  });
}

class Provider {
  private episodeIframeHead: string | null = null;

  getSettings(): Settings {
    return {
      episodeServers: INTERNAL_SERVERS,
      supportsDub: true,
    };
  }

  async search(opts: SearchOptions): Promise<SearchResult[]> {
    const translationType = opts.dub ? "dub" : "sub";
    const variables: SearchVariables = {
      search: { allowAdult: false, allowUnknown: false },
      limit: PAGE_SIZE,
      page: 1,
      translationType,
      countryOrigin: "ALL",
    };
    if (opts.query && opts.query.length > 0) variables.search.query = opts.query;
    const data = await gqlPost<{ shows: { edges: SearchEdge[] } }>(variables, SEARCH_QUERY);
    const edges = (data.shows && data.shows.edges) ? data.shows.edges : [];
    const results: SearchResult[] = [];
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const title = e.englishName || e.name;
      const slug = slugify(e.name);
      const slugTime = e.slugTime || "";
      const slugTimeSuffix = slugTime ? "-st-" + slugTime : "";
      const animeUrl = `${SITE_URL}/anime/${e._id}/${slug}${slugTimeSuffix}`;
      results.push({
        id: `${e._id}<&sep>${slugTime}<&sep>${slug}`,
        title,
        url: animeUrl,
        subOrDub: "both",
      });
    }
    return results;
  }

  async findEpisodes(id: string): Promise<EpisodeDetails[]> {
    if (id.indexOf("<&sep>") < 0) {
      throw new Error(
        'findEpisodes expects the anime "id" from search results, not the media id. ' +
        'In the Playground, use the "id" value from your search result (e.g. ReooPAxPMsHM4KPMY<&sep><&sep>1p).'
      );
    }
    const showId = id.split("<&sep>")[0];
    const variables: EpisodesVariables = { _id: showId };
    const data = await gqlPost<{
      show: { _id: string; availableEpisodesDetail: EpisodesDetail };
    }>(variables, EPISODES_QUERY);
    const detail = data.show && data.show.availableEpisodesDetail;
    if (!detail) return [];
    const subOrDub = (detail.sub && detail.sub.length > 0) ? "sub" : "dub";
    const list = subOrDub === "sub" ? (detail.sub || []) : (detail.dub || []);
    const episodes: EpisodeDetails[] = [];
    for (let i = 0; i < list.length; i++) {
      const epStr = list[i];
      const num = parseFloat(epStr) || 1;
      const epId = `${showId}|${epStr}|${subOrDub}`;
      episodes.push({
        id: epId,
        number: Math.floor(num) === num ? Math.floor(num) : Math.floor(num),
        url: `${SITE_URL}/anime/${showId}`,
        title: `Episode ${epStr} (${subOrDub})`,
      });
    }
    episodes.sort((a, b) => a.number - b.number);
    const lowest = episodes.length > 0 ? episodes[0].number : 1;
    if (lowest > 1) {
      for (let j = 0; j < episodes.length; j++) {
        episodes[j].number = episodes[j].number - lowest + 1;
      }
    }
    return episodes.filter((ep) => Number.isInteger(ep.number));
  }

  async findEpisodeServer(episode: EpisodeDetails, _server: string): Promise<EpisodeServer> {
    const [showId, episodeString, translationType] = episode.id.split("|");
    const variables: StreamsVariables = {
      showId,
      translationType: translationType || "sub",
      episodeString,
    };
    const data = await gqlPost<{
      episode: { sourceUrls: SourceUrlEntry[] };
    }>(variables, STREAMS_QUERY);
    const sourceUrls = (data.episode && data.episode.sourceUrls) ? data.episode.sourceUrls : [];
    const internalNames = ["default", "ac", "ak", "kir", "luf-mp4", "si-hls", "s-mp4", "ac-hls"];
    const selectedServer = (_server && _server.length > 0) ? _server : "Auto (all)";
    const videoSources: VideoSource[] = [];
    for (let i = 0; i < sourceUrls.length; i++) {
      const v = sourceUrls[i];
      const url = decryptSourceUrl(v.sourceUrl);
      const isInternal =
        url.indexOf("/apivtwo/") === 0 &&
        internalNames.some(
          (n) => v.sourceName.toLowerCase().indexOf(n) >= 0
        );
      if (!isInternal) continue;
      if (!serverMatchesSource(selectedServer, v.sourceName)) continue;
      const sources = await this.resolveInternalUrls(url, v.sourceName);
      for (let s = 0; s < sources.length; s++) videoSources.push(sources[s]);
    }
    if (videoSources.length === 0) {
      throw new Error(
        "No video sources found for this episode or server. Try another server (e.g. Auto (all) or Default)."
      );
    }
    sortVideoSourcesByResolution(videoSources);
    return {
      server: selectedServer,
      headers: { Referer: `${SITE_URL}/` },
      videoSources,
    };
  }

  private async getEpisodeIframeHead(): Promise<string> {
    if (this.episodeIframeHead) return this.episodeIframeHead || "";
    const res = await fetch(`${SITE_URL}/getVersion`);
    if (!res.ok) throw new Error("Failed to get version.");
    const json = await res.json();
    this.episodeIframeHead = json.episodeIframeHead || "";
    return this.episodeIframeHead || "";
  }

  private async resolveInternalUrls(
    sourceUrl: string,
    sourceName: string
  ): Promise<VideoSource[]> {
    const endpoint = await this.getEpisodeIframeHead();
    const jsonUrl = sourceUrl.replace("/clock?", "/clock.json?");
    const res = await fetch(endpoint + jsonUrl);
    if (!res.ok) return [];
    const body = await res.json();
    const links = body.links || [];
    const result: VideoSource[] = [];
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const subs: VideoSubtitle[] = [];
      if (link.subtitles && link.subtitles.length > 0) {
        for (let k = 0; k < link.subtitles.length; k++) {
          const sub = link.subtitles[k];
          subs.push({
            id: String(k),
            url: sub.src || "",
            language: sub.lang || "en",
            isDefault: k === 0,
          });
        }
      }
      const quality = (link.resolutionStr || "Unknown") + " - " + sourceName;
      if (link.mp4 === true && link.link) {
        result.push({
          url: link.link,
          type: "mp4",
          quality,
          subtitles: subs,
        });
      } else if (link.hls === true && link.link) {
        const type: VideoSourceType = "m3u8";
        result.push({
          url: link.link,
          type,
          quality,
          subtitles: subs,
        });
      }
    }
    return result;
  }
}
