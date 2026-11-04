/* Κοινός πίνακας εννοιών για όλες τις ξένες γλώσσες.
 * Κάθε λέξη:   'ελληνικά|english|français|español|italiano|deutsch|emoji'
 * Κάθε πρόταση: 'ελληνικά|english|français|español|italiano|deutsch'
 * Εναλλακτικές σωστές απαντήσεις χωρίζονται με " / ".
 * Τα ουσιαστικά σε FR/ES/IT/DE έχουν ΠΑΝΤΑ άρθρο — το γένος μαθαίνεται μαζί με τη λέξη.
 */
window.G = window.G || {};
G.LANG_COLS = { el: 0, en: 1, fr: 2, es: 3, it: 4, de: 5 };

G.UNITS = [
  /* ============================ A1 ============================ */
  { id: 'a1-basics', lvl: 'A1', t: 'Χαιρετισμοί & βασικά', e: '👋',
    w: [
      'γεια σου|hello / hi|salut|hola|ciao|hallo|👋',
      'καλημέρα|good morning|bonjour|buenos días|buongiorno|guten Morgen|🌅',
      'καλησπέρα|good evening|bonsoir|buenas tardes|buonasera|guten Abend|🌆',
      'καληνύχτα|good night|bonne nuit|buenas noches|buonanotte|gute Nacht|🌙',
      'αντίο|goodbye|au revoir|adiós|arrivederci|auf Wiedersehen|🙋',
      'ευχαριστώ|thank you|merci|gracias|grazie|danke|🙏',
      'παρακαλώ|please|s\'il vous plaît|por favor|per favore|bitte|🤲',
      'ναι|yes|oui|sí|sì|ja|✅',
      'όχι|no|non|no|no|nein|❌',
      'συγγνώμη|sorry|pardon|perdón|scusa|Entschuldigung|😔',
      'πώς σε λένε;|what\'s your name?|comment tu t\'appelles ?|¿cómo te llamas?|come ti chiami?|wie heißt du?|🏷️',
      'με λένε...|my name is...|je m\'appelle...|me llamo...|mi chiamo...|ich heiße...|🙂',
      'τι κάνεις;|how are you?|comment ça va ?|¿qué tal?|come stai?|wie geht\'s?|🤔',
      'καλά|fine / well|bien|bien|bene|gut|👍',
      'χάρηκα|nice to meet you|enchanté|encantado|piacere|freut mich|🤝',
      'φίλος|friend|l\'ami|el amigo|l\'amico|der Freund|🧑‍🤝‍🧑'
    ],
    s: [
      'Γεια σου, με λένε Άννα.|Hello, my name is Anna.|Salut, je m\'appelle Anna.|Hola, me llamo Anna.|Ciao, mi chiamo Anna.|Hallo, ich heiße Anna.',
      'Τι κάνεις; Καλά, ευχαριστώ.|How are you? Fine, thank you.|Comment ça va ? Bien, merci.|¿Qué tal? Bien, gracias.|Come stai? Bene, grazie.|Wie geht\'s? Gut, danke.',
      'Αυτός είναι ο φίλος μου.|This is my friend.|C\'est mon ami.|Este es mi amigo.|Questo è il mio amico.|Das ist mein Freund.'
    ] },

  { id: 'a1-numbers', lvl: 'A1', t: 'Αριθμοί', e: '🔢',
    w: [
      'ένα|one|un|uno|uno|eins|1️⃣',
      'δύο|two|deux|dos|due|zwei|2️⃣',
      'τρία|three|trois|tres|tre|drei|3️⃣',
      'τέσσερα|four|quatre|cuatro|quattro|vier|4️⃣',
      'πέντε|five|cinq|cinco|cinque|fünf|5️⃣',
      'έξι|six|six|seis|sei|sechs|6️⃣',
      'επτά|seven|sept|siete|sette|sieben|7️⃣',
      'οκτώ|eight|huit|ocho|otto|acht|8️⃣',
      'εννέα|nine|neuf|nueve|nove|neun|9️⃣',
      'δέκα|ten|dix|diez|dieci|zehn|🔟',
      'είκοσι|twenty|vingt|veinte|venti|zwanzig|🔢',
      'εκατό|one hundred|cent|cien|cento|hundert|💯',
      'χίλια|one thousand|mille|mil|mille|tausend|🏔️'
    ],
    s: [
      'Είναι δέκα ευρώ.|It is ten euros.|C\'est dix euros.|Son diez euros.|Sono dieci euro.|Das sind zehn Euro.',
      'Θέλω τρία μήλα.|I want three apples.|Je veux trois pommes.|Quiero tres manzanas.|Voglio tre mele.|Ich möchte drei Äpfel.',
      'Είμαι είκοσι χρονών.|I am twenty years old.|J\'ai vingt ans.|Tengo veinte años.|Ho vent\'anni.|Ich bin zwanzig Jahre alt.'
    ] },

  { id: 'a1-colors', lvl: 'A1', t: 'Χρώματα', e: '🎨',
    w: [
      'κόκκινο|red|rouge|rojo|rosso|rot|🔴',
      'μπλε|blue|bleu|azul|blu|blau|🔵',
      'πράσινο|green|vert|verde|verde|grün|🟢',
      'κίτρινο|yellow|jaune|amarillo|giallo|gelb|🟡',
      'μαύρο|black|noir|negro|nero|schwarz|⚫',
      'άσπρο|white|blanc|blanco|bianco|weiß|⚪',
      'πορτοκαλί|orange|orange|naranja|arancione|orange|🟠',
      'μωβ|purple|violet|morado|viola|lila|🟣',
      'καφέ|brown|marron|marrón|marrone|braun|🟤',
      'γκρι|grey|gris|gris|grigio|grau|🌫️'
    ],
    s: [
      'Το αυτοκίνητο είναι κόκκινο.|The car is red.|La voiture est rouge.|El coche es rojo.|La macchina è rossa.|Das Auto ist rot.',
      'Ο ουρανός είναι μπλε.|The sky is blue.|Le ciel est bleu.|El cielo es azul.|Il cielo è blu.|Der Himmel ist blau.',
      'Μου αρέσει το πράσινο.|I like green.|J\'aime le vert.|Me gusta el verde.|Mi piace il verde.|Ich mag Grün.'
    ] },

  { id: 'a1-family', lvl: 'A1', t: 'Οικογένεια', e: '👨‍👩‍👧',
    w: [
      'μητέρα|mother|la mère|la madre|la madre|die Mutter|👩',
      'πατέρας|father|le père|el padre|il padre|der Vater|👨',
      'αδερφός|brother|le frère|el hermano|il fratello|der Bruder|👦',
      'αδερφή|sister|la sœur|la hermana|la sorella|die Schwester|👧',
      'γιος|son|le fils|el hijo|il figlio|der Sohn|🧒',
      'κόρη|daughter|la fille|la hija|la figlia|die Tochter|👩‍👧',
      'παππούς|grandfather|le grand-père|el abuelo|il nonno|der Großvater|👴',
      'γιαγιά|grandmother|la grand-mère|la abuela|la nonna|die Großmutter|👵',
      'ο σύζυγος|husband|le mari|el marido|il marito|der Mann|🤵',
      'η σύζυγος|wife|la femme|la esposa|la moglie|die Frau|👰',
      'παιδί|child|l\'enfant|el niño|il bambino|das Kind|🧸',
      'οικογένεια|family|la famille|la familia|la famiglia|die Familie|👨‍👩‍👧',
      'μωρό|baby|le bébé|el bebé|il neonato|das Baby|👶'
    ],
    s: [
      'Η μητέρα μου είναι γιατρός.|My mother is a doctor.|Ma mère est médecin.|Mi madre es médica.|Mia madre è medico.|Meine Mutter ist Ärztin.',
      'Έχω έναν αδερφό και μία αδερφή.|I have a brother and a sister.|J\'ai un frère et une sœur.|Tengo un hermano y una hermana.|Ho un fratello e una sorella.|Ich habe einen Bruder und eine Schwester.',
      'Οι γονείς μου μένουν στην Αθήνα.|My parents live in Athens.|Mes parents habitent à Athènes.|Mis padres viven en Atenas.|I miei genitori abitano ad Atene.|Meine Eltern wohnen in Athen.'
    ] },

  { id: 'a1-food', lvl: 'A1', t: 'Φαγητό & ποτό', e: '🍽️',
    w: [
      'νερό|water|l\'eau|el agua|l\'acqua|das Wasser|💧',
      'ψωμί|bread|le pain|el pan|il pane|das Brot|🍞',
      'γάλα|milk|le lait|la leche|il latte|die Milch|🥛',
      'καφές|coffee|le café|el café|il caffè|der Kaffee|☕',
      'τσάι|tea|le thé|el té|il tè|der Tee|🍵',
      'κρασί|wine|le vin|el vino|il vino|der Wein|🍷',
      'μπίρα|beer|la bière|la cerveza|la birra|das Bier|🍺',
      'μήλο|apple|la pomme|la manzana|la mela|der Apfel|🍎',
      'τυρί|cheese|le fromage|el queso|il formaggio|der Käse|🧀',
      'αυγό|egg|l\'œuf|el huevo|l\'uovo|das Ei|🥚',
      'κρέας|meat|la viande|la carne|la carne|das Fleisch|🥩',
      'ψάρι|fish|le poisson|el pescado|il pesce|der Fisch|🐟',
      'φρούτα|fruit|les fruits|la fruta|la frutta|das Obst|🍇',
      'λαχανικά|vegetables|les légumes|las verduras|le verdure|das Gemüse|🥦',
      'πρωινό|breakfast|le petit-déjeuner|el desayuno|la colazione|das Frühstück|🥐',
      'μεσημεριανό|lunch|le déjeuner|el almuerzo|il pranzo|das Mittagessen|🍝',
      'βραδινό|dinner|le dîner|la cena|la cena|das Abendessen|🍲',
      'ζάχαρη|sugar|le sucre|el azúcar|lo zucchero|der Zucker|🍬',
      'αλάτι|salt|le sel|la sal|il sale|das Salz|🧂'
    ],
    s: [
      'Θα ήθελα έναν καφέ, παρακαλώ.|I would like a coffee, please.|Je voudrais un café, s\'il vous plaît.|Quisiera un café, por favor.|Vorrei un caffè, per favore.|Ich hätte gern einen Kaffee, bitte.',
      'Δεν τρώω κρέας.|I don\'t eat meat.|Je ne mange pas de viande.|No como carne.|Non mangio carne.|Ich esse kein Fleisch.',
      'Το ψωμί είναι φρέσκο.|The bread is fresh.|Le pain est frais.|El pan está fresco.|Il pane è fresco.|Das Brot ist frisch.',
      'Πίνω νερό κάθε μέρα.|I drink water every day.|Je bois de l\'eau tous les jours.|Bebo agua todos los días.|Bevo acqua ogni giorno.|Ich trinke jeden Tag Wasser.'
    ] },

  { id: 'a1-home', lvl: 'A1', t: 'Το σπίτι', e: '🏠',
    w: [
      'σπίτι|house|la maison|la casa|la casa|das Haus|🏠',
      'δωμάτιο|room|la pièce|la habitación|la stanza|das Zimmer|🚪',
      'κουζίνα|kitchen|la cuisine|la cocina|la cucina|die Küche|🍳',
      'μπάνιο|bathroom|la salle de bains|el baño|il bagno|das Badezimmer|🛁',
      'κρεβάτι|bed|le lit|la cama|il letto|das Bett|🛏️',
      'τραπέζι|table|la table|la mesa|il tavolo|der Tisch|🍽️',
      'καρέκλα|chair|la chaise|la silla|la sedia|der Stuhl|🪑',
      'πόρτα|door|la porte|la puerta|la porta|die Tür|🚪',
      'παράθυρο|window|la fenêtre|la ventana|la finestra|das Fenster|🪟',
      'κλειδί|key|la clé|la llave|la chiave|der Schlüssel|🔑',
      'καναπές|sofa|le canapé|el sofá|il divano|das Sofa|🛋️',
      'κήπος|garden|le jardin|el jardín|il giardino|der Garten|🌷'
    ],
    s: [
      'Το σπίτι μου έχει τρία δωμάτια.|My house has three rooms.|Ma maison a trois pièces.|Mi casa tiene tres habitaciones.|La mia casa ha tre stanze.|Mein Haus hat drei Zimmer.',
      'Τα κλειδιά είναι στο τραπέζι.|The keys are on the table.|Les clés sont sur la table.|Las llaves están en la mesa.|Le chiavi sono sul tavolo.|Die Schlüssel sind auf dem Tisch.',
      'Άνοιξε το παράθυρο, παρακαλώ.|Open the window, please.|Ouvre la fenêtre, s\'il te plaît.|Abre la ventana, por favor.|Apri la finestra, per favore.|Mach bitte das Fenster auf.'
    ] },

  { id: 'a1-body', lvl: 'A1', t: 'Το σώμα', e: '🧍',
    w: [
      'κεφάλι|head|la tête|la cabeza|la testa|der Kopf|🙆',
      'μάτι|eye|l\'œil|el ojo|l\'occhio|das Auge|👁️',
      'αυτί|ear|l\'oreille|la oreja|l\'orecchio|das Ohr|👂',
      'μύτη|nose|le nez|la nariz|il naso|die Nase|👃',
      'στόμα|mouth|la bouche|la boca|la bocca|der Mund|👄',
      'χέρι|hand|la main|la mano|la mano|die Hand|✋',
      'πόδι|foot|le pied|el pie|il piede|der Fuß|🦶',
      'καρδιά|heart|le cœur|el corazón|il cuore|das Herz|❤️',
      'μαλλιά|hair|les cheveux|el pelo|i capelli|die Haare|💇',
      'δόντι|tooth|la dent|el diente|il dente|der Zahn|🦷'
    ],
    s: [
      'Με πονάει το κεφάλι μου.|My head hurts.|J\'ai mal à la tête.|Me duele la cabeza.|Mi fa male la testa.|Mir tut der Kopf weh.',
      'Έχει μπλε μάτια.|She has blue eyes.|Elle a les yeux bleus.|Tiene los ojos azules.|Ha gli occhi azzurri.|Sie hat blaue Augen.',
      'Πλένω τα χέρια μου.|I wash my hands.|Je me lave les mains.|Me lavo las manos.|Mi lavo le mani.|Ich wasche mir die Hände.'
    ] },

  { id: 'a1-time', lvl: 'A1', t: 'Χρόνος & μέρες', e: '📅',
    w: [
      'Δευτέρα|Monday|lundi|lunes|lunedì|Montag|1️⃣',
      'Τρίτη|Tuesday|mardi|martes|martedì|Dienstag|2️⃣',
      'Τετάρτη|Wednesday|mercredi|miércoles|mercoledì|Mittwoch|3️⃣',
      'Πέμπτη|Thursday|jeudi|jueves|giovedì|Donnerstag|4️⃣',
      'Παρασκευή|Friday|vendredi|viernes|venerdì|Freitag|5️⃣',
      'Σάββατο|Saturday|samedi|sábado|sabato|Samstag|6️⃣',
      'Κυριακή|Sunday|dimanche|domingo|domenica|Sonntag|7️⃣',
      'σήμερα|today|aujourd\'hui|hoy|oggi|heute|📍',
      'αύριο|tomorrow|demain|mañana|domani|morgen|➡️',
      'χθες|yesterday|hier|ayer|ieri|gestern|⬅️',
      'ώρα|hour|l\'heure|la hora|l\'ora|die Stunde|⏰',
      'εβδομάδα|week|la semaine|la semana|la settimana|die Woche|🗓️',
      'μήνας|month|le mois|el mes|il mese|der Monat|📆',
      'χρόνος (έτος)|year|l\'année|el año|l\'anno|das Jahr|🎆',
      'τώρα|now|maintenant|ahora|adesso|jetzt|⏱️'
    ],
    s: [
      'Σήμερα είναι Δευτέρα.|Today is Monday.|Aujourd\'hui, c\'est lundi.|Hoy es lunes.|Oggi è lunedì.|Heute ist Montag.',
      'Θα σε δω αύριο.|I will see you tomorrow.|Je te verrai demain.|Te veré mañana.|Ti vedrò domani.|Ich sehe dich morgen.',
      'Δουλεύω από Δευτέρα μέχρι Παρασκευή.|I work from Monday to Friday.|Je travaille du lundi au vendredi.|Trabajo de lunes a viernes.|Lavoro dal lunedì al venerdì.|Ich arbeite von Montag bis Freitag.'
    ] },

  { id: 'a1-verbs', lvl: 'A1', t: 'Βασικά ρήματα', e: '🏃',
    w: [
      'είμαι|to be|être|ser / estar|essere|sein|🧍',
      'έχω|to have|avoir|tener|avere|haben|🤲',
      'κάνω|to do / to make|faire|hacer|fare|machen|🛠️',
      'πηγαίνω|to go|aller|ir|andare|gehen|🚶',
      'έρχομαι|to come|venir|venir|venire|kommen|🏃',
      'τρώω|to eat|manger|comer|mangiare|essen|🍴',
      'πίνω|to drink|boire|beber|bere|trinken|🥤',
      'μιλάω|to speak|parler|hablar|parlare|sprechen|🗣️',
      'θέλω|to want|vouloir|querer|volere|wollen|🙋',
      'μπορώ|can / to be able to|pouvoir|poder|potere|können|💪',
      'ξέρω|to know|savoir|saber|sapere|wissen|🧠',
      'βλέπω|to see|voir|ver|vedere|sehen|👀',
      'ακούω|to listen / to hear|écouter / entendre|escuchar / oír|ascoltare / sentire|hören|🎧',
      'διαβάζω|to read|lire|leer|leggere|lesen|📖',
      'γράφω|to write|écrire|escribir|scrivere|schreiben|✍️',
      'δουλεύω|to work|travailler|trabajar|lavorare|arbeiten|👷',
      'μένω|to live (reside)|habiter|vivir|abitare|wohnen|🏡',
      'αγαπώ|to love|aimer|amar|amare|lieben|💕',
      'κοιμάμαι|to sleep|dormir|dormir|dormire|schlafen|😴',
      'αγοράζω|to buy|acheter|comprar|comprare|kaufen|🛍️'
    ],
    s: [
      'Θέλω να μάθω μια νέα γλώσσα.|I want to learn a new language.|Je veux apprendre une nouvelle langue.|Quiero aprender un idioma nuevo.|Voglio imparare una nuova lingua.|Ich will eine neue Sprache lernen.',
      'Διαβάζω ένα βιβλίο κάθε βράδυ.|I read a book every evening.|Je lis un livre chaque soir.|Leo un libro cada noche.|Leggo un libro ogni sera.|Ich lese jeden Abend ein Buch.',
      'Πού μένεις;|Where do you live?|Où habites-tu ?|¿Dónde vives?|Dove abiti?|Wo wohnst du?',
      'Δεν ξέρω.|I don\'t know.|Je ne sais pas.|No sé.|Non lo so.|Ich weiß nicht.'
    ] },

  { id: 'a1-adj', lvl: 'A1', t: 'Επίθετα', e: '✨',
    w: [
      'μεγάλος|big|grand|grande|grande|groß|🐘',
      'μικρός|small|petit|pequeño|piccolo|klein|🤏',
      'καλός|good|bon|bueno|buono|gut|🌟',
      'κακός|bad|mauvais|malo|cattivo|schlecht|👎',
      'καινούριος|new|nouveau|nuevo|nuovo|neu|🆕',
      'παλιός|old (thing)|vieux|viejo|vecchio|alt|🏚️',
      'ζεστός|hot|chaud|caliente|caldo|heiß|🔥',
      'κρύος|cold|froid|frío|freddo|kalt|🥶',
      'ωραίος|beautiful|beau|bonito|bello|schön|😍',
      'εύκολος|easy|facile|fácil|facile|einfach|👌',
      'δύσκολος|difficult|difficile|difícil|difficile|schwierig|🧗',
      'ευτυχισμένος|happy|heureux|feliz|felice|glücklich|😊',
      'κουρασμένος|tired|fatigué|cansado|stanco|müde|🥱',
      'ακριβός|expensive|cher|caro|caro|teuer|💎',
      'φτηνός|cheap|bon marché|barato|economico|billig|🏷️'
    ],
    s: [
      'Αυτό το βιβλίο είναι πολύ ενδιαφέρον.|This book is very interesting.|Ce livre est très intéressant.|Este libro es muy interesante.|Questo libro è molto interessante.|Dieses Buch ist sehr interessant.',
      'Είμαι πολύ κουρασμένος σήμερα.|I am very tired today.|Je suis très fatigué aujourd\'hui.|Estoy muy cansado hoy.|Sono molto stanco oggi.|Ich bin heute sehr müde.',
      'Το ξενοδοχείο είναι ακριβό αλλά ωραίο.|The hotel is expensive but nice.|L\'hôtel est cher mais joli.|El hotel es caro pero bonito.|L\'albergo è caro ma bello.|Das Hotel ist teuer, aber schön.'
    ] },

  { id: 'a1-city', lvl: 'A1', t: 'Η πόλη', e: '🏙️',
    w: [
      'πόλη|city|la ville|la ciudad|la città|die Stadt|🏙️',
      'δρόμος|street|la rue|la calle|la strada|die Straße|🛣️',
      'σχολείο|school|l\'école|la escuela|la scuola|die Schule|🏫',
      'νοσοκομείο|hospital|l\'hôpital|el hospital|l\'ospedale|das Krankenhaus|🏥',
      'σούπερ μάρκετ|supermarket|le supermarché|el supermercado|il supermercato|der Supermarkt|🛒',
      'εστιατόριο|restaurant|le restaurant|el restaurante|il ristorante|das Restaurant|🍴',
      'τράπεζα|bank|la banque|el banco|la banca|die Bank|🏦',
      'φαρμακείο|pharmacy|la pharmacie|la farmacia|la farmacia|die Apotheke|⚕️',
      'σταθμός|station|la gare|la estación|la stazione|der Bahnhof|🚉',
      'παραλία|beach|la plage|la playa|la spiaggia|der Strand|🏖️',
      'εκκλησία|church|l\'église|la iglesia|la chiesa|die Kirche|⛪',
      'μουσείο|museum|le musée|el museo|il museo|das Museum|🏛️'
    ],
    s: [
      'Πού είναι ο σταθμός;|Where is the station?|Où est la gare ?|¿Dónde está la estación?|Dov\'è la stazione?|Wo ist der Bahnhof?',
      'Το φαρμακείο είναι δίπλα στην τράπεζα.|The pharmacy is next to the bank.|La pharmacie est à côté de la banque.|La farmacia está al lado del banco.|La farmacia è accanto alla banca.|Die Apotheke ist neben der Bank.',
      'Πάμε στην παραλία;|Shall we go to the beach?|On va à la plage ?|¿Vamos a la playa?|Andiamo in spiaggia?|Gehen wir an den Strand?'
    ] },

  { id: 'a1-travel', lvl: 'A1', t: 'Ταξίδι & μεταφορές', e: '✈️',
    w: [
      'αυτοκίνητο|car|la voiture|el coche|la macchina|das Auto|🚗',
      'λεωφορείο|bus|le bus|el autobús|l\'autobus|der Bus|🚌',
      'τρένο|train|le train|el tren|il treno|der Zug|🚆',
      'αεροπλάνο|airplane|l\'avion|el avión|l\'aereo|das Flugzeug|✈️',
      'αεροδρόμιο|airport|l\'aéroport|el aeropuerto|l\'aeroporto|der Flughafen|🛫',
      'εισιτήριο|ticket|le billet|el billete|il biglietto|die Fahrkarte / das Ticket|🎫',
      'ξενοδοχείο|hotel|l\'hôtel|el hotel|l\'albergo / l\'hotel|das Hotel|🏨',
      'διαβατήριο|passport|le passeport|el pasaporte|il passaporto|der Reisepass|🛂',
      'βαλίτσα|suitcase|la valise|la maleta|la valigia|der Koffer|🧳',
      'χάρτης|map|la carte|el mapa|la mappa / la cartina|die Karte|🗺️',
      'αριστερά|left|à gauche|a la izquierda|a sinistra|links|⬅️',
      'δεξιά|right|à droite|a la derecha|a destra|rechts|➡️',
      'ευθεία|straight ahead|tout droit|todo recto|sempre dritto|geradeaus|⬆️',
      'πού;|where?|où ?|¿dónde?|dove?|wo?|📍'
    ],
    s: [
      'Θέλω ένα εισιτήριο για τη Ρώμη.|I want a ticket to Rome.|Je veux un billet pour Rome.|Quiero un billete para Roma.|Voglio un biglietto per Roma.|Ich möchte eine Fahrkarte nach Rom.',
      'Το τρένο φεύγει στις οκτώ.|The train leaves at eight.|Le train part à huit heures.|El tren sale a las ocho.|Il treno parte alle otto.|Der Zug fährt um acht Uhr ab.',
      'Στρίψτε αριστερά και μετά ευθεία.|Turn left and then go straight.|Tournez à gauche, puis allez tout droit.|Gire a la izquierda y luego siga recto.|Giri a sinistra e poi vada dritto.|Biegen Sie links ab und gehen Sie dann geradeaus.'
    ] },

  { id: 'a1-weather', lvl: 'A1', t: 'Καιρός & ρούχα', e: '🌦️',
    w: [
      'ήλιος|sun|le soleil|el sol|il sole|die Sonne|☀️',
      'βροχή|rain|la pluie|la lluvia|la pioggia|der Regen|🌧️',
      'χιόνι|snow|la neige|la nieve|la neve|der Schnee|❄️',
      'άνεμος|wind|le vent|el viento|il vento|der Wind|💨',
      'σύννεφο|cloud|le nuage|la nube|la nuvola|die Wolke|☁️',
      'καιρός|weather|le temps|el tiempo|il tempo|das Wetter|🌦️',
      'ρούχα|clothes|les vêtements|la ropa|i vestiti|die Kleidung|👕',
      'παπούτσια|shoes|les chaussures|los zapatos|le scarpe|die Schuhe|👟',
      'φόρεμα|dress|la robe|el vestido|il vestito|das Kleid|👗',
      'παντελόνι|trousers|le pantalon|los pantalones|i pantaloni|die Hose|👖',
      'μπουφάν|jacket|la veste|la chaqueta|la giacca|die Jacke|🧥'
    ],
    s: [
      'Σήμερα βρέχει.|It is raining today.|Il pleut aujourd\'hui.|Hoy llueve.|Oggi piove.|Heute regnet es.',
      'Κάνει πολύ κρύο τον χειμώνα.|It is very cold in winter.|Il fait très froid en hiver.|Hace mucho frío en invierno.|Fa molto freddo d\'inverno.|Im Winter ist es sehr kalt.',
      'Φοράω το μπουφάν μου.|I am wearing my jacket.|Je porte ma veste.|Llevo mi chaqueta.|Indosso la mia giacca.|Ich trage meine Jacke.'
    ] },

  { id: 'a1-animals', lvl: 'A1', t: 'Ζώα', e: '🐾',
    w: [
      'σκύλος|dog|le chien|el perro|il cane|der Hund|🐕',
      'γάτα|cat|le chat|el gato|il gatto|die Katze|🐈',
      'πουλί|bird|l\'oiseau|el pájaro|l\'uccello|der Vogel|🐦',
      'άλογο|horse|le cheval|el caballo|il cavallo|das Pferd|🐎',
      'αγελάδα|cow|la vache|la vaca|la mucca|die Kuh|🐄',
      'ποντίκι|mouse|la souris|el ratón|il topo|die Maus|🐭'
    ],
    s: [
      'Ο σκύλος μου είναι πολύ γλυκός.|My dog is very sweet.|Mon chien est très gentil.|Mi perro es muy cariñoso.|Il mio cane è molto dolce.|Mein Hund ist sehr lieb.',
      'Η γάτα κοιμάται στον καναπέ.|The cat is sleeping on the sofa.|Le chat dort sur le canapé.|El gato duerme en el sofá.|Il gatto dorme sul divano.|Die Katze schläft auf dem Sofa.'
    ] },

  /* ============================ A2 ============================ */
  { id: 'a2-shopping', lvl: 'A2', t: 'Ψώνια & χρήματα', e: '🛍️',
    w: [
      'λεφτά|money|l\'argent|el dinero|i soldi|das Geld|💶',
      'τιμή|price|le prix|el precio|il prezzo|der Preis|🏷️',
      'κατάστημα|shop|le magasin|la tienda|il negozio|das Geschäft|🏪',
      'πληρώνω|to pay|payer|pagar|pagare|bezahlen|💳',
      'κοστίζει|it costs|ça coûte|cuesta|costa|es kostet|💰',
      'ταμείο|checkout|la caisse|la caja|la cassa|die Kasse|🧾',
      'απόδειξη αγοράς|receipt|le ticket de caisse / le reçu|el recibo / el tique|lo scontrino|der Kassenbon / die Quittung|🧾',
      'έκπτωση|discount|la réduction|el descuento|lo sconto|der Rabatt|📉',
      'μέγεθος|size|la taille|la talla|la taglia|die Größe|📏',
      'δοκιμάζω (ρούχο)|to try on|essayer|probarse|provare|anprobieren|👗',
      'ανοιχτό|open|ouvert|abierto|aperto|geöffnet|🔓',
      'κλειστό|closed|fermé|cerrado|chiuso|geschlossen|🔒'
    ],
    s: [
      'Πόσο κάνει αυτό το παντελόνι;|How much are these trousers?|Combien coûte ce pantalon ?|¿Cuánto cuestan estos pantalones?|Quanto costano questi pantaloni?|Wie viel kostet diese Hose?',
      'Μπορώ να πληρώσω με κάρτα;|Can I pay by card?|Je peux payer par carte ?|¿Puedo pagar con tarjeta?|Posso pagare con la carta?|Kann ich mit Karte bezahlen?',
      'Έχετε μεγαλύτερο μέγεθος;|Do you have a bigger size?|Vous avez une taille plus grande ?|¿Tiene una talla más grande?|Avete una taglia più grande?|Haben Sie eine größere Größe?',
      'Το κατάστημα κλείνει στις εννέα.|The shop closes at nine.|Le magasin ferme à neuf heures.|La tienda cierra a las nueve.|Il negozio chiude alle nove.|Das Geschäft schließt um neun Uhr.'
    ] },

  { id: 'a2-health', lvl: 'A2', t: 'Υγεία', e: '🩺',
    w: [
      'γιατρός|doctor|le médecin|el médico|il medico|der Arzt|👨‍⚕️',
      'πόνος|pain|la douleur|el dolor|il dolore|der Schmerz|🤕',
      'άρρωστος|sick|malade|enfermo|malato|krank|🤒',
      'φάρμακο|medicine|le médicament|el medicamento|la medicina|das Medikament|💊',
      'πυρετός|fever|la fièvre|la fiebre|la febbre|das Fieber|🌡️',
      'πονοκέφαλος|headache|le mal de tête|el dolor de cabeza|il mal di testa|die Kopfschmerzen|🤯',
      'ραντεβού|appointment|le rendez-vous|la cita|l\'appuntamento|der Termin|📋',
      'ασθενοφόρο|ambulance|l\'ambulance|la ambulancia|l\'ambulanza|der Krankenwagen|🚑',
      'βοήθεια!|help!|au secours !|¡socorro!|aiuto!|Hilfe!|🆘',
      'υγιής|healthy|en bonne santé|sano|sano|gesund|🥗'
    ],
    s: [
      'Πρέπει να πάω στον γιατρό.|I have to go to the doctor.|Je dois aller chez le médecin.|Tengo que ir al médico.|Devo andare dal medico.|Ich muss zum Arzt gehen.',
      'Έχω πυρετό από χθες.|I have had a fever since yesterday.|J\'ai de la fièvre depuis hier.|Tengo fiebre desde ayer.|Ho la febbre da ieri.|Ich habe seit gestern Fieber.',
      'Πάρτε αυτό το φάρμακο δύο φορές την ημέρα.|Take this medicine twice a day.|Prenez ce médicament deux fois par jour.|Tome este medicamento dos veces al día.|Prenda questa medicina due volte al giorno.|Nehmen Sie dieses Medikament zweimal am Tag.'
    ] },

  { id: 'a2-feelings', lvl: 'A2', t: 'Συναισθήματα', e: '🎭',
    w: [
      'χαρούμενος|cheerful / glad|joyeux|alegre|allegro|fröhlich|😄',
      'λυπημένος|sad|triste|triste|triste|traurig|😢',
      'θυμωμένος|angry|en colère|enfadado|arrabbiato|wütend|😠',
      'φοβισμένος|scared|effrayé|asustado|spaventato|verängstigt|😨',
      'αγχωμένος|stressed|stressé|estresado|stressato|gestresst|😰',
      'ήρεμος|calm|calme|tranquilo|calmo|ruhig|😌',
      'ερωτευμένος|in love|amoureux|enamorado|innamorato|verliebt|😍',
      'βαριέμαι|to be bored|s\'ennuyer|aburrirse|annoiarsi|sich langweilen|😑',
      'έκπληξη|surprise|la surprise|la sorpresa|la sorpresa|die Überraschung|😲',
      'φόβος|fear|la peur|el miedo|la paura|die Angst|😱'
    ],
    s: [
      'Είμαι πολύ χαρούμενος που σε βλέπω.|I am very happy to see you.|Je suis très content de te voir.|Estoy muy contento de verte.|Sono molto contento di vederti.|Ich freue mich sehr, dich zu sehen.',
      'Γιατί είσαι λυπημένη;|Why are you sad?|Pourquoi es-tu triste ?|¿Por qué estás triste?|Perché sei triste?|Warum bist du traurig?',
      'Βαριέμαι στο σπίτι.|I am bored at home.|Je m\'ennuie à la maison.|Me aburro en casa.|Mi annoio a casa.|Ich langweile mich zu Hause.'
    ] },

  { id: 'a2-free', lvl: 'A2', t: 'Ελεύθερος χρόνος', e: '🎬',
    w: [
      'ταινία|film|le film|la película|il film|der Film|🎬',
      'μουσική|music|la musique|la música|la musica|die Musik|🎵',
      'βιβλίο|book|le livre|el libro|il libro|das Buch|📚',
      'παιχνίδι|game|le jeu|el juego|il gioco|das Spiel|🎲',
      'αθλητισμός|sport|le sport|el deporte|lo sport|der Sport|⚽',
      'κολυμπάω|to swim|nager|nadar|nuotare|schwimmen|🏊',
      'τρέχω|to run|courir|correr|correre|laufen / rennen|🏃‍♀️',
      'χορεύω|to dance|danser|bailar|ballare|tanzen|💃',
      'τραγουδάω|to sing|chanter|cantar|cantare|singen|🎤',
      'ταξιδεύω|to travel|voyager|viajar|viaggiare|reisen|🌍',
      'ζωγραφίζω|to paint / to draw|peindre / dessiner|pintar / dibujar|dipingere / disegnare|malen / zeichnen|🎨',
      'διακοπές|holidays|les vacances|las vacaciones|le vacanze|der Urlaub|🌴'
    ],
    s: [
      'Το Σαββατοκύριακο πάω σινεμά.|At the weekend I go to the cinema.|Le week-end, je vais au cinéma.|El fin de semana voy al cine.|Il fine settimana vado al cinema.|Am Wochenende gehe ich ins Kino.',
      'Μου αρέσει να κολυμπάω στη θάλασσα.|I like swimming in the sea.|J\'aime nager dans la mer.|Me gusta nadar en el mar.|Mi piace nuotare nel mare.|Ich schwimme gern im Meer.',
      'Πού θα πας διακοπές φέτος;|Where will you go on holiday this year?|Où vas-tu partir en vacances cette année ?|¿Adónde vas de vacaciones este año?|Dove vai in vacanza quest\'anno?|Wohin fährst du dieses Jahr in den Urlaub?'
    ] },

  { id: 'a2-work', lvl: 'A2', t: 'Δουλειά & σπουδές', e: '💼',
    w: [
      'δουλειά|job / work|le travail|el trabajo|il lavoro|die Arbeit|💼',
      'γραφείο|office|le bureau|la oficina|l\'ufficio|das Büro|🏢',
      'συνάδελφος|colleague|le collègue|el compañero de trabajo|il collega|der Kollege|👥',
      'αφεντικό|boss|le patron|el jefe|il capo|der Chef|🧑‍💼',
      'μισθός|salary|le salaire|el sueldo|lo stipendio|das Gehalt|💵',
      'συνάντηση|meeting|la réunion|la reunión|la riunione|die Besprechung|📊',
      'πανεπιστήμιο|university|l\'université|la universidad|l\'università|die Universität|🎓',
      'μαθαίνω|to learn|apprendre|aprender|imparare|lernen|📝',
      'διδάσκω|to teach|enseigner|enseñar|insegnare|unterrichten|👩‍🏫',
      'εξετάσεις|exam|l\'examen|el examen|l\'esame|die Prüfung|📄',
      'υπολογιστής|computer|l\'ordinateur|el ordenador|il computer|der Computer|💻',
      'τηλέφωνο|phone|le téléphone|el teléfono|il telefono|das Telefon|📱'
    ],
    s: [
      'Έχω μια σημαντική συνάντηση σήμερα.|I have an important meeting today.|J\'ai une réunion importante aujourd\'hui.|Tengo una reunión importante hoy.|Ho una riunione importante oggi.|Ich habe heute eine wichtige Besprechung.',
      'Σπουδάζω ιατρική στο πανεπιστήμιο.|I study medicine at university.|J\'étudie la médecine à l\'université.|Estudio medicina en la universidad.|Studio medicina all\'università.|Ich studiere Medizin an der Universität.',
      'Ο υπολογιστής μου δεν λειτουργεί.|My computer doesn\'t work.|Mon ordinateur ne marche pas.|Mi ordenador no funciona.|Il mio computer non funziona.|Mein Computer funktioniert nicht.'
    ] },

  { id: 'a2-nature', lvl: 'A2', t: 'Φύση', e: '🌲',
    w: [
      'θάλασσα|sea|la mer|el mar|il mare|das Meer|🌊',
      'βουνό|mountain|la montagne|la montaña|la montagna|der Berg|⛰️',
      'δέντρο|tree|l\'arbre|el árbol|l\'albero|der Baum|🌳',
      'λουλούδι|flower|la fleur|la flor|il fiore|die Blume|💐',
      'ποτάμι|river|la rivière|el río|il fiume|der Fluss|🏞️',
      'δάσος|forest|la forêt|el bosque|il bosco|der Wald|🌲',
      'νησί|island|l\'île|la isla|l\'isola|die Insel|🏝️',
      'ουρανός|sky|le ciel|el cielo|il cielo|der Himmel|🌌',
      'αστέρι|star|l\'étoile|la estrella|la stella|der Stern|⭐',
      'φεγγάρι|moon|la lune|la luna|la luna|der Mond|🌕',
      'ζώο|animal|l\'animal|el animal|l\'animale|das Tier|🦁'
    ],
    s: [
      'Το καλοκαίρι πηγαίνουμε στο νησί.|In summer we go to the island.|En été, nous allons sur l\'île.|En verano vamos a la isla.|D\'estate andiamo sull\'isola.|Im Sommer fahren wir auf die Insel.',
      'Από εδώ βλέπεις τα βουνά και τη θάλασσα.|From here you can see the mountains and the sea.|D\'ici, on voit les montagnes et la mer.|Desde aquí se ven las montañas y el mar.|Da qui si vedono le montagne e il mare.|Von hier sieht man die Berge und das Meer.',
      'Απόψε το φεγγάρι είναι γεμάτο.|Tonight the moon is full.|Ce soir, la lune est pleine.|Esta noche la luna está llena.|Stasera la luna è piena.|Heute Abend ist der Mond voll.'
    ] },

  { id: 'a2-phrases', lvl: 'A2', t: 'Χρήσιμες ερωτήσεις', e: '❓',
    w: [
      'γιατί;|why?|pourquoi ?|¿por qué?|perché?|warum?|❓',
      'πότε;|when?|quand ?|¿cuándo?|quando?|wann?|🕰️',
      'πόσο κάνει;|how much is it?|combien ça coûte ?|¿cuánto cuesta?|quanto costa?|wie viel kostet das?|💲',
      'τι ώρα είναι;|what time is it?|quelle heure est-il ?|¿qué hora es?|che ore sono?|wie spät ist es?|⌚',
      'δεν καταλαβαίνω|I don\'t understand|je ne comprends pas|no entiendo|non capisco|ich verstehe nicht|🤷',
      'μιλάτε ελληνικά;|do you speak Greek?|vous parlez grec ?|¿habla griego?|parla greco?|sprechen Sie Griechisch?|🇬🇷',
      'μπορείτε να επαναλάβετε;|can you repeat that?|pouvez-vous répéter ?|¿puede repetir?|può ripetere?|können Sie das wiederholen?|🔁',
      'θα ήθελα...|I would like...|je voudrais...|quisiera... / me gustaría...|vorrei...|ich hätte gern...|☝️',
      'τον λογαριασμό, παρακαλώ|the bill, please|l\'addition, s\'il vous plaît|la cuenta, por favor|il conto, per favore|die Rechnung, bitte|🧾',
      'πού είναι η τουαλέτα;|where is the toilet?|où sont les toilettes ?|¿dónde está el baño?|dov\'è il bagno?|wo ist die Toilette?|🚻'
    ],
    s: [
      'Συγγνώμη, δεν καταλαβαίνω. Μπορείτε να μιλήσετε πιο αργά;|Sorry, I don\'t understand. Can you speak more slowly?|Pardon, je ne comprends pas. Pouvez-vous parler plus lentement ?|Perdón, no entiendo. ¿Puede hablar más despacio?|Scusi, non capisco. Può parlare più lentamente?|Entschuldigung, ich verstehe nicht. Können Sie langsamer sprechen?',
      'Τι ώρα ανοίγει το μουσείο;|What time does the museum open?|À quelle heure ouvre le musée ?|¿A qué hora abre el museo?|A che ora apre il museo?|Wann öffnet das Museum?',
      'Μπορώ να έχω τον λογαριασμό;|Can I have the bill?|Je peux avoir l\'addition ?|¿Me trae la cuenta?|Posso avere il conto?|Kann ich die Rechnung haben?'
    ] },

  /* ============================ B1 ============================ */
  { id: 'b1-career', lvl: 'B1', t: 'Εργασία & καριέρα', e: '📈',
    w: [
      'εμπειρία|experience|l\'expérience|la experiencia|l\'esperienza|die Erfahrung|🧭',
      'βιογραφικό|CV / résumé|le CV|el currículum|il curriculum|der Lebenslauf|📄',
      'συνέντευξη (εργασίας)|job interview|l\'entretien|la entrevista|il colloquio|das Vorstellungsgespräch|🤝',
      'εταιρεία|company|l\'entreprise|la empresa|l\'azienda|das Unternehmen|🏢',
      'πελάτης|customer|le client|el cliente|il cliente|der Kunde|🧑',
      'προθεσμία|deadline|la date limite|el plazo|la scadenza|die Frist|⏳',
      'προαγωγή|promotion|la promotion|el ascenso|la promozione|die Beförderung|🪜',
      'παραιτούμαι|to resign|démissionner|dimitir|dimettersi|kündigen|🚪',
      'προσλαμβάνω|to hire|embaucher|contratar|assumere|einstellen|✍️',
      'ικανότητα|skill|la compétence|la habilidad|la competenza|die Fähigkeit|🛠️',
      'στόχος|goal|l\'objectif|el objetivo|l\'obiettivo|das Ziel|🎯',
      'ευθύνη|responsibility|la responsabilité|la responsabilidad|la responsabilità|die Verantwortung|⚖️'
    ],
    s: [
      'Έχω πέντε χρόνια εμπειρία σε αυτόν τον τομέα.|I have five years of experience in this field.|J\'ai cinq ans d\'expérience dans ce domaine.|Tengo cinco años de experiencia en este campo.|Ho cinque anni di esperienza in questo settore.|Ich habe fünf Jahre Erfahrung in diesem Bereich.',
      'Η προθεσμία είναι την επόμενη Παρασκευή.|The deadline is next Friday.|La date limite est vendredi prochain.|El plazo termina el próximo viernes.|La scadenza è venerdì prossimo.|Die Frist endet nächsten Freitag.',
      'Αν με προσλάβουν, θα μετακομίσω.|If they hire me, I will move.|S\'ils m\'embauchent, je déménagerai.|Si me contratan, me mudaré.|Se mi assumono, mi trasferirò.|Wenn sie mich einstellen, ziehe ich um.'
    ] },

  { id: 'b1-opinions', lvl: 'B1', t: 'Απόψεις & επιχειρήματα', e: '💬',
    w: [
      'νομίζω|I think|je pense|creo|penso|ich glaube / ich denke|💭',
      'συμφωνώ|I agree|je suis d\'accord|estoy de acuerdo|sono d\'accordo|ich stimme zu|👍',
      'διαφωνώ|I disagree|je ne suis pas d\'accord|no estoy de acuerdo|non sono d\'accordo|ich bin anderer Meinung|👎',
      'κατά τη γνώμη μου|in my opinion|à mon avis|en mi opinión|secondo me|meiner Meinung nach|🗣️',
      'ωστόσο|however|cependant|sin embargo|tuttavia|jedoch|↔️',
      'επομένως|therefore|donc|por lo tanto|quindi|deshalb|➡️',
      'επειδή|because|parce que|porque|perché|weil|🔗',
      'παρόλο που|although|même si / bien que|aunque|anche se / sebbene|obwohl|🌗',
      'επιπλέον|moreover|de plus|además|inoltre|außerdem|➕',
      'για παράδειγμα|for example|par exemple|por ejemplo|per esempio|zum Beispiel|📌',
      'πρόβλημα|problem|le problème|el problema|il problema|das Problem|⚠️',
      'λύση|solution|la solution|la solución|la soluzione|die Lösung|💡',
      'απόφαση|decision|la décision|la decisión|la decisione|die Entscheidung|🔀'
    ],
    s: [
      'Κατά τη γνώμη μου, αυτή είναι η καλύτερη λύση.|In my opinion, this is the best solution.|À mon avis, c\'est la meilleure solution.|En mi opinión, esta es la mejor solución.|Secondo me, questa è la soluzione migliore.|Meiner Meinung nach ist das die beste Lösung.',
      'Συμφωνώ μαζί σου, αλλά υπάρχει ένα πρόβλημα.|I agree with you, but there is a problem.|Je suis d\'accord avec toi, mais il y a un problème.|Estoy de acuerdo contigo, pero hay un problema.|Sono d\'accordo con te, ma c\'è un problema.|Ich stimme dir zu, aber es gibt ein Problem.',
      'Παρόλο που ήταν κουρασμένος, συνέχισε να δουλεύει.|Although he was tired, he kept working.|Même s\'il était fatigué, il a continué à travailler.|Aunque estaba cansado, siguió trabajando.|Anche se era stanco, ha continuato a lavorare.|Obwohl er müde war, hat er weitergearbeitet.'
    ] },

  { id: 'b1-media', lvl: 'B1', t: 'Μέσα & τεχνολογία', e: '📰',
    w: [
      'ειδήσεις|news|les informations|las noticias|le notizie|die Nachrichten|📰',
      'εφημερίδα|newspaper|le journal|el periódico|il giornale|die Zeitung|🗞️',
      'άρθρο|article|l\'article|el artículo|l\'articolo|der Artikel|📝',
      'διαδίκτυο|internet|internet|internet|internet|das Internet|🌐',
      'εφαρμογή|app|l\'application|la aplicación|l\'applicazione / l\'app|die App|📲',
      'κωδικός πρόσβασης|password|le mot de passe|la contraseña|la password|das Passwort|🔐',
      'κατεβάζω|to download|télécharger|descargar|scaricare|herunterladen|⬇️',
      'οθόνη|screen|l\'écran|la pantalla|lo schermo|der Bildschirm|🖥️',
      'κοινωνικά δίκτυα|social media|les réseaux sociaux|las redes sociales|i social|die sozialen Medien|👍',
      'διαφήμιση|advertising|la publicité|la publicidad|la pubblicità|die Werbung|📣'
    ],
    s: [
      'Διαβάζω τις ειδήσεις στο κινητό μου.|I read the news on my phone.|Je lis les informations sur mon portable.|Leo las noticias en el móvil.|Leggo le notizie sul cellulare.|Ich lese die Nachrichten auf meinem Handy.',
      'Ξέχασα τον κωδικό πρόσβασής μου.|I forgot my password.|J\'ai oublié mon mot de passe.|He olvidado mi contraseña.|Ho dimenticato la mia password.|Ich habe mein Passwort vergessen.',
      'Περνάμε πολύ χρόνο στα κοινωνικά δίκτυα.|We spend a lot of time on social media.|Nous passons beaucoup de temps sur les réseaux sociaux.|Pasamos mucho tiempo en las redes sociales.|Passiamo molto tempo sui social.|Wir verbringen viel Zeit in den sozialen Medien.'
    ] },

  { id: 'b1-society', lvl: 'B1', t: 'Περιβάλλον & κοινωνία', e: '🌍',
    w: [
      'περιβάλλον|environment|l\'environnement|el medio ambiente|l\'ambiente|die Umwelt|🌱',
      'ρύπανση|pollution|la pollution|la contaminación|l\'inquinamento|die Verschmutzung|🏭',
      'κλιματική αλλαγή|climate change|le changement climatique|el cambio climático|il cambiamento climatico|der Klimawandel|🌡️',
      'ανακύκλωση|recycling|le recyclage|el reciclaje|il riciclaggio|das Recycling|♻️',
      'ενέργεια|energy|l\'énergie|la energía|l\'energia|die Energie|⚡',
      'πληθυσμός|population|la population|la población|la popolazione|die Bevölkerung|👪',
      'ανεργία|unemployment|le chômage|el desempleo / el paro|la disoccupazione|die Arbeitslosigkeit|📉',
      'φτώχεια|poverty|la pauvreté|la pobreza|la povertà|die Armut|🥀',
      'νόμος|law|la loi|la ley|la legge|das Gesetz|📜',
      'κυβέρνηση|government|le gouvernement|el gobierno|il governo|die Regierung|🏛️',
      'εκλογές|elections|les élections|las elecciones|le elezioni|die Wahlen|🗳️',
      'δικαίωμα|right (legal)|le droit|el derecho|il diritto|das Recht|✊'
    ],
    s: [
      'Πρέπει να μειώσουμε τη ρύπανση.|We must reduce pollution.|Nous devons réduire la pollution.|Debemos reducir la contaminación.|Dobbiamo ridurre l\'inquinamento.|Wir müssen die Verschmutzung reduzieren.',
      'Η κυβέρνηση ψήφισε έναν νέο νόμο.|The government passed a new law.|Le gouvernement a adopté une nouvelle loi.|El gobierno aprobó una nueva ley.|Il governo ha approvato una nuova legge.|Die Regierung hat ein neues Gesetz verabschiedet.',
      'Η ανεργία αυξήθηκε φέτος.|Unemployment rose this year.|Le chômage a augmenté cette année.|El desempleo ha aumentado este año.|La disoccupazione è aumentata quest\'anno.|Die Arbeitslosigkeit ist dieses Jahr gestiegen.'
    ] },

  { id: 'b1-verbs', lvl: 'B1', t: 'Ρήματα επιπέδου B1', e: '🔁',
    w: [
      'πετυχαίνω|to succeed|réussir|tener éxito|riuscire|Erfolg haben|🏆',
      'αποτυγχάνω|to fail|échouer|fracasar|fallire|scheitern|💥',
      'αποφασίζω|to decide|décider|decidir|decidere|entscheiden|🔀',
      'εξηγώ|to explain|expliquer|explicar|spiegare|erklären|🧑‍🏫',
      'βελτιώνω|to improve|améliorer|mejorar|migliorare|verbessern|📈',
      'αναπτύσσω|to develop|développer|desarrollar|sviluppare|entwickeln|🌱',
      'προτείνω|to suggest|proposer|proponer / sugerir|proporre / suggerire|vorschlagen|💡',
      'υποστηρίζω|to support|soutenir|apoyar|sostenere|unterstützen|🤝',
      'περιμένω|to wait|attendre|esperar|aspettare|warten|⏳',
      'θυμάμαι|to remember|se souvenir|recordar|ricordare|sich erinnern|🧠',
      'ξεχνάω|to forget|oublier|olvidar|dimenticare|vergessen|❔',
      'εμπιστεύομαι|to trust|faire confiance|confiar|fidarsi|vertrauen|🫱'
    ],
    s: [
      'Προσπαθώ να βελτιώσω την προφορά μου.|I am trying to improve my pronunciation.|J\'essaie d\'améliorer ma prononciation.|Intento mejorar mi pronunciación.|Cerco di migliorare la mia pronuncia.|Ich versuche, meine Aussprache zu verbessern.',
      'Δεν θυμάμαι πού άφησα τα κλειδιά μου.|I don\'t remember where I left my keys.|Je ne me souviens pas où j\'ai laissé mes clés.|No recuerdo dónde dejé mis llaves.|Non ricordo dove ho lasciato le chiavi.|Ich erinnere mich nicht, wo ich meine Schlüssel gelassen habe.',
      'Μπορείς να μου εξηγήσεις τι έγινε;|Can you explain to me what happened?|Tu peux m\'expliquer ce qui s\'est passé ?|¿Puedes explicarme qué pasó?|Puoi spiegarmi cosa è successo?|Kannst du mir erklären, was passiert ist?'
    ] },

  /* ============================ B2 ============================ */
  { id: 'b2-economy', lvl: 'B2', t: 'Οικονομία & επιχειρήσεις', e: '💹',
    w: [
      'ανάπτυξη|growth|la croissance|el crecimiento|la crescita|das Wachstum|📈',
      'πληθωρισμός|inflation|l\'inflation|la inflación|l\'inflazione|die Inflation|🎈',
      'επένδυση|investment|l\'investissement|la inversión|l\'investimento|die Investition|🏗️',
      'φόρος|tax|l\'impôt|el impuesto|la tassa|die Steuer|🧾',
      'προϋπολογισμός|budget|le budget|el presupuesto|il bilancio|das Budget|📒',
      'χρέος|debt|la dette|la deuda|il debito|die Schulden|⛓️',
      'ανταγωνισμός|competition|la concurrence|la competencia|la concorrenza|der Wettbewerb|🏁',
      'κέρδος|profit|le bénéfice|el beneficio|il profitto|der Gewinn|💰',
      'διαπραγμάτευση|negotiation|la négociation|la negociación|la trattativa|die Verhandlung|🤝',
      'συμφωνία|agreement|l\'accord|el acuerdo|l\'accordo|die Vereinbarung|📃',
      'προμηθευτής|supplier|le fournisseur|el proveedor|il fornitore|der Lieferant|🚚'
    ],
    s: [
      'Ο πληθωρισμός επηρεάζει την αγοραστική δύναμη των πολιτών.|Inflation affects citizens\' purchasing power.|L\'inflation affecte le pouvoir d\'achat des citoyens.|La inflación afecta al poder adquisitivo de los ciudadanos.|L\'inflazione influisce sul potere d\'acquisto dei cittadini.|Die Inflation beeinflusst die Kaufkraft der Bürger.',
      'Η εταιρεία αποφάσισε να επενδύσει σε νέες τεχνολογίες.|The company decided to invest in new technologies.|L\'entreprise a décidé d\'investir dans les nouvelles technologies.|La empresa decidió invertir en nuevas tecnologías.|L\'azienda ha deciso di investire in nuove tecnologie.|Das Unternehmen hat beschlossen, in neue Technologien zu investieren.',
      'Οι διαπραγματεύσεις κράτησαν περισσότερο απ\' ό,τι περιμέναμε.|The negotiations lasted longer than we expected.|Les négociations ont duré plus longtemps que prévu.|Las negociaciones duraron más de lo que esperábamos.|Le trattative sono durate più del previsto.|Die Verhandlungen haben länger gedauert, als wir erwartet hatten.'
    ] },

  { id: 'b2-science', lvl: 'B2', t: 'Επιστήμη & σκέψη', e: '🔬',
    w: [
      'έρευνα|research|la recherche|la investigación|la ricerca|die Forschung|🔬',
      'τεκμήριο|evidence / proof|la preuve|la prueba|la prova|der Beweis|🧩',
      'υπόθεση|hypothesis|l\'hypothèse|la hipótesis|l\'ipotesi|die Hypothese|❔',
      'αποτέλεσμα|result|le résultat|el resultado|il risultato|das Ergebnis|📊',
      'ανακάλυψη|discovery|la découverte|el descubrimiento|la scoperta|die Entdeckung|🔭',
      'εξέλιξη|development / evolution|l\'évolution|la evolución|l\'evoluzione|die Entwicklung|🧬',
      'γνώση|knowledge|la connaissance|el conocimiento|la conoscenza|das Wissen|📚',
      'έννοια|concept|le concept|el concepto|il concetto|der Begriff|💠',
      'επιχείρημα|argument|l\'argument|el argumento|l\'argomento|das Argument|🗯️',
      'συμπέρασμα|conclusion|la conclusion|la conclusión|la conclusione|die Schlussfolgerung|🏁',
      'αμφιβολία|doubt|le doute|la duda|il dubbio|der Zweifel|🤨',
      'προκατάληψη|prejudice|le préjugé|el prejuicio|il pregiudizio|das Vorurteil|🙈'
    ],
    s: [
      'Τα αποτελέσματα της έρευνας δεν επιβεβαιώνουν την υπόθεση.|The results of the research do not confirm the hypothesis.|Les résultats de la recherche ne confirment pas l\'hypothèse.|Los resultados de la investigación no confirman la hipótesis.|I risultati della ricerca non confermano l\'ipotesi.|Die Ergebnisse der Forschung bestätigen die Hypothese nicht.',
      'Δεν υπάρχει καμία αμφιβολία γι\' αυτό.|There is no doubt about it.|Il n\'y a aucun doute là-dessus.|No hay ninguna duda al respecto.|Non c\'è alcun dubbio su questo.|Daran gibt es keinen Zweifel.',
      'Πρέπει να βγάλουμε συμπεράσματα με προσοχή.|We must draw conclusions carefully.|Nous devons tirer des conclusions avec prudence.|Debemos sacar conclusiones con cuidado.|Dobbiamo trarre conclusioni con cautela.|Wir müssen vorsichtig Schlussfolgerungen ziehen.'
    ] },

  { id: 'b2-connectors', lvl: 'B2', t: 'Συνδετικές λέξεις', e: '🔗',
    w: [
      'εντούτοις|nevertheless|néanmoins|no obstante|nondimeno|dennoch|↩️',
      'εφόσον|provided that|pourvu que|siempre que|purché|sofern|☑️',
      'εκτός αν|unless|à moins que|a menos que|a meno che|es sei denn|🚧',
      'όσον αφορά|as regards|quant à|en cuanto a|per quanto riguarda|hinsichtlich|🔎',
      'κατά συνέπεια|consequently|par conséquent|en consecuencia|di conseguenza|folglich|⏭️',
      'αντιθέτως|on the contrary|au contraire|al contrario|al contrario|im Gegenteil|🔄',
      'με άλλα λόγια|in other words|en d\'autres termes|en otras palabras|in altre parole|mit anderen Worten|💬',
      'ειδικότερα|in particular|en particulier|en particular|in particolare|insbesondere|🎯',
      'εν τω μεταξύ|meanwhile|pendant ce temps|mientras tanto|nel frattempo|inzwischen|⏸️',
      'τελικά|in the end|finalement|al final|alla fine|schließlich|🏁',
      'γενικά|in general|en général|en general|in generale|im Allgemeinen|🌐'
    ],
    s: [
      'Θα έρθω, εφόσον τελειώσω νωρίς.|I will come, provided I finish early.|Je viendrai, pourvu que je finisse tôt.|Vendré, siempre que termine pronto.|Verrò, purché finisca presto.|Ich komme, sofern ich früh fertig werde.',
      'Δεν είναι εύκολο· αντιθέτως, είναι πολύ δύσκολο.|It isn\'t easy; on the contrary, it\'s very difficult.|Ce n\'est pas facile ; au contraire, c\'est très difficile.|No es fácil; al contrario, es muy difícil.|Non è facile; al contrario, è molto difficile.|Es ist nicht leicht; im Gegenteil, es ist sehr schwierig.',
      'Τελικά, όλα πήγαν καλά.|In the end, everything went well.|Finalement, tout s\'est bien passé.|Al final, todo salió bien.|Alla fine, è andato tutto bene.|Schließlich ist alles gut gegangen.'
    ] },

  { id: 'b2-character', lvl: 'B2', t: 'Χαρακτήρας & σχέσεις', e: '🫂',
    w: [
      'υπομονετικός|patient|patient|paciente|paziente|geduldig|🧘',
      'φιλόδοξος|ambitious|ambitieux|ambicioso|ambizioso|ehrgeizig|🚀',
      'αξιόπιστος|reliable|fiable|fiable|affidabile|zuverlässig|🧱',
      'ειλικρινής|honest|honnête|honesto|onesto|ehrlich|🤞',
      'αλαζονικός|arrogant|arrogant|arrogante|arrogante|arrogant|😤',
      'ντροπαλός|shy|timide|tímido|timido|schüchtern|🙈',
      'γενναιόδωρος|generous|généreux|generoso|generoso|großzügig|🎁',
      'πεισματάρης|stubborn|têtu|terco|testardo|stur|🐐',
      'εμπιστοσύνη|trust|la confiance|la confianza|la fiducia|das Vertrauen|🫱',
      'σεβασμός|respect|le respect|el respeto|il rispetto|der Respekt|🙇',
      'ζήλια|jealousy|la jalousie|los celos|la gelosia|die Eifersucht|💚'
    ],
    s: [
      'Είναι ένας πολύ αξιόπιστος συνεργάτης.|He is a very reliable colleague.|C\'est un collaborateur très fiable.|Es un colaborador muy fiable.|È un collaboratore molto affidabile.|Er ist ein sehr zuverlässiger Mitarbeiter.',
      'Η εμπιστοσύνη χτίζεται με τον χρόνο.|Trust is built over time.|La confiance se construit avec le temps.|La confianza se construye con el tiempo.|La fiducia si costruisce con il tempo.|Vertrauen baut sich mit der Zeit auf.',
      'Μην είσαι τόσο πεισματάρης!|Don\'t be so stubborn!|Ne sois pas si têtu !|¡No seas tan terco!|Non essere così testardo!|Sei nicht so stur!'
    ] },

  /* ============================ C1 ============================ */
  { id: 'c1-abstract', lvl: 'C1', t: 'Αφηρημένες έννοιες', e: '🧠',
    w: [
      'αναπόφευκτος|inevitable|inévitable|inevitable|inevitabile|unvermeidlich|🌀',
      'αμφιλεγόμενος|controversial|controversé|polémico|controverso|umstritten|⚔️',
      'διφορούμενος|ambiguous|ambigu|ambiguo|ambiguo|zweideutig|🌓',
      'επιφανειακός|superficial|superficiel|superficial|superficiale|oberflächlich|🫧',
      'αξιοσημείωτος|remarkable|remarquable|notable|notevole|bemerkenswert|⭐',
      'καθοριστικός|decisive|déterminant|decisivo|decisivo|entscheidend|🔑',
      'συνοπτικός|concise|concis|conciso|conciso|prägnant|✂️',
      'ευαίσθητος|sensitive|sensible|sensible|sensibile|empfindlich|🌸',
      'ουσιαστικός|substantial / essential|substantiel|sustancial|sostanziale|wesentlich|💎',
      'προσωρινός|temporary|temporaire|temporal|temporaneo|vorübergehend|⏳',
      'προκαταρκτικός|preliminary|préliminaire|preliminar|preliminare|vorläufig|🧪'
    ],
    s: [
      'Η απόφαση ήταν καθοριστική για το μέλλον της εταιρείας.|The decision was crucial for the company\'s future.|La décision a été déterminante pour l\'avenir de l\'entreprise.|La decisión fue decisiva para el futuro de la empresa.|La decisione è stata decisiva per il futuro dell\'azienda.|Die Entscheidung war entscheidend für die Zukunft des Unternehmens.',
      'Πρόκειται για ένα αμφιλεγόμενο ζήτημα.|It is a controversial issue.|Il s\'agit d\'une question controversée.|Se trata de un tema polémico.|Si tratta di una questione controversa.|Es handelt sich um ein umstrittenes Thema.',
      'Η αλλαγή ήταν αναπόφευκτη.|The change was inevitable.|Le changement était inévitable.|El cambio era inevitable.|Il cambiamento era inevitabile.|Die Veränderung war unvermeidlich.'
    ] },

  { id: 'c1-verbs', lvl: 'C1', t: 'Ρήματα επιπέδου C1', e: '⚙️',
    w: [
      'υπονομεύω|to undermine|saper|socavar|minare|untergraben|🕳️',
      'επισημαίνω|to point out|souligner|señalar|sottolineare|hervorheben|☝️',
      'αμφισβητώ|to question / to challenge|remettre en question|cuestionar|mettere in discussione|infrage stellen|❓',
      'εκτιμώ|to appreciate|apprécier|apreciar|apprezzare|schätzen|🙏',
      'διευκολύνω|to facilitate|faciliter|facilitar|facilitare|erleichtern|🛝',
      'αποτρέπω|to prevent|empêcher|impedir|impedire|verhindern|🛑',
      'ενσωματώνω|to incorporate|intégrer|incorporar|integrare|integrieren|🧩',
      'επιβάλλω|to impose|imposer|imponer|imporre|auferlegen|⚖️',
      'διατυπώνω|to formulate|formuler|formular|formulare|formulieren|✒️',
      'συμβάλλω|to contribute|contribuer|contribuir|contribuire|beitragen|🤲',
      'υποτιμώ|to underestimate|sous-estimer|subestimar|sottovalutare|unterschätzen|📉',
      'αντιμετωπίζω|to deal with / to face|faire face à|afrontar|affrontare|bewältigen|🥊'
    ],
    s: [
      'Θα ήθελα να επισημάνω ένα σημαντικό σημείο.|I would like to point out an important point.|Je voudrais souligner un point important.|Quisiera señalar un punto importante.|Vorrei sottolineare un punto importante.|Ich möchte einen wichtigen Punkt hervorheben.',
      'Μην υποτιμάς τις δυσκολίες.|Don\'t underestimate the difficulties.|Ne sous-estime pas les difficultés.|No subestimes las dificultades.|Non sottovalutare le difficoltà.|Unterschätze die Schwierigkeiten nicht.',
      'Όλοι συνέβαλαν στην επιτυχία του έργου.|Everyone contributed to the success of the project.|Tout le monde a contribué au succès du projet.|Todos contribuyeron al éxito del proyecto.|Tutti hanno contribuito al successo del progetto.|Alle haben zum Erfolg des Projekts beigetragen.'
    ] }
];
