// /home/nneessen/projects/commissionTracker/test-policy-browser.js

const puppeteer = require('puppeteer');

async function testPolicyAddition() {
  console.log('🚀 Starting browser test...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    slowMo: 100 // Slow down actions to see what's happening
  });

  try {
    const page = await browser.newPage();

    // Go to the app
    console.log('📱 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Check initial policies count
    const initialCount = await page.evaluate(() => {
      const stored = localStorage.getItem('commission_tracker_policies');
      const policies = stored ? JSON.parse(stored) : [];
      return policies.length;
    });
    console.log(`📊 Initial policies count: ${initialCount}\n`);

    // Add a test policy directly to localStorage
    console.log('➕ Adding test policy to localStorage...');
    const newPolicy = await page.evaluate(() => {
      const STORAGE_KEY = 'commission_tracker_policies';

      // Get existing policies
      const stored = localStorage.getItem(STORAGE_KEY);
      const policies = stored ? JSON.parse(stored) : [];

      // Create new policy
      const testPolicy = {
        id: 'browser-test-' + Date.now(),
        policyNumber: 'BROWSER-' + Math.floor(Math.random() * 10000),
        status: 'active',
        client: {
          name: 'Browser Test Client',
          state: 'CA',
          age: 40,
          email: 'browser@test.com',
          phone: '555-9876'
        },
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: new Date().toISOString(),
        annualPremium: 6000, // $500/month * 12
        paymentFrequency: 'monthly',
        commissionPercentage: 80,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: 'Added via Puppeteer test'
      };

      // Add to array
      policies.push(testPolicy);

      // Save back
      localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));

      return testPolicy;
    });

    console.log(`✅ Added policy: ${newPolicy.policyNumber}`);
    console.log(`   Client: ${newPolicy.client.name}`);
    console.log(`   Premium: $${newPolicy.annualPremium}/year\n`);

    // Reload page to see if policy appears
    console.log('🔄 Reloading page...');
    await page.reload({ waitUntil: 'networkidle0' });

    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    // Check if policy appears in the table
    const policyVisible = await page.evaluate((policyNumber) => {
      const elements = Array.from(document.querySelectorAll('td'));
      return elements.some(el => el.textContent?.includes(policyNumber));
    }, newPolicy.policyNumber);

    if (policyVisible) {
      console.log('✅ SUCCESS: Policy appears in the UI after reload!');
    } else {
      console.log('❌ FAIL: Policy NOT visible in the UI after reload');

      // Take a screenshot for debugging
      await page.screenshot({ path: 'policy-test-fail.png', fullPage: true });
      console.log('📸 Screenshot saved as policy-test-fail.png');
    }

    // Final verification
    const finalCount = await page.evaluate(() => {
      const stored = localStorage.getItem('commission_tracker_policies');
      const policies = stored ? JSON.parse(stored) : [];
      return policies.length;
    });
    console.log(`\n📊 Final policies count: ${finalCount}`);
    console.log(`📈 Added ${finalCount - initialCount} policy(ies)`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test complete. Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testPolicyAddition();
} catch (e) {
  console.log('Puppeteer not installed. Install with: npm install puppeteer');
  console.log('Or run the ADD-POLICY-NOW.js script manually in the browser console.');
}