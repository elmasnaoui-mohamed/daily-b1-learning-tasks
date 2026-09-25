import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documentationPath = path.join(root, "src", "data", "documentation", "b2Documentation.json");

const explanation = (heading, content) => ({ heading, content, origin: "editorial_clarification" });
const example = (de, ar, note = "مثال تعليمي إضافي") => ({ de, ar, note, origin: "editorial_clarification" });
const mistake = (wrong, correct, explanationText) => ({ wrong, correct, explanation: explanationText, origin: "editorial_clarification" });

const enhancements = {
  1: {
    examples: [
      example("Die steigenden Preise belasten viele Haushalte.", "تُثقل الأسعار المتزايدة كاهل كثير من الأسر."),
      example("Die von vielen Fachleuten kritisierte Maßnahme wurde geändert.", "عُدّل الإجراء الذي انتقده كثير من الخبراء."),
    ],
    mistakes: [
      mistake("die steigen Preise", "die steigenden Preise", "يُبنى Partizip I من المصدر مع d ثم يأخذ نهاية الصفة."),
      mistake("die von Experten kritisieren Maßnahme", "die von Experten kritisierte Maßnahme", "المعنى مبني للمجهول ومكتمل، لذلك نستخدم Partizip II مع نهاية الصفة."),
    ],
  },
  2: {
    explanations: [
      explanation("متى نستخدم Partizip II كصفة؟", "يصف Partizip II غالبًا نتيجة حدث اكتمل: النافذة التي كُسرت أصبحت مكسورة، والرسالة التي كُتبت أصبحت مكتوبة. لذلك يكون التركيز على الحالة الناتجة لا على الشخص الذي قام بالفعل."),
      explanation("تصريف النهاية", "يتصرف Partizip II مثل أي صفة قبل الاسم. نحدد الأداة والجنس والحالة أولًا، ثم نضيف النهاية المناسبة: ein geschriebener Brief، eine geschriebene Nachricht، mit einem geschriebenen Text."),
    ],
    examples: [
      example("Das zerbrochene Fenster muss ersetzt werden.", "يجب استبدال النافذة المكسورة."),
      example("Ich habe die unterschriebenen Verträge abgeschickt.", "أرسلتُ العقود الموقعة."),
      example("Sie spricht mit dem verletzten Mann.", "هي تتحدث مع الرجل المصاب."),
      example("Das frisch gekochte Essen riecht gut.", "رائحة الطعام المطهو حديثًا طيبة."),
      example("Das vergessene Passwort wurde zurückgesetzt.", "أُعيد تعيين كلمة المرور المنسية."),
    ],
    mistakes: [
      mistake("die schließen Tür", "die geschlossene Tür", "نحتاج Partizip II من schließen ثم نهاية الصفة المناسبة."),
      mistake("mit ein geschrieben Brief", "mit einem geschriebenen Brief", "بعد mit نستخدم Dativ، ولذلك تتغير الأداة ونهاية الصفة معًا."),
    ],
  },
  3: {
    explanations: [
      explanation("الفرق في المعنى", "Partizip I يصف من يقوم بالفعل في الوقت نفسه: der wartende Kunde. أما Partizip II فيصف من وقع عليه الفعل أو النتيجة: der reparierte Computer."),
      explanation("اختبار سريع للاختيار", "حوّل التركيب إلى جملة موصولة. إذا كان الاسم هو الفاعل فاختر غالبًا Partizip I؛ وإذا كان الفعل قد اكتمل أو وقع على الاسم فاختر غالبًا Partizip II."),
    ],
    examples: [
      example("die lächelnde Verkäuferin", "البائعة المبتسمة", "هي التي تبتسم: معنى نشط."),
      example("die verkaufte Wohnung", "الشقة المبيعة", "تم بيعها: نتيجة مكتملة."),
      example("Wir beruhigten das weinende Kind.", "هدّأنا الطفل الباكي."),
      example("Die beschädigten Geräte werden repariert.", "تُصلح الأجهزة المتضررة."),
      example("Die gestern veröffentlichten Zahlen überraschten alle.", "فاجأت الأرقام المنشورة أمس الجميع."),
      example("Der vor der Tür wartende Mann ist mein Nachbar.", "الرجل المنتظر أمام الباب هو جاري."),
    ],
    mistakes: [
      mistake("der reparierende Computer", "der reparierte Computer", "الحاسوب لا يُجري الإصلاح بنفسه؛ المقصود أنه تم إصلاحه، لذا نستخدم Partizip II."),
      mistake("die gelacht Frau", "die lachende Frau", "المرأة تقوم بالفعل الآن، لذا نستخدم Partizip I."),
    ],
  },
  4: {
    explanations: [
      explanation("التركيب ثابت", "الحالة لا تتعلق هنا بالحركة والمكان. الفعل نفسه يفرض an + Dativ، لذلك احفظه مع حرف الجر والحالة: teilnehmen an + Dativ، leiden an + Dativ."),
      explanation("السؤال والضمير", "نسأل عن الأشخاص بـ an wem، وعن الأشياء بـ woran. وفي الجواب يمكن استبدال الشيء بـ daran: Woran arbeitest du? – Ich arbeite daran."),
    ],
    examples: [
      example("Mehr als hundert Personen nahmen an der Umfrage teil.", "شارك أكثر من مئة شخص في الاستطلاع."),
      example("Sie leidet seit Jahren an einer seltenen Krankheit.", "تعاني منذ سنوات من مرض نادر."),
      example("Ich zweifle an seiner Erklärung.", "أشك في تفسيره."),
      example("Das Team arbeitet an einer neuen Lösung.", "يعمل الفريق على حل جديد."),
      example("Dem Projekt mangelt es an finanzieller Unterstützung.", "يفتقر المشروع إلى الدعم المالي."),
      example("Woran liegt die Verzögerung? – Sie liegt an einem technischen Problem.", "ما سبب التأخير؟ سببه مشكلة تقنية."),
    ],
    mistakes: [
      mistake("Wir nehmen an den Kurs teil.", "Wir nehmen an dem Kurs teil.", "teilnehmen يأتي مع an + Dativ؛ المذكر يصبح dem."),
      mistake("An was arbeitest du?", "Woran arbeitest du?", "مع الأشياء تُستعمل صيغة wo(r) + حرف الجر في اللغة المعيارية."),
    ],
  },
  5: {
    explanations: [
      explanation("أفعال تأخذ an + Akkusativ", "من أهمها denken an، sich erinnern an، glauben an، sich gewöhnen an، sich wenden an و appellieren an. يجب حفظ الضمير المنعكس أيضًا عندما يكون جزءًا من الفعل."),
      explanation("السؤال والضمير", "نسأل عن شخص بـ an wen، وعن شيء بـ woran. وعند الإحالة إلى شيء سبق ذكره نستخدم daran: Ich erinnere mich daran."),
    ],
    examples: [
      example("Denk bitte an deinen Termin.", "تذكّر موعدك من فضلك."),
      example("Sie erinnert sich gern an ihre Studienzeit.", "تتذكر فترة دراستها بسرور."),
      example("Viele Menschen glauben an einen Neuanfang.", "يؤمن كثير من الناس ببداية جديدة."),
      example("Ich muss mich erst an das neue System gewöhnen.", "يجب أن أعتاد أولًا على النظام الجديد."),
      example("Bitte wenden Sie sich an unsere Personalabteilung.", "يرجى التوجه إلى قسم الموارد البشرية لدينا."),
      example("Die Organisation appelliert an die Verantwortung der Politik.", "تناشد المنظمة حس المسؤولية لدى الساسة."),
    ],
    mistakes: [
      mistake("Ich erinnere den Urlaub.", "Ich erinnere mich an den Urlaub.", "الفعل في هذا المعنى منعكس ويحتاج an + Akkusativ."),
      mistake("An wem denkst du? – Daran denke ich.", "An wen denkst du? – An meinen Bruder.", "مع الشخص نستخدم an wen، أما daran فللأشياء أو الأفكار."),
    ],
  },
  6: {
    explanations: [
      explanation("المعنى غير الواقعي", "تأتي als ob بعد انطباع أو تصرف يبدو حقيقيًا، لكن المتكلم يشك فيه أو يعدّه غير واقعي. لذلك تستعمل الجملة التابعة غالبًا Konjunktiv II."),
      explanation("ترتيب الجملة", "في الصيغة القياسية يقف الفعل المصرف في نهاية جملة als ob: Er tut so, als ob er mich nicht kennen würde. ويمكن أيضًا استعمال als مع الفعل مباشرة في أسلوب أكثر اختصارًا."),
    ],
    examples: [
      example("Sie sieht aus, als ob sie die ganze Nacht gearbeitet hätte.", "تبدو كما لو أنها عملت طوال الليل."),
      example("Er redet, als wäre er der Chef.", "يتحدث كما لو كان المدير."),
      example("Du tust so, als hättest du nichts gehört.", "تتصرف كأنك لم تسمع شيئًا."),
      example("Das Kind verhält sich, als ob es schon erwachsen wäre.", "يتصرف الطفل كما لو كان بالغًا."),
      example("Es klingt, als könnte die Lösung funktionieren.", "يبدو الأمر كما لو أن الحل قد ينجح."),
      example("Er sah mich an, als kenne er mich nicht.", "نظر إليّ كما لو أنه لا يعرفني."),
    ],
    mistakes: [
      mistake("Er tut so, als ob er weiß alles.", "Er tut so, als ob er alles wüsste.", "بعد als ob يأتي الفعل في النهاية، ويُستعمل Konjunktiv II للمعنى غير الواقعي."),
      mistake("als ob er würde alles wissen", "als ob er alles wissen würde", "المصدر يسبق würde في نهاية الجملة التابعة."),
    ],
  },
  7: {
    explanations: [
      explanation("الحياد في نقل الكلام", "Konjunktiv I لا يعني أن الكلام صحيح أو خاطئ؛ بل يوضح أن المتكلم ينقل قول شخص آخر دون أن يتبناه مباشرة. لذلك يشيع في الصحافة والتقارير."),
      explanation("عندما تتطابق الصيغة", "إذا كانت صيغة Konjunktiv I مطابقة لـ Indikativ ولا يظهر الفرق، يُستعمل غالبًا Konjunktiv II لتوضيح النقل، خصوصًا مع الجمع: Sie sagten, sie hätten keine Zeit."),
    ],
    examples: [
      example("Die Ministerin erklärt, die Lage sei unter Kontrolle.", "توضح الوزيرة أن الوضع تحت السيطرة."),
      example("Der Zeuge sagt, er habe nichts gesehen.", "يقول الشاهد إنه لم ير شيئًا."),
      example("Die Firma teilt mit, sie werde neue Stellen schaffen.", "تعلن الشركة أنها ستوفر وظائف جديدة."),
      example("Er behauptet, er könne das Problem allein lösen.", "يدعي أنه يستطيع حل المشكلة وحده."),
      example("Die Ärztin sagt, der Patient müsse sich ausruhen.", "تقول الطبيبة إن على المريض أن يرتاح."),
      example("Die Mitarbeiter sagten, sie hätten davon nichts gewusst.", "قال الموظفون إنهم لم يكونوا على علم بذلك."),
    ],
    mistakes: [
      mistake("Sie sagt, ich sei müde.", "Sie sagt, sie sei müde.", "يجب تعديل الضمير وفق الشخص الذي نُنقل كلامه."),
      mistake("Er sagt, er wäre krank.", "Er sagt, er sei krank.", "عندما تكون صيغة Konjunktiv I واضحة نستخدم sei؛ wäre تُستعمل بديلًا عند الحاجة أو لمعنى افتراضي."),
    ],
  },
  8: {
    summary: "يبني هذا الدرس على أساسيات الكلام غير المباشر ويوسّعها إلى الماضي والمستقبل والأفعال الناقصة، مع الانتباه إلى الضمائر وإشارات الزمان والمكان. الشرح التالي تعليمي تحريري لأن مصدر الفيديو النصي غير متاح حاليًا.",
    explanations: [
      explanation("نقل الماضي", "لنقل حدث سابق نستخدم غالبًا Konjunktiv I من haben أو sein مع Partizip II: Er sagt, er habe gearbeitet. Sie erklärt, sie sei früh gegangen."),
      explanation("نقل المستقبل", "للمستقبل نستخدم werde مع المصدر: Die Firma erklärt, sie werde die Preise senken. وفي الجملة التابعة يبقى المصدر في النهاية."),
      explanation("الأفعال الناقصة", "يُصرّف Modalverb في Konjunktiv I ويبقى المصدر في النهاية: Er sagt, er müsse länger arbeiten."),
    ],
    rules: [
      { rule: "الماضي في الكلام غير المباشر", explanation: "استخدم habe أو sei بصيغة Konjunktiv I مع Partizip II.", pattern: "habe/sei + Partizip II", origin: "editorial_clarification" },
      { rule: "المستقبل في الكلام غير المباشر", explanation: "استخدم werde مع المصدر في نهاية الجملة.", pattern: "werde + … + Infinitiv", origin: "editorial_clarification" },
    ],
    examples: [
      example("Er berichtet, er habe den Antrag bereits gestellt.", "يفيد بأنه قدّم الطلب بالفعل."),
      example("Sie sagt, sie sei gestern in Berlin angekommen.", "تقول إنها وصلت إلى برلين أمس."),
      example("Der Sprecher erklärt, die Regierung werde bald reagieren.", "يوضح المتحدث أن الحكومة سترد قريبًا."),
      example("Die Studentin meint, sie müsse mehr üben.", "ترى الطالبة أن عليها أن تتدرب أكثر."),
      example("Er behauptet, man habe ihn falsch verstanden.", "يدعي أن الناس فهموه بصورة خاطئة."),
      example("Sie sagte, sie könne an diesem Tag nicht kommen.", "قالت إنها لا تستطيع الحضور في ذلك اليوم."),
    ],
    mistakes: [
      mistake("Er sagt, er habe gestern gearbeitet hier.", "Er sagt, er habe gestern hier gearbeitet.", "يقف Partizip II في نهاية الجملة المنقولة."),
      mistake("Sie sagt, sie werde kommt.", "Sie sagt, sie werde kommen.", "بعد werde يأتي المصدر غير المصرف."),
    ],
  },
  10: {
    explanations: [
      explanation("من السؤال المباشر إلى غير المباشر", "نحذف ترتيب السؤال المباشر ونبني جملة تابعة. تبقى أداة السؤال في البداية، ثم يأتي الفاعل وبقية العناصر، ويقف الفعل في النهاية."),
      explanation("تغيير المنظور", "عدّل الضمائر والزمان والمكان بما يناسب موقف الناقل: heute قد تصبح an diesem Tag، وhier قد تصبح dort، وich قد تتحول إلى er أو sie."),
    ],
    examples: [
      example("Der Journalist fragt, wie die Regierung das Problem lösen wolle.", "يسأل الصحفي كيف تريد الحكومة حل المشكلة."),
      example("Sie möchte wissen, woher die Daten stammten.", "تريد أن تعرف من أين جاءت البيانات."),
      example("Er fragte, wer die Verantwortung übernommen habe.", "سأل من الذي تحمّل المسؤولية."),
      example("Die Kundin fragt, wie lange die Lieferung dauere.", "تسأل الزبونة كم يستغرق التوصيل."),
      example("Man wollte wissen, weshalb das Treffen abgesagt worden sei.", "أراد الناس معرفة سبب إلغاء الاجتماع."),
      example("Der Prüfer fragte, welche Lösung der Teilnehmer vorschlage.", "سأل الممتحن أي حل يقترحه المشارك."),
    ],
    mistakes: [
      mistake("Sie fragt, wann beginnt der Kurs.", "Sie fragt, wann der Kurs beginne.", "في السؤال غير المباشر يأتي الفاعل قبل الفعل، والفعل في النهاية."),
      mistake("Er fragt, ob warum sie fehlt.", "Er fragt, warum sie fehlt.", "مع W-Frage نحتفظ بأداة السؤال ولا نضيف ob."),
    ],
  },
  11: {
    explanations: [
      explanation("قراءة موجهة بالأسئلة", "اقرأ السؤال أولًا وحدد الكلمات المفتاحية، ثم ابحث عن إعادة صياغتها في النص. الإجابة الصحيحة كثيرًا ما تستعمل مرادفًا بدل تكرار كلمات السؤال حرفيًا."),
      explanation("تمييز الرأي عن المعلومة", "انتبه إلى مؤشرات مثل laut der Studie و dem Autor zufolge للمعلومات المنقولة، وإلى meiner Ansicht nach أو der Autor kritisiert للرأي والتقييم."),
      explanation("استنتاج معنى الكلمة", "افحص الجملة السابقة واللاحقة، والروابط مثل jedoch و deshalb و obwohl؛ فهي تكشف علاقة التضاد أو السبب أو النتيجة وتساعد على استنتاج المعنى."),
    ],
    examples: [
      example("Dem Text zufolge hat sich die Situation deutlich verbessert.", "وفقًا للنص، تحسن الوضع بوضوح."),
      example("Im Gegensatz dazu vertritt die Autorin eine kritischere Position.", "في المقابل تتبنى الكاتبة موقفًا أكثر نقدًا."),
      example("Aus diesem Grund wurden zusätzliche Maßnahmen ergriffen.", "لهذا السبب اتُّخذت إجراءات إضافية."),
      example("Die Aussage lässt sich nicht eindeutig aus dem Text ableiten.", "لا يمكن استنتاج العبارة بوضوح من النص."),
      example("Obwohl die Nachfrage gestiegen ist, blieb das Angebot unverändert.", "على الرغم من ارتفاع الطلب، بقي العرض دون تغيير."),
      example("Der Verfasser weist auf mögliche langfristige Folgen hin.", "يشير الكاتب إلى عواقب محتملة طويلة المدى."),
    ],
    mistakes: [
      mistake("Ich wähle eine Antwort nur, weil sie ein Wort aus dem Text wiederholt.", "Ich prüfe, ob die Antwort die gesamte Aussage des Textes wiedergibt.", "قد يكون تكرار الكلمة فخًا؛ المطلوب مطابقة الفكرة لا كلمة منفردة."),
      mistake("Ich übersetze jedes Wort, bevor ich die Hauptaussage bestimme.", "Ich bestimme zuerst die Hauptaussage und die logischen Verbindungen.", "الترجمة كلمة بكلمة تستهلك الوقت وقد تخفي بنية الحجة."),
    ],
  },
  12: {
    explanations: [
      explanation("التعلم في مجموعات", "رتّب الأفعال بحسب حرف الجر والحالة: auf + Akkusativ، über + Akkusativ، zu + Dativ، von + Dativ، mit + Dativ. يساعد ذلك على استرجاعها أسرع من قائمة عشوائية."),
      explanation("wo(r)- و da(r)-", "للأشياء نستخدم السؤال wo(r) + Präposition والجواب da(r) + Präposition: Worauf verzichtest du? – Darauf kann ich nicht verzichten. أما الأشخاص فنستخدم حرف الجر مع wen أو wem."),
    ],
    examples: [
      example("Viele Unternehmen verzichten auf gedruckte Rechnungen.", "تستغني شركات كثيرة عن الفواتير المطبوعة."),
      example("Die Studie verfügt über eine breite Datengrundlage.", "تتوفر للدراسة قاعدة بيانات واسعة."),
      example("Jeder kann zu einer nachhaltigen Entwicklung beitragen.", "يمكن لكل شخص المساهمة في تنمية مستدامة."),
      example("Der Erfolg hängt von einer sorgfältigen Planung ab.", "يعتمد النجاح على تخطيط دقيق."),
      example("Wir müssen uns intensiver mit diesem Thema auseinandersetzen.", "يجب أن نتناول هذا الموضوع بصورة أعمق."),
      example("Die Ergebnisse beziehen sich auf den Zeitraum von 2020 bis 2025.", "تتعلق النتائج بالفترة من 2020 إلى 2025."),
      example("Die Expertin überzeugte uns von der Wirksamkeit der Methode.", "أقنعتنا الخبيرة بفاعلية الطريقة."),
    ],
    mistakes: [
      mistake("Das hängt an dem Wetter ab.", "Das hängt von dem Wetter ab.", "abhängen يرتبط بـ von + Dativ."),
      mistake("Ich beschäftige mich über das Thema.", "Ich beschäftige mich mit dem Thema.", "sich beschäftigen يرتبط بـ mit + Dativ."),
    ],
  },
  13: {
    explanations: [
      explanation("حدث مكتمل في المستقبل", "نستخدم Futur II عندما ننظر من نقطة مستقبلية إلى حدث سيكون قد انتهى قبلها. تظهر معه كثيرًا عبارات مثل bis morgen و bis Ende des Jahres."),
      explanation("افتراض عن الماضي", "يمكن أيضًا استعماله للتخمين بشأن حدث ماضٍ: Er wird den Zug verpasst haben تعني على الأرجح أنه فاته القطار."),
      explanation("اختيار haben أو sein", "نتبع قاعدة Perfekt نفسها: أفعال الحركة أو تغير الحالة الشائعة تأخذ sein، ومعظم الأفعال الأخرى تأخذ haben."),
    ],
    examples: [
      example("Bis Ende des Monats werden wir das Projekt abgeschlossen haben.", "بحلول نهاية الشهر سنكون قد أنهينا المشروع."),
      example("In zwei Jahren wird sie ihr Studium beendet haben.", "خلال سنتين ستكون قد أنهت دراستها."),
      example("Wenn du ankommst, werde ich bereits gegessen haben.", "عندما تصل سأكون قد أكلت بالفعل."),
      example("Er wird die Nachricht noch nicht gelesen haben.", "يُرجح أنه لم يقرأ الرسالة بعد."),
      example("Die Gäste werden inzwischen nach Hause gefahren sein.", "يُفترض أن الضيوف قد عادوا إلى بيوتهم في هذه الأثناء."),
      example("Bis 18 Uhr muss der Bericht fertiggestellt worden sein.", "يجب أن يكون التقرير قد أُنجز بحلول السادسة مساءً."),
    ],
    mistakes: [
      mistake("Ich werde den Bericht geschrieben.", "Ich werde den Bericht geschrieben haben.", "يحتاج Futur II إلى haben أو sein بعد Partizip II."),
      mistake("Sie wird angekommen haben.", "Sie wird angekommen sein.", "ankommen يكون Perfekt الخاص به مع sein."),
    ],
  },
  14: {
    examples: [
      example("Das ist eine Firma, deren Produkte weltweit verkauft werden.", "هذه شركة تُباع منتجاتها في جميع أنحاء العالم."),
      example("Der Junge, dessen Fahrrad gestohlen wurde, rief die Polizei.", "اتصل الفتى الذي سُرقت دراجته بالشرطة."),
    ],
    mistakes: [
      mistake("Die Frau, dessen Auto kaputt ist", "Die Frau, deren Auto kaputt ist", "نختار deren لأن الاسم المرجعي Frau مؤنث."),
      mistake("Der Mann, dessen das Haus verkauft wurde", "Der Mann, dessen Haus verkauft wurde", "لا تأتي أداة تعريف بين dessen أو deren والاسم المملوك."),
    ],
  },
  15: {
    explanations: [
      explanation("خطوتان لاختيار الضمير", "أولًا خذ الجنس والعدد من الاسم المرجعي. ثانيًا حدد وظيفة الضمير داخل الجملة الموصولة: فاعل Nominativ، مفعول Akkusativ، أو بعد فعل أو حرف جر يطلب Dativ أو Genitiv."),
      explanation("الفعل في النهاية", "الجملة الموصولة جملة تابعة؛ لذلك يقف الفعل المصرف في نهايتها. وإذا وُجد مصدر أو Partizip II تتجمع الأفعال في النهاية وفق القاعدة المناسبة."),
      explanation("حرف الجر قبل الضمير", "إذا احتاج المعنى حرف جر، يوضع قبل ضمير الوصل: die Firma, bei der ich arbeite؛ das Thema, über das wir sprechen."),
    ],
    examples: [
      example("Der Mann, der dort wartet, ist mein Vermieter.", "الرجل الذي ينتظر هناك هو مالك البيت."),
      example("Das Buch, das du mir empfohlen hast, war sehr hilfreich.", "الكتاب الذي نصحتني به كان مفيدًا جدًا."),
      example("Die Kollegin, der ich geholfen habe, bedankt sich.", "الزميلة التي ساعدتها تشكرني."),
      example("Das ist die Organisation, für die ich ehrenamtlich arbeite.", "هذه هي المنظمة التي أعمل لديها تطوعًا."),
      example("Der Bewerber, dessen Unterlagen vollständig sind, wird eingeladen.", "سيُدعى المتقدم الذي ملفاته مكتملة."),
      example("Alles, was er gesagt hat, wurde protokolliert.", "دُوّن كل ما قاله."),
      example("Die Stadt, in der ich geboren wurde, liegt am Meer.", "المدينة التي وُلدت فيها تقع على البحر."),
    ],
    mistakes: [
      mistake("Die Frau, die ich geholfen habe", "Die Frau, der ich geholfen habe", "helfen يطلب Dativ، ولذلك نستخدم der للمؤنث."),
      mistake("Das Thema, das wir darüber sprechen", "Das Thema, über das wir sprechen", "يوضع حرف الجر قبل ضمير الوصل ولا نضيف darüber داخل الجملة."),
    ],
  },
  16: {
    explanations: [
      explanation("طريقة الحل", "ابدأ بالفعل، ثم استخرج حرف الجر المحفوظ معه، ثم حدد الحالة. بعد ذلك اختر أداة السؤال: wo(r)- للأشياء، وحرف الجر مع wen أو wem للأشخاص."),
      explanation("الضمائر الإحالية", "عند تجنب تكرار شيء استعمل da(r) + Präposition: Ich freue mich auf den Urlaub. Ich freue mich darauf. لا تستعمل هذه الصيغة عادةً للإشارة إلى الأشخاص."),
    ],
    examples: [
      example("Worüber beschwert sich der Kunde? – Über die lange Wartezeit.", "ممَّ يشتكي الزبون؟ من وقت الانتظار الطويل."),
      example("Mit wem hast du dich verabredet? – Mit einer Kollegin.", "مع من اتفقت على موعد؟ مع زميلة."),
      example("Ich interessiere mich für digitale Bildung und beschäftige mich täglich damit.", "أهتم بالتعليم الرقمي وأتناول هذا الموضوع يوميًا."),
      example("Die Entscheidung hängt davon ab, wie hoch die Kosten sind.", "يعتمد القرار على مدى ارتفاع التكاليف."),
      example("Wir freuen uns darauf, Sie persönlich kennenzulernen.", "نتطلع إلى التعرف إليكم شخصيًا."),
      example("Er entschuldigte sich bei seiner Kollegin für den Fehler.", "اعتذر لزميلته عن الخطأ."),
      example("Die Bevölkerung protestiert gegen die geplante Maßnahme.", "يحتج السكان على الإجراء المخطط له."),
    ],
    mistakes: [
      mistake("Wofür hast du gesprochen? – Für meinen Chef.", "Für wen hast du gesprochen? – Für meinen Chef.", "مع الأشخاص نستخدم حرف الجر + wen أو wem، لا wo(r)-."),
      mistake("Ich freue mich über zu reisen.", "Ich freue mich darauf, zu reisen.", "قبل جملة مصدرية نستعمل الضمير الإحالي المناسب ثم فاصلة وzu + Infinitiv."),
    ],
  },
};

function mergeUnique(existing, additions, key) {
  const values = new Set(existing.map((item) => String(item?.[key] ?? "").trim().toLocaleLowerCase("de")));
  return [...existing, ...additions.filter((item) => {
    const value = String(item?.[key] ?? "").trim().toLocaleLowerCase("de");
    if (!value || values.has(value)) return false;
    values.add(value);
    return true;
  })];
}

const documents = JSON.parse(await readFile(documentationPath, "utf8"));
for (const [lessonIdText, enhancement] of Object.entries(enhancements)) {
  const lessonId = Number(lessonIdText);
  const document = documents.find((entry) => Number(entry.lesson_id) === lessonId);
  if (!document) throw new Error(`B2/${lessonId}: documentation entry not found`);

  if (enhancement.summary) document.summary = enhancement.summary;
  document.explanation = (document.explanation ?? []).filter((item) => item.origin !== "editorial_clarification");
  document.explanation = mergeUnique(document.explanation ?? [], enhancement.explanations ?? [], "heading");

  const examplesKey = Array.isArray(document.examples_from_video) ? "examples_from_video" : "examples";
  document[examplesKey] = (document[examplesKey] ?? []).filter((item) => item.origin !== "editorial_clarification");
  document[examplesKey] = mergeUnique(document[examplesKey] ?? [], enhancement.examples ?? [], "de");

  const rulesKey = Array.isArray(document.rules_from_video) ? "rules_from_video" : "grammar_rules";
  document[rulesKey] = (document[rulesKey] ?? []).filter((item) => item.origin !== "editorial_clarification");
  if (enhancement.rules?.length) {
    document[rulesKey] = mergeUnique(document[rulesKey] ?? [], enhancement.rules, "rule");
  }

  document.common_mistakes = (document.common_mistakes ?? []).filter((item) => item.origin !== "editorial_clarification");
  document.common_mistakes = mergeUnique(document.common_mistakes ?? [], enhancement.mistakes ?? [], "wrong");
  document.editorial_enrichment = {
    standard: "B2",
    purpose: "clear_explanations_and_additional_practice_examples",
    video_claim: false,
  };
  document.reading_time_minutes = Math.max(Number(document.reading_time_minutes) || 0, 6);
}

await writeFile(documentationPath, `${JSON.stringify(documents, null, 2)}\n`, "utf8");
console.log(`Enriched ${Object.keys(enhancements).length} B2 documentation entries.`);
