package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"habrparser/internal/mailer"
	"habrparser/pkg/models"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	logo := `
_           _                                              
| |__   __ _| |__  _ __      _ __   __ _ _ __ ___  ___ _ __ 
| '_ \ / _` + "`" + ` | '_ \| '__|____| '_ \ / _` + "`" + ` | '__/ __|/ _ \ '__|
| | | | (_| | |_) | | |_____| |_) | (_| | |  \__ \  __/ |   
|_| |_|\__,_|_.__/|_|       | .__/ \__,_|_|  |___/\___|_|   
                            |_|                             
`
	fmt.Println(logo)

	mail := os.Getenv("MAIL")
	password := os.Getenv("PASSWORD")
	subject := os.Getenv("MESSAGE_SUBJECT")
	mailText := os.Getenv("MESSAGE_TEXT")

	// Загрузка данных из JSON.
	dataFile, err := os.Open("data.json")
	if err != nil {
		log.Fatal(err)
	}
	defer dataFile.Close()

	var data models.ParserResult
	if err := json.NewDecoder(dataFile).Decode(&data); err != nil {
		log.Fatal(err)
	}

	smtpHost := "smtp.yandex.ru"
	smtpPort := 465

	config := &models.MailConfig{
		SMTPHost:     smtpHost,
		SMTPPort:     smtpPort,
		FromEmail:    mail,
		FromPassword: password,
		Subject:      subject,
		Body:         mailText,
	}

	m := mailer.NewMailer(config)
	if err := m.SendToEmails(data.Emails); err != nil {
		log.Fatal("Ошибка при отправке писем:", err)
	}
}
