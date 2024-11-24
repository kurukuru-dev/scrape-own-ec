import { chromium } from "playwright";
// @ts-ignore
import { GoogleSpreadsheet } from "google-spreadsheet";
import env from "dotenv";
env.config();

const PRODUCT_ID = {
  PRODUCT_NAME: "#productName",
  BRAND_NAME: "#brandName",
  RELEASE_DATE: "#releaseDate"
} as const;
type ProductIdValues = typeof PRODUCT_ID[keyof typeof PRODUCT_ID];

// ロケーターを取得してテキストを取得
async function getLocatorText(id: ProductIdValues): Promise<string> {
  const locator = page.locator(id);
  return (await locator.textContent()) || "";
}

interface Product {
  productName: string;
  brandName: string;
  releaseDate: string;
}
type ProductList = Product[];

const PRODUCT_LIST = {
  PRODUCT_NAME: 'productName',
  BRAND_NAME: 'brandName',
  RELEASE_DATE: 'releaseDate'
} as const;

/**
 * 与えられた商品リスト名と商品数から3つの商品情報を取得
 * 3つの商品情報: 商品名、ブランド名、発売日
 */
async function getProducts(productListName: string, productCount: number): Promise<ProductList> {
  const cardId = `${productListName} >> li#card`
  const cardLocator = page.locator(cardId);
  
  let productList = [];
  for (let i = 0; i < productCount; i++) {
    await cardLocator.nth(i).click();

    const productName = await getLocatorText(PRODUCT_ID.PRODUCT_NAME);
    const brandName = await getLocatorText(PRODUCT_ID.BRAND_NAME);
    const releaseDate = await getLocatorText(PRODUCT_ID.RELEASE_DATE);

    productList.push({
      [PRODUCT_LIST.PRODUCT_NAME]: productName,
      [PRODUCT_LIST.BRAND_NAME]: brandName,
      [PRODUCT_LIST.RELEASE_DATE]: releaseDate
    });

    const closeLocator = page.locator("#link");
    await closeLocator.click();
  }

  return productList;
}

// 検索欄で同じブランドの数を取得(本来は検索結果の商品数を取得したり、そのブランドの商品名を取得するなどの処理を行うが簡略化)
async function getSameBrandCount(productName: string): Promise<number> {
  const brandSeachLinkId = "#link:has-text('ブランド検索')"
  const searchLocator = page.locator(brandSeachLinkId);
  await searchLocator.click();

  const brandId = "li#brand";

  const searchInoutLocator = page.locator("#searchInput");
  await searchInoutLocator.fill(productName);
  await page.waitForSelector(brandId);
  const brandLocator1 = page.locator(brandId);

  const selectLocator = page.locator("#select");
  await selectLocator.selectOption({ label: productName });
  await page.waitForSelector(brandId);
  const brandLocator2 = page.locator(brandId);

  // 触ってみたかったから、謎の処理を追加
  const isCountMatch = await brandLocator1.count() === await brandLocator2.count();
  return isCountMatch ? await brandLocator1.count(): 0;
}

// シートのタイトルを取得
function getSheetTitle(label: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日の${label}情報`;
}

// GoogleSpreadSheetに書き込む
async function writeGoogleSpreadSheet(productList: ProductList, label: string) {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID || "");

  doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    private_key: process.env.GOOGLE_PRIVATE_KEY || "",
  })
  
  await doc.loadInfo();
  
  const sheetTitle = getSheetTitle(label);
  // シートが存在しない場合は新規作成
  const isExistSheet = !!doc.sheetsByTitle[sheetTitle]
  if (!isExistSheet) {
    await doc.addSheet({ title: sheetTitle, headerValues: [PRODUCT_LIST.PRODUCT_NAME, PRODUCT_LIST.BRAND_NAME, PRODUCT_LIST.RELEASE_DATE] });
  } 

  const sheet = doc.sheetsByTitle[sheetTitle];
  sheet.addRows(productList)
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.TARGET_URL || "");

const newProducts = await getProducts("#newProducts", 5);
const popularProducts = await getProducts("#popularProducts", 5);
const sameBrandCount = await getSameBrandCount("ブランドA");
// console.log(sameBrandCount);

await writeGoogleSpreadSheet(newProducts, "新着商品")
await writeGoogleSpreadSheet(popularProducts, "人気商品")

await browser.close();
