const puppeteer = require("puppeteer");
const fs = require("fs");
const cliProgress = require("cli-progress");
const nodemailer = require("nodemailer");
const data = require("./data.json");

/* 
В поле smtp вставляем сервер простой протокол передачи почты:
smtp всегда начинается с smtp.example.ru
Пример:
smpt.mail.ru
*/

const smtp = "";

/* 
В поле subject вставляем заголовок, который хотим отправлять
*/

const subject = "";

/* 
В поле mail_text вставляем текст, который хотим отправлять
*/

const mail_text = "";

/* 
В поле mail вставляем свою почту
В поле pass вставляем пароль для внешних приложений
*/

const user = {
  mail: "",
  pass: "",
};

const sendto = "";

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

  for (let current_page = 1; current_page <= 5; current_page++) {
    const new_page = await browser.newPage();
    const pagePromise = new_page
      .goto(
        `https://career.habr.com/vacancies?page=${current_page}&q=react&type=suitable`
      )
      .then(async () => {
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
      })
      .catch((error) => {
        fs.appendFileSync(
          "error.txt",
          `${date} - Ошибка при открытии страницы https://career.habr.com/vacancies?page=${current_page}. ${error.message}\n`,
          "utf-8"
        );
      })
      .finally(async () => {
        await new_page.close();
      });

    pagePromises.push(pagePromise);
  }

  await Promise.all(pagePromises);

  data.vacancies = links_combined.map((link) => link.replace(/ - /, " - "));
  fs.writeFileSync(`data.json`, JSON.stringify(data, null, 2), "utf-8");

  for (let i = 0; i < all_links.length; i++) {
    const new_page = await browser.newPage();
    const pagePromise = new_page
      .goto(all_links[i])
      .then(async () => {
        const array_site = await new_page.evaluate(() => {
          const site_company = document.querySelector(".company_site");
          return site_company ? site_company.textContent : null;
        });

        if (array_site && !all_sites.includes(array_site)) {
          all_sites.push(array_site);
        }
      })
      .catch((error) => {
        fs.appendFileSync(
          "error.txt",
          `${date} - Ошибка при открытии страницы ${all_links[i]}. ${error.message}\n`,
          "utf-8"
        );
      })
      .finally(async () => {
        await new_page.close();
      });

    pagePromises.push(pagePromise);

    bar1.update(60 + ((i + 1) / all_links.length) * 20);
  }

  await Promise.all(pagePromises);

  data.sites = all_sites;
  fs.writeFileSync(`data.json`, JSON.stringify(data, null, 2), "utf-8");

  await Promise.all(new_pages);

  for (let i = 0; i < all_sites.length; i++) {
    const new_page = await browser.newPage();
    const pagePromise = new_page
      .goto(`https://${all_sites[i]}`)
      .then(async () => {
        fs.appendFileSync(
          "log.txt",
          `${date} - Страница успешно открыта ${all_sites[i]}\n`,
          "utf-8"
        );

        const hrefValue = await new_page.evaluate(() => {
          const elementsWithHref =
            document.querySelectorAll('[href*="mailto"]');
          if (elementsWithHref.length > 0) {
            return elementsWithHref[0].getAttribute("href");
          }
          return null;
        });

        if (hrefValue !== null) {
          all_mail.push(hrefValue.replace(/mailto:/g, ""));
        }
      })
      .catch((error) => {
        fs.appendFileSync(
          "error.txt",
          `${date} - Ошибка при открытии страницы ${all_sites[i]}. ${error.message}\n`,
          "utf-8"
        );
      })
      .finally(async () => {
        await new_page.close();
      });

    pagePromises.push(pagePromise);

    bar1.update(80 + ((i + 1) / all_sites.length) * 20);
  }

  await Promise.all(pagePromises);

  data.mail = all_mail;
  fs.writeFileSync(`data.json`, JSON.stringify(data, null, 2), "utf-8");

  bar1.update(100);
  bar1.stop();

  await browser.close();
  console.log("Создан файл data.json");
  console.log("Парсер закончил работу успешно");
};

parser();

const mailsend = async () => {
  const transporter = nodemailer.createTransport({
    host: smtp,
    port: 465,
    secure: true,
    auth: {
      user: user.mail,
      pass: user.pass,
    },
  });

  const mailOptions = {
    from: user.mail,
    to: sendto,
    subject: subject,
    text: mail_text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(`Ошибка при отправке на ${sendto}: ${error}`);
    } else {
      console.log(`Сообщение отправлено на ${sendto}: ${info.response}`);
    }
  });
};

mailsend();
