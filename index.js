const puppeteer = require("puppeteer");
const fs = require("fs");
const cliProgress = require("cli-progress");

const parser = async () => {
  const new_pages = [];
  const all_sites = [];
  const all_mail = [];
  const data = {
    vacancies: [],
    sites: [],
    mail: [],
  };

  const bar1 = new cliProgress.SingleBar(
    {
      format:
        "[{bar}] {percentage}% | Завершено: {value}/{total} | Осталось времени: {eta_formatted}",
    },
    cliProgress.Presets.shades_classic
  );

  const time = new Date();
  const date = `[${time.getHours()}h : ${time.getMinutes()}m : ${time.getSeconds()}s]`;

  const logo = `
  ##     ## ##     ## ########     ###    ########   ######  ######## ########  
  ##     ## ##     ## ##     ##   ## ##   ##     ## ##    ## ##       ##     ## 
  ##     ## ##     ## ##     ##  ##   ##  ##     ## ##       ##       ##     ## 
  ######### ######### ########  ##     ## ########   ######  ######   ########  
  ##     ## ##     ## ##        ######### ##   ##         ## ##       ##   ##   
  ##     ## ##     ## ##        ##     ## ##    ##  ##    ## ##       ##    ##  
  ##     ## ##     ## ##        ##     ## ##     ##  ######  ######## ##     ## 
  `;

  console.log(logo);
  console.log("Парсер запущен\n");

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
    (name, index) =>
      `${index + 1}. ${name} - https://career.habr.com${array_links[index]}`
  );

  data.vacancies = links_combined.map((link) => link.replace(/ - /, " - "));
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2), "utf-8");

  await page.close();

  for (let i = 0; i < array_links.length; i++) {
    const new_page = await browser.newPage();
    await new_page.goto(`https://career.habr.com${array_links[i]}`);

    const array_site = await new_page.evaluate(() => {
      const site_company = document.querySelector(".company_site");
      return site_company ? site_company.innerText : null;
    });

    if (array_site && !all_sites.includes(array_site)) {
      all_sites.push(array_site);
    }

    new_pages.push(new_page);

    bar1.update(60 + ((i + 1) / array_links.length) * 20);

    await new_page.close();
  }

  data.sites = all_sites;
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2), "utf-8");

  const site_urls = all_sites.map(
    (site, index) => `${index + 1}. https://${site}`
  );

  await Promise.all(new_pages);

  for (let i = 0; i < all_sites.length; i++) {
    try {
      const new_page = await browser.newPage();
      await new_page.goto(`https://${all_sites[i]}`);

      fs.appendFileSync(
        "log.txt",
        `${date} - Страница успешно открыта ${all_sites[i]}\n`,
        "utf-8"
      );

      const hrefValue = await new_page.evaluate(() => {
        const elementsWithHref = document.querySelectorAll('[href*="mailto"]');
        if (elementsWithHref.length > 0) {
          return elementsWithHref[0].getAttribute("href");
        }
        return null;
      });

      if (hrefValue !== null) {
        all_mail.push(hrefValue.replace(/mailto:/g, ""));
      }

      await new_page.close();
    } catch (error) {
      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при открытии страницы ${all_sites[i]}. ${error.message}\n`,
        "utf-8"
      );
    }

    bar1.update(80 + ((i + 1) / all_sites.length) * 20);
  }

  data.mail = all_mail;
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2), "utf-8");

  bar1.update(100);
  bar1.stop();

  await browser.close();
  console.log("Создан файл data.json");
  console.log("Парсер закончил работу успешно");
};

parser();
