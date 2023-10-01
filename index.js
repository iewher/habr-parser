console.log("parser started");

const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://github.com/iewher");
  await page.screenshot({ path: "img.png" });

  const arr = await page.evaluate(() => {
    let text = Array.from(
      document.querySelectorAll(".repo"),
      (el) => el.innerText
    );

    return text;
  });

  console.log(arr);
  await browser.close();
})();
