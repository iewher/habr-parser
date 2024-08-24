package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"gopkg.in/gomail.v2"
)

type Config struct {
	Mail string
	Pass string
}

type MailProps struct {
	Mail []string
}

func main() {
	logo := `
_           _                                              
| |__   __ _| |__  _ __      _ __   __ _ _ __ ___  ___ _ __ 
| '_ \ / _` + "`" + ` | '_ \| '__|____| '_ \ / _` + "`" + ` | '__/ __|/ _ \ '__|
| | | | (_| | |_) | | |_____| |_) | (_| | |  \__ \  __/ |   
|_| |_|\__,_|_.__/|_|       | .__/ \__,_|_|  |___/\___|_|   
                            |_|                             
`
	fmt.Println(logo)

	// Загрузка конфигурации из JSON.
	configFile, err := os.Open("config.json")
	if err != nil {
		log.Fatal(err)
	}
	defer configFile.Close()

	var config Config
	if err := json.NewDecoder(configFile).Decode(&config); err != nil {
		log.Fatal(err)
	}

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

	var subject string
	var mailText string

	fmt.Print("\nЗаголовок: ")
	fmt.Fscan(os.Stdin, &subject)

	fmt.Printf("\nТекст сообщения: \n")
	fmt.Fscan(os.Stdin, &mailText)

	// В дальнейшем можно убрать эти поля.
	// Позволить пользователю самому выбирать с какой почты отсылать сообщение.
	smtpHost := "smtp.yandex.ru"
	smtpPort := 465

	// Отправка писем
	for _, sendTo := range data.Mail {
		m := gomail.NewMessage()
		m.SetHeader("From", config.Mail)
		m.SetHeader("To", sendTo)
		m.SetHeader("Subject", subject)
		m.SetBody("text/plain", mailText)

		d := gomail.NewDialer(smtpHost, smtpPort, config.Mail, config.Pass)

		if err := d.DialAndSend(m); err != nil {
			log.Printf("Ошибка при отправке на %s: %v", sendTo, err)
		} else {
			log.Printf("Сообщение отправлено на %s", sendTo)
		}
	}

	log.Println("Отправленные адреса:", data.Mail)
}
