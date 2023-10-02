const puppeteer = require("puppeteer");
const fs = require("fs");
const cliProgress = require("cli-progress");
const { log } = require("console");

const parser = async () => {
  const bar1 = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  console.log("Парсер запущен");
  bar1.start(100, 0);
  const browser = await puppeteer.launch({ headless: false });
  bar1.update(20);
  const page = await browser.newPage();
  await page.goto(
    "https://career.habr.com/vacancies?page=1&q=react&type=suitable"
  );
  bar1.update(40);

  const array_name = await page.evaluate(() => {
    const name = Array.from(
      document.querySelectorAll(".vacancy-card__title-link"),
      (el) => el.innerText
    );

    return name;
  });

  const array_links = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll(".vacancy-card__title-link"),
      (el) => el.getAttribute("href")
    );

    return links;
  });

  bar1.update(60);

  const links_combined = array_name.map(
    (name, index) => `${name} - https://career.habr.com${array_links[index]}}`
  );
  fs.writeFileSync("vacancies.txt", links_combined.join("\n"), "utf-8");

  const new_pages = [];
  const all_sites = [];

  for (let i = 0; i < array_links.length; i++) {
    const new_page = await browser.newPage();
    await new_page.goto(`https://career.habr.com${array_links[i]}`);

    const array_site = await new_page.evaluate(() => {
      const siteElement = document.querySelector(".company_site");
      return siteElement ? siteElement.innerText : null;
    });

    all_sites.push(array_site);
    new_pages.push(new_page);

    await new_page.close();
  }

  const site_urls = all_sites.map((site) => "https://" + site);
  fs.writeFileSync("site.txt", site_urls.join("\n"), "utf-8");

  await Promise.all(new_pages);

  bar1.update(100);
  bar1.stop();

  await browser.close();
  console.log("Создан текстовый файл vacancies.txt");
  console.log("Создан текстовый файл site.txt");
  console.log("Парсер закончил работу успешно");
};

parser();

//TODO: открывает каждую ссылку
//TODO: забирает DOM обьект по классу company_site и забираем оттуда текст
//TODO: записываем текст в отдельный файл site.txt
//TODO: переходим по каждой ссылке из site.txt
