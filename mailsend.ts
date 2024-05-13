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
Здравствуйте,

Меня зовут Георгий, и я фронтенд разработчик с опытом работы - год. Я хочу с вами поделиться своим резюме и выразить свой интерес к возможности трудоустройства в качестве trainee/junior frontend-разработчика.

Мои основные инструменты разработки включают TypeScript, JavaScript, SCSS, HTML и React. На данный момент активно изучаю Java, Spring boot. Я имею опыт работы с ними и готов развивать свои навыки и обучаться новым технологиям.

Я заинтересован в работе в вашей компании и считаю, что смогу внести ценный вклад в команду. Я мотивирован учиться и расти профессионально.

Прилагаю свое резюме для вашего рассмотрения - https://perm.hh.ru/resume/cc992648ff0bf41b6c0039ed1f6e71704b696b.

Так же оставлю в файловом виде в прикрепленном сообщении.

Прилагаю свой github для вашего рассмотрения - https://github.com/iewher. 

Буду рад обсудить возможность трудоустройства и ответить на любые вопросы.

Жду обратную связь даже в случае отказа, ответ прошу дать в обратном сообщении.

С уважением,
Георгий`;

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
