import uuid
import asyncio
import hashlib
import logging
import re
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from typing import Optional
from time import mktime

import aiohttp
import feedparser
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.data.database import AsyncSessionLocal
from app.data.models import Article
from app.data import cache

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# RSS FEED REGISTRY -- 120+ real, working RSS feed URLs
# ---------------------------------------------------------------------------

RSS_FEEDS: dict[str, list[dict]] = {
    "world": [
        {"name": "Reuters World", "url": "https://feeds.reuters.com/Reuters/worldNews", "priority": 1},
        {"name": "AP News Top", "url": "https://rsshub.app/apnews/topics/apf-topnews", "priority": 1},
        {"name": "AP News World", "url": "https://rsshub.app/apnews/topics/world-news", "priority": 1},
        {"name": "BBC World", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "priority": 1},
        {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "priority": 1},
        {"name": "DW News", "url": "https://rss.dw.com/rdf/rss-en-all", "priority": 2},
        {"name": "France 24 English", "url": "https://www.france24.com/en/rss", "priority": 2},
        {"name": "The Guardian World", "url": "https://www.theguardian.com/world/rss", "priority": 1},
        {"name": "NPR News", "url": "https://feeds.npr.org/1001/rss.xml", "priority": 2},
        {"name": "VOA News", "url": "https://www.voanews.com/api/z$omretqpi", "priority": 2},
        {"name": "UN News", "url": "https://news.un.org/feed/subscribe/en/news/all/rss.xml", "priority": 2},
        {"name": "CGTN", "url": "https://www.cgtn.com/subscribe/rss/section/world.xml", "priority": 3},
        {"name": "GlobalPost", "url": "https://theworld.org/rss.xml", "priority": 3},
        {"name": "The Independent World", "url": "https://www.independent.co.uk/news/world/rss", "priority": 2},
        {"name": "Christian Science Monitor", "url": "https://rss.csmonitor.com/feeds/world", "priority": 3},
    ],
    "middle_east": [
        {"name": "Al Jazeera ME", "url": "https://www.aljazeera.com/xml/rss/all.xml", "priority": 1},
        {"name": "Middle East Eye", "url": "https://www.middleeasteye.net/rss", "priority": 1},
        {"name": "Times of Israel", "url": "https://www.timesofisrael.com/feed/", "priority": 2},
        {"name": "Iran International", "url": "https://www.iranintl.com/en/feed", "priority": 1},
        {"name": "Arab News", "url": "https://www.arabnews.com/rss.xml", "priority": 2},
        {"name": "Haaretz", "url": "https://www.haaretz.com/cmlink/1.628765", "priority": 2},
        {"name": "Jerusalem Post", "url": "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", "priority": 2},
        {"name": "Al Monitor", "url": "https://www.al-monitor.com/rss", "priority": 1},
        {"name": "TRT World", "url": "https://www.trtworld.com/rss", "priority": 2},
        {"name": "The National UAE", "url": "https://www.thenationalnews.com/rss", "priority": 2},
        {"name": "Daily Sabah", "url": "https://www.dailysabah.com/rssFeed/main", "priority": 3},
        {"name": "Asharq Al-Awsat", "url": "https://english.aawsat.com/feed", "priority": 2},
        {"name": "i24 News", "url": "https://www.i24news.tv/en/rss", "priority": 3},
        {"name": "Rudaw", "url": "https://www.rudaw.net/english/rss", "priority": 3},
        {"name": "Kurdistan 24", "url": "https://www.kurdistan24.net/en/rss", "priority": 3},
        {"name": "BBC Middle East", "url": "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", "priority": 1},
    ],
    "europe": [
        {"name": "BBC Europe", "url": "https://feeds.bbci.co.uk/news/world/europe/rss.xml", "priority": 1},
        {"name": "Guardian Europe", "url": "https://www.theguardian.com/world/europe-news/rss", "priority": 1},
        {"name": "DW Europe", "url": "https://rss.dw.com/rdf/rss-en-eu", "priority": 2},
        {"name": "Euronews", "url": "https://www.euronews.com/rss", "priority": 2},
        {"name": "RFE/RL", "url": "https://www.rferl.org/api/zq-opetimyeqt", "priority": 2},
        {"name": "Reuters Europe", "url": "https://feeds.reuters.com/Reuters/UKWorldNews", "priority": 1},
        {"name": "Politico Europe", "url": "https://www.politico.eu/feed/", "priority": 2},
        {"name": "EUObserver", "url": "https://euobserver.com/rss.xml", "priority": 3},
        {"name": "The Local Europe", "url": "https://feeds.thelocal.com/rss/eu", "priority": 3},
        {"name": "EU Reporter", "url": "https://www.eureporter.co/feed/", "priority": 3},
        {"name": "Balkan Insight", "url": "https://balkaninsight.com/feed/", "priority": 3},
        {"name": "Irish Times World", "url": "https://www.irishtimes.com/cmlink/news-1.1319192", "priority": 3},
        {"name": "Der Spiegel English", "url": "https://www.spiegel.de/international/index.rss", "priority": 2},
        {"name": "France 24 Europe", "url": "https://www.france24.com/en/europe/rss", "priority": 2},
        {"name": "Kyiv Independent", "url": "https://kyivindependent.com/feed/", "priority": 1},
        {"name": "Moscow Times", "url": "https://www.themoscowtimes.com/rss/news", "priority": 2},
        {"name": "BBC UK", "url": "https://feeds.bbci.co.uk/news/uk/rss.xml", "priority": 2},
    ],
    "asia": [
        {"name": "SCMP", "url": "https://www.scmp.com/rss/91/feed", "priority": 1},
        {"name": "Nikkei Asia", "url": "https://asia.nikkei.com/rss", "priority": 2},
        {"name": "Times of India", "url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "priority": 2},
        {"name": "Channel News Asia", "url": "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", "priority": 2},
        {"name": "BBC Asia", "url": "https://feeds.bbci.co.uk/news/world/asia/rss.xml", "priority": 1},
        {"name": "The Diplomat", "url": "https://thediplomat.com/feed/", "priority": 2},
        {"name": "Japan Times", "url": "https://www.japantimes.co.jp/feed/", "priority": 2},
        {"name": "Korea Herald", "url": "https://www.koreaherald.com/common/rss_xml.php", "priority": 2},
        {"name": "Straits Times", "url": "https://www.straitstimes.com/news/asia/rss.xml", "priority": 2},
        {"name": "Hindustan Times", "url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "priority": 2},
        {"name": "Bangkok Post", "url": "https://www.bangkokpost.com/rss/data/topstories.xml", "priority": 3},
        {"name": "Philippine Star", "url": "https://www.philstar.com/rss/headlines", "priority": 3},
        {"name": "Vietnam News", "url": "https://vietnamnews.vn/rss/news.rss", "priority": 3},
        {"name": "South China Morning Post China", "url": "https://www.scmp.com/rss/2/feed", "priority": 1},
        {"name": "Asia Times", "url": "https://asiatimes.com/feed/", "priority": 2},
        {"name": "Rappler", "url": "https://www.rappler.com/feed/", "priority": 3},
        {"name": "Dawn Pakistan", "url": "https://www.dawn.com/feeds/home", "priority": 2},
        {"name": "Taipei Times", "url": "https://www.taipeitimes.com/xml/index.rss", "priority": 3},
    ],
    "americas": [
        {"name": "CNN World", "url": "http://rss.cnn.com/rss/edition_world.rss", "priority": 1},
        {"name": "NPR World", "url": "https://feeds.npr.org/1004/rss.xml", "priority": 2},
        {"name": "Reuters US", "url": "https://feeds.reuters.com/Reuters/domesticNews", "priority": 1},
        {"name": "Washington Post World", "url": "https://feeds.washingtonpost.com/rss/world", "priority": 1},
        {"name": "NYT World", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "priority": 1},
        {"name": "BBC Americas", "url": "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml", "priority": 1},
        {"name": "Mexico News Daily", "url": "https://mexiconewsdaily.com/feed/", "priority": 3},
        {"name": "Buenos Aires Times", "url": "https://www.batimes.com.ar/feed", "priority": 3},
        {"name": "Brazil Wire", "url": "https://www.brasilwire.com/feed/", "priority": 3},
        {"name": "CBC News World", "url": "https://rss.cbc.ca/lineup/world.xml", "priority": 2},
        {"name": "Global News Canada", "url": "https://globalnews.ca/feed/", "priority": 2},
        {"name": "USA Today", "url": "http://rssfeeds.usatoday.com/usatoday-NewsTopStories", "priority": 2},
        {"name": "Fox News World", "url": "https://moxie.foxnews.com/google-publisher/world.xml", "priority": 2},
        {"name": "CBS News", "url": "https://www.cbsnews.com/latest/rss/world", "priority": 2},
        {"name": "ABC News US", "url": "https://abcnews.go.com/abcnews/internationalheadlines", "priority": 2},
        {"name": "LA Times World", "url": "https://www.latimes.com/world-nation/rss2.0.xml", "priority": 2},
    ],
    "africa": [
        {"name": "BBC Africa", "url": "https://feeds.bbci.co.uk/news/world/africa/rss.xml", "priority": 1},
        {"name": "All Africa", "url": "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", "priority": 1},
        {"name": "The Africa Report", "url": "https://www.theafricareport.com/feed/", "priority": 2},
        {"name": "Mail & Guardian", "url": "https://mg.co.za/feed/", "priority": 2},
        {"name": "Daily Maverick", "url": "https://www.dailymaverick.co.za/feed/", "priority": 2},
        {"name": "Nation Africa", "url": "https://nation.africa/service/rss/africa/4505856", "priority": 2},
        {"name": "News24 SA", "url": "https://feeds.news24.com/articles/news24/TopStories/rss", "priority": 2},
        {"name": "Premium Times Nigeria", "url": "https://www.premiumtimesng.com/feed", "priority": 2},
        {"name": "The East African", "url": "https://www.theeastafrican.co.ke/tea/rss", "priority": 3},
        {"name": "Punch Nigeria", "url": "https://punchng.com/feed/", "priority": 3},
        {"name": "Citizen South Africa", "url": "https://www.citizen.co.za/feed/", "priority": 3},
        {"name": "Guardian Nigeria", "url": "https://guardian.ng/feed/", "priority": 3},
        {"name": "Egyptian Streets", "url": "https://egyptianstreets.com/feed/", "priority": 3},
    ],
    "conflict": [
        {"name": "Defense One", "url": "https://www.defenseone.com/rss/", "priority": 2},
        {"name": "War on the Rocks", "url": "https://warontherocks.com/feed/", "priority": 2},
        {"name": "Janes", "url": "https://www.janes.com/feeds/news", "priority": 2},
        {"name": "The War Zone", "url": "https://www.thedrive.com/the-war-zone/rss", "priority": 2},
        {"name": "ACLED", "url": "https://acleddata.com/feed/", "priority": 3},
        {"name": "Crisis Group", "url": "https://www.crisisgroup.org/feed/rss", "priority": 2},
        {"name": "Conflict News", "url": "https://www.conflictnews.info/feed", "priority": 3},
        {"name": "Bellingcat", "url": "https://www.bellingcat.com/feed/", "priority": 2},
        {"name": "Liveuamap", "url": "https://liveuamap.com/rss", "priority": 1},
        {"name": "Stars and Stripes", "url": "https://www.stripes.com/rss", "priority": 3},
        {"name": "Military Times", "url": "https://www.militarytimes.com/arc/outboundfeeds/rss/", "priority": 3},
    ],
    "economy": [
        {"name": "MarketWatch", "url": "https://feeds.marketwatch.com/marketwatch/topstories/", "priority": 1},
        {"name": "CNBC", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html", "priority": 1},
        {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews", "priority": 1},
        {"name": "FT World", "url": "https://www.ft.com/rss/home", "priority": 1},
        {"name": "Bloomberg", "url": "https://feeds.bloomberg.com/markets/news.rss", "priority": 1},
        {"name": "WSJ Economy", "url": "https://feeds.a]wsj.net/wsj/xml/rss/3_7014.xml", "priority": 1},
        {"name": "Economist", "url": "https://www.economist.com/finance-and-economics/rss.xml", "priority": 2},
        {"name": "Yahoo Finance", "url": "https://finance.yahoo.com/news/rssindex", "priority": 2},
        {"name": "Investopedia", "url": "https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline", "priority": 3},
        {"name": "Forbes", "url": "https://www.forbes.com/real-time/feed2/", "priority": 2},
        {"name": "Business Insider", "url": "https://www.businessinsider.com/rss", "priority": 2},
        {"name": "Seeking Alpha", "url": "https://seekingalpha.com/market_currents.xml", "priority": 2},
        {"name": "Zero Hedge", "url": "https://feeds.feedburner.com/zerohedge/feed", "priority": 3},
    ],
    "technology": [
        {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "priority": 2},
        {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "priority": 2},
        {"name": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index", "priority": 2},
        {"name": "Wired", "url": "https://www.wired.com/feed/rss", "priority": 2},
        {"name": "MIT Technology Review", "url": "https://www.technologyreview.com/feed/", "priority": 2},
        {"name": "Hacker News", "url": "https://hnrss.org/frontpage", "priority": 2},
        {"name": "The Register", "url": "https://www.theregister.com/headlines.atom", "priority": 3},
        {"name": "ZDNet", "url": "https://www.zdnet.com/news/rss.xml", "priority": 3},
        {"name": "Engadget", "url": "https://www.engadget.com/rss.xml", "priority": 3},
        {"name": "TechRadar", "url": "https://www.techradar.com/rss", "priority": 3},
        {"name": "VentureBeat", "url": "https://venturebeat.com/feed/", "priority": 3},
        {"name": "Gizmodo", "url": "https://gizmodo.com/rss", "priority": 3},
    ],
    "science": [
        {"name": "Nature News", "url": "https://www.nature.com/nature.rss", "priority": 2},
        {"name": "Science Daily", "url": "https://www.sciencedaily.com/rss/all.xml", "priority": 2},
        {"name": "New Scientist", "url": "https://www.newscientist.com/feed/home/", "priority": 3},
        {"name": "Phys.org", "url": "https://phys.org/rss-feed/", "priority": 3},
        {"name": "Scientific American", "url": "http://rss.sciam.com/ScientificAmerican-Global", "priority": 3},
        {"name": "Space.com", "url": "https://www.space.com/feeds/all", "priority": 3},
    ],
    "health": [
        {"name": "WHO News", "url": "https://www.who.int/rss-feeds/news-english.xml", "priority": 1},
        {"name": "CDC Newsroom", "url": "https://tools.cdc.gov/api/v2/resources/media/403372.rss", "priority": 2},
        {"name": "STAT News", "url": "https://www.statnews.com/feed/", "priority": 2},
        {"name": "Medical News Today", "url": "https://rss.medicalnewstoday.com/featurednews.xml", "priority": 3},
        {"name": "The Lancet", "url": "https://www.thelancet.com/rssfeed/lancet_current.xml", "priority": 2},
        {"name": "Reuters Health", "url": "https://feeds.reuters.com/reuters/healthNews", "priority": 2},
    ],
    "climate": [
        {"name": "Carbon Brief", "url": "https://www.carbonbrief.org/feed/", "priority": 2},
        {"name": "Climate Home News", "url": "https://www.climatechangenews.com/feed/", "priority": 2},
        {"name": "Inside Climate News", "url": "https://insideclimatenews.org/feed/", "priority": 2},
        {"name": "Guardian Climate", "url": "https://www.theguardian.com/environment/climate-crisis/rss", "priority": 2},
        {"name": "Yale E360", "url": "https://e360.yale.edu/feed.xml", "priority": 3},
        {"name": "DeSmog", "url": "https://www.desmog.com/feed/", "priority": 3},
    ],
}

# ---------------------------------------------------------------------------
# Category keywords for auto-classification
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "conflict": [
        "war", "attack", "bombing", "missile", "military", "airstrike", "killed",
        "troops", "invasion", "offensive", "ceasefire", "casualties", "armed",
        "weapon", "drone strike", "shelling", "terrorist", "insurgent", "siege",
        "combat", "militia", "artillery", "explosion", "battlefield",
    ],
    "diplomacy": [
        "summit", "treaty", "ambassador", "diplomatic", "negotiations", "UN",
        "resolution", "bilateral", "multilateral", "peace talks", "envoy",
        "foreign minister", "secretary of state", "accord", "deal", "pact",
    ],
    "economy": [
        "GDP", "inflation", "recession", "stock market", "trade", "tariff",
        "interest rate", "federal reserve", "central bank", "unemployment",
        "economic", "fiscal", "monetary", "budget", "debt", "bond",
        "currency", "IMF", "World Bank", "sanctions", "export", "import",
    ],
    "protests": [
        "protest", "demonstration", "rally", "uprising", "revolution",
        "opposition", "dissent", "crackdown", "riot", "unrest", "march",
        "strike", "civil disobedience", "activists", "tear gas",
    ],
    "sanctions": [
        "sanctions", "embargo", "blacklist", "freeze assets", "ban",
        "restricted", "penalized", "OFAC", "export controls",
    ],
    "technology": [
        "AI", "artificial intelligence", "cyber", "hack", "data breach",
        "technology", "tech", "software", "startup", "crypto", "blockchain",
        "quantum", "semiconductor", "chip", "internet", "5G", "6G",
    ],
    "climate": [
        "climate", "global warming", "carbon", "emissions", "renewable",
        "solar", "wind energy", "drought", "flood", "hurricane", "typhoon",
        "wildfire", "temperature", "ice melt", "sea level", "deforestation",
    ],
    "health": [
        "pandemic", "epidemic", "virus", "vaccine", "outbreak", "WHO",
        "disease", "infection", "hospital", "health", "medical", "COVID",
        "flu", "ebola", "malaria", "pharmaceutical",
    ],
    "internet": [
        "internet shutdown", "censorship", "social media ban", "VPN",
        "digital rights", "surveillance", "privacy", "data protection",
        "online censorship", "firewall", "blocked",
    ],
}

# ---------------------------------------------------------------------------
# Breaking news / urgency keywords for importance scoring
# ---------------------------------------------------------------------------

BREAKING_KEYWORDS: list[str] = [
    "breaking", "urgent", "just in", "developing", "alert", "flash",
    "emergency", "crisis", "BREAKING", "explosion", "shooting", "earthquake",
    "tsunami", "coup", "assassination", "invaded", "nuclear",
    "declaration of war", "state of emergency", "martial law",
]

HIGH_IMPORTANCE_KEYWORDS: list[str] = [
    "president", "prime minister", "united nations", "NATO", "EU",
    "G7", "G20", "killed", "dead", "wounded", "displaced",
    "sanctions", "invasion", "ceasefire", "peace deal", "election results",
    "coup attempt", "mass shooting", "terror attack", "pandemic",
]

# ---------------------------------------------------------------------------
# Title deduplication threshold
# ---------------------------------------------------------------------------

FUZZY_MATCH_THRESHOLD: float = 0.85

# ---------------------------------------------------------------------------
# Engine class
# ---------------------------------------------------------------------------


class RSSEngine:
    def __init__(self):
        self.seen_urls: set[str] = set()
        self.seen_titles: list[str] = []
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (compatible; GlobalPulse/1.0; "
                        "+https://globalpulse.news)"
                    )
                },
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    # ----- fetch a single feed -----

    async def _fetch_feed(
        self, feed_info: dict, region: str
    ) -> list[dict]:
        url = feed_info["url"]
        name = feed_info["name"]
        priority = feed_info.get("priority", 3)
        articles: list[dict] = []

        try:
            session = await self._get_session()
            async with session.get(url) as resp:
                if resp.status != 200:
                    logger.warning(
                        f"Feed {name} returned status {resp.status}"
                    )
                    return articles
                raw = await resp.text()
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching feed: {name}")
            return articles
        except Exception as e:
            logger.warning(f"Error fetching feed {name}: {e}")
            return articles

        try:
            parsed = feedparser.parse(raw)
        except Exception as e:
            logger.warning(f"Error parsing feed {name}: {e}")
            return articles

        for entry in parsed.entries:
            try:
                article = self._parse_entry(entry, name, url, region, priority)
                if article:
                    articles.append(article)
            except Exception as e:
                logger.debug(f"Error parsing entry from {name}: {e}")
                continue

        return articles

    # ----- parse a single entry -----

    def _parse_entry(
        self,
        entry,
        source_name: str,
        source_url: str,
        region: str,
        priority: int,
    ) -> Optional[dict]:
        title = getattr(entry, "title", None)
        link = getattr(entry, "link", None)
        if not title or not link:
            return None

        title = title.strip()
        link = link.strip()

        # URL deduplication
        url_hash = hashlib.md5(link.encode()).hexdigest()
        if url_hash in self.seen_urls:
            return None

        # Fuzzy title deduplication
        if self._is_duplicate_title(title):
            return None

        self.seen_urls.add(url_hash)
        self.seen_titles.append(title)
        if len(self.seen_titles) > 5000:
            self.seen_titles = self.seen_titles[-3000:]

        # Extract summary
        summary = None
        if hasattr(entry, "summary"):
            summary = self._clean_html(entry.summary)
        elif hasattr(entry, "description"):
            summary = self._clean_html(entry.description)

        # Extract published date
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                published_at = datetime.fromtimestamp(
                    mktime(entry.published_parsed), tz=timezone.utc
                )
            except Exception:
                pass
        if published_at is None and hasattr(entry, "updated_parsed") and entry.updated_parsed:
            try:
                published_at = datetime.fromtimestamp(
                    mktime(entry.updated_parsed), tz=timezone.utc
                )
            except Exception:
                pass
        if published_at is None:
            published_at = datetime.now(timezone.utc)

        # Extract image URL
        image_url = None
        if hasattr(entry, "media_content") and entry.media_content:
            image_url = entry.media_content[0].get("url")
        elif hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
            image_url = entry.media_thumbnail[0].get("url")
        elif hasattr(entry, "enclosures") and entry.enclosures:
            for enc in entry.enclosures:
                if enc.get("type", "").startswith("image"):
                    image_url = enc.get("href") or enc.get("url")
                    break

        # Auto-classify category
        category = self._classify_category(title, summary or "")

        # Calculate importance score
        importance_score = self._calculate_importance(
            title, summary or "", priority, published_at
        )

        return {
            "id": str(uuid.uuid4()),
            "title": title,
            "summary": summary,
            "source_name": source_name,
            "source_url": source_url,
            "url": link,
            "region": region,
            "category": category,
            "published_at": published_at,
            "scraped_at": datetime.now(timezone.utc),
            "importance_score": importance_score,
            "image_url": image_url,
            "language": "en",
            "translated_titles": {},
            "translated_summaries": {},
        }

    # ----- deduplication -----

    def _is_duplicate_title(self, title: str) -> bool:
        title_lower = title.lower()
        for seen in self.seen_titles[-500:]:
            ratio = SequenceMatcher(None, title_lower, seen.lower()).ratio()
            if ratio >= FUZZY_MATCH_THRESHOLD:
                return True
        return False

    # ----- classification -----

    def _classify_category(self, title: str, summary: str) -> str:
        text = f"{title} {summary}".lower()
        scores: dict[str, int] = {}
        for cat, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw.lower() in text)
            if score > 0:
                scores[cat] = score
        if not scores:
            return "general"
        return max(scores, key=scores.get)

    # ----- importance scoring -----

    def _calculate_importance(
        self,
        title: str,
        summary: str,
        priority: int,
        published_at: datetime,
    ) -> float:
        score = 0.0
        text = f"{title} {summary}".lower()

        # Source priority: priority 1 = +3, priority 2 = +2, priority 3 = +1
        score += max(0, 4 - priority)

        # Breaking news keywords: +3 each
        for kw in BREAKING_KEYWORDS:
            if kw.lower() in text:
                score += 3.0
                break

        # High importance keywords: +1 each, max +4
        hi_count = sum(1 for kw in HIGH_IMPORTANCE_KEYWORDS if kw.lower() in text)
        score += min(hi_count, 4)

        # Recency bonus: articles from last 30 minutes get +2, last hour +1
        now = datetime.now(timezone.utc)
        age = now - published_at
        if age < timedelta(minutes=30):
            score += 2.0
        elif age < timedelta(hours=1):
            score += 1.0
        elif age > timedelta(hours=24):
            score -= 1.0

        # Normalize to 0-10
        score = max(0.0, min(10.0, score))
        return round(score, 2)

    # ----- HTML cleaning -----

    @staticmethod
    def _clean_html(raw_html: str) -> str:
        if not raw_html:
            return ""
        clean = re.sub(r"<[^>]+>", "", raw_html)
        clean = re.sub(r"\s+", " ", clean).strip()
        if len(clean) > 2000:
            clean = clean[:2000] + "..."
        return clean

    # ----- public API: fetch all feeds -----

    async def fetch_all_feeds(
        self, priority_filter: Optional[int] = None
    ) -> list[dict]:
        self.seen_urls.clear()
        self.seen_titles.clear()

        tasks = []
        for region, feeds in RSS_FEEDS.items():
            for feed_info in feeds:
                if priority_filter is not None:
                    if feed_info.get("priority", 3) > priority_filter:
                        continue
                tasks.append(self._fetch_feed(feed_info, region))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_articles: list[dict] = []
        for result in results:
            if isinstance(result, Exception):
                logger.warning(f"Feed fetch exception: {result}")
                continue
            all_articles.extend(result)

        all_articles.sort(key=lambda a: a["importance_score"], reverse=True)
        logger.info(
            f"Fetched {len(all_articles)} articles "
            f"(priority_filter={priority_filter})"
        )
        return all_articles

    # ----- public API: fetch and store -----

    async def fetch_and_store(
        self, priority_filter: Optional[int] = None
    ) -> int:
        articles = await self.fetch_all_feeds(priority_filter=priority_filter)
        if not articles:
            return 0

        stored = 0
        async with AsyncSessionLocal() as session:
            for article_data in articles:
                try:
                    stmt = pg_insert(Article).values(
                        id=uuid.UUID(article_data["id"]),
                        title=article_data["title"],
                        summary=article_data["summary"],
                        source_name=article_data["source_name"],
                        source_url=article_data["source_url"],
                        url=article_data["url"],
                        region=article_data["region"],
                        category=article_data["category"],
                        published_at=article_data["published_at"],
                        scraped_at=article_data["scraped_at"],
                        importance_score=article_data["importance_score"],
                        image_url=article_data["image_url"],
                        language=article_data["language"],
                        translated_titles=article_data["translated_titles"],
                        translated_summaries=article_data["translated_summaries"],
                    ).on_conflict_do_nothing(index_elements=["url"])

                    result = await session.execute(stmt)
                    if result.rowcount and result.rowcount > 0:
                        stored += 1
                except Exception as e:
                    logger.debug(f"Error storing article: {e}")
                    continue

            await session.commit()

        # Cache latest articles in Redis
        try:
            top_articles = articles[:50]
            await cache.cache_set_json(
                "latest_articles",
                [
                    {
                        "id": a["id"],
                        "title": a["title"],
                        "summary": (a["summary"] or "")[:300],
                        "source_name": a["source_name"],
                        "url": a["url"],
                        "region": a["region"],
                        "category": a["category"],
                        "published_at": a["published_at"].isoformat()
                        if a["published_at"]
                        else None,
                        "importance_score": a["importance_score"],
                        "image_url": a["image_url"],
                    }
                    for a in top_articles
                ],
                ttl=600,
            )

            # Publish notification for SSE
            await cache.publish(
                "news_updates",
                {"type": "new_articles", "count": stored},
            )
        except Exception as e:
            logger.warning(f"Error caching articles: {e}")

        logger.info(f"Stored {stored} new articles out of {len(articles)} fetched")
        return stored

    # ----- public API: get cached latest -----

    async def get_cached_latest(self) -> Optional[list[dict]]:
        return await cache.cache_get_json("latest_articles")


# Module-level singleton
rss_engine = RSSEngine()
