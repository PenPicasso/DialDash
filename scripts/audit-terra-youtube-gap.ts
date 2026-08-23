const targets = [
  { id: "amber-kanwar", url: "https://www.youtube.com/@inthemoneypod" },
  { id: "marine-cornelis", url: "https://www.youtube.com/channel/UCroO2c8WjkFYd8zlz7Zn3Fw" },
  { id: "michelle-fraser", url: "https://www.youtube.com/@energysectorheroes" },
];

async function main() {
  const results = [];
  for (const target of targets) {
    try {
      const response = await fetch(`${target.url}/shorts`, {
        headers: { "user-agent": "Mozilla/5.0 (DialDash Sol visual-gap audit)" },
        signal: AbortSignal.timeout(12_000),
      });
      const html = await response.text();
      const videoIds = [...new Set([...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((match) => match[1]))];
      const shortsTabPresent = html.includes('tabIdentifier":"FEshorts') || html.includes('webPageType":"WEB_PAGE_TYPE_CHANNEL"');
      results.push({
        ...target,
        status: response.ok && shortsTabPresent ? "VERIFIED" : "UNVERIFIED",
        visibleShortIds: videoIds.slice(0, 30),
        visibleShortCount: Math.min(videoIds.length, 30),
        gapDecision: videoIds.length >= 12 ? "ESTABLISHED_SHORTS" : videoIds.length >= 4 ? "PARTIAL_SHORTS" : "WEAK_OR_NO_SHORTS",
      });
    } catch (error) {
      results.push({ ...target, status: "UNVERIFIED", visibleShortIds: [], visibleShortCount: 0, gapDecision: "UNVERIFIED", error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

void main();
