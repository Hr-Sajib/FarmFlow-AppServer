/**
 * `npm run review:pending` — reviews every forum post still sitting in the
 * "in review" state.
 *
 * Moderation deliberately fails closed: if the model call errors, `isPassedByAI`
 * is left unset, so the post stays visible to its author and invisible to
 * everyone else. That is the right direction to fail in, but until now nothing
 * ever picked those posts back up — a provider hiccup meant a good post stayed
 * invisible until somebody noticed by hand. This is the retry.
 *
 * It paces itself against the same per-minute budget the API enforces, because
 * running straight at that limit is what puts posts in this state to begin
 * with.
 */
import mongoose from "mongoose";

import config from "../config";
import { PostModel } from "../app/modules/posts/post.model";
import { reviewPost } from "../app/modules/posts/post.moderation";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  await mongoose.connect(config.database_url as string);

  const pending = await PostModel.find({
    isPassedByAI: { $exists: false },
    isDeleted: false,
  })
    .select("_id postText")
    .sort({ createdAt: 1 });

  console.log(`${pending.length} post(s) awaiting review\n`);
  if (!pending.length) {
    await mongoose.disconnect();
    return;
  }

  // Leave a little headroom under the configured budget rather than pacing
  // exactly at it — the API is serving real traffic from the same allowance.
  const perMinute = Math.max(1, config.openrouter.max_requests_per_minute - 2);
  const gap = Math.ceil(60_000 / perMinute);
  console.log(`pacing at one review every ${(gap / 1000).toFixed(1)}s\n`);

  let passed = 0, failed = 0, stuck = 0;

  for (const [i, post] of pending.entries()) {
    const label = post.postText.slice(0, 54).replace(/\s+/g, " ");

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await reviewPost(post._id.toString());
        break;
      } catch {
        // reviewPost swallows its own errors, so reaching here means something
        // outside the model call failed; back off and try again.
        await wait(attempt * 20_000);
      }
    }

    const after = await PostModel.findById(post._id).select("isPassedByAI reviewNote");
    if (after?.isPassedByAI === true) { passed++; console.log(`  passed    ${label}`); }
    else if (after?.isPassedByAI === false) {
      failed++;
      console.log(`  REJECTED  ${label}`);
      if (after.reviewNote) console.log(`            ${after.reviewNote.slice(0, 100)}`);
    } else { stuck++; console.log(`  still in review  ${label}`); }

    if (i < pending.length - 1) await wait(gap);
  }

  console.log(`\npassed ${passed}, rejected ${failed}, still in review ${stuck}`);
  await mongoose.disconnect();
};

main().catch(async (e) => {
  console.error("failed:", e);
  await mongoose.disconnect();
  process.exit(1);
});
