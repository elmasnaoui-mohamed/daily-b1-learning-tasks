import { open, readFile, rename, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const level = String(args.get("--level") ?? "B2").toUpperCase();
const lessonId = Number(args.get("--lesson") ?? 9);
const fixturePath = path.resolve(root, args.get("--fixture") ?? `scripts/fixtures/${level.toLowerCase()}-${lessonId}-evidence.json`);
const outputPath = path.join(root, "src", "data", "documentation", `${level.toLowerCase()}Documentation.json`);
const lessonsPath = path.join(root, "src", "data", `${level.toLowerCase()}Lessons.json`);

const secondsToTimestamp = (value) => {
  const seconds = Math.max(0, Math.floor(Number(value)));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

const videoId = (url) => new URL(url).searchParams.get("v") ?? "";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

async function verifyCachedSources(evidence) {
  const checks = [
    ["video_sha256", evidence.sources.video],
    ["audio_sha256", evidence.sources.audio],
    ["captions_sha256", evidence.sources.captions],
    ["transcript_sha256", evidence.sources.transcript],
  ];
  for (const [hashKey, relativePath] of checks) {
    const bytes = await readFile(path.join(root, relativePath));
    const actual = sha256(bytes);
    if (actual !== evidence.source_hashes[hashKey]) {
      throw new Error(`${relativePath}: evidence hash changed; review and regenerate the fixture before rebuilding.`);
    }
  }
}

function buildEntry(evidence, lesson) {
  const byExampleId = new Map(evidence.examples.map((example) => [example.id, example]));
  const chronologyByTopic = new Map(evidence.chronology.map((item) => [item.spoken_topic, item]));
  const sectionFor = (word) => evidence.chronology.find((item) => item.start_seconds === word.start_seconds);
  const timestampedExamples = evidence.examples.map((example) => ({
    de: example.de,
    ar: example.ar,
    note: "مثال معروض في الفيديو ومراجع بصريًا وصوتيًا.",
    timestamp: secondsToTimestamp(example.timestamp_seconds),
    origin: "video",
    evidence_source: example.evidence.join(" + "),
    evidence_frame: example.frame,
    transcript_segments: example.transcript_segments,
    confidence: example.confidence,
    review_status: example.review_status,
    verified: true,
  }));

  const chronologicalSections = evidence.vocabulary.map((word) => {
    const source = sectionFor(word);
    const examples = word.example_ids.map((id) => byExampleId.get(id));
    const paragraphs = [
      `تقدّم المعلّمة الاسم ${word.article} ${word.german} بمعنى: ${word.arabic_meaning}.`,
      word.context_meaning,
      ...examples.map((example) => `في المثال «${example.de}» يكون المعنى: ${example.ar}`),
    ];
    const warnings = word.id === "disziplin"
      ? ["لا تترجم Disziplin دائمًا بالانضباط؛ ففي سياق الجامعة والبحث العلمي تعني تخصصًا أو فرعًا علميًا."]
      : word.id === "institution"
        ? ["للتدرّب على النطق، ابدأ ببطء ثم زد السرعة تدريجيًا كما تقترح المعلّمة."]
        : [];
    return {
      heading: `${word.article} ${word.german}`,
      source_start: secondsToTimestamp(word.start_seconds),
      source_end: secondsToTimestamp(word.end_seconds),
      paragraphs,
      concepts: [word.arabic_meaning, word.context_meaning],
      examples: examples.map((example) => ({
        de: example.de,
        ar: example.ar,
        note: "الصياغة الألمانية من الشريحة الأصلية.",
        timestamp: secondsToTimestamp(example.timestamp_seconds),
        verified: true,
      })),
      warnings,
      evidence: {
        source: "visual + audio",
        frame: word.frame,
        transcript_segments: word.transcript_segments,
        confidence: word.confidence,
        review_status: word.review_status,
      },
    };
  });

  const vocabulary = evidence.vocabulary.map((word) => ({
    de: word.german,
    ar: word.arabic_meaning,
    article: word.article,
    word_type: word.word_type,
    note: word.context_meaning,
    timestamp: secondsToTimestamp(word.start_seconds),
    source_start: secondsToTimestamp(word.start_seconds),
    source_end: secondsToTimestamp(word.end_seconds),
    evidence_frame: word.frame,
    transcript_segments: word.transcript_segments,
    confidence: word.confidence,
    review_status: word.review_status,
  }));

  return {
    level: evidence.level,
    lesson_id: evidence.lesson_id,
    video_id: evidence.video_id,
    source_type: "audiovisual_verified",
    source_language: "ar+de",
    source_model: "medium",
    source_compute_type: "int8",
    source_device: "cpu",
    source_duration_seconds: evidence.duration_seconds,
    source_segment_count: evidence.sources.transcript_segment_count,
    source_coverage_percent: evidence.coverage.combined_semantic_coverage,
    caption_coverage: evidence.coverage.caption_coverage,
    caption_quality_status: evidence.coverage.caption_quality_status,
    audio_coverage: evidence.coverage.audio_coverage,
    visual_timeline_coverage: evidence.coverage.visual_timeline_coverage,
    visual_content_coverage: evidence.coverage.visual_content_coverage,
    combined_semantic_coverage: evidence.coverage.combined_semantic_coverage,
    visual_review_status: evidence.coverage.visual_review_status,
    audio_review_status: evidence.coverage.audio_review_status,
    overall_review_status: evidence.coverage.overall_review_status,
    evidence_fixture: path.relative(root, fixturePath).replaceAll(path.sep, "/"),
    evidence_fixture_sha256: sha256(JSON.stringify(evidence)),
    reading_time_minutes: 12,
    summary: "يشرح الفيديو ثمانية أسماء ألمانية مؤنثة من مفردات B2، مع معناها واستعمالها في جمل: Kommunikation، Situation، Diskussion، Kultur، Disziplin، Institution، Struktur، Konsultation. كما يوضّح معنيين مختلفين لـ Disziplin، ويضيف سياقات منطوقة للثقافة والمؤسسات والبنية والاستشارة.",
    learning_objectives: [
      "فهم الكلمات الثماني كما قدّمتها المعلّمة واستعمال أداة التعريف die معها.",
      "تمييز معنى Disziplin بوصفه انضباطًا عن معناه الأكاديمي: تخصص أو فرع علمي.",
      "فهم الأمثلة التسعة المعروضة في الفيديو وربط كل كلمة بسياقها.",
      "التعرّف إلى السياقات المنطوقة غير المكتوبة على الشرائح، مثل وسائل التواصل وأنواع المؤسسات ومجالات الثقافة.",
    ],
    video_outline: [
      { timestamp: "00:00", heading: "هدف الدرس", summary: "ثماني كلمات B2 مع النطق والمعنى والاستعمال." },
      ...evidence.vocabulary.map((word) => ({
        timestamp: secondsToTimestamp(word.start_seconds),
        heading: `${word.article} ${word.german}`,
        summary: word.context_meaning,
      })),
    ],
    chronological_sections: chronologicalSections,
    explanation: [{
      heading: "كيف بُني هذا الدرس المقروء",
      content: "يتبع الشرح ترتيب الفيديو نفسه، ويجمع نصوص الشرائح مع الشرح العربي المنطوق. تُكتب الكلمات والجمل الألمانية كما ظهرت بصريًا، لأن الترجمة التلقائية والتفريغ الصوتي لم يحافظا دائمًا على تهجئتها.",
      origin: "video",
      source_start: "00:00",
      source_end: "08:06",
    }],
    rules_from_video: [],
    examples_from_video: timestampedExamples,
    vocabulary_from_video: vocabulary,
    tables: [{
      title: "جرد المفردات الكامل في الفيديو",
      headers: ["الكلمة", "الأداة", "المعنى في الدرس", "السياق"],
      rows: evidence.vocabulary.map((word) => [word.german, word.article, word.arabic_meaning, word.context_meaning]),
    }],
    teacher_notes: [
      { text: "تظهر الكلمات الثماني وتُنطق كلها مع أداة التعريف die؛ وهي أسماء مؤنثة.", timestamp: "00:22" },
      { text: "تكرّر المعلّمة نطق الكلمات الصعبة، وتوصي خصوصًا في Institution بالبدء ببطء ثم زيادة السرعة.", timestamp: "04:46" },
      { text: "في Disziplin يجب الاستدلال من السياق: سلوك منضبط، أو تخصص أكاديمي.", timestamp: "04:31" },
    ],
    exercises_demonstrated: [
      { text: "تدريب نطقي: تكرار Situation، Diskussion، Institution، Konsultation بعد المعلّمة.", timestamp: "01:21", teacher_answers_provided: false },
    ],
    common_mistakes: [{
      wrong: "Chemie ist eine naturwissenschaftliche Disziplin. = الكيمياء انضباط.",
      correct: "Chemie ist eine naturwissenschaftliche Disziplin. = الكيمياء تخصّص من تخصصات العلوم الطبيعية.",
      explanation: "تؤكد المعلّمة أن Disziplin هنا تعني مجالًا أو فرعًا علميًا، لا الانضباط.",
    }],
    quick_recap: evidence.vocabulary.map((word) => `${word.article} ${word.german}: ${word.arabic_meaning}.`),
    task_preparation: [
      { task_index: 0, guidance: "صنّف الكلمات الثماني كلها كأسماء مؤنثة، ثم أضف لكل كلمة سياقها أو تركيبها الوارد في المثال؛ لا تضف أفعالًا أو صفات لم يقدّمها الفيديو.", video_required: false },
      { task_index: 1, guidance: "استخدم الشرح الألماني أو العربي المستفاد من الفيديو: Kommunikation للتواصل، Situation للوضع، Diskussion للنقاش، Kultur للثقافة، Disziplin للانضباط أو التخصص، Institution للمؤسسة، Struktur للبنية أو التنظيم، Konsultation للاستشارة.", video_required: false },
      { task_index: 2, guidance: "اختر الكلمة وفق السياق: علاقة وتواصل، موقف وهدوء، نقاش، عادات ثقافية، انضباط أو تخصص علمي، مؤسسة اجتماعية، تنظيم فريق، أو استشارة تساعد على القرار.", video_required: false },
      { task_index: 3, guidance: "أعد الصياغة باستعمال الكلمات الثماني مع الحفاظ على المعنى، واستفد من الجمل التسع المعروضة كنماذج بنيوية لا كإجابات جاهزة.", video_required: false },
      { task_index: 4, guidance: "لبناء نص الرأي، اختر ست كلمات على الأقل واربطها بسياق طبيعي؛ انتبه خصوصًا إلى معنى Disziplin المقصود وإلى كتابة جميع الأسماء بحرف كبير.", video_required: false },
    ],
    evidence_checks: evidence.vocabulary.map((word) => ({
      item: word.german,
      timestamp: secondsToTimestamp(word.start_seconds),
      source: "visual + audio",
      frame: word.frame,
      transcript_segments: word.transcript_segments,
      verified: true,
    })),
    completeness: {
      beginning_represented: true,
      middle_represented: true,
      end_represented: true,
      all_verified_teaching_items_mapped: true,
      verified_teaching_item_count: evidence.vocabulary.length,
      mapped_teaching_item_count: evidence.vocabulary.length,
    },
    uncertain_passages: evidence.uncertain_passages,
    unresolved_items: evidence.unresolved_items,
    excluded_ranges: [
      { source_start: "07:34", source_end: "08:06", reason: "خاتمة القناة بلا محتوى ألماني تعليمي؛ راجعت بصريًا وصوتيًا ولم تُحذف من حساب تغطية الخط الزمني." },
    ],
    review_status: "source_verified",
  };
}

async function atomicJsonWrite(filename, value) {
  const temporary = `${filename}.${process.pid}.tmp`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, filename);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

const evidence = await readJson(fixturePath);
const lessons = (await readJson(lessonsPath)).lessons;
const entries = await readJson(outputPath);
const lesson = lessons.find((item) => Number(item.id) === lessonId);
if (!lesson) throw new Error(`${level}/${lessonId}: lesson does not exist.`);
if (evidence.level !== level || Number(evidence.lesson_id) !== lessonId) throw new Error("Evidence fixture identity mismatch.");
if (evidence.video_id !== videoId(lesson.url)) throw new Error("Evidence video identity mismatch.");
if (evidence.coverage.semantic_denominator !== evidence.vocabulary.length || evidence.coverage.semantic_items_mapped !== evidence.vocabulary.length) {
  throw new Error("Semantic coverage cannot be derived from duration and must map every inventory item.");
}
if (evidence.vocabulary.some((word) => word.review_status !== "source_verified")) throw new Error("Unverified vocabulary cannot enter the final lesson.");
if (evidence.unresolved_items.length) throw new Error("Unresolved source items must not be published as confirmed content.");
await verifyCachedSources(evidence);

const matchingIndexes = entries.map((entry, index) => Number(entry.lesson_id) === lessonId ? index : -1).filter((index) => index >= 0);
if (matchingIndexes.length !== 1) throw new Error(`${level}/${lessonId}: expected exactly one existing documentation entry.`);
entries[matchingIndexes[0]] = buildEntry(evidence, lesson);
await atomicJsonWrite(outputPath, entries);
console.log(JSON.stringify({ status: "rebuilt", level, lesson_id: lessonId, output: outputPath, fixture: fixturePath }, null, 2));
