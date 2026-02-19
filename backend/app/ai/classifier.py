import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Category classification keywords with weights
# ---------------------------------------------------------------------------

CATEGORY_RULES: dict[str, dict] = {
    "protests": {
        "keywords": [
            "protest", "demonstration", "rally", "uprising", "march",
            "riot", "unrest", "dissent", "crackdown", "tear gas",
            "water cannon", "civil disobedience", "strike action",
            "general strike", "barricade", "sit-in", "occupation",
        ],
        "base_severity": 4,
    },
    "sanctions": {
        "keywords": [
            "sanction", "embargo", "blacklist", "freeze assets", "trade ban",
            "export control", "OFAC", "restricted entities", "economic penalty",
            "financial restriction", "import ban", "travel ban",
        ],
        "base_severity": 5,
    },
    "diplomacy": {
        "keywords": [
            "summit", "treaty", "ambassador", "diplomatic", "negotiation",
            "bilateral", "multilateral", "peace talks", "envoy", "accord",
            "foreign minister", "secretary of state", "G7", "G20", "UN",
            "Security Council", "resolution", "memorandum", "consulate",
        ],
        "base_severity": 3,
    },
    "conflict": {
        "keywords": [
            "war", "attack", "bombing", "missile", "airstrike", "shelling",
            "invasion", "offensive", "troops", "military operation",
            "drone strike", "casualties", "killed", "wounded",
            "armed forces", "artillery", "naval", "fighter jet",
            "guerrilla", "insurgent", "militia", "frontline", "siege",
            "hostage", "combat", "explosion", "IED", "ambush",
        ],
        "base_severity": 7,
    },
    "internet": {
        "keywords": [
            "internet shutdown", "internet blackout", "social media ban",
            "censorship", "VPN block", "firewall", "content removal",
            "platform ban", "digital surveillance", "data breach",
            "cyber attack", "hack", "online censorship", "disinformation",
        ],
        "base_severity": 4,
    },
    "economy": {
        "keywords": [
            "GDP", "inflation", "recession", "stock market", "trade war",
            "tariff", "interest rate", "central bank", "unemployment",
            "fiscal policy", "monetary", "budget deficit", "debt crisis",
            "currency collapse", "default", "bailout", "devaluation",
        ],
        "base_severity": 4,
    },
    "climate": {
        "keywords": [
            "climate change", "global warming", "carbon emission", "flood",
            "hurricane", "typhoon", "cyclone", "drought", "wildfire",
            "earthquake", "tsunami", "volcanic", "landslide", "heat wave",
            "ice melt", "sea level rise", "deforestation", "biodiversity",
        ],
        "base_severity": 5,
    },
    "health": {
        "keywords": [
            "pandemic", "epidemic", "outbreak", "virus", "vaccine",
            "WHO emergency", "quarantine", "infection rate", "mortality",
            "hospital", "disease", "public health", "contamination",
            "bird flu", "avian flu", "pathogen", "bioterror",
        ],
        "base_severity": 5,
    },
    "technology": {
        "keywords": [
            "artificial intelligence", "AI regulation", "quantum computing",
            "semiconductor", "chip", "space launch", "satellite",
            "cybersecurity", "data privacy", "tech regulation",
            "autonomous", "robot", "5G", "6G", "blockchain",
        ],
        "base_severity": 3,
    },
}

# ---------------------------------------------------------------------------
# Severity escalation keywords
# ---------------------------------------------------------------------------

SEVERITY_ESCALATORS: dict[str, int] = {
    "mass casualty": 3,
    "state of emergency": 3,
    "martial law": 3,
    "nuclear": 3,
    "genocide": 3,
    "ethnic cleansing": 3,
    "chemical weapons": 3,
    "biological weapons": 3,
    "coup": 3,
    "assassination": 2,
    "dead": 2,
    "killed": 2,
    "wounded": 1,
    "hundreds": 1,
    "thousands": 2,
    "millions": 2,
    "collapsed": 1,
    "catastrophic": 2,
    "unprecedented": 1,
    "emergency": 1,
    "crisis": 1,
    "critical": 1,
    "severe": 1,
    "devastating": 2,
    "destroyed": 1,
    "exploded": 2,
}

# ---------------------------------------------------------------------------
# Country -> (latitude, longitude) lookup for map plotting
# ---------------------------------------------------------------------------

COUNTRY_COORDINATES: dict[str, tuple[float, float]] = {
    "Afghanistan": (33.93, 67.71),
    "Albania": (41.15, 20.17),
    "Algeria": (28.03, 1.66),
    "Angola": (-11.20, 17.87),
    "Argentina": (-38.42, -63.62),
    "Armenia": (40.07, 45.04),
    "Australia": (-25.27, 133.78),
    "Austria": (47.52, 14.55),
    "Azerbaijan": (40.14, 47.58),
    "Bahrain": (26.07, 50.56),
    "Bangladesh": (23.68, 90.36),
    "Belarus": (53.71, 27.95),
    "Belgium": (50.50, 4.47),
    "Bolivia": (-16.29, -63.59),
    "Bosnia": (43.92, 17.68),
    "Brazil": (-14.24, -51.93),
    "Bulgaria": (42.73, 25.49),
    "Cambodia": (12.57, 104.99),
    "Cameroon": (7.37, 12.35),
    "Canada": (56.13, -106.35),
    "Chad": (15.45, 18.73),
    "Chile": (-35.68, -71.54),
    "China": (35.86, 104.20),
    "Colombia": (4.57, -74.30),
    "Congo": (-4.04, 21.76),
    "Costa Rica": (9.75, -83.75),
    "Croatia": (45.10, 15.20),
    "Cuba": (21.52, -77.78),
    "Cyprus": (35.13, 33.43),
    "Czech Republic": (49.82, 15.47),
    "Czechia": (49.82, 15.47),
    "Denmark": (56.26, 9.50),
    "Dominican Republic": (18.74, -70.16),
    "DR Congo": (-4.04, 21.76),
    "Ecuador": (-1.83, -78.18),
    "Egypt": (26.82, 30.80),
    "El Salvador": (13.79, -88.90),
    "Eritrea": (15.18, 39.78),
    "Estonia": (58.60, 25.01),
    "Ethiopia": (9.15, 40.49),
    "Finland": (61.92, 25.75),
    "France": (46.23, 2.21),
    "Gabon": (-0.80, 11.61),
    "Gaza": (31.35, 34.31),
    "Georgia": (42.32, 43.36),
    "Germany": (51.17, 10.45),
    "Ghana": (7.95, -1.02),
    "Greece": (39.07, 21.82),
    "Guatemala": (15.78, -90.23),
    "Haiti": (18.97, -72.29),
    "Honduras": (15.20, -86.24),
    "Hungary": (47.16, 19.50),
    "Iceland": (64.96, -19.02),
    "India": (20.59, 78.96),
    "Indonesia": (-0.79, 113.92),
    "Iran": (32.43, 53.69),
    "Iraq": (33.22, 43.68),
    "Ireland": (53.14, -7.69),
    "Israel": (31.05, 34.85),
    "Italy": (41.87, 12.57),
    "Ivory Coast": (7.54, -5.55),
    "Jamaica": (18.11, -77.30),
    "Japan": (36.20, 138.25),
    "Jordan": (30.59, 36.24),
    "Kazakhstan": (48.02, 66.92),
    "Kenya": (-0.02, 37.91),
    "Kosovo": (42.60, 20.90),
    "Kuwait": (29.31, 47.48),
    "Kyrgyzstan": (41.20, 74.77),
    "Laos": (19.86, 102.50),
    "Latvia": (56.88, 24.60),
    "Lebanon": (33.85, 35.86),
    "Libya": (26.34, 17.23),
    "Lithuania": (55.17, 23.88),
    "Madagascar": (-18.77, 46.87),
    "Malaysia": (4.21, 101.98),
    "Mali": (17.57, -4.00),
    "Mexico": (23.63, -102.55),
    "Moldova": (47.41, 28.37),
    "Mongolia": (46.86, 103.85),
    "Montenegro": (42.71, 19.37),
    "Morocco": (31.79, -7.09),
    "Mozambique": (-18.67, 35.53),
    "Myanmar": (21.91, 95.96),
    "Namibia": (-22.96, 18.49),
    "Nepal": (28.39, 84.12),
    "Netherlands": (52.13, 5.29),
    "New Zealand": (-40.90, 174.89),
    "Nicaragua": (12.87, -85.21),
    "Niger": (17.61, 8.08),
    "Nigeria": (9.08, 8.68),
    "North Korea": (40.34, 127.51),
    "North Macedonia": (41.51, 21.75),
    "Norway": (60.47, 8.47),
    "Oman": (21.51, 55.92),
    "Pakistan": (30.38, 69.35),
    "Palestine": (31.95, 35.23),
    "Panama": (8.54, -80.78),
    "Paraguay": (-23.44, -58.44),
    "Peru": (-9.19, -75.02),
    "Philippines": (12.88, 121.77),
    "Poland": (51.92, 19.15),
    "Portugal": (39.40, -8.22),
    "Qatar": (25.35, 51.18),
    "Romania": (45.94, 24.97),
    "Russia": (61.52, 105.32),
    "Rwanda": (-1.94, 29.87),
    "Saudi Arabia": (23.89, 45.08),
    "Senegal": (14.50, -14.45),
    "Serbia": (44.02, 21.01),
    "Singapore": (1.35, 103.82),
    "Slovakia": (48.67, 19.70),
    "Slovenia": (46.15, 14.99),
    "Somalia": (5.15, 46.20),
    "South Africa": (-30.56, 22.94),
    "South Korea": (35.91, 127.77),
    "South Sudan": (6.88, 31.31),
    "Spain": (40.46, -3.75),
    "Sri Lanka": (7.87, 80.77),
    "Sudan": (12.86, 30.22),
    "Sweden": (60.13, 18.64),
    "Switzerland": (46.82, 8.23),
    "Syria": (34.80, 38.99),
    "Taiwan": (23.70, 120.96),
    "Tajikistan": (38.86, 71.28),
    "Tanzania": (-6.37, 34.89),
    "Thailand": (15.87, 100.99),
    "Tunisia": (33.89, 9.54),
    "Turkey": (38.96, 35.24),
    "Turkmenistan": (38.97, 59.56),
    "UAE": (23.42, 53.85),
    "Uganda": (1.37, 32.29),
    "Ukraine": (48.38, 31.17),
    "United Kingdom": (55.38, -3.44),
    "UK": (55.38, -3.44),
    "United States": (37.09, -95.71),
    "US": (37.09, -95.71),
    "USA": (37.09, -95.71),
    "Uruguay": (-32.52, -55.77),
    "Uzbekistan": (41.38, 64.59),
    "Venezuela": (6.42, -66.59),
    "Vietnam": (14.06, 108.28),
    "Yemen": (15.55, 48.52),
    "Zambia": (-13.13, 27.85),
    "Zimbabwe": (-19.02, 29.15),
    "West Bank": (31.95, 35.23),
    "Crimea": (44.95, 34.10),
    "Hong Kong": (22.40, 114.11),
    "Macau": (22.20, 113.55),
    "Tibet": (29.65, 91.10),
    "Xinjiang": (41.75, 87.63),
    "Kurdistan": (36.41, 44.39),
}

# Major city coordinates for finer-grained plotting
CITY_COORDINATES: dict[str, tuple[float, float]] = {
    "Kyiv": (50.45, 30.52),
    "Moscow": (55.76, 37.62),
    "Beijing": (39.91, 116.40),
    "Washington": (38.91, -77.04),
    "London": (51.51, -0.13),
    "Paris": (48.86, 2.35),
    "Berlin": (52.52, 13.40),
    "Tokyo": (35.68, 139.69),
    "New Delhi": (28.61, 77.21),
    "Tehran": (35.69, 51.39),
    "Jerusalem": (31.77, 35.23),
    "Tel Aviv": (32.08, 34.78),
    "Riyadh": (24.71, 46.68),
    "Cairo": (30.04, 31.24),
    "Baghdad": (33.31, 44.37),
    "Damascus": (33.51, 36.29),
    "Kabul": (34.53, 69.17),
    "Islamabad": (33.69, 73.04),
    "Ankara": (39.93, 32.85),
    "Istanbul": (41.01, 28.98),
    "Rome": (41.90, 12.50),
    "Madrid": (40.42, -3.70),
    "Brussels": (50.85, 4.35),
    "Geneva": (46.20, 6.14),
    "Vienna": (48.21, 16.37),
    "Taipei": (25.03, 121.57),
    "Seoul": (37.57, 126.98),
    "Pyongyang": (39.02, 125.75),
    "Bangkok": (13.76, 100.50),
    "Hanoi": (21.03, 105.85),
    "Singapore": (1.35, 103.82),
    "Jakarta": (6.21, 106.85),
    "Manila": (14.60, 120.98),
    "Nairobi": (1.29, 36.82),
    "Lagos": (6.52, 3.38),
    "Johannesburg": (-26.20, 28.05),
    "Cape Town": (-33.93, 18.42),
    "Addis Ababa": (9.02, 38.75),
    "Khartoum": (15.50, 32.56),
    "Tripoli": (32.89, 13.18),
    "Algiers": (36.75, 3.04),
    "Mexico City": (19.43, -99.13),
    "Bogota": (4.71, -74.07),
    "Buenos Aires": (-34.60, -58.38),
    "Sao Paulo": (-23.55, -46.63),
    "Lima": (-12.05, -77.04),
    "Caracas": (10.48, -66.90),
    "Havana": (23.11, -82.37),
    "Ottawa": (45.42, -75.70),
    "Canberra": (-35.28, 149.13),
    "Sydney": (-33.87, 151.21),
    "Kharkiv": (49.99, 36.23),
    "Odesa": (46.48, 30.73),
    "Mariupol": (47.10, 37.55),
    "Donetsk": (48.00, 37.80),
    "Luhansk": (48.57, 39.33),
    "Zaporizhzhia": (47.84, 35.14),
    "Gaza City": (31.50, 34.47),
    "Rafah": (31.30, 34.25),
    "Ramallah": (31.90, 35.20),
    "Beirut": (33.89, 35.50),
    "Aleppo": (36.20, 37.15),
    "Mosul": (36.34, 43.12),
    "Erbil": (36.19, 44.01),
    "Sanaa": (15.37, 44.21),
    "Aden": (12.79, 45.02),
    "Mogadishu": (2.05, 45.32),
    "Minsk": (53.90, 27.57),
    "Tbilisi": (41.72, 44.79),
    "Baku": (40.41, 49.87),
    "Yerevan": (40.18, 44.51),
    "Shanghai": (31.23, 121.47),
    "Hong Kong": (22.40, 114.11),
    "Mumbai": (19.08, 72.88),
    "Karachi": (24.86, 67.01),
    "Dhaka": (23.81, 90.41),
    "Yangon": (16.87, 96.20),
    "Colombo": (6.93, 79.85),
    "Kathmandu": (27.72, 85.32),
}


def classify_event(title: str, summary: str = "") -> dict:
    """
    Classify an article/event into category, severity, and extract location.

    Returns:
        {
            "category": str,
            "severity": int (1-10),
            "country": str | None,
            "city": str | None,
            "latitude": float | None,
            "longitude": float | None,
        }
    """
    text = f"{title} {summary}".lower()
    text_original = f"{title} {summary}"

    # ----- Category classification -----
    best_category = "other"
    best_score = 0

    for category, rules in CATEGORY_RULES.items():
        score = 0
        for keyword in rules["keywords"]:
            if keyword.lower() in text:
                score += 1
        if score > best_score:
            best_score = score
            best_category = category

    # ----- Severity scoring -----
    base_severity = CATEGORY_RULES.get(best_category, {}).get("base_severity", 3)
    severity_bonus = 0

    for keyword, bonus in SEVERITY_ESCALATORS.items():
        if keyword.lower() in text:
            severity_bonus += bonus

    severity = min(10, max(1, base_severity + severity_bonus))

    # ----- Location extraction -----
    country = None
    city = None
    latitude = None
    longitude = None

    # Check for city names first (more specific)
    for city_name, coords in CITY_COORDINATES.items():
        pattern = r"\b" + re.escape(city_name) + r"\b"
        if re.search(pattern, text_original):
            city = city_name
            latitude, longitude = coords
            break

    # Check for country names
    for country_name, coords in COUNTRY_COORDINATES.items():
        pattern = r"\b" + re.escape(country_name) + r"\b"
        if re.search(pattern, text_original):
            country = country_name
            if latitude is None:
                latitude, longitude = coords
            break

    return {
        "category": best_category,
        "severity": severity,
        "country": country,
        "city": city,
        "latitude": latitude,
        "longitude": longitude,
    }


def extract_entities(text: str) -> list[str]:
    """
    Simple named entity extraction: find capitalized multi-word phrases
    and known country/city names.
    """
    entities = set()

    # Known countries
    for country_name in COUNTRY_COORDINATES:
        pattern = r"\b" + re.escape(country_name) + r"\b"
        if re.search(pattern, text):
            entities.add(country_name)

    # Known cities
    for city_name in CITY_COORDINATES:
        pattern = r"\b" + re.escape(city_name) + r"\b"
        if re.search(pattern, text):
            entities.add(city_name)

    # Capitalized multi-word phrases (simple NER heuristic)
    caps_pattern = r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b"
    matches = re.findall(caps_pattern, text)
    for match in matches:
        # Filter out common non-entity phrases
        if len(match) > 5 and match not in {
            "The Associated Press", "Press Release", "Read More",
            "Photo Credit", "Getty Images", "Associated Press",
        }:
            entities.add(match)

    return sorted(entities)
