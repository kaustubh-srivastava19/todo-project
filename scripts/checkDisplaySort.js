const puppeteer = require('puppeteer');

function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);

  try {
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });

    // Open display dropdown
    await page.waitForSelector('#displayMenuBtn', { visible: true });
    await page.click('#displayMenuBtn');
    await page.waitForSelector('#displayDropdown', { visible: true });

    // Ensure List button is active by default
    const listActive = await page.$eval('#viewListBtn', el => el.classList.contains('active'));
    console.log('List active by default:', listActive);

    // Click Board and verify board visible and list hidden
    await page.waitForSelector('#viewBoardBtn', { visible: true });
    await page.click('#viewBoardBtn');
    await sleep(500);
    const boardEl = await page.$('#boardViewContainer');
    const boardVisible = boardEl ? await boardEl.evaluate(el => !el.classList.contains('hidden')) : false;
    const listEl = await page.$('#todo-list');
    const listHidden = listEl ? await listEl.evaluate(el => el.classList.contains('hidden')) : true;
    console.log('Board visible after selecting board:', boardVisible, 'List hidden:', listHidden);

    // Switch back to List
    await page.waitForSelector('#viewListBtn', { visible: true });
    await page.click('#viewListBtn');
    await sleep(500);
    const boardEl2 = await page.$('#boardViewContainer');
    const boardHiddenNow = boardEl2 ? await boardEl2.evaluate(el => el.classList.contains('hidden')) : true;
    const listEl2 = await page.$('#todo-list');
    const listVisibleNow = listEl2 ? await listEl2.evaluate(el => !el.classList.contains('hidden')) : false;
    console.log('Board hidden after selecting list:', boardHiddenNow, 'List visible:', listVisibleNow);

    // Test sorting: set sort by Title and fetch rendered first item text
    await page.waitForSelector('#sortBySelect', { visible: true });
    await page.select('#sortBySelect', 'title');
    await sleep(500);

    // Grab first task text in list
    const firstTask = await page.$eval('#todo-list li .todo-content-col span', el => el.textContent.trim());
    console.log('First task after Title sort:', firstTask);

    // Set sort by Due Date
    await page.waitForSelector('#sortBySelect', { visible: true });
    await page.select('#sortBySelect', 'dueDate');
    await sleep(500);
    const firstAfterDue = await page.$eval('#todo-list li .todo-content-col span', el => el.textContent.trim());
    console.log('First task after Due Date sort:', firstAfterDue);

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during UI check:', err);
    await browser.close();
    process.exit(2);
  }
})();
