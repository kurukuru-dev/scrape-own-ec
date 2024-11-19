import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("https://kurukuru-dev.github.io/astro-ec-site/");

  let newProductList = [];
  for (let i = 0; i < 5; i++) {
    const newCardLocator = page.locator(`xpath=/html/body/main/div[1] >> #card >> nth=${i}`);
    await newCardLocator.click();

    const productNameLocator = page.locator("#productName");
    const productName = await productNameLocator.textContent();

    // const brandNameLocator = page.locator("#brandName");
    // const brandName = await brandNameLocator.textContent();

    // const releaseDateLocator = page.locator("#releaseDate");
    // const releaseDate = await releaseDateLocator.textContent();

    newProductList.push({
      productName: productName,
      // brandName: brandName,
      // releaseDate: releaseDate,
    });

    const closeLocator = page.locator("#link");
    await closeLocator.click();
  }

  console.log(newProductList);

  await browser.close();
})();
