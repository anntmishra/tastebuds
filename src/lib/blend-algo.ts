import type { TasteSnapshot, TasteTrack } from "@/lib/taste";

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export type Lean = "a" | "b" | "both";

export type BlendDimension = {
  key: "artists" | "genres" | "era" | "obscurity" | "discovery";
  label: string;
  score: number; // 0-100
  blurb: string;
};

export type BlendBridge = {
  from: string; // person who brings it
  genre: string;
  via: string; // an example artist of theirs
};

export type BlendTrackPick = {
  spotifyTrackId: string;
  name: string;
  artists: string;
  matchReason: string; // structural: why it was picked
  vibe: string; // 2-3 word personality tag
  lean: Lean;
  albumArt: string;
  position: number;
};

export type BlendAnalysis = {
  compatibility: number; // 0-99
  headline: string;
  /** dominant per-track mood word ("menacing", "hazy", …) — drives the theme pack */
  mood: string;
  /** the decade the two overlap in most, e.g. "2010" — or null */
  era: string | null;
  /** up to 4 distinct album covers for the blend's cover image */
  coverArt: string[];
  dimensions: BlendDimension[];
  connections: string[]; // 2-4 sentences
  sharedArtists: { name: string; rankA: number; rankB: number }[];
  sharedGenres: string[];
  bridges: BlendBridge[];
  tracks: BlendTrackPick[];
};

/** Everything on a Blend row except the tracklist + score column. */
export type StoredBlendAnalysis = Omit<
  BlendAnalysis,
  "tracks" | "compatibility"
>;

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

const TARGET_TRACKS = 22;

// Genre tokens so generic they barely signal a match.
const COMMON_TOKENS = new Set([
  "pop",
  "rock",
  "rap",
  "hop",
  "indie",
  "trap",
  "soul",
  "house",
  "dance",
  "folk",
  "wave",
  "edm",
  "beats",
  "music",
  "contemporary",
  "alternative",
  "singer-songwriter",
]);

const MOOD_RULES: [RegExp, string][] = [
  [/phonk|drift phonk|memphis/, "Menacing"],
  [/shoegaze|dream pop|slowcore/, "Hazy"],
  [/bedroom|lo-?fi|twee/, "Tender"],
  [/hyperpop|glitchcore|digicore/, "Unhinged"],
  [/drill|grime/, "Cold"],
  [/yacht|soft rock|adult standards|mellow gold/, "Smooth"],
  [/ambient|drone|new age/, "Weightless"],
  [/punk|hardcore|noise rock/, "Feral"],
  [/disco|funk|boogie|nu-?disco/, "Sweaty"],
  [/emo|midwest|screamo|post-hardcore/, "Wounded"],
  [/house|techno|\bedm\b|trance|hardstyle/, "Relentless"],
  [/jazz|bossa|lounge|swing/, "Velvet"],
  [/metal|djent|doom/, "Heavy"],
  [/country|americana|bluegrass/, "Dusty"],
  [/r&b|rnb|neo-?soul|\bsoul\b/, "Silky"],
  [/trap|rage/, "Blown-out"],
  [/indie rock|garage rock|post-punk/, "Restless"],
  [/folk|singer-songwriter|chamber pop/, "Bare"],
  [/hip ?hop|\brap\b|boom bap/, "Sharp"],
  [/\bpop\b/, "Bright"],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => Math.round(clamp01(n) * 100);
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function rareWeight(token: string): number {
  return COMMON_TOKENS.has(token) ? 0.3 : 1;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w) dot += v * w;
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function moodFor(genres: string[]): string {
  const hay = genres.join(" ").toLowerCase();
  for (const [re, word] of MOOD_RULES) if (re.test(hay)) return word;
  return "Eclectic";
}

function reachWord(pop: number): string {
  if (pop >= 72) return "hit";
  if (pop >= 48) return "favourite";
  if (pop >= 26) return "deep cut";
  return "obscurity";
}

function obscurityWord(mean: number): string {
  if (mean <= 30) return "deep underground";
  if (mean <= 45) return "off the radar";
  if (mean <= 62) return "middle of the road";
  if (mean <= 78) return "pretty mainstream";
  return "chart-topping";
}

// ---------------------------------------------------------------------------
// Per-person model
// ---------------------------------------------------------------------------

type GenrePresence = { count: number; bestRank: number; sampleArtist: string };

type Side = {
  name: string;
  snap: TasteSnapshot;
  trackIds: Set<string>;
  artistIds: Set<string>;
  artistRank: Map<string, number>;
  artistGenres: Map<string, string[]>;
  genrePresence: Map<string, GenrePresence>;
  genreTokens: Map<string, number>; // rare-weighted
  eraMap: Map<string, number>;
  popMean: number;
};

function buildSide(name: string, snap: TasteSnapshot): Side {
  const artistRank = new Map<string, number>();
  const artistGenres = new Map<string, string[]>();
  const genrePresence = new Map<string, GenrePresence>();

  snap.topArtists.forEach((a, i) => {
    artistRank.set(a.id, i);
    artistGenres.set(a.id, a.genres ?? []);
    for (const g of a.genres ?? []) {
      const cur = genrePresence.get(g) ?? {
        count: 0,
        bestRank: 999,
        sampleArtist: a.name,
      };
      cur.count += 1;
      if (i < cur.bestRank) {
        cur.bestRank = i;
        cur.sampleArtist = a.name;
      }
      genrePresence.set(g, cur);
    }
  });

  const genreTokens = new Map<string, number>();
  for (const { name: g, weight } of snap.genres) {
    for (const tok of g.toLowerCase().split(/\s+/)) {
      if (tok.length < 3) continue;
      genreTokens.set(
        tok,
        (genreTokens.get(tok) ?? 0) + weight * rareWeight(tok),
      );
    }
  }

  return {
    name,
    snap,
    trackIds: new Set(snap.topTracks.map((t) => t.id)),
    artistIds: new Set(snap.topArtists.map((a) => a.id)),
    artistRank,
    artistGenres,
    genrePresence,
    genreTokens,
    eraMap: new Map(snap.eras.map((e) => [String(e.decade), e.weight])),
    popMean: snap.popularity.mean,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function rankAwareArtistOverlap(A: Side, B: Side) {
  const sharedIds = [...A.artistIds].filter((id) => B.artistIds.has(id));
  let ov = 0;
  for (const id of sharedIds) {
    ov +=
      1 / Math.sqrt((A.artistRank.get(id) ?? 50) + 1) +
      1 / Math.sqrt((B.artistRank.get(id) ?? 50) + 1);
  }
  let ref = 0;
  for (let i = 0; i < 20; i++) ref += 2 / Math.sqrt(i + 1);
  return { sharedIds, score: clamp01(ov / (ref * 0.3)) };
}

function genreClusterScore(A: Side, B: Side) {
  const tokCos = cosine(A.genreTokens, B.genreTokens);
  const all = new Set([...A.genrePresence.keys(), ...B.genrePresence.keys()]);
  let cl = 0;
  let clMax = 0;
  const shared: { name: string; rank: number }[] = [];
  for (const g of all) {
    const rare = rareWeight(g.split(/\s+/)[0] ?? g);
    clMax += rare;
    const ga = A.genrePresence.get(g);
    const gb = B.genrePresence.get(g);
    if (ga && gb) {
      const rankBoost =
        (1 / Math.sqrt(ga.bestRank + 1) + 1 / Math.sqrt(gb.bestRank + 1)) / 2;
      cl += rare * rankBoost;
      shared.push({ name: g, rank: ga.bestRank + gb.bestRank });
    }
  }
  const clusterScore = clMax > 0 ? clamp01(cl / (clMax * 0.35)) : 0;
  shared.sort((x, y) => x.rank - y.rank);
  return {
    score: clamp01(0.55 * tokCos + 0.45 * clusterScore),
    sharedGenres: shared.map((s) => s.name),
  };
}

function bridgesFrom(from: Side, to: Side) {
  const out: { genre: string; via: string; strength: number }[] = [];
  for (const [g, info] of from.genrePresence) {
    if (to.genrePresence.has(g)) continue; // shared, not a bridge
    const toks = g.split(/\s+/).filter((w) => w.length >= 4);
    const adjacent = toks.some((w) => to.genreTokens.has(w));
    if (!adjacent) continue;
    const strength =
      rareWeight(toks[0] ?? g) *
      (1 / Math.sqrt(info.bestRank + 1)) *
      Math.min(info.count, 4);
    out.push({ genre: g, via: info.sampleArtist, strength });
  }
  out.sort((x, y) => y.strength - x.strength);
  return out.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Track selection
// ---------------------------------------------------------------------------

function pickTracks(A: Side, B: Side): BlendTrackPick[] {
  const picked = new Map<string, BlendTrackPick>();
  const perPerson = { a: 0, b: 0 };
  const cap = Math.ceil(TARGET_TRACKS * 0.65);

  const genresForTrack = (t: TasteTrack, owner: "a" | "b"): string[] => {
    const self = owner === "a" ? A : B;
    const other = owner === "a" ? B : A;
    const g = t.artistIds.flatMap(
      (id) => self.artistGenres.get(id) ?? other.artistGenres.get(id) ?? [],
    );
    return g;
  };

  const add = (
    t: TasteTrack,
    reason: string,
    lean: Lean,
    owner?: "a" | "b",
    capped = true,
  ): boolean => {
    if (picked.has(t.id) || picked.size >= TARGET_TRACKS) return false;
    if (owner) {
      if (capped && perPerson[owner] >= cap) return false;
      perPerson[owner] += 1;
    }
    const genres = genresForTrack(t, owner ?? "a");
    let vibe = `${moodFor(genres)} ${reachWord(t.popularity)}`;
    if (t.decade && t.decade <= 2000) vibe = `Throwback ${vibe.toLowerCase()}`;
    picked.set(t.id, {
      spotifyTrackId: t.id,
      name: t.name,
      artists: t.artists.join(", "),
      matchReason: reason,
      vibe,
      lean,
      albumArt: t.albumArt ?? "",
      position: 0,
    });
    return true;
  };

  // 1 — in both top lists
  for (const t of A.snap.topTracks) {
    if (B.trackIds.has(t.id)) add(t, "You both have this in your top tracks", "both");
  }

  // 2 — one each by every shared artist
  const shared = [...A.artistIds].filter((id) => B.artistIds.has(id));
  for (const artistId of shared) {
    const nm = A.artistGenres.has(artistId)
      ? A.snap.topArtists.find((a) => a.id === artistId)?.name
      : B.snap.topArtists.find((a) => a.id === artistId)?.name;
    const reason = `You both listen to ${nm ?? "this artist"}`;
    const ta = A.snap.topTracks.find(
      (t) => t.artistIds.includes(artistId) && !picked.has(t.id),
    );
    if (ta) add(ta, reason, "both", "a");
    const tb = B.snap.topTracks.find(
      (t) => t.artistIds.includes(artistId) && !picked.has(t.id),
    );
    if (tb) add(tb, reason, "both", "b");
  }

  // 3 — genre bridge (exact then word-token)
  const bridgeOne = (owner: "a" | "b", self: Side, other: Side): boolean => {
    for (const t of self.snap.topTracks) {
      if (picked.has(t.id)) continue;
      const genres = t.artistIds.flatMap((id) => self.artistGenres.get(id) ?? []);
      const exact = genres.find((g) => other.genrePresence.has(g));
      if (exact)
        return add(t, `${titleCase(exact)} — common ground`, owner, owner);
      for (const g of genres) {
        const tok = g
          .toLowerCase()
          .split(/\s+/)
          .find((w) => w.length >= 4 && other.genreTokens.has(w));
        if (tok)
          return add(t, `${titleCase(tok)} — common ground`, owner, owner);
      }
    }
    return false;
  };
  for (let g = 0; picked.size < TARGET_TRACKS && g < 60; g++) {
    if (!bridgeOne("a", A, B) && !bridgeOne("b", B, A)) break;
  }

  // 4 — shared decade / overlapping popularity band
  const sharedDecades = new Set(
    [...A.eraMap.keys()].filter((d) => B.eraMap.has(d)),
  );
  const popAvg = (A.popMean + B.popMean) / 2;
  const popLo = Math.min(A.popMean, B.popMean) - 15;
  const popHi = Math.max(A.popMean, B.popMean) + 15;
  const popReason =
    popAvg >= 65
      ? "You both go for the big ones"
      : popAvg >= 40
        ? "Sits in your shared sweet spot"
        : "You both dig for the deep cuts";
  const fillOne = (owner: "a" | "b", self: Side): boolean => {
    for (const t of self.snap.topTracks) {
      if (picked.has(t.id)) continue;
      if (t.decade && sharedDecades.has(String(t.decade)))
        return add(t, `Fits the ${t.decade}s you both lean on`, owner, owner);
      if (t.popularity >= popLo && t.popularity <= popHi)
        return add(t, popReason, owner, owner);
    }
    return false;
  };
  for (let g = 0; picked.size < TARGET_TRACKS && g < 60; g++) {
    if (!fillOne("a", A) && !fillOne("b", B)) break;
  }

  // 5 — last resort: alternate remaining top tracks (uncapped)
  for (let g = 0; picked.size < TARGET_TRACKS && g < 120; g++) {
    let moved = false;
    for (const t of A.snap.topTracks) {
      if (!picked.has(t.id) && add(t, `${A.name}'s pick`, "a", "a", false)) {
        moved = true;
        break;
      }
    }
    for (const t of B.snap.topTracks) {
      if (!picked.has(t.id) && add(t, `${B.name}'s pick`, "b", "b", false)) {
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }

  return [...picked.values()].map((p, i) => ({ ...p, position: i }));
}

// ---------------------------------------------------------------------------
// Headline + connections
// ---------------------------------------------------------------------------

function buildHeadline(
  d: Record<string, number>,
  topDecade: string | null,
  popAvg: number,
): string {
  const HI = 65;
  const LO = 40;
  const w = obscurityWord(popAvg);
  if (d.artists >= HI && d.genres >= HI) return "Basically the same person";
  if (d.genres >= HI && d.artists < LO) return "Same lanes, different cars";
  if (d.genres < LO && d.artists < LO && d.discovery >= HI)
    return "A chaos blend — you share almost nothing";
  if (d.era >= HI && d.genres < LO && topDecade)
    return `United by the ${topDecade}s, divided by everything else`;
  if (d.obscurity >= HI && d.genres < LO)
    return `Two ${w === "chart-topping" ? "chart-chasers" : w === "deep underground" || w === "off the radar" ? "crate-diggers" : "omnivores"} who somehow don't overlap`;
  if (d.genres >= LO && d.genres < HI)
    return "Real overlap, with room to surprise each other";
  return "An honest mix of common ground and collision";
}

function buildConnections(args: {
  aName: string;
  bName: string;
  sharedArtists: { name: string }[];
  sharedGenres: string[];
  bridges: BlendBridge[];
  topSharedDecade: string | null;
  aMean: number;
  bMean: number;
}): string[] {
  const out: string[] = [];
  if (args.sharedArtists.length) {
    out.push(
      `Your core: ${args.sharedArtists.slice(0, 3).map((s) => s.name).join(", ")}.`,
    );
  }
  if (args.sharedGenres.length) {
    out.push(
      `Common ground — ${args.sharedGenres.slice(0, 3).map(titleCase).join(", ")}.`,
    );
  }
  for (const br of args.bridges.slice(0, 2)) {
    out.push(
      `${br.from} pulls you toward ${titleCase(br.genre)} (via ${br.via}).`,
    );
  }
  if (args.topSharedDecade) out.push(`You meet in the ${args.topSharedDecade}s.`);
  if (Math.abs(args.aMean - args.bMean) >= 20) {
    out.push(
      `${args.aName} runs ${obscurityWord(args.aMean)}; ${args.bName} runs ${obscurityWord(args.bMean)}.`,
    );
  }
  return out.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function computeBlendAnalysis(
  aName: string,
  aSnap: TasteSnapshot,
  bName: string,
  bSnap: TasteSnapshot,
): BlendAnalysis {
  const A = buildSide(aName, aSnap);
  const B = buildSide(bName, bSnap);

  const artist = rankAwareArtistOverlap(A, B);
  const genre = genreClusterScore(A, B);
  const eraCos = cosine(A.eraMap, B.eraMap);
  const obsc = clamp01(1 - Math.abs(A.popMean - B.popMean) / 60);

  const bridgesAB = bridgesFrom(A, B);
  const bridgesBA = bridgesFrom(B, A);
  const bridgeStrength =
    bridgesAB.reduce((s, x) => s + x.strength, 0) +
    bridgesBA.reduce((s, x) => s + x.strength, 0);
  const discovery = clamp01(
    0.6 * (1 - genre.score) + 0.4 * clamp01(bridgeStrength / 2),
  );

  const scores = {
    artists: artist.score,
    genres: genre.score,
    era: eraCos,
    obscurity: obsc,
    discovery,
  };

  const raw =
    0.34 * scores.genres +
    0.2 * scores.artists +
    0.16 * scores.era +
    0.14 * scores.obscurity +
    0.16 * scores.discovery;
  const compatibility = Math.round(Math.min(99, Math.max(1, 44 + 56 * raw)));

  // shared artists with both ranks
  const sharedArtists = artist.sharedIds
    .map((id) => ({
      name:
        A.snap.topArtists.find((a) => a.id === id)?.name ??
        B.snap.topArtists.find((a) => a.id === id)?.name ??
        "Unknown",
      rankA: (A.artistRank.get(id) ?? 0) + 1,
      rankB: (B.artistRank.get(id) ?? 0) + 1,
    }))
    .sort((x, y) => x.rankA + x.rankB - (y.rankA + y.rankB))
    .slice(0, 8);

  const topSharedDecade =
    [...A.eraMap.keys()]
      .filter((d) => B.eraMap.has(d))
      .sort(
        (x, y) =>
          (B.eraMap.get(y)! + A.eraMap.get(y)!) -
          (B.eraMap.get(x)! + A.eraMap.get(x)!),
      )[0] ?? null;

  const dimByPct = {
    artists: pct(scores.artists),
    genres: pct(scores.genres),
    era: pct(scores.era),
    obscurity: pct(scores.obscurity),
    discovery: pct(scores.discovery),
  };

  const bridges: BlendBridge[] = [
    ...bridgesAB.map((b) => ({ from: A.name, genre: b.genre, via: b.via })),
    ...bridgesBA.map((b) => ({ from: B.name, genre: b.genre, via: b.via })),
  ].slice(0, 4);

  const dimensions: BlendDimension[] = [
    {
      key: "artists",
      label: "Shared artists",
      score: dimByPct.artists,
      blurb:
        sharedArtists.length > 0
          ? `${sharedArtists.length} artist${sharedArtists.length === 1 ? "" : "s"} in both your top lists`
          : "No exact artist overlap — the blend leans on everything else",
    },
    {
      key: "genres",
      label: "Genre DNA",
      score: dimByPct.genres,
      blurb:
        genre.sharedGenres.length > 0
          ? `You both live in ${genre.sharedGenres.slice(0, 2).map(titleCase).join(" & ")}`
          : "Your genre maps barely touch",
    },
    {
      key: "era",
      label: "Era alignment",
      score: dimByPct.era,
      blurb: topSharedDecade
        ? `Strongest in the ${topSharedDecade}s`
        : "You're pulling from different decades",
    },
    {
      key: "obscurity",
      label: "Mainstream vs deep",
      score: dimByPct.obscurity,
      blurb: `${A.name} ${obscurityWord(A.popMean)}, ${B.name} ${obscurityWord(B.popMean)}`,
    },
    {
      key: "discovery",
      label: "Discovery potential",
      score: dimByPct.discovery,
      blurb:
        dimByPct.discovery >= 55
          ? "Lots of new ground to trade"
          : "You already know most of each other's world",
    },
  ];

  const headline = buildHeadline(
    dimByPct,
    topSharedDecade,
    (A.popMean + B.popMean) / 2,
  );

  const connections = buildConnections({
    aName: A.name,
    bName: B.name,
    sharedArtists,
    sharedGenres: genre.sharedGenres,
    bridges,
    topSharedDecade,
    aMean: A.popMean,
    bMean: B.popMean,
  });

  const tracks = pickTracks(A, B);
  const moodCounts = new Map<string, number>();
  for (const t of tracks) {
    const w = t.vibe.replace(/^throwback /i, "").split(" ")[0].toLowerCase();
    if (w && w !== "eclectic")
      moodCounts.set(w, (moodCounts.get(w) ?? 0) + 1);
  }
  const mood =
    [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "eclectic";

  // cover image: up to 4 distinct album covers, "both" picks first
  const coverArt: string[] = [];
  for (const t of [...tracks].sort((x, y) => (x.lean === "both" ? -1 : 0) - (y.lean === "both" ? -1 : 0))) {
    if (t.albumArt && !coverArt.includes(t.albumArt)) coverArt.push(t.albumArt);
    if (coverArt.length >= 4) break;
  }

  return {
    compatibility,
    headline,
    mood,
    era: topSharedDecade,
    coverArt,
    dimensions,
    connections,
    sharedArtists,
    sharedGenres: genre.sharedGenres.slice(0, 6),
    bridges,
    tracks,
  };
}
