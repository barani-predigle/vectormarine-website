const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4137', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const mapBox = await page.evaluate(() => {
    const el = document.getElementById('maptiler-base');
    const canvas = el.querySelector('canvas');
    return {
      elWidth: el.clientWidth,
      elHeight: el.clientHeight,
      canvasWidth: canvas ? canvas.clientWidth : null,
      canvasHeight: canvas ? canvas.clientHeight : null,
      elStyles: window.getComputedStyle(el).cssText.includes('display: none'),
      canvasDisplay: canvas ? window.getComputedStyle(canvas).display : null,
      canvasVisibility: canvas ? window.getComputedStyle(canvas).visibility : null,
      canvasOpacity: canvas ? window.getComputedStyle(canvas).opacity : null,
      parentHeight: el.parentElement.clientHeight
    };
  });
  console.log('Box:', mapBox);

  await browser.close();
})();
