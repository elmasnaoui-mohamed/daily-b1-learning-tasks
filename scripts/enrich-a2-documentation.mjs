import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documentationPath = path.join(root, "src", "data", "documentation", "a2Documentation.json");
const origin = "editorial_clarification";
const E = (heading, content) => ({ heading, content, origin });
const X = (de, ar, note = "مثال تعليمي إضافي") => ({ de, ar, note, origin });
const M = (wrong, correct, explanation) => ({ wrong, correct, explanation, origin });
const pack = (explanations, examples, mistakes) => ({
  explanations: explanations.map(([heading, content]) => E(heading, content)),
  examples: examples.map(([de, ar, note]) => X(de, ar, note)),
  mistakes: mistakes.map(([wrong, correct, explanation]) => M(wrong, correct, explanation)),
});

const groups = {
  reflexive: pack([
    ["الفعل والضمير المنعكس", "يعود الفعل المنعكس على الفاعل نفسه. نختار mich مع ich، dich مع du، sich مع er/sie/es وSie، uns مع wir، وeuch مع ihr."],
    ["Akkusativ أم Dativ؟", "يكون الضمير غالبًا في Akkusativ. ويأتي Dativ عندما يوجد مفعول Akkusativ آخر، مثل: Ich wasche mir die Hände."],
  ], [
    ["Ich freue mich auf das Wochenende.", "أتطلع إلى عطلة نهاية الأسبوع."],
    ["Du musst dich beeilen.", "يجب أن تسرع."],
    ["Wir treffen uns vor dem Kino.", "نلتقي أمام السينما."],
    ["Sie interessiert sich für Musik.", "هي تهتم بالموسيقى."],
    ["Ich wasche mir jeden Morgen das Gesicht.", "أغسل وجهي كل صباح."],
    ["Habt ihr euch schon angemeldet?", "هل سجلتم أنفسكم بالفعل؟"],
  ], [
    ["Ich freue auf den Urlaub.", "Ich freue mich auf den Urlaub.", "sich freuen فعل منعكس ويحتاج الضمير المناسب."],
    ["Ich wasche mich die Hände.", "Ich wasche mir die Hände.", "مع وجود مفعول مباشر نستخدم الضمير المنعكس في Dativ."],
  ]),
  genitive: pack([
    ["التعبير عن الملكية", "يجيب Genitiv عن سؤال wessen؟ وتكون أدواته des للمذكر والمحايد وder للمؤنث والجمع."],
    ["نهاية الاسم", "يأخذ الاسم المذكر أو المحايد غالبًا -s أو -es بعد des، بينما لا تتغير أسماء المؤنث والجمع."],
  ], [
    ["Das Auto meines Bruders ist neu.", "سيارة أخي جديدة."],
    ["Die Farbe der Tasche gefällt mir.", "يعجبني لون الحقيبة."],
    ["Das Ende des Films war überraschend.", "كانت نهاية الفيلم مفاجئة."],
    ["Die Eltern meiner Freundin wohnen in Köln.", "يسكن والدا صديقتي في كولونيا."],
    ["Wegen des schlechten Wetters bleiben wir zu Hause.", "نبقى في المنزل بسبب سوء الطقس."],
    ["Während der Ferien besuche ich meine Familie.", "أزور عائلتي أثناء العطلة."],
  ], [
    ["das Auto von meines Bruders", "das Auto meines Bruders", "بعد أداة Genitiv يأتي الاسم أو المحدد بصيغته الصحيحة بلا von."],
    ["die Tür des Wohnung", "die Tür der Wohnung", "المؤنث يأخذ der في Genitiv."],
  ]),
  preterite: pack([
    ["الماضي البسيط", "يشيع Präteritum في الكتابة والحكايات، ويستعمل في الكلام كثيرًا مع sein وhaben والأفعال الناقصة."],
    ["الأفعال القوية", "تغير الأفعال القوية غالبًا حرف الجذر ولا تأخذ -te؛ لذلك تحفظ صيغة الماضي مع كل فعل: gehen → ging، sehen → sah."],
  ], [
    ["Gestern war ich sehr müde.", "كنت متعبًا جدًا أمس."],
    ["Früher hatte er mehr Freizeit.", "كان لديه وقت فراغ أكثر سابقًا."],
    ["Sie ging zu Fuß nach Hause.", "ذهبت إلى المنزل سيرًا."],
    ["Wir sahen einen interessanten Film.", "شاهدنا فيلمًا ممتعًا."],
    ["Er kam erst um Mitternacht zurück.", "عاد عند منتصف الليل فقط."],
    ["Das Kind schlief sofort ein.", "نام الطفل فورًا."],
  ], [
    ["Er gehte nach Hause.", "Er ging nach Hause.", "gehen فعل قوي وصيغته في Präteritum هي ging."],
    ["Wir waren gesehen den Film.", "Wir sahen den Film.", "Präteritum فعل بسيط ولا يحتاج فعلًا مساعدًا هنا."],
  ]),
  modalPast: pack([
    ["الأفعال الناقصة في الماضي", "تفقد الأفعال الناقصة غالبًا Umlaut في Präteritum: konnte، musste، durfte، sollte، wollte و mochte."],
    ["المصدر في النهاية", "يأتي Modalverb مصرفًا في الموقع الثاني، ويبقى الفعل الأساسي في المصدر في نهاية الجملة."],
  ], [
    ["Ich musste gestern lange arbeiten.", "كان عليّ أن أعمل طويلًا أمس."],
    ["Wir konnten nicht kommen.", "لم نستطع الحضور."],
    ["Durftet ihr als Kinder lange aufbleiben?", "هل كان مسموحًا لكم بالسهر طويلًا حين كنتم أطفالًا؟"],
    ["Sie wollte Ärztin werden.", "كانت تريد أن تصبح طبيبة."],
    ["Du solltest mehr Wasser trinken.", "كان ينبغي أن تشرب ماء أكثر."],
    ["Er mochte früher keinen Kaffee.", "لم يكن يحب القهوة سابقًا."],
  ], [
    ["Ich musste gearbeitet.", "Ich musste arbeiten.", "بعد Modalverb يأتي المصدر لا Partizip II."],
    ["Wir könnten gestern nicht kommen.", "Wir konnten gestern nicht kommen.", "للماضي الواقعي نستخدم konnten، لا صيغة Konjunktiv könnten."],
  ]),
  regularPast: pack([
    ["قاعدة الأفعال المنتظمة", "يتكون Präteritum المنتظم من جذر الفعل + te ثم نهاية الشخص: ich machte، du machtest، wir machten."],
    ["الجذور المنتهية بـ t أو d", "نضيف e لتسهيل النطق: arbeiten → arbeitete، warten → wartete."],
  ], [
    ["Ich lernte gestern drei Stunden.", "درست ثلاث ساعات أمس."],
    ["Wir machten am Sonntag einen Ausflug.", "قمنا برحلة يوم الأحد."],
    ["Sie arbeitete früher in Berlin.", "كانت تعمل سابقًا في برلين."],
    ["Er wartete lange auf den Bus.", "انتظر الحافلة طويلًا."],
    ["Die Kinder spielten im Garten.", "لعب الأطفال في الحديقة."],
    ["Du fragtest nach dem Weg.", "سألت عن الطريق."],
  ], [
    ["Ich lernete Deutsch.", "Ich lernte Deutsch.", "مع الجذر lernen نضيف -te مباشرة."],
    ["Er arbeitte gestern.", "Er arbeitete gestern.", "بعد جذر ينتهي بـ t نضيف -ete."],
  ]),
  animals: pack([
    ["الاسم مع أداته وجمعه", "تعلم اسم الحيوان كوحدة كاملة مع أداة المفرد وصيغة الجمع: der Hund – die Hunde، die Katze – die Katzen."],
    ["وصف الحيوان", "استعمل sein مع الصفة، haben مع الصفات الجسدية، و können مع القدرة: Der Vogel kann fliegen."],
  ], [
    ["Der Hund ist freundlich und verspielt.", "الكلب ودود ويحب اللعب."],
    ["Meine Katze schläft auf dem Sofa.", "قطتي تنام على الأريكة."],
    ["Vögel können fliegen.", "تستطيع الطيور الطيران."],
    ["Das Pferd hat starke Beine.", "للحصان أرجل قوية."],
    ["Im Zoo haben wir einen Elefanten gesehen.", "شاهدنا في حديقة الحيوان فيلًا."],
    ["Viele Fische leben im Meer.", "تعيش أسماك كثيرة في البحر."],
  ], [
    ["die Hund", "der Hund", "Hund اسم مذكر."],
    ["zwei Katze", "zwei Katzen", "بعد العدد نحتاج صيغة الجمع."],
  ]),
  routine: pack([
    ["ترتيب أحداث اليوم", "استخدم zuerst، dann، danach، später و schließlich لربط خطوات الروتين بوضوح."],
    ["الأفعال المنفصلة", "ينفصل الجزء الأول في الجملة الرئيسية: Ich stehe um sieben Uhr auf. وفي المصدر يبقى الفعل متصلًا: früh aufzustehen."],
  ], [
    ["Ich stehe jeden Tag um sieben Uhr auf.", "أستيقظ كل يوم في السابعة."],
    ["Danach dusche ich und ziehe mich an.", "بعد ذلك أستحم وأرتدي ملابسي."],
    ["Um acht Uhr fahre ich zur Arbeit.", "أذهب إلى العمل في الثامنة."],
    ["Mittags esse ich mit meinen Kollegen.", "أتناول الغداء مع زملائي ظهرًا."],
    ["Nach der Arbeit kaufe ich oft ein.", "أتسوق غالبًا بعد العمل."],
    ["Abends bereite ich mich auf den nächsten Tag vor.", "أستعد مساءً لليوم التالي."],
  ], [
    ["Ich aufstehe um sieben Uhr.", "Ich stehe um sieben Uhr auf.", "ينفصل الفعل aufstehen في الجملة الرئيسية."],
    ["Dann ich frühstücke.", "Dann frühstücke ich.", "عند بدء الجملة بظرف يأتي الفعل في الموقع الثاني."],
  ]),
  welch: pack([
    ["نهاية welch-", "تأخذ welch- نهايات أدوات التعريف نفسها تقريبًا: welcher للمذكر، welche للمؤنث والجمع، welches للمحايد في Nominativ."],
    ["الحالة الإعرابية", "حدد جنس الاسم وحالته: Welchen Film siehst du? Akkusativ مذكر، Mit welcher Kollegin sprichst du? Dativ مؤنث."],
  ], [
    ["Welcher Bus fährt zum Bahnhof?", "أي حافلة تذهب إلى المحطة؟"],
    ["Welche Jacke gefällt dir?", "أي سترة تعجبك؟"],
    ["Welches Buch liest du gerade?", "أي كتاب تقرأ الآن؟"],
    ["Welchen Film möchtest du sehen?", "أي فيلم تريد مشاهدته؟"],
    ["Mit welcher Kollegin arbeitest du?", "مع أي زميلة تعمل؟"],
    ["Welche Schuhe nimmst du?", "أي حذاء ستأخذ؟"],
  ], [
    ["Welche Bus kommt?", "Welcher Bus kommt?", "Bus مذكر وفاعل، لذا نستخدم welcher."],
    ["Mit welchen Frau sprichst du?", "Mit welcher Frau sprichst du?", "بعد mit نحتاج Dativ مؤنث: welcher."],
  ]),
  weekend: pack([
    ["حكاية نشاط ماضٍ", "استخدم Perfekt للأحداث اليومية الماضية، وأضف متى ومع من وأين حتى تكون الإجابة مترابطة."],
    ["روابط السرد", "اربط الأحداث بـ zuerst، dann، danach و am Ende، وأضف تقييمًا مثل Es hat mir gut gefallen."],
  ], [
    ["Am Wochenende habe ich meine Freunde besucht.", "زرت أصدقائي في عطلة نهاية الأسبوع."],
    ["Am Samstag sind wir ins Kino gegangen.", "ذهبنا إلى السينما يوم السبت."],
    ["Danach haben wir in einem Restaurant gegessen.", "بعد ذلك أكلنا في مطعم."],
    ["Am Sonntag bin ich lange im Bett geblieben.", "بقيت في السرير طويلًا يوم الأحد."],
    ["Das Wetter war schön, deshalb machten wir einen Spaziergang.", "كان الطقس جميلًا، لذلك قمنا بنزهة."],
    ["Insgesamt war das Wochenende sehr erholsam.", "عمومًا كانت عطلة نهاية الأسبوع مريحة جدًا."],
  ], [
    ["Ich habe ins Kino gegangen.", "Ich bin ins Kino gegangen.", "gehen يبني Perfekt مع sein."],
    ["Am Samstag ich habe Freunde besucht.", "Am Samstag habe ich Freunde besucht.", "الفعل المصرف يبقى في الموقع الثاني."],
  ]),
  demonstrative: pack([
    ["dies- كأداة إشارة", "تتبع dies- نهايات أداة التعريف: dieser، diese، dieses، diesen، diesem. وهي تشير إلى شخص أو شيء محدد."],
    ["مطابقة الاسم والحالة", "لا يكفي معرفة جنس الاسم؛ يجب تحديد الحالة أيضًا: dieser Mann فاعل، diesen Mann مفعول، mit diesem Mann بعد mit."],
  ], [
    ["Dieser Pullover ist zu teuer.", "هذه السترة غالية جدًا."],
    ["Diese Tasche gehört mir.", "هذه الحقيبة لي."],
    ["Dieses Handy funktioniert nicht.", "هذا الهاتف لا يعمل."],
    ["Ich nehme diesen Bus.", "سأستقل هذه الحافلة."],
    ["Mit dieser App kann man Vokabeln lernen.", "يمكن تعلم المفردات بهذا التطبيق."],
    ["Diese Schuhe sind bequemer.", "هذا الحذاء أكثر راحة."],
  ], [
    ["dieser Frau", "diese Frau", "في Nominativ المؤنث نستخدم diese."],
    ["Ich kaufe dieser Mantel.", "Ich kaufe diesen Mantel.", "المذكر في Akkusativ يأخذ diesen."],
  ]),
  accPrep: pack([
    ["حروف Akkusativ الثابتة", "أهمها durch، für، gegen، ohne و um. يأتي الاسم بعدها دائمًا في Akkusativ."],
    ["تغير المذكر", "يظهر التغير بوضوح مع المذكر: der يصبح den، ein يصبح einen، mein يصبح meinen."],
  ], [
    ["Wir gehen durch den Park.", "نمشي عبر الحديقة."],
    ["Das Geschenk ist für meinen Bruder.", "الهدية لأخي."],
    ["Er ist gegen diesen Vorschlag.", "هو ضد هذا الاقتراح."],
    ["Ohne einen Termin müssen Sie warten.", "عليك الانتظار من دون موعد."],
    ["Die Kinder sitzen um den Tisch.", "يجلس الأطفال حول الطاولة."],
    ["Der Zug fährt durch einen langen Tunnel.", "يمر القطار عبر نفق طويل."],
  ], [
    ["für mein Bruder", "für meinen Bruder", "بعد für نحتاج Akkusativ مذكر."],
    ["ohne dem Schlüssel", "ohne den Schlüssel", "ohne يأخذ Akkusativ."],
  ]),
  datPrep: pack([
    ["حروف Dativ الثابتة", "أهمها aus، bei، mit، nach، seit، von و zu. يأتي الاسم بعدها دائمًا في Dativ."],
    ["أشكال مختصرة", "تندمج بعض الحروف مع الأداة: bei dem → beim، von dem → vom، zu dem → zum، zu der → zur."],
  ], [
    ["Ich komme aus der Schweiz.", "أنا قادم من سويسرا."],
    ["Sie arbeitet bei einer Versicherung.", "تعمل لدى شركة تأمين."],
    ["Wir fahren mit dem Zug.", "نسافر بالقطار."],
    ["Nach dem Kurs gehe ich nach Hause.", "أذهب إلى المنزل بعد الدورة."],
    ["Er wohnt seit einem Jahr in Berlin.", "يسكن في برلين منذ سنة."],
    ["Ich gehe heute zum Arzt.", "أذهب اليوم إلى الطبيب."],
  ], [
    ["mit der Bus", "mit dem Bus", "Bus مذكر وبعد mit يأتي Dativ."],
    ["nach die Arbeit", "nach der Arbeit", "nach يأخذ Dativ."],
  ]),
  localPrep: pack([
    ["السؤال يحدد التركيب", "Wo? يسأل عن موقع ثابت ويأتي غالبًا مع Dativ. Wohin? يسأل عن وجهة أو انتقال إلى مكان ويأتي مع Akkusativ في حروف الجر المشتركة."],
    ["مكان أم اتجاه؟", "قارن: Das Bild hängt an der Wand (موقع) و Ich hänge das Bild an die Wand (اتجاه/تغيير مكان)."],
  ], [
    ["Das Buch liegt auf dem Tisch.", "الكتاب موضوع على الطاولة."],
    ["Ich lege das Buch auf den Tisch.", "أضع الكتاب على الطاولة."],
    ["Wir sitzen in der Küche.", "نجلس في المطبخ."],
    ["Sie geht in die Küche.", "تذهب إلى المطبخ."],
    ["Die Lampe hängt über dem Esstisch.", "المصباح معلق فوق طاولة الطعام."],
    ["Stell den Stuhl neben das Fenster.", "ضع الكرسي بجانب النافذة."],
  ], [
    ["Ich bin in die Schule.", "Ich bin in der Schule.", "sein يصف موقعًا، لذلك نجيب عن Wo? بـ Dativ."],
    ["Ich gehe in der Schule.", "Ich gehe in die Schule.", "الوجهة بعد in تأتي هنا في Akkusativ."],
  ]),
  mainClause: pack([
    ["الفعل في الموقع الثاني", "في الجملة الرئيسية يكون الفعل المصرف ثاني عنصر، لا ثاني كلمة بالضرورة. قد يشغل ظرف كامل الموقع الأول."],
    ["القوس الفعلي", "مع فعل منفصل أو Perfekt أو Modalverb، يأتي الجزء المصرف ثانيًا والجزء الآخر في النهاية."],
  ], [
    ["Ich lerne jeden Abend Deutsch.", "أتعلم الألمانية كل مساء."],
    ["Heute lerne ich zu Hause.", "اليوم أدرس في المنزل."],
    ["Am Wochenende besucht meine Schwester uns.", "تزورنا أختي في عطلة نهاية الأسبوع."],
    ["Der Zug kommt um acht Uhr an.", "يصل القطار في الثامنة."],
    ["Wir haben gestern lange gearbeitet.", "عملنا طويلًا أمس."],
    ["Morgen muss ich früh aufstehen.", "يجب أن أستيقظ باكرًا غدًا."],
  ], [
    ["Heute ich arbeite zu Hause.", "Heute arbeite ich zu Hause.", "عند تقديم الظرف يبقى الفعل في الموقع الثاني."],
    ["Ich anrufe dich später.", "Ich rufe dich später an.", "ينفصل الفعل anrufen في الجملة الرئيسية."],
  ]),
  connectors: pack([
    ["روابط لا تغير الترتيب", "und، aber، oder، denn و sondern تربط جملتين رئيسيتين ويبقى الفعل في الموقع الثاني في كل جملة."],
    ["الفرق بين denn و sondern", "denn يذكر السبب، أما sondern فيصحح نفيًا سابقًا: nicht heute, sondern morgen."],
  ], [
    ["Ich koche, und mein Bruder deckt den Tisch.", "أنا أطبخ وأخي يرتب الطاولة."],
    ["Sie ist müde, aber sie arbeitet weiter.", "هي متعبة لكنها تواصل العمل."],
    ["Kommst du mit, oder bleibst du zu Hause?", "هل ستأتي معنا أم ستبقى في المنزل؟"],
    ["Ich gehe früh schlafen, denn ich muss morgen arbeiten.", "أنام باكرًا لأن عليّ العمل غدًا."],
    ["Wir fahren nicht am Freitag, sondern am Samstag.", "لن نسافر الجمعة بل السبت."],
    ["Er spricht nicht nur Deutsch, sondern auch Englisch.", "لا يتحدث الألمانية فقط بل الإنجليزية أيضًا."],
  ], [
    ["denn ich morgen arbeite", "denn ich arbeite morgen", "denn لا يدفع الفعل إلى النهاية."],
    ["nicht Kaffee, aber Tee", "nicht Kaffee, sondern Tee", "بعد نفي البديل الأول نستخدم sondern للتصحيح."],
  ]),
  subordinate: pack([
    ["الفعل في النهاية", "تبدأ الجملة التابعة بأداة مثل weil، dass أو obwohl وينتقل فعلها المصرف إلى النهاية."],
    ["عند تقديم الجملة التابعة", "إذا جاءت الجملة التابعة أولًا، تشغل الموقع الأول كاملًا ويأتي فعل الجملة الرئيسية بعد الفاصلة مباشرة."],
  ], [
    ["Ich bleibe zu Hause, weil ich krank bin.", "أبقى في المنزل لأنني مريض."],
    ["Sie sagt, dass sie später kommt.", "تقول إنها ستأتي لاحقًا."],
    ["Obwohl es regnet, gehen wir spazieren.", "نخرج للمشي رغم هطول المطر."],
    ["Wenn ich Zeit habe, rufe ich dich an.", "عندما يكون لدي وقت أتصل بك."],
    ["Weil der Bus zu spät kam, nahm ich ein Taxi.", "لأن الحافلة تأخرت أخذت سيارة أجرة."],
    ["Ich weiß nicht, ob er heute arbeitet.", "لا أعرف إن كان يعمل اليوم."],
  ], [
    ["weil ich bin müde", "weil ich müde bin", "في الجملة التابعة يأتي الفعل المصرف في النهاية."],
    ["Wenn ich Zeit habe, ich komme.", "Wenn ich Zeit habe, komme ich.", "بعد الجملة التابعة المتقدمة يأتي فعل الجملة الرئيسية."],
  ]),
  weilDa: pack([
    ["المعنى المشترك", "weil و da يقدمان سببًا ويدفعان الفعل إلى نهاية الجملة التابعة."],
    ["الفرق في الاستعمال", "weil شائع ومحايد ويجيب مباشرة عن warum. أما da فيستعمل أكثر عندما يكون السبب معروفًا أو واضحًا، ويأتي كثيرًا في بداية الجملة."],
  ], [
    ["Ich gehe früh ins Bett, weil ich müde bin.", "أنام باكرًا لأنني متعب."],
    ["Weil der Zug ausfällt, nehmen wir den Bus.", "لأن القطار ملغى نأخذ الحافلة."],
    ["Da morgen ein Feiertag ist, bleiben die Geschäfte geschlossen.", "بما أن غدًا عطلة، تبقى المتاجر مغلقة."],
    ["Da du schon hier bist, können wir anfangen.", "بما أنك هنا بالفعل، يمكننا البدء."],
    ["Er lernt Deutsch, weil er in Deutschland arbeiten möchte.", "يتعلم الألمانية لأنه يريد العمل في ألمانيا."],
    ["Da es stark regnete, wurde das Spiel abgesagt.", "بما أن المطر كان غزيرًا، أُلغيت المباراة."],
  ], [
    ["weil er ist krank", "weil er krank ist", "الفعل يأتي في نهاية الجملة السببية."],
    ["Da ich bin müde, gehe ich.", "Da ich müde bin, gehe ich.", "تطبق قاعدة الفعل النهائي مع da أيضًا."],
  ]),
  vocab: pack([
    ["تعلم الكلمة في سياق", "احفظ الاسم مع أداته وجمعه، والفعل مع مفعوله أو حرف الجر، والصفة مع عكسها. الجملة القصيرة أفضل من ترجمة منفردة."],
    ["المراجعة النشطة", "غطِّ الترجمة وحاول إنتاج الكلمة، ثم استعملها في جملة من حياتك. راجعها بعد يوم ثم بعد عدة أيام."],
  ], [
    ["Ich habe einen Termin beim Zahnarzt.", "لدي موعد عند طبيب الأسنان."],
    ["Bitte füllen Sie dieses Formular aus.", "يرجى ملء هذه الاستمارة."],
    ["Die Rechnung muss bis Freitag bezahlt werden.", "يجب دفع الفاتورة بحلول الجمعة."],
    ["Unser Nachbar ist sehr hilfsbereit.", "جارنا متعاون جدًا."],
    ["Wegen einer Verspätung verpasse ich den Anschluss.", "بسبب تأخير سأفوت وسيلة المواصلات التالية."],
    ["Könnten Sie mir weitere Informationen schicken?", "هل يمكنكم إرسال معلومات إضافية إليّ؟"],
  ], [
    ["Termin = موعد فقط", "einen Termin vereinbaren / absagen", "احفظ الكلمة مع التراكيب الشائعة لا كترجمة منفردة."],
    ["die Formular", "das Formular", "احفظ أداة الاسم معه."],
  ]),
  alsWenn: pack([
    ["als لحدث واحد في الماضي", "نستخدم als لحدث أو فترة حدثت مرة واحدة في الماضي: Als ich zehn Jahre alt war …"],
    ["wenn للتكرار والحاضر والمستقبل", "نستخدم wenn للأحداث المتكررة في الماضي وللشرط أو الزمن في الحاضر والمستقبل."],
  ], [
    ["Als ich klein war, wohnte ich auf dem Land.", "عندما كنت صغيرًا سكنت في الريف."],
    ["Als der Bus kam, stiegen wir ein.", "عندما جاءت الحافلة صعدنا."],
    ["Wenn ich krank bin, bleibe ich zu Hause.", "عندما أمرض أبقى في المنزل."],
    ["Immer wenn es regnete, spielten wir drinnen.", "كلما أمطرت كنا نلعب في الداخل."],
    ["Wenn du morgen Zeit hast, können wir uns treffen.", "إذا كان لديك وقت غدًا يمكننا اللقاء."],
    ["Ruf mich an, wenn du angekommen bist.", "اتصل بي عندما تصل."],
  ], [
    ["Als ich jeden Tag zur Schule ging", "Wenn ich jeden Tag zur Schule ging", "للتكرار في الماضي نستخدم wenn."],
    ["Wenn ich gestern ankam", "Als ich gestern ankam", "للحدث الواحد المحدد في الماضي نستخدم als."],
  ]),
  temporalPrep: pack([
    ["الوقت كنقطة أو مدة", "um لوقت الساعة، am للأيام وأجزاء اليوم، im للأشهر والفصول، seit لبداية مستمرة، vor لوقت مضى، وfür لمدة مخطط لها."],
    ["السؤال المناسب", "اسأل wann عن الموعد، seit wann عن بداية مستمرة، wie lange عن المدة، و bis wann عن النهاية."],
  ], [
    ["Der Kurs beginnt um neun Uhr.", "تبدأ الدورة في التاسعة."],
    ["Am Montag arbeite ich von zu Hause.", "أعمل من المنزل يوم الاثنين."],
    ["Im Sommer fahren wir ans Meer.", "نسافر إلى البحر في الصيف."],
    ["Ich wohne seit drei Jahren hier.", "أسكن هنا منذ ثلاث سنوات."],
    ["Vor einer Woche habe ich ihn getroffen.", "قابلته قبل أسبوع."],
    ["Wir bleiben für zwei Tage in Hamburg.", "نبقى يومين في هامبورغ."],
  ], [
    ["um Montag", "am Montag", "للأيام نستخدم am."],
    ["seit drei Jahren gewohnt", "seit drei Jahren wohnen", "مع seit يستمر الحدث حتى الحاضر ويأتي غالبًا Präsens."],
  ]),
  verbPrep: pack([
    ["الفعل وحرف الجر وحدة", "تعلم الفعل مع حرف الجر والحالة: warten auf + Akkusativ، sprechen mit + Dativ، denken an + Akkusativ."],
    ["لا تعتمد على الترجمة", "قد يختلف الحرف الألماني عن العربية؛ لذلك احفظ سؤالًا وجوابًا نموذجيين مع كل تركيب."],
  ], [
    ["Ich warte auf den nächsten Bus.", "أنتظر الحافلة التالية."],
    ["Wir sprechen über das neue Projekt.", "نتحدث عن المشروع الجديد."],
    ["Sie träumt von einer langen Reise.", "تحلم برحلة طويلة."],
    ["Er bittet seinen Kollegen um Hilfe.", "يطلب من زميله المساعدة."],
    ["Denkst du noch an unseren Termin?", "هل ما زلت تتذكر موعدنا؟"],
    ["Ich danke dir für deine Unterstützung.", "أشكرك على دعمك."],
  ], [
    ["Ich warte für den Bus.", "Ich warte auf den Bus.", "warten يرتبط بـ auf."],
    ["Sie spricht über ihrem Chef.", "Sie spricht mit ihrem Chef.", "للحديث مع شخص نستخدم mit + Dativ."],
  ]),
  home: pack([
    ["المفردات حسب الغرفة", "قسّم مفردات المنزل إلى غرف وأثاث وأجهزة، واحفظ كل اسم مع أداته وصيغة الجمع."],
    ["وصف المكان", "استعمل stehen للأشياء الواقفة، liegen للأشياء الموضوعة أفقيًا، hängen للمعلقات، و sich befinden للوصف العام."],
  ], [
    ["Der Kühlschrank steht in der Küche.", "الثلاجة موجودة في المطبخ."],
    ["Auf dem Sofa liegen zwei Kissen.", "توجد وسادتان على الأريكة."],
    ["Über dem Bett hängt ein Bild.", "توجد صورة معلقة فوق السرير."],
    ["Im Badezimmer gibt es eine Dusche.", "يوجد دش في الحمام."],
    ["Der Kleiderschrank steht neben der Tür.", "خزانة الملابس بجانب الباب."],
    ["Wir bewahren das Geschirr im Küchenschrank auf.", "نحفظ الأواني في خزانة المطبخ."],
  ], [
    ["die Tisch", "der Tisch", "Tisch اسم مذكر."],
    ["Das Bild steht an der Wand.", "Das Bild hängt an der Wand.", "للصورة المعلقة نستخدم hängen."],
  ]),
  adjectives: pack([
    ["الصفة الخبرية", "بعد sein وwerden وbleiben تبقى الصفة بلا نهاية: Das Zimmer ist hell."],
    ["الصفة قبل الاسم", "قبل الاسم تأخذ الصفة نهاية تعتمد على الأداة والجنس والحالة: ein helles Zimmer، die nette Nachbarin."],
  ], [
    ["Die Wohnung ist modern und hell.", "الشقة عصرية ومضيئة."],
    ["Wir suchen eine ruhige Wohnung.", "نبحث عن شقة هادئة."],
    ["Er trägt einen schwarzen Mantel.", "يرتدي معطفًا أسود."],
    ["Das ist ein interessantes Angebot.", "هذا عرض ممتع."],
    ["Ich spreche mit einer freundlichen Mitarbeiterin.", "أتحدث مع موظفة ودودة."],
    ["Die neuen Möbel sind sehr praktisch.", "الأثاث الجديد عملي جدًا."],
  ], [
    ["Das Zimmer ist helles.", "Das Zimmer ist hell.", "بعد sein لا تأخذ الصفة نهاية."],
    ["ein modern Wohnung", "eine moderne Wohnung", "المؤنث مع eine يحتاج نهاية -e."],
  ]),
  comparative: pack([
    ["صيغة المقارنة", "نضيف غالبًا -er إلى الصفة ونستعمل als للمقارنة: schneller als. بعض الصفات تأخذ Umlaut مثل älter وgrößer."],
    ["المساواة", "للتعبير عن التساوي نستخدم so … wie: Der Bus ist so schnell wie der Zug."],
  ], [
    ["Mein Fahrrad ist schneller als deins.", "دراجتي أسرع من دراجتك."],
    ["Diese Wohnung ist größer, aber teurer.", "هذه الشقة أكبر لكنها أغلى."],
    ["Heute ist es wärmer als gestern.", "الجو اليوم أدفأ من أمس."],
    ["Anna ist so groß wie ihre Schwester.", "آنا بطول أختها."],
    ["Der neue Weg ist besser als der alte.", "الطريق الجديد أفضل من القديم."],
    ["Mit dem Zug reist man bequemer.", "السفر بالقطار أكثر راحة."],
  ], [
    ["mehr schnell", "schneller", "الصفات القصيرة تكوّن المقارنة غالبًا بـ -er."],
    ["größer wie", "größer als", "بعد صيغة المقارنة نستخدم als، أما wie فللتساوي."],
  ]),
  superlative: pack([
    ["صيغتان شائعتان", "بعد sein نستخدم am + -sten: am schnellsten. وقبل الاسم نستخدم أداة التعريف ونهاية الصفة: der schnellste Zug."],
    ["صيغ غير منتظمة", "من الصيغ المهمة: gut → besser → am besten، viel → mehr → am meisten، gern → lieber → am liebsten."],
  ], [
    ["Der Juli ist der heißeste Monat.", "يوليو هو أكثر الشهور حرارة."],
    ["Dieses Buch gefällt mir am besten.", "يعجبني هذا الكتاب أكثر من غيره."],
    ["Sie ist die jüngste Person im Team.", "هي أصغر شخص في الفريق."],
    ["Am Wochenende schlafe ich am längsten.", "أنام أطول وقت في عطلة نهاية الأسبوع."],
    ["Das ist die wichtigste Aufgabe.", "هذه أهم مهمة."],
    ["Von allen Verkehrsmitteln ist das Fahrrad am umweltfreundlichsten.", "الدراجة هي الأكثر صداقة للبيئة بين وسائل النقل."],
  ], [
    ["am beste", "am besten", "الصيغة الخبرية تنتهي عادةً بـ -sten."],
    ["der am schnellsten Zug", "der schnellste Zug", "قبل الاسم نستعمل الصفة المصرفة بلا am."],
  ]),
  future: pack([
    ["بناء Futur I", "نصرف werden في الموقع الثاني، ويأتي المصدر في نهاية الجملة: Ich werde morgen arbeiten."],
    ["المستقبل أم التخمين؟", "يعبّر Futur I عن خطة أو توقع، وقد يعبّر عن تخمين في الحاضر: Er wird jetzt zu Hause sein."],
  ], [
    ["Ich werde dich morgen anrufen.", "سأتصل بك غدًا."],
    ["Wir werden nächstes Jahr umziehen.", "سننتقل العام المقبل."],
    ["Wirst du an dem Kurs teilnehmen?", "هل ستشارك في الدورة؟"],
    ["Das Wetter wird wahrscheinlich besser werden.", "من المحتمل أن يتحسن الطقس."],
    ["Er wird jetzt im Büro sein.", "يُرجح أنه في المكتب الآن."],
    ["In Zukunft werden mehr Menschen von zu Hause arbeiten.", "في المستقبل سيعمل أشخاص أكثر من المنزل."],
  ], [
    ["Ich werde morgen arbeite.", "Ich werde morgen arbeiten.", "بعد werden يأتي المصدر."],
    ["Ich wird kommen.", "Ich werde kommen.", "تصريف werden مع ich هو werde."],
  ]),
  passivePresent: pack([
    ["التركيز على الحدث", "يبنى Passiv في الحاضر من werden + Partizip II، ويكون المهم هو الفعل أو نتيجته لا من قام به."],
    ["ذكر الفاعل", "يمكن ذكر المنفذ بـ von + Dativ عند الحاجة: Der Brief wird vom Chef unterschrieben."],
  ], [
    ["Die Straße wird repariert.", "يُصلح الطريق."],
    ["Das Essen wird frisch zubereitet.", "يُحضّر الطعام طازجًا."],
    ["Die E-Mails werden jeden Morgen beantwortet.", "يُرد على الرسائل كل صباح."],
    ["Der Vertrag wird vom Direktor unterschrieben.", "يُوقّع العقد من المدير."],
    ["Hier werden Fahrräder verkauft.", "تُباع الدراجات هنا."],
    ["Wann wird das Paket geliefert?", "متى سيُسلّم الطرد؟"],
  ], [
    ["Die Straße wird reparieren.", "Die Straße wird repariert.", "بعد werden نحتاج Partizip II."],
    ["Der Brief ist geschrieben vom Chef.", "Der Brief wird vom Chef geschrieben.", "لعملية تحدث الآن نستخدم werden، لا sein."],
  ]),
  passivePast: pack([
    ["Präteritum Passiv", "يتكون من wurde/wurden + Partizip II: Das Haus wurde gebaut."],
    ["Perfekt Passiv", "يتكون من ist/sind + Partizip II + worden: Das Haus ist gebaut worden. لا نستعمل geworden هنا."],
  ], [
    ["Die Brücke wurde 1990 gebaut.", "بُني الجسر عام 1990."],
    ["Die Fenster wurden gestern gereinigt.", "نُظفت النوافذ أمس."],
    ["Der Termin wurde kurzfristig abgesagt.", "أُلغي الموعد في وقت قصير."],
    ["Das Problem ist inzwischen gelöst worden.", "حُلّت المشكلة في هذه الأثناء."],
    ["Die Rechnung ist bereits bezahlt worden.", "دُفعت الفاتورة بالفعل."],
    ["Wann wurde die Firma gegründet?", "متى تأسست الشركة؟"],
  ], [
    ["Das Haus war gebaut.", "Das Haus wurde gebaut.", "للعملية الماضية نستخدم wurde؛ war gebaut يصف حالة."],
    ["Der Brief ist geschrieben geworden.", "Der Brief ist geschrieben worden.", "Perfekt Passiv يستعمل worden."],
  ]),
  passiveModal: pack([
    ["البناء", "يأتي Modalverb مصرفًا، ثم Partizip II، ثم werden في المصدر: Die Aufgabe muss gemacht werden."],
    ["المعنى", "يعبّر الفعل الناقص عن الوجوب أو الإمكان أو السماح، بينما يبقى الحدث نفسه في المبني للمجهول."],
  ], [
    ["Die Aufgabe muss heute erledigt werden.", "يجب إنجاز المهمة اليوم."],
    ["Das Formular kann online ausgefüllt werden.", "يمكن ملء الاستمارة عبر الإنترنت."],
    ["Hier darf nicht geraucht werden.", "لا يُسمح بالتدخين هنا."],
    ["Die Rechnung soll bis Freitag bezahlt werden.", "ينبغي دفع الفاتورة بحلول الجمعة."],
    ["Der Termin muss verschoben werden.", "يجب تأجيل الموعد."],
    ["Die Medikamente dürfen nicht zusammen eingenommen werden.", "لا يجوز تناول الأدوية معًا."],
  ], [
    ["Die Aufgabe muss gemacht.", "Die Aufgabe muss gemacht werden.", "نحتاج werden في نهاية Passiv مع Modalverb."],
    ["Das kann werden repariert.", "Das kann repariert werden.", "Partizip II يسبق werden في نهاية الجملة."],
  ]),
  bevor: pack([
    ["ترتيب حدثين", "bevor تعني قبل أن وتقدم الحدث اللاحق زمنيًا؛ الحدث في الجملة الرئيسية يقع أولًا."],
    ["الفعل في النهاية", "bevor تبدأ جملة تابعة، لذلك يقف فعلها المصرف في النهاية. وعند تقديمها يأتي فعل الجملة الرئيسية بعد الفاصلة."],
  ], [
    ["Ich frühstücke, bevor ich zur Arbeit gehe.", "أتناول الإفطار قبل أن أذهب إلى العمل."],
    ["Bevor du gehst, schließ bitte das Fenster.", "قبل أن تذهب أغلق النافذة."],
    ["Sie prüft die Adresse, bevor sie das Paket abschickt.", "تراجع العنوان قبل إرسال الطرد."],
    ["Wir müssen tanken, bevor wir losfahren.", "يجب أن نزود السيارة بالوقود قبل الانطلاق."],
    ["Bevor der Kurs begann, stellte sich die Lehrerin vor.", "قبل أن تبدأ الدورة عرّفت المعلمة بنفسها."],
    ["Ruf mich an, bevor du eine Entscheidung triffst.", "اتصل بي قبل أن تتخذ قرارًا."],
  ], [
    ["bevor ich gehe zur Arbeit", "bevor ich zur Arbeit gehe", "فعل الجملة التابعة يأتي في النهاية."],
    ["Bevor du gehst, du musst zahlen.", "Bevor du gehst, musst du zahlen.", "بعد الجملة التابعة المتقدمة يأتي فعل الجملة الرئيسية."],
  ]),
  relativeNomAcc: pack([
    ["مرجع الضمير", "يطابق ضمير الوصل الاسم السابق في الجنس والعدد، أما حالته فتحددها وظيفته داخل الجملة الموصولة."],
    ["Nominativ وAkkusativ", "إذا كان الضمير فاعلًا نستخدم der/die/das، وإذا كان مفعولًا مذكرًا نستخدم den. يقف الفعل في نهاية الجملة."],
  ], [
    ["Das ist der Mann, der nebenan wohnt.", "هذا هو الرجل الذي يسكن بجوارنا."],
    ["Die Frau, die dort wartet, ist meine Chefin.", "المرأة التي تنتظر هناك هي مديرتي."],
    ["Das Buch, das auf dem Tisch liegt, gehört mir.", "الكتاب الموجود على الطاولة لي."],
    ["Der Film, den wir gestern gesehen haben, war spannend.", "الفيلم الذي شاهدناه أمس كان مشوقًا."],
    ["Die Tasche, die ich gekauft habe, war reduziert.", "الحقيبة التي اشتريتها كانت مخفضة."],
    ["Die Kinder, die im Garten spielen, sind unsere Nachbarn.", "الأطفال الذين يلعبون في الحديقة هم جيراننا."],
  ], [
    ["Der Mann, ich kenne, kommt.", "Der Mann, den ich kenne, kommt.", "نحتاج ضمير وصل في Akkusativ لأنه مفعول kennen."],
    ["Die Frau, die dort arbeitet ist nett.", "Die Frau, die dort arbeitet, ist nett.", "نفصل الجملة الموصولة بفاصلتين عند وقوعها وسط الجملة."],
  ]),
  suffixBar: pack([
    ["المعنى", "تحول اللاحقة -bar كثيرًا من الأفعال إلى صفات بمعنى قابل لأن يُفعل: lesen → lesbar، bezahlen → bezahlbar."],
    ["حدود القاعدة", "لا يمكن إضافة -bar إلى كل فعل بصورة طبيعية؛ تعلم الصفات الشائعة في سياق، وانتبه إلى تغيرات الجذر مثل erklären → erklärbar."],
  ], [
    ["Die Schrift ist gut lesbar.", "الخط مقروء جيدًا."],
    ["Die Wohnung ist für uns bezahlbar.", "الشقة في متناول قدرتنا المادية."],
    ["Dieses Problem ist lösbar.", "هذه المشكلة قابلة للحل."],
    ["Der Fehler war leicht vermeidbar.", "كان الخطأ سهل التجنب."],
    ["Die Datei ist nicht mehr verwendbar.", "لم يعد الملف قابلًا للاستخدام."],
    ["Seine Entscheidung ist nachvollziehbar.", "قراره مفهوم ويمكن تتبع منطقه."],
  ], [
    ["können lesenbar", "lesbar", "تضاف -bar إلى جذر مناسب، لا إلى المصدر كاملًا مع en."],
    ["Die Text ist lesbar.", "Der Text ist lesbar.", "الخطأ هنا في أداة الاسم؛ Text مذكر."],
  ]),
  relativeDative: pack([
    ["Dativ داخل الجملة الموصولة", "إذا كان الفعل أو حرف الجر يطلب Dativ نستخدم dem للمذكر والمحايد، der للمؤنث، وdenen للجمع."],
    ["حرف الجر قبل الضمير", "يوضع حرف الجر قبل ضمير الوصل: die Kollegin, mit der ich arbeite. ويبقى الفعل في النهاية."],
  ], [
    ["Der Kollege, dem ich geholfen habe, bedankt sich.", "الزميل الذي ساعدته يشكرني."],
    ["Die Frau, mit der ich gesprochen habe, ist Ärztin.", "المرأة التي تحدثت معها طبيبة."],
    ["Das Kind, dem das Fahrrad gehört, wartet draußen.", "الطفل الذي تعود إليه الدراجة ينتظر في الخارج."],
    ["Die Freunde, bei denen wir übernachtet haben, wohnen in Bonn.", "الأصدقاء الذين بتنا عندهم يسكنون في بون."],
    ["Das Thema, über das wir sprechen, ist wichtig.", "الموضوع الذي نتحدث عنه مهم."],
    ["Die Firma, für die er arbeitet, ist international.", "الشركة التي يعمل لديها دولية."],
  ], [
    ["Die Frau, die ich geholfen habe", "Die Frau, der ich geholfen habe", "helfen يطلب Dativ."],
    ["Der Kollege, mit dem ich arbeite mit", "Der Kollege, mit dem ich arbeite", "يوضع حرف الجر مرة واحدة قبل ضمير الوصل."],
  ]),
  relativeReview: pack([
    ["طريقة الاختيار", "حدد أولًا جنس وعدد الاسم المرجعي، ثم اسأل عن وظيفة الفراغ داخل الجملة الموصولة لتعرف الحالة."],
    ["ترتيب الجملة", "يأتي ضمير الوصل في البداية، ثم الفاعل وبقية العناصر، ويقف الفعل المصرف في النهاية."],
  ], [
    ["Ich suche einen Kurs, der am Abend stattfindet.", "أبحث عن دورة تُقام مساءً."],
    ["Das ist die Wohnung, die wir mieten möchten.", "هذه هي الشقة التي نريد استئجارها."],
    ["Kennst du den Mann, dem dieses Auto gehört?", "هل تعرف الرجل الذي تعود إليه هذه السيارة؟"],
    ["Die Stadt, in der ich wohne, ist sehr ruhig.", "المدينة التي أسكن فيها هادئة جدًا."],
    ["Das sind die Leute, mit denen wir gereist sind.", "هؤلاء هم الأشخاص الذين سافرنا معهم."],
    ["Der Computer, den ich gestern gekauft habe, funktioniert gut.", "الحاسوب الذي اشتريته أمس يعمل جيدًا."],
  ], [
    ["Das Buch, das ich lese es", "Das Buch, das ich lese", "ضمير الوصل يشغل موقع المفعول، فلا نكرر es."],
    ["Die Stadt, wo ich wohne", "Die Stadt, in der ich wohne", "في اللغة المعيارية نفضل حرف الجر مع ضمير الوصل للمكان المحدد."],
  ]),
};

const lessonGroups = {
  1: "reflexive", 2: "reflexive", 3: "genitive", 4: "genitive", 5: "preterite", 6: "modalPast",
  7: "regularPast", 8: "animals", 9: "routine", 10: "welch", 11: "weekend", 12: "demonstrative",
  13: "accPrep", 14: "datPrep", 15: "localPrep", 16: "localPrep", 17: "localPrep", 18: "localPrep",
  19: "mainClause", 20: "connectors", 21: "subordinate", 22: "weilDa", 23: "vocab", 24: "alsWenn",
  25: "temporalPrep", 26: "temporalPrep", 27: "localPrep", 28: "verbPrep", 29: "home", 30: "vocab",
  31: "adjectives", 32: "comparative", 33: "superlative", 34: "future", 35: "passivePresent",
  36: "passivePast", 37: "passiveModal", 38: "bevor", 39: "relativeNomAcc", 40: "suffixBar",
  41: "relativeDative", 42: "relativeReview",
};

const fallbackSummaries = {
  1: "شرح عملي للأفعال المنعكسة في مستوى A2: اختيار الضمير الصحيح، التفريق بين Akkusativ وDativ، وبناء جمل يومية سليمة. المحتوى تعليمي تحريري لأن مصدر الفيديو النصي غير متاح حاليًا.",
  8: "مجموعة أساسية من مفردات الحيوانات مع أدوات الأسماء وصيغ الجمع، إضافة إلى جمل بسيطة لوصف الشكل والقدرة ومكان العيش. المحتوى تعليمي تحريري لأن مصدر الفيديو النصي غير متاح حاليًا.",
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
  if (!document || !enhancement) throw new Error(`A2/${lessonId}: documentation or group not found`);

  if (!document.summary?.trim() && fallbackSummaries[lessonId]) document.summary = fallbackSummaries[lessonId];
  document.explanation = (document.explanation ?? []).filter((item) => item.origin !== origin);
  document.explanation = mergeUnique(document.explanation, enhancement.explanations, "heading");
  const examplesKey = Array.isArray(document.examples_from_video) ? "examples_from_video" : "examples";
  document[examplesKey] = (document[examplesKey] ?? []).filter((item) => item.origin !== origin);
  document[examplesKey] = mergeUnique(document[examplesKey], enhancement.examples, "de");
  document.common_mistakes = (document.common_mistakes ?? []).filter((item) => item.origin !== origin);
  document.common_mistakes = mergeUnique(document.common_mistakes, enhancement.mistakes, "wrong");
  document.editorial_enrichment = { standard: "A2", purpose: "clear_explanations_and_additional_practice_examples", video_claim: false };
  document.reading_time_minutes = Math.max(Number(document.reading_time_minutes) || 0, 5);
}

await writeFile(documentationPath, `${JSON.stringify(documents, null, 2)}\n`, "utf8");
console.log(`Enriched ${Object.keys(lessonGroups).length} A2 documentation entries.`);
