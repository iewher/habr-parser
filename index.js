const puppeteer = require("puppeteer");
const fs = require("fs");
const cliProgress = require("cli-progress");

const parser = async () => {
  const bar1 = new cliProgress.SingleBar(
    {
      format:
        "[{bar}] {percentage}% | Завершено: {value}/{total} | Осталось времени: {eta_formatted}",
    },
    cliProgress.Presets.shades_classic
  );
  const time = new Date();
  const date = (`[${time.getHours()}h : ${time.getMinutes()}m : ${time.getSeconds()}s]`)
  const logo = (`
  ##     ## ##     ## ########     ###    ########   ######  ######## ########  
  ##     ## ##     ## ##     ##   ## ##   ##     ## ##    ## ##       ##     ## 
  ##     ## ##     ## ##     ##  ##   ##  ##     ## ##       ##       ##     ## 
  ######### ######### ########  ##     ## ########   ######  ######   ########  
  ##     ## ##     ## ##        ######### ##   ##         ## ##       ##   ##   
  ##     ## ##     ## ##        ##     ## ##    ##  ##    ## ##       ##    ##  
  ##     ## ##     ## ##        ##     ## ##     ##  ######  ######## ##     ## 
  `)
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
  fs.writeFileSync("vacancies.txt", links_combined.join("\n"), "utf-8");

  const new_pages = [];
  const all_sites = [];

  await page.close();

  for (let i = 0; i < array_links.length; i++) {
    const new_page = await browser.newPage();
    await new_page.goto(`https://career.habr.com${array_links[i]}`);

    //TODO: добавить фильтрацию сайтов по названию, без повторов

    const array_site = await new_page.evaluate(() => {
      const site_company = document.querySelector(".company_site");
      return site_company ? site_company.innerText : null;
    });

    all_sites.push(array_site);
    new_pages.push(new_page);

    bar1.update(60 + ((i + 1) / array_links.length) * 20);

    await new_page.close();
  }

  const site_urls = all_sites.map(
    (site, index) => `${index + 1}. https://${site}`
  );
  fs.writeFileSync("sites.txt", site_urls.join("\n"), "utf-8");

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
      // await new_page.close();
    } catch (error) {
      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при открытии страницы ${all_sites[i]}. ${error.message}\n`,
        "utf-8"
      );
    }

    bar1.update(80 + ((i + 1) / all_sites.length) * 20);
  }

  bar1.update(100);
  bar1.stop();

  await browser.close();
  console.log("Созданы текстовые файлы vacancies.tst, site.txt");
  console.log("Создан log.txt");
  console.log(
    "Если с какой-то итерацией возникла проблема, она будет отображена в error.txt"
  );
  console.log("Парсер закончил работу успешно");
};

parser();
