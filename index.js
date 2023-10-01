const puppeteer = require("puppeteer");
const fs = require("fs");

const parser = async () => {
  console.log("parser started");
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  console.log("20%");
  await page.goto(
    "https://career.habr.com/vacancies?page=1&q=react&type=suitable"
  );
  // await page.screenshot({ path: "img.png" });
  console.log("40%");

  const arr = await page.evaluate(() => {
    const text = Array.from(
      document.querySelectorAll(".vacancy-card__title-link"),
      (el) => el.innerText
    );

    console.log("60%");

    return text;
  });

  fs.writeFileSync("company.txt", arr.join("\n"), "utf-8");
  console.log("80%");

  await browser.close();
  console.log("parser finished");
};

parser();
