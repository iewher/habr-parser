package mailer

import (
	"fmt"
	"log"

	"habrparser/pkg/models"

	"gopkg.in/gomail.v2"
)

type Mailer struct {
	Config *models.MailConfig
}

func NewMailer(config *models.MailConfig) *Mailer {
	return &Mailer{
		Config: config,
	}
}

func (m *Mailer) SendToEmails(emails []string) error {
	if len(emails) == 0 {
		fmt.Println("Список адресатов пуст")
		return nil
	}

	d := gomail.NewDialer(
		m.Config.SMTPHost,
		m.Config.SMTPPort,
		m.Config.FromEmail,
		m.Config.FromPassword,
	)

	for _, sendTo := range emails {
		msg := gomail.NewMessage()
		msg.SetHeader("From", m.Config.FromEmail)
		msg.SetHeader("To", sendTo)
		msg.SetHeader("Subject", m.Config.Subject)
		msg.SetBody("text/plain", m.Config.Body)

		if err := d.DialAndSend(msg); err != nil {
			log.Printf("Ошибка при отправке на %s: %v", sendTo, err)
		} else {
			log.Printf("Сообщение отправлено на %s", sendTo)
		}
	}

	log.Println("Отправленные адреса:", emails)
	fmt.Println("Рассылка завершена успешно")

	return nil
}
