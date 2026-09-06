import { createChatCompletion } from "../../utils/openRouter";
import { extractKeyFromUrl, getSignedReadUrl } from "../../utils/fileUpload";
import { PostModel } from "./post.model";

const IMAGE_URL_PATTERN = /\.(jpe?g|png|gif|webp)(\?|$)/i;

const SYSTEM_PROMPT = `You review posts for a Bangladeshi farming community before they are published.

Approve a post when it is a genuine contribution: a question, an observation, a
result, a photograph of a crop, soil, pest, equipment or field. Farmers write
plainly and often briefly, sometimes in Bangla or transliterated Bangla. Short
is not a reason to reject.

Reject only for: content unrelated to farming or rural life; advertising or
spam; abuse, harassment or hate; sexual content; personal data about someone
else such as a phone number or address; or an image that does not match the
text at all.

Answer with strict JSON and nothing else:
{"verdict":"pass"} or {"verdict":"fail","reason":"<one short sentence the author can act on>"}`;

/** The provider cannot fetch our own API, so an image goes as a signed link. */
const toFetchableImageUrl = async (url: string): Promise<string | null> => {
  try {
    return await getSignedReadUrl(extractKeyFromUrl(url), 600);
  } catch {
    return null;
  }
};

type Verdict = { passed: boolean; note?: string };

const parseVerdict = (raw: string): Verdict => {
  // Models wrap JSON in prose or fences often enough that the first balanced
  // object is a more reliable target than the whole string.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON in review response");

  const parsed = JSON.parse(match[0]) as { verdict?: string; reason?: string };
  if (parsed.verdict === "pass") return { passed: true };
  if (parsed.verdict === "fail") {
    return { passed: false, note: parsed.reason || "Did not meet the posting guidelines." };
  }
  throw new Error(`unexpected verdict: ${String(parsed.verdict)}`);
};

/**
 * Reviews one post and records the verdict.
 *
 * Runs after the post is already saved, so the author's writing is never lost
 * to a model outage. A failure here leaves `isPassedByAI` unset, which is the
 * "in review" state — the post stays visible to its author and invisible to
 * everyone else, which is the safe direction to fail in.
 */
export const reviewPost = async (postId: string): Promise<void> => {
  const post = await PostModel.findById(postId);
  if (!post) return;

  const parts: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: [
        `Topics: ${post.postTopics.join(", ") || "none"}`,
        post.region ? `Region: ${post.region}` : null,
        `Post: ${post.postText}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  if (post.postImage && IMAGE_URL_PATTERN.test(post.postImage)) {
    const fetchable = await toFetchableImageUrl(post.postImage);
    if (fetchable) {
      parts.push({ type: "image_url", image_url: { url: fetchable } });
    } else {
      parts.push({
        type: "text",
        text: "An image is attached but could not be loaded; judge the text alone.",
      });
    }
  }

  try {
    const raw = await createChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parts },
      ],
      { maxTokens: 200, temperature: 0 }
    );

    const verdict = parseVerdict(raw);

    await PostModel.findByIdAndUpdate(postId, {
      isPassedByAI: verdict.passed,
      reviewNote: verdict.passed ? undefined : verdict.note,
      reviewedAt: new Date(),
    });
  } catch (error) {
    // Deliberately not rethrown and deliberately not recorded as a rejection:
    // the model being unavailable says nothing about the post. It stays in
    // review and can be retried.
    console.error(
      `post review failed for ${postId}:`,
      error instanceof Error ? error.message : error
    );
  }
};
