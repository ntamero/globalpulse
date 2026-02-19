"""
Registry of internet radio news streams.

Includes HLS (.m3u8), direct MP3/AAC streams, and web player URLs
for the world's major news radio stations.
"""

RADIO_STATIONS: list[dict] = [
    # --- International / World ---
    {
        "name": "BBC World Service",
        "url": "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
        "web_url": "https://www.bbc.co.uk/sounds/play/live:bbc_world_service",
        "region": "world",
        "country": "United Kingdom",
        "language": "en",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "NPR News",
        "url": "https://npr-ice.streamguys1.com/live.mp3",
        "web_url": "https://www.npr.org/player/live",
        "region": "americas",
        "country": "United States",
        "language": "en",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "CBC Radio One",
        "url": "https://cbcliveradio-lh.akamaihd.net/i/CBCR1_TOR@118420/master.m3u8",
        "web_url": "https://www.cbc.ca/listen/live-radio/1-1-cbc-radio-one",
        "region": "americas",
        "country": "Canada",
        "language": "en",
        "category": "news",
        "format": "hls",
    },
    {
        "name": "RFI English",
        "url": "https://live02-radio-fr-int.sharp-stream.com/rfienglish.mp3",
        "web_url": "https://www.rfi.fr/en/podcasts/",
        "region": "europe",
        "country": "France",
        "language": "en",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "RFI Francais",
        "url": "https://live02-radio-fr-int.sharp-stream.com/rfimonde-96k.mp3",
        "web_url": "https://www.rfi.fr/fr/direct-radio",
        "region": "europe",
        "country": "France",
        "language": "fr",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "Deutsche Welle English",
        "url": "https://dw.audiostream.io/dw/1003/mp3/128/dw",
        "web_url": "https://www.dw.com/en/media-center/live-radio/s-100826",
        "region": "europe",
        "country": "Germany",
        "language": "en",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "Voice of America",
        "url": "https://voa-ingest.akamaized.net/hls/live/2035190/161_352R/playlist.m3u8",
        "web_url": "https://www.voanews.com/listen",
        "region": "world",
        "country": "United States",
        "language": "en",
        "category": "news",
        "format": "hls",
    },
    {
        "name": "KBS World Radio English",
        "url": "https://worldradio.kbs.co.kr:1138/live_eng.m3u8",
        "web_url": "https://world.kbs.co.kr/service/index.htm?lang=e",
        "region": "asia",
        "country": "South Korea",
        "language": "en",
        "category": "news",
        "format": "hls",
    },
    {
        "name": "NHK World Radio Japan",
        "url": "https://nhkworld.webcdn.stream.ne.jp/www11/radiojapan/musics/list-v2/2-en.m3u8",
        "web_url": "https://www3.nhk.or.jp/nhkworld/en/radio/",
        "region": "asia",
        "country": "Japan",
        "language": "en",
        "category": "news",
        "format": "hls",
    },
    {
        "name": "ABC NewsRadio Australia",
        "url": "https://mediaserviceslive.akamaized.net/hls/live/2038311/newsradio/index.m3u8",
        "web_url": "https://www.abc.net.au/listen/newsradio",
        "region": "asia",
        "country": "Australia",
        "language": "en",
        "category": "news",
        "format": "hls",
    },
    {
        "name": "All India Radio News",
        "url": "https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
        "web_url": "https://newsonair.gov.in/",
        "region": "asia",
        "country": "India",
        "language": "en",
        "category": "news",
        "format": "hls",
    },
    {
        "name": "TRT Radyo Haber",
        "url": "https://trtradyo1.mediatriple.net/trtradyohaber.mp3",
        "web_url": "https://www.trt.net.tr/radyo/trt-haber/canli-yayin",
        "region": "middle_east",
        "country": "Turkey",
        "language": "tr",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "BBC Radio 4",
        "url": "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm",
        "web_url": "https://www.bbc.co.uk/sounds/play/live:bbc_radio_fourfm",
        "region": "europe",
        "country": "United Kingdom",
        "language": "en",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "WNYC FM",
        "url": "https://fm939.wnyc.org/wnycfm",
        "web_url": "https://www.wnyc.org/",
        "region": "americas",
        "country": "United States",
        "language": "en",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "Bloomberg Radio",
        "url": "https://stream.revma.ihrhls.com/zc5730/hls.m3u8",
        "web_url": "https://www.bloomberg.com/audio",
        "region": "americas",
        "country": "United States",
        "language": "en",
        "category": "economy",
        "format": "hls",
    },
    {
        "name": "France Inter",
        "url": "https://icecast.radiofrance.fr/franceinter-midfi.mp3",
        "web_url": "https://www.radiofrance.fr/franceinter",
        "region": "europe",
        "country": "France",
        "language": "fr",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "Deutschlandfunk",
        "url": "https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3",
        "web_url": "https://www.deutschlandfunk.de/",
        "region": "europe",
        "country": "Germany",
        "language": "de",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "RNE Radio Nacional",
        "url": "https://rtvelivestream.akamaized.net/rne_r1_main.mp3",
        "web_url": "https://www.rtve.es/play/radio/radio-nacional/",
        "region": "europe",
        "country": "Spain",
        "language": "es",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "RAI Radio 1",
        "url": "https://icestreaming.rai.it/1.mp3",
        "web_url": "https://www.raiplaysound.it/radio1",
        "region": "europe",
        "country": "Italy",
        "language": "it",
        "category": "news",
        "format": "mp3",
    },
    {
        "name": "Radio Sputnik",
        "url": "https://icecast-rsi.cdnvideo.ru/rsi",
        "web_url": "https://sputniknews.com/radio/",
        "region": "europe",
        "country": "Russia",
        "language": "en",
        "category": "news",
        "format": "mp3",
    },
]


def get_radio_stations(
    region: str | None = None,
    language: str | None = None,
    category: str | None = None,
) -> list[dict]:
    """
    Return radio stations, optionally filtered by region, language, or category.
    """
    stations = RADIO_STATIONS
    if region:
        stations = [s for s in stations if s["region"] == region]
    if language:
        stations = [s for s in stations if s["language"] == language]
    if category:
        stations = [s for s in stations if s["category"] == category]
    return stations
