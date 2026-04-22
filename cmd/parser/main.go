package main

import (
	"encoding/json"
	"fmt"
	"os"

	"habrparser/internal/parser"
)

func main() {
	logo := `
_           _                                              
| |__   __ _| |__ _ __      _ __   __ _ _ __ ___  ___ _ __
| '_ \ / _` + "`" + ` | '_ \| '__|____| '_ \ / _` + "`" + ` | '__/ __|/ _ \ '__|
| | | | (_| | |_) | | |_____| |_) | (_| | |  \__ \  __/ |   
|_| |_|\__,_|_.__/|_|       | .__/ \__,_|_|  |___/\___|_|   
                            |_|                             
`
	fmt.Println(logo)

	var countPages int
	var grade string
	var salary string

	fmt.Print("Количество страниц для обработки: ")
	fmt.Fscan(os.Stdin, &countPages)

	// Ограничить количество обрабатываемых страниц.
	if countPages < 1 || countPages > 200 {
		fmt.Printf("Неверное значение %v, введите не меньше 1 и не более 200\n", countPages)
		return
	}

	fmt.Print(`
[0] - Все
[1] - Стажер
[2] - Младший
[3] - Средний
[4] - Старший
[5] - Ведущий

Выберите грейд, по которому будет осуществляться поиск: `,
	)
	fmt.Fscan(os.Stdin, &grade)

	fmt.Print("Укажите минимальную заработную плату: ")
	fmt.Fscan(os.Stdin, &salary)

	fmt.Println("\n\nПарсер запущен")

	// Запустить парсер
	p := parser.NewParser()
	result, err := p.Parse(parser.ParserProps{
		CountPages: countPages,
		Grade:      grade,
		Salary:     salary,
	})
	if err != nil {
		fmt.Println("Ошибка при парсинге:", err)
		return
	}

	// Сохранить данные
	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Println("Ошибка сериализации JSON:", err)
		return
	}

	if err := os.WriteFile("data.json", jsonData, 0644); err != nil {
		fmt.Println("Ошибка записи в файл:", err)
		return
	}

	fmt.Println("\nСоздан файл data.json")
	fmt.Println("Парсер успешно завершен")
}
