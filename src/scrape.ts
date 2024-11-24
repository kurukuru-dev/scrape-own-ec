import { chromium } from "playwright";
import env from "dotenv";
// @ts-ignore
import { GoogleSpreadsheet } from "google-spreadsheet";
env.config();

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.TARGET_URL || "");

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
  await page.waitForTimeout(2000); 
  const brandLocator1 = page.locator("li#brand");

  const selectLocator = page.locator("#select");
  await selectLocator.selectOption({ label: productName });
  await page.waitForTimeout(2000); 
  const brandLocator2 = page.locator("li#brand");

  // 触ってみたかったから、謎の処理を追加
  const isCountMatch = await brandLocator1.count() === await brandLocator2.count();
  return isCountMatch ? await brandLocator1.count(): 0;
}

// GoogleSpreadSheetに書き込む
async function writeGoogleSpreadSheet(productList: ProductList, label: string) {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID || "");

  doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    private_key: process.env.GOOGLE_PRIVATE_KEY || "",
  })

  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const title = `${year}年${month}月${day}日の${label}情報`;

  await doc.loadInfo();

  // シートが存在しない場合は新規作成
  const isExistSheet = !!doc.sheetsByTitle[title]
  if (!isExistSheet) {
    await doc.addSheet({ title, headerValues: ["productName", "brandName", "releaseDate"] });
  } 

  const sheet = doc.sheetsByTitle[title];
  sheet.addRows(productList)
}

const newProducts = await getProducts("#newProducts", 5);
const popularProducts = await getProducts("#popularProducts", 5);
const sameBrandCount = await getSameBrandCount("ブランドA");
// console.log(sameBrandCount);
await writeGoogleSpreadSheet(newProducts, "新着商品")
await writeGoogleSpreadSheet(popularProducts, "人気商品")
await browser.close();
