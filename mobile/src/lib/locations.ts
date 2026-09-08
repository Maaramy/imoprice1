/**
 * Base de localisation tunisienne — portée depuis src/convex/types.ts du Web.
 * Ces données sont embarquées pour permettre les cascades
 * Gouvernorat → Ville → Quartier même sans connexion.
 */

export const GOVERNORATS = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul",
  "Zaghouan", "Bizerte", "Béja", "Jendouba", "Kef",
  "Siliana", "Sousse", "Monastir", "Mahdia", "Sfax",
  "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

export const VILLES_BY_GOUVERNORAT: Record<string, string[]> = {
  Tunis: [
    "Tunis Ville", "La Marsa", "Carthage", "Sidi Bou Saïd", "Le Bardo", "El Menzah",
    "El Omrane", "El Omrane Supérieur", "Bab El Oued", "Bab Saadoun", "Cité El Khadra",
    "La Goulette", "Le Kram", "Mégrine", "Radès", "El Mourouj", "Sidi Hassine",
    "El Hraïria", "Kabaria", "El Ouardia", "Djebel Jelloud", "Sidi El Béchir",
    "Sidi Ali Azouz", "Hammam Lif", "Essouika", "La Cagne", "Les Jardins d'El Menzah",
  ],
  Ariana: [
    "Ariana Ville", "Raoued", "La Soukra", "Kalâat el-Andalous", "Sidi Thabet",
    "Borj Louzir", "Ennasr", "El Menzah 5", "Charguia", "Charguia 2",
    "Charguia 3", "Soukra Ouest", "Soukra Est", "Les Jardins de l'Ariana",
    "Cité El Ghazala", "Cité des Oiseaux", "El Yassmine", "Chotrana",
    "Nasrallah", "Borj El Amri", "Ettadhamen Ville", "Ettadhamen",
  ],
  "Ben Arous": [
    "Ben Arous Ville", "Hammam Lif", "Hammam Chott", "Bou Mhel",
    "El Bassatine", "Fouchana", "Mornag", "Mohamedia", "Nouvelle Médina",
    "Radès", "Mégrine", "Mégrine Coteau", "Mégrine Sidi Salem",
    "Ez Zahra", "El Mrazig", "Sidi Mosbah", "El Ksar",
    "Bou Mhel Ouest", "Bou Mhel Est", "La Faculté", "Zone Industrielle Ben Arous",
  ],
  Manouba: [
    "Manouba Ville", "Tebourba", "Douar Hicher", "El Battan",
    "Borj El Amri", "Djedeida", "Mornaguia", "Oued Ellil",
    "El Batahia", "Borj Touibi", "Den Den", "Sidi Ali El Hattab",
    "Douar Hicher Ouest", "Douar Hicher Est", "Cité Ennasr Manouba",
    "Oued Ellil Ville", "Chabet", "Tebourba Ville",
  ],
  Nabeul: [
    "Nabeul Ville", "Hammamet", "Dar Chaâbane", "El Haouaria",
    "El Maâmoura", "Béni Khiar", "Korba", "Menzel Temime",
    "Kélibia", "Soliman", "Grombalia", "Takelsa", "Nianou",
    "Azmour", "Tazarka", "Bou Argoub Sijoumi", "Menzel Horr",
    "Somâa", "Bir Bouregba", "Sidi Moussa", "Yasmine Hammamet",
    "Dar Chaâbane Est", "Dar Chaâbane Ouest", "Mrazga", "Belli",
  ],
  Zaghouan: [
    "Zaghouan Ville", "El Fahs", "Zriba", "Bir Mcherga",
    "Nadhour", "Saouaf", "Oued Ezzit", "Sbaïhia", "El Magrane",
    "El Aroussia", "Bir Halima", "Djebel Oust", "Hammam Zriba",
    "El Msaoudine", "El Aouana", "Moghrane",
  ],
  Bizerte: [
    "Bizerte Ville", "Menzel Jemil", "Menzel Bourguiba", "Mateur",
    "Tinja", "Utique", "Ras Jebel", "El Alia", "Ghar El Melh",
    "Sejnane", "Joumine", "Bizerte Nord", "Bizerte Sud", "Zarzouna",
    "Ain Mariam", "Sidi Salem", "El Azib", "Henchir Eddamer",
    "Henchir Ennasr", "Menzel Abderrahmane", "Menzel Salem",
    "Bazina", "Sounine", "Touajenet", "Cap Zebib", "Météline",
  ],
  "Béja": [
    "Béja Ville", "Médjez El Bab", "Téboursouk", "Nefza",
    "Amdoun", "Goubellat", "Testour", "Zahret Mediene", "Sidi Nasseur",
    "El Maâgoula", "Thibar", "Oued Zarga", "Sabia", "Cité Ennasr Béja",
    "Béja Nord", "Béja Sud", "Béja Ouest", "Sidi Frej",
    "El Ksar", "El Hariza", "Khouled", "Amdoun Ville",
  ],
  Jendouba: [
    "Jendouba Ville", "Tabarka", "Aïn Draham", "Fernana",
    "Oued Meliz", "Bou Salem", "Ghardimaou", "Balta", "Beni M'hamed",
    "Souaniya", "El Khetmine", "Bou Bernous", "Ouled Mahrouk",
    "Zarroug", "Tabarka Nord", "Tabarka Plage", "El Hédi",
    "Bou Hertma", "Aïn El Kebira", "Jendouba Nord", "Jendouba Sud",
    "Ghardimaou Nord", "Ghardimaou Sud", "Fernana Ville",
  ],
  "Kef": [
    "Le Kef Ville", "Tajerouine", "Dahmani", "Sakiet Sidi Youssef",
    "Kalaât Sinane", "Kalaat Khasba", "Nebeur", "Touiref", "Jerissa",
    "El Ksour", "Sidi Ahmed", "Oued Slata", "El Garia",
    "Le Kef Est", "Le Kef Ouest", "Sidi M'hadheb", "Es Sraya",
    "Bou Khalifa", "Ouerga", "Souk El Khemis", "Taghliyya",
  ],
  Siliana: [
    "Siliana Ville", "Bouarada", "Gaâfour", "Le Krib",
    "Makthar", "Rouhia", "Kesra", "Bargou", "Sidi Fernane",
    "El Aroussa", "Sidi Houmad", "Ouled Yaakoub", "Sidi Saadoune",
    "El Bibane", "Zlitni", "Siliana Nord", "Siliana Sud",
  ],
  Sousse: [
    "Sousse Ville", "Hammam Sousse", "M'saken", "Kalaâ Kebira",
    "Kalaâ Sghira", "Akouda", "Bouficha", "Enfidha", "Sidi Bou Ali",
    "Kondar", "Sousse Médina", "Sousse Corniche", "Sousse Riadh",
    "Sousse Boujaafar", "Sousse Sahloul", "Sousse Ezzouhour",
    "Kalaâ Kebira Nord", "Kalaâ Kebira Sud", "Port El Kantaoui",
    "Hergla", "Hammam Sousse Centre", "la Cité Olympique",
    "M'saken Ville", "M'saken El Jadida", "Zaouiet Sousse",
  ],
  Monastir: [
    "Monastir Ville", "Moknine", "Jemmal", "Ksibet El Mediouni",
    "Téboulba", "Bekalta", "Sayada", "Lamta", "Bembla",
    "Zéramdine", "Ksar Hellal", "Ouerdanine", "Bembla Ville",
    "Menzel Ennour", "Skanes", "Route El Fida", "Corniche de Monastir",
    "Monastir Centre", "Khnis", "Moknine El Jadida", "Ksar Helal Nord",
    "Ksar Helal Sud", "Téboulba Ville", "Bekalta Ville",
  ],
  Mahdia: [
    "Mahdia Ville", "El Jem", "Ksour Essef", "Chebba",
    "Melloulèche", "Sidi Alouane", "Bou Merdes", "Ouled Chamekh",
    "Hbira", "Chorbane", "Mahdia Corniche", "Mahdia Médina",
    "Zorda", "Rejiche", "El Bradaa", "El Ghedhabna",
    "Bou Merdes Ouest", "Chorbane Ville", "Ksour Essef Nord",
    "Ksour Essef Sud", "Chebba Plage", "El Jem Ville",
  ],
  Sfax: [
    "Sfax Ville", "Sakiet Ezzit", "Sakiet Eddaïer", "Gremda",
    "El Ain", "Thyna", "Agareb", "Jebeniana", "El Amra",
    "Kerkennah", "Mahras", "Bir Ali Ben Khalifa", "Sidi Abdelmoula",
    "El Hencha", "Menzel Chaker", "Sfax El Jadida", "Sfax Zone Industrielle",
    "Sfax Médina", "Sfax Route El Ain", "Sfax Campement",
    "Sfax El Bahira", "Chihia", "Gremda Ville", "Merkez El Amra",
    "Agareb Ville", "Bir Ali Ben Khalifa Ville", "Jebeniana Ville",
    "El Amra Ville", "Kerkenah (Remla)", "Kerkennah (El Ataya)",
  ],
  Kairouan: [
    "Kairouan Ville", "Chébika", "Haffouz", "Oueslatia",
    "Bou Hajla", "Nasrallah", "Sbikha", "Echrarda", "El Alâa",
    "Sidi Saad", "Sidi Amor", "Ain Jelloula", "Haffouz Ville",
    "Oueslatia Ville", "Bou Hajla Ville", "Nasrallah Ville",
    "Kairouan Médina", "Kairouan El Mohsenia", "Kairouan Nord",
    "Kairouan Sud", "El Alâa Ville", "Sbikha Ville",
  ],
  Kasserine: [
    "Kasserine Ville", "Sbeitla", "Fériana", "Foussana",
    "Thala", "Hidra", "Sbiba", "Jediliane", "Hassi El Ferid",
    "Majel Bel Abbès", "Ezzouhour Kasserine", "El Ayoun", "Zalakat",
    "Kasserine Nord", "Kasserine Sud", "Kasserine Ouest",
    "Sbeitla Ville", "Sbeitla El Jadida", "Thala Ville",
    "Fériana Ville", "Foussana Ville", "Sbiba Ville",
  ],
  "Sidi Bouzid": [
    "Sidi Bouzid Ville", "Meknassy", "Regueb", "Menzel Bouzaiane",
    "Bir El Hafey", "Ouled Haffouz", "Jilma", "Cebbala Ouled Asker",
    "Souk Jedid", "Sidi Bouzid Est", "Sidi Bouzid Ouest",
    "Sidi Bouzid Nord", "Meknassy Ville", "Regueb Ville",
    "Bir El Hafey Ville", "Ouled Haffouz Ville", "Jilma Ville",
    "Beni Khaled", "El Mansoura", "Souk Jedid Ville",
  ],
  "Gabès": [
    "Gabès Ville", "Chenini", "Métouia", "Oudhref",
    "El Hamma", "Matmata", "Zarat", "Menzel El Habib",
    "Nouvelle Matmata", "Tamezret", "Gabès Ouest", "Gabès Sud",
    "Gabès Médina", "Gabès El Bouthana", "Gabès Sidi Boulbaba",
    "El Hamma Ville", "Métouia Ville", "Chenini Ville",
    "Matmata Ville", "Matmata Nouvelle", "Toujane", "Téchine",
  ],
  "Médenine": [
    "Médenine Ville", "Djerba (Houmt Souk)", "Djerba (Midoun)",
    "Djerba (Ajim)", "Ben Guerdane", "Zarzis", "Beni Khedache",
    "Sidi Makhlouf", "Chammakh", "El Bibane", "Médenine Nord",
    "Médenine Sud", "Médenine El Jadida", "Zarzis Ville",
    "Zarzis Plage", "Ben Guerdane Ville", "Beni Khedache Ville",
    "Houmt Souk Centre", "Midoun Centre", "Ajim Centre",
    "Mellita", "Cédria", "Erriadh", "Boughrara",
  ],
  Tataouine: [
    "Tataouine Ville", "Remada", "Ghomrassen", "Bir Lahmar",
    "Smâr", "Thiguir", "Tataouine Nord", "Tataouine Sud",
    "Ghomrassen Ville", "Remada Ville", "Bir Lahmar Ville",
    "Ksar Ouled Soltane", "Ksar Hadada", "Ksar Ghilane",
    "Chenini Tataouine", "Douiret", "Guermessa", "Maztouria",
    "El Ferch", "Tamezret Tataouine", "Zaoouia El Hartha",
  ],
  Gafsa: [
    "Gafsa Ville", "El Ksar", "Moulares", "Redeyef",
    "Métlaoui", "Sened", "Belkhir", "El Guettar", "Gafsa Nord",
    "Gafsa Sud", "Gafsa El Kasbah", "Gafsa Zone Industrielle",
    "Moulares Ville", "Redeyef Ville", "Métlaoui Ville",
    "Sened Ville", "Belkhir Ville", "El Guettar Ville",
    "El Ksar Ville", "Lela", "Oum El Araies", "Sidi Aich",
    "Zannouch", "Mdhila", "Sidi Boubaker", "El Ayaicha",
  ],
  Tozeur: [
    "Tozeur Ville", "Nefta", "Degache", "Hamet Jerid",
    "Hazoua", "Tozeur Sud", "Tozeur Nord", "Nefta Ville",
    "Degache Ville", "El Hamma Du Jerid", "Chneguil", "El Kriz",
    "Abbès", "Bled El Hadhar", "Ouled Naceur", "Zaouiet Rabah",
    "Souk El Khadra", "Khatatnia", "Ben Nasser", "El Mansourah",
  ],
  Kébili: [
    "Kébili Ville", "Douz", "El Faouar", "Souk El Ahed",
    "Bechri", "Jemna", "Kébili Nord", "Kébili Sud",
    "Douz Ville", "Douz Oued El Ghalla", "Douz Mbarek", "El Faouar Ville",
    "Bechri Ville", "Jemna Ville", "Bazma", "Rjim Maatoug",
    "El Mansoura Kébili", "Zaouiat El Anes", "Telmine", "Nouvel",
  ],
};

export const QUARTIERS_BY_VILLE: Record<string, string[]> = {
  // ——— GRAND TUNIS ———
  "Tunis Ville": ["Centre Ville", "Hédi Nouira", "Montplaisir", "Belvédère", "Parc Belvédère", "El Omrane", "Bab El Khadra", "Bab Souika", "Halfaouine", "Sidi El Béchir", "Sidi Ali Azouz", "Essijoumi", "Bab Babar", "Bab Jebli", "Bab Driba", "Mellassine", "Sidi Hassen"],
  "La Marsa": ["Sidi Daoud", "Gammarth", "Le Golf Carthage", "Les Côtes de Carthage", "Menzel Village", "Erriadh", "Plage de La Marsa", "Rue Lafayette", "Rue de la République", "Cité El Wafa"],
  Carthage: ["Carthage Byrsa", "Carthage Dermech", "Carthage Hannibal", "Carthage Présidence", "Carthage Amilcar", "Carthage Salammbô", "Carthage La Malsouha", "Carthage Yasmina"],
  "Sidi Bou Saïd": ["Sidi Bou Saïd Village", "La Corniche", "Taieb Mhiri", "Place Sidi Bou Saïd", "Avenue Habib Thameur"],
  "Le Bardo": ["Le Bardo Centre", "Cité Universitaire", "Bardo Belvédère", "El Kram El Bardo", "Cité El Ayachi", "Cité El Habib", "El Ksar Bardo", "El Mghira"],
  "El Menzah": ["El Menzah 1", "El Menzah 2", "El Menzah 3", "El Menzah 4", "El Menzah 5", "El Menzah 6", "El Menzah 7", "El Menzah 8", "El Menzah 9", "Sup'Com", "Cité Jardins"],
  "La Goulette": ["La Goulette Centre", "La Goulette Plage", "La Goulette Port", "Khaznadar", "Vieille Goulette", "Avenue Franklin Roosevelt"],
  "Le Kram": ["Le Kram Est", "Le Kram Ouest", "Vieux Kram", "Cité El Khadra", "Cité des Oliviers"],
  Mégrine: ["Mégrine Coteau", "Mégrine Sidi Salem", "Mégrine Chaker", "Mégrine El Haddad", "Mégrine Les Jardins", "Zone Industrielle Mégrine"],
  Radès: ["Radès Ville", "Forêt de Radès", "Méliane", "Radès Mimosas", "Cité El Bassatine", "Cité Essalem", "Rades Saline", "Zone Industrielle Radès"],
  "El Mourouj": ["El Mourouj 1", "El Mourouj 2", "El Mourouj 3", "El Mourouj 4", "El Mourouj 5", "El Mourouj 6", "El Mourouj Belvédère"],
  "Sidi Hassine": ["Sidi Hassine Ville", "Cité Ettadhamen", "El Karia", "Jebel El Ouest"],
  "El Ouardia": ["El Ouardia Ville", "Cité Ibn Khaldoun", "El Habib", "El Fath"],
  "Hammam Lif": ["Hammam Lif Centre", "Bardo Hammam Lif", "Cité Ennasr", "Cité El Kouba", "Gare de Hammam Lif", "Boulevard Ali Bourguiba"],

  // ——— ARIANA ———
  "Ariana Ville": ["Ariana Centre", "Ariana El Menzah", "Arianeville", "Cité El Bassatine", "Cité Essalem", "Route de Sfax", "Avenue Habib Bourguiba", "Sidi Ayed"],
  Raoued: ["Raoued Ville", "Raoued Plage", "Borj El Khessous", "Cité Rim", "Jardins d'El Bassatine", "Sidi Salah", "Cité El Intilaka"],
  "La Soukra": ["La Soukra Centre", "Jardins de la Soukra", "Cité El Ghazala", "Cité Télécom", "Pépinière", "El Wardia", "Les Dattiers"],
  "Kalâat el-Andalous": ["Kalâat Ville", "El Ksar", "Cité El Amel", "Sidi Frej", "Jebel Lahmar"],
  "Sidi Thabet": ["Sidi Thabet Ville", "Cité Aéroport", "Cité des Oliviers", "Sidi Frej", "Zone Agricole"],
  Ennasr: ["Ennasr 1", "Ennasr 2", "Résidence Ennasr", "Cité des Médecins", "Jardins d'Ennasr", "La Corniche", "Les Jardins du Lac"],
  Charguia: ["Charguia 1", "Charguia 2", "Charguia 3", "Zone Industrielle Charguia", "Cité Aéroport", "Ville des Sciences"],
  Chotrana: ["Chotrana 1", "Chotrana 2", "Cité Rim Chotrana"],

  // ——— BEN AROUS ———
  "Ben Arous Ville": ["Ben Arous Centre", "Zone Industrielle Ben Arous", "Cité El Khadhra", "Cité El Habib", "Sidi Mosbah", "Rue de la Liberté"],
  "Hammam Chott": ["Hammam Chott Centre", "Boulevard de la Plage", "Cité Essourour", "Zone Touristique"],
  "Bou Mhel": ["Bou Mhel Est", "Bou Mhel Ouest", "Cité El Bassatine", "Zone Résidentielle", "La Faculté"],
  "El Bassatine": ["Bassatine Centre", "Cité Es-Salem", "Cité de la Santé", "Jebel Ben Arous"],
  Fouchana: ["Fouchana Ville", "Cité El Amel", "Cité Ennasr", "Zone Industrielle Fouchana"],
  Mornag: ["Mornag Ville", "Mornag El Kébir", "Mornag El Sahel", "Cité Agricole", "Zone Industrielle Mornag"],
  Mohamedia: ["Mohamedia Ville", "Cité El Wafa", "Cité des Jeunes", "Zone Industrielle"],
  "Nouvelle Médina": ["Jardin de la Nouvelle Médina", "Cité Essalam", "Cité El Wafa", "Complexe Résidentiel"],
  "Ez Zahra": ["Ez Zahra Centre", "Cité des Roses", "Cité Ezzouhour", "El Mrazig"],

  // ——— MANOUBA ———
  "Manouba Ville": ["Manouba Centre", "Cité Ennasr", "Cité Essalem", "Université de la Manouba", "Route de Tunis", "El Mghira"],
  "Douar Hicher": ["Douar Hicher Centre", "Douar Hicher Est", "Douar Hicher Ouest", "Cité El Khadhra"],
  "Oued Ellil": ["Oued Ellil Ville", "Cité El Bassatine", "Chabet", "Cité des Oliviers"],
  Djedeida: ["Djedeida Ville", "Cité El Amel", "Borj Touibi", "El Fahs", "Sidi Ali Hattab"],
  Mornaguia: ["Mornaguia Ville", "Cité Essanaâ", "El Aroussia", "Oued Ezzit"],
  Tebourba: ["Tebourba Ville", "Cité Ennasr", "El Battan", "Kap Fredj", "Oued El Kébir"],
  "Borj El Amri": ["Borj El Amri Ville", "Cité Agricole", "El Hafsia"],

  // ——— NABEUL ———
  "Nabeul Ville": ["Nabeul Centre", "Nabeul Plage", "Bir Bouregba", "Sidi Moussa", "Nabeul El Mrazga", "Avenue Habib Bourguiba", "Place de l'Indépendance", "Cité Essalem"],
  Hammamet: ["Hammamet Nord", "Hammamet Sud", "Yasmine Hammamet", "Côte d'Azur", "Mrezga", "La Médina", "Hammamet Plage", "Sidi Yahia", "Belli", "Cité Rim"],
  "Dar Chaâbane": ["Dar Chaâbane Est", "Dar Chaâbane Ouest", "Cité El Bassatine", "El Fejja"],
  Kélibia: ["Kélibia Ville", "Kélibia Port", "Kélibia Plage", "Menzel Temime", "La Corniche", "Avenue Habib Bourguiba"],
  Korba: ["Korba Centre", "Korba Plage", "Tazarka", "El Midi", "Ouled Chamekh"],
  "Menzel Temime": ["Menzel Temime Ville", "Cité Ennasr", "Menzel Horr", "Ain El Ghrab"],
  "El Haouaria": ["El Haouaria Plage", "El Haouaria Ville", "Cap Bon", "Rass Eddrek"],
  Soliman: ["Soliman Ville", "Soliman Plage", "Bou Argoub", "Sijoumi"],
  Grombalia: ["Grombalia Centre", "Béni Khiar", "Bir Bouregba", "Cité Agricole"],
  Takelsa: ["Takelsa Ville", "Cité Ennasr", "Nianou", "Menzel Iskander"],

  // ——— ZAGHOUAN ———
  "Zaghouan Ville": ["Zaghouan Centre", "Cité Ennasr", "Avenue Habib Bourguiba", "Montagne de Zaghouan", "Temple des Eaux"],
  "El Fahs": ["El Fahs Ville", "Cité El Bassatine", "Cité Essanaâ", "El Magrane"],
  Zriba: ["Zriba Ville", "Hammam Zriba", "Cité Minière", "El Aouana"],
  "Bir Mcherga": ["Bir Mcherga Ville", "Oued Ezzit", "Sbaïhia"],
  Nadhour: ["Nadhour Ville", "Saouaf", "Bir Halima", "Djebel Oust"],

  // ——— BIZERTE ———
  "Bizerte Ville": ["Bizerte Centre", "Bizerte Médina", "Corniche", "Zarzouna", "Ain Mariam", "Sidi Salem", "Vieux Port", "Avenue Habib Bourguiba", "Cité Aïn Meriem", "Cité Ennasr"],
  "Menzel Jemil": ["Menzel Jemil Ville", "Cité des Pêcheurs", "El Azib", "Menzel Salem", "Route de Bizerte"],
  "Menzel Bourguiba": ["Menzel Bourguiba Centre", "Cité Ennasr", "Jardin Public", "Route de Mateur", "Zone Industrielle"],
  Mateur: ["Mateur Ville", "Cité El Bassatine", "Cité Agricole", "El Hariza", "Sidi Nasseur"],
  "Ras Jebel": ["Ras Jebel Ville", "Ras Jebel Plage", "Cap Zebib", "Météline", "Sounine", "Touajenet"],
  "El Alia": ["El Alia Ville", "Cité Ennasr", "El Ksar", "Bazina"],
  "Ghar El Melh": ["Ghar El Melh Ville", "Vieille Ville", "Port de Pêche", "Plage de Ghar El Melh"],
  Sejnane: ["Sejnane Ville", "Joumine", "Cité Agricole", "Oued Sejnane"],
  Utique: ["Utique Ville Site", "Utique Village", "Zone Agricole", "Site Archéologique"],
  Tinja: ["Tinja Ville", "Pont de Tinja", "Lac de Bizerte"],

  // ——— BÉJA ———
  "Béja Ville": ["Béja Centre", "Béja Nord", "Béja Sud", "Béja Ouest", "Cité Ennasr", "Cité El Bassatine", "Cité Jardin", "El Maâgoula", "Route de Testour", "Avenue Habib Bourguiba"],
  "Médjez El Bab": ["Médjez Centre", "Cité El Bassatine", "Pont de Medjez", "El Hariza", "Sidi Frej"],
  Téboursouk: ["Téboursouk Ville", "Dougga", "Cité Agricole", "Thibar", "Oued Zarga"],
  Nefza: ["Nefza Ville", "Ouled Mahrouk", "Zouaraa", "Barrage Sidi Salem"],
  Testour: ["Testour Ville", "Vieille Ville", "Cité Ennasr", "Pont de Testour"],
  Goubellat: ["Goubellat Ville", "Cité Agricole", "El Ksar", "Sidi Nasseur"],
  Amdoun: ["Amdoun Ville", "Zahret Mediene", "Cité Agricole", "El Ksour"],

  // ——— JENDOUBA ———
  "Jendouba Ville": ["Jendouba Centre", "Jendouba Nord", "Jendouba Sud", "Cité Ennasr", "Cité Jardins", "Avenue Habib Bourguiba"],
  Tabarka: ["Tabarka Centre", "Tabarka Nord", "Tabarka Plage", "Port de Tabarka", "Corniche", "Cité des Pêcheurs", "Station Balnéaire", "Ain Draham"],
  "Aïn Draham": ["Aïn Draham Centre", "Station de Ski", "Forêt d'Aïn Draham", "Hammam Bourguiba", "Les Chênes"],
  Fernana: ["Fernana Ville", "Oued Meliz", "Cité Agricole", "El Khetmine"],
  Ghardimaou: ["Ghardimaou Nord", "Ghardimaou Sud", "Cité Ennasr", "Oued Sarath", "Frontière"],
  "Bou Salem": ["Bou Salem Ville", "Cité Agricole", "Ouled Mahrouk", "Zarroug"],
  Balta: ["Balta Ville", "Beni M'hamed", "Souaniya", "Bou Bernous"],

  // ——— LE KEF ———
  "Le Kef Ville": ["Le Kef Centre", "Le Kef Est", "Le Kef Ouest", "Médina", "Cité Ennasr", "Cité Essalem", "Harat Ettouila", "Souk El Khemis", "Avenue Bourguiba", "Kasbah"],
  Tajerouine: ["Tajerouine Centre", "Cité Ennasr", "Sidi M'hadheb", "El Garia", "Oued Slata"],
  Dahmani: ["Dahmani Ville", "Cité Agricole", "Es Sraya", "Bou Khalifa"],
  "Sakiet Sidi Youssef": ["Sakiet Sidi Youssef Ville", "Frontière Algérie", "Zone Agricole"],
  "Kalaât Sinane": ["Kalaât Sinane Ville", "Nebeur", "Ouerga", "Taghliyya"],
  Touiref: ["Touiref Ville", "Jerissa", "Cité Minière", "Sidi Ahmed"],

  // ——— SILIANA ———
  "Siliana Ville": ["Siliana Centre", "Siliana Nord", "Siliana Sud", "Cité Ennasr", "Cité des Oliviers", "Avenue Habib Bourguiba"],
  Gaâfour: ["Gaâfour Ville", "Cité Ennasr", "Sidi Fernane", "El Aroussa"],
  Makthar: ["Makthar Ville", "Site Archéologique", "Cité Agricole", "Ouled Yaakoub"],
  Rouhia: ["Rouhia Ville", "Kesra", "Sidi Houmad", "Sidi Saadoune"],
  "Le Krib": ["Le Krib Ville", "Cité Agricole", "Bargou", "El Bibane"],
  Bouarada: ["Bouarada Ville", "Cité Agricole", "Zlitni"],

  // ——— SOUSSE ———
  "Sousse Ville": ["Sousse Centre", "Corniche", "Ksibet Thrayet", "Sousse Medina", "Boujaafar", "Sahloul", "Ezzouhour", "Kalaa Seghira", "Route de Monastir", "Sousse Riadh", "Sousse El Kantaoui", "Avenue Bourguiba", "Place Farhat Hached"],
  "Hammam Sousse": ["Hammam Sousse Centre", "Port El Kantaoui", "la Cite Olympique", "Akouda", "Route de Sousse", "Zone Touristique"],
  "M'saken": ["M'saken Ville", "M'saken El Jadida", "Cite Ennasr", "Cite El Bassatine", "Zaouiet Sousse", "El Mahdha"],
  "Kalaa Kebira": ["Kalaa Kebira Nord", "Kalaa Kebira Sud", "Cite Ennasr", "Cite Jardin", "El Frada"],
  Enfidha: ["Enfidha Ville", "Enfidha Plage", "Aeroport Enfidha", "Bouficha", "Hergla"],
  "Sidi Bou Ali": ["Sidi Bou Ali Ville", "Kondar", "Cite Agricole", "Oued Chafrou"],
  "Port El Kantaoui": ["Port El Kantaoui Centre", "Marina", "Zone Touristique", "Plage", "Golf Course"],

  // ——— MONASTIR ———
  "Monastir Ville": ["Monastir Centre", "Corniche de Monastir", "Skanes", "Menzel Ennour", "Route El Fida", "Monastir Plage", "Zone Touristique", "Aéroport Habib Bourguiba"],
  Moknine: ["Moknine Ville", "Moknine El Jadida", "Cité Ennasr", "Cité Essanaâ", "Bembla"],
  Jemmal: ["Jemmal Ville", "Ouerdanine", "Cité Ennasr", "Zéramdine", "Khnis"],
  "Ksibet El Mediouni": ["Ksibet Centre", "Sayada", "Lamta", "Cité des Pêcheurs"],
  Téboulba: ["Téboulba Ville", "Téboulba Port", "Cité Ennasr", "Bekalta", "El Haouani"],
  "Ksar Hellal": ["Ksar Hellal Nord", "Ksar Hellal Sud", "Cité Ennasr", "Zone Industrielle"],

  // ——— MAHDIA ———
  "Mahdia Ville": ["Mahdia Centre", "Mahdia Corniche", "Mahdia Médina", "Cap d'Afrique", "Mahdia Plage", "Rejiche", "Zorda", "Port de Pêche"],
  "El Jem": ["El Jem Ville", "Colisée d'El Jem", "Cité Ennasr", "Cité Jardin"],
  "Ksour Essef": ["Ksour Essef Nord", "Ksour Essef Sud", "Cité Agricole", "El Bradaa"],
  Chebba: ["Chebba Ville", "Chebba Plage", "Port de Chebba", "Cité des Pêcheurs"],
  Chorbane: ["Chorbane Ville", "Ouled Chamekh", "Hbira", "Bou Merdes"],
  Melloulèche: ["Melloulèche Ville", "Sidi Alouane", "El Ghedhabna", "Plage"],

  // ——— SFAX ———
  "Sfax Ville": ["Sfax Centre", "Sfax Médina", "Sfax Ouest", "Sfax Sud", "Sfax El Jadida", "Route El Ain", "Campement", "Sfax El Bahira", "Sfax Ville Jardins", "Bab Djebli", "Bab Borj", "Avenue Bourguiba", "Place Hédi Chaker", "Sfax Port"],
  "Sakiet Ezzit": ["Sakiet Ezzit Centre", "Chihia", "Cité Ennasr", "Cité El Bassatine", "Route de Tunis"],
  "Sakiet Eddaïer": ["Sakiet Eddaïer Centre", "Cité Ennasr", "Cité Essalem", "El Amra", "Route Sfax Gabès"],
  Gremda: ["Gremda Ville", "Cité des Oliviers", "Cité Jardin", "Route de Gremda"],
  Thyna: ["Thyna Ville", "Thyna Plage", "Zone Industrielle Thyna", "Nouvelle Thyna"],
  Agareb: ["Agareb Ville", "Mahras", "Sidi Abdelmoula", "El Hencha"],
  Jebeniana: ["Jebeniana Ville", "Bir Ali Ben Khalifa", "Cité Agricole", "Menzel Chaker"],
  Kerkennah: ["Remla Kerkennah", "El Ataya", "Ouled Kacem", "Sidi Frej", "Kraten", "Port Kerkennah"],

  // ——— KAIROUAN ———
  "Kairouan Ville": ["Kairouan Médina", "Kairouan Nord", "Kairouan Sud", "Kairouan El Mohsenia", "Cité Ennasr", "Cité Essalem", "Avenue Bourguiba", "Bab El Khoukha", "Bab Echouhada", "Sidi Okba"],
  Haffouz: ["Haffouz Ville", "Ain Jelloula", "Cité Agricole", "Sidi Saad"],
  Oueslatia: ["Oueslatia Ville", "Cité Agricole", "El Alâa", "Sidi Amor"],
  "Bou Hajla": ["Bou Hajla Ville", "Cité Ennasr", "Nasrallah", "Echrarda"],
  Sbikha: ["Sbikha Ville", "Chébika", "Cité Agricole", "Oued Sbikha"],

  // ——— KASSERINE ———
  "Kasserine Ville": ["Kasserine Centre", "Kasserine Nord", "Kasserine Sud", "Kasserine Ouest", "Cité Ennasr", "Cité Ezzouhour", "Avenue Bourguiba", "Montagne de Kasserine"],
  Sbeitla: ["Sbeitla Ville", "Sbeitla El Jadida", "Site Archéologique", "Cité Agricole"],
  Fériana: ["Fériana Ville", "Cité Ennasr", "Cité Agricole", "Oued Fériana"],
  Thala: ["Thala Ville", "Cité Ennasr", "Cité Jardin", "Montagne de Thala"],
  Sbiba: ["Sbiba Ville", "Cité Agricole", "Jediliane", "Hidra"],

  // ——— SIDI BOUZID ———
  "Sidi Bouzid Ville": ["Sidi Bouzid Centre", "Sidi Bouzid Est", "Sidi Bouzid Ouest", "Sidi Bouzid Nord", "Cité Ennasr", "Cité Essalem", "Avenue Bourguiba"],
  Meknassy: ["Meknassy Ville", "Regueb", "Cité Agricole", "El Mansoura"],
  "Menzel Bouzaiane": ["Menzel Bouzaiane Ville", "Bir El Hafey", "Cité Agricole"],
  Jilma: ["Jilma Ville", "Cebbala Ouled Asker", "Souk Jedid", "Ouled Haffouz"],

  // ——— GABÈS ———
  "Gabès Ville": ["Gabès Centre", "Gabès Ouest", "Gabès Sud", "Gabès Médina", "Chenini", "Tajerouine", "Gabès El Bouthana", "Gabès Sidi Boulbaba", "Avenue Bourguiba", "Cité Ennasr", "Port de Gabès"],
  "El Hamma": ["El Hamma Ville", "Métouia", "Oudhref", "Zarat", "Cité Agricole", "Oued El Hamma"],
  Matmata: ["Matmata Ville", "Matmata Nouvelle", "Toujane", "Téchine", "Tamezret", "Maisons Troglodytes"],
  "Menzel El Habib": ["Menzel El Habib Ville", "Cité Agricole", "Zarat", "El Bibane"],

  // ——— MÉDENINE ———
  "Médenine Ville": ["Médenine Centre", "Médenine Nord", "Médenine Sud", "Médenine El Jadida", "Cité Ennasr", "Avenue Bourguiba", "L'Aéroport"],
  "Djerba (Houmt Souk)": ["Houmt Souk Centre", "Erriadh", "Mellita", "Cédria", "Plage de Houmt Souk", "Port", "Bordj El Ksar"],
  "Djerba (Midoun)": ["Midoun Centre", "Taqermes", "Monastir Djerba", "El Kastil", "Zone Touristique Midoun", "Plage de Midoun"],
  "Djerba (Ajim)": ["Ajim Centre", "Boughrara", "Plage d'Ajim", "Port d'Ajim"],
  "Ben Guerdane": ["Ben Guerdane Ville", "Cité Ennasr", "Cité des Oliviers", "Frontière Libye"],
  Zarzis: ["Zarzis Ville", "Zarzis Plage", "Port de Zarzis", "Zone Touristique Zarzis", "Boughrara", "Sidi Makhlouf"],

  // ——— TATAOUINE ———
  "Tataouine Ville": ["Tataouine Centre", "Tataouine Nord", "Tataouine Sud", "Cité Ennasr", "Cité Essalem", "Avenue Bourguiba"],
  Ghomrassen: ["Ghomrassen Ville", "Ksar Ouled Soltane", "Ksar Hadada", "Douiret", "Guermessa"],
  Remada: ["Remada Ville", "Bir Lahmar", "Smâr", "Thiguir"],
  "Ksar Ghilane": ["Ksar Ghilane Oasis", "Campement", "Zone Désertique"],
  "Chenini Tataouine": ["Chenini Village", "Ksar Chenini", "Zone Montagneuse"],

  // ——— GAFSA ———
  "Gafsa Ville": ["Gafsa Centre", "Gafsa Nord", "Gafsa Sud", "Gafsa El Kasbah", "Cité Ennasr", "Cité Jardin", "Avenue Bourguiba", "Gafsa Zone Industrielle", "Gare de Gafsa"],
  Moulares: ["Moulares Ville", "Redeyef", "Cité Minière", "El Ayaicha"],
  Métlaoui: ["Métlaoui Ville", "Lela", "Oum El Araies", "Zannouch", "Sidi Aich"],
  Sened: ["Sened Ville", "Belkhir", "El Guettar", "Cité Agricole"],
  "El Ksar": ["El Ksar Ville", "Sidi Boubaker", "Mdhila", "Cité Agricole"],

  // ——— TOZEUR ———
  "Tozeur Ville": ["Tozeur Centre", "Tozeur Nord", "Tozeur Sud", "Vieille Ville", "Parc Belvédère", "Chneguil", "El Kriz", "Avenue Bourguiba", "Oasis de Tozeur", "Zone Touristique"],
  Nefta: ["Nefta Ville", "Vieille Nefta", "El Hamma Du Jerid", "Oasis de Nefta", "Sidi Bou Ali", "Ksar Nefta"],
  Degache: ["Degache Ville", "El Mansourah", "Ouled Naceur", "Zone Agricole"],
  "Hamet Jerid": ["Hamet Jerid Ville", "Station Thermale", "Oasis", "Zone Agricole"],
  Hazoua: ["Hazoua Ville", "Zaouiet Rabah", "Souk El Khadra", "Khatatnia", "Ben Nasser"],

  // ——— KÉBILI ———
  "Kébili Ville": ["Kébili Centre", "Kébili Nord", "Kébili Sud", "Cité Ennasr", "Avenue Bourguiba", "Place de la Révolution"],
  Douz: ["Douz Ville", "Douz Oued El Ghalla", "Douz Mbarek", "Sabha", "Porte du Sahara", "Festival de Douz"],
  "El Faouar": ["El Faouar Ville", "Bechri", "Jemna", "Zone Oasienne", "Bazma"],
  "Souk El Ahed": ["Souk El Ahed Ville", "Telmine", "Nouvel", "Rjim Maatoug"],
};

/** Villes d'un gouvernorat (sûr). */
export function villesOf(gouvernorat: string | undefined): string[] {
  if (!gouvernorat) return [];
  return VILLES_BY_GOUVERNORAT[gouvernorat] ?? [];
}

/** Quartiers d'une ville (sûr). */
export function quartiersOf(ville: string | undefined): string[] {
  if (!ville) return [];
  return QUARTIERS_BY_VILLE[ville] ?? [];
}
