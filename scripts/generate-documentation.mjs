import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const captionDirectory = process.argv[2] ? path.resolve(process.argv[2]) : null;
const levels = ["A1", "A2", "B1", "B2"];
const outputDirectory = path.join(root, "src", "data", "documentation");

const profiles = [
  make(/اختبار النطق|نطقك|Aussprache/i, "اختبر النطق على مستوى الصوت والكلمة: استمع إلى النموذج، انطق ببطء، ثم قارن موضع اللسان وطول الحركة والصوت النهائي بدل الاكتفاء بشكل الكلمة.",
    [ex("ich – nicht", "تدرّب على صوت ch من دون تحويله إلى ش."), ex("vier – wir", "ميّز بين بداية الكلمتين وطول الحركة.")],
    [word("die Aussprache", "النطق"), word("der Laut", "الصوت اللغوي"), word("wiederholen", "يكرر")],
    rule("المقارنة السمعية", "قسّم الكلمة إلى مقاطع، اسمعها ثم سجّل نطقك وقارن صوتًا واحدًا في كل مرة.", "hören → sprechen → aufnehmen → vergleichen")),
  make(/الحروف/, "اربط كل حرف بصوته لا باسمه فقط، وانتبه إلى الأصوات التي لا تقابل العربية مباشرة.",
    [ex("Wie heißt du? – Ich heiße Lina.", "ما اسمك؟ — اسمي لينا."), ex("L-I-N-A", "تهجئة الاسم حرفًا حرفًا.")],
    [word("der Buchstabe", "الحرف"), word("buchstabieren", "يتهجّى")],
    rule("التهجئة", "يُنطق كل حرف منفردًا عند تهجئة الاسم أو الكلمة.", "Mein Name ist …: M-A-R-A"),
    [table("الحروف الألمانية", ["الحروف"], [["A a · B b · C c · D d · E e · F f · G g"], ["H h · I i · J j · K k · L l · M m · N n"], ["O o · P p · Q q · R r · S s · T t · U u"], ["V v · W w · X x · Y y · Z z · Ä ä · Ö ö · Ü ü · ß"]])]),
  make(/الأرقام|الأعداد/, "تُبنى الأعداد المركبة في الألمانية عادةً بذكر الآحاد قبل العشرات وربطهما بـ und.",
    [ex("Ich bin zwanzig Jahre alt.", "عمري عشرون سنة."), ex("Die Nummer ist vier, sieben, zwei.", "الرقم هو أربعة، سبعة، اثنان.")],
    [word("null", "صفر"), word("zwanzig", "عشرون"), word("hundert", "مئة")],
    rule("العدد المركب", "من 21 غالبًا نقول الآحاد ثم und ثم العشرات.", "einundzwanzig = eins + und + zwanzig"),
    [table("الأعداد من 0 إلى 20", ["العدد", "بالألمانية", "العدد", "بالألمانية"], [["0", "null", "11", "elf"], ["1", "eins", "12", "zwölf"], ["2", "zwei", "13", "dreizehn"], ["3", "drei", "14", "vierzehn"], ["4", "vier", "15", "fünfzehn"], ["5", "fünf", "16", "sechzehn"], ["6", "sechs", "17", "siebzehn"], ["7", "sieben", "18", "achtzehn"], ["8", "acht", "19", "neunzehn"], ["9", "neun", "20", "zwanzig"], ["10", "zehn", "—", "—"]])]),
  make(/الساعة|الوقت/, "للسؤال عن الوقت نقول Wie spät ist es؟ ويمكن إعطاء الوقت رسميًا أو بصيغة الحديث اليومي.",
    [ex("Es ist halb acht.", "الساعة السابعة والنصف."), ex("Der Kurs beginnt um neun Uhr.", "تبدأ الدورة الساعة التاسعة.")],
    [word("die Uhr", "الساعة"), word("halb", "النصف"), word("um", "في تمام")],
    rule("موعد محدد", "تأتي um قبل الساعة عندما نتحدث عن موعد.", "um + Uhrzeit")),
  make(/التاريخ|الأشهر|فصول|أيام الأسبوع|الترتيبية/, "تُستخدم الأعداد الترتيبية مع التاريخ، وتتغير نهايتها حسب موقعها في الجملة.",
    [ex("Heute ist Montag.", "اليوم هو الاثنين."), ex("Am dritten Mai habe ich Geburtstag.", "عيد ميلادي في الثالث من مايو.")],
    [word("der Montag", "الاثنين"), word("der Monat", "الشهر"), word("am", "في يوم")],
    rule("التاريخ", "بعد am تأتي صيغة Dativ للعدد الترتيبي.", "am + Ordinalzahl-en + Monat")),
  make(/الأعداد الترتيبية/i, "تُبنى الأعداد الترتيبية غالبًا بإضافة -te من 1 إلى 19 و -ste من 20 فما فوق، مع صيغ شاذة مهمة مثل erste و dritte. وتتغير النهاية عند استعمالها كصفة.",
    [ex("Heute ist der erste Tag.", "اليوم هو اليوم الأول."), ex("Am dritten Mai habe ich Geburtstag.", "عيد ميلادي في الثالث من مايو.")],
    [word("erste", "الأول"), word("zweite", "الثاني"), word("dritte", "الثالث"), word("zwanzigste", "العشرون")],
    rule("تكوين العدد الترتيبي", "اختر الجذر الصحيح ثم أضف نهاية الصفة التي يطلبها السياق؛ بعد am تظهر غالبًا النهاية -en.", "1–19: -te · ab 20: -ste · am …-ten/-sten")),
  make(/sein|haben|الضمائر الشخصية/i, "لكل ضمير شخصي تصريف خاص؛ sein و haben من أكثر الأفعال استعمالًا ويجب حفظ صِيَغهما الأساسية.",
    [ex("Ich bin müde.", "أنا متعب."), ex("Wir haben Zeit.", "لدينا وقت.")],
    [word("ich", "أنا"), word("wir", "نحن"), word("sein", "يكون")],
    rule("الفعل المصرف", "يأتي الفعل المصرف في الجملة الخبرية البسيطة في الموقع الثاني.", "Subjekt + Verb + Ergänzung"),
    [table("تصريف sein و haben", ["الضمير", "sein", "haben"], [["ich", "bin", "habe"], ["du", "bist", "hast"], ["er/sie/es", "ist", "hat"], ["wir/sie/Sie", "sind", "haben"]])]),
  make(/أدوات التعريف|التنكير/, "اختيار der أو die أو das يرتبط بجنس الاسم، لذلك تعلّم الاسم مع أداته كوحدة واحدة.",
    [ex("Das ist ein Tisch.", "هذه طاولة."), ex("Die Lampe ist neu.", "المصباح جديد.")],
    [word("der", "أداة المذكر"), word("die", "أداة المؤنث والجمع"), word("das", "أداة المحايد")],
    rule("حفظ الاسم", "لا توجد قاعدة واحدة تكشف جنس كل اسم؛ احفظ الأداة مع المفرد.", "der Tisch · die Lampe · das Buch"),
    [table("الأدوات في Nominativ", ["الجنس", "معرفة", "نكرة"], [["مذكر", "der", "ein"], ["مؤنث", "die", "eine"], ["محايد", "das", "ein"], ["جمع", "die", "—"]])]),
  make(/الملكية|Possessiv/i, "ضمير الملكية يوافق صاحب الشيء في جذره، ثم يأخذ نهاية تناسب الاسم والحالة.",
    [ex("Das ist mein Bruder.", "هذا أخي."), ex("Sie sucht ihre Tasche.", "هي تبحث عن حقيبتها.")],
    [word("mein", "خاصتي"), word("dein", "خاصتك"), word("sein/ihr", "خاصته/خاصتها")],
    rule("اختيار الجذر", "اختر أولًا صاحب الشيء: ich → mein، du → dein، ثم اضبط النهاية.", "Besitzer → Stamm + Endung"),
    [table("mein و dein في Nominativ", ["الجنس/العدد", "mein-", "dein-"], [["مذكر", "mein", "dein"], ["مؤنث", "meine", "deine"], ["محايد", "mein", "dein"], ["جمع", "meine", "deine"]])]),
  make(/Nominativ|حالة الرفع/i, "Nominativ هو حالة الفاعل: الشخص أو الشيء الذي يقوم بالفعل أو نتحدث عنه.",
    [ex("Der Mann arbeitet.", "الرجل يعمل."), ex("Das Kind ist müde.", "الطفل متعب.")],
    [word("das Subjekt", "الفاعل"), word("wer?", "مَن؟"), word("was?", "ماذا؟")],
    rule("تحديد الفاعل", "اسأل wer أو was قبل الفعل لتحديد عنصر Nominativ.", "Wer/Was + Verb?")),
  make(/Akkusativ|الأكوزاتيف|النصب/i, "Akkusativ يحدد غالبًا المفعول المباشر. أهم تغيير في الأدوات يظهر مع المذكر: der يصبح den و ein يصبح einen.",
    [ex("Ich kaufe einen Apfel.", "أشتري تفاحة."), ex("Sie sieht den Mann.", "هي ترى الرجل.")],
    [word("wen?", "مَن؟ للمفعول"), word("was?", "ماذا؟"), word("den", "أداة المذكر في Akkusativ")],
    rule("المذكر في Akkusativ", "يتغير المذكر فقط في مجموعة الأدوات الأساسية، وتأتي ضمائر المفعول مثل mich و dich و ihn بحسب الشخص.", "der → den · ein → einen"),
    [table("أدوات وضمائر Akkusativ", ["الجنس/الشخص", "الأداة", "الضمير"], [["مذكر", "den / einen", "ihn"], ["مؤنث", "die / eine", "sie"], ["محايد", "das / ein", "es"], ["ich / du", "—", "mich / dich"]])]),
  make(/Dativ|الداتيف|الجر غير المباشر/i, "Dativ يدل كثيرًا على المستفيد أو المتلقي، ويأتي أيضًا بعد أفعال وحروف جر محددة.",
    [ex("Ich helfe dem Mann.", "أساعد الرجل."), ex("Sie gibt der Frau das Buch.", "تعطي المرأةَ الكتابَ.")],
    [word("wem?", "لمن؟"), word("dem", "للمذكر/المحايد"), word("der", "للمؤنث")],
    rule("تمييز المفعولين", "في أفعال العطاء يكون الشخص غالبًا Dativ والشيء Akkusativ.", "jemandem (Dat.) etwas (Akk.) geben"),
    [table("أدوات Dativ", ["الجنس/العدد", "معرفة", "نكرة"], [["مذكر", "dem", "einem"], ["مؤنث", "der", "einer"], ["محايد", "dem", "einem"], ["جمع", "den + n", "—"]])]),
  make(/Genitiv|المضاف إليه/i, "Genitiv يعبّر عن الملكية أو العلاقة، وتأتي أدواته des للمذكر والمحايد و der للمؤنث والجمع.",
    [ex("Das Auto des Lehrers ist neu.", "سيارة المعلّم جديدة."), ex("Die Farbe der Tasche gefällt mir.", "يعجبني لون الحقيبة.")],
    [word("wessen?", "لِمَن؟"), word("des", "للمذكر والمحايد"), word("der", "للمؤنث والجمع")],
    rule("نهاية الاسم", "يأخذ الاسم المذكر أو المحايد غالبًا s أو es في Genitiv.", "des Mannes · des Kindes"),
    [table("أدوات Genitiv", ["الجنس", "معرفة", "نكرة"], [["مذكر", "des", "eines"], ["محايد", "des", "eines"], ["مؤنث", "der", "einer"], ["جمع", "der", "—"]])]),
  make(/Reflexiv|المنعكسة/i, "يعود الضمير المنعكس على فاعل الجملة، لذلك يجب أن يطابق الضمير الشخصي والحالة المطلوبة.",
    [ex("Ich freue mich auf das Wochenende.", "أتطلع إلى عطلة نهاية الأسبوع."), ex("Wir waschen uns die Hände.", "نغسل أيدينا.")],
    [word("sich freuen", "يفرح/يتطلع"), word("sich erinnern", "يتذكر"), word("sich treffen", "يلتقي")],
    rule("الضمير المنعكس", "مع ich يكون mich في Akkusativ و mir في Dativ؛ ومع du: dich أو dir.", "ich → mich/mir · du → dich/dir"),
    [table("الضمائر المنعكسة", ["الضمير", "Akkusativ", "Dativ"], [["ich", "mich", "mir"], ["du", "dich", "dir"], ["er/sie/es", "sich", "sich"], ["wir", "uns", "uns"], ["ihr", "euch", "euch"], ["sie/Sie", "sich", "sich"]])]),
  make(/منتظمة|غير المنتظمة|Verben-Nuancen|LASSEN/i, "يتغير الفعل وفق الفاعل والزمن. افصل بين جذر الفعل ونهايته، وانتبه إلى الأفعال التي تغيّر حرفًا في الجذر.",
    [ex("Ich lerne jeden Tag.", "أتعلّم كل يوم."), ex("Er liest ein Buch.", "هو يقرأ كتابًا.")],
    [word("lernen", "يتعلّم"), word("lesen", "يقرأ"), word("lassen", "يدع/يجعل")],
    rule("الحاضر", "في الجملة الخبرية يأتي الفعل المصرف في الموقع الثاني.", "Subjekt + konjugiertes Verb + …")),
  make(/القابلة.*(?:الانفصال|للانفصال)|trennbar/i, "تنفصل سوابق مثل auf- و ein- و an- في الجملة الرئيسية، بينما لا تنفصل سوابق مثل be- و ver- و ent-. انتبه إلى النبرة والمعنى واحفظ الفعل كاملًا.",
    [ex("Ich stehe um sieben Uhr auf.", "أستيقظ الساعة السابعة."), ex("Ich verstehe die Aufgabe.", "أفهم المهمة.")],
    [word("aufstehen", "يستيقظ — منفصل"), word("einkaufen", "يتسوّق — منفصل"), word("verstehen", "يفهم — غير منفصل"), word("besuchen", "يزور — غير منفصل")],
    rule("الفصل في الجملة الرئيسية", "صرّف جذر الفعل المنفصل وضع السابقة في النهاية؛ أما السابقة غير المنفصلة فتبقى متصلة بالفعل.", "Ich rufe dich an. · Ich besuche dich.")),
  make(/الأفعال المساعدة في الماضي/i, "تأتي الأفعال الناقصة في Präteritum بصيغ مثل konnte و musste و wollte، ويبقى المصدر في نهاية الجملة.",
    [ex("Ich musste gestern arbeiten.", "كان عليّ أن أعمل أمس."), ex("Wir konnten nicht kommen.", "لم نستطع الحضور.")],
    [word("konnte", "استطاع"), word("musste", "اضطر/كان عليه"), word("wollte", "أراد")],
    rule("Modalverb في Präteritum", "صرّف الفعل الناقص في الماضي البسيط وضع المصدر غير المصرف في النهاية.", "Subjekt + Modalverb im Präteritum + … + Infinitiv"),
    [table("أهم صيغ الماضي", ["المصدر", "ich/er/sie/es", "wir/sie/Sie"], [["können", "konnte", "konnten"], ["müssen", "musste", "mussten"], ["wollen", "wollte", "wollten"], ["dürfen", "durfte", "durften"]])]),
  make(/المساعدة|Modalverben|الأفعال المساعدة/i, "يُصرف الفعل الناقص في الموقع الثاني، ويذهب المصدر غير المصرف إلى نهاية الجملة.",
    [ex("Ich kann Deutsch sprechen.", "أستطيع التحدث بالألمانية."), ex("Du musst heute arbeiten.", "يجب أن تعمل اليوم.")],
    [word("können", "يستطيع"), word("müssen", "يجب"), word("möchten", "يرغب")],
    rule("ترتيب الفعلين", "الفعل الناقص مصرف، والمصدر في النهاية بلا zu.", "Subjekt + Modalverb + … + Infinitiv")),
  make(/Imperativ|الأمر/i, "صيغة الأمر تتغير حسب المخاطَب: du و ihr و Sie، وتبدأ الجملة غالبًا بالفعل.",
    [ex("Komm bitte herein!", "تفضل بالدخول!"), ex("Warten Sie bitte hier!", "انتظر هنا من فضلك!")],
    [word("bitte", "من فضلك"), word("komm!", "تعال!"), word("warten", "ينتظر")],
    rule("الأمر الرسمي", "مع Sie نستخدم المصدر ثم Sie.", "Infinitiv + Sie + …")),
  make(/النفي/i, "nicht تنفي الفعل أو الصفة أو الفكرة، بينما kein ينفي اسمًا نكرة أو اسمًا بلا أداة.",
    [ex("Ich komme heute nicht.", "لن آتي اليوم."), ex("Ich habe kein Auto.", "ليس لدي سيارة.")],
    [word("nicht", "ليس/لا"), word("kein", "لا يوجد/ليس أي")],
    rule("اختيار أداة النفي", "استخدم kein مع الاسم الذي يمكن أن تسبقه ein/eine، واستخدم nicht في الحالات الأخرى.", "ein Auto → kein Auto")),
  make(/Indirekte Fragen/i, "في السؤال غير المباشر نضع الفعل المصرف في نهاية الجملة التابعة؛ نستخدم ob لسؤال نعم أو لا ونحتفظ بأداة السؤال في W-Frage.",
    [ex("Wo wohnst du?", "أين تسكن؟"), ex("Ich weiß nicht, ob er kommt.", "لا أعرف إن كان سيأتي.")],
    [word("wer", "مَن"), word("wo", "أين"), word("warum", "لماذا")],
    rule("السؤال غير المباشر", "استخدم ob مع سؤال نعم/لا، واحتفظ بأداة السؤال مع W-Frage.", "…, ob/W-Wort + … + Verb")),
  make(/السؤال|الاستفهام/i, "يبدأ سؤال W بأداة الاستفهام ثم الفعل فالفاعل، بينما يبدأ سؤال نعم أو لا بالفعل المصرف.",
    [ex("Wo wohnst du?", "أين تسكن؟"), ex("Kommst du aus Marokko?", "هل أنت من المغرب؟")],
    [word("wer", "مَن"), word("wo", "أين"), word("warum", "لماذا"), word("wann", "متى")],
    rule("ترتيب السؤال", "بعد أداة الاستفهام يأتي الفعل المصرف ثم الفاعل؛ وفي سؤال نعم أو لا يأتي الفعل أولًا.", "W-Wort + Verb + Subjekt? / Verb + Subjekt?")),
  make(/تركيب الجملة|الجملة الرئيسية|Satzstruktur/i, "الفعل المصرف ثابت في الموقع الثاني في الجملة الرئيسية، حتى عندما يبدأ الكلام بظرف زمان أو مكان.",
    [ex("Heute lerne ich Deutsch.", "اليوم أتعلم الألمانية."), ex("Am Abend sehe ich einen Film.", "في المساء أشاهد فيلمًا.")],
    [word("das Subjekt", "الفاعل"), word("das Verb", "الفعل"), word("die Ergänzung", "التكملة")],
    rule("قاعدة الموقع الثاني", "العنصر الأول يمكن أن يتغير، لكن الفعل المصرف يبقى ثاني عنصر.", "Position 1 + Verb + Subjekt + …")),
  make(/أدوات ربط الجمل/i, "تربط und و aber و oder و denn و sondern جملتين رئيسيتين من دون دفع الفعل إلى النهاية؛ يبقى ترتيب الفعل في كل جملة كما هو.",
    [ex("Ich lerne Deutsch, aber meine Schwester lernt Englisch.", "أتعلم الألمانية، لكن أختي تتعلم الإنجليزية."), ex("Er kommt nicht heute, sondern er kommt morgen.", "هو لا يأتي اليوم، بل يأتي غدًا.")],
    [word("und", "و"), word("aber", "لكن"), word("oder", "أو"), word("denn", "لأن"), word("sondern", "بل")],
    rule("ربط جملتين رئيسيتين", "لا تغيّر هذه الروابط موضع الفعل؛ وبعد sondern يأتي البديل المصحح لنفي سابق.", "Hauptsatz + Konjunktion + Hauptsatz")),
  make(/أدوات الربط|الجملة الجانبية|\bweil\b|\bda\b|\bbevor\b|Nebensätze|Temporale/i, "في الجملة التابعة ينتقل الفعل المصرف إلى النهاية، وتفصلها فاصلة عن الجملة الرئيسية.",
    [ex("Ich bleibe zu Hause, weil ich krank bin.", "أبقى في المنزل لأنني مريض."), ex("Bevor ich schlafe, lese ich.", "قبل أن أنام أقرأ.")],
    [word("weil", "لأن"), word("obwohl", "مع أن"), word("bevor", "قبل أن")],
    rule("الجملة التابعة", "بعد أداة الربط تأتي بقية العناصر ثم الفعل المصرف في النهاية.", "Konjunktion + Subjekt + … + Verb")),
  make(/als و wenn|Als und Wenn/i, "als تُستخدم غالبًا لحدث واحد في الماضي، أما wenn فللتكرار أو الحاضر والمستقبل أو الشرط.",
    [ex("Als ich klein war, wohnte ich in Bonn.", "عندما كنت صغيرًا كنت أسكن في بون."), ex("Wenn ich Zeit habe, koche ich.", "عندما يكون لدي وقت أطبخ.")],
    [word("als", "عندما مرة واحدة في الماضي"), word("wenn", "عندما/إذا")],
    rule("اختيار الرابط", "اسأل: هل الحدث وحيد وماضٍ؟ استخدم als؛ وإلا غالبًا wenn.", "einmal früher → als · wiederholt/bedingt → wenn")),
  make(/Trotzdem|Obwohl|Konzessiv/i, "obwohl تربط جملة تابعة بالفعل في النهاية، بينما trotzdem ظرف ربط يبدأ جملة رئيسية ويبقى الفعل بعدها مباشرة.",
    [ex("Obwohl es regnet, gehe ich spazieren.", "مع أن الجو ممطر، أخرج للمشي."), ex("Es regnet. Trotzdem gehe ich spazieren.", "الجو ممطر. ومع ذلك أخرج للمشي.")],
    [word("obwohl", "مع أن"), word("trotzdem", "مع ذلك")],
    rule("نوع الجملة", "obwohl تُدخل Nebensatz؛ trotzdem تحتل الموقع الأول في Hauptsatz.", "obwohl … Verb / Trotzdem + Verb + Subjekt")),
  make(/Um\.\.\. zu|Finalsätze|Kausalsätze/i, "um … zu تُستخدم عندما يكون الفاعل واحدًا، و damit عندما يختلف الفاعل أو نحتاج جملة كاملة.",
    [ex("Ich lerne viel, um die Prüfung zu bestehen.", "أدرس كثيرًا لأنجح في الامتحان."), ex("Ich spreche langsam, damit du mich verstehst.", "أتحدث ببطء لكي تفهمني.")],
    [word("um … zu", "لكي مع فاعل واحد"), word("damit", "لكي مع جملة كاملة")],
    rule("اختيار البناء", "قارن فاعل الهدف بفاعل الجملة الرئيسية قبل الاختيار.", "gleiches Subjekt → um … zu")),
  make(/Infinitiv.*zu|Verben mit ZU|المصدر/i, "في تركيب Infinitiv mit zu يأتي المصدر في نهاية المجموعة، وتسبق zu المصدر أو تدخل بين السابقة والجذر في الفعل المنفصل.",
    [ex("Ich versuche, früher zu schlafen.", "أحاول أن أنام أبكر."), ex("Er hat vergessen, mich anzurufen.", "نسي أن يتصل بي.")],
    [word("versuchen", "يحاول"), word("hoffen", "يأمل"), word("vergessen", "ينسى")],
    rule("موضع zu", "مع الفعل المنفصل تأتي zu بين السابقة والجذر.", "anzurufen · aufzustehen")),
  make(/ohne ZU/i, "بعد الأفعال الناقصة وبعض أفعال الإدراك والحركة و lassen و werden يأتي المصدر بلا zu.",
    [ex("Ich kann gut schwimmen.", "أستطيع السباحة جيدًا."), ex("Ich höre ihn singen.", "أسمعه يغني.")],
    [word("sehen", "يرى"), word("hören", "يسمع"), word("lassen", "يدع")],
    rule("مصدر بلا zu", "لا تضف zu عندما يحكم البناء فعل ناقص أو أحد التراكيب المحددة.", "Modalverb + Infinitiv")),
  make(/Präteritum|الماضي البسيط/i, "Präteritum شائع في الكتابة، ويكثر في الكلام مع sein و haben والأفعال الناقصة.",
    [ex("Früher wohnte ich in Köln.", "كنت أسكن سابقًا في كولونيا."), ex("Wir hatten keine Zeit.", "لم يكن لدينا وقت.")],
    [word("war", "كان"), word("hatte", "كان لديه"), word("ging", "ذهب")],
    rule("الفعل المنتظم", "يُبنى الماضي البسيط المنتظم عادةً بإضافة t ثم نهاية الشخص.", "lernen → lernte")),
  make(/Plusquamperfekt/i, "Plusquamperfekt يصف حدثًا اكتمل قبل حدث ماضٍ آخر، ويُبنى من hatte أو war مع Partizip II.",
    [ex("Nachdem ich gegessen hatte, ging ich hinaus.", "بعد أن كنت قد أكلت، خرجت."), ex("Sie war schon gegangen.", "كانت قد غادرت بالفعل.")],
    [word("vorher", "قبل ذلك"), word("nachdem", "بعد أن"), word("schon", "بالفعل")],
    rule("البناء", "اختر hatte أو war كما تختار haben أو sein في Perfekt، ثم ضع Partizip II.", "hatte/war + Partizip II")),
  make(/Temporale Nebensätze mit NACHDEM/i, "تقدّم nachdem الحدث الأسبق في جملة تابعة، لذلك يأتي فعلها في النهاية. في السرد الماضي يظهر الحدث الأسبق غالبًا في Plusquamperfekt والحدث اللاحق في Präteritum أو Perfekt.",
    [ex("Nachdem ich gegessen hatte, ging ich spazieren.", "بعد أن كنت قد أكلت، خرجت للمشي."), ex("Ich habe angerufen, nachdem ich angekommen war.", "اتصلت بعد أن كنت قد وصلت.")],
    [word("nachdem", "بعد أن"), word("zuerst", "أولًا"), word("anschließend", "بعد ذلك")],
    rule("تتابع الحدثين", "ضع الحدث الأسبق بعد nachdem، والفعل المصرف في نهاية الجملة التابعة، ثم عبّر عن الحدث اللاحق في الجملة الرئيسية.", "Nachdem + Plusquamperfekt, Hauptsatz im Präteritum/Perfekt")),
  make(/Perfekt|الماضي باللغة|أفعال مع sein بالماضي|تطبيقات الماضي/i, "Perfekt هو زمن ماضٍ شائع في الحديث، ويُبنى من haben أو sein مع Partizip II في نهاية الجملة.",
    [ex("Ich habe Deutsch gelernt.", "تعلّمت الألمانية."), ex("Wir sind nach Berlin gefahren.", "سافرنا إلى برلين.")],
    [word("gestern", "أمس"), word("gefahren", "سافر"), word("gemacht", "فعل")],
    rule("اختيار الفعل المساعد", "تستخدم أفعال الحركة أو تغيّر الحالة غالبًا sein، ومعظم الأفعال الأخرى haben.", "haben/sein + … + Partizip II")),
  make(/الأفعال غير المنتظمة في الماضي/i, "تأخذ الأفعال غير المنتظمة صيغ Partizip II يجب تعلّمها مع المصدر والفعل المساعد؛ كثير منها يحتفظ بالنهاية -en ويغيّر جذر الكلمة.",
    [ex("Ich habe das Buch gelesen.", "قرأت الكتاب."), ex("Wir sind nach Hause gegangen.", "ذهبنا إلى المنزل.")],
    [word("lesen – gelesen", "يقرأ — قرأ"), word("gehen – gegangen", "يذهب — ذهب"), word("schreiben – geschrieben", "يكتب — كتب")],
    rule("حفظ الفعل الماضي", "احفظ ثلاث وحدات معًا: المصدر و Partizip II و haben أو sein، ثم ضع Partizip II في نهاية الجملة.", "Infinitiv → Partizip II + Hilfsverb")),
  make(/Futur I|المستقبل 1/i, "Futur I يُبنى من werden المصرف والمصدر في النهاية، ويعبّر عن توقع أو خطة مستقبلية.",
    [ex("Ich werde morgen arbeiten.", "سأعمل غدًا."), ex("Es wird wahrscheinlich regnen.", "من المحتمل أن تمطر.")],
    [word("werden", "سوف/يصبح"), word("morgen", "غدًا"), word("wahrscheinlich", "على الأرجح")],
    rule("البناء", "صرّف werden وضع المصدر في نهاية الجملة.", "werden + … + Infinitiv")),
  make(/Futur II|vollendete Zukunft/i, "Futur II يعبّر عن حدث سيكون قد اكتمل أو عن افتراض يتعلق بالماضي.",
    [ex("Bis morgen werde ich den Bericht geschrieben haben.", "حتى الغد سأكون قد كتبت التقرير."), ex("Er wird schon angekommen sein.", "يُفترض أنه وصل بالفعل.")],
    [word("bis", "حتى"), word("vermutlich", "على الأرجح"), word("abgeschlossen", "مكتمل")],
    rule("البناء", "يأتي Partizip II ثم haben أو sein في نهاية الجملة.", "werden + … + Partizip II + haben/sein")),
  make(/Passiv في الماضي|Passiv بالماضي/i, "يركّز Passiv في الماضي على حدث وقع دون إبراز فاعله، ويُبنى في Präteritum من wurde أو wurden مع Partizip II.",
    [ex("Die Brücke wurde 1990 gebaut.", "بُني الجسر سنة 1990."), ex("Die Geräte wurden gestern repariert.", "أُصلحت الأجهزة أمس.")],
    [word("wurde", "صيغة المفرد من werden في الماضي"), word("wurden", "صيغة الجمع من werden في الماضي"), word("gebaut", "مبني")],
    rule("Passiv Präteritum", "صرّف werden إلى wurde أو wurden، وضع Partizip II في نهاية الجملة.", "Subjekt + wurde/wurden + … + Partizip II")),
  make(/Passiv مع الأفعال المساعدة|Passiv mit Modalverben/i, "مع Modalverb في المبني للمجهول يأتي الفعل الناقص مصرفًا في الموقع الثاني، ويقف Partizip II ثم werden غير المصرف في نهاية الجملة.",
    [ex("Die Tür muss geschlossen werden.", "يجب إغلاق الباب."), ex("Das Formular kann online ausgefüllt werden.", "يمكن ملء الاستمارة عبر الإنترنت.")],
    [word("müssen", "يجب"), word("können", "يمكن"), word("dürfen", "يُسمح")],
    rule("Passiv مع Modalverb", "صرّف Modalverb واترك werden في المصدر بعد Partizip II في نهاية الجملة.", "Modalverb + … + Partizip II + werden")),
  make(/Passiv|المبني للمجهول/i, "يركّز Passiv على الحدث أو النتيجة بدل الفاعل، ويُبنى في الحاضر من werden مع Partizip II.",
    [ex("Der Brief wird geschrieben.", "تُكتب الرسالة."), ex("Das Haus wurde gebaut.", "بُني المنزل.")],
    [word("werden", "فعل مساعد للمجهول"), word("von", "من قِبل"), word("gebaut", "مبني")],
    rule("مجهول الحدث", "صرّف werden في الزمن المطلوب وضع Partizip II في النهاية.", "werden + Partizip II")),
  make(/Partizip I|Partizip II als|Partizipien/i, "Partizip I يعطي معنى نشطًا متزامنًا، بينما Partizip II يصف غالبًا نتيجة مكتملة أو معنى مبنيًا للمجهول.",
    [ex("das schlafende Kind", "الطفل النائم"), ex("die geschlossene Tür", "الباب المغلق")],
    [word("sprechend", "متحدث"), word("geschrieben", "مكتوب"), word("geschlossen", "مغلق")],
    rule("الصفة المشتقة", "بعد اشتقاق Partizip أضف نهاية الصفة الملائمة للأداة والحالة.", "Verb + d / Partizip II + Adjektivendung")),
  make(/Relativsätze im Genitiv|Relativpronomen \(Genitive Case\)/i, "تُظهر dessen و deren الملكية داخل الجملة الموصولة: dessen للمذكر والمحايد، و deren للمؤنث والجمع. يتبع الضميرَ الاسمُ المملوك بلا أداة إضافية.",
    [ex("Der Mann, dessen Auto dort steht, ist mein Nachbar.", "الرجل الذي تقف سيارته هناك هو جاري."), ex("Die Frau, deren Sohn in Berlin lebt, ist Ärztin.", "المرأة التي يعيش ابنها في برلين طبيبة.")],
    [word("dessen", "الذي له — مذكر/محايد"), word("deren", "التي لها/الذين لهم — مؤنث/جمع"), word("das Bezugswort", "الاسم المرجعي")],
    rule("اختيار ضمير Genitiv", "اختر dessen أو deren بحسب جنس وعدد الاسم المرجعي، لا بحسب الاسم المملوك الذي يأتي بعده.", "Bezugswort + , + dessen/deren + Nomen + … + Verb")),
  make(/Relativ|الموصولة/i, "ضمير الوصل يطابق الاسم السابق في الجنس والعدد، لكن حالته يحددها دوره داخل الجملة الموصولة.",
    [ex("Das ist der Mann, den ich kenne.", "هذا هو الرجل الذي أعرفه."), ex("Die Kollegin, mit der ich arbeite, ist nett.", "الزميلة التي أعمل معها لطيفة.")],
    [word("der/die/das", "الذي/التي في Nominativ"), word("den/die/das", "الذي/التي في Akkusativ"), word("dem/der", "الذي/التي في Dativ")],
    rule("اختيار الضمير", "حدّد مرجع الضمير ثم اسأل عن وظيفته داخل الجملة التابعة.", "Bezugswort + , + Relativpronomen + … + Verb")),
  make(/Konjunktiv II|Als ob|Irreale/i, "Konjunktiv II يعبّر عن غير الواقعي أو الافتراض أو الطلب المهذب؛ وبعد als ob يأتي الفعل عادةً في النهاية.",
    [ex("Wenn ich Zeit hätte, würde ich reisen.", "لو كان لدي وقت لسافرت."), ex("Er tut so, als ob er alles wüsste.", "يتصرف وكأنه يعرف كل شيء.")],
    [word("hätte", "لو كان لديه"), word("wäre", "لو كان"), word("würde", "كان سوف")],
    rule("صيغة würde", "يمكن استعمال würde + Infinitiv مع كثير من الأفعال، مع تفضيل hätte و wäre والصيغ الشائعة.", "würde + Infinitiv")),
  make(/Konjunktiv I \(Indirekte Rede\).*Teil 2/i, "في النقل غير المباشر نفضّل Konjunktiv I للمسافة الحيادية. إذا طابقت صيغته صيغة Indikativ، نلجأ غالبًا إلى Konjunktiv II لتبقى علامة النقل واضحة؛ أما dass + Indikativ فأكثر مباشرة وأقل حيادًا أسلوبيًا.",
    [ex("Sie sagen, sie hätten keine Zeit.", "يقولون إنه ليس لديهم وقت."), ex("Er erklärt, er sei bereits fertig.", "يوضح أنه انتهى بالفعل.")],
    [word("die Aussage", "التصريح"), word("wiedergeben", "ينقل/يعيد صياغة"), word("angeblich", "بحسب الادعاء")],
    rule("تجنّب التطابق", "استخدم Konjunktiv II عندما لا تميّز صيغة Konjunktiv I النقل عن Indikativ، مع تحويل الضمائر وإشارات الزمان والمكان.", "sie haben → sie hätten · wir kommen → sie kämen"),
    [table("اختيار أسلوب النقل", ["الحالة", "الاختيار المعتاد"], [["Konjunktiv I واضح", "er sei / er habe"], ["Konjunktiv I = Indikativ", "Konjunktiv II: sie hätten"], ["نقل مباشر أقل حيادًا", "dass + Indikativ"]])]),
  make(/Konjunktiv I mit W-Fragen/i, "في نقل سؤال يبدأ بأداة استفهام نحتفظ بالأداة، ونحوّل الكلام إلى جملة تابعة: يأتي الفاعل بعدها ويقف الفعل بصيغة Konjunktiv I في النهاية.",
    [ex("Sie fragt, wann der Kurs beginne.", "هي تسأل متى تبدأ الدورة."), ex("Er möchte wissen, warum sie gegangen sei.", "يريد أن يعرف لماذا غادرت.")],
    [word("wann", "متى"), word("warum", "لماذا"), word("wo", "أين"), word("fragen", "يسأل")],
    rule("نقل W-Frage", "احذف علامة الاستفهام المباشرة، واحتفظ بأداة السؤال، ثم ضع الفعل في نهاية الجملة التابعة.", "W-Wort + Subjekt + … + Verb im Konjunktiv I")),
  make(/Konjunktiv I(?!I)|Indirekte Rede/i, "Konjunktiv I ينقل كلام شخص آخر بمسافة حيادية، ويظهر كثيرًا في الأخبار واللغة الرسمية.",
    [ex("Er sagt, er sei krank.", "يقول إنه مريض."), ex("Sie erklärt, sie habe keine Zeit.", "توضح أنه ليس لديها وقت.")],
    [word("behaupten", "يدّعي"), word("berichten", "يذكر في تقرير"), word("laut", "وفقًا لـ")],
    rule("النقل غير المباشر", "حوّل الضمائر والزمان والمكان حسب منظور المتكلم، واختر صيغة Konjunktiv المناسبة.", "Er sagt, er sei/habe/komme …")),
  make(/حروف الجر مع Akkusativ/i, "حروف الجر durch و für و gegen و ohne و um تأخذ Akkusativ دائمًا، لذلك اضبط أداة الاسم أو الضمير بعدها وفق هذه الحالة.",
    [ex("Wir gehen durch den Park.", "نسير عبر الحديقة."), ex("Das Geschenk ist für meinen Bruder.", "الهدية لأخي.")],
    [word("durch", "عبر"), word("für", "لأجل"), word("gegen", "ضد/نحو"), word("ohne", "من دون"), word("um", "حول/في تمام")],
    rule("حالة ثابتة", "بعد هذه الحروف لا يعتمد اختيار الحالة على الحركة أو الموقع؛ الحالة دائمًا Akkusativ.", "durch/für/gegen/ohne/um + Akkusativ")),
  make(/حروف الجر مع Dativ/i, "حروف الجر aus و bei و mit و nach و seit و von و zu تأخذ Dativ دائمًا.",
    [ex("Ich fahre mit dem Bus.", "أذهب بالحافلة."), ex("Sie kommt aus der Schweiz.", "هي قادمة من سويسرا.")],
    [word("aus", "من داخل/من بلد"), word("bei", "عند"), word("mit", "مع/بواسطة"), word("nach", "إلى/بعد"), word("von", "من"), word("zu", "إلى")],
    rule("حالة ثابتة", "بعد هذه الحروف استخدم Dativ واضبط أداة الاسم أو الضمير وفقًا له.", "aus/bei/mit/nach/seit/von/zu + Dativ")),
  make(/an \+ Dativ/i, "تأخذ تراكيب فعلية ثابتة مثل teilnehmen an و leiden an حرف الجر an مع Dativ؛ الحالة هنا جزء من التركيب المحفوظ وليست اختيارًا بين اتجاه وموقع.",
    [ex("Sie nimmt an dem Seminar teil.", "هي تشارك في الندوة."), ex("Er leidet an einer Allergie.", "هو يعاني حساسية.")],
    [word("teilnehmen an + Dativ", "يشارك في"), word("leiden an + Dativ", "يعاني من"), word("zweifeln an + Dativ", "يشك في")],
    rule("an مع Dativ", "احفظ الفعل وحرف الجر والحالة كوحدة، واستخدم woran للسؤال عن شيء و an wem للسؤال عن شخص.", "Verb + an + Dativ")),
  make(/an \+ Akkusativ/i, "تأخذ تراكيب فعلية ثابتة مثل sich erinnern an و denken an حرف الجر an مع Akkusativ؛ لا تحدد الحركة أو الموقع هذه الحالة.",
    [ex("Ich erinnere mich an den Termin.", "أتذكر الموعد."), ex("Wir denken an unsere Freunde.", "نفكر في أصدقائنا.")],
    [word("sich erinnern an + Akkusativ", "يتذكر"), word("denken an + Akkusativ", "يفكر في"), word("sich gewöhnen an + Akkusativ", "يعتاد على")],
    rule("an مع Akkusativ", "احفظ التركيب كاملًا، واستخدم woran للسؤال عن شيء و an wen للسؤال عن شخص.", "Verb + an + Akkusativ")),
  make(/Verben mit (?:der )?Präposition|Präpositionalobjekte|أفعال مع حروف الجر/i, "الفعل مع حرف الجر وحدة ثابتة تحدد المعنى والسؤال والحالة؛ احفظ التركيب كاملًا مع مثال.",
    [ex("Er nimmt an dem Kurs teil.", "هو يشارك في الدورة."), ex("Ich erinnere mich an den Termin.", "أتذكر الموعد.")],
    [word("teilnehmen an + Dativ", "يشارك في"), word("sich erinnern an + Akkusativ", "يتذكر"), word("warten auf + Akkusativ", "ينتظر")],
    rule("حفظ التركيب", "لا تختَر حرف الجر بالترجمة وحدها؛ احفظ الفعل والحرف والحالة مع سؤال wo(r)- أو حرف الجر مع شخص.", "Verb + Präposition + Kasus")),
  make(/Präposition|حروف الجر|Wo bist du|Lokale/i, "حرف الجر يحدد معنى العلاقة وغالبًا يفرض حالة إعرابية ثابتة؛ مع حروف المكان المشتركة يحدد الاتجاه Akkusativ والموقع Dativ.",
    [ex("Ich warte auf den Bus.", "أنتظر الحافلة."), ex("Das Buch liegt auf dem Tisch.", "الكتاب موضوع على الطاولة.")],
    [word("warten auf", "ينتظر"), word("denken an", "يفكر في"), word("mit", "مع")],
    rule("اتجاه أم موقع", "اسأل wohin للحركة نحو هدف و wo للموقع الثابت.", "wohin? + Akkusativ · wo? + Dativ")),
  make(/Pronominaladverbien|Da- und Wo|darüber|worüber/i, "تستبدل da- + حرف الجر شيئًا أو فكرة مذكورة، ويُستخدم wo- + حرف الجر للسؤال عنها.",
    [ex("Ich denke daran.", "أفكر في ذلك."), ex("Worüber sprecht ihr?", "عمّ تتحدثون؟")],
    [word("darauf", "على ذلك/بانتظاره"), word("damit", "بذلك"), word("worüber", "عمّ")],
    rule("الأشخاص والأشياء", "استخدم da-/wo- غالبًا للأشياء والأفكار، وحرف الجر + ضمير مع الأشخاص.", "davon / von ihm")),
  make(/Doppelkonjunktionen|Zweiteilige|Weder|Sowohl|Nicht nur/i, "أدوات الربط الثنائية تربط عنصرين متوازيين؛ حافظ على البنية النحوية نفسها بعد كل جزء.",
    [ex("Sie spricht sowohl Deutsch als auch Englisch.", "هي تتحدث الألمانية والإنجليزية معًا."), ex("Er trinkt weder Kaffee noch Tee.", "لا يشرب قهوة ولا شايًا.")],
    [word("sowohl … als auch", "كلا… و"), word("weder … noch", "لا… ولا"), word("nicht nur … sondern auch", "ليس فقط… بل أيضًا")],
    rule("التوازي", "اربط اسمًا باسم أو صفة بصفة أو جملة بجملة.", "A + Konnektor + B (gleiche Struktur)")),
  make(/Vergleich|المقارنة|التفضيل/i, "تُبنى المقارنة غالبًا بإضافة -er مع als، والتفضيل بصيغة am …-sten أو أداة تعريف ونهاية صفة.",
    [ex("Berlin ist größer als Bonn.", "برلين أكبر من بون."), ex("Heute ist es am wärmsten.", "اليوم هو الأدفأ.")],
    [word("größer", "أكبر"), word("besser", "أفضل"), word("am besten", "الأفضل")],
    rule("المقارنة", "استخدم als بعد Komparativ، و wie عند التساوي.", "größer als · so groß wie")),
  make(/حروف الجر الزمنية/i, "تربط حروف الجر الزمنية الحدث بنقطة أو مدة: um مع الساعة، am مع اليوم وأجزاء اليوم، im مع الشهر والفصل، seit لبداية مستمرة، و vor لوقت سابق.",
    [ex("Der Kurs beginnt um neun Uhr.", "تبدأ الدورة الساعة التاسعة."), ex("Im Sommer fahre ich ans Meer.", "في الصيف أذهب إلى البحر.")],
    [word("um neun Uhr", "الساعة التاسعة"), word("am Montag", "يوم الاثنين"), word("im Mai", "في مايو"), word("seit zwei Jahren", "منذ سنتين")],
    rule("اختيار حرف الزمن", "حدّد هل التعبير ساعة أم يوم أم شهر/فصل أم مدة، ثم اختر الحرف والحالة الملازمة له.", "um + Uhrzeit · am + Tag · im + Monat/Jahreszeit")),
  make(/تصريف الصفات|Adjektivdeklination/i, "نهاية الصفة تعتمد على الأداة والجنس والحالة. ابدأ بتحديد الحالة والأداة قبل اختيار النهاية.",
    [ex("ein guter Freund", "صديق جيد"), ex("mit einer netten Kollegin", "مع زميلة لطيفة")],
    [word("gut", "جيد"), word("nett", "لطيف"), word("wichtig", "مهم")],
    rule("اختيار النهاية", "حدّد الحالة والجنس ونوع الأداة، ثم استخدم جدول نهايات الصفات بدل التخمين.", "Artikel + Adjektivendung + Nomen")),
  make(/العائلة/i, "استخدم مفردات العائلة مع أدواتها، وميّز بين mein و meine عند وصف أفراد أسرتك.",
    [ex("Das ist meine Schwester.", "هذه أختي."), ex("Mein Bruder wohnt in Berlin.", "أخي يسكن في برلين.")],
    [word("der Vater", "الأب"), word("die Mutter", "الأم"), word("die Geschwister", "الإخوة والأخوات")],
    rule("الملكية مع العائلة", "تتغير نهاية ضمير الملكية بحسب جنس اسم فرد العائلة.", "mein Vater · meine Mutter")),
  make(/الألوان/i, "تأتي الألوان بعد sein بلا نهاية، وتأتي قبل الاسم كصفات فتأخذ نهاية مناسبة.",
    [ex("Das Auto ist blau.", "السيارة زرقاء."), ex("Ich kaufe eine rote Jacke.", "أشتري سترة حمراء.")],
    [word("rot", "أحمر"), word("blau", "أزرق"), word("grün", "أخضر")],
    rule("لون خبري أو وصفي", "بعد sein يبقى اللون كما هو؛ قبل الاسم يعامل كصفة.", "Das Hemd ist weiß. · ein weißes Hemd")),
  make(/الطقس/i, "يُوصف الطقس غالبًا بجمل تبدأ بـ es، ويمكن إضافة درجة الحرارة أو ظرف الزمن.",
    [ex("Heute ist es sonnig.", "الجو مشمس اليوم."), ex("Es sind zehn Grad.", "درجة الحرارة عشر درجات.")],
    [word("sonnig", "مشمس"), word("bewölkt", "غائم"), word("regnen", "تمطر")],
    rule("جملة الطقس", "استخدم es كفاعل شكلي مع أوصاف الطقس.", "Es ist + Wetteradjektiv")),
  make(/حوار في المطعم/i, "يتكون حوار المطعم عادةً من طلب طاولة، ثم اختيار الطعام والشراب، ثم طلب الحساب بلغة مهذبة.",
    [ex("Ich hätte gern die Suppe und ein Wasser, bitte.", "أود الحساء وماءً، من فضلك."), ex("Entschuldigung, können wir bitte zahlen?", "عذرًا، هل يمكننا دفع الحساب؟")],
    [word("einen Tisch reservieren", "يحجز طاولة"), word("bestellen", "يطلب"), word("die Rechnung", "الحساب"), word("zahlen", "يدفع")],
    rule("تسلسل الحوار", "ابدأ بطلب مهذب، حدّد الطلب، ثم اختم بالسؤال عن الحساب.", "Begrüßung → Bestellung → Rückfrage → Rechnung")),
  make(/الآيس كريم/i, "عند شراء الآيس كريم نحدد النكهة والعدد أو الوعاء، ثم نسأل عن السعر أو ندفع.",
    [ex("Ich hätte gern zwei Kugeln: Vanille und Schokolade.", "أود كرتين: فانيليا وشوكولاتة."), ex("Im Becher oder in der Waffel?", "في كوب أم في قرطاس؟")],
    [word("die Kugel", "كرة/سكوب"), word("die Sorte", "النكهة/النوع"), word("der Becher", "الكوب"), word("die Waffel", "القرطاس")],
    rule("صياغة الطلب", "استخدم العدد مع Kugel/Kugeln ثم اذكر النكهات، ويمكن إضافة bitte للتلطيف.", "Ich hätte gern + Zahl + Kugel(n) + Sorte")),
  make(/الطعام|المطعم|الآيس كريم/i, "تعلّم اسم الطعام مع أداته، واستخدم صيغة مهذبة عند الطلب أو السؤال عن السعر.",
    [ex("Ich hätte gern einen Tee.", "أود كوب شاي."), ex("Was kostet die Suppe?", "كم ثمن الحساء؟")],
    [word("das Brot", "الخبز"), word("das Wasser", "الماء"), word("das Gemüse", "الخضار"), word("das Obst", "الفاكهة"), word("das Frühstück", "الفطور"), word("bestellen", "يطلب")],
    rule("الطلب المهذب", "تأتي الصيغة ich hätte gern مع الشيء المطلوب غالبًا في Akkusativ.", "Ich hätte gern + Akkusativ")),
  make(/الملابس|الثياب/i, "احفظ قطعة الملابس مع أداة الاسم، واستخدم الألوان والمقاسات والصفات عند الاختيار والشراء.",
    [ex("Die Hose ist zu groß.", "السروال كبير جدًا."), ex("Kann ich die Jacke anprobieren?", "هل يمكنني تجربة السترة؟")],
    [word("die Hose – die Hosen", "السروال — السراويل"), word("die Jacke – die Jacken", "السترة — السترات"), word("das Hemd – die Hemden", "القميص — القمصان"), word("anprobieren", "يجرّب لباسًا")],
    rule("وصف المقاس", "استخدم sein مع passend أو zu groß/klein لوصف ملاءمة القطعة.", "Die Größe ist passend/zu groß/zu klein.")),
  make(/حوار في محل الثياب/i, "في محل الملابس اسأل عن القطعة والمقاس واللون والسعر، ثم اطلب تجربة القطعة وردّ على سؤال البائع بوضوح.",
    [ex("Haben Sie diese Jacke in Größe M?", "هل لديكم هذه السترة بالمقاس M؟"), ex("Was kostet die Hose, und kann ich sie anprobieren?", "كم ثمن السروال، وهل يمكنني تجربته؟")],
    [word("die Größe", "المقاس"), word("die Umkleidekabine", "غرفة القياس"), word("kosten", "يكلّف"), word("passen", "يناسب")],
    rule("تسلسل حوار الشراء", "حدّد القطعة ثم اسأل عن المقاس أو اللون والسعر، وبعد التجربة اذكر إن كانت مناسبة.", "Kleidungsstück → Größe/Farbe → Preis → Anprobe")),
  make(/أجزاء الجسم/i, "احفظ أجزاء الجسم مع أدواتها، واستعملها في جمل تصف الألم أو الحركة أو العناية بالصحة.",
    [ex("Mein Kopf tut weh.", "رأسي يؤلمني."), ex("Ich wasche mir die Hände.", "أغسل يديّ.")],
    [word("der Kopf", "الرأس"), word("die Hand", "اليد"), word("der Rücken", "الظهر")],
    rule("التعبير عن الألم", "يأتي الجزء الذي يؤلم كفاعل مع wehtun، ويتغير الفعل مع المفرد والجمع.", "Der Kopf tut weh. · Die Augen tun weh.")),
  make(/المنزل/i, "اربط مفردات المنزل بمكانها ووظيفتها، وتعلّم الاسم مع الأداة والجمع عند الحاجة.",
    [ex("Der Tisch steht im Wohnzimmer.", "الطاولة في غرفة الجلوس."), ex("In der Küche gibt es einen Kühlschrank.", "يوجد في المطبخ ثلاجة.")],
    [word("das Wohnzimmer", "غرفة الجلوس"), word("die Küche", "المطبخ"), word("der Schrank", "الخزانة")],
    rule("وصف المكان", "استخدم in مع Dativ للموقع الثابت، و es gibt مع Akkusativ لذكر الموجودات.", "im Zimmer · es gibt einen/eine/ein …")),
  make(/الحيوانات/i, "تعلّم الحيوان مع أداة الاسم وصيغة الجمع، ثم صف شكله أو موطنه أو ما يستطيع فعله.",
    [ex("Der Hund kann schnell laufen.", "يستطيع الكلب الجري بسرعة."), ex("Katzen sind oft neugierig.", "القطط فضولية غالبًا.")],
    [word("der Hund", "الكلب"), word("die Katze", "القطة"), word("das Pferd", "الحصان")],
    rule("وصف القدرة", "استخدم können مع مصدر في نهاية الجملة لوصف ما يستطيع الحيوان فعله.", "Tier + kann/können + … + Infinitiv")),
  make(/Dies|أسماء الإشارة/i, "جذر dies- يأخذ نهايات مشابهة لأداة التعريف وفق الجنس والحالة.",
    [ex("Dieses Buch ist interessant.", "هذا الكتاب ممتع."), ex("Ich kaufe diese Tasche.", "أشتري هذه الحقيبة.")],
    [word("dieser", "هذا للمذكر"), word("diese", "هذه/هؤلاء"), word("dieses", "هذا للمحايد")],
    rule("اسم الإشارة", "اختر نهاية dies- كما تختار der/die/das أو den/dem بحسب الحالة.", "dies- + Kasusendung + Nomen"),
    [table("dies- في Nominativ و Akkusativ", ["الجنس/العدد", "Nominativ", "Akkusativ"], [["مذكر", "dieser", "diesen"], ["مؤنث", "diese", "diese"], ["محايد", "dieses", "dieses"], ["جمع", "diese", "diese"]])]),
  make(/welch/i, "welch- يسأل عن اختيار محدد، وتأخذ نهايته نهاية أداة التعريف المناسبة للجنس والحالة.",
    [ex("Welches Buch liest du?", "أي كتاب تقرأ؟"), ex("Welche Farbe magst du?", "أي لون تحب؟")],
    [word("welcher", "أيّ للمذكر"), word("welche", "أيّ للمؤنث/الجمع"), word("welches", "أيّ للمحايد")],
    rule("اختيار النهاية", "حدّد جنس الاسم وحالته ثم أضف النهاية إلى welch-.", "welch- + Kasusendung + Nomen")),
  make(/\-bar|اللاحقة/i, "تُضاف -bar إلى بعض جذور الأفعال لتكوين صفة بمعنى: يمكن أن يُفعل أو قابل لـ.",
    [ex("Die Aufgabe ist lösbar.", "المهمة قابلة للحل."), ex("Der Text ist gut lesbar.", "النص سهل القراءة.")],
    [word("lesbar", "قابل للقراءة"), word("machbar", "قابل للتنفيذ"), word("erreichbar", "يمكن الوصول إليه")],
    rule("اشتقاق -bar", "احذف نهاية المصدر -en عند الحاجة ثم أضف -bar، مع الانتباه إلى الصيغ الثابتة.", "Verbstamm + bar")),
  make(/Pronomen MAN|jemand|niemand|irgend|Pronomen|Adverbien mit/i, "تُستخدم الضمائر غير المحددة عندما لا نعرف الشخص أو المكان بدقة أو لا نريد تحديده.",
    [ex("Man spricht hier Deutsch.", "يتحدث الناس هنا الألمانية."), ex("Ich habe niemanden gesehen.", "لم أرَ أحدًا.")],
    [word("man", "المرء/الناس"), word("jemand", "شخص ما"), word("irgendwo", "في مكان ما")],
    rule("التصريف مع man", "يأتي man دائمًا مع فعل في صيغة المفرد الغائب، ويتغير jemand/niemand بحسب الحالة.", "man + Verb (3. Person Singular)")),
  make(/Verben mit Dativ und Akkusativ/i, "بعض الأفعال مثل geben و schicken و erklären تأخذ شخصًا في Dativ وشيئًا في Akkusativ. يتأثر ترتيب المفعولين بكونهما اسمين أو ضميرين.",
    [ex("Ich gebe dem Kind das Buch.", "أعطي الطفل الكتاب."), ex("Ich gebe es ihm.", "أعطيه إياه.")],
    [word("jemandem etwas geben", "يعطي شخصًا شيئًا"), word("jemandem etwas schicken", "يرسل إلى شخص شيئًا"), word("jemandem etwas erklären", "يشرح لشخص شيئًا")],
    rule("ترتيب المفعولين", "مع اسمين يأتي Dativ غالبًا قبل Akkusativ؛ والضمير يسبق الاسم، ومع ضميرين يأتي Akkusativ قبل Dativ.", "Dat.-Nomen + Akk.-Nomen · Akk.-Pronomen + Dat.-Pronomen"),
    [table("ترتيب Dativ و Akkusativ", ["نوع المفعولين", "الترتيب", "مثال"], [["اسمان", "Dativ ثم Akkusativ", "dem Kind das Buch"], ["ضمير + اسم", "الضمير أولًا", "es dem Kind / ihm das Buch"], ["ضميران", "Akkusativ ثم Dativ", "es ihm"]])]),
  make(/الظروف الزمنية|Lokal- und Temporaladverbien/i, "تحدد الظروف متى أو أين يحدث الفعل، ويمكن وضعها أول الجملة مع بقاء الفعل المصرف في الموقع الثاني.",
    [ex("Morgen fahre ich nach Köln.", "غدًا أسافر إلى كولونيا."), ex("Dort treffe ich meine Freunde.", "هناك ألتقي أصدقائي.")],
    [word("heute", "اليوم"), word("morgen", "غدًا"), word("dort", "هناك")],
    rule("الظرف في البداية", "إذا بدأنا بالظرف يأتي الفعل بعده مباشرة ثم الفاعل.", "Adverb + Verb + Subjekt + …")),
  make(/الجمع/i, "لا توجد نهاية جمع واحدة لكل الأسماء الألمانية، لذلك احفظ المفرد مع الأداة وصيغة الجمع معًا.",
    [ex("das Buch – die Bücher", "الكتاب — الكتب"), ex("die Frau – die Frauen", "المرأة — النساء")],
    [word("das Kind – die Kinder", "الطفل — الأطفال"), word("der Tag – die Tage", "اليوم — الأيام"), word("das Auto – die Autos", "السيارة — السيارات")],
    rule("حفظ صيغة الجمع", "دوّن لكل اسم: الأداة والمفرد والجمع، وانتبه إلى تغيّر حرف العلة أو إضافة نهاية.", "Artikel + Singular → die + Plural")),
  make(/الصفات وعكسها|Adjektive und Gegenteil/i, "احفظ الصفة مع ضدّها في زوج، ثم استخدم كل صفة في سياق يوضح الفرق؛ بعض الأضداد تتغير بحسب المقام ولا تكون ترجمة آلية واحدة.",
    [ex("Die Tasche ist leicht, aber der Koffer ist schwer.", "الحقيبة خفيفة، لكن حقيبة السفر ثقيلة."), ex("Der Weg ist kurz, nicht lang.", "الطريق قصير، وليس طويلًا.")],
    [word("groß ↔ klein", "كبير ↔ صغير"), word("schnell ↔ langsam", "سريع ↔ بطيء"), word("hell ↔ dunkel", "فاتح/مضيء ↔ داكن")],
    rule("تعلّم الأضداد", "اكتب الزوج في جملة مقارنة أو تضاد حتى يثبت المعنى والاستعمال.", "A ist …, aber B ist …")),
  make(/الصفات|Adjektive|Wortschatz|الكلمات|المفردات|الحيوانات|العائلة|الألوان|الطقس|الطعام|الملابس|الجسم|المنزل/i, "تعلّم المفردة مع أداة الاسم وصيغة الجمع أو مع عكس الصفة وسياق قصير، لا كترجمة منفردة فقط.",
    [ex("Das Wetter ist heute schön.", "الطقس جميل اليوم."), ex("Ich brauche eine warme Jacke.", "أحتاج إلى سترة دافئة.")],
    [word("wichtig", "مهم"), word("praktisch", "عملي"), word("benutzen", "يستخدم")],
    rule("تثبيت المفردات", "اكتب لكل كلمة مثالًا قصيرًا يوضح الأداة أو الفعل المصاحب لها.", "Wort + typische Verbindung + Beispielsatz")),
  make(/التحيات وتقديم النفس|تطبيق التعريف بالنفس|Sich vorstellen|التعريف بالنفس/i, "يبدأ التعارف بتحية مناسبة، ثم الاسم والبلد ومكان السكن والعمر أو العمل عند الحاجة، وينتهي بعبارة وداع. استخدم du في المواقف الودية و Sie في الرسمية.",
    [ex("Guten Tag, ich heiße Salma und komme aus Marokko.", "مرحبًا، اسمي سلمى وأنا من المغرب."), ex("Ich wohne in Rabat. Und du?", "أسكن في الرباط. وأنت؟")],
    [word("sich vorstellen", "يعرّف بنفسه"), word("kommen aus", "ينحدر من/يأتي من"), word("wohnen in", "يسكن في"), word("Auf Wiedersehen", "إلى اللقاء")],
    rule("بطاقة التعارف", "اربط كل معلومة بسؤالها: الاسم مع wie heißen، والبلد مع woher kommen، والسكن مع wo wohnen.", "Begrüßung → Name → Herkunft/Wohnort → Abschied")),
  make(/Das Verb LASSEN/i, "يستعمل lassen للسماح أو ترك شيء كما هو أو جعل شخص آخر ينفذ عملًا. يُصرّف lassen ويأتي الفعل الآخر مصدرًا بلا zu في نهاية الجملة.",
    [ex("Ich lasse mein Fahrrad reparieren.", "أجعل شخصًا يصلح دراجتي."), ex("Lass das Fenster offen!", "اترك النافذة مفتوحة!")],
    [word("jemanden etwas machen lassen", "يدع شخصًا يفعل شيئًا"), word("etwas machen lassen", "يطلب تنفيذ شيء"), word("sich lassen", "يمكن/يكون قابلًا")],
    rule("تركيب lassen", "صرّف lassen مع الفاعل وضع مصدر الفعل الدلالي في نهاية الجملة من دون zu.", "Subjekt + lässt/lassen + … + Infinitiv")),
  make(/Damit und Weil|Weil und Damit/i, "تقدّم weil سببًا يجيب عن warum، بينما تقدّم damit غاية أو هدفًا يجيب عن wozu. كلتاهما تفتح جملة تابعة والفعل المصرف في نهايتها.",
    [ex("Ich lerne Deutsch, weil ich in Berlin arbeite.", "أتعلم الألمانية لأنني أعمل في برلين."), ex("Ich spreche langsam, damit du mich verstehst.", "أتحدث ببطء لكي تفهمني.")],
    [word("weil", "لأن — سبب"), word("damit", "لكي — غاية"), word("der Grund", "السبب"), word("das Ziel", "الهدف")],
    rule("سبب أم غاية", "اسأل: هل أشرح لماذا حدث الشيء أم ما الهدف منه؟ ثم ضع الفعل في نهاية الجملة التابعة.", "Grund → weil · Ziel → damit")),
  make(/الروتين اليومي/i, "رتّب أنشطة اليوم زمنيًا، واستخدم الساعة والظروف وروابط بسيطة؛ تنفصل سوابق الأفعال القابلة للانفصال في الجملة الرئيسية.",
    [ex("Um sieben Uhr stehe ich auf.", "أستيقظ الساعة السابعة."), ex("Danach fahre ich zur Arbeit.", "بعد ذلك أذهب إلى العمل.")],
    [word("aufstehen", "يستيقظ"), word("frühstücken", "يفطر"), word("danach", "بعد ذلك"), word("am Abend", "في المساء")],
    rule("ترتيب الروتين", "ابدأ بظرف زمني أو نشاط، وحافظ على الفعل المصرف في الموقع الثاني.", "Zeitangabe + Verb + Subjekt + …")),
  make(/الحديث عن نهاية الأسبوع/i, "لرواية عطلة نهاية الأسبوع رتّب الأحداث، واذكر المكان والأشخاص والنشاط والانطباع. استخدم Perfekt غالبًا عند الحديث عن الماضي.",
    [ex("Am Samstag habe ich Freunde besucht.", "يوم السبت زرت أصدقاء."), ex("Danach sind wir ins Kino gegangen.", "بعد ذلك ذهبنا إلى السينما.")],
    [word("am Wochenende", "في عطلة نهاية الأسبوع"), word("zuerst", "أولًا"), word("danach", "بعد ذلك"), word("zum Schluss", "في النهاية")],
    rule("سرد مترابط", "استخدم مؤشرات زمنية واختر haben أو sein في Perfekt بحسب الفعل.", "zuerst → danach → später → zum Schluss")),
  make(/رسائل امتحان A1/i, "تبدأ رسالة A1 بتحية مناسبة، وتغطي كل نقاط المطلوب بجمل قصيرة واضحة، ثم تنتهي بعبارة ختام واسم المرسل.",
    [ex("Liebe Anna, vielen Dank für deine Einladung.", "عزيزتي آنا، شكرًا جزيلًا على دعوتك."), ex("Viele Grüße\nMona", "مع أطيب التحيات\nمنى")],
    [word("die Anrede", "التحية الافتتاحية"), word("der Betreff", "الموضوع"), word("die Grußformel", "عبارة الختام"), word("absagen", "يعتذر عن الحضور")],
    rule("تغطية المطلوب", "حوّل كل نقطة في السؤال إلى جملة، ثم راجع موضع الفعل والحروف الكبيرة والتحية والخاتمة.", "Anrede → 3 Inhaltspunkte → Gruß → Name")),
  make(/كيف تطلب وتجاوب|الطلب والجواب/i, "في مهمة الطلب والرد صِغ طلبًا واضحًا ومهذبًا انطلاقًا من الموقف أو البطاقة، ثم اقبل الطلب أو ارفضه بجملة كاملة ومناسبة.",
    [ex("Können Sie mir bitte das Salz geben? – Ja, natürlich.", "هل يمكنك إعطائي الملح من فضلك؟ — نعم، بالطبع."), ex("Bitte öffnen Sie das Fenster. – Tut mir leid, das geht gerade nicht.", "افتح النافذة من فضلك. — عذرًا، لا يمكن ذلك الآن.")],
    [word("bitten", "يطلب"), word("natürlich", "بالطبع"), word("Tut mir leid", "أنا آسف"), word("das geht", "هذا ممكن")],
    rule("طلب ثم رد", "استخدم bitte وصيغة سؤال أو أمر مهذب، ثم أعطِ ردًا مفهومًا بدل كلمة منفردة.", "Bitte/Könnten Sie …? → Ja, gern. / Tut mir leid, …")),
  make(/الروتين|نهاية الأسبوع|التعريف بالنفس|تقديم النفس|التحيات|مطعم|الطلب والجواب|السؤال والجواب|محل|حوار/i, "ابنِ الحوار من وحدات قصيرة: تحية أو افتتاح، سؤال واضح، جواب مناسب، ثم ختام مهذب.",
    [ex("Guten Tag! Ich hätte gern einen Kaffee.", "مرحبًا! أود قهوة."), ex("Können Sie mir bitte helfen?", "هل يمكنك مساعدتي من فضلك؟")],
    [word("Guten Tag", "مرحبًا"), word("ich hätte gern", "أود"), word("bitte", "من فضلك")],
    rule("الجملة المهذبة", "استخدم Sie وصيغًا مثل ich hätte gern أو könnten Sie في المواقف الرسمية.", "Könnten Sie bitte …?")),
  make(/اختبار|امتحان|Prüfung|Leseverstehen/i, "اقرأ المطلوب أولًا، حدّد المهارة المقاسة، ثم حل السؤال اعتمادًا على القرائن النحوية والسياق قبل مراجعة الإجابة.",
    [ex("Ich lese zuerst die Aufgabe.", "أقرأ المهمة أولًا."), ex("Danach prüfe ich meine Antwort.", "بعد ذلك أراجع إجابتي.")],
    [word("die Aufgabe", "المهمة/السؤال"), word("die Lösung", "الحل"), word("überprüfen", "يراجع")],
    rule("استراتيجية الحل", "استبعد الخيارات المخالفة للقاعدة ثم قارن الباقي بمعنى الجملة.", "Aufgabe → Regel → Kontext → Kontrolle")),
];

function make(pattern, concept, examples, vocabulary, grammarRule, tables = []) {
  return { pattern, concept, examples, vocabulary, grammar_rules: [grammarRule], tables };
}
function ex(de, ar, note = "") { return { de, ar, note }; }
function word(de, ar, note = "") { return { de, ar, note }; }
function rule(name, explanation, pattern = "") { return { rule: name, explanation, pattern }; }
function table(title, headers, rows) { return { title, headers, rows }; }

function fallbackProfile(lesson) {
  return {
    concept: `ابدأ بفهم معنى ${lesson.focus} في سياق بسيط، ثم لاحظ شكل الجملة وطبّقه على مثال من حياتك.`,
    examples: [ex("Ich lerne heute Deutsch.", "أتعلم الألمانية اليوم."), ex("Kannst du ein Beispiel geben?", "هل يمكنك إعطاء مثال؟")],
    vocabulary: [word("das Beispiel", "المثال"), word("üben", "يتدرّب"), word("verstehen", "يفهم")],
    grammar_rules: [rule("طريقة التطبيق", "حدّد العنصر المطلوب في الجملة، طبّق القاعدة، ثم اقرأ الجملة كاملة للتأكد من المعنى.", "Regel erkennen → Form wählen → Satz prüfen")],
    tables: [],
  };
}

function profileFor(lesson) {
  const haystack = `${lesson.focus} ${lesson.title}`;
  const priorityPatterns = [
    /الأفعال المساعدة في الماضي/i,
    /الأفعال غير المنتظمة في الماضي/i,
    /Temporale Nebensätze mit NACHDEM/i,
    /Konjunktiv I \(Indirekte Rede\).*Teil 2/i,
    /Konjunktiv I mit W-Fragen/i,
    /Konjunktiv II|Als ob|Irreale/i,
    /Konjunktiv I(?!I)|Indirekte Rede/i,
    /Pronominaladverbien|Da- und Wo|darüber|worüber/i,
    /Relativsätze im Genitiv|Relativpronomen \(Genitive Case\)/i,
    /Relativ|الموصولة/i,
    /Passiv في الماضي|Passiv بالماضي/i,
    /Passiv مع الأفعال المساعدة|Passiv mit Modalverben/i,
    /Passiv|المبني للمجهول/i,
    /Plusquamperfekt/i,
    /Futur II|vollendete Zukunft/i,
    /Präteritum|الماضي البسيط/i,
    /Perfekt|الماضي باللغة|أفعال مع sein بالماضي|تطبيقات الماضي/i,
    /حروف الجر مع Akkusativ/i,
    /حروف الجر مع Dativ/i,
    /حروف الجر الزمنية/i,
    /an \+ Dativ/i,
    /an \+ Akkusativ/i,
    /Verben mit (?:der )?Präposition|Präpositionalobjekte|أفعال مع حروف الجر/i,
    /Präposition|حروف الجر|Wo bist du|Lokale/i,
    /تصريف الصفات|Adjektivdeklination/i,
    /Verben mit Dativ und Akkusativ/i,
    /welch/i,
    /حوار في محل الثياب/i,
    /أدوات ربط الجمل/i,
    /Damit und Weil|Weil und Damit/i,
    /Das Verb LASSEN/i,
    /كيف تطلب وتجاوب|الطلب والجواب/i,
    /التحيات وتقديم النفس|تطبيق التعريف بالنفس|Sich vorstellen|التعريف بالنفس/i,
    /الأعداد الترتيبية/i,
    /التاريخ|الأشهر|فصول|أيام الأسبوع|الترتيبية/i,
    /ohne ZU/i,
    /Um\.\.\. zu|Finalsätze|Kausalsätze/i,
    /Infinitiv.*zu|Verben mit ZU|المصدر/i,
  ];
  for (const pattern of priorityPatterns) {
    if (!pattern.test(haystack)) continue;
    const prioritized = profiles.find((profile) => profile.pattern.source === pattern.source);
    if (prioritized) return prioritized;
  }
  return profiles.find((profile) => profile.pattern.test(haystack)) ?? fallbackProfile(lesson);
}

function videoId(url) {
  const parsed = new URL(url);
  return parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1).split("/")[0] : parsed.searchParams.get("v") ?? "";
}

const unusableCaptionIds = new Set([
  // Both available tracks are heavily garbled automatic captions and cannot
  // support a faithful source claim, even though the lesson metadata is clear.
  "qDtqMf8LT5Q",
  "lF-dNXa9Nug",
  "9M2D1eUKyZE",
]);

async function captionEvidence(id) {
  if (!captionDirectory || unusableCaptionIds.has(id)) return null;
  for (const language of ["ar", "de"]) {
    const file = path.join(captionDirectory, `${id}.${language}.json3`);
    try {
      const details = await stat(file);
      if (details.size < 200) continue;
      const data = JSON.parse(await readFile(file, "utf8"));
      const text = (data.events ?? []).flatMap((event) => event.segs ?? []).map((segment) => segment.utf8 ?? "").join("").trim();
      if (text.length >= 80) return { language, text_length: text.length };
    } catch {
      // Missing or malformed temporary caption files are treated as unavailable.
    }
  }
  return null;
}

function requiresVideo(task) {
  return /استمع|ردد|النطق|صوت|الفيديو|سماع|شاهد|المعلّم|المعلم|البث/.test(task.text);
}

function taskRequiresLessonVideo(lesson, task) {
  const lessonText = `${lesson.focus} ${lesson.title}`;
  return requiresVideo(task) || /اختبار|اختبر نفسك/.test(lessonText);
}

function guidanceFor(lesson, task) {
  const text = task.text;
  if (taskRequiresLessonVideo(lesson, task)) return "اقرأ القاعدة والأمثلة أولًا، ثم استخدم الفيديو للجزء السمعي أو للأسئلة والأمثلة الخاصة بالدرس؛ لا تعتمد على التخمين ولا تدّعِ إكمال ما لا يظهر في الصفحة.";
  if (/جدول|تصريف/.test(text)) return "حدّد الضمير والزمن أولًا، ثم املأ كل خانة من القاعدة نفسها وراجع توافق الفعل مع الفاعل.";
  if (/صحح|خطأ/.test(text)) return "حدّد موضع الخطأ قبل التصحيح: الأداة أو الحالة أو نهاية الفعل أو ترتيب الكلمات، ثم اكتب سببًا قصيرًا.";
  if (/اختر|أكمل|فراغ/.test(text)) return "اقرأ الجملة كاملة، حدّد الوظيفة النحوية والمعنى، ثم اختر الصيغة وراجع النهاية أو موقع الفعل.";
  if (/حوّل|أعد صياغة|ادمج/.test(text)) return "حافظ على المعنى والفاعل والزمن، وغيّر البنية المطلوبة فقط ثم افحص موقع الأفعال والضمائر.";
  if (/اكتب|كوّن|أنشئ|فقرة|نص/.test(text)) return "خطط للفكرة بجمل قصيرة، طبّق النمط في كل جملة، ثم راجع التصريف والترتيب من دون نسخ الأمثلة حرفيًا.";
  if (/صنّف|حدّد|استخرج/.test(text)) return "ابحث عن العلامة التي تميّز كل فئة، وسجّل سبب التصنيف بكلمة أو قاعدة قصيرة قبل الانتقال إلى المثال التالي.";
  return "ارجع إلى الملخص والقاعدة والأمثلة، ثم نفّذ المهمة خطوة خطوة وراجع أن الصيغة تخدم المعنى المطلوب.";
}

function mistakesFor(lesson) {
  const value = `${lesson.focus} ${lesson.title}`;
  const mistake = (wrong, correct, explanation) => [{ wrong, correct, explanation }];
  if (/sein|haben|الضمائر الشخصية/i.test(value)) return mistake("Ich sein müde.", "Ich bin müde.", "يجب تصريف sein مع الضمير ich.");
  if (/أدوات التعريف|التنكير/.test(value)) return mistake("Das ist eine Tisch.", "Das ist ein Tisch.", "Tisch اسم مذكر، لذلك نستخدم ein.");
  if (/الملكية|Possessiv/i.test(value)) return mistake("Das ist meine Bruder.", "Das ist mein Bruder.", "Bruder مذكر في Nominativ، لذلك لا تُضاف e.");
  if (/Akkusativ|الأكوزاتيف|النصب/i.test(value)) return mistake("Ich sehe der Mann.", "Ich sehe den Mann.", "المفعول المذكر يأخذ den في Akkusativ.");
  if (/Dativ|الداتيف|الجر غير المباشر/i.test(value)) return mistake("Ich helfe den Mann.", "Ich helfe dem Mann.", "الفعل helfen يطلب Dativ.");
  if (/Genitiv|المضاف إليه/i.test(value)) return mistake("Das Auto der Mann ist neu.", "Das Auto des Mannes ist neu.", "المذكر يأخذ des، ويضاف غالبًا s أو es إلى الاسم.");
  if (/Reflexiv|المنعكسة/i.test(value)) return mistake("Ich freue dich.", "Ich freue mich.", "الضمير المنعكس يجب أن يعود على الفاعل ich.");
  if (/القابلة.*(?:الانفصال|للانفصال)|trennbar/i.test(value)) return mistake("Ich aufstehe um sieben Uhr.", "Ich stehe um sieben Uhr auf.", "في الجملة الرئيسية ينفصل الجزء الأول ويأتي في النهاية.");
  if (/Modalverben|الأفعال المساعدة/i.test(value)) return mistake("Ich kann Deutsch spreche.", "Ich kann Deutsch sprechen.", "بعد الفعل الناقص يأتي المصدر بلا تصريف.");
  if (/النفي/.test(value)) return mistake("Ich habe nicht Auto.", "Ich habe kein Auto.", "يُنفي الاسم النكرة هنا بـ kein.");
  if (/الجملة الجانبية|weil|da|bevor|Nebensätze|Temporale/i.test(value)) return mistake("…, weil ich bin müde.", "…, weil ich müde bin.", "الفعل المصرف يأتي في نهاية الجملة التابعة.");
  if (/Infinitiv.*zu|Verben mit ZU|المصدر/i.test(value)) return mistake("Ich versuche, zu früher schlafen.", "Ich versuche, früher zu schlafen.", "تأتي zu مباشرة قبل المصدر البسيط.");
  if (/ohne ZU/i.test(value)) return mistake("Ich kann zu schwimmen.", "Ich kann schwimmen.", "بعد الفعل الناقص لا نستخدم zu.");
  if (/Perfekt|الماضي باللغة|أفعال مع sein بالماضي|تطبيقات الماضي/i.test(value)) return mistake("Ich habe nach Berlin gefahren.", "Ich bin nach Berlin gefahren.", "fahren مع انتقال مكاني يستخدم sein في Perfekt.");
  if (/Plusquamperfekt/i.test(value)) return mistake("Nachdem ich gegessen habe, ging ich.", "Nachdem ich gegessen hatte, ging ich.", "الحدث الأسبق من حدث ماضٍ يحتاج Plusquamperfekt.");
  if (/Futur II/i.test(value)) return mistake("Ich werde den Bericht schreiben haben.", "Ich werde den Bericht geschrieben haben.", "يحتاج Futur II إلى Partizip II ثم haben أو sein.");
  if (/Passiv|المبني للمجهول/i.test(value)) return mistake("Der Brief ist geschrieben jeden Tag.", "Der Brief wird jeden Tag geschrieben.", "مجهول الحدث في الحاضر يُبنى من werden وPartizip II.");
  if (/Partizip I|Partizip II als|Partizipien/i.test(value)) return mistake("das schlafen Kind", "das schlafende Kind", "Partizip I يُبنى من المصدر مع d ثم يأخذ نهاية الصفة.");
  if (/Relativ|الموصولة/i.test(value)) return mistake("Der Mann, ich kenne, kommt.", "Der Mann, den ich kenne, kommt.", "تحتاج الجملة ضمير وصل في Akkusativ لأنه مفعول kennen.");
  if (/Konjunktiv II|Als ob|Irreale/i.test(value)) return mistake("Wenn ich Zeit habe, würde ich reisen.", "Wenn ich Zeit hätte, würde ich reisen.", "في الشرط غير الواقعي نستخدم Konjunktiv II في الجملة التابعة أيضًا.");
  if (/Konjunktiv I(?!I)|Indirekte Rede/i.test(value)) return mistake("Er sagt, er ist krank.", "Er sagt, er sei krank.", "في النقل الرسمي المحايد نستخدم Konjunktiv I.");
  if (/Präposition|حروف الجر|Präpositional|Wo bist du|Lokale/i.test(value)) return mistake("Ich warte für den Bus.", "Ich warte auf den Bus.", "الفعل warten يرتبط بحرف الجر auf.");
  return [];
}

function readingTime(level, lesson) {
  const base = { A1: 3, A2: 4, B1: 5, B2: 6 }[level];
  return Math.min({ A1: 4, A2: 5, B1: 7, B2: 8 }[level], base + (lesson.tasks.length >= 5 ? 1 : 0));
}

function learningMethod(level, lesson) {
  const methods = {
    A1: `في موضوع ${lesson.focus}، اقرأ المثال ببطء، حدّد الكلمة الجديدة أو الفعل المصرف، ثم بدّل عنصرًا واحدًا لتكوين جملة قصيرة من حياتك.`,
    A2: `في موضوع ${lesson.focus}، حدّد القاعدة والسياق العملي أولًا، ثم غيّر الفاعل أو الحالة أو الزمن في المثال وراجع النهايات وترتيب الكلمات.`,
    B1: `في موضوع ${lesson.focus}، قارن بين الشكل والمعنى، ثم أعد بناء المثال في جملة مترابطة واشرح لنفسك سبب موضع الفعل أو اختيار الحالة.`,
    B2: `في موضوع ${lesson.focus}، راقب المعنى الدقيق والسجل وبنية الجملة، ثم أعد الصياغة بأسلوب بديل وتحقق من أن الفرق المقصود ما زال واضحًا.`,
  };
  return methods[level];
}

async function createEntry(level, lesson) {
  const profile = profileFor(lesson);
  const id = videoId(lesson.url);
  const captions = await captionEvidence(id);
  const sourceType = captions ? "captions" : "metadata";
  return {
    level,
    lesson_id: lesson.id,
    video_id: id,
    source_type: sourceType,
    caption_language: captions?.language ?? null,
    reading_time_minutes: readingTime(level, lesson),
    summary: `${lesson.what_you_learn} يقدّم هذا الشرح الفكرة بصورة مركّزة حتى تتمكن من تطبيقها في مهام الدرس دون نسخ إجابات جاهزة.`,
    learning_objectives: [lesson.what_you_learn, lesson.conversational_goal],
    explanation: [
      { heading: "الفكرة الأساسية", content: profile.concept },
      { heading: "طريقة التعلّم", content: learningMethod(level, lesson) },
    ],
    grammar_rules: profile.grammar_rules,
    examples: profile.examples,
    vocabulary: profile.vocabulary,
    common_mistakes: mistakesFor(lesson),
    tables: profile.tables,
    quick_recap: [
      `المحور: ${lesson.focus}.`,
      profile.grammar_rules[0].explanation,
      "كوّن مثالًا جديدًا من حياتك ثم راجع المعنى والشكل معًا.",
    ],
    task_preparation: lesson.tasks.map((task, taskIndex) => ({
      task_index: taskIndex,
      guidance: guidanceFor(lesson, typeof task === "string" ? { text: task } : task),
      video_required: taskRequiresLessonVideo(lesson, typeof task === "string" ? { text: task } : task),
    })),
    review_status: captions ? "verified" : "generated_from_metadata",
  };
}

await mkdir(outputDirectory, { recursive: true });
let total = 0;
let captionCount = 0;
for (const level of levels) {
  const source = JSON.parse(await readFile(path.join(root, "src", "data", `${level.toLowerCase()}Lessons.json`), "utf8"));
  const entries = [];
  for (const lesson of source.lessons) entries.push(await createEntry(level, lesson));
  captionCount += entries.filter((entry) => entry.source_type === "captions").length;
  total += entries.length;
  await writeFile(path.join(outputDirectory, `${level.toLowerCase()}Documentation.json`), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

console.log(`Generated ${total} documentation entries (${captionCount} caption-grounded, ${total - captionCount} metadata-grounded).`);
