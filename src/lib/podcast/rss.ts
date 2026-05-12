import { create } from "xmlbuilder2";

export type RssEpisode = {
  title: string;
  guid: string;
  pubDate: Date;
  audioUrl: string;
  episodeUrl: string;
  description: string;
  transcriptText?: string | null;
  transcriptUrl?: string | null;
  durationSeconds?: number | null;
  /** RSS enclosure length in bytes (file size). */
  enclosureLengthBytes?: number | null;
};

export function buildPodcastRss(input: {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  imageUrl?: string | null;
  episodes: RssEpisode[];
}) {
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("rss", {
      version: "2.0",
      "xmlns:atom": "http://www.w3.org/2005/Atom",
      "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
      "xmlns:podcast": "https://podcastindex.org/namespace/1.0",
      "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
    })
    .ele("channel");

  doc.ele("title").txt(input.title).up();
  doc.ele("link").txt(input.siteUrl).up();
  doc.ele("description").txt(input.description).up();
  doc.ele("language").txt("sv").up();
  doc.ele("generator").txt("parrot-news").up();
  doc.ele("itunes:explicit").txt("false").up();
  doc.ele("itunes:type").txt("episodic").up();
  doc.ele("itunes:author").txt("Parrot News").up();
  doc.ele("itunes:summary").txt(input.description).up();
  doc.ele("atom:link").att("href", input.feedUrl).att("rel", "self").att("type", "application/rss+xml").up();

  if (input.imageUrl) {
    doc.ele("itunes:image").att("href", input.imageUrl).up();
  }

  for (const ep of input.episodes) {
    const item = doc.ele("item");
    item.ele("title").txt(ep.title).up();
    item.ele("guid").txt(ep.guid).up();
    item.ele("pubDate").txt(ep.pubDate.toUTCString()).up();
    item.ele("link").txt(ep.episodeUrl).up();
    item.ele("description").dat(ep.description).up();
    if (ep.transcriptText) {
      item.ele("content:encoded").dat(ep.transcriptText).up();
    }
    item
      .ele("enclosure")
      .att("url", ep.audioUrl)
      .att("type", "audio/mpeg")
      .att("length", String(ep.enclosureLengthBytes ?? 0))
      .up();
    if (ep.durationSeconds != null) {
      item.ele("itunes:duration").txt(String(ep.durationSeconds)).up();
    }
    // Podcast 2.0 transcript tag if we have a URL (preferred).
    if (ep.transcriptUrl) {
      item
        .ele("podcast:transcript")
        .att("url", ep.transcriptUrl)
        .att("type", "text/html")
        .up();
    }
    item.up();
  }

  return doc.end({ prettyPrint: true });
}

