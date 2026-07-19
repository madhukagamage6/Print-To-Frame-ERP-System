import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = path.join(__dirname, '..', 'Artifacts');

const URL = 'http://localhost:5173';

// Ensure Artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const takeScreenshot = async (page, name) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join(ARTIFACTS_DIR, `E2E-Fail-${name}-${timestamp}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`[📸 Screenshot saved] ${filepath}`);
};

const runTests = async () => {
  console.log('🚀 Starting Expanded E2E Puppeteer Suite...');
  
  // Launch with reduced slowMo for faster execution
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50, // Sped up from 300 to 50 for faster but still visible clicks
    defaultViewport: { width: 1280, height: 800 },
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.error(`[🚨 Page Error Detected]`, err.message);
  });
  
  const clickSidebarTab = async (tabName) => {
    console.log(`🔍 Navigating to [${tabName}]...`);
    await page.evaluate((name) => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const tabBtn = btns.find(b => b.textContent.trim() === name);
      if (tabBtn) tabBtn.click();
      else throw new Error(`Could not find ${name} tab in sidebar`);
    }, tabName);
    await new Promise(r => setTimeout(r, 1000)); // wait a second to ensure rendering
  };

  try {
    console.log(`🌐 Navigating to ${URL}...`);
    const response = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 10000 });
    
    if (!response.ok()) throw new Error(`Server returned ${response.status()}`);
    
    // LOGIN
    await page.waitForSelector('input[placeholder="admin or email..."]', { timeout: 5000 });
    console.log('🔑 Performing login...');
    await page.type('input[placeholder="admin or email..."]', 'admin');
    await page.type('input[placeholder="********"]', 'M');
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.textContent.includes('Login'));
      if (loginBtn) loginBtn.click();
    });

    await page.waitForSelector('nav', { timeout: 5000 });
    console.log('✅ Logged in successfully.');

    // ARRAY OF ALL TABS TO TEST
    const tabsToTest = [
      'Dashboard',
      'Leads',
      'Deals',
      'Invoices',
      'Customers',
      'Partners',
      'Execution Plan',
      'Fabrication Works',
      'Logistics',
      'Cost Calculator',
      'Messages',
      'Admin Panel'
    ];

    // LOOP THROUGH ALL TABS
    for (const tab of tabsToTest) {
      await clickSidebarTab(tab);
      
      // Perform feature-specific interaction checks where applicable
      if (tab === 'Leads') {
        console.log('  👉 Clicking first Kanban card to open modal...');
        await page.waitForSelector('.kanban-board', { timeout: 3000 }).catch(() => {});
        await page.evaluate(() => {
          const card = document.querySelector('.kanban-board > div > div > div'); // First card
          if (card) card.click();
        });
        await new Promise(r => setTimeout(r, 1000));
        
        console.log('  👉 Closing modal...');
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          // Find the "Cancel" or "Close" button by text, or just a generic lucide X button
          const cancelBtn = btns.find(b => b.textContent.includes('Cancel') || b.textContent.includes('Close'));
          if (cancelBtn) cancelBtn.click();
          else {
            // Fallback click outside or close icon
            const modalBg = document.querySelector('.fixed.inset-0.bg-black\\/50');
            if (modalBg) modalBg.click();
          }
        });
      }
      
      if (tab === 'Cost Calculator') {
        console.log('  👉 Testing pricing toggle...');
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const standardBtn = btns.find(b => b.textContent.includes('Standard'));
          if (standardBtn) standardBtn.click();
        });
      }

      if (tab === 'Fabrication Works') {
        console.log('  👉 Clicking first Fabrication Works card to open modal...');
        await page.evaluate(() => {
          const card = Array.from(document.querySelectorAll('.cursor-pointer')).find(el => el.textContent.includes('PTF-') || el.textContent.includes('J-24-'));
          if (card) card.click();
        });
        await new Promise(r => setTimeout(r, 1000));
        
        console.log('  👉 Closing Fabrication Works modal...');
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const closeBtn = btns.find(b => b.textContent.includes('Close Without Saving'));
          if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log('🎉 All Automated Debugging Tests Passed Successfully!');
    
    console.log('👀 Keeping browser open for 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED ❌');
    console.error(error.message);
    try {
      await takeScreenshot(page, 'Crash');
    } catch (e) {}
    console.log('👀 Keeping broken state open for 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    process.exit(1);
  } finally {
    console.log('🚪 Closing browser...');
    await browser.close();
  }
};

runTests();
