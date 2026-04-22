package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type ParserProps struct {
	Vacancies []string
	Sites     []string
	Mail      []string
}

func main() {
	var countPages int
	var grade string
	var salary string

	logo := `
_           _                                              
| |__   __ _| |__ _ __      _ __   __ _ _ __ ___  ___ _ __
| '_ \ / _` + "`" + ` | '_ \| '__|____| '_ \ / _` + "`" + ` | '__/ __|/ _ \ '__|
| | | | (_| | |_) | | |_____| |_) | (_| | |  \__ \  __/ |   
|_| |_|\__,_|_.__/|_|       | .__/ \__,_|_|  |___/\___|_|   
                            |_|                             
`
	fmt.Println(logo)

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

	fmt.Print(`Укажите минимальную заработную плату: `)
	fmt.Fscan(os.Stdin, &salary)

	fmt.Println("\n\nПарсер запущен")

	var wg sync.WaitGroup

	const maxConcurrent = 10
	sem := make(chan struct{}, maxConcurrent)

	var (
		combinedLinks []string
		links         []string
		linksMu       sync.Mutex
		uniqueLinks   = make(map[string]struct{})

		sites       []string
		sitesMu     sync.Mutex
		uniqueSites = make(map[string]struct{})

		mails       []string
		mailsMu     sync.Mutex
		uniqueMails = make(map[string]struct{})
	)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Получить список вакансий
	for i := 1; i <= countPages; i++ {
		wg.Add(1)
		go func(page int) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			url := generateUrl(page, grade, salary)

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				fmt.Printf("Ошибка создания запроса для страницы %d: %s\n", page, err)
				return
			}

			resp, err := client.Do(req)
			if err != nil {
				fmt.Printf("Ошибка при загрузке страницы %d: %s\n", page, err)
				return
			}
			defer resp.Body.Close()

			if doc, err := goquery.NewDocumentFromReader(resp.Body); err == nil {
				var pageLinks []string
				var pageUniqueLinks []string

				doc.Find(".vacancy-card__title-link").Each(func(index int, element *goquery.Selection) {
					name := element.Text()
					link, exists := element.Attr("href")
					if !exists {
						return
					}

					fullURL := "https://career.habr.com" + link
					vacancyInfo := fmt.Sprintf("%s - %s", name, fullURL)

					linksMu.Lock()
					if _, exists := uniqueLinks[fullURL]; !exists {
						uniqueLinks[fullURL] = struct{}{}
						pageLinks = append(pageLinks, vacancyInfo)
						pageUniqueLinks = append(pageUniqueLinks, fullURL)
						fmt.Println("Получили данные -", vacancyInfo)
					}
					linksMu.Unlock()
				})

				linksMu.Lock()
				combinedLinks = append(combinedLinks, pageLinks...)
				links = append(links, pageUniqueLinks...)
				linksMu.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// Получить список сайтов
	fmt.Println("\n\n2. Получаем список сайтов")
	for _, link := range links {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				fmt.Println("Не удалось создать запрос -", url)
				return
			}

			resp, err := client.Do(req)
			if err != nil {
				fmt.Println("Не удалось получить сайт -", url, "-", err)
				return
			}
			defer resp.Body.Close()

			if doc, err := goquery.NewDocumentFromReader(resp.Body); err == nil {
				siteCompany := doc.Find(".company_site").Text()
				if siteCompany != "" {
					siteURL := "https://" + siteCompany

					sitesMu.Lock()
					if _, exists := uniqueSites[siteURL]; !exists {
						uniqueSites[siteURL] = struct{}{}
						sites = append(sites, siteURL)
						fmt.Println("Получили сайт -", siteURL)
					}
					sitesMu.Unlock()
				}
			}
		}(link)
	}

	wg.Wait()

	// Получаем список почтовых адресов
	fmt.Println("\n\n3. Получаем список почтовых ящиков")
	for _, site := range sites {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				fmt.Println("Ошибка создания запроса:", url)
				return
			}

			resp, err := client.Do(req)
			if err != nil {
				fmt.Println("Ошибка при загрузке страницы:", url, "-", err)
				return
			}
			defer resp.Body.Close()

			if doc, err := goquery.NewDocumentFromReader(resp.Body); err == nil {
				doc.Find("[href*='mailto']").Each(func(index int, element *goquery.Selection) {
					href, exists := element.Attr("href")
					if !exists {
						return
					}

					if len(href) > 7 && href[:7] == "mailto:" {
						email := href[7:]

						mailsMu.Lock()
						if _, exists := uniqueMails[email]; !exists {
							uniqueMails[email] = struct{}{}
							mails = append(mails, email)
							fmt.Println("Получили почту -", email)
						}
						mailsMu.Unlock()
					}
				})
			}
		}(site)
	}

	wg.Wait()

	// Сохранить данные
	data := ParserProps{Vacancies: combinedLinks, Sites: sites, Mail: mails}
	jsonData, err := json.MarshalIndent(data, "", "  ")
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

	// Минимальный анализ работы программы
	fmt.Println("\nКоличество обработанных вакансий: ", len(links))
	fmt.Println("Количество обработанных сайтов: ", len(sites))
	fmt.Println("Количество обработанных почтовых адресов: ", len(mails))
}

// Generate url
func generateUrl(page int, grade, salary string) string {
	base, _ := url.Parse("https://career.habr.com/vacancies")

	params := url.Values{}
	params.Add("page", fmt.Sprintf("%d", page))
	params.Add("type", "all")

	if grade != "" && grade != "0" {
		params.Add("qid", grade)
	}

	if salary != "" {
		params.Add("salary", salary)
		params.Add("with_salary", "true")
	}

	base.RawQuery = params.Encode()
	return base.String()
}
