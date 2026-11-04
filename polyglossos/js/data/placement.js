/* Τράπεζα ερωτήσεων κατάταξης (CEFR A1–C2), 3 ανά επίπεδο.
 * [ερώτηση, σωστό, λάθος1, λάθος2, λάθος3] — οι επιλογές ανακατεύονται στην εμφάνιση.
 * Το τεστ προσθέτει αυτόματα και μία ερώτηση ακουστικής κατανόησης ανά επίπεδο (TTS).
 */
window.G = window.G || {};
G.LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
G.PLACEMENT = {
  en: {
    A1: [['I ___ a student.', 'am', 'is', 'are', 'be'], ['This is ___ book.', 'my', 'me', 'I', 'mine'], ['There ___ two cats in the garden.', 'are', 'is', 'am', 'be']],
    A2: [['She ___ TV when I called.', 'was watching', 'watched', 'watches', 'is watching'], ['I\'ve lived here ___ three years.', 'for', 'since', 'from', 'during'], ['He is ___ than his brother.', 'taller', 'more tall', 'tallest', 'the tallest']],
    B1: [['If I ___ you, I\'d accept the job.', 'were', 'am', 'will be', 'have been'], ['I\'m not used to ___ up early.', 'getting', 'get', 'got', 'have got'], ['The film was ___ boring that we left.', 'so', 'such', 'too', 'very']],
    B2: [['By next year, she ___ her degree.', 'will have finished', 'will finish', 'finishes', 'has finished'], ['I wish I ___ that yesterday.', 'hadn\'t said', 'didn\'t say', 'haven\'t said', 'wouldn\'t say'], ['He denied ___ the money.', 'taking', 'to take', 'take', 'to have take']],
    C1: [['Hardly ___ arrived when it started to rain.', 'had we', 'we had', 'did we', 'we have'], ['The proposal was met with ___ criticism.', 'scathing', 'scalding', 'scraping', 'scattering'], ['It\'s high time we ___ a decision.', 'made', 'make', 'will make', 'have made']],
    C2: [['His argument, ___ persuasive, overlooks key data.', 'albeit', 'despite', 'whereas', 'unless'], ['The speech was full of ___, saying much but meaning little.', 'platitudes', 'plaudits', 'platforms', 'plateaus'], ['She was ___ by the sheer scale of the task.', 'daunted', 'haunted', 'flaunted', 'vaunted']]
  },
  fr: {
    A1: [['Je ___ grec.', 'suis', 'ai', 'es', 'est'], ['Nous ___ un chien.', 'avons', 'sommes', 'ont', 'avez'], ['Elle habite ___ Paris.', 'à', 'en', 'au', 'dans le']],
    A2: [['Hier, elle ___ au marché.', 'est allée', 'a allé', 'va', 'allait aller'], ['Il fait froid, ___ je mets un manteau.', 'donc', 'mais', 'parce que', 'ou'], ['C\'est la femme ___ habite ici.', 'qui', 'que', 'dont', 'où']],
    B1: [['Si j\'avais le temps, je ___ plus.', 'lirais', 'lirai', 'lis', 'lisais'], ['Le livre ___ je t\'ai parlé est génial.', 'dont', 'que', 'qui', 'où'], ['Quand j\'étais jeune, j\'___ souvent à la plage.', 'allais', 'suis allé', 'irai', 'vais']],
    B2: [['Bien qu\'il ___ malade, il est venu.', 'soit', 'est', 'était', 'sera'], ['J\'aurais aimé que tu ___ là.', 'sois', 'es', 'étais', 'seras'], ['C\'est le projet ___ je tiens le plus.', 'auquel', 'duquel', 'lequel', 'que']],
    C1: [['Il a beau ___, il n\'y arrive pas.', 'essayer', 'essayé', 'essaie', 'essayant'], ['Il a agi en ___ de cause.', 'connaissance', 'conscience', 'savoir', 'raison'], ['___ il pleuve, nous sortirons.', 'Quoiqu\'', 'Parce qu\'', 'Puisqu\'', 'Comme']],
    C2: [['Vous n\'êtes pas sans ___ que le délai expire demain.', 'savoir', 'ignorer', 'connaître', 'oublier'], ['Il eût ___ qu\'il se taise.', 'mieux valu', 'mieux vaut', 'mieux valait', 'meilleur valu'], ['Malgré ses efforts, il a fait chou ___. (απέτυχε)', 'blanc', 'rouge', 'vert', 'noir']]
  },
  es: {
    A1: [['Yo ___ de Grecia.', 'soy', 'estoy', 'es', 'eres'], ['¿Dónde ___ el baño?', 'está', 'es', 'hay', 'son'], ['Me ___ el chocolate.', 'gusta', 'gustan', 'gusto', 'gustas']],
    A2: [['Ayer ___ al cine con mis amigos.', 'fui', 'voy', 'iba', 'iré'], ['Hace dos años que ___ aquí.', 'vivo', 'viví', 'viviré', 'viviendo'], ['Este regalo es ___ ti.', 'para', 'por', 'de', 'a']],
    B1: [['Cuando era pequeño, ___ mucho al fútbol.', 'jugaba', 'jugué', 'juego', 'jugaré'], ['Espero que ___ bien.', 'estés', 'estás', 'estarás', 'estabas'], ['Ya ___ comido cuando llegaste.', 'había', 'he', 'habré', 'haya']],
    B2: [['Si ___ más tiempo, aprendería japonés.', 'tuviera', 'tengo', 'tendría', 'tenga'], ['No creo que ___ razón.', 'tenga', 'tiene', 'tendrá', 'tenía'], ['Me lo dijo ___ que no me preocupara.', 'para', 'por', 'porque', 'sin']],
    C1: [['Por mucho que ___, no lo convencerás.', 'insistas', 'insistes', 'insistirás', 'insistías'], ['De ___ sabido, no habría venido.', 'haberlo', 'habiéndolo', 'haber', 'haberse'], ['Ojalá me lo ___ dicho antes.', 'hubieras', 'habías', 'has', 'habrías']],
    C2: [['¡Ni que ___ millonario!', 'fuera', 'es', 'era', 'sea'], ['Se le fue el santo al ___. (ξέχασε τι ήθελε να πει)', 'cielo', 'mar', 'monte', 'río'], ['Quiso engañarnos, pero le salió el tiro por la ___.', 'culata', 'cola', 'cabeza', 'ventana']]
  },
  it: {
    A1: [['Io ___ greco.', 'sono', 'ho', 'è', 'sei'], ['Noi ___ fame.', 'abbiamo', 'siamo', 'avete', 'hanno'], ['___ studente è bravo.', 'Lo', 'Il', 'La', 'Gli']],
    A2: [['Ieri ___ al cinema.', 'sono andato', 'ho andato', 'vado', 'andrò'], ['Mi ___ molto i film italiani.', 'piacciono', 'piace', 'piaccio', 'piacete'], ['Il libro è ___ tavolo.', 'sul', 'su il', 'nel', 'dal']],
    B1: [['Quando ero piccolo, ___ in campagna.', 'vivevo', 'ho vissuto', 'vivo', 'vivrò'], ['Domani ___ a trovare i nonni.', 'andremo', 'andavamo', 'siamo andati', 'andassimo'], ['Marco? Non ___ vedo da anni.', 'lo', 'gli', 'ne', 'ci']],
    B2: [['Spero che tu ___ bene.', 'stia', 'stai', 'starai', 'staresti'], ['Se ___ in te, non lo farei.', 'fossi', 'ero', 'sarei', 'sono'], ['Benché ___ tardi, siamo usciti.', 'fosse', 'era', 'è', 'sarà']],
    C1: [['Se me l\'avessi detto, ___ venuto.', 'sarei', 'ero', 'sono', 'fossi'], ['Non appena ___ finito, ti chiamerò.', 'avrò', 'avrei', 'avevo', 'avessi'], ['Qualunque cosa ___, ti sosterrò.', 'tu decida', 'decidi', 'deciderai', 'decidevi']],
    C2: [['Magari ___ vero!', 'fosse', 'è', 'sia', 'sarà'], ['Prendere due piccioni con una ___.', 'fava', 'mano', 'pietra', 'rete'], ['Quel saggio non è farina del suo ___. (δεν είναι δικό του)', 'sacco', 'forno', 'mulino', 'campo']]
  },
  de: {
    A1: [['Ich ___ aus Griechenland.', 'komme', 'kommst', 'kommt', 'kommen'], ['Das ist ___ Tisch.', 'der', 'die', 'das', 'den'], ['Wie ___ du?', 'heißt', 'heiße', 'heißen', 'heiß']],
    A2: [['Gestern ___ ich ins Kino gegangen.', 'bin', 'habe', 'war', 'ist'], ['Ich gebe ___ Mann das Buch.', 'dem', 'den', 'der', 'des'], ['Er kann nicht kommen, weil er krank ___.', 'ist', 'sein', 'bist', 'sind']],
    B1: [['Wenn ich Zeit ___, würde ich kommen.', 'hätte', 'habe', 'hatte', 'haben'], ['Das ist der Mann, ___ ich gestern gesehen habe.', 'den', 'der', 'dem', 'dessen'], ['Ich freue mich ___ die Ferien. (ανυπομονώ για)', 'auf', 'über', 'an', 'für']],
    B2: [['Das Problem ___ sofort gelöst werden.', 'muss', 'müssen', 'musst', 'gemusst'], ['Trotz ___ Regens gingen wir spazieren.', 'des', 'dem', 'den', 'der'], ['Er tut so, als ob er alles ___.', 'wüsste', 'weiß', 'wusste', 'gewusst']],
    C1: [['___ der schlechten Wetterlage wurde der Flug gestrichen.', 'Aufgrund', 'Obwohl', 'Trotzdem', 'Damit'], ['Je mehr man übt, ___ besser wird man.', 'desto', 'als', 'so', 'wie'], ['Er behauptet, krank ___ sein.', 'zu', 'um', 'für', 'dass']],
    C2: [['Das ist nicht mein ___. (δεν είναι δική μου δουλειά)', 'Bier', 'Wein', 'Brot', 'Käse'], ['Er hat mir einen Bären ___. (μου είπε ψέματα)', 'aufgebunden', 'angebunden', 'abgebunden', 'verbunden'], ['Sie nahm kein Blatt vor den ___. (μίλησε ανοιχτά)', 'Mund', 'Kopf', 'Hals', 'Augen']]
  }
};

/* Τεστ για μητρικούς ομιλητές ελληνικών — 3 βαθμίδες. [βαθμίδα, ερώτηση, σωστό, λάθος...] */
G.GREEK_TEST = [
  [1, 'Ποιο είναι σωστό;', 'Ο δικαστής ήταν επιεικής.', 'Ο δικαστής ήταν επιεικείς.', 'Ο δικαστής ήταν επιεικός.', 'Ο δικαστής ήταν επιεική.'],
  [1, '«___ της βροχής, αναβλήθηκε ο αγώνας.»', 'Λόγω', 'Λόγο', 'Λόγω ότι', 'Με λόγω'],
  [1, 'Ποια διατύπωση είναι σωστή;', 'Είναι χειρότερος από πριν.', 'Είναι πιο χειρότερος από πριν.', 'Είναι πολύ πιο χειρότερος.', 'Είναι πιο χειρότερο από πριν.'],
  [1, 'Τι σημαίνει «εκ των υστέρων»;', 'μετά το γεγονός', 'από την αρχή', 'εκ μέρους των άλλων', 'χωρίς λόγο'],
  [1, 'Σωστή ορθογραφία:', 'συγχαρητήρια', 'συγχαριτήρια', 'συνχαρητήρια', 'συγχαρίτηρια'],
  [1, 'Ποια φράση ΔΕΝ περιέχει πλεονασμό;', 'Ανεβαίνω τη σκάλα.', 'Ανεβαίνω πάνω.', 'Επαναλαμβάνω ξανά.', 'Προβλέπω από πριν.'],
  [2, 'Ποια διατύπωση είναι σωστή;', 'Βάσει του νόμου', 'Βάση του νόμου', 'Βάσει τον νόμο', 'Με βάσει τον νόμο'],
  [2, 'Σωστή γραφή:', 'εν πάση περιπτώσει', 'εν πάσει περιπτώσει', 'εν πάση περιπτώση', 'εν πάσει περίπτωση'],
  [2, 'Τι σημαίνει «ακροθιγώς»;', 'επιφανειακά', 'με μεγάλη λεπτομέρεια', 'βιαστικά και άτσαλα', 'με ενθουσιασμό'],
  [2, '«___ χρημάτων, το έργο σταμάτησε.»', 'Ελλείψει', 'Εν ελλείψει', 'Ελλείψεως', 'Λόγω έλλειψη'],
  [2, 'Ποια φράση σημαίνει «με όσα μέσα διαθέτουμε»;', 'εκ των ενόντων', 'εκ των υστέρων', 'εκ προοιμίου', 'εξ αντικειμένου'],
  [2, '«Ο διαιτητής πρέπει να είναι ___.»', 'αμερόληπτος', 'αμέριστος', 'αμελής', 'αμετάκλητος'],
  [3, 'Η «αποσιώπηση» ως σχήμα λόγου είναι:', 'η σκόπιμη διακοπή του λόγου', 'η επανάληψη λέξης στην αρχή προτάσεων', 'η μεγαλοποίηση για έμφαση', 'η σύγκριση με «σαν»'],
  [3, 'Ποια μορφή είναι σωστή;', 'ενώπιος ενωπίω', 'ενώπιον ενωπίω', 'ενώπιον ενωπίον', 'ενώπιος ενώπιον'],
  [3, '«Κατάφωρη αδικία» σημαίνει:', 'ολοφάνερη αδικία', 'κρυφή αδικία', 'μικρή αδικία', 'πιθανή αδικία'],
  [3, '«Ειρήσθω εν παρόδω» σημαίνει:', 'ας ειπωθεί παρεμπιπτόντως', 'ας μείνει μεταξύ μας', 'ας κλείσουμε εδώ', 'όπως είπαμε πριν'],
  [3, 'Ποιο ζεύγος είναι συνώνυμο;', 'νηφάλιος – ψύχραιμος', 'νηφάλιος – μεθυσμένος', 'προσήνεια – αγένεια', 'διαυγής – θολός'],
  [3, 'Στο «Ήρθα, είδα, νίκησα» το κύριο σχήμα λόγου είναι:', 'ασύνδετο', 'πολυσύνδετο', 'αντίθεση', 'μεταφορά']
];
