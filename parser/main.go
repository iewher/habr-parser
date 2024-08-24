package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"

	"github.com/PuerkitoBio/goquery"
)

type ParserProps struct {
	Vacancies []string
	Sites     []string
	Mail      []string
}

func main() {
	var sites []string
	var mails []string
	var combinedLinks []string
	var links []string

	logo := `
_           _                                              
| |__   __ _| |__  _ __      _ __   __ _ _ __ ___  ___ _ __ 
| '_ \ / _` + "`" + ` | '_ \| '__|____| '_ \ / _` + "`" + ` | '__/ __|/ _ \ '__|
| | | | (_| | |_) | | |_____| |_) | (_| | |  \__ \  __/ |   
|_| |_|\__,_|_.__/|_|       | .__/ \__,_|_|  |___/\___|_|   
                            |_|                             
`
	fmt.Println(logo)

	var countPages int

	fmt.Print("Количество страниц для обработки: ")
	fmt.Fscan(os.Stdin, &countPages)

	fmt.Println("\n\nПарсер запущен")

	var wg sync.WaitGroup

	// Получаем список вакансий.
	for i := 1; i <= countPages; i++ {
		wg.Add(1)
		go func(page int) {
			defer wg.Done()
			url := fmt.Sprintf("https://career.habr.com/vacancies?page=%d&type=all", page)
			resp, err := http.Get(url)
			if err != nil {
				fmt.Printf("Ошибка при загрузке страницы %d: %s\n", page, err)
				return
			}
			defer resp.Body.Close()

			if doc, err := goquery.NewDocumentFromReader(resp.Body); err == nil {
				doc.Find(".vacancy-card__title-link").Each(func(index int, element *goquery.Selection) {
					name := element.Text()
					link, _ := element.Attr("href")
					vacancyInfo := fmt.Sprintf("%s - https://career.habr.com%s", name, link)
					combinedLinks = append(combinedLinks, vacancyInfo)
					links = append(links, "https://career.habr.com"+link)
					fmt.Println("Получили данные -", vacancyInfo)
				})
			}
		}(i)
	}

	wg.Wait()

	// Получить список сайтов.
	fmt.Println("\n\n2. Получаем список сайтов")
	for _, link := range links {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()
			resp, err := http.Get(url)
			if err != nil {
				fmt.Println("Не удалось получить сайт -", url)
				return
			}
			defer resp.Body.Close()

			if doc, err := goquery.NewDocumentFromReader(resp.Body); err == nil {
				siteCompany := doc.Find(".company_site").Text()
				if siteCompany != "" {
					siteURL := "https://" + siteCompany
					if !contains(sites, siteURL) {
						sites = append(sites, siteURL)
						fmt.Println("Получили сайт -", siteURL)
					}
				}
			}
		}(link)
	}

	wg.Wait()

	// Получаем список почтовых адресов.
	fmt.Println("\n\n3. Получаем список почтовых ящиков")
	for _, site := range sites {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()
			resp, err := http.Get(url)
			if err != nil {
				fmt.Println("Ошибка при загрузке страницы:", url)
				return
			}
			defer resp.Body.Close()

			if doc, err := goquery.NewDocumentFromReader(resp.Body); err == nil {
				doc.Find("[href*='mailto']").Each(func(index int, element *goquery.Selection) {
					href, _ := element.Attr("href")
					email := href[len("mailto:"):]
					if !contains(mails, email) {
						mails = append(mails, email)
						fmt.Println("Получили почту -", email)
					}
				})
			}
		}(site)
	}

	wg.Wait()

	// Сохраняем данные в JSON файл.
	data := ParserProps{Vacancies: combinedLinks, Sites: sites, Mail: mails}
	jsonData, _ := json.MarshalIndent(data, "", "  ")
	if err := os.WriteFile("data.json", jsonData, 0644); err != nil {
		fmt.Println("Ошибка записи в файл:", err)
		return
	}

	fmt.Println("\nСоздан файл data.json")
	fmt.Println("Парсер успешно завершен")

	// Минимальный анализ работы программы.
	fmt.Println("\nКоличество обработанных вакансий: ", len(links))
	fmt.Println("Количество обработанных сайтов: ", len(sites))
	fmt.Println("Количество обработанных почтовых адресов: ", len(mails))
}

func contains(slice []string, item string) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}
