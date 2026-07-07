import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5175/test/data-model', { waitUntil: 'networkidle' });
const result = await page.evaluate(async () => {
  const wasm = await import('/src/lib/wasm/index.ts');
  await wasm.initFarert();
  const routes = ['東京,東海道線,熱海', '東京,東海道新幹線,熱海'];
  const outputs = [];
  for (const script of routes) {
    const route = new wasm.Farert();
    const rc = route.buildRoute(script);
    route.showFare();
    outputs.push({ script, rc, fareInfo: route.getFareInfoObjectJson() });
  }
  return outputs;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
