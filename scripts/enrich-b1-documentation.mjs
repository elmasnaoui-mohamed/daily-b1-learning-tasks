import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documentationPath = path.join(root, "src", "data", "documentation", "b1Documentation.json");
const origin = "editorial_clarification";
const E = (heading, content) => ({ heading, content, origin });
const X = (de, ar, note = "مثال تعليمي إضافي") => ({ de, ar, note, origin });
const M = (wrong, correct, explanation) => ({ wrong, correct, explanation, origin });

const enhancements = {
  1: {
    examples: [
      X("Ich hoffe, bald eine passende Stelle zu finden.", "آمل أن أجد قريبًا وظيفة مناسبة."),
      X("Es ist wichtig, regelmäßig Pausen zu machen.", "من المهم أخذ فترات راحة بانتظام."),
    ],
    mistakes: [
      M("Ich hoffe, finde eine Stelle.", "Ich hoffe, eine Stelle zu finden.", "عندما يشترك الفعلان في الفاعل، يأتي المصدر مع zu في نهاية التركيب."),
      M("Ich versuche, zu pünktlich kommen.", "Ich versuche, pünktlich zu kommen.", "تأتي zu مباشرة قبل المصدر البسيط."),
    ],
  },
  2: {
    explanations: [
      E("متى نحذف zu؟", "لا تأتي zu بعد الأفعال الناقصة مثل können و müssen، وبعد werden، وكذلك في تراكيب شائعة مع lassen وأفعال الإدراك والحركة مثل sehen، hören و gehen."),
      E("مصدران في نهاية الجملة", "يبقى الفعل الثاني في المصدر من دون zu: Ich kann heute kommen. ومع Perfekt لبعض هذه التراكيب يظهر Ersatzinfinitiv: Ich habe ihn kommen sehen."),
    ],
    examples: [
      X("Wir müssen morgen früh aufstehen.", "يجب أن نستيقظ غدًا باكرًا."),
      X("Ich höre die Kinder im Garten spielen.", "أسمع الأطفال يلعبون في الحديقة."),
      X("Sie geht nach der Arbeit einkaufen.", "تذهب للتسوق بعد العمل."),
      X("Bitte lass mich ausreden.", "دعني أكمل كلامي من فضلك."),
      X("Er bleibt trotz des Lärms ruhig sitzen.", "يبقى جالسًا بهدوء رغم الضوضاء."),
    ],
    mistakes: [
      M("Ich muss zu arbeiten.", "Ich muss arbeiten.", "بعد Modalverb يأتي المصدر بلا zu."),
      M("Sie lässt ihn zu warten.", "Sie lässt ihn warten.", "بعد lassen يأتي المصدر بلا zu."),
    ],
  },
  3: {
    explanations: [
      E("الفعل يفتح تركيب المصدر", "أفعال مثل versuchen، planen، hoffen، vergessen، versprechen و scheinen تُستعمل كثيرًا مع zu + Infinitiv عندما يتعلق الفعلان بالشخص نفسه."),
      E("الأفعال المنفصلة", "مع الفعل المنفصل تدخل zu بين السابقة والجذر: anzufangen، einzukaufen، teilzunehmen. أما الأفعال غير المنفصلة فتبقى كلمة واحدة: zu verstehen."),
    ],
    examples: [
      X("Sie versucht, weniger Zucker zu essen.", "تحاول أن تتناول سكرًا أقل."),
      X("Wir planen, im Sommer umzuziehen.", "نخطط للانتقال في الصيف."),
      X("Vergiss nicht, die Tür abzuschließen.", "لا تنسَ إغلاق الباب بالمفتاح."),
      X("Er hat versprochen, pünktlich zu sein.", "وعد بأن يكون في الموعد."),
      X("Das Problem scheint schwer zu lösen zu sein.", "تبدو المشكلة صعبة الحل."),
      X("Ich freue mich darauf, am Kurs teilzunehmen.", "أتطلع إلى المشاركة في الدورة."),
    ],
    mistakes: [
      M("Ich versuche, zu weniger arbeiten.", "Ich versuche, weniger zu arbeiten.", "توضع zu قبل المصدر، لا قبل بقية عناصر الجملة."),
      M("Ich plane, zu umziehen.", "Ich plane, umzuziehen.", "في الفعل المنفصل تدخل zu بين السابقة والجذر."),
    ],
  },
  4: {
    explanations: [
      E("um … zu مع فاعل واحد", "نستخدم um … zu عندما يكون فاعل الجملة الرئيسية هو نفسه منفذ الفعل في جملة الهدف. لا نكرر الفاعل داخل تركيب المصدر."),
      E("damit مع فاعلين", "نستخدم damit عندما يختلف الفاعل، أو عندما نريد جملة كاملة بفعل مصرف. يقف الفعل في نهاية جملة damit."),
    ],
    examples: [
      X("Ich lerne jeden Tag, um die Prüfung zu bestehen.", "أدرس كل يوم لكي أنجح في الامتحان."),
      X("Sie fährt früher los, um nicht im Stau zu stehen.", "تنطلق أبكر كي لا تعلق في الازدحام."),
      X("Ich spreche langsam, damit alle mich verstehen.", "أتحدث ببطء لكي يفهمني الجميع."),
      X("Wir schicken dir die Adresse, damit du den Ort findest.", "نرسل إليك العنوان لكي تجد المكان."),
      X("Er spart Geld, um sich ein Auto kaufen zu können.", "يدخر المال كي يتمكن من شراء سيارة."),
    ],
    mistakes: [
      M("Ich lerne, damit die Prüfung bestehen.", "Ich lerne, um die Prüfung zu bestehen.", "الفاعل واحد، لذا نستخدم um … zu."),
      M("Ich erkläre es dir, um du es verstehst.", "Ich erkläre es dir, damit du es verstehst.", "الفاعلان مختلفان، لذلك نحتاج damit مع جملة كاملة."),
    ],
  },
  5: {
    explanations: [
      E("معاني lassen الأساسية", "قد يعني lassen السماح، أو جعل شخص يفعل شيئًا، أو ترك شيء في مكانه. يحدد السياق المعنى، ويأتي الفعل الثاني في المصدر بلا zu."),
      E("sich lassen كبديل للمبني للمجهول", "التركيب sich lassen + Infinitiv يعني أن الشيء قابل للفعل: Das Problem lässt sich lösen = يمكن حل المشكلة."),
    ],
    examples: [
      X("Meine Eltern lassen mich heute länger ausgehen.", "يسمح لي والداي بالخروج لوقت أطول اليوم."),
      X("Ich lasse mein Fahrrad reparieren.", "أجعل دراجتي تُصلح / آخذها للتصليح."),
      X("Lass bitte die Tür offen.", "اترك الباب مفتوحًا من فضلك."),
      X("Das Fenster lässt sich nicht öffnen.", "لا يمكن فتح النافذة."),
      X("Sie ließ ihre Tasche im Zug liegen.", "تركت حقيبتها في القطار."),
      X("Lass uns eine kurze Pause machen.", "دعنا نأخذ استراحة قصيرة."),
    ],
    mistakes: [
      M("Ich lasse mein Auto zu reparieren.", "Ich lasse mein Auto reparieren.", "بعد lassen يأتي المصدر بلا zu."),
      M("Das Problem lässt lösen.", "Das Problem lässt sich lösen.", "في معنى القابلية نحتاج الضمير المنعكس sich."),
    ],
  },
  6: {
    explanations: [
      E("الافتراض والرغبة", "يصف Konjunktiv II موقفًا غير واقعي أو رغبة أو احتمالًا: Wenn ich mehr Zeit hätte … وتستعمل hätte و wäre وصيغ الأفعال الناقصة مباشرة."),
      E("würde + Infinitiv", "تصلح würde مع معظم الأفعال، لكننا نفضل الصيغ الشائعة hätte، wäre، könnte، müsste و sollte بدل würde haben أو würde sein."),
    ],
    examples: [
      X("Wenn ich näher wohnen würde, käme ich öfter vorbei.", "لو كنت أسكن أقرب لزرتكم أكثر."),
      X("An deiner Stelle würde ich mit dem Chef sprechen.", "لو كنت مكانك لتحدثت مع المدير."),
      X("Ich hätte gern einen Termin am Montag.", "أرغب في موعد يوم الاثنين."),
      X("Könnten Sie mir bitte helfen?", "هل يمكنكم مساعدتي من فضلكم؟"),
      X("Es wäre besser, früher anzufangen.", "سيكون من الأفضل أن نبدأ أبكر."),
      X("Wenn das Wetter besser wäre, könnten wir wandern gehen.", "لو كان الطقس أفضل لاستطعنا الذهاب للمشي."),
    ],
    mistakes: [
      M("Wenn ich Zeit würde haben", "Wenn ich Zeit hätte", "مع haben نستخدم الصيغة الشائعة hätte."),
      M("Wenn ich hätte Zeit, würde ich kommen.", "Wenn ich Zeit hätte, würde ich kommen.", "الفعل المصرف يقف في نهاية جملة wenn."),
    ],
  },
  7: {
    explanations: [
      E("احفظ الوحدة كاملة", "حرف الجر والحالة جزء من معنى الفعل: warten auf + Akkusativ، teilnehmen an + Dativ، abhängen von + Dativ. لا يمكن اختيار الحرف بالترجمة الحرفية."),
      E("السؤال عن شخص أو شيء", "للأشياء نستعمل wo(r) + حرف الجر، وللأشخاص حرف الجر مع wen أو wem: Worauf wartest du? Auf wen wartest du?"),
    ],
    examples: [
      X("Wir warten seit einer Stunde auf den Bus.", "ننتظر الحافلة منذ ساعة."),
      X("Er interessiert sich für moderne Kunst.", "يهتم بالفن الحديث."),
      X("Die Entscheidung hängt vom Preis ab.", "يعتمد القرار على السعر."),
      X("Sie nimmt regelmäßig an Fortbildungen teil.", "تشارك بانتظام في دورات تدريبية."),
      X("Ich denke oft an meine Schulzeit.", "أفكر كثيرًا في فترة المدرسة."),
      X("Worüber sprecht ihr? – Über unsere Reise.", "عمّ تتحدثون؟ عن رحلتنا."),
    ],
    mistakes: [
      M("Ich warte für den Zug.", "Ich warte auf den Zug.", "warten يرتبط بـ auf + Akkusativ."),
      M("Womit wartest du?", "Worauf wartest du?", "أداة السؤال يجب أن تحتوي حرف الجر الذي يطلبه الفعل."),
    ],
  },
  8: {
    explanations: [
      E("الفعل المنعكس مع حرف الجر", "احفظ الضمير المنعكس وحرف الجر مع الفعل: sich freuen auf، sich erinnern an، sich kümmern um. يتغير الضمير مع الفاعل بينما يبقى حرف الجر ثابتًا."),
      E("Akkusativ أم Dativ للضمير؟", "معظم هذه الأفعال تستعمل الضمير المنعكس في Akkusativ، لكن بعض التراكيب قد تستعمل Dativ عند وجود مفعول آخر، لذلك تعلم المثال الكامل."),
    ],
    examples: [
      X("Ich freue mich auf das Wochenende.", "أتطلع إلى عطلة نهاية الأسبوع."),
      X("Sie erinnert sich an ihren ersten Arbeitstag.", "تتذكر أول يوم عمل لها."),
      X("Wir kümmern uns um die neuen Gäste.", "نهتم بالضيوف الجدد."),
      X("Er beschwert sich über den Lärm.", "يشتكي من الضوضاء."),
      X("Interessierst du dich für Politik?", "هل تهتم بالسياسة؟"),
      X("Die Kollegen unterhalten sich über das Projekt.", "يتحدث الزملاء عن المشروع."),
    ],
    mistakes: [
      M("Ich freue auf den Urlaub.", "Ich freue mich auf den Urlaub.", "الفعل sich freuen منعكس ويحتاج الضمير المناسب."),
      M("Sie erinnert sich über den Termin.", "Sie erinnert sich an den Termin.", "sich erinnern يرتبط بـ an + Akkusativ."),
    ],
  },
  9: {
    examples: [
      X("Worauf freust du dich? – Darauf, meine Familie wiederzusehen.", "إلى ماذا تتطلع؟ إلى رؤية عائلتي مجددًا."),
    ],
    mistakes: [
      M("Worauf wartest du? – Auf ihn warte ich darauf.", "Auf ihn warte ich.", "مع الشخص نستعمل حرف الجر والضمير مباشرة، ولا نضيف darauf."),
      M("Daüber sprechen wir morgen.", "Darüber sprechen wir morgen.", "تُضاف r عندما يبدأ حرف الجر بحركة: darüber، darauf، daran."),
    ],
  },
  10: {
    explanations: [
      E("الإحالة إلى جملة أو فعل", "يمكن لـ da(r)- أن يمهد لجملة مصدرية أو جملة dass: Ich freue mich darauf, dich zu sehen. Er besteht darauf, dass wir pünktlich kommen."),
      E("معاني dabei", "قد تعني dabei أثناء ذلك، أو حاضرًا/مشاركًا، أو مع الشخص: Ich war dabei. Ich habe meinen Ausweis dabei."),
    ],
    examples: [
      X("Ich denke darüber nach, den Arbeitsplatz zu wechseln.", "أفكر في تغيير مكان العمل."),
      X("Sie besteht darauf, dass alle pünktlich sind.", "تصر على أن يكون الجميع في الموعد."),
      X("Wir rechnen damit, dass die Preise steigen.", "نتوقع ارتفاع الأسعار."),
      X("Er hat Angst davor, einen Fehler zu machen.", "يخشى ارتكاب خطأ."),
      X("Ich koche, und du kannst mir dabei helfen.", "أنا أطبخ ويمكنك مساعدتي في ذلك."),
      X("Hast du deinen Ausweis dabei?", "هل تحمل بطاقة هويتك معك؟"),
    ],
    mistakes: [
      M("Ich freue mich darüber, dich zu sehen.", "Ich freue mich darauf, dich zu sehen.", "sich freuen على حدث مستقبلي يأتي غالبًا مع auf، لذا نستخدم darauf."),
      M("Ich warte darauf ihn.", "Ich warte auf ihn.", "لا نستخدم da(r)- للإشارة إلى شخص."),
    ],
  },
  11: {
    explanations: [
      E("الشخص والشيء", "في أفعال العطاء والإرسال والشرح يكون الشخص غالبًا Dativ والشيء Akkusativ: jemandem etwas geben. اسأل wem للشخص و was للشيء."),
      E("ترتيب المفعولين", "إذا كانا اسمين يأتي Dativ غالبًا قبل Akkusativ. وإذا كان أحدهما ضميرًا يتقدم الضمير، وإذا كانا ضميرين يأتي Akkusativ قبل Dativ: Ich gebe es ihm."),
    ],
    examples: [
      X("Die Lehrerin erklärt den Teilnehmern die Aufgabe.", "تشرح المعلمة المهمة للمشاركين."),
      X("Kannst du mir deinen Stift leihen?", "هل يمكنك إعارتي قلمك؟"),
      X("Ich schicke meiner Schwester ein Paket.", "أرسل لأختي طردًا."),
      X("Der Arzt verschreibt dem Patienten ein Medikament.", "يصف الطبيب للمريض دواءً."),
      X("Ich gebe es ihm morgen zurück.", "سأعيده إليه غدًا."),
      X("Sie hat mir die neue Kollegin vorgestellt.", "عرّفتني بالزميلة الجديدة."),
    ],
    mistakes: [
      M("Ich gebe der Mann das Buch.", "Ich gebe dem Mann das Buch.", "المذكر في Dativ يأخذ dem."),
      M("Ich erkläre ihm sie.", "Ich erkläre sie ihm.", "عندما يكون المفعولان ضميرين يأتي Akkusativ قبل Dativ."),
    ],
  },
  12: {
    explanations: [
      E("أفعال مهمة", "من الأفعال الشائعة ذات المفعولين: anbieten، empfehlen، erlauben، verbieten، versprechen، zeigen، wünschen و vorlesen. احفظها بالنمط jemandem etwas."),
      E("التحويل إلى ضمائر", "حدد الحالة قبل الاستبدال: der Kollegin تصبح ihr، و den Plan يصبح ihn. بهذه الطريقة تتجنب اختيار ضمير صحيح في حالة خاطئة."),
    ],
    examples: [
      X("Der Chef bietet den Mitarbeitern flexible Arbeitszeiten an.", "يعرض المدير على الموظفين ساعات عمل مرنة."),
      X("Ich empfehle dir diesen Film.", "أنصحك بهذا الفيلم."),
      X("Die Eltern erlauben dem Kind eine Stunde Fernsehen.", "يسمح الوالدان للطفل بساعة من مشاهدة التلفاز."),
      X("Sie versprach ihrem Freund Unterstützung.", "وعدت صديقها بالدعم."),
      X("Zeigst du uns den Weg?", "هل ترينا الطريق؟"),
      X("Ich wünsche Ihnen einen angenehmen Aufenthalt.", "أتمنى لكم إقامة طيبة."),
    ],
    mistakes: [
      M("Ich empfehle dich diesen Kurs.", "Ich empfehle dir diesen Kurs.", "الشخص مع empfehlen يأتي في Dativ."),
      M("Sie zeigt zu mir das Foto.", "Sie zeigt mir das Foto.", "الشخص مفعول Dativ مباشر ولا يحتاج zu."),
    ],
  },
  13: {
    examples: [
      X("Nachdem ich die E-Mail gelesen hatte, antwortete ich sofort.", "بعد أن قرأت الرسالة، أجبت فورًا."),
      X("Sie war bereits gegangen, als ich anrief.", "كانت قد غادرت بالفعل عندما اتصلت."),
      X("Wir hatten lange gewartet, bevor der Bus kam.", "كنا قد انتظرنا طويلًا قبل أن تأتي الحافلة."),
      X("Er konnte die Tür öffnen, weil er den Schlüssel gefunden hatte.", "تمكن من فتح الباب لأنه كان قد وجد المفتاح."),
    ],
    mistakes: [
      M("Ich hatte nach Hause gegangen.", "Ich war nach Hause gegangen.", "gehen يأخذ sein في الأزمنة المركبة."),
      M("Sie hatte gegessen gehabt.", "Sie hatte gegessen.", "Plusquamperfekt يتكون من hatte أو war مع Partizip II مرة واحدة."),
    ],
  },
  14: {
    explanations: [
      E("حدث يسبق آخر", "تربط nachdem حدثين؛ الحدث في جملة nachdem يحدث أولًا. في سرد الماضي يأتي هذا الحدث غالبًا في Plusquamperfekt، والحدث التالي في Präteritum أو Perfekt."),
      E("ترتيب الجملة", "بعد nachdem يقف الفعل المصرف في النهاية. وإذا بدأت الجملة بـ nachdem، يأتي فعل الجملة الرئيسية مباشرة بعد الفاصلة."),
    ],
    examples: [
      X("Nachdem er gefrühstückt hatte, fuhr er zur Arbeit.", "بعد أن تناول الإفطار، ذهب إلى العمل."),
      X("Wir gingen spazieren, nachdem der Regen aufgehört hatte.", "خرجنا للمشي بعد أن توقف المطر."),
      X("Nachdem sie angekommen war, rief sie ihre Eltern an.", "بعد أن وصلت، اتصلت بوالديها."),
      X("Nachdem ich den Vertrag geprüft hatte, unterschrieb ich ihn.", "بعد أن راجعت العقد، وقّعته."),
      X("Er entspannte sich, nachdem er die Prüfung bestanden hatte.", "استرخى بعد أن نجح في الامتحان."),
    ],
    mistakes: [
      M("Nachdem er hatte gegessen, ging er.", "Nachdem er gegessen hatte, ging er.", "يتجمع Partizip II والفعل المساعد في نهاية الجملة التابعة."),
      M("Nachdem ich angekommen war, ich rief an.", "Nachdem ich angekommen war, rief ich an.", "عند تقديم الجملة التابعة يأتي الفعل أولًا في الجملة الرئيسية."),
    ],
  },
  15: {
    explanations: [
      E("سؤال نعم أو لا", "نستخدم ob عندما لا توجد أداة سؤال: Kommst du? تصبح Ich möchte wissen, ob du kommst. يقف الفعل في نهاية الجملة غير المباشرة."),
      E("W-Frage", "نحتفظ بأداة السؤال مثل wann، warum، wo أو wie، ثم يأتي الفاعل وبقية العناصر، والفعل في النهاية."),
    ],
    examples: [
      X("Können Sie mir sagen, ob der Zug pünktlich ist?", "هل يمكنكم إخباري ما إذا كان القطار في الموعد؟"),
      X("Ich weiß nicht, wann das Geschäft öffnet.", "لا أعرف متى يفتح المتجر."),
      X("Sie fragt, warum du so spät gekommen bist.", "تسأل لماذا أتيت متأخرًا."),
      X("Weißt du, wo ich die Fahrkarten kaufen kann?", "هل تعرف أين يمكنني شراء التذاكر؟"),
      X("Mich interessiert, wie lange der Kurs dauert.", "يهمني أن أعرف مدة الدورة."),
      X("Er möchte wissen, wer an dem Projekt teilnimmt.", "يريد معرفة من يشارك في المشروع."),
    ],
    mistakes: [
      M("Ich weiß nicht, wann kommt er.", "Ich weiß nicht, wann er kommt.", "في السؤال غير المباشر يأتي الفعل في النهاية."),
      M("Sie fragt, ob warum ich gehe.", "Sie fragt, warum ich gehe.", "لا نجمع ob مع أداة سؤال."),
    ],
  },
  16: {
    explanations: [
      E("ضمير عام", "man يعني الناس أو المرء أو صيغة عامة غير محددة. يُكتب بحرف صغير ويأخذ دائمًا فعل المفرد الغائب: man sagt، man kann."),
      E("حالات man", "في Nominativ نقول man، وفي Akkusativ einen، وفي Dativ einem. ضمير الملكية الموافق هو sein: Man muss seinen Ausweis zeigen."),
    ],
    examples: [
      X("In Deutschland trennt man den Müll.", "في ألمانيا يفرز الناس النفايات."),
      X("Hier darf man nicht rauchen.", "لا يُسمح بالتدخين هنا."),
      X("Man sollte regelmäßig seine E-Mails prüfen.", "ينبغي للمرء مراجعة بريده الإلكتروني بانتظام."),
      X("Diese Musik macht einen ruhig.", "هذه الموسيقى تجعل المرء هادئًا."),
      X("So etwas kann einem leicht passieren.", "قد يحدث شيء كهذا للمرء بسهولة."),
      X("Wie sagt man das auf Deutsch?", "كيف يُقال ذلك بالألمانية؟"),
    ],
    mistakes: [
      M("Man sagen, dass …", "Man sagt, dass …", "man يأخذ فعل المفرد الغائب."),
      M("Man muss ihre Anmeldung schicken.", "Man muss seine Anmeldung schicken.", "ضمير الملكية الموافق لـ man هو sein."),
    ],
  },
  17: {
    explanations: [
      E("التصريف بحسب الحالة", "jemand و niemand يكونان فاعلًا بلا نهاية، ويأتيان غالبًا بصيغة jemanden و niemanden في Akkusativ، و jemandem و niemandem في Dativ."),
      E("مع الإضافة", "يمكن تحديد الشخص أكثر باستعمال jemand مع صفة اسمية: jemand Neues، jemand Nettes. بعد nichts و etwas تتصرف الصفة بالطريقة نفسها."),
    ],
    examples: [
      X("Jemand wartet vor der Tür.", "هناك شخص ينتظر أمام الباب."),
      X("Ich habe niemanden gesehen.", "لم أرَ أحدًا."),
      X("Kann mir jemand helfen?", "هل يستطيع أحد مساعدتي؟"),
      X("Sie hat mit niemandem darüber gesprochen.", "لم تتحدث مع أحد عن ذلك."),
      X("Ich möchte jemand Neues kennenlernen.", "أود التعرف إلى شخص جديد."),
      X("Niemand wusste die richtige Antwort.", "لم يعرف أحد الإجابة الصحيحة."),
    ],
    mistakes: [
      M("Ich kenne jemand hier.", "Ich kenne jemanden hier.", "بعد kennen نحتاج Akkusativ: jemanden."),
      M("Ich spreche mit niemanden.", "Ich spreche mit niemandem.", "بعد mit نحتاج Dativ: niemandem."),
    ],
  },
  18: {
    explanations: [
      E("عدم التحديد", "تضيف irgend- معنى غير محدد: irgendwer شخص ما، irgendwo في مكان ما، irgendwann في وقت ما، irgendwie بطريقة ما، irgendetwas شيء ما."),
      E("الفرق عن السؤال", "wer و wo و wann أدوات سؤال، أما irgendwer و irgendwo و irgendwann فتدل على وجود شخص أو مكان أو وقت غير معروف أو غير مهم."),
    ],
    examples: [
      X("Irgendjemand hat mein Fenster geöffnet.", "شخص ما فتح نافذتي."),
      X("Wir treffen uns irgendwann nächste Woche.", "سنلتقي في وقت ما الأسبوع المقبل."),
      X("Mein Schlüssel muss irgendwo hier sein.", "لا بد أن مفتاحي موجود في مكان ما هنا."),
      X("Irgendwie werden wir eine Lösung finden.", "سنجد حلًا بطريقة ما."),
      X("Möchtest du irgendetwas trinken?", "هل ترغب في شرب شيء ما؟"),
      X("Du kannst irgendeinen Termin auswählen.", "يمكنك اختيار أي موعد."),
    ],
    mistakes: [
      M("Irgendwo hat angerufen.", "Irgendjemand hat angerufen.", "irgendwo للمكان، أما الشخص فهو irgendjemand أو irgendwer."),
      M("Wir treffen uns irgendwer.", "Wir treffen uns irgendwann.", "لوقت غير محدد نستخدم irgendwann."),
    ],
  },
  19: {
    explanations: [
      E("تعلم الصفة مع مقابلها", "احفظ الصفة داخل جملة ومع مرادف أو ضد، مثل zuverlässig ↔ unzuverlässig و geduldig ↔ ungeduldig. هذا يثبت المعنى والاستعمال."),
      E("الصفة الخبرية والوصفية", "بعد sein و werden تبقى الصفة بلا نهاية: Der Kollege ist zuverlässig. وقبل الاسم تأخذ نهاية: ein zuverlässiger Kollege."),
    ],
    examples: [
      X("Unsere neue Kollegin ist sehr zuverlässig.", "زميلتنا الجديدة جديرة بالثقة جدًا."),
      X("Du musst bei dieser Aufgabe geduldig sein.", "يجب أن تكون صبورًا في هذه المهمة."),
      X("Das Kind ist neugierig und stellt viele Fragen.", "الطفل فضولي ويطرح أسئلة كثيرة."),
      X("Sie arbeitet selbstständig und sorgfältig.", "تعمل باستقلالية وعناية."),
      X("Der Umzug war anstrengend, aber gut organisiert.", "كان الانتقال متعبًا لكنه منظم جيدًا."),
      X("Eine pünktliche Antwort wäre sehr hilfreich.", "سيكون الرد في الوقت المناسب مفيدًا جدًا."),
    ],
    mistakes: [
      M("Er ist ein zuverlässig Mitarbeiter.", "Er ist ein zuverlässiger Mitarbeiter.", "قبل الاسم تحتاج الصفة إلى نهاية مناسبة."),
      M("Die Aufgabe ist anstrengende.", "Die Aufgabe ist anstrengend.", "بعد sein تبقى الصفة الخبرية بلا نهاية."),
    ],
  },
  20: {
    explanations: [
      E("نفي عنصرين معًا", "weder … noch تعني لا … ولا، وتربط كلمتين أو مجموعتين أو جملتين متوازيتين. لا نضيف عادةً nicht لأن weder تحمل النفي."),
      E("التوازي", "ينبغي أن يكون العنصران من النوع النحوي نفسه قدر الإمكان: اسمان مع اسمين، صفتان مع صفتين، أو فعلان مع فعلين."),
    ],
    examples: [
      X("Ich trinke weder Kaffee noch Tee.", "لا أشرب القهوة ولا الشاي."),
      X("Der Film war weder spannend noch lustig.", "لم يكن الفيلم مشوقًا ولا مضحكًا."),
      X("Sie kann weder kommen noch anrufen.", "لا تستطيع الحضور ولا الاتصال."),
      X("Weder mein Bruder noch meine Schwester wohnt hier.", "لا أخي ولا أختي يسكن هنا."),
      X("Er hat weder die E-Mail gelesen noch darauf geantwortet.", "لم يقرأ الرسالة ولم يرد عليها."),
    ],
    mistakes: [
      M("Ich trinke nicht weder Kaffee noch Tee.", "Ich trinke weder Kaffee noch Tee.", "weder … noch تحمل معنى النفي ولا تحتاج nicht إضافية."),
      M("weder Kaffee oder Tee", "weder Kaffee noch Tee", "الشريك الثابت لـ weder هو noch."),
    ],
  },
  21: {
    explanations: [
      E("إضافة متساوية", "sowohl … als auch تعني كلا … و، وتجمع عنصرين مثبتين لهما الأهمية نفسها."),
      E("موضع العناصر", "ضع sowohl مباشرة قبل العنصر الأول و als auch قبل العنصر الثاني، وحافظ على بنية متوازية وواضحة."),
    ],
    examples: [
      X("Sie spricht sowohl Deutsch als auch Französisch.", "هي تتحدث الألمانية والفرنسية معًا."),
      X("Der Kurs ist sowohl interessant als auch praktisch.", "الدورة ممتعة وعملية في آن واحد."),
      X("Wir müssen sowohl die Kosten senken als auch die Qualität verbessern.", "يجب أن نخفض التكاليف ونحسن الجودة معًا."),
      X("Sowohl die Lehrerin als auch die Teilnehmer waren zufrieden.", "كانت المعلمة والمشاركون راضين."),
      X("Er hat sowohl angerufen als auch eine Nachricht geschickt.", "اتصل وأرسل رسالة أيضًا."),
    ],
    mistakes: [
      M("sowohl Deutsch und Englisch", "sowohl Deutsch als auch Englisch", "التركيب الثابت هو sowohl … als auch."),
      M("Sie sowohl liest als auch schreibt gern.", "Sie liest sowohl gern als auch regelmäßig.", "ضع الجزأين حول عنصرين متوازيين لتجنب بنية غير واضحة."),
    ],
  },
  22: {
    explanations: [
      E("إضافة مع تأكيد", "nicht nur … sondern auch تعني ليس فقط … بل أيضًا. العنصر الثاني يضيف معلومة أقوى أو غير متوقعة."),
      E("sondern بعد النفي", "يأتي sondern لتصحيح أو توسيع فكرة منفية. في هذا التركيب يجب الحفاظ على توازٍ واضح بين العنصرين."),
    ],
    examples: [
      X("Sie ist nicht nur freundlich, sondern auch sehr hilfsbereit.", "هي ليست ودودة فحسب، بل متعاونة جدًا أيضًا."),
      X("Der Kurs vermittelt nicht nur Grammatik, sondern auch Alltagssprache.", "لا تقدم الدورة القواعد فقط، بل لغة الحياة اليومية أيضًا."),
      X("Er arbeitet nicht nur schnell, sondern auch sorgfältig.", "لا يعمل بسرعة فقط، بل بعناية أيضًا."),
      X("Wir haben nicht nur diskutiert, sondern auch konkrete Lösungen gefunden.", "لم نناقش فقط، بل وجدنا حلولًا عملية أيضًا."),
      X("Nicht nur die Miete, sondern auch die Nebenkosten sind gestiegen.", "لم يرتفع الإيجار فقط، بل التكاليف الإضافية أيضًا."),
    ],
    mistakes: [
      M("nicht nur … aber auch", "nicht nur … sondern auch", "الشريك القياسي لـ nicht nur هو sondern auch."),
      M("Er nicht nur lernt, sondern arbeitet auch.", "Er lernt nicht nur, sondern arbeitet auch.", "في الجملة الرئيسية يبقى الفعل المصرف في الموقع الثاني."),
    ],
  },
  23: {
    explanations: [
      E("obwohl جملة تابعة", "obwohl تربط التناقض داخل جملة تابعة، لذلك يذهب الفعل المصرف إلى النهاية: Obwohl es regnet, gehen wir spazieren."),
      E("trotzdem ظرف رابط", "trotzdem يبدأ جملة رئيسية جديدة ويشغل الموقع الأول، لذلك يأتي الفعل بعده مباشرة: Es regnet. Trotzdem gehen wir spazieren."),
    ],
    examples: [
      X("Obwohl er müde war, arbeitete er weiter.", "واصل العمل رغم أنه كان متعبًا."),
      X("Er war müde. Trotzdem arbeitete er weiter.", "كان متعبًا، ومع ذلك واصل العمل."),
      X("Obwohl die Wohnung klein ist, gefällt sie uns.", "تعجبنا الشقة رغم صغرها."),
      X("Die Prüfung war schwierig. Trotzdem hat sie bestanden.", "كان الامتحان صعبًا، ومع ذلك نجحت."),
      X("Obwohl wir wenig Zeit hatten, konnten wir alles erledigen.", "رغم أن وقتنا كان قليلًا، استطعنا إنجاز كل شيء."),
      X("Es regnete stark; trotzdem fand das Konzert statt.", "هطل المطر بغزارة، ومع ذلك أُقيم الحفل."),
    ],
    mistakes: [
      M("Obwohl es regnet, wir gehen spazieren.", "Obwohl es regnet, gehen wir spazieren.", "بعد الجملة التابعة المتقدمة يأتي فعل الجملة الرئيسية مباشرة."),
      M("Trotzdem er müde ist, arbeitet er.", "Obwohl er müde ist, arbeitet er.", "trotzdem لا يقدم جملة تابعة؛ هنا نحتاج obwohl."),
    ],
  },
  24: {
    explanations: [
      E("weil يذكر السبب", "weil يجيب عن لماذا؟ ويشرح سبب الحدث. الجملة الناتجة سببية والفعل المصرف فيها في النهاية."),
      E("damit يذكر الهدف", "damit يجيب عن لأي غرض؟ ويشرح النتيجة المقصودة التي نريد تحقيقها. قد يكون فاعل جملة الهدف مختلفًا عن فاعل الجملة الرئيسية."),
    ],
    examples: [
      X("Ich bleibe zu Hause, weil ich krank bin.", "أبقى في المنزل لأنني مريض."),
      X("Ich nehme ein Taxi, weil der Bus nicht fährt.", "أستقل سيارة أجرة لأن الحافلة لا تعمل."),
      X("Ich schreibe die Adresse auf, damit ich sie nicht vergesse.", "أكتب العنوان كي لا أنساه."),
      X("Sie wiederholt die Erklärung, damit alle sie verstehen.", "تكرر الشرح كي يفهمه الجميع."),
      X("Wir schließen das Fenster, weil es draußen laut ist.", "نغلق النافذة لأن الخارج صاخب."),
      X("Wir schließen das Fenster, damit das Baby schlafen kann.", "نغلق النافذة كي يستطيع الطفل النوم."),
    ],
    mistakes: [
      M("Ich lerne, weil ich die Prüfung bestehe.", "Ich lerne, damit ich die Prüfung bestehe.", "النجاح هو الهدف من التعلم، وليس سببه."),
      M("Ich bleibe im Bett, damit ich krank bin.", "Ich bleibe im Bett, weil ich krank bin.", "المرض سبب البقاء في السرير، لذلك نستخدم weil."),
    ],
  },
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
for (const [lessonIdText, enhancement] of Object.entries(enhancements)) {
  const lessonId = Number(lessonIdText);
  const document = documents.find((entry) => Number(entry.lesson_id) === lessonId);
  if (!document) throw new Error(`B1/${lessonId}: documentation entry not found`);

  document.explanation = (document.explanation ?? []).filter((item) => item.origin !== origin);
  document.explanation = mergeUnique(document.explanation, enhancement.explanations ?? [], "heading");

  const examplesKey = Array.isArray(document.examples_from_video) ? "examples_from_video" : "examples";
  document[examplesKey] = (document[examplesKey] ?? []).filter((item) => item.origin !== origin);
  document[examplesKey] = mergeUnique(document[examplesKey], enhancement.examples ?? [], "de");

  document.common_mistakes = (document.common_mistakes ?? []).filter((item) => item.origin !== origin);
  document.common_mistakes = mergeUnique(document.common_mistakes, enhancement.mistakes ?? [], "wrong");
  document.editorial_enrichment = {
    standard: "B1",
    purpose: "clear_explanations_and_additional_practice_examples",
    video_claim: false,
  };
  document.reading_time_minutes = Math.max(Number(document.reading_time_minutes) || 0, 5);
}

await writeFile(documentationPath, `${JSON.stringify(documents, null, 2)}\n`, "utf8");
console.log(`Enriched ${Object.keys(enhancements).length} B1 documentation entries.`);
