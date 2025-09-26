// verify-fix.js - Proof that the reactivity fix works
const puppeteer = require('puppeteer');

async function verifyFix() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console logs
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('http://localhost:3000');
  await page.waitForSelector('.constant-input');

  // Get initial values
  const initialAPNeeded = await page.$eval('.result-card:first-child .ap-amount', el => el.textContent);
  console.log('Initial Breakeven AP Needed:', initialAPNeeded);

  // Change Avg AP from 2000 to 1500
  const avgAPInput = await page.$('.constant-input');
  await avgAPInput.click({ clickCount: 3 }); // Select all
  await avgAPInput.type('1500');

  // Wait for React to update
  await page.waitForTimeout(100);

  // Get updated values
  const updatedAPNeeded = await page.$eval('.result-card:first-child .ap-amount', el => el.textContent);
  console.log('Updated Breakeven AP Needed:', updatedAPNeeded);

  // Check console logs
  console.log('\nConsole logs captured:');
  logs.forEach(log => console.log(log));

  // Verify the values changed
  if (initialAPNeeded !== updatedAPNeeded) {
    console.log('\n✅ SUCCESS: Values updated when input changed!');
    console.log('The reactivity fix is working correctly.');
  } else {
    console.log('\n❌ FAIL: Values did not update');
  }

  await browser.close();
}

verifyFix().catch(console.error);