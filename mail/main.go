package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gopkg.in/gomail.v2"
)

type MailProps struct {
	Mail []string
}

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

	// Загрузка данных из JSON.
	dataFile, err := os.Open("data.json")
	if err != nil {
		log.Fatal(err)
	}
	defer dataFile.Close()

	var data MailProps
	if err := json.NewDecoder(dataFile).Decode(&data); err != nil {
		log.Fatal(err)
	}

	subject := "/* введите сюда заголовок */"
	mailText := `/* введите сюда сообщение */`

	// В дальнейшем можно убрать эти поля.
	// Позволить пользователю самому выбирать с какой почты отсылать сообщение.
	smtpHost := "smtp.yandex.ru"
	smtpPort := 465

	// Отправка писем
	for _, sendTo := range data.Mail {
		m := gomail.NewMessage()
		m.SetHeader("From", mail)
		m.SetHeader("To", sendTo)
		m.SetHeader("Subject", subject)
		m.SetBody("text/plain", mailText)

		d := gomail.NewDialer(smtpHost, smtpPort, mail, password)

		if err := d.DialAndSend(m); err != nil {
			log.Printf("Ошибка при отправке на %s: %v", sendTo, err)
		} else {
			log.Printf("Сообщение отправлено на %s", sendTo)
		}
	}

	log.Println("Отправленные адреса:", data.Mail)
}
