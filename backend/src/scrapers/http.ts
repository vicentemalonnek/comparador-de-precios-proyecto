const USER_AGENT =
  "PCPriceComparatorBot/0.1 (university project; https://github.com/vicentemalonnek/comparador-de-precios-proyecto)";

export class PoliteFetcher {
  private readonly delayMs: number;
  private lastRequestAt = 0;

  constructor(delayMs: number) {
    this.delayMs = delayMs;
  }

  async get(url: string): Promise<Response> {
    const wait = this.lastRequestAt + this.delayMs - Date.now();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt = Date.now();

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    // Do not retry or work around a block: stop and let the caller decide
    if ([401, 403, 429, 503].includes(response.status)) {
      throw new Error(`Request blocked or rate limited (${response.status}): ${url}`);
    }

    return response;
  }
}