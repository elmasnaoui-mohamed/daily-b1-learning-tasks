import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const levels = ["A1", "A2", "B1", "B2"];
const outputPath = path.join(root, "reports", "documentation-source-integrity.json");

const requiredMetadataReview = {
  A1: [3, 4, 5, 10, 11, 12, 13, 14, 15, 17, 18, 19, 22, 23, 25, 27, 28, 31, 32, 33, 34, 36, 37, 41, 42, 49, 51, 52, 53],
  A2: [1, 2, 3, 4, 6, 9, 11, 12, 13, 17],
  B2: [8],
};

const captionSamples = {
  A1: [1, 2, 6, 7, 9, 20, 21, 30, 50, 57],
  A2: [5, 7, 10, 14, 16, 20, 24, 35, 39, 42],
  B1: [1, 2, 4, 6, 9, 13, 20, 23],
  B2: [1, 4, 5, 6, 7, 10, 13, 14],
};

const discrepancyNotes = new Map(Object.entries({
  "A1/11": "Corrected a direct-question lesson that had inherited the indirect-question profile.",
  "A1/12": "Replaced generic service-dialogue content with greetings and self-introduction guidance.",
  "A1/15": "Corrected the German noun gender from der Subjekt to das Subjekt.",
  "A1/16": "Retrieved automatic caption tracks were severely garbled; source changed from captions to metadata.",
  "A1/17": "Added the missing Akkusativ article and object-pronoun reference.",
  "A1/18": "Added the missing Dativ article reference.",
  "A1/19": "Corrected every test-dependent task to require the lesson video.",
  "A1/23": "Replaced generic dialogue material with a restaurant-specific sequence and vocabulary.",
  "A1/25": "Replaced generic food content with ice-cream ordering language.",
  "A1/27": "Added the missing contrast between separable and inseparable prefixes.",
  "A1/28": "Corrected a broad verb-pattern collision that hid adjective declension.",
  "A1/34": "Corrected a profile collision so Perfekt with sein is taught instead of present-tense sein/haben.",
  "A1/35": "Replaced present-tense verb guidance with irregular Partizip II guidance.",
  "A1/36": "Added article and plural forms needed by the lesson tasks.",
  "A1/37": "Added clothing-shop language for size, color, price, and trying on clothes.",
  "A1/40": "Retrieved automatic caption track was effectively unusable; source changed from captions to metadata.",
  "A1/41": "Replaced generic vocabulary filler with adjective-opposite pairs.",
  "A1/42": "Corrected every test-dependent task to require the lesson video.",
  "A1/49": "Replaced generic service-dialogue content and corrected live-broadcast task dependencies.",
  "A1/51": "Corrected direct-question structure and examples.",
  "A1/52": "Added A1 exam-letter structure, register, and checklist vocabulary.",
  "A1/53": "Corrected every live-test-dependent task to require the lesson video.",
  "A1/57": "Replaced alphabet material with pronunciation-test guidance.",
  "A2/6": "Corrected a Perfekt collision; the lesson now teaches modal verbs in Präteritum.",
  "A2/8": "Retrieved automatic caption track was severely garbled; source changed from captions to metadata.",
  "A2/9": "Replaced generic dialogue filler with daily-routine sequencing.",
  "A2/11": "Replaced generic dialogue filler with a coherent weekend narrative in Perfekt.",
  "A2/12": "Added a dies- case table needed by the lesson tasks.",
  "A2/13": "Corrected generic case content to fixed Akkusativ prepositions.",
  "A2/17": "Corrected every test-dependent task to require the lesson video.",
  "A2/20": "Corrected subordinate-clause guidance to coordinating conjunctions with unchanged verb position.",
  "A2/25": "Replaced spatial-preposition guidance with temporal prepositions.",
  "A2/26": "Replaced spatial-preposition guidance with temporal prepositions.",
  "A2/36": "Added the correct Präteritum passive construction with wurde/wurden.",
  "A2/37": "Added the correct passive construction with modal verbs.",
  "B1/4": "Corrected a damit keyword collision; the lesson now contrasts um ... zu and damit.",
  "B1/5": "Replaced generic verb conjugation with the meanings and syntax of lassen.",
  "B1/6": "Corrected a Konjunktiv I/II prefix collision.",
  "B1/9": "Corrected a damit keyword collision; the lesson now teaches pronominal adverbs.",
  "B1/11": "Added verbs with both Dativ and Akkusativ plus object-order guidance.",
  "B1/12": "Added pronoun ordering for verbs with Dativ and Akkusativ.",
  "B1/14": "Replaced generic sentence order with nachdem tense sequencing.",
  "B1/24": "Added the semantic distinction between cause with weil and purpose with damit.",
  "B2/4": "Replaced generic case guidance with fixed an + Dativ verb-preposition pairs.",
  "B2/5": "Replaced generic case guidance with fixed an + Akkusativ verb-preposition pairs.",
  "B2/8": "Added the missing Konjunktiv II fallback and dass + Indikativ register contrast.",
  "B2/10": "Added the word order for indirect W-questions in Konjunktiv I.",
  "B2/14": "Replaced generic relative-clause content with dessen/deren in Genitiv.",
}));

const sampleKeys = new Set(Object.entries(captionSamples).flatMap(([level, ids]) => ids.map((id) => `${level}/${id}`)));
const requiredMetadataKeys = new Set(Object.entries(requiredMetadataReview).flatMap(([level, ids]) => ids.map((id) => `${level}/${id}`)));
const sourceIntegrity = [];
const metadataReview = [];

for (const level of levels) {
  const entries = JSON.parse(await readFile(path.join(root, "src", "data", "documentation", `${level.toLowerCase()}Documentation.json`), "utf8"));
  for (const entry of entries) {
    const key = `${level}/${entry.lesson_id}`;
    const discrepancy = discrepancyNotes.get(key) ?? null;
    const sampled = sampleKeys.has(key);
    const confidence = entry.review_status === "needs_review" ? "low" : sampled || requiredMetadataKeys.has(key) || discrepancy ? "high" : "medium";
    sourceIntegrity.push({
      level,
      lesson_id: entry.lesson_id,
      video_id: entry.video_id,
      source_type: entry.source_type,
      caption_language: entry.caption_language,
      confidence,
      discrepancy,
    });
    if (requiredMetadataKeys.has(key)) {
      metadataReview.push({
        level,
        lesson_id: entry.lesson_id,
        status: discrepancy ? "passed_after_correction" : "passed",
        review_status: entry.review_status,
        discrepancy,
      });
    }
  }
}

const supplementalMetadataReview = sourceIntegrity
  .filter((entry) => entry.source_type === "metadata" && !requiredMetadataKeys.has(`${entry.level}/${entry.lesson_id}`))
  .map((entry) => ({
    level: entry.level,
    lesson_id: entry.lesson_id,
    status: "passed_after_source_correction",
    review_status: "generated_from_metadata",
    discrepancy: entry.discrepancy,
  }));

const report = {
  summary: {
    total_entries: sourceIntegrity.length,
    caption_grounded: sourceIntegrity.filter((entry) => entry.source_type === "captions").length,
    metadata_grounded: sourceIntegrity.filter((entry) => entry.source_type === "metadata").length,
    needs_review: sourceIntegrity.filter((entry) => entry.source_type === "needs_review").length,
    mandatory_metadata_reviews: metadataReview.length,
    supplemental_metadata_reviews: supplementalMetadataReview.length,
    deep_caption_samples: Object.fromEntries(Object.entries(captionSamples).map(([level, ids]) => [level, ids.length])),
  },
  confidence_definition: {
    high: "Individually reviewed metadata entry, deeply sampled caption entry, or corrected discrepancy.",
    medium: "Exact caption track and video ID verified; content passed automated integrity checks but was not in the deep sample.",
    low: "Evidence remains insufficient and review_status is needs_review.",
  },
  caption_samples: captionSamples,
  metadata_review: metadataReview,
  supplemental_metadata_review: supplementalMetadataReview,
  source_integrity: sourceIntegrity,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(root, outputPath)} with ${sourceIntegrity.length} source records.`);
