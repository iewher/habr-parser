const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const cliProgress = require("cli-progress");

const parser = async () => {
  const all_sites = [];
  const all_mail = [];
  const data = {
    vacancies: [],
    sites: [],
    mail: [],
  };
  let links_combined = [];
  let all_links = [];

  // Изменить, если нужно парнить не 100 страниц
  const value = 2;

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

  console.log("\n\n1. Получаем список вакансий\n\n");

  for (let i = 1; i <= value; i++) {
    const response = await axios.get(
      `https://career.habr.com/vacancies?page=${i}&type=all`,
    );

    console.log(`\n\nСтраница ${i}/${value}\n\n`);

    const chr = cheerio.load(response.data);

    try {
      chr(".vacancy-card__title-link").each((index, element) => {
        const name = chr(element).text().trim();

        const link = chr(element).attr("href");

        const vacancyInfo = `${name} - https://career.habr.com${link}`;

        console.log(`Получили данные - ${vacancyInfo}`);

        links_combined.push(vacancyInfo);

        all_links.push(`https://career.habr.com${link}`);
      });
    } catch (error) {
      console.error(`Ошибка при загрузке страницы: ${error.message}`);

      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при загрузке страницы: ${error.message}\n`,
        "utf-8",
      );
    }
  }

  console.log("\n\n2. Получаем список сайтов\n\n");

  for (let i = 0; i < all_links.length; i++) {
    try {
      const response = await axios.get(all_links[i]);

      const chr = cheerio.load(response.data);

      const site_company = chr(".company_site").text().trim();

      if (site_company && !all_sites.includes(`https://` + site_company)) {
        all_sites.push("https://" + site_company);
        console.log(`Получили сайт - https://${site_company}`);
      }
    } catch (error) {
      console.log(`Не удалось получить сайт - ${all_links[i]}`);

      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при загрузке страницы: ${error.message}\n`,
        "utf-8",
      );
    }
  }

  console.log("\n\n3. Получаем список почтовых ящиков\n\n");

  for (let i = 0; i < all_sites.length; i++) {
    try {
      const response = await axios.get(`${all_sites[i]}`);

      const chr = cheerio.load(response.data);

      const emailElement = chr('[href*="mailto"]');

      if (emailElement.length > 0) {
        const hrefValue = emailElement.attr("href");
        const email = hrefValue.replace("mailto:", "");

        if (!all_mail.includes(email)) {
          all_mail.push(email);
          console.log(`Получили почту - ${email}`);
        }
      }
    } catch (error) {
      console.error(`Ошибка при загрузке страницы: ${all_sites[i]}`);

      fs.appendFileSync(
        "error.txt",
        `${date} - Ошибка при загрузке страницы: ${error.message}\n`,
        "utf-8",
      );
    }
  }

  data.vacancies = links_combined.map((link) => link.replace(/ - /, " - "));
  data.sites = all_sites;
  data.mail = all_mail;
  fs.writeFileSync(`data.json`, JSON.stringify(data, null, 2), "utf-8");

  console.log("Создан файл data.json");
  console.log("Парсер успешно завершен");
};

parser();
