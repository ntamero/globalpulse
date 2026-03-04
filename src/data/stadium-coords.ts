/**
 * Team abbreviation → [lat, lng] mapping for major sports leagues.
 * Used to place live match markers on the world map.
 * Key = ESPN team abbreviation (uppercase).
 * Coordinates point to the team's home stadium/arena.
 */

// Premier League
const PL: Record<string, [number, number]> = {
  ARS: [51.5549, -0.1084],   // Arsenal - Emirates Stadium
  AVL: [52.5092, -1.8847],   // Aston Villa - Villa Park
  BOU: [50.7352, -1.8384],   // Bournemouth - Vitality Stadium
  BRE: [51.4882, -0.2887],   // Brentford - Gtech Community
  BHA: [50.8616, -0.0837],   // Brighton - Amex Stadium
  BUR: [53.7890, -2.2302],   // Burnley - Turf Moor
  CHE: [51.4817, -0.1910],   // Chelsea - Stamford Bridge
  CRY: [51.3983, -0.0855],   // Crystal Palace - Selhurst Park
  EVE: [53.4388, -2.9663],   // Everton - Goodison Park
  FUL: [51.4749, -0.2217],   // Fulham - Craven Cottage
  IPS: [52.0545, 1.1448],    // Ipswich Town - Portman Road
  LEI: [52.6204, -1.1422],   // Leicester - King Power
  LIV: [53.4308, -2.9609],   // Liverpool - Anfield
  MCI: [53.4831, -2.2004],   // Man City - Etihad
  MUN: [53.4631, -2.2913],   // Man United - Old Trafford
  NEW: [54.9756, -1.6217],   // Newcastle - St James Park
  NFO: [52.9399, -1.1325],   // Nottm Forest - City Ground
  SOU: [50.9058, -1.3910],   // Southampton - St Mary's
  TOT: [51.6043, -0.0665],   // Tottenham - Tottenham Stadium
  WHU: [51.5387, 0.0166],    // West Ham - London Stadium
  WOL: [52.5901, -2.1306],   // Wolves - Molineux
  LUT: [51.8842, -0.4316],   // Luton Town - Kenilworth Road
  SHU: [53.3703, -1.4709],   // Sheffield Utd - Bramall Lane
};

// La Liga
const LIGA: Record<string, [number, number]> = {
  BAR: [41.3809, 2.1228],    // Barcelona - Camp Nou
  RMA: [40.4531, -3.6883],   // Real Madrid - Bernabéu
  ATM: [40.4362, -3.5995],   // Atlético Madrid - Metropolitano
  SEV: [37.3840, -5.9706],   // Sevilla - Sánchez Pizjuán
  RSO: [43.3014, -1.9736],   // Real Sociedad - Anoeta
  BET: [37.3564, -5.9815],   // Real Betis - Benito Villamarín
  VIL: [39.9441, -0.1035],   // Villarreal - Estadio de la Cerámica
  ATH: [43.2641, -2.9494],   // Athletic Bilbao - San Mamés
  VAL: [39.4745, -0.3583],   // Valencia - Mestalla
  CEL: [42.2117, -8.7394],   // Celta Vigo - Balaídos
  GIR: [41.9607, 2.8286],    // Girona - Montilivi
  OSA: [42.7966, -1.6369],   // Osasuna - El Sadar
  ALA: [42.8371, -2.6880],   // Alavés - Mendizorroza
  GET: [40.3256, -3.7148],   // Getafe - Coliseum
  MLL: [39.5901, 2.6300],    // Mallorca - Son Moix
  LPA: [28.1001, -15.4567],  // Las Palmas - Gran Canaria
  RAY: [40.3919, -3.6589],   // Rayo Vallecano - Vallecas
  CAD: [36.5013, -6.2723],   // Cádiz - Nuevo Mirandilla
  GRA: [37.1528, -3.5957],   // Granada - Los Cármenes
  LEG: [40.3574, -3.7612],   // Leganés - Butarque
  ESP: [41.3476, 2.0756],    // Espanyol - RCDE Stadium
};

// Bundesliga
const BUN: Record<string, [number, number]> = {
  BAY: [48.2188, 11.6247],   // Bayern Munich - Allianz Arena
  BVB: [51.4927, 7.4518],    // Dortmund - Signal Iduna Park
  LEV: [51.0383, 7.0024],    // Bayer Leverkusen - BayArena
  RBL: [51.3459, 12.3485],   // RB Leipzig - Red Bull Arena
  SGE: [50.0685, 8.6456],    // Eintracht Frankfurt - Waldstadion
  WOB: [52.4327, 10.8035],   // Wolfsburg - Volkswagen Arena
  SCF: [47.9892, 7.8931],    // SC Freiburg - Europa-Park
  BMG: [51.1747, 6.3855],    // Mönchengladbach - Borussia-Park
  TSG: [49.2386, 8.8879],    // Hoffenheim - Sinsheim
  UBE: [52.5148, 13.2394],   // Union Berlin - Alte Försterei
  STU: [48.7922, 9.2320],    // Stuttgart - MHP Arena
  WER: [53.0664, 8.8375],    // Werder Bremen - Weserstadion
  AUG: [48.3236, 10.8861],   // FC Augsburg - WWK Arena
  BOC: [51.4900, 7.2367],    // VfL Bochum - Vonovia Ruhrstadion
  HEI: [49.4191, 8.6684],    // Heidenheim - Voith-Arena
  KOE: [50.9334, 6.8748],    // FC Köln - RheinEnergieStadion
  DAR: [49.8616, 8.6788],    // Darmstadt - Merck-Stadion
  M05: [49.9842, 8.2246],    // Mainz 05 - Mewa Arena
};

// Serie A
const SERA: Record<string, [number, number]> = {
  JUV: [45.1096, 7.6413],    // Juventus - Allianz Stadium
  MIL: [45.4781, 9.1240],    // AC Milan - San Siro
  INT: [45.4781, 9.1240],    // Inter Milan - San Siro
  NAP: [40.8280, 14.1931],   // Napoli - Diego Maradona
  ROM: [41.9341, 12.4547],   // AS Roma - Stadio Olimpico
  LAZ: [41.9341, 12.4547],   // Lazio - Stadio Olimpico
  ATA: [45.7092, 9.6812],    // Atalanta - Gewiss Stadium
  FIO: [43.7808, 11.2822],   // Fiorentina - Artemio Franchi
  BOL: [44.4924, 11.3099],   // Bologna - Renato Dall'Ara
  TOR: [45.0418, 7.6499],    // Torino - Stadio Grande Torino
  MON: [45.5795, 9.3046],    // Monza - U-Power Stadium
  UDI: [46.0793, 13.1999],   // Udinese - Bluenergy Stadium
  SAS: [44.7148, 10.6483],   // Sassuolo - Mapei Stadium
  EMP: [43.7264, 10.9505],   // Empoli - Castellani
  GEN: [44.4163, 8.9525],    // Genoa - Luigi Ferraris
  SAM: [44.4163, 8.9525],    // Sampdoria - Luigi Ferraris
  LEC: [40.3548, 18.1810],   // Lecce - Via del Mare
  CAG: [39.2003, 9.1379],    // Cagliari - Unipol Domus
  VER: [45.4352, 10.9685],   // Verona - Bentegodi
  SAL: [40.6798, 14.7803],   // Salernitana - Arechi
  VEN: [45.4560, 12.3519],   // Venezia - Pier Luigi Penzo
  PAR: [44.7946, 10.3380],   // Parma - Ennio Tardini
  COM: [45.8080, 9.0722],    // Como - Sinigaglia
};

// Ligue 1
const LIG1: Record<string, [number, number]> = {
  PSG: [48.8414, 2.2530],    // Paris Saint-Germain - Parc des Princes
  OL: [45.7654, 4.9820],     // Olympique Lyonnais - Groupama
  OM: [43.2699, 5.3958],     // Olympique Marseille - Vélodrome
  MON: [43.7277, 7.4156],    // AS Monaco - Louis II
  LIL: [50.6120, 3.1304],    // LOSC Lille - Pierre Mauroy
  REN: [48.1074, -1.7127],   // Rennes - Roazhon Park
  NIC: [43.7050, 7.1926],    // OGC Nice - Allianz Riviera
  LEN: [50.4321, 2.8152],    // RC Lens - Bollaert-Delelis
  STR: [48.5601, 7.7550],    // Strasbourg - Meinau
  NAN: [47.2560, -1.5248],   // FC Nantes - Beaujoire
  BRE: [48.4027, -4.4617],   // Stade Brestois - Francis-Le Blé
  REI: [49.2465, 3.9320],    // Stade de Reims - Auguste Delaune
  TOU: [43.5833, 1.4340],    // Toulouse - Stadium
  MON2: [43.6211, 3.8120],   // Montpellier - La Mosson
  ANG: [47.4611, -0.5309],   // Angers - Raymond Kopa
  LEH: [49.4384, 0.1023],    // Le Havre - Océane
  CLF: [45.8157, 3.1249],    // Clermont Foot - Gabriel Montpied
  MET: [49.1098, 6.1610],    // FC Metz - Saint-Symphorien
  AJA: [41.9188, 8.7905],    // AC Ajaccio - François Coty
  STE: [45.4608, 4.3903],    // Saint-Étienne - Geoffroy-Guichard
  AUX: [47.7869, 3.5882],    // AJ Auxerre - Abbé-Deschamps
};

// Süper Lig (Turkey)
const TUR: Record<string, [number, number]> = {
  GS: [41.0764, 28.9878],    // Galatasaray - NEF Stadium
  FB: [40.9871, 29.0366],    // Fenerbahçe - Şükrü Saracoğlu
  BJK: [41.0425, 29.0070],   // Beşiktaş - Tüpraş Stadium
  TS: [40.9945, 39.7815],    // Trabzonspor - Papara Park
  BAS: [41.0692, 28.8098],   // Başakşehir - Başakşehir Fatih Terim
  SIV: [39.7412, 36.9741],   // Sivasspor - Yeni 4 Eylül
  ALN: [36.8896, 35.4989],   // Adana Demirspor - Yeni Adana
  ANT: [36.8947, 30.6449],   // Antalyaspor - Antalya Stadium
  KAY: [38.7205, 35.5050],   // Kayserispor - Kadir Has
  KON: [37.8216, 32.4694],   // Konyaspor - Konya Büyükşehir
  RIZ: [41.0177, 40.5197],   // Çaykur Rizespor - Çaykur Didi
  GAZ: [37.0762, 37.3756],   // Gaziantep FK - Kalyon
  HTA: [36.2163, 36.1534],   // Hatayspor - Yeni Hatay
  SAM2: [41.2858, 36.3389],  // Samsunspor - Yeni 19 Mayıs
  ANK: [39.8917, 32.8102],   // Ankaragücü - Eryaman
  KAS: [38.7313, 43.9944],   // Kasımpaşa - Recep Tayyip Erdoğan
  PEN: [40.6888, 29.9778],   // Pendikspor - Pendik
  IST: [41.1036, 29.0069],   // İstanbulspor - Nef Stadium
  BOD: [37.0338, 27.4394],   // Bodrum FK
  EYP: [41.0481, 28.9308],   // Eyüpspor - Alibeyköy
};

// NBA
const NBA: Record<string, [number, number]> = {
  ATL: [33.7573, -84.3963],  // Atlanta Hawks - State Farm Arena
  BOS: [42.3662, -71.0621],  // Boston Celtics - TD Garden
  BKN: [40.6826, -73.9754],  // Brooklyn Nets - Barclays Center
  CHA: [35.2251, -80.8392],  // Charlotte Hornets - Spectrum Center
  CHI: [41.8807, -87.6742],  // Chicago Bulls - United Center
  CLE: [41.4965, -81.6882],  // Cleveland Cavaliers - Rocket Mortgage
  DAL: [32.7905, -96.8103],  // Dallas Mavericks - AAC
  DEN: [39.7487, -105.0077], // Denver Nuggets - Ball Arena
  DET: [42.3410, -83.0554],  // Detroit Pistons - Little Caesars
  GS: [37.7680, -122.3877],  // Golden State Warriors - Chase Center
  HOU: [29.7508, -95.3621],  // Houston Rockets - Toyota Center
  IND: [39.7640, -86.1555],  // Indiana Pacers - Gainbridge
  LAC: [33.9436, -118.3401], // LA Clippers - Intuit Dome
  LAL: [34.0430, -118.2673], // LA Lakers - Crypto.com Arena
  MEM: [35.1382, -90.0506],  // Memphis Grizzlies - FedExForum
  MIA: [25.7814, -80.1870],  // Miami Heat - Kaseya Center
  MIL: [43.0451, -87.9173],  // Milwaukee Bucks - Fiserv Forum
  MIN: [44.9795, -93.2761],  // Minnesota Timberwolves - Target Center
  NO: [29.9490, -90.0821],   // New Orleans Pelicans - Smoothie King
  NY: [40.7505, -73.9934],   // New York Knicks - MSG
  OKC: [35.4634, -97.5151],  // Oklahoma City Thunder - Paycom Center
  ORL: [28.5392, -81.3839],  // Orlando Magic - Amway Center
  PHI: [39.9012, -75.1720],  // Philadelphia 76ers - Wells Fargo
  PHX: [33.4457, -112.0712], // Phoenix Suns - Footprint Center
  POR: [45.5316, -122.6668], // Portland Trail Blazers - Moda Center
  SAC: [38.5802, -121.4997], // Sacramento Kings - Golden 1 Center
  SA: [29.4270, -98.4375],   // San Antonio Spurs - Frost Bank Center
  TOR: [43.6435, -79.3791],  // Toronto Raptors - Scotiabank Arena
  UTA: [40.7683, -111.9011], // Utah Jazz - Delta Center
  WAS: [38.8981, -77.0209],  // Washington Wizards - Capital One Arena
};

// MLS
const MLS: Record<string, [number, number]> = {
  ATL: [33.7553, -84.4006],  // Atlanta United - Mercedes-Benz
  LAFC: [34.0128, -118.2841],// LAFC - BMO Stadium
  LAG: [33.8644, -118.2611], // LA Galaxy - Dignity Health
  NYC: [40.8296, -73.9262],  // NYCFC - Yankee Stadium
  SEA: [47.5952, -122.3316], // Seattle Sounders - Lumen Field
  POR: [45.5221, -122.6870], // Portland Timbers - Providence Park
  NYRB: [40.7369, -74.1503], // NY Red Bulls - Red Bull Arena
  CIN: [39.1108, -84.5219],  // FC Cincinnati - TQL Stadium
  MIA: [25.9580, -80.2389],  // Inter Miami - Chase Stadium
  NSH: [36.1306, -86.7656],  // Nashville SC - Geodis Park
  CLT: [35.2258, -80.8528],  // Charlotte FC - Bank of America
};

// F1 Circuits
const F1: Record<string, [number, number]> = {
  BAH: [26.0325, 50.5106],   // Bahrain Grand Prix
  SAU: [21.6319, 39.1044],   // Saudi Arabian Grand Prix - Jeddah
  AUS: [-37.8497, 144.9680], // Australian Grand Prix - Melbourne
  JPN: [34.8431, 136.5407],  // Japanese Grand Prix - Suzuka
  CHN: [31.3389, 121.2198],  // Chinese Grand Prix - Shanghai
  MIA: [25.9581, -80.2389],  // Miami Grand Prix
  EMI: [44.3439, 11.7167],   // Emilia Romagna GP - Imola
  MON: [43.7347, 7.4206],    // Monaco Grand Prix
  SPA: [50.4372, 5.9714],    // Spanish Grand Prix - Barcelona
  CAN: [45.5017, -73.5227],  // Canadian Grand Prix - Montreal
  AUT: [47.2197, 14.7647],   // Austrian Grand Prix - Red Bull Ring
  GBR: [52.0786, -1.0169],   // British Grand Prix - Silverstone
  HUN: [47.5789, 19.2486],   // Hungarian Grand Prix - Hungaroring
  BEL: [50.4372, 5.9714],    // Belgian Grand Prix - Spa
  NED: [52.3884, 4.5406],    // Dutch Grand Prix - Zandvoort
  ITA: [45.6204, 9.2813],    // Italian Grand Prix - Monza
  AZE: [40.3725, 49.8533],   // Azerbaijan Grand Prix - Baku
  SIN: [1.2914, 103.8640],   // Singapore Grand Prix
  USA: [30.1328, -97.6411],  // US Grand Prix - COTA
  MEX: [19.4042, -99.0907],  // Mexican Grand Prix
  BRA: [-23.7036, -46.6997], // Brazilian Grand Prix - Interlagos
  LAS: [36.1146, -115.1728], // Las Vegas Grand Prix
  QAT: [25.4900, 51.4536],   // Qatar Grand Prix - Lusail
  ABU: [24.4672, 54.6031],   // Abu Dhabi Grand Prix - Yas Marina
};

// Cricket venues
const CRICKET: Record<string, [number, number]> = {
  LORD: [51.5294, -0.1728],  // Lord's - London
  OVAL: [51.4838, -0.1147],  // The Oval - London
  MCG: [-37.8200, 144.9834], // MCG - Melbourne
  SCG: [-33.8917, 151.2247], // SCG - Sydney
  EDEN: [22.5645, 88.3433],  // Eden Gardens - Kolkata
  WANK: [19.0090, 72.8300],  // Wankhede - Mumbai
  GABA: [-27.4858, 153.0382],// The Gabba - Brisbane
  HEAD: [53.8165, -1.5822],  // Headingley - Leeds
  EDGB: [52.4559, -1.9025],  // Edgbaston - Birmingham
  TREN: [52.9370, -1.1328],  // Trent Bridge - Nottingham
  CAPE: [-33.9273, 18.4099], // Newlands - Cape Town
  CHIN: [31.5133, 74.3430],  // Gaddafi Stadium - Lahore
  BELL: [51.0735, -0.0145],  // Bellrive Oval - Hobart
};

// League center fallbacks (when team not found)
const LEAGUE_FALLBACKS: Record<string, [number, number]> = {
  'eng.1': [52.5, -1.5],     // England center
  'esp.1': [40.0, -3.7],     // Spain center
  'ger.1': [51.0, 10.0],     // Germany center
  'ita.1': [42.5, 12.5],     // Italy center
  'fra.1': [46.5, 2.5],      // France center
  'tur.1': [39.0, 35.0],     // Turkey center
  'uefa.champions': [48.8, 2.3], // Paris (UEFA HQ area)
  'uefa.europa': [46.2, 6.1],    // Nyon (UEFA HQ)
  'usa.1': [39.8, -98.5],    // USA center
  nba: [39.8, -98.5],        // USA center
  wnba: [39.8, -98.5],       // USA center
  atp: [46.5, 6.6],          // Global tennis
  wta: [46.5, 6.6],          // Global tennis
  f1: [46.5, 6.6],           // Global F1
  icc: [23.0, 80.0],         // Global cricket (India center)
  nfl: [39.8, -98.5],        // USA center
  mlb: [39.8, -98.5],        // USA center
  nhl: [45.5, -73.5],        // North America center
};

// Merge all team databases
const ALL_TEAMS: Record<string, [number, number]> = {
  ...PL, ...LIGA, ...BUN, ...SERA, ...LIG1, ...TUR, ...NBA, ...MLS,
};

/**
 * Resolve coordinates for a match based on home team abbreviation.
 * Falls back to league center if team is unknown.
 */
export function resolveMatchCoords(
  homeAbbr: string,
  awayAbbr: string,
  league: string,
  _venue?: string,
): [number, number] {
  // Try home team first
  const homeCoords = ALL_TEAMS[homeAbbr];
  if (homeCoords) return homeCoords;

  // Try away team (neutral venue scenario)
  const awayCoords = ALL_TEAMS[awayAbbr];
  if (awayCoords) return awayCoords;

  // Fallback to league center
  return LEAGUE_FALLBACKS[league] ?? [30, 0];
}

/**
 * Get F1 circuit coordinates by circuit/GP name keyword
 */
export function resolveF1Coords(venueName: string): [number, number] {
  const lower = venueName.toLowerCase();
  const fb: [number, number] = LEAGUE_FALLBACKS.f1 || [46.5, 6.6];
  for (const [key, coords] of Object.entries(F1)) {
    if (lower.includes(key.toLowerCase())) return coords;
  }
  // Match by common circuit names
  if (lower.includes('bahrain')) return F1.BAH || fb;
  if (lower.includes('jeddah') || lower.includes('saudi')) return F1.SAU || fb;
  if (lower.includes('melbourne') || lower.includes('albert')) return F1.AUS || fb;
  if (lower.includes('suzuka')) return F1.JPN || fb;
  if (lower.includes('shanghai')) return F1.CHN || fb;
  if (lower.includes('miami')) return F1.MIA || fb;
  if (lower.includes('imola')) return F1.EMI || fb;
  if (lower.includes('monaco')) return F1.MON || fb;
  if (lower.includes('barcelona') || lower.includes('catalun')) return F1.SPA || fb;
  if (lower.includes('montreal') || lower.includes('gilles')) return F1.CAN || fb;
  if (lower.includes('spielberg') || lower.includes('red bull ring')) return F1.AUT || fb;
  if (lower.includes('silverstone')) return F1.GBR || fb;
  if (lower.includes('hungaroring') || lower.includes('budapest')) return F1.HUN || fb;
  if (lower.includes('spa') || lower.includes('francorchamps')) return F1.BEL || fb;
  if (lower.includes('zandvoort')) return F1.NED || fb;
  if (lower.includes('monza')) return F1.ITA || fb;
  if (lower.includes('baku')) return F1.AZE || fb;
  if (lower.includes('singapore') || lower.includes('marina bay')) return F1.SIN || fb;
  if (lower.includes('austin') || lower.includes('cota')) return F1.USA || fb;
  if (lower.includes('hermanos') || lower.includes('mexico')) return F1.MEX || fb;
  if (lower.includes('interlagos') || lower.includes('são paulo')) return F1.BRA || fb;
  if (lower.includes('las vegas')) return F1.LAS || fb;
  if (lower.includes('lusail') || lower.includes('qatar')) return F1.QAT || fb;
  if (lower.includes('yas marina') || lower.includes('abu dhabi')) return F1.ABU || fb;
  return fb;
}

/**
 * Get cricket venue coordinates
 */
export function resolveCricketCoords(venueName: string): [number, number] {
  const lower = venueName.toLowerCase();
  const fb: [number, number] = LEAGUE_FALLBACKS.icc || [23, 80];
  if (lower.includes("lord's") || lower.includes('lords')) return CRICKET.LORD || fb;
  if (lower.includes('oval')) return CRICKET.OVAL || fb;
  if (lower.includes('mcg') || lower.includes('melbourne')) return CRICKET.MCG || fb;
  if (lower.includes('scg') || lower.includes('sydney')) return CRICKET.SCG || fb;
  if (lower.includes('eden') || lower.includes('kolkata')) return CRICKET.EDEN || fb;
  if (lower.includes('wankhede') || lower.includes('mumbai')) return CRICKET.WANK || fb;
  if (lower.includes('gabba') || lower.includes('brisbane')) return CRICKET.GABA || fb;
  if (lower.includes('headingley') || lower.includes('leeds')) return CRICKET.HEAD || fb;
  if (lower.includes('edgbaston') || lower.includes('birmingham')) return CRICKET.EDGB || fb;
  if (lower.includes('trent bridge') || lower.includes('nottingham')) return CRICKET.TREN || fb;
  if (lower.includes('newlands') || lower.includes('cape town')) return CRICKET.CAPE || fb;
  if (lower.includes('gaddafi') || lower.includes('lahore')) return CRICKET.CHIN || fb;
  return fb;
}

export { LEAGUE_FALLBACKS };
