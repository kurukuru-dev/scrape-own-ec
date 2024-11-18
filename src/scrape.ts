import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://kurukuru-dev.github.io/astro-ec-site/");

  await browser.close();
})();
