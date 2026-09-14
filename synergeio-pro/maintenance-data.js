/* GearLog – Vehicle Maintenance Database
   Πρόγραμμα Συντήρησης Οχημάτων
   Συμπεριλαμβάνει τα πιο δημοφιλή μοντέλα στην Ελλάδα
*/
window.MAINT_DB = (function () {

  /* ─── Shared service templates ─── */
  function brakeFluid()   { return { n:'Υγρό φρένων (DOT4)',          months:24,           cat:'fluid' }; }
  function coolant48()    { return { n:'Ψυκτικό υγρό',               km:80000,months:48,  cat:'fluid' }; }
  function coolant60()    { return { n:'Ψυκτικό υγρό',               km:60000,months:36,  cat:'fluid' }; }
  function cabinFilter()  { return { n:'Φίλτρο καμπίνας (AC)',        km:15000,months:12,  cat:'filter' }; }
  function airFilter40()  { return { n:'Φίλτρο αέρα',                km:40000,months:48,  cat:'filter' }; }
  function airFilter30()  { return { n:'Φίλτρο αέρα',                km:30000,months:36,  cat:'filter' }; }
  function brakePads()    { return { n:'Τακάκια φρένων (έλεγχος)',    km:20000,            cat:'brakes' }; }
  function gearboxOil()   { return { n:'Λάδι κιβωτίου (χειρ.)',      km:60000,            cat:'fluid' }; }
  function gearboxAuto()  { return { n:'Λάδι αυτ. κιβωτίου (ATF)',   km:60000,            cat:'fluid' }; }
  function diffOil()      { return { n:'Λάδι διαφορικού',            km:40000,            cat:'fluid' }; }
  function sparkStd()     { return { n:'Μπουζί (κανονικά)',          km:30000,            cat:'ignition' }; }
  function sparkIridium() { return { n:'Μπουζί (ιριδίου/πλατίνας)', km:80000,            cat:'ignition' }; }
  function fuelFilterD()  { return { n:'Φίλτρο καυσίμου (πετρέλαιο)',km:30000,months:24, cat:'filter',warn:true }; }
  function chainCheck()   { return { n:'Αλυσίδα χρονισμού (έλεγχος)',km:100000,          cat:'timing', note:'Αντικατάσταση εάν εμφανιστεί θόρυβος ή τεντωθεί' }; }
  function belt(km,note){ return { n:'Ιμάντας χρονισμού + αντλία νερού', km, cat:'timing', warn:true, note: note||'Κρίσιμο – αντικατάσταση εντός χρόνου' }; }
  function oil10()  { return { n:'Αλλαγή λαδιού & φίλτρου λαδιού', km:10000,months:12, cat:'oil' }; }
  function oil15()  { return { n:'Αλλαγή λαδιού & φίλτρου λαδιού', km:15000,months:12, cat:'oil' }; }
  function oil20()  { return { n:'Αλλαγή λαδιού & φίλτρου λαδιού', km:20000,months:24, cat:'oil' }; }

  /* ─── Database entries ─── */
  const DB = [

    /* ════════════════════════  TOYOTA  ════════════════════════ */
    { make:'toyota', models:['yaris','γιαρης'], years:'2005–2023', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού', services:[
        oil10(), airFilter40(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'toyota', models:['yaris cross','gr yaris'], years:'2020+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού', services:[
        oil15(), airFilter40(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'toyota', models:['corolla','κορολα','auris'], years:'2002–2018', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1ZZ/2ZR)', services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'toyota', models:['corolla','κορολα'], years:'2019+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού', services:[
        oil15(), airFilter40(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'toyota', models:['corolla','auris','avensis'], years:'2002–2018', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0/2.2 D-4D', services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(100000,'2.0/2.2 D-4D – αντικατάσταση στα 100.000 km'), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'toyota', models:['rav4','rav 4'], years:'2006–2018', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού', services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), gearboxAuto(), diffOil(), brakePads() ] },

    { make:'toyota', models:['rav4','rav 4'], years:'2006–2018', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0 D-4D', services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(100000,'2.0 D-4D – κρίσιμη αντικατάσταση στα 100.000 km'), brakeFluid(), coolant48(), gearboxOil(), diffOil(), brakePads() ] },

    { make:'toyota', models:['chr','c-hr'], years:'2016+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού', services:[
        oil15(), airFilter40(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxAuto(), brakePads() ] },

    { make:'toyota', models:['hilux','χιλαξ'], years:'2005+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.5/3.0 D-4D',
      note:'Ανά 5.000 km εάν χρησιμοποιείται σε δύσκολες συνθήκες (off-road, φορτίο)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(100000,'2.5/3.0 D-4D – αντικατάσταση στα 100.000 km'),
        brakeFluid(), coolant48(), gearboxOil(), diffOil(),
        { n:'Λάδι transfer case', km:40000, cat:'fluid' },
        brakePads() ] },

    { make:'toyota', models:['land cruiser','land-cruiser','prado'], years:'2003+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 3.0 D-4D (KDJ)',
      note:'Λόγω φορτίου/εκτός δρόμου: αλλαγή λαδιού ανά 5.000 km',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(100000,'3.0 D-4D – κρίσιμη αντικατάσταση'),
        brakeFluid(), coolant48(), gearboxOil(), diffOil(),
        { n:'Λάδι transfer case', km:40000, cat:'fluid' }, brakePads() ] },

    { make:'toyota', models:['avensis'], years:'2003–2018', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού 1.8/2.0', services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  VOLKSWAGEN  ════════════════════════ */
    { make:'volkswagen', models:['golf','γκολφ'], years:'1998–2003', fuel:'petrol',
      timing:'Ιμάντας χρονισμού (1.4/1.6 90.000 km – 1.8T 60.000 km!)',
      note:'Golf 4: ο 1.8T απαιτεί αλλαγή ιμάντα στα 60.000 km – κρίσιμο!',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkStd(),
        belt(90000,'1.4/1.6: 90k | 1.8T: 60k – ΚΡΙΣΙΜΟ'),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'volkswagen', models:['golf','γκολφ'], years:'2004–2012', fuel:'petrol',
      timing:'Αλυσίδα (2.0 TSI) / Ιμάντας (1.4 80.000 km)',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkStd(),
        { n:'Ιμάντας χρονισμού + αντλία (1.4/1.6 MPI)', km:80000, cat:'timing', warn:true },
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'volkswagen', models:['golf','γκολφ'], years:'2013+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (TSI)',
      services:[
        { n:'Αλλαγή λαδιού & φίλτρου (LongLife)', km:30000, months:24, cat:'oil', note:'Ή ανά 15.000 km/12 μήνες με κανονικό λάδι' },
        airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'volkswagen', models:['golf','γκολφ','passat'], years:'1999–2012', fuel:'diesel',
      timing:'Ιμάντας χρονισμού (1.9 TDI: 90.000 km / 2.0 TDI: 75.000–90.000 km)',
      note:'PD engines: αλλαγή λαδιού ανά 10.000 km – χαμηλότερη ιξώδης συνιστάται',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(90000,'1.9 TDI: 90k | 2.0 TDI PD: 90k (ή 75k για ασφάλεια)'),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'volkswagen', models:['golf','passat','tiguan','t-roc'], years:'2013+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0 TDI (90.000 km)',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(90000,'2.0 TDI – αντικατάσταση εντός ορίου km/χρόνων'),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'volkswagen', models:['polo'], years:'2002–2017', fuel:'petrol',
      timing:'Ιμάντας (1.2/1.4 MPI 80.000 km) / Αλυσίδα (1.0 TSI)',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'1.2/1.4 MPI – αντικατάσταση'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'volkswagen', models:['polo'], years:'2018+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.0 TSI)',
      services:[
        { n:'Αλλαγή λαδιού & φίλτρου (LongLife)', km:30000, months:24, cat:'oil' },
        airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'volkswagen', models:['passat'], years:'1997–2005', fuel:'petrol',
      timing:'Ιμάντας χρονισμού (1.8T 60.000 km / 2.0 90.000 km)',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkStd(),
        belt(90000,'1.8T: 60k – ΚΡΙΣΙΜΟ'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  AUDI  ════════════════════════ */
    { make:'audi', models:['a3'], years:'2003–2012', fuel:'petrol',
      timing:'Ιμάντας (1.4/1.6 MPI 80k) / Αλυσίδα (2.0 TFSI)',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'1.4/1.6 MPI'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'audi', models:['a3','a4','a5','a6'], years:'2008+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0 TDI (90.000 km)',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(90000,'2.0 TDI – αντικατάσταση'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'audi', models:['a4','a5','a6'], years:'2008+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (TFSI)',
      services:[
        { n:'Αλλαγή λαδιού & φίλτρου (LongLife)', km:30000, months:24, cat:'oil' },
        airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'audi', models:['q3','q5','q7'], years:'2012+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0 TDI / Αλυσίδα 3.0 TDI',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(90000,'2.0 TDI'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), diffOil(), brakePads() ] },

    /* ════════════════════════  BMW  ════════════════════════ */
    { make:'bmw', models:['σειρά 1','series 1','116','118','120','123','125','130'], years:'2004+',
      timing:'Αλυσίδα χρονισμού',
      note:'BMW Condition Based Service (CBS): έλεγχος στο ταμπλό. Πρακτικά: 15.000 km/12 μήνες',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'bmw', models:['σειρά 3','series 3','316','318','320','325','330','335','340','e46','e90','f30','g20'], years:'1999+',
      timing:'Αλυσίδα χρονισμού',
      note:'CBS: ακολουθήστε ένδειξη ταμπλό. Μέγιστο 15.000 km ή 12 μήνες για ασφαλή χρήση',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'bmw', models:['σειρά 5','series 5','520','523','525','530','535','540','e60','f10','g30'], years:'2003+',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxAuto(), brakePads() ] },

    { make:'bmw', models:['σειρά 1','σειρά 3','σειρά 5','x1','x3','x5'], fuel:'diesel', years:'2004+',
      timing:'Αλυσίδα χρονισμού (diesel)',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  MERCEDES-BENZ  ════════════════════════ */
    { make:'mercedes','models':['a class','a-class','b class','b-class','w168','w169','w176','w177','w245','w246','w247'],
      years:'1997+',
      timing:'Αλυσίδα / Ιμάντας (1.5 CDI: 80.000 km)',
      note:'Mercedes Service A/B: ακολουθήστε ένδειξη ASSYST+. Πρακτικά: 15.000–20.000 km',
      services:[
        { n:'Service A (λάδι, φίλτρα)', km:15000, months:12, cat:'oil' },
        { n:'Service B (πλήρης έλεγχος)', km:30000, months:24, cat:'oil' },
        cabinFilter(), sparkIridium(),
        { n:'Ιμάντας χρονισμού 1.5/1.7 CDI', km:80000, cat:'timing', warn:true, note:'Μόνο diesel παλαιών εκδόσεων' },
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'mercedes', models:['c class','c-class','w202','w203','w204','w205','e class','e-class','w210','w211','w212','w213'],
      years:'1995+',
      timing:'Αλυσίδα χρονισμού (petrol & modern diesel)',
      services:[
        { n:'Service A (λάδι, φίλτρα)', km:15000, months:12, cat:'oil' },
        { n:'Service B (πλήρης έλεγχος)', km:30000, months:24, cat:'oil' },
        airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxAuto(), brakePads() ] },

    /* ════════════════════════  RENAULT  ════════════════════════ */
    { make:'renault', models:['clio'], years:'2005–2019', fuel:'petrol',
      timing:'Ιμάντας χρονισμού (K4M 120.000 km) / Αλυσίδα (1.2 TCe, 0.9 TCe)',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        belt(120000,'K4M 1.4/1.6 16V – 120k | 1.0 TCe: αλυσίδα'),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'renault', models:['megane','μεγκαν'], years:'2002+', fuel:'petrol',
      timing:'Ιμάντας (K4M/F4R: 120.000 km) / Αλυσίδα (2.0 T M4R)',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        belt(120000,'K4M/F4R 1.4/1.6/2.0 – 120k'),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'renault', models:['megane','clio','kadjar','scenic'], years:'2004+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού K9K 1.5 dCi (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.5 dCi K9K – 120k | ελέγξτε και tensioner'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'renault', models:['kadjar','captur'], years:'2013+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.2/1.3 TCe)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxAuto(), brakePads() ] },

    /* ════════════════════════  DACIA  ════════════════════════ */
    { make:'dacia', models:['logan','sandero','duster'], years:'2005–2015', fuel:'petrol',
      timing:'ΚΡΙΣΙΜΟ: Ιμάντας χρονισμού K7M/K4M (60.000 km!)',
      note:'Ο K7M 1.4/1.6 8V έχει ΙΜΑΝΤΑ στα 60.000 km – πολλοί τον αγνοούν!',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        belt(60000,'K7M/K4M – ΚΡΙΣΙΜΟ: 60.000 km! Αλλαγή απαραίτητη'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'dacia', models:['logan','sandero','duster','jogger'], years:'2016+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.0 SCe / 1.0 TCe / 1.3 TCe)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'dacia', models:['duster','logan','sandero'], years:'2010+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 1.5 dCi K9K (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.5 dCi K9K – 120k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  PEUGEOT  ════════════════════════ */
    { make:'peugeot', models:['206','207','208'], years:'2002+', fuel:'petrol',
      timing:'Ιμάντας (TU3/TU5: 80.000 km) / Αλυσίδα (1.2 PureTech – ΠΡΟΣΟΧΗ!)',
      note:'1.2 PureTech: ΑΛΥΣΙΔΑ αλλά με γνωστά προβλήματα τεντωτήρα – αλλαγή λαδιού max 10.000 km!',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'TU3/TU5 – 80k'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'peugeot', models:['308','3008','5008','407','508'], years:'2007+', fuel:'petrol',
      timing:'Αλυσίδα (1.2 PureTech / 1.6 THP) – ΠΡΟΣΟΧΗ!',
      note:'1.6 THP/1.2 PureTech: αλυσίδα με γνωστά προβλήματα τεντωτήρα – αλλαγή λαδιού ΜΕΓΙΣΤΟ 10.000 km!',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'peugeot', models:['207','208','308','3008','partner'], years:'2004+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 1.4/1.6 HDi (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.4/1.6 HDi – 120k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  CITROËN  ════════════════════════ */
    { make:'citroen', models:['c3'], years:'2002+', fuel:'petrol',
      timing:'Ιμάντας (TU: 80k) / Αλυσίδα (1.2 PureTech – ΠΡΟΣΟΧΗ)',
      note:'1.2 PureTech: αλυσίδα γνωστών προβλημάτων – λάδι ανά 10.000 km',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'TU engine – 80k'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'citroen', models:['c4','c5','berlingo','xsara'], years:'2004+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 1.6/2.0 HDi (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.6/2.0 HDi – 120k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'citroen', models:['c4','c5 aircross','c3 aircross'], years:'2012+', fuel:'petrol',
      timing:'Αλυσίδα (1.2 PureTech) – ΠΡΟΣΟΧΗ τεντωτήρας',
      note:'Λάδι max 10.000 km για αλυσίδα PureTech',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  FORD  ════════════════════════ */
    { make:'ford', models:['fiesta'], years:'2002–2011', fuel:'petrol',
      timing:'Ιμάντας χρονισμού Duratec (80.000–100.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'1.25/1.4/1.6 Duratec HE – 80k–100k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'ford', models:['fiesta','focus'], years:'2012+', fuel:'petrol',
      timing:'Αλυσίδα (1.0/1.5 EcoBoost) / Ιμάντας (1.6 Duratec 100k)',
      note:'1.0 EcoBoost: γνωστό πρόβλημα τεντώματος αλυσίδας – λάδι max 10.000 km, χρήση 5W30',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        belt(100000,'1.6 Duratec – 100k'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'ford', models:['focus'], years:'2004–2011', fuel:'petrol',
      timing:'Ιμάντας χρονισμού 1.6 Duratec (100.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        belt(100000,'1.6 Duratec – ανά 100k ή 10 χρόνια'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'ford', models:['focus','kuga','mondeo','s-max'], years:'2005+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 1.6/2.0 TDCi (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.6/2.0 TDCi – 120k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'ford', models:['kuga','s-max','mondeo','galaxy'], years:'2013+', fuel:'petrol',
      timing:'Αλυσίδα (EcoBoost 1.5/2.0)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxAuto(), brakePads() ] },

    /* ════════════════════════  OPEL / VAUXHALL  ════════════════════════ */
    { make:'opel', models:['corsa d','corsa e','corsa'], years:'2006+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.2/1.4 A12XER/A14NET)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'opel', models:['astra h','astra j'], years:'2004–2015', fuel:'petrol',
      timing:'Ιμάντας (1.4/1.6 Twinport 80k) / Αλυσίδα (1.4 Turbo)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'1.4/1.6 Twinport – 80k'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'opel', models:['astra k','astra l','insignia','mokka'], years:'2015+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'opel', models:['astra','zafira','insignia','meriva'], years:'2004+', fuel:'diesel',
      timing:'Αλυσίδα / Ιμάντας (1.3/1.7 CDTi)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(80000,'1.3/1.7 CDTi – 80k'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  SKODA  ════════════════════════ */
    { make:'skoda', models:['fabia','octavia','superb','kodiaq','karoq'], years:'2005+', fuel:'petrol',
      timing:'Αλυσίδα (TSI 2013+) / Ιμάντας (1.2/1.4 MPI 80k)',
      services:[
        { n:'Αλλαγή λαδιού & φίλτρου (LongLife ή 15k)', km:30000, months:24, cat:'oil', note:'Ή 15.000 km/12 μήνες με τυπικό λάδι' },
        airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'1.2/1.4 MPI'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'skoda', models:['octavia','superb','kodiaq'], years:'2005+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0 TDI (90.000 km)',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(90000,'2.0 TDI – 90k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  SEAT / CUPRA  ════════════════════════ */
    { make:'seat', models:['ibiza','leon','arona','ateca'], years:'2005+', fuel:'petrol',
      timing:'Ίδιο με VW Polo/Golf (πλατφόρμα MQB/PQ)',
      services:[
        { n:'Αλλαγή λαδιού & φίλτρου', km:15000, months:12, cat:'oil' },
        airFilter30(), cabinFilter(), sparkStd(),
        belt(80000,'1.2/1.4 MPI – 80k'), chainCheck(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  HONDA  ════════════════════════ */
    { make:'honda', models:['civic','σιβικ'], years:'2006+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      note:'Honda Maintenance Minder: ακολουθήστε ένδειξη ταμπλό. Τυπικά 10.000 km/12 μήνες',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'honda', models:['cr-v','crv'], years:'2007+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), gearboxAuto(), diffOil(), brakePads() ] },

    { make:'honda', models:['jazz','hr-v','hrv'], years:'2008+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  NISSAN  ════════════════════════ */
    { make:'nissan', models:['micra','μικρα'], years:'2003+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'nissan', models:['juke'], years:'2010+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.2 DIG-T / 1.6)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'nissan', models:['qashqai','καστσκαι'], years:'2007+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'nissan', models:['qashqai','x-trail','navara'], years:'2007+', fuel:'diesel',
      timing:'Ιμάντας (2.0 dCi 90–120k) / Αλυσίδα (1.5 dCi)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'2.0 dCi – 90–120k'), chainCheck(),
        brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  HYUNDAI  ════════════════════════ */
    { make:'hyundai', models:['i10'], years:'2008+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'hyundai', models:['i20','i25'], years:'2008+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.2/1.4)',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'hyundai', models:['i30','i35','elantra'], years:'2007+', fuel:'petrol',
      timing:'Αλυσίδα (1.4/1.6 GDi/T-GDi)',
      note:'1.6 GDi/T-GDi: πιθανό καρβουνιάσιμα βαλβίδων – έλεγχος στα 60.000 km',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'hyundai', models:['i30','tucson','santa fe','ix35'], years:'2008+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 1.6/2.0 CRDi (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.6/2.0 CRDi – 120k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'hyundai', models:['tucson','tuscon','ix35'], years:'2010+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.6 T-GDi)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxAuto(), brakePads() ] },

    /* ════════════════════════  KIA  ════════════════════════ */
    { make:'kia', models:['picanto','πικαντο'], years:'2004+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'kia', models:['rio','ceed','venga','soul'], years:'2006+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'kia', models:['sportage','sorento','stonic','niro'], years:'2010+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.6 T-GDi)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant60(), gearboxAuto(), brakePads() ] },

    { make:'kia', models:['sportage','sorento','ceed'], years:'2010+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 1.7/2.0 CRDi (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.7/2.0 CRDi – 120k'), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  SUZUKI  ════════════════════════ */
    { make:'suzuki', models:['swift','βαλτος','βαλτός','baleno'], years:'2010+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'suzuki', models:['vitara','s-cross','scross','ignis'], years:'2015+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.0/1.4 Boosterjet)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'suzuki', models:['jimny'], years:'2000+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      note:'Off-road χρήση: αλλαγή λαδιού ανά 7.500 km',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), diffOil(),
        { n:'Λάδι transfer case', km:40000, cat:'fluid' }, brakePads() ] },

    /* ════════════════════════  FIAT  ════════════════════════ */
    { make:'fiat', models:['panda','πάντα'], years:'2004+', fuel:'petrol',
      timing:'Αλυσίδα (Fire 1.2) – 15.000 km ή 18 μήνες',
      note:'Fiat συνιστά 20.000 km/24μήνες αλλά 15.000 km/12μήνες πιο ασφαλές',
      services:[
        oil15(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'fiat', models:['panda','500','grande punto','punto'], years:'2004+', fuel:'diesel',
      timing:'ΚΡΙΣΙΜΟ: Ιμάντας χρονισμού 1.3 MJet (80.000 km)',
      note:'1.3 Multijet: ιμάντας στα 80.000 km – παραβλέπεται συχνά με καταστροφικά αποτελέσματα!',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(80000,'1.3 MJet – ΚΡΙΣΙΜΟ: 80k (όχι 120k!)'),
        brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'fiat', models:['500','τ500','500x','500l'], years:'2007+', fuel:'petrol',
      timing:'Αλυσίδα (Fire 1.2/1.4) / Ιμάντας (1.4 T-Jet: αλυσίδα)',
      services:[
        oil15(), airFilter40(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'fiat', models:['tipo','bravo','stilo'], years:'2007+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.4/1.6)',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  ALFA ROMEO  ════════════════════════ */
    { make:'alfa romeo', models:['giulietta','mito','giulia'], years:'2010+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.4 T-Jet / 2.0 TB)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'alfa romeo', models:['giulietta','159','stelvio'], years:'2008+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 1.6/2.0 JTDm (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'1.6/2.0 JTDm – 120k'), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  MAZDA  ════════════════════════ */
    { make:'mazda', models:['mazda2','mazda 2','demio'], years:'2008+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (SkyActiv)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'mazda', models:['mazda3','mazda 3','axela'], years:'2009+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (SkyActiv-G)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'mazda', models:['mazda6','mazda 6','atenza','cx-5','cx5'], years:'2012+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (SkyActiv-G)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), gearboxAuto(), brakePads() ] },

    { make:'mazda', models:['mazda3','mazda6','cx-5','cx5','cx-30'], years:'2012+', fuel:'diesel',
      timing:'Αλυσίδα χρονισμού (SkyActiv-D)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  MITSUBISHI  ════════════════════════ */
    { make:'mitsubishi', models:['l200'], years:'2006–2015', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.5 Di-D (100.000 km)',
      note:'Off-road/φορτίο: λάδι ανά 7.500 km',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(100000,'2.5 Di-D 4D56 – 100k'), brakeFluid(), coolant48(),
        gearboxOil(), diffOil(), { n:'Λάδι transfer case', km:40000, cat:'fluid' }, brakePads() ] },

    { make:'mitsubishi', models:['l200'], years:'2015+', fuel:'diesel',
      timing:'Αλυσίδα χρονισμού (2.4 MIVEC)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        chainCheck(), brakeFluid(), coolant48(),
        gearboxOil(), diffOil(), { n:'Λάδι transfer case', km:40000, cat:'fluid' }, brakePads() ] },

    { make:'mitsubishi', models:['outlander','eclipse cross','asx'], years:'2007+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), gearboxAuto(), brakePads() ] },

    { make:'mitsubishi', models:['outlander','asx'], years:'2007+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0/2.2 Di-D (120.000 km)',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'2.0/2.2 Di-D – 120k'), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  JEEP  ════════════════════════ */
    { make:'jeep', models:['renegade','compass'], years:'2015+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (1.4 MultiAir)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'jeep', models:['renegade','compass','cherokee'], years:'2015+', fuel:'diesel',
      timing:'ΚΡΙΣΙΜΟ: Ιμάντας χρονισμού 2.0 Multijet (60.000 km)',
      note:'FCA 2.0 Multijet diesel: ιμάντας στα 60.000 km – συχνά παραβλέπεται!',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(60000,'2.0 Multijet – ΚΡΙΣΙΜΟ: 60k'), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'jeep', models:['wrangler','grand cherokee'], years:'2011+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (Pentastar V6)',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), diffOil(),
        { n:'Λάδι transfer case', km:40000, cat:'fluid' }, brakePads() ] },

    /* ════════════════════════  LAND ROVER  ════════════════════════ */
    { make:'land rover', models:['freelander','discovery sport','evoque'], years:'2006+', fuel:'diesel',
      timing:'Ιμάντας χρονισμού 2.0 TD4 (120.000 km)',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'2.0 TD4/SD4 – 120k'), brakeFluid(), coolant48(),
        gearboxAuto(), diffOil(), { n:'Λάδι transfer case', km:40000, cat:'fluid' }, brakePads() ] },

    { make:'land rover', models:['defender','discovery','range rover','range rover sport'], years:'2010+', fuel:'diesel',
      timing:'Αλυσίδα χρονισμού (TDV6/SDV6/D300)',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        chainCheck(), brakeFluid(), coolant48(),
        gearboxAuto(), diffOil(), { n:'Λάδι transfer case', km:40000, cat:'fluid' }, brakePads() ] },

    /* ════════════════════════  VOLVO  ════════════════════════ */
    { make:'volvo', models:['xc40','xc60','xc90','s60','v60','v40','s90','v90'], years:'2015+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    { make:'volvo', models:['xc60','xc90','s60','v60','v40'], years:'2010+', fuel:'diesel',
      timing:'Ιμάντας / Αλυσίδα (D2/D3: ιμάντας 120k | D4/D5: αλυσίδα)',
      services:[
        oil15(), airFilter30(), cabinFilter(), fuelFilterD(),
        belt(120000,'D2/D3 – 120k | D4/D5: αλυσίδα'), chainCheck(),
        brakeFluid(), coolant48(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  MINI  ════════════════════════ */
    { make:'mini', models:['mini one','mini cooper','mini clubman','mini countryman','mini paceman'], years:'2006+', fuel:'petrol',
      timing:'Αλυσίδα χρονισμού (BMW πλατφόρμα)',
      note:'Mini CBS: ακολουθήστε ένδειξη ταμπλό – πρακτικά 15.000 km/12 μήνες',
      services:[
        oil15(), airFilter30(), cabinFilter(), sparkIridium(),
        chainCheck(), brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    /* ════════════════════════  GENERIC FALLBACKS  ════════════════════════ */
    { make:'__generic__', models:['*'], fuel:'petrol', years:'',
      timing:'Ελέγξτε εγχειρίδιο κατασκευαστή',
      services:[
        oil10(), airFilter30(), cabinFilter(), sparkStd(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },

    { make:'__generic__', models:['*'], fuel:'diesel', years:'',
      timing:'Ελέγξτε εγχειρίδιο κατασκευαστή',
      services:[
        oil10(), airFilter30(), cabinFilter(), fuelFilterD(),
        brakeFluid(), coolant60(), gearboxOil(), brakePads() ] },
  ];

  /* ─── Lookup function ─── */
  function find(brand, model, fuel) {
    const mk = (brand  || '').toLowerCase().trim();
    const mo = (model  || '').toLowerCase().trim();
    const fu = (fuel   || '').toLowerCase().trim();

    function score(entry) {
      if (entry.make === '__generic__') return 0;
      if (entry.make !== mk) return -1;
      const modelMatch = entry.models.some(p => p === '*' || mo.includes(p) || p.includes(mo));
      if (!modelMatch) return -1;
      if (entry.fuel && !fu.includes(entry.fuel) && !entry.fuel.includes(fu)) return 1;
      return 2;
    }

    let best = null, bestScore = -1;
    for (const e of DB) {
      const s = score(e);
      if (s > bestScore) { bestScore = s; best = e; }
    }

    if (best && bestScore > 0) return best;

    // Try make-only match
    const makeOnly = DB.find(e => e.make === mk);
    if (makeOnly) return makeOnly;

    // Generic fallback
    const diesel = fu.includes('diesel');
    return DB.find(e => e.make === '__generic__' && (diesel ? e.fuel === 'diesel' : e.fuel === 'petrol'));
  }

  return { find };
})();
