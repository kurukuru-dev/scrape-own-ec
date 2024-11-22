import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://kurukuru-dev.github.io/astro-ec-site/");

interface Product {
  productName: string;
  brandName: string;
  releaseDate: string;
}

type ProductList = Product[];

/**
 * 与えられた商品リスト名と商品数から3つの商品情報を取得
 * 3つの商品情報: 商品名、ブランド名、発売日
 */
async function getProducts(productListName: string, productCount: number): Promise<ProductList> {
  let productList = [];
  const cardLocator = page.locator(`${productListName} >> li#card`);

  for (let i = 0; i < productCount; i++) {
    await cardLocator.nth(i).click();

    const productNameLocator = page.locator("#productName");
    const productName: string = (await productNameLocator.textContent()) || "";

    const brandNameLocator = page.locator("#brandName");
    const brandName: string = (await brandNameLocator.textContent()) || "";

    const releaseDateLocator = page.locator("#releaseDate");
    const releaseDate: string = (await releaseDateLocator.textContent()) || "";

    productList.push({
      productName,
      brandName,
      releaseDate,
    });

    const closeLocator = page.locator("#link");
    await closeLocator.click();
  }

  return productList;
}

// 検索欄で同じブランドの数を取得(本来は検索結果の商品数を取得したり、そのブランドの商品名を取得するなどの処理を行うが簡略化)
async function getSameBrandCount(productName: string): Promise<number> {
  const searchLocator = page.locator("#link:has-text('ブランド検索')");
  await searchLocator.click();

  const searchInoutLocator = page.locator("#searchInput");
  await searchInoutLocator.fill(productName);
  await page.waitForTimeout(2000); // ここの処理いけてない
  const brandLocator1 = page.locator("li#brand");

  const selectLocator = page.locator("#select");
  await selectLocator.selectOption({ label: productName });
  await page.waitForTimeout(2000); // ここの処理いけてない
  const brandLocator2 = page.locator("li#brand");

  // 触ってみたかったから、謎の処理を追加
  const isCountMatch = await brandLocator1.count() === await brandLocator2.count();
  return isCountMatch ? await brandLocator1.count(): 0;
}

const newProducts = await getProducts("#newProducts", 5);
const popularProducts = await getProducts("#popularProducts", 5);
const sameBrandCount = await getSameBrandCount("ブランドA");
await browser.close();
