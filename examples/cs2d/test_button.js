const { chromium } = require('playwright');

(async () => {
  console.log('Starting button test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console messages and errors
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });
  
  console.log('\n=== Navigating to lobby ===');
  await page.goto('http://localhost:9292');
  await page.waitForLoadState('networkidle');
  
  // Fill form first
  await page.fill('#room_name', 'Button Test Room');
  
  // Get the button's onclick attribute (the second one is the actual create button)
  const buttonOnclick = await page.locator('#create-form button:has-text("創建房間")').getAttribute('onclick');
  console.log('\n=== Button onclick attribute:', buttonOnclick ? buttonOnclick.substring(0, 100) + '...' : 'NOT FOUND');
  
  // Try to evaluate the onclick directly
  console.log('\n=== Executing button onclick ===');
  await page.evaluate(() => {
    // Find the button in the create form
    const createForm = document.getElementById('create-form');
    const button = createForm ? createForm.querySelector('button') : null;
    
    if (button) {
      console.log('Found button, text:', button.textContent);
      // Try to get the onclick attribute and execute it
      const onclickAttr = button.getAttribute('onclick');
      if (onclickAttr) {
        console.log('Executing onclick attribute (first 100 chars):', onclickAttr.substring(0, 100));
        eval(onclickAttr);
      } else if (button.onclick) {
        console.log('Executing onclick function');
        button.onclick();
      } else {
        console.log('No onclick handler found!');
      }
    } else {
      console.log('Button not found in create-form!');
    }
  });
  
  // Wait for any async operations
  await page.waitForTimeout(3000);
  
  console.log('\n=== Test completed ===');
  await page.waitForTimeout(5000);
  
  await browser.close();
})().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});