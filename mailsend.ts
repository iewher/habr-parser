const nodemailer = require("nodemailer");
const data = require("./data.json");
const config = require("./config.json");

/* 
В поле smtp вставляем сервер простой протокол передачи почты:
smtp всегда начинается с smtp.example.ru
Пример:
smtp.mail.ru
*/

const smtp = "smtp.yandex.ru";

/* 
В поле subject вставляем заголовок, который хотим отправлять
*/

const subject = "По поводу трудоустройства";

/* 
В поле mail_text вставляем текст, который хотим отправлять
*/

const mail_text = `
Здравствуйте, меня зовут Георгий, я являюсь Frontend-разработчиком на Next.js  + TypeScript с коммерческим опытом работы - 1 год, заинтересовала ваша компания, хотелось бы поработать у вас для получения дополнительного опыта, прилагаю свое резюме.

Спасибо за внимание,
жду обратной связи

Всего доброго, Георгий.
`;

/*
Вставляем ссылку на свое резюме
*/

const existingResumePath = "resume.pdf";

const user = {
  mail: config.mail,
  pass: config.pass,
};

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

  data.mail.forEach((sendto) => {
    const mailOptions = {
      from: user.mail,
      to: sendto,
      subject: subject,
      text: mail_text,
      attachments: [
        {
          filename: "resume.pdf",
          path: existingResumePath,
          encoding: "base64",
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      try {
        console.log(`Сообщение отправлено на ${sendto}: ${info.response}`);
      } catch (err) {
        console.log(`Ошибка при отправке на ${sendto}: ${error}`);
      }
    });
  });

  console.log(data.mail);
};

mailsend();
