import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documentationPath = path.join(root, "src", "data", "documentation", "a1Documentation.json");
const origin = "editorial_clarification";
const E = (heading, content) => ({ heading, content, origin });
const X = (de, ar, note = "مثال تعليمي إضافي") => ({ de, ar, note, origin });
const M = (wrong, correct, explanation) => ({ wrong, correct, explanation, origin });
const pack = (explanations, examples, mistakes) => ({
  explanations: explanations.map(([a, b]) => E(a, b)),
  examples: examples.map(([a, b, c]) => X(a, b, c)),
  mistakes: mistakes.map(([a, b, c]) => M(a, b, c)),
});

const groups = {
  alphabet: pack([
    ["الحرف والصوت", "استمع إلى صوت الحرف داخل الكلمة ولا تعتمد على اسمه فقط. كرر الكلمة ببطء ثم بسرعة طبيعية."],
    ["التهجئة", "عند تهجئة الاسم ننطق كل حرف منفردًا. انتبه إلى Ä وÖ وÜ وß وإلى اختلاف نطق V وW وJ عن الإنجليزية."],
  ], [["Wie heißt du?", "ما اسمك؟"], ["Ich heiße Lina.", "اسمي لينا."], ["Wie schreibt man das?", "كيف تُكتب ذلك؟"], ["L-I-N-A", "ل، ي، ن، ا — تهجئة الاسم." ]], [["W مثل الإنجليزية", "W يُنطق قريبًا من ڤ", "اربط الحرف بمثال ألماني مسموع."], ["ei = إي", "ei يُنطق آي غالبًا", "تدرب على mein و nein."]]),
  numbers: pack([
    ["الآحاد قبل العشرات", "من 21 نقول الآحاد ثم und ثم العشرات: einundzwanzig. تُكتب الكلمة العددية متصلة."],
    ["الأرقام في الحياة اليومية", "درّب الأعداد داخل العمر والسعر ورقم الهاتف والوقت بدل حفظ القائمة وحدها."],
  ], [["Ich bin achtundzwanzig Jahre alt.", "عمري ثمانية وعشرون عامًا."], ["Das kostet fünfzehn Euro.", "هذا يكلف خمسة عشر يورو."], ["Meine Nummer ist null eins sieben sechs.", "رقمي هو صفر واحد سبعة ستة."], ["Wir sind drei Personen.", "نحن ثلاثة أشخاص."]], [["zwanzig und eins", "einundzwanzig", "في الأعداد المركبة تأتي الآحاد قبل العشرات."], ["zwei Euro und fünfzig", "zwei Euro fünfzig", "في الأسعار نذكر اليورو ثم السنتات بلا und غالبًا."]]),
  seinHaben: pack([
    ["تصريفان أساسيان", "احفظ sein وhaben مع الضمائر لأنهما غير منتظمين ويستعملان في الوصف والملكية وبناء الأزمنة."],
    ["الفعل في الموقع الثاني", "في الجملة الخبرية يأتي الفعل المصرف في الموقع الثاني: Heute bin ich müde."],
  ], [["Ich bin müde.", "أنا متعب."], ["Du hast heute frei.", "لديك عطلة اليوم."], ["Wir sind aus Marokko.", "نحن من المغرب."], ["Sie haben zwei Kinder.", "لديهم طفلان / لديكم طفلان."]], [["Ich sein müde.", "Ich bin müde.", "مع ich نصرف sein إلى bin."], ["Er haben Zeit.", "Er hat Zeit.", "مع er نصرف haben إلى hat."]]),
  articles: pack([
    ["احفظ الاسم مع أداته", "لا توجد قاعدة واحدة تحدد جنس كل اسم؛ تعلمه كوحدة: der Tisch، die Lampe، das Buch."],
    ["معرفة أم نكرة؟", "نستخدم ein/eine عند ذكر شيء لأول مرة، ثم der/die/das عند الإشارة إلى الشيء المعروف."],
  ], [["Das ist ein Tisch. Der Tisch ist groß.", "هذه طاولة. الطاولة كبيرة."], ["Ich habe eine Tasche. Die Tasche ist neu.", "لدي حقيبة. الحقيبة جديدة."], ["Das ist ein Kind.", "هذا طفل."], ["Die Bücher sind interessant.", "الكتب ممتعة."]], [["ein Lampe", "eine Lampe", "الاسم المؤنث يأخذ eine."], ["eine Buch", "ein Buch", "Buch محايد ويأخذ ein."]]),
  possessive: pack([
    ["صاحب الشيء", "اختر أولًا الجذر: ich → mein، du → dein، er → sein، sie → ihr، wir → unser."],
    ["نهاية الاسم", "يتغير ضمير الملكية مثل ein: mein Bruder، meine Schwester، mein Kind، meine Freunde."],
  ], [["Das ist mein Bruder.", "هذا أخي."], ["Wie heißt deine Mutter?", "ما اسم والدتك؟"], ["Ihre Wohnung ist groß.", "شقتها كبيرة."], ["Unsere Freunde wohnen in Berlin.", "أصدقاؤنا يسكنون في برلين."], ["Ist das euer Lehrer?", "هل هذا معلمكم؟"]], [["mein Schwester", "meine Schwester", "المؤنث يحتاج النهاية -e."], ["er Auto", "sein Auto", "الملكية مع er هي sein."]]),
  family: pack([
    ["المفردات مع الأداة", "احفظ فرد العائلة مع أداته وجمعه: der Bruder – die Brüder، die Schwester – die Schwestern."],
    ["تقديم العائلة", "استعمل Das ist … للتعريف، mein/meine للملكية، وwohnen أو arbeiten لإضافة معلومة."],
  ], [["Das sind meine Eltern.", "هذان والداي."], ["Ich habe einen Bruder und eine Schwester.", "لدي أخ وأخت."], ["Meine Großeltern wohnen auf dem Land.", "يسكن جدي وجدتي في الريف."], ["Meine Tante arbeitet als Lehrerin.", "تعمل عمتي/خالتي معلمة."]], [["meine Vater", "mein Vater", "Vater مذكر."], ["zwei Bruder", "zwei Brüder", "جمع Bruder هو Brüder."]]),
  time: pack([
    ["السؤال عن الساعة", "نسأل Wie spät ist es? ونجيب رسميًا بالأرقام أو يوميًا بـ Viertel وhalb وvor وnach."],
    ["موعد عند ساعة", "نستخدم um قبل وقت محدد: Der Kurs beginnt um neun Uhr."],
  ], [["Es ist acht Uhr.", "الساعة الثامنة."], ["Es ist halb neun.", "الساعة الثامنة والنصف."], ["Es ist Viertel nach zehn.", "الساعة العاشرة والربع."], ["Der Zug fährt um Viertel vor sechs.", "ينطلق القطار في السادسة إلا ربعًا."], ["Wann beginnt der Film?", "متى يبدأ الفيلم؟"], ["Der Film beginnt um zwanzig Uhr.", "يبدأ الفيلم في الثامنة مساءً."]], [["halb acht = 8:30", "halb acht = 7:30", "في الألمانية النصف يتجه إلى الساعة التالية."], ["in neun Uhr", "um neun Uhr", "مع وقت الساعة المحدد نستخدم um."]]),
  colors: pack([
    ["اللون بعد sein", "بعد sein يبقى اللون بلا نهاية: Das Auto ist rot."],
    ["اللون قبل الاسم", "قبل الاسم يأخذ اللون نهاية الصفة: ein rotes Auto، eine blaue Tasche."],
  ], [["Der Himmel ist blau.", "السماء زرقاء."], ["Ich trage eine schwarze Hose.", "أرتدي بنطالًا أسود."], ["Die Ampel ist rot.", "إشارة المرور حمراء."], ["Sie kauft ein weißes Hemd.", "تشتري قميصًا أبيض."]], [["Das Auto ist rotes.", "Das Auto ist rot.", "بعد sein لا نضيف نهاية للصفة."], ["eine blau Tasche", "eine blaue Tasche", "قبل الاسم المؤنث نحتاج نهاية -e."]]),
  sentence: pack([
    ["الفعل ثاني عنصر", "في الجملة الرئيسية يأتي الفعل المصرف في الموقع الثاني، حتى إذا بدأنا بزمان أو مكان."],
    ["القوس الفعلي", "مع فعل منفصل أو Modalverb يأتي الجزء الثاني في النهاية: Ich stehe früh auf. Ich kann Deutsch sprechen."],
  ], [["Ich lerne jeden Tag Deutsch.", "أتعلم الألمانية كل يوم."], ["Heute arbeite ich zu Hause.", "أعمل اليوم في المنزل."], ["Am Abend sehe ich einen Film.", "أشاهد فيلمًا مساءً."], ["Morgen muss ich früh aufstehen.", "يجب أن أستيقظ باكرًا غدًا."], ["Nach dem Kurs fahre ich direkt nach Hause.", "بعد الدورة أذهب مباشرة إلى المنزل."]], [["Heute ich arbeite.", "Heute arbeite ich.", "الفعل يبقى في الموقع الثاني."], ["Ich aufstehe früh.", "Ich stehe früh auf.", "الفعل المنفصل يضع السابقة في النهاية."]]),
  questions: pack([
    ["W-Frage", "تأتي أداة السؤال أولًا، ثم الفعل المصرف، ثم الفاعل: Wo wohnst du?"],
    ["سؤال نعم أو لا", "يبدأ بالفعل المصرف: Kommst du heute? ويُجاب بـ ja أو nein مع جملة قصيرة."],
  ], [["Wie heißt du?", "ما اسمك؟"], ["Wo wohnst du?", "أين تسكن؟"], ["Wann beginnt der Kurs?", "متى تبدأ الدورة؟"], ["Hast du heute Zeit?", "هل لديك وقت اليوم؟"], ["Warum lernst du Deutsch?", "لماذا تتعلم الألمانية؟"], ["Was machst du am Wochenende?", "ماذا تفعل في عطلة نهاية الأسبوع؟"]], [["Wo du wohnst?", "Wo wohnst du?", "في السؤال المباشر يأتي الفعل بعد أداة السؤال."], ["Du hast Zeit?", "Hast du Zeit?", "سؤال نعم أو لا يبدأ بالفعل."]]),
  introduction: pack([
    ["معلومات أساسية", "ابدأ بالاسم والبلد والسكن واللغة والمهنة. استخدم جملًا قصيرة مستقلة وواضحة."],
    ["رسمي وغير رسمي", "استعمل du مع الأصدقاء وSie في المواقف الرسمية: Wie heißt du? / Wie heißen Sie?"],
  ], [["Guten Tag, ich heiße Sara.", "مرحبًا، اسمي سارة."], ["Ich komme aus Marokko und wohne in Bonn.", "أنا من المغرب وأسكن في بون."], ["Ich bin Studentin und lerne Deutsch.", "أنا طالبة وأتعلم الألمانية."], ["In meiner Freizeit lese ich gern.", "أحب القراءة في وقت فراغي."], ["Freut mich, Sie kennenzulernen.", "يسرني التعرف إليكم."], ["Auf Wiedersehen!", "إلى اللقاء!"]], [["Ich bin heißen Ali.", "Ich heiße Ali.", "heißen فعل مستقل ولا يأتي مع sein."], ["Ich komme von Marokko.", "Ich komme aus Marokko.", "مع بلد الأصل نستخدم aus."]]),
  negation: pack([
    ["kein مع الاسم", "نستخدم kein لنفي اسم نكرة أو اسم بلا أداة: Ich habe kein Auto."],
    ["nicht لبقية الجملة", "نستخدم nicht لنفي الفعل أو الصفة أو الاسم المعروف: Ich komme nicht. Das ist nicht teuer."],
  ], [["Ich habe keinen Bruder.", "ليس لدي أخ."], ["Sie trinkt keinen Kaffee.", "هي لا تشرب القهوة."], ["Das Wetter ist heute nicht schön.", "الطقس ليس جميلًا اليوم."], ["Er arbeitet am Sonntag nicht.", "هو لا يعمل يوم الأحد."], ["Das ist nicht mein Buch.", "هذا ليس كتابي."], ["Wir haben keine Zeit.", "ليس لدينا وقت."]], [["Ich habe nicht Auto.", "Ich habe kein Auto.", "اسم نكرة منفي يأخذ kein."], ["Ich bin kein müde.", "Ich bin nicht müde.", "الصفة تُنفى بـ nicht."]]),
  weather: pack([
    ["تراكيب الطقس", "نستخدم es ist مع الصفات، es regnet أو es schneit مع الأفعال، وdie Sonne scheint مع الاسم."],
    ["درجة الحرارة", "نسأل Wie viel Grad sind es? ونجيب Es sind zwanzig Grad."],
  ], [["Heute ist es sonnig.", "الجو مشمس اليوم."], ["Es regnet seit dem Morgen.", "تمطر منذ الصباح."], ["Morgen wird es kalt.", "سيكون الجو باردًا غدًا."], ["Es sind fünfundzwanzig Grad.", "درجة الحرارة خمس وعشرون درجة."], ["Im Winter schneit es oft.", "تتساقط الثلوج كثيرًا في الشتاء."], ["Wie ist das Wetter heute?", "كيف الطقس اليوم؟"]], [["Heute ist sonnig.", "Heute ist es sonnig.", "تعبير الطقس يحتاج الضمير es."], ["Es hat zwanzig Grad.", "Es sind zwanzig Grad.", "لدرجة الحرارة نستخدم sein بصيغة الجمع."]]),
  cases: pack([
    ["وظيفة الحالة", "Nominativ للفاعل، Akkusativ للمفعول المباشر، وDativ غالبًا للمتلقي أو بعد أفعال وحروف محددة."],
    ["تغير الأدوات", "أوضح تغير مع المذكر: der → den في Akkusativ وdem في Dativ؛ ein → einen → einem."],
  ], [["Der Mann kauft einen Apfel.", "الرجل يشتري تفاحة."], ["Ich sehe den Bus.", "أرى الحافلة."], ["Sie hilft dem Kind.", "هي تساعد الطفل."], ["Wir geben der Frau das Buch.", "نعطي المرأة الكتاب."], ["Er dankt seinem Lehrer.", "يشكر معلمه."], ["Das Mädchen braucht einen Stift.", "تحتاج الفتاة قلمًا."]], [["Ich sehe der Mann.", "Ich sehe den Mann.", "المفعول المذكر يأخذ den."], ["Ich helfe den Mann.", "Ich helfe dem Mann.", "helfen يطلب Dativ."]]),
  food: pack([
    ["الطعام مع الكمية", "احفظ أسماء الطعام مع الأدوات واستعمل gern للتفضيل وmöchten للطلب المهذب."],
    ["في المطعم أو المتجر", "استخدم Ich hätte gern … وFür mich bitte … وWas kostet …؟ لبناء حوار بسيط."],
  ], [["Ich esse gern Brot mit Käse.", "أحب أكل الخبز مع الجبن."], ["Zum Frühstück trinke ich Kaffee.", "أشرب القهوة في الإفطار."], ["Ich hätte gern eine Suppe, bitte.", "أود حساءً من فضلك."], ["Für mich bitte einen Salat.", "لي سلطة من فضلك."], ["Die Rechnung, bitte.", "الحساب من فضلك."], ["Eine Kugel Vanille kostet zwei Euro.", "كرة فانيليا تكلف يوروين."]], [["Ich möchte ein Kaffee.", "Ich möchte einen Kaffee.", "Kaffee مذكر ومفعول مباشر."], ["Ich bekomme eine Pizza?", "Kann ich eine Pizza bekommen?", "صيغة السؤال ألطف وأوضح عند الطلب."]]),
  imperative: pack([
    ["ثلاث صيغ", "مع du نستعمل الجذر غالبًا، مع ihr صيغة الحاضر بلا ضمير، ومع Sie المصدر ثم Sie."],
    ["الأفعال المنفصلة", "تبقى السابقة في نهاية الأمر: Ruf mich an! Stehen Sie bitte auf!"],
  ], [["Komm bitte herein!", "تفضل بالدخول!"], ["Wartet einen Moment!", "انتظروا لحظة!"], ["Warten Sie bitte hier!", "انتظر هنا من فضلك بصيغة رسمية."], ["Mach das Fenster zu!", "أغلق النافذة!"], ["Sei bitte vorsichtig!", "كن حذرًا من فضلك."], ["Nehmen Sie Platz!", "تفضل بالجلوس!"]], [["Du komm hier!", "Komm hierher!", "في أمر du نحذف الضمير ونستخدم صيغة الأمر."], ["Aufstehen Sie!", "Stehen Sie auf!", "مع الفعل المنفصل تأتي السابقة في النهاية."]]),
  verbs: pack([
    ["التصريف المنتظم", "نحذف -en ونضيف -e، -st، -t، -en، -t، -en حسب الضمير."],
    ["الأفعال غير المنتظمة", "قد يتغير حرف الجذر مع du وer/sie/es: fahren → du fährst، lesen → er liest."],
  ], [["Ich lerne Deutsch.", "أتعلم الألمانية."], ["Du arbeitest heute.", "أنت تعمل اليوم."], ["Er fährt mit dem Bus.", "هو يذهب بالحافلة."], ["Sie liest ein Buch.", "هي تقرأ كتابًا."], ["Wir sprechen Arabisch.", "نحن نتحدث العربية."], ["Nehmt ihr den Zug?", "هل تستقلون القطار؟"]], [["du lernen", "du lernst", "مع du نضيف -st."], ["er lesen", "er liest", "lesen يغير e إلى ie مع er/sie/es."]]),
  separable: pack([
    ["الفعل المنفصل", "في الجملة الرئيسية يتصرف الجذر وتذهب السابقة إلى النهاية: Ich rufe dich an."],
    ["غير المنفصل", "سوابق مثل be- وver- وent- لا تنفصل: Ich besuche dich. Er versteht die Frage."],
  ], [["Ich stehe um sieben Uhr auf.", "أستيقظ في السابعة."], ["Wir kaufen am Samstag ein.", "نتسوق يوم السبت."], ["Rufst du mich später an?", "هل ستتصل بي لاحقًا؟"], ["Der Kurs fängt um neun Uhr an.", "تبدأ الدورة في التاسعة."], ["Ich verstehe die Aufgabe.", "أفهم المهمة."], ["Sie besucht ihre Freundin.", "تزور صديقتها."]], [["Ich aufstehe früh.", "Ich stehe früh auf.", "تفصل السابقة في الجملة الرئيسية."], ["Ich suche be meine Freundin.", "Ich besuche meine Freundin.", "besuchen فعل غير منفصل."]]),
  adjectives: pack([
    ["الوصف بعد sein", "تبقى الصفة بلا نهاية بعد sein: Das Haus ist groß."],
    ["الوصف قبل الاسم", "قبل الاسم تأخذ نهاية بحسب الأداة والجنس والحالة: ein großes Haus، eine schöne Stadt."],
  ], [["Das Zimmer ist klein, aber hell.", "الغرفة صغيرة لكنها مضيئة."], ["Sie trägt ein rotes Kleid.", "ترتدي فستانًا أحمر."], ["Er ist freundlich, nicht unhöflich.", "هو ودود وليس فظًا."], ["Das ist eine einfache Aufgabe.", "هذه مهمة سهلة."], ["Der Kaffee ist heiß.", "القهوة ساخنة."], ["Wir suchen eine günstige Wohnung.", "نبحث عن شقة رخيصة."]], [["ein schön Stadt", "eine schöne Stadt", "الاسم المؤنث مع eine يحتاج نهاية -e."], ["Das Haus ist großes.", "Das Haus ist groß.", "بعد sein لا نضيف نهاية."]]),
  calendar: pack([
    ["الأيام والأشهر", "نستخدم am مع أيام الأسبوع والتاريخ، وim مع الأشهر والفصول: am Montag، im Mai، im Sommer."],
    ["التاريخ", "بعد am يأخذ العدد الترتيبي نهاية -en: am dritten Mai. من 1 إلى 19 غالبًا -te، ومن 20 فما فوق -ste."],
  ], [["Am Montag habe ich Deutschkurs.", "لدي دورة ألمانية يوم الاثنين."], ["Im August haben wir Urlaub.", "لدينا عطلة في أغسطس."], ["Mein Geburtstag ist am dritten Mai.", "عيد ميلادي في الثالث من مايو."], ["Heute ist der erste April.", "اليوم هو الأول من أبريل."], ["Im Winter ist es kalt.", "الجو بارد في الشتاء."], ["Morgen treffe ich meine Freunde.", "سأقابل أصدقائي غدًا."]], [["in Montag", "am Montag", "مع أيام الأسبوع نستخدم am."], ["am drei Mai", "am dritten Mai", "بعد am نستخدم العدد الترتيبي بنهاية -en."]]),
  modal: pack([
    ["الفعلان في الجملة", "يأتي Modalverb مصرفًا في الموقع الثاني، والفعل الأساسي في المصدر في نهاية الجملة."],
    ["المعنى", "können للقدرة، müssen للضرورة، dürfen للسماح، sollen للنصيحة، wollen للإرادة، وmöchten للرغبة المهذبة."],
  ], [["Ich kann gut schwimmen.", "أستطيع السباحة جيدًا."], ["Du musst heute arbeiten.", "يجب أن تعمل اليوم."], ["Darf ich hier sitzen?", "هل يُسمح لي بالجلوس هنا؟"], ["Wir möchten einen Kaffee bestellen.", "نود طلب قهوة."], ["Ihr sollt mehr Wasser trinken.", "ينبغي أن تشربوا ماء أكثر."], ["Sie will Ärztin werden.", "تريد أن تصبح طبيبة."]], [["Ich kann schwimme.", "Ich kann schwimmen.", "الفعل الثاني يبقى في المصدر."], ["Ich müssen arbeiten.", "Ich muss arbeiten.", "يجب تصريف Modalverb مع الفاعل."]]),
  plural: pack([
    ["لا توجد نهاية واحدة", "قد يكون الجمع بـ -e أو -er أو -(e)n أو -s أو بلا تغيير، وقد يظهر Umlaut. احفظ الجمع مع كل اسم."],
    ["أداة الجمع", "أداة التعريف في Nominativ وAkkusativ هي die، ولا توجد أداة نكرة للجمع."],
  ], [["das Buch – die Bücher", "الكتاب – الكتب"], ["die Frau – die Frauen", "المرأة – النساء"], ["der Tisch – die Tische", "الطاولة – الطاولات"], ["das Auto – die Autos", "السيارة – السيارات"], ["der Lehrer – die Lehrer", "المعلم – المعلمون"], ["Ich kaufe zwei Äpfel.", "أشتري تفاحتين."]], [["zwei Buch", "zwei Bücher", "بعد العدد نستخدم صيغة الجمع."], ["die Autos sind neues", "die Autos sind neu", "بعد sein تبقى الصفة بلا نهاية."]]),
  perfect: pack([
    ["بناء Perfekt", "نصرف haben أو sein في الموقع الثاني ونضع Partizip II في نهاية الجملة."],
    ["اختيار الفعل المساعد", "تأخذ معظم الأفعال haben، بينما تأخذ أفعال الحركة وتغير الحالة الشائعة sein."],
  ], [["Ich habe gestern gearbeitet.", "عملت أمس."], ["Wir haben einen Film gesehen.", "شاهدنا فيلمًا."], ["Sie ist nach Berlin gefahren.", "ذهبت إلى برلين."], ["Er ist früh aufgestanden.", "استيقظ باكرًا."], ["Hast du gut geschlafen?", "هل نمت جيدًا؟"], ["Wann seid ihr angekommen?", "متى وصلتم؟"]], [["Ich bin gearbeitet.", "Ich habe gearbeitet.", "arbeiten يبني Perfekt مع haben."], ["Ich habe gegangen.", "Ich bin gegangen.", "gehen يبني Perfekt مع sein."]]),
  clothes: pack([
    ["الاسم مع الأداة", "احفظ قطعة الملابس مع أداتها وجمعها، واستعمل tragen للارتداء وanziehen لفعل ارتداء الملابس."],
    ["التسوق", "اسأل عن المقاس واللون والسعر واستعمل passen للملاءمة وgefallen للإعجاب."],
  ], [["Ich trage heute eine blaue Jeans.", "أرتدي اليوم بنطال جينز أزرق."], ["Diese Jacke passt mir gut.", "هذه السترة تناسبني جيدًا."], ["Haben Sie das Hemd in Größe M?", "هل لديكم القميص بمقاس M؟"], ["Kann ich die Schuhe anprobieren?", "هل يمكنني تجربة الحذاء؟"], ["Der Pullover ist mir zu groß.", "السترة الصوفية كبيرة عليّ."], ["Was kostet dieser Mantel?", "كم يكلف هذا المعطف؟"]], [["Die Jacke passt mich.", "Die Jacke passt mir.", "passen يأخذ Dativ."], ["Ich probiere die Jacke.", "Ich probiere die Jacke an.", "تجربة الملابس هي anprobieren وهو فعل منفصل."]]),
  accDativeVerbs: pack([
    ["الفعل يحدد الحالة", "أفعال مثل sehen، brauchen وkaufen تأخذ Akkusativ، بينما helfen، danken، gefallen وgehören تأخذ Dativ."],
    ["السؤال المناسب", "اسأل wen/was للمفعول Akkusativ وwem للمفعول Dativ."],
  ], [["Ich brauche einen Termin.", "أحتاج إلى موعد."], ["Sie sieht ihren Freund.", "ترى صديقها."], ["Wir kaufen das Brot.", "نشتري الخبز."], ["Kannst du mir helfen?", "هل يمكنك مساعدتي؟"], ["Der Film gefällt meiner Schwester.", "يعجب الفيلم أختي."], ["Das Fahrrad gehört dem Kind.", "الدراجة للطفل."]], [["Ich helfe dich.", "Ich helfe dir.", "helfen يأخذ Dativ."], ["Ich brauche einem Stift.", "Ich brauche einen Stift.", "brauchen يأخذ Akkusativ."]]),
  body: pack([
    ["أجزاء الجسم", "احفظ الاسم مع أداته وجمعه: der Kopf، die Hand – die Hände، das Auge – die Augen."],
    ["التعبير عن الألم", "نقول Mein Kopf tut weh أو Ich habe Kopfschmerzen. مع عضو جمع نقول Meine Augen tun weh."],
  ], [["Mein Kopf tut weh.", "رأسي يؤلمني."], ["Ich habe Halsschmerzen.", "لدي ألم في الحلق."], ["Meine Augen sind müde.", "عيناي متعبتان."], ["Er hat sich den Arm verletzt.", "أصاب ذراعه."], ["Bitte öffnen Sie den Mund.", "افتح فمك من فضلك."], ["Ich wasche mir die Hände.", "أغسل يديّ."]], [["Ich habe Schmerz in Kopf.", "Ich habe Kopfschmerzen.", "استعمل الاسم المركب الشائع للتعبير عن الألم."], ["Meine Hand tun weh.", "Meine Hand tut weh.", "العضو المفرد يأخذ فعلًا مفردًا."]]),
  requests: pack([
    ["الطلب المهذب", "استخدم ich möchte، ich hätte gern، können Sie …? أو könnten Sie …? بدل الأمر المباشر."],
    ["جواب قصير واضح", "أكد الطلب واذكر إمكانية التنفيذ: Ja, gern. / Natürlich. / Leider geht das heute nicht."],
  ], [["Ich hätte gern einen Termin.", "أود موعدًا."], ["Könnten Sie das bitte wiederholen?", "هل يمكنكم تكرار ذلك من فضلكم؟"], ["Kann ich mit Karte bezahlen?", "هل يمكنني الدفع بالبطاقة؟"], ["Ja, natürlich. Einen Moment, bitte.", "نعم بالطبع. لحظة من فضلك."], ["Leider haben wir heute keinen Termin frei.", "للأسف ليس لدينا موعد متاح اليوم."], ["Darf ich hier warten?", "هل يُسمح لي بالانتظار هنا؟"]], [["Gib mir einen Termin!", "Ich hätte gern einen Termin.", "الصيغة المهذبة أنسب في الخدمة والمواقف الرسمية."], ["Ich will Kaffee.", "Ich möchte einen Kaffee.", "möchten ألطف من wollen عند الطلب."]]),
  exam: pack([
    ["افهم المهمة أولًا", "حدد المطلوب والكلمات المفتاحية، ثم أجب بجملة بسيطة كاملة. لا تستخدم قاعدة معقدة إذا لم تكن متأكدًا منها."],
    ["راجع الأساسيات", "تحقق من الفعل في الموقع الثاني، الحرف الكبير للاسم، الأداة، ونقطة أو علامة سؤال في النهاية."],
  ], [["Ich wohne seit einem Jahr in Berlin.", "أسكن في برلين منذ سنة."], ["Können Sie mir bitte helfen?", "هل يمكنكم مساعدتي من فضلكم؟"], ["Am Samstag habe ich keine Zeit.", "ليس لدي وقت يوم السبت."], ["Der Termin ist um zehn Uhr.", "الموعد في العاشرة."], ["Vielen Dank für Ihre Nachricht.", "شكرًا جزيلًا على رسالتكم."], ["Ich freue mich auf Ihre Antwort.", "أتطلع إلى ردكم."]], [["Samstag.", "Am Samstag habe ich Zeit.", "اكتب جملة قصيرة كاملة عندما تطلب المهمة ذلك."], ["Heute ich kann nicht.", "Heute kann ich nicht.", "الفعل المصرف في الموقع الثاني."]]),
  letter: pack([
    ["بنية الرسالة", "ابدأ بتحية مناسبة، غطِّ كل النقاط المطلوبة بوضوح، ثم اختم بعبارة وداع واسمك."],
    ["الأسلوب", "استعمل Sie وIhr في الرسالة الرسمية وdu/dein مع الصديق. اجعل كل نقطة في جملة بسيطة."],
  ], [["Liebe Anna, vielen Dank für deine Einladung.", "عزيزتي آنا، شكرًا على دعوتك."], ["Leider kann ich am Samstag nicht kommen.", "للأسف لا أستطيع الحضور السبت."], ["Können wir uns am Sonntag treffen?", "هل يمكننا اللقاء يوم الأحد؟"], ["Sehr geehrte Damen und Herren,", "السيدات والسادة المحترمون،"], ["Ich möchte einen Termin vereinbaren.", "أرغب في تحديد موعد."], ["Mit freundlichen Grüßen", "مع خالص التحية." ]], [["Hallo في رسالة رسمية", "Sehr geehrte Damen und Herren", "اختر التحية المناسبة لدرجة الرسمية."], ["Ich kann nicht kommen weil ich bin krank.", "Ich kann nicht kommen, weil ich krank bin.", "بعد weil يأتي الفعل في النهاية."]]),
  pronunciation: pack([
    ["استمع وقارن", "اختر صوتًا واحدًا، استمع إلى النموذج، سجّل نفسك، ثم قارن طول الحركة وموضع اللسان والنهاية."],
    ["أصوات مهمة", "ميّز بين ich-Laut وach-Laut، وبين ü وu، وبين ö وo، وانتبه إلى أن z تبدأ بصوت ts."],
  ], [["ich – nicht", "تدريب على صوت ch الخفيف."], ["Buch – machen", "تدريب على ch الخلفي."], ["schön – schon", "التمييز بين ö وo."], ["müde – Mutter", "التمييز بين ü وu."], ["Zeit – zehn", "يبدأ z بصوت ts."], ["vier – wir", "التمييز بين f وw الألمانية."]], [["نطق كل ch مثل ش", "قارن ich وBuch", "يتغير صوت ch بحسب الحركة السابقة."], ["نطق z مثل ز", "انطق z قريبًا من ts", "تدرب على Zeit وzehn."]]),
};

const lessonGroups = {
  1:"alphabet",2:"numbers",3:"seinHaben",4:"articles",5:"possessive",6:"family",7:"time",8:"time",9:"colors",
  10:"sentence",11:"questions",12:"introduction",13:"negation",14:"weather",15:"cases",16:"cases",17:"cases",18:"cases",
  19:"exam",20:"food",21:"imperative",22:"food",23:"food",24:"verbs",25:"food",26:"verbs",27:"separable",
  28:"adjectives",29:"calendar",30:"modal",31:"plural",32:"perfect",33:"perfect",34:"perfect",35:"perfect",
  36:"clothes",37:"clothes",38:"calendar",39:"calendar",40:"introduction",41:"adjectives",42:"adjectives",
  43:"accDativeVerbs",44:"accDativeVerbs",45:"body",46:"numbers",47:"calendar",48:"calendar",49:"introduction",
  50:"requests",51:"questions",52:"letter",53:"exam",54:"exam",55:"exam",56:"exam",57:"pronunciation",
};

function mergeUnique(existing, additions, key) {
  const seen = new Set(existing.map((item) => String(item?.[key] ?? "").trim().toLocaleLowerCase("de")));
  return [...existing, ...additions.filter((item) => {
    const value = String(item?.[key] ?? "").trim().toLocaleLowerCase("de");
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  })];
}

const documents = JSON.parse(await readFile(documentationPath, "utf8"));
for (const [lessonIdText, groupName] of Object.entries(lessonGroups)) {
  const lessonId = Number(lessonIdText);
  const document = documents.find((entry) => Number(entry.lesson_id) === lessonId);
  const enhancement = groups[groupName];
  if (!document || !enhancement) throw new Error(`A1/${lessonId}: documentation or group not found`);
  document.explanation = (document.explanation ?? []).filter((item) => item.origin !== origin);
  document.explanation = mergeUnique(document.explanation, enhancement.explanations, "heading");
  const examplesKey = Array.isArray(document.examples_from_video) ? "examples_from_video" : "examples";
  document[examplesKey] = (document[examplesKey] ?? []).filter((item) => item.origin !== origin);
  document[examplesKey] = mergeUnique(document[examplesKey], enhancement.examples, "de");
  document.common_mistakes = (document.common_mistakes ?? []).filter((item) => item.origin !== origin);
  document.common_mistakes = mergeUnique(document.common_mistakes, enhancement.mistakes, "wrong");
  document.editorial_enrichment = { standard: "A1", purpose: "clear_explanations_and_additional_practice_examples", video_claim: false };
  document.reading_time_minutes = Math.max(Number(document.reading_time_minutes) || 0, 4);
}

await writeFile(documentationPath, `${JSON.stringify(documents, null, 2)}\n`, "utf8");
console.log(`Enriched ${Object.keys(lessonGroups).length} A1 documentation entries.`);
