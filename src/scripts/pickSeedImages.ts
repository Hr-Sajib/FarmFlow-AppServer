/**
 * `npm run seed:images -- <output-dir>` — sources the photographs the showcase
 * seeder attaches to its forum posts.
 *
 * The first attempt at this used free-text Commons search and produced, among
 * other things, a scanned 1890s American seed catalogue page for "soil hand
 * farmer agriculture texture". The post moderation caught every one of those
 * and rejected the posts, correctly — which left the forum looking broken while
 * the actual fault was upstream, in the sourcing.
 *
 * So this does two things differently. It draws from curated Commons
 * *categories* rather than relevance-ranked search, and it then shows each
 * candidate to the same vision model that moderates posts and asks whether the
 * picture actually depicts the subject. An image only gets downloaded once the
 * model that will later judge it has already agreed it matches.
 */
import fs from "fs";
import path from "path";

import { createChatCompletion } from "../app/utils/openRouter";

const UA = { "User-Agent": "FarmFlow-seed/1.0 (portfolio project)" };
const API = "https://commons.wikimedia.org/w/api.php";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Subject -> the categories to draw from, and the sentence the vision model is
 * asked to confirm. The categories are hand-picked because Commons search
 * ranks scanned books alongside photographs and cannot tell them apart.
 */
const SUBJECTS: {
  slug: string;
  categories: string[];
  mustShow: string;
}[] = [
  // The criteria below are deliberately specific. A loose one ("a photograph
  // of a rice field") let a picture of the Indo-Bangladeshi border fence
  // through on the first pass, because a fence does stand beside a field. The
  // model answers exactly the question it is asked.
  {
    slug: "rice-paddy",
    categories: ["Paddy fields in Bangladesh", "Rice paddies", "Rice fields in Asia", "Oryza sativa"],
    mustShow:
      "green rice plants filling most of the frame, growing in a flooded or wet paddy field. " +
      "The rice crop itself must be the subject",
  },
  {
    slug: "rice-harvest",
    categories: ["Rice harvesting", "Rice paddies", "Agriculture in Bangladesh", "Oryza sativa"],
    mustShow:
      "a rice crop close to harvest or being harvested — golden or ripe rice plants, cut sheaves, " +
      "or people cutting rice. The rice must be clearly visible",
  },
  {
    slug: "tomato-plant",
    categories: ["Solanum lycopersicum", "Tomato plants", "Tomato cultivation"],
    mustShow: "living tomato plants with green leaves and stems, growing",
  },
  {
    slug: "greenhouse",
    categories: ["Greenhouse interiors", "Greenhouses", "Polytunnels", "Horticulture"],
    mustShow:
      "the inside of a greenhouse or polytunnel, with rows of plants growing under the cover",
  },
  {
    slug: "chilli",
    categories: ["Capsicum annuum", "Capsicum plants", "Chili peppers"],
    mustShow:
      "a chilli or pepper plant with its leaves and preferably its fruit visible, growing on the plant",
  },
  {
    slug: "onion-field",
    categories: ["Onion harvesting", "Onion cultivation", "Allium cepa", "Onions"],
    mustShow:
      "onion bulbs — either onions growing in a field with their tops, or a quantity of harvested " +
      "onion bulbs. Not garlic, not shallots, not a market stall of mixed produce",
  },
  {
    slug: "leaf-disease",
    categories: ["Plant pathology", "Leaf spot", "Plant diseases", "Tomato diseases"],
    mustShow:
      "a close view of crop plant leaves that are visibly yellowing, spotted, blighted or diseased. " +
      "The damaged leaf must fill much of the frame",
  },
  {
    slug: "aphid-pest",
    categories: ["Aphids on plants", "Aphididae", "Insect pests of plants"],
    mustShow: "small insects clustered on a living plant leaf or stem, photographed close up",
  },
  {
    slug: "drip-irrigation",
    categories: ["Drip irrigation", "Irrigation in agriculture", "Irrigation systems"],
    mustShow:
      "drip irrigation tubing or emitters running along a row of a crop growing in the ground, " +
      "in a field or tunnel. Not potted ornamental flowers, not a sprinkler, not a canal",
  },
  {
    slug: "soil-hand",
    categories: ["Ploughing", "Soil", "Agricultural fields", "Tillage"],
    mustShow:
      "bare agricultural soil as the main subject — a ploughed or tilled field, or a close view of " +
      "loose earth. Not a scientific cross-section, not frozen or snowy ground, not a lawn",
  },
  {
    slug: "seedlings",
    categories: ["Seedlings", "Plant nurseries", "Vegetable gardening"],
    mustShow:
      "young green seedlings growing in soil, a bed or filled trays. The small plants themselves " +
      "must be visible — not empty trays, not mature plants",
  },
  {
    slug: "farmer-field",
    categories: ["Farmers of Bangladesh", "Agricultural workers", "Vegetable farming", "Agriculture in Bangladesh"],
    mustShow: "a person working among crops or on farmland, with the crops visible around them",
  },
];

/**
 * Commons carries an enormous amount of digitised print. None of it is a
 * photograph of a plant, and all of it is expensive to check with a model, so
 * the obvious cases are dropped on the filename first.
 */
const ARCHIVAL = /catalog|catalogue|engraving|lithograph|woodcut|drawing|illustration|\bplate\b|\bpage\b|\bbook\b|manuscript|herbarium|specimen|\bmap\b|diagram|poster|stamp|\bcoin\b|\blogo\b|\bseal\b|botanical|\bprint\b|\b1[5-9]\d{2}\b|painting|sketch|chart|figure|title|cover|scan/i;

type Candidate = { title: string; url: string; license: string; artist: string; page: string };

const commons = async (params: Record<string, string>) => {
  const url = API + "?" + new URLSearchParams({ format: "json", ...params });
  for (let attempt = 1; attempt <= 5; attempt++) {
    const r = await fetch(url, { headers: UA });
    if (r.status === 429) {
      await wait(attempt * 3000);
      continue;
    }
    if (!r.ok) throw new Error(`commons ${r.status}`);
    return r.json() as Promise<any>;
  }
  throw new Error("commons rate limited");
};

const strip = (s?: string) => (s ?? "").replace(/<[^>]*>/g, "").trim();

const candidatesFor = async (categories: string[]): Promise<Candidate[]> => {
  const out: Candidate[] = [];
  for (const cat of categories) {
    try {
      const j = await commons({
        action: "query",
        generator: "categorymembers",
        gcmtitle: `Category:${cat}`,
        gcmtype: "file",
        gcmlimit: "30",
        prop: "imageinfo",
        iiprop: "url|extmetadata|size|mime",
        iiurlwidth: "1200",
      });
      for (const p of Object.values<any>(j.query?.pages ?? {})) {
        const ii = p.imageinfo?.[0];
        if (!ii) continue;
        if (!/jpeg|png/.test(ii.mime ?? "")) continue;
        if ((ii.width ?? 0) < 800) continue;
        // Portrait scans are common; a landscape-ish photo also simply looks
        // better in a post card.
        if ((ii.width ?? 0) < (ii.height ?? 0)) continue;
        if (ARCHIVAL.test(p.title)) continue;
        out.push({
          title: p.title,
          url: ii.thumburl || ii.url,
          license: strip(ii.extmetadata?.LicenseShortName?.value) || "unknown",
          artist: strip(ii.extmetadata?.Artist?.value) || "unknown",
          page: ii.descriptionurl,
        });
      }
    } catch (e) {
      console.log(`    category "${cat}": ${(e as Error).message}`);
    }
    await wait(700);
  }
  return out;
};

/** Asks the vision model whether the picture really shows the subject. */
const depicts = async (imageUrl: string, mustShow: string): Promise<boolean> => {
  const raw = await createChatCompletion(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Does this image show ${mustShow}?\n\n` +
              "It must be an actual photograph. Answer no for drawings, engravings, " +
              "scanned book or catalogue pages, diagrams, maps, or anything where the " +
              "subject is not clearly visible.\n\n" +
              'Reply with strict JSON only: {"match":true} or {"match":false}',
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      } as never,
    ],
    { maxTokens: 60, temperature: 0 }
  );
  const m = raw.match(/\{[\s\S]*?\}/);
  if (!m) return false;
  try {
    return JSON.parse(m[0]).match === true;
  } catch {
    return false;
  }
};

const main = async () => {
  const out = process.argv[2];
  if (!out) throw new Error("usage: npm run seed:images -- <output-dir>");
  fs.mkdirSync(out, { recursive: true });

  const manifest: any[] = [];

  for (const s of SUBJECTS) {
    console.log(`\n${s.slug}`);
    const candidates = await candidatesFor(s.categories);
    console.log(`  ${candidates.length} candidates after filtering`);

    let chosen: Candidate | null = null;
    for (const c of candidates.slice(0, 14)) {
      try {
        const ok = await depicts(c.url, s.mustShow);
        console.log(`    ${ok ? "MATCH " : "no    "} ${c.title.replace("File:", "").slice(0, 62)}`);
        if (ok) {
          chosen = c;
          break;
        }
      } catch (e) {
        console.log(`    error  ${(e as Error).message.slice(0, 60)}`);
      }
    }

    if (!chosen) {
      console.log(`  !! nothing usable for ${s.slug}`);
      continue;
    }

    const res = await fetch(chosen.url, { headers: UA });
    const buf = Buffer.from(await res.arrayBuffer());
    const file = path.join(out, `${s.slug}.jpg`);
    fs.writeFileSync(file, buf);
    manifest.push({ slug: s.slug, ...chosen, file, bytes: buf.length });
    console.log(`  saved ${(buf.length / 1024).toFixed(0)} KB — ${chosen.license}`);
  }

  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\n${manifest.length}/${SUBJECTS.length} subjects sourced and verified`);
  for (const m of manifest) console.log(`  ${m.slug.padEnd(16)} ${m.license}`);
};

main().catch((e) => {
  console.error("\nfailed:", e);
  process.exit(1);
});
