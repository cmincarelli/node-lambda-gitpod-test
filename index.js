const chromium = require('chrome-aws-lambda');

// This is where we'll put the code to get around the tests.
const preparePageForTests = async (page) => {
  // Pass the User-Agent Test.
  const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
  await page.setUserAgent(userAgent);

  // Pass the Webdriver Test.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // Pass the Chrome Test.
  await page.evaluateOnNewDocument(() => {
    // We can mock this in as much depth as we need for the test.
    window.navigator.chrome = {
      runtime: {},
      // etc.
    };
  });

  // Pass the Permissions Test.
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    return window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  // Pass the Plugins Length Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, 'plugins', {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5],
    });
  });

  // Pass the Languages Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });
}

exports.handler = async (event, context) => {
  let result = null;
  let browser = null;

  try {

    browser = await chromium.puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true || chromium.headless,
    });

    let page = await browser.newPage();
    // await preparePageForTests(page);
    await page.goto(event.Records[0].body || 'https://example.com', {
        waitUntil: 'networkidle0',
    });

    result = await page.content();
    console.log('success');

  } catch (error) {
    console.log('fail', error, await chromium.executablePath);
    return context.fail(error, );

  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return context.succeed(result);
};