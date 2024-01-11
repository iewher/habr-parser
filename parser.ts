const puppeteer = require("puppeteer");
const fs = require("fs");
const cliProgress = require("cli-progress");

const parser = async () => {
  const new_pages = [];
  const pagePromises = [];
  const all_sites = [];
  const all_mail = [];
  const data = {
    vacancies: [],
    sites: [],
    mail: [],
  };
  let links_combined = [];
  let all_links = [];

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
  ##     ##    ###    ########  ########          ########     ###    ########   ######  ######## ########  
  ##     ##   ## ##   ##     ## ##     ##         ##     ##   ## ##   ##     ## ##    ## ##       ##     ## 
  ##     ##  ##   ##  ##     ## ##     ##         ##     ##  ##   ##  ##     ## ##       ##       ##     ## 
  ######### ##     ## ########  ########  ####### ########  ##     ## ########   ######  ######   ########  
  ##     ## ######### ##     ## ##   ##           ##        ######### ##   ##         ## ##       ##   ##   
  ##     ## ##     ## ##     ## ##    ##          ##        ##     ## ##    ##  ##    ## ##       ##    ##  
  ##     ## ##     ## ########  ##     ##         ##        ##     ## ##     ##  ######  ######## ##     ## 
  `;

  console.log(logo);
  console.log("Парсер запущен\n");

  bar1.start(100, 0);

  const browser = await puppeteer.launch({ headless: false });
  bar1.update(20);

  const processPagesConcurrently = async (
    startPage,
    endPage,
    concurrentPages
  ) => {
    for (
      let current_page = startPage;
      current_page <= endPage;
      current_page += concurrentPages
    ) {
      const pagePromises = [];

      for (let i = 0; i < concurrentPages; i++) {
        const page = current_page + i;
        if (page <= endPage) {
          pagePromises.push(processPage(page));
        }
      }

      await Promise.all(pagePromises);
    }
  };

  const processSitesConcurrently = async (all_links, concurrentPages) => {
    for (let i = 0; i < all_links.length; i += concurrentPages) {
      const pagePromises = [];

      for (let j = 0; j < concurrentPages; j++) {
        const linkIndex = i + j;
        if (linkIndex < all_links.length) {
          pagePromises.push(processSite(all_links[linkIndex]));
        }
      }

      for (const pagePromise of pagePromises) {
        await pagePromise;
      }
    }
  };

  const processEmailsConcurrently = async (all_sites, concurrentPages) => {
    for (let i = 0; i < all_sites.length; i += concurrentPages) {
      const pagePromises = [];

      for (let j = 0; j < concurrentPages; j++) {
        const siteIndex = i + j;
        if (siteIndex < all_sites.length) {
          pagePromises.push(processEmail(all_sites[siteIndex]));
        }
      }

      for (const pagePromise of pagePromises) {
        await pagePromise;
      }
    }
  };

  const processPage = async (current_page) => {
    const new_page = await browser.newPage();
    try {
      await new_page.goto(
        `https://career.habr.com/vacancies?page=${current_page}`
      );
      bar1.update(40);

      const array_name = await new_page.evaluate(() => {
        const name = Array.from(
          document.querySelectorAll(".vacancy-card__title-link"),
          (el) => el.textContent
        );
        return name;
      });

      const array_links = await new_page.evaluate(() => {
        const links = Array.from(
          document.querySelectorAll(".vacancy-card__title-link"),
          (el) => el.getAttribute("href")
        );
        return links;
      });

      const pageLinksCombined = array_name.map(
        (name, index) =>
          `${name} - https://career.habr.com${array_links[index]}`
      );

      links_combined = links_combined.concat(pageLinksCombined);
      all_links = all_links.concat(
        array_links.map((link) => `https://career.habr.com${link}`)
      );
    } catch (error) {
      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при открытии страницы https://career.habr.com/vacancies?page=${current_page}. ${error.message}\n`,
        "utf-8"
      );
    } finally {
      await new_page.close();
    }
  };

  /*
  Используйте processPagesConcurrently для обработки 10 страниц одновременно
  1 значение - начало
  2 значение - конец
  3 значение - шаг
  */

  await processPagesConcurrently(1, 113, 15);

  data.vacancies = links_combined.map((link) => link.replace(/ - /, " - "));
  fs.writeFileSync(`data.json`, JSON.stringify(data, null, 2), "utf-8");

  const processSite = async (link) => {
    const new_page = await browser.newPage();
    try {
      await new_page.goto(link);

      const array_site = await new_page.evaluate(() => {
        const site_company = document.querySelector(".company_site");
        return site_company ? site_company.textContent : null;
      });

      if (array_site && !all_sites.includes(array_site)) {
        all_sites.push(array_site);
      }
    } catch (error) {
      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при открытии страницы ${link}. ${error.message}\n`,
        "utf-8"
      );
    } finally {
      await new_page.close();
    }
  };

  await processSitesConcurrently(all_links, 25);

  data.sites = all_sites;
  fs.writeFileSync(`data.json`, JSON.stringify(data, null, 2), "utf-8");

  const processEmail = async (site) => {
    const new_page = await browser.newPage();
    try {
      await new_page.goto(`https://${site}`);
      fs.appendFileSync(
        "log.txt",
        `${date} - Страница успешно открыта ${site}\n`,
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
    } catch (error) {
      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при открытии страницы ${site}. ${error.message}\n`,
        "utf-8"
      );
    } finally {
      await new_page.close();
    }
  };

  await processEmailsConcurrently(all_sites, 25);

  data.mail = all_mail;
  fs.writeFileSync(`data.json`, JSON.stringify(data, null, 2), "utf-8");

  bar1.update(100);
  bar1.stop();

  await browser.close();
  console.log("Создан файл data.json");
  console.log("Парсер закончил работу успешно");
};

parser();
