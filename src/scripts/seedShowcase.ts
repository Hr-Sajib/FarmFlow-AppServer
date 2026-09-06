/**
 * `npm run seed:showcase -- <path-to-images>` — fills a deployed database with
 * enough coherent activity that someone opening the site finds a working
 * platform rather than empty states.
 *
 * Unlike the development fixtures in devSeedPeople.ts, this is meant to run
 * against the deployed database, so it is written to be safe there:
 *
 *  - Everything it creates is owned by an account whose email ends in
 *    `@farmflow.demo`. That is the only marker it uses, and it is the only
 *    thing it will ever delete, so a re-run replaces its own output and cannot
 *    touch a real account, the existing demo accounts, or the field telemetry
 *    that has been accumulating from the hardware.
 *  - Timestamps are spread across the last five months. The admin dashboard
 *    draws month-over-month growth, and every document sharing one createdAt
 *    renders as a single spike with a flat line either side.
 *  - Forum posts are put through the real moderation call rather than having
 *    `isPassedByAI` set by hand. A seeded verdict would be a lie about the one
 *    feature most worth demonstrating, and the deliberately bad post below only
 *    proves anything if a model actually rejects it.
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import config from "../config";
import { UserModel } from "../app/modules/user/user.model";
import { FieldModel } from "../app/modules/fields/fields.model";
import { PostModel } from "../app/modules/posts/post.model";
import { FollowModel } from "../app/modules/follow/follow.model";
import { AdvisorySessionModel } from "../app/modules/advisorySession/advisorySession.model";
import { uploadMultipleFilesToS3 } from "../app/utils/fileUpload";
import { reviewPost } from "../app/modules/posts/post.moderation";
import { generateUserCode, generateFieldId } from "../app/utils/generateIds";

const DEMO_DOMAIN = "@farmflow.demo";
const DEMO_PASSWORD = "FarmflowDemo1*";

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
/** Days back from today, as a Date. */
const daysAgo = (d: number) => new Date(now - d * DAY);

/**
 * Backdates a document.
 *
 * This goes through the native driver rather than the model. `updateOne` with
 * `{ timestamps: false }` looks like it should work and silently does not —
 * every seeded record came out stamped with the day the seeder ran, which
 * collapsed five months of growth on the admin charts into one vertical spike.
 * `.collection` bypasses the timestamp plugin entirely, which is the only way
 * to actually own these two fields.
 */
const backdate = async (
  model: mongoose.Model<any>,
  id: mongoose.Types.ObjectId,
  createdAt: Date
) => {
  await model.collection.updateOne(
    { _id: id },
    { $set: { createdAt, updatedAt: createdAt } }
  );
};

/**
 * Re-applies the timestamps above to records that already exist, so a dating
 * mistake can be corrected without deleting the forum and paying for every
 * moderation call a second time. Matches on the same natural keys the tables
 * above are written with.
 */
const redateOnly = async () => {
  let n = 0;
  for (const p of PEOPLE) {
    const u = await UserModel.findOne({ email: `${p.key}${DEMO_DOMAIN}` }).select("_id userCode");
    if (!u) continue;
    await backdate(UserModel, u._id as mongoose.Types.ObjectId, daysAgo(p.joinedDaysAgo));
    n++;
  }
  for (const f of FIELDS) {
    const d = await FieldModel.findOne({ fieldName: f.fieldName }).select("_id");
    if (!d) continue;
    await backdate(FieldModel, d._id as mongoose.Types.ObjectId, daysAgo(f.createdDaysAgo));
    n++;
  }
  for (const p of POSTS) {
    const d = await PostModel.findOne({ postText: p.text }).select("_id");
    if (!d) continue;
    await backdate(PostModel, d._id as mongoose.Types.ObjectId, daysAgo(p.daysAgo));
    n++;
  }
  for (const s of SESSIONS) {
    const d = await AdvisorySessionModel.findOne({ problemStatement: s.problem }).select("_id");
    if (!d) continue;
    await backdate(AdvisorySessionModel, d._id as mongoose.Types.ObjectId, daysAgo(s.daysAgo));
    n++;
  }
  console.log(`redated ${n} documents`);
};

const pick = <T>(arr: T[], i: number): T => arr[i % arr.length];

// ---------------------------------------------------------------- people ---

type SeedPerson = {
  key: string;
  fullName: string;
  address: string;
  role: "farmer" | "expert";
  photo?: string;
  joinedDaysAgo: number;
  expertStatus?: "pending" | "verified";
  designations?: { designationTitle: string; designatedFrom: string; isApproved: boolean }[];
};

const PEOPLE: SeedPerson[] = [
  { key: "shahnaz", fullName: "Shahnaz Begum", address: "Jhenaidah, Khulna", role: "farmer", joinedDaysAgo: 148 },
  { key: "abdul", fullName: "Abdul Karim", address: "Bogura, Rajshahi", role: "farmer", joinedDaysAgo: 132 },
  { key: "moni", fullName: "Monirul Islam", address: "Jashore, Khulna", role: "farmer", joinedDaysAgo: 119 },
  { key: "rehana", fullName: "Rehana Akter", address: "Cumilla, Chattogram", role: "farmer", joinedDaysAgo: 96 },
  { key: "jashim", fullName: "Jashim Uddin", address: "Rangpur Sadar, Rangpur", role: "farmer", joinedDaysAgo: 74 },
  { key: "nasrin", fullName: "Nasrin Sultana", address: "Satkhira, Khulna", role: "farmer", joinedDaysAgo: 51 },
  { key: "babul", fullName: "Babul Mia", address: "Mymensingh Sadar, Mymensingh", role: "farmer", joinedDaysAgo: 33 },
  { key: "shefali", fullName: "Shefali Khatun", address: "Narsingdi, Dhaka", role: "farmer", joinedDaysAgo: 12 },
  {
    key: "anwar",
    fullName: "Dr Anwar Hossain",
    address: "Bangladesh Agricultural University, Mymensingh",
    role: "expert",
    joinedDaysAgo: 141,
    expertStatus: "verified",
    designations: [
      { designationTitle: "Professor, Department of Horticulture", designatedFrom: "Bangladesh Agricultural University", isApproved: true },
      { designationTitle: "Certified Plant Pathologist", designatedFrom: "Bangladesh Society of Plant Pathology", isApproved: true },
    ],
  },
  {
    key: "tanvir",
    fullName: "Tanvir Ahmed",
    address: "Gazipur, Dhaka",
    role: "expert",
    joinedDaysAgo: 88,
    expertStatus: "verified",
    designations: [
      { designationTitle: "Senior Scientific Officer, Soil Science", designatedFrom: "Bangladesh Agricultural Research Institute", isApproved: true },
    ],
  },
  {
    key: "roksana",
    fullName: "Roksana Parvin",
    address: "Khulna Sadar, Khulna",
    role: "expert",
    joinedDaysAgo: 21,
    // Deliberately unapproved: the admin verification queue needs something in
    // it, or that screen demos as an empty table.
    expertStatus: "pending",
    designations: [
      { designationTitle: "Agricultural Extension Officer", designatedFrom: "Department of Agricultural Extension", isApproved: false },
    ],
  },
];

// ---------------------------------------------------------------- fields ---

const FIELDS: {
  owner: string;
  fieldName: string;
  fieldCrop: string;
  environmentType: "open_field" | "greenhouse" | "net_house";
  soilType: "clay" | "loam" | "sandy" | "silt" | "peat" | "chalk" | "saline";
  sizeAcres: number;
  lat: number;
  lon: number;
  region: string;
  image: string;
  createdDaysAgo: number;
}[] = [
  { owner: "shahnaz", fieldName: "Boro Plot North", fieldCrop: "Rice", environmentType: "open_field", soilType: "clay", sizeAcres: 2.4, lat: 23.5448, lon: 89.1539, region: "khulna", image: "rice-paddy", createdDaysAgo: 140 },
  { owner: "shahnaz", fieldName: "Polyhouse 01", fieldCrop: "Tomato", environmentType: "greenhouse", soilType: "loam", sizeAcres: 0.3, lat: 23.5461, lon: 89.1502, region: "khulna", image: "greenhouse-fallback", createdDaysAgo: 96 },
  { owner: "abdul", fieldName: "Onion Block A", fieldCrop: "Onion", environmentType: "open_field", soilType: "sandy", sizeAcres: 1.8, lat: 24.8465, lon: 89.3773, region: "rajshahi", image: "onion-field", createdDaysAgo: 128 },
  { owner: "moni", fieldName: "Chilli Net House", fieldCrop: "Chilli", environmentType: "net_house", soilType: "loam", sizeAcres: 0.5, lat: 23.1664, lon: 89.2081, region: "khulna", image: "chilli", createdDaysAgo: 110 },
  { owner: "rehana", fieldName: "Homestead Vegetables", fieldCrop: "Vegetables", environmentType: "open_field", soilType: "silt", sizeAcres: 0.9, lat: 23.4607, lon: 91.1809, region: "chattogram", image: "farmer-field", createdDaysAgo: 90 },
  { owner: "jashim", fieldName: "Seedling Nursery", fieldCrop: "Vegetables", environmentType: "net_house", soilType: "loam", sizeAcres: 0.2, lat: 25.7439, lon: 89.2752, region: "rangpur", image: "seedlings", createdDaysAgo: 70 },
  { owner: "nasrin", fieldName: "Coastal Plot 02", fieldCrop: "Rice", environmentType: "open_field", soilType: "saline", sizeAcres: 1.5, lat: 22.7185, lon: 89.0705, region: "khulna", image: "rice-harvest", createdDaysAgo: 48 },
  { owner: "babul", fieldName: "Drip Trial Field", fieldCrop: "Tomato", environmentType: "open_field", soilType: "loam", sizeAcres: 1.1, lat: 24.7471, lon: 90.4203, region: "mymensingh", image: "drip-irrigation", createdDaysAgo: 30 },
  { owner: "shefali", fieldName: "Winter Vegetable Plot", fieldCrop: "Vegetables", environmentType: "open_field", soilType: "loam", sizeAcres: 0.7, lat: 23.9322, lon: 90.7151, region: "dhaka", image: "soil-hand", createdDaysAgo: 10 },
];

// ----------------------------------------------------------------- posts ---

const POSTS: {
  author: string;
  text: string;
  image?: string;
  topics: string[];
  region?: string;
  daysAgo: number;
  comments?: { by: string; text: string }[];
  likes?: string[];
  resolved?: boolean;
}[] = [
  {
    author: "shahnaz",
    text:
      "Third week of flowering in the polyhouse and the lower leaves on about a fifth of my tomato plants are yellowing from the edge inward. Soil moisture has been steady around 38 percent and I have not changed the feed. Is this nitrogen or the start of something worse? Photo is from this morning.",
    image: "leaf-disease",
    topics: ["tomato", "disease", "greenhouse"],
    region: "khulna",
    daysAgo: 41,
    comments: [
      { by: "anwar", text: "That pattern — oldest leaves first, yellowing from the margin toward the midrib while the veins stay green — reads as nitrogen deficiency rather than disease. Blight starts as dark irregular patches, usually after a humid night, and it does not respect leaf age. Check the runoff EC before you add anything; if it is high, the nitrogen is present and the roots simply cannot take it up." },
      { by: "moni", text: "Had exactly this last season and it was the EC. Flushed the beds and the new growth came back green in about ten days." },
      { by: "shahnaz", text: "Runoff EC was 3.1. Flushed twice and the new leaves are already better. Thank you both." },
    ],
    likes: ["moni", "abdul", "rehana", "jashim"],
    resolved: true,
  },
  {
    author: "nasrin",
    text:
      "For anyone farming near the coast: my plot sits about four kilometres from the river and salinity climbs every year in the dry season. This season I raised the beds by nine inches and mulched heavily with rice straw before transplanting. Yield is not back to where it was in 2022 but the seedling loss went from roughly a third down to under one in ten. Sharing in case it helps someone on the same ground.",
    image: "rice-harvest",
    topics: ["rice", "salinity", "mulching"],
    region: "khulna",
    daysAgo: 34,
    comments: [
      { by: "tanvir", text: "Raised beds plus straw mulch is the right combination — the beds keep the root zone above the capillary rise and the mulch cuts evaporation, which is what concentrates salt at the surface. If you can get gypsum locally, applying it before the monsoon helps displace sodium while there is rain to leach it." },
      { by: "abdul", text: "How much straw per decimal did you use?" },
      { by: "nasrin", text: "Roughly forty kg per decimal, laid thick enough that I could not see soil through it." },
    ],
    likes: ["shahnaz", "tanvir", "babul", "shefali", "moni"],
  },
  {
    author: "abdul",
    text:
      "Onion storage question. I harvested about nine maunds three weeks ago and cured them in the shade for twelve days before moving them into the store room. Since then I have lost maybe a maund to soft rot at the neck. The store room has a tin roof and gets hot in the afternoon. Is it the curing or the storage?",
    image: "onion-field",
    topics: ["onion", "storage", "harvest"],
    region: "rajshahi",
    daysAgo: 27,
    comments: [
      { by: "anwar", text: "Neck rot usually traces back to curing, not storage — if the necks were not fully dry and tight when they went in, the fungus is already inside and heat only speeds it up. Twelve days in shade is short for a humid month. Next season cure until the necks are papery and will not bruise under a thumbnail, then store, and get some cross-ventilation under that tin roof." },
    ],
    likes: ["shahnaz", "jashim"],
  },
  {
    author: "tanvir",
    text:
      "A note on soil test results, because I am asked this most weeks. A pH reading on its own tells you very little about what to add. Organic matter percentage is what determines how long any correction lasts — below about one percent, lime or gypsum washes through within a season and you are back where you started. If you can only afford one number from the lab, ask for organic matter, not pH.",
    topics: ["soil", "nutrient", "fertilizer"],
    daysAgo: 22,
    comments: [
      { by: "shahnaz", text: "Nobody has ever explained it that way to me. The extension office only ever reports pH." },
      { by: "babul", text: "Where can we get organic matter tested? The district lab quoted a long wait." },
      { by: "tanvir", text: "BARI regional stations do it, and some private labs in Dhaka turn it around in a week. Worth the wait either way." },
    ],
    likes: ["anwar", "shahnaz", "nasrin", "rehana", "moni", "abdul"],
  },
  {
    author: "moni",
    text:
      "Aphids on the chilli in the net house, mostly on the growing tips and the undersides of the young leaves. I do not want to spray a broad insecticide because the ladybirds have been doing good work all season. Has anyone had luck with a soap spray at this stage, and how often?",
    image: "aphid-pest",
    topics: ["vegetables", "insect", "pest"],
    region: "khulna",
    daysAgo: 18,
    comments: [
      { by: "anwar", text: "Soft soap at roughly one percent, sprayed in the evening so it does not burn in sun, and repeated every four days for three rounds. It only kills on contact, so cover the leaf undersides properly. It will not harm the ladybird adults if you avoid spraying them directly, and it leaves no residue that stops them coming back." },
      { by: "rehana", text: "Neem oil worked for me but the smell stayed on the fruit for days. Soap is cleaner." },
    ],
    likes: ["rehana", "shahnaz", "shefali"],
  },
  {
    author: "babul",
    text:
      "Two months into a drip trial on a bigha of tomato, next to a plot I am still furrow irrigating for comparison. Water use is down by a bit over half. What surprised me is the weeds — the dry ground between the rows has almost nothing growing on it, so I have weeded twice instead of five times. The labour saving may end up mattering more than the water.",
    image: "drip-irrigation",
    topics: ["irrigation", "tomato", "weed", "technology"],
    region: "mymensingh",
    daysAgo: 14,
    comments: [
      { by: "jashim", text: "What did the system cost you per bigha, installed?" },
      { by: "babul", text: "Around 18,000 taka including the filter and the tank stand. I expect to make it back in two seasons on labour alone." },
      { by: "tanvir", text: "This matches the trial data — the weed suppression is consistently undervalued when people cost drip out. Worth reporting your numbers to the extension office at the end of the season." },
    ],
    likes: ["tanvir", "moni", "shahnaz", "abdul", "nasrin"],
  },
  {
    author: "rehana",
    text:
      "First time growing anything under net and I do not know what I am looking at. The seedlings came up fine and then stopped — they have been the same size for nine days. Leaves look healthy, no spots, no insects I can find. Am I overwatering? The bed feels damp most of the time.",
    image: "seedlings",
    topics: ["seed", "vegetables", "irrigation"],
    region: "chattogram",
    daysAgo: 9,
    comments: [
      { by: "anwar", text: "Constantly damp is usually the problem rather than the amount. Roots need air as much as water, and a bed that never dries slightly between waterings will stall growth exactly like this while the leaves stay green. Let the top inch dry before you water again and see if they move within a week." },
    ],
    likes: ["shahnaz", "nasrin"],
  },
  {
    author: "jashim",
    text:
      "Selling seedlings from the nursery this month — tomato, brinjal and cabbage, all from BARI seed, hardened off for a week before they leave. Anyone in Rangpur who wants a look is welcome to come by. I would rather they go to people nearby than sit in trays.",
    image: "seedlings",
    topics: ["seed", "market", "vegetables"],
    region: "rangpur",
    daysAgo: 6,
    likes: ["babul", "shefali"],
  },
  {
    author: "shefali",
    text:
      "Starting my first winter vegetable plot on land that grew rice for as long as anyone remembers. The soil is heavy and cracks when it dries. I have added cow dung but I do not know how much is enough or whether I should be doing something else before planting. Any advice from people who have converted paddy land is very welcome.",
    // Deliberately text-only. The best soil photograph Commons offered was a
    // tractor ploughing a very large field, and the moderation model rejected
    // the pairing as a mismatch with a post about a first small plot — which
    // was the right call, so the post loses the picture rather than the review
    // losing its teeth.
    topics: ["soil", "vegetables", "organic"],
    region: "dhaka",
    daysAgo: 3,
    comments: [
      { by: "tanvir", text: "Paddy land is puddled deliberately — years of standing water compact a layer under the surface that vegetable roots will not get through. Break that pan before you worry about nutrition. One deep pass with a chisel plough when the soil is dry enough to crack does more than any amount of dung on top of it." },
      { by: "shahnaz", text: "This was my first season problem too. The chisel plough made the difference." },
    ],
    likes: ["tanvir", "shahnaz", "rehana"],
  },
  {
    // Present on purpose. The moderation gate is the feature worth showing, and
    // it demonstrates nothing without something for it to actually reject.
    author: "shefali",
    text:
      "!!! LIMITED OFFER !!! Buy cheap smartphones and branded watches at wholesale price, direct import, no tax. WhatsApp me on the number in my profile for the price list. Fast delivery all over Bangladesh. Best deal guaranteed, do not miss!!!",
    topics: ["market"],
    daysAgo: 2,
  },
];

// -------------------------------------------------------------- advisory ---

const SESSIONS: {
  farmer: string;
  problem: string;
  details?: string;
  status: "ai_active" | "awaiting_expert" | "expert_active" | "resolved";
  expert?: string;
  daysAgo: number;
  chat: { role: "farmer" | "ai" | "expert"; by?: string; text: string }[];
  rating?: number;
  feedback?: string;
}[] = [
  {
    farmer: "shahnaz",
    problem: "Tomato leaves yellowing in the polyhouse",
    details: "Lower leaves on roughly a fifth of the plants, third week of flowering.",
    status: "resolved",
    expert: "anwar",
    daysAgo: 40,
    rating: 5,
    feedback: "Explained clearly and the fix worked within two weeks.",
    chat: [
      { role: "farmer", by: "shahnaz", text: "My tomato plants are turning yellow on the bottom leaves. Soil moisture is 38 percent and I have not changed anything." },
      { role: "ai", text: "Yellowing that starts on the oldest leaves and moves inward from the leaf margin, with the veins staying green, most often means nitrogen is unavailable rather than absent. Your reading of 38 percent soil moisture is adequate for flowering tomato, so uptake rather than watering is the likelier problem. Before adding fertiliser, measure the electrical conductivity of the runoff: a high reading means salts have accumulated and the roots cannot draw nitrogen through them, and feeding more would make it worse. If the reading is low, a light nitrogen application is reasonable." },
      { role: "farmer", by: "shahnaz", text: "I do not have an EC meter. Can I tell any other way? And should I ask someone who can look at it properly?" },
      { role: "expert", by: "anwar", text: "Without a meter, look at the surface of the growing medium — a whitish crust at the edges of the bed is salt accumulation and tells you the same thing. Flush with roughly twice the usual volume of clean water, twice, three days apart, and hold off all feed until the new growth greens up. If the newest leaves stay green and only the old ones are affected, you are already past the worst of it." },
      { role: "farmer", by: "shahnaz", text: "There was a white crust. I flushed twice and the new leaves are green. Thank you." },
    ],
  },
  {
    farmer: "abdul",
    problem: "Onions rotting at the neck in storage",
    details: "About a maund lost in three weeks. Tin-roofed store room.",
    status: "resolved",
    expert: "demoExpert",
    daysAgo: 25,
    rating: 4,
    feedback: "Helpful, though I wish I had asked before harvest rather than after.",
    chat: [
      { role: "farmer", by: "abdul", text: "I am losing onions to rot at the neck since putting them in store three weeks ago." },
      { role: "ai", text: "Neck rot in stored onion is usually established before storage rather than during it. The fungus enters through the neck tissue while it is still soft and only becomes visible once temperature and humidity rise. Twelve days of shade curing is on the short side for a humid month: the necks need to be dry and papery, tight enough that they do not bruise under a thumbnail. Given the loss has already started, sort the remaining bulbs now and separate any with a soft neck, because they will spread it." },
      { role: "expert", by: "anwar", text: "Agreed on the curing. The tin roof matters too — sorting will stop the immediate loss, but without cross-ventilation the store will sit well above ambient every afternoon and the rot will keep moving. Even opening a gap at both gable ends would change the picture for next season." },
    ],
  },
  {
    farmer: "moni",
    problem: "Aphids on chilli, want to avoid broad-spectrum spray",
    status: "expert_active",
    expert: "demoExpert",
    daysAgo: 16,
    chat: [
      { role: "farmer", by: "moni", text: "Aphids on my chilli growing tips. I do not want to kill the ladybirds. What can I use?" },
      { role: "ai", text: "A soft soap solution at about one percent is the usual choice where beneficial insects matter. It kills on contact by disrupting the aphid cuticle and leaves no persistent residue, so ladybirds returning after the spray dries are unaffected. Apply in the evening to avoid leaf scorch, cover the undersides of leaves where aphids cluster, and repeat every four days for three applications — a single pass always misses eggs." },
      { role: "farmer", by: "moni", text: "How do I know if it is working, and what do I do if it is not?" },
      { role: "expert", by: "demoExpert", text: "Check the growing tips two days after each round. Falling numbers mean it is working even if some remain. If the population is unchanged after two rounds, look for ants farming them — ants will protect aphids from predators and re-seed a cleaned plant. In that case you have to deal with the ant trail first, and a sticky band at the base of the stem is usually enough." },
    ],
  },
  {
    farmer: "nasrin",
    problem: "Salinity rising every dry season on a coastal plot",
    status: "awaiting_expert",
    daysAgo: 11,
    chat: [
      { role: "farmer", by: "nasrin", text: "My soil gets saltier every dry season. Raised beds and mulch helped but I want to know what else is worth trying." },
      { role: "ai", text: "Raised beds and mulch address the two mechanisms that matter most — keeping the root zone above capillary rise, and slowing the evaporation that concentrates salt at the surface — so you have already done the high-value work. Beyond that, gypsum applied before the monsoon displaces sodium from the soil exchange sites while there is enough rain to carry it below the root zone; the timing is what makes it work, and applying it in the dry season achieves very little. Choosing a salt-tolerant variety such as BRRI dhan67 for the boro season is the other common step. Both are worth discussing with someone who knows your specific ground, so I have flagged this for an expert." },
    ],
  },
  {
    farmer: "rehana",
    problem: "Seedlings stopped growing under net",
    status: "ai_active",
    daysAgo: 8,
    chat: [
      { role: "farmer", by: "rehana", text: "My seedlings came up and then stopped growing. Nine days at the same size. Leaves look fine." },
      { role: "ai", text: "Healthy-looking leaves with stalled growth usually points at the root zone rather than the foliage, and a bed that stays damp most of the time is the most common cause. Roots need air as well as water; in continuously saturated media the oxygen available to them falls far enough to halt growth without producing any visible leaf symptom. Let the top inch of the bed dry before watering again and give it a week. If there is no change, lift one seedling and look at the roots — healthy ones are white and firm, while brown and soft roots would point to rot rather than watering." },
    ],
  },
  {
    farmer: "babul",
    problem: "How often to run drip during flowering",
    status: "ai_active",
    daysAgo: 4,
    chat: [
      { role: "farmer", by: "babul", text: "I have drip on tomato for the first time. How long should I run it during flowering, and how often?" },
      { role: "ai", text: "Duration matters less than what the soil actually holds, and on the loam you have described a useful starting point is two runs a day of around forty minutes each in the flowering period, morning and late afternoon. Then check by digging beside an emitter an hour after a run: the wet zone should reach roughly twenty centimetres deep and spread about the same across. Deeper than that is water going past the roots, and shallower means the plants will be short during fruit set, which is when inconsistent watering causes blossom end rot." },
    ],
  },
];

// ------------------------------------------------------------------ main ---

const main = async () => {
  const imageDir = process.argv[2];
  if (!process.argv.includes("--dates-only") && (!imageDir || !fs.existsSync(imageDir))) {
    throw new Error(
      "Pass the directory holding the seed images: npm run seed:showcase -- ./images"
    );
  }

  await mongoose.connect(config.database_url as string);
  console.log("connected\n");

  if (process.argv.includes("--dates-only")) {
    await redateOnly();
    await mongoose.disconnect();
    return;
  }

  // -- clean up a previous run, and nothing else ---------------------------
  const previous = await UserModel.find({
    email: { $regex: `${DEMO_DOMAIN.replace(".", "\\.")}$` },
  }).select("_id userCode");

  if (previous.length) {
    const codes = previous.map((u) => u.userCode);
    const ids = previous.map((u) => u._id);
    const removed = {
      posts: (await PostModel.deleteMany({ creatorId: { $in: ids } })).deletedCount,
      fields: (await FieldModel.deleteMany({ farmerId: { $in: codes } })).deletedCount,
      sessions: (await AdvisorySessionModel.deleteMany({ farmerId: { $in: codes } })).deletedCount,
      follows: (
        await FollowModel.deleteMany({
          $or: [{ followerCode: { $in: codes } }, { followingCode: { $in: codes } }],
        })
      ).deletedCount,
      users: (await UserModel.deleteMany({ _id: { $in: ids } })).deletedCount,
    };
    console.log("removed previous showcase data:", removed, "\n");
  }

  // -- images ------------------------------------------------------------
  const files = fs
    .readdirSync(imageDir)
    .filter((f) => f.endsWith(".jpg"))
    .map((f) => ({
      fieldname: "files",
      originalname: f,
      encoding: "7bit",
      mimetype: "image/jpeg",
      buffer: fs.readFileSync(path.join(imageDir, f)),
      size: fs.statSync(path.join(imageDir, f)).size,
    })) as unknown as Express.Multer.File[];

  console.log(`uploading ${files.length} images through the normal upload path...`);
  const uploaded = await uploadMultipleFilesToS3(files, "posts/showcase");
  const img: Record<string, string> = {};
  files.forEach((f, i) => {
    img[path.basename(f.originalname, ".jpg")] = uploaded[i].url;
  });
  // One field references an image the search could not find; fall back rather
  // than leaving a card with a broken picture.
  img["greenhouse-fallback"] = img["tomato-plant"] ?? Object.values(img)[0];
  console.log(`  ${uploaded.length} stored\n`);

  // -- people ------------------------------------------------------------
  const codeOf: Record<string, string> = {};
  const idOf: Record<string, mongoose.Types.ObjectId> = {};

  for (const p of PEOPLE) {
    const userCode = await generateUserCode(p.role);
    const doc = new UserModel({
      fullName: p.fullName,
      email: `${p.key}${DEMO_DOMAIN}`,
      password: DEMO_PASSWORD,
      address: p.address,
      role: p.role,
      userCode,
      photo: p.photo,
      ...(p.expertStatus ? { expertStatus: p.expertStatus } : {}),
      ...(p.designations ? { designations: p.designations } : {}),
    });
    await doc.save();
    await backdate(UserModel, doc._id as mongoose.Types.ObjectId, daysAgo(p.joinedDaysAgo));
    codeOf[p.key] = userCode;
    idOf[p.key] = doc._id as mongoose.Types.ObjectId;
    console.log(`  user  ${p.role.padEnd(6)} ${p.fullName}`);
  }

  // The pre-existing demo farmer owns the real telemetry, so the social graph
  // should include them rather than growing beside them.
  const demoFarmer = await UserModel.findOne({ role: "farmer", isDemo: true }).select("_id userCode fullName");
  if (demoFarmer) {
    codeOf["demo"] = demoFarmer.userCode;
    idOf["demo"] = demoFarmer._id as mongoose.Types.ObjectId;
    console.log(`  linked existing demo farmer ${demoFarmer.fullName}`);
  }

  /**
   * The demo expert matters more than any seeded one: it is the account a
   * visitor actually signs into from the landing page, and an expert dashboard
   * reporting zero advisories and zero followers reads as a broken feature
   * rather than a new account. Sessions marked `demoExpert` below are assigned
   * here so that dashboard has real work on it.
   */
  const demoExpert = await UserModel.findOne({ role: "expert", isDemo: true }).select("_id userCode fullName");
  if (demoExpert) {
    codeOf["demoExpert"] = demoExpert.userCode;
    idOf["demoExpert"] = demoExpert._id as mongoose.Types.ObjectId;
    console.log(`  linked existing demo expert ${demoExpert.fullName}`);
  }
  console.log();

  // -- fields ------------------------------------------------------------
  for (const f of FIELDS) {
    const doc = await FieldModel.create({
      fieldId: await generateFieldId(),
      fieldName: f.fieldName,
      fieldImage: img[f.image],
      fieldCrop: f.fieldCrop,
      fieldLocation: { latitude: f.lat, longitude: f.lon },
      fieldSizeInAcres: f.sizeAcres,
      soilType: f.soilType,
      environmentType: f.environmentType,
      farmerId: codeOf[f.owner],
      region: f.region,
      fieldStatus: "active",
      isMotorOn: false,
      isShadeOn: false,
      isDeleted: false,
    });
    await backdate(FieldModel, doc._id as mongoose.Types.ObjectId, daysAgo(f.createdDaysAgo));
    console.log(`  field ${f.fieldName} (${f.fieldCrop})`);
  }
  console.log();

  // -- follows -----------------------------------------------------------
  const experts = [
    ...PEOPLE.filter((p) => p.role === "expert").map((p) => p.key),
    ...(demoExpert ? ["demoExpert"] : []),
  ];
  const farmers = PEOPLE.filter((p) => p.role === "farmer").map((p) => p.key);
  const edges = new Set<string>();

  // Everyone follows the verified experts; that is what a real advisory
  // community looks like, and it gives the expert profiles a follower count.
  for (const f of [...farmers, ...(demoFarmer ? ["demo"] : [])]) {
    for (const e of experts) edges.add(`${codeOf[f]}|${codeOf[e]}`);
  }
  // Farmers follow a couple of neighbours each, so the graph is not a star.
  farmers.forEach((f, i) => {
    edges.add(`${codeOf[f]}|${codeOf[pick(farmers, i + 1)]}`);
    edges.add(`${codeOf[f]}|${codeOf[pick(farmers, i + 3)]}`);
    if (demoFarmer) edges.add(`${codeOf[f]}|${codeOf["demo"]}`);
  });
  // Experts follow back the farmers they have actually answered.
  for (const s of SESSIONS) if (s.expert) edges.add(`${codeOf[s.expert]}|${codeOf[s.farmer]}`);

  let follows = 0;
  for (const e of edges) {
    const [followerCode, followingCode] = e.split("|");
    if (!followerCode || !followingCode || followerCode === followingCode) continue;
    try {
      await FollowModel.create({ followerCode, followingCode });
      follows++;
    } catch {
      /* the unique index makes a duplicate a no-op, which is the point of it */
    }
  }
  console.log(`  ${follows} follow edges\n`);

  // -- posts -------------------------------------------------------------
  const created: { id: mongoose.Types.ObjectId; label: string }[] = [];

  for (const p of POSTS) {
    const author = PEOPLE.find((x) => x.key === p.author)!;
    const doc = await PostModel.create({
      creatorId: idOf[p.author],
      creatorRole: author.role,
      postText: p.text,
      ...(p.image ? { postImage: img[p.image] } : {}),
      postTopics: p.topics,
      ...(p.region ? { region: p.region } : {}),
      reactions: { likes: (p.likes ?? []).map((k) => idOf[k]).filter(Boolean), dislikes: [] },
      comments: (p.comments ?? []).map((c) => ({
        commenterId: idOf[c.by],
        commenterRole:
          c.by === "demoExpert" ? "expert" : c.by === "demo" ? "farmer" : PEOPLE.find((x) => x.key === c.by)!.role,
        commentText: c.text,
      })),
      isResolved: !!p.resolved,
    });
    await backdate(PostModel, doc._id as mongoose.Types.ObjectId, daysAgo(p.daysAgo));
    created.push({ id: doc._id as mongoose.Types.ObjectId, label: p.text.slice(0, 52) });
    console.log(`  post  ${p.text.slice(0, 60).replace(/\n/g, " ")}...`);
  }
  console.log();

  // -- real moderation verdicts -----------------------------------------
  console.log("running the real AI review on each post...");
  for (const c of created) {
    try {
      await reviewPost(c.id.toString());
      const after = await PostModel.findById(c.id).select("isPassedByAI reviewNote");
      const verdict =
        after?.isPassedByAI === true ? "passed" :
        after?.isPassedByAI === false ? "REJECTED" : "left in review";
      console.log(`  ${verdict.padEnd(14)} ${c.label}...`);
      if (after?.isPassedByAI === false && after.reviewNote) {
        console.log(`                 reason: ${after.reviewNote.slice(0, 110)}`);
      }
    } catch (e) {
      console.log(`  review failed  ${c.label}... (${(e as Error).message.slice(0, 80)})`);
    }
  }
  console.log();

  // -- advisory sessions -------------------------------------------------
  for (const s of SESSIONS) {
    const base = daysAgo(s.daysAgo).getTime();
    const doc = await AdvisorySessionModel.create({
      farmerId: codeOf[s.farmer],
      problemStatement: s.problem,
      ...(s.details ? { problemDetails: s.details } : {}),
      attachedMediaUrls: [],
      status: s.status,
      ...(s.expert ? { expertId: codeOf[s.expert] } : {}),
      chatHistory: s.chat.map((m, i) => ({
        senderRole: m.role,
        ...(m.by ? { senderId: codeOf[m.by] } : {}),
        messageType: "text",
        messageContent: m.text,
        // Spread the turns across the session's day so a transcript reads as a
        // conversation rather than as a dozen messages sharing one timestamp.
        sentAt: new Date(base + i * 11 * 60 * 1000),
      })),
      summarizedMessageCount: 0,
      ...(s.feedback ? { feedbackText: s.feedback } : {}),
      ...(s.rating ? { feedbackStarCount: s.rating } : {}),
      ...(s.status === "resolved" ? { resolvedAt: new Date(base + 2 * DAY) } : {}),
      isDeleted: false,
    });
    await backdate(AdvisorySessionModel, doc._id as mongoose.Types.ObjectId, daysAgo(s.daysAgo));
    console.log(`  session [${s.status}] ${s.problem}`);
  }

  // -- summary -----------------------------------------------------------
  console.log("\n--- database now holds ---");
  console.log("  users    ", await UserModel.countDocuments({ isDeleted: false }));
  console.log("  fields   ", await FieldModel.countDocuments({ isDeleted: false }));
  console.log("  posts    ", await PostModel.countDocuments({ isDeleted: false }));
  console.log("    passed ", await PostModel.countDocuments({ isPassedByAI: true, isDeleted: false }));
  console.log("    held   ", await PostModel.countDocuments({ isPassedByAI: false, isDeleted: false }));
  console.log("  sessions ", await AdvisorySessionModel.countDocuments({ isDeleted: false }));
  console.log("  follows  ", await FollowModel.countDocuments());

  await mongoose.disconnect();
};

main().catch(async (e) => {
  console.error("\nseed failed:", e);
  await mongoose.disconnect();
  process.exit(1);
});
