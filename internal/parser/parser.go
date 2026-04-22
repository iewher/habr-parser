package parser

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"habrparser/pkg/models"

	"github.com/PuerkitoBio/goquery"
)

type Parser struct {
	Client        *http.Client
	MaxConcurrent int
}

type ParserProps struct {
	CountPages int
	Grade      string
	Salary     string
}

func NewParser() *Parser {
	return &Parser{
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
		MaxConcurrent: 10,
	}
}

func (p *Parser) Parse(props ParserProps) (*models.ParserResult, error) {
	var countPages = props.CountPages
	var grade = props.Grade
	var salary = props.Salary

	sem := make(chan struct{}, p.MaxConcurrent)

	var (
		combinedVacancies []models.VacancyData
		links             []string
		linksMu           sync.Mutex
		uniqueLinks       = make(map[string]struct{})

		sites       []string
		sitesMu     sync.Mutex
		uniqueSites = make(map[string]struct{})

		emails      []string
		mailsMu     sync.Mutex
		uniqueMails = make(map[string]struct{})
	)

	var wg sync.WaitGroup

	// Получить список вакансий
	fmt.Println("1. Получаем список вакансий")
	for i := 1; i <= countPages; i++ {
		wg.Add(1)
		go func(page int) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			parsedURL := p.generateUrl(page, grade, salary)

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "GET", parsedURL, nil)
			if err != nil {
				fmt.Printf("Ошибка создания запроса для страницы %d: %s\n", page, err)
				return
			}

			resp, err := p.Client.Do(req)
			if err != nil {
				fmt.Printf("Ошибка при загрузке страницы %d: %s\n", page, err)
				return
			}
			defer resp.Body.Close()

			if doc, err := goquery.NewDocumentFromReader(resp.Body); err == nil {
				var pageVacancies []models.VacancyData

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
						pageVacancies = append(pageVacancies, models.VacancyData{
							Title: name,
							URL:   fullURL,
						})
						links = append(links, fullURL)
						fmt.Println("Получили данные -", vacancyInfo)
					}
					linksMu.Unlock()
				})

				linksMu.Lock()
				combinedVacancies = append(combinedVacancies, pageVacancies...)
				linksMu.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// Получить список сайтов
	fmt.Println("\n2. Получаем список сайтов")
	for _, link := range links {
		wg.Add(1)
		go func(linkURL string) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "GET", linkURL, nil)
			if err != nil {
				fmt.Println("Не удалось создать запрос -", linkURL)
				return
			}

			resp, err := p.Client.Do(req)
			if err != nil {
				fmt.Println("Не удалось получить сайт -", linkURL, "-", err)
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

	// Получить список почтовых адресов
	fmt.Println("\n3. Получаем список почтовых ящиков")
	for _, site := range sites {
		wg.Add(1)
		go func(siteURL string) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "GET", siteURL, nil)
			if err != nil {
				fmt.Println("Ошибка создания запроса:", siteURL)
				return
			}

			resp, err := p.Client.Do(req)
			if err != nil {
				fmt.Println("Ошибка при загрузке страницы:", siteURL, "-", err)
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
							emails = append(emails, email)
							fmt.Println("Получили почту -", email)
						}
						mailsMu.Unlock()
					}
				})
			}
		}(site)
	}

	wg.Wait()

	result := &models.ParserResult{
		Vacancies: combinedVacancies,
		Sites:     sites,
		Emails:    emails,
	}

	fmt.Println("\nКоличество обработанных вакансий:", len(result.Vacancies))
	fmt.Println("Количество обработанных сайтов:", len(result.Sites))
	fmt.Println("Количество обработанных почтовых адресов:", len(result.Emails))

	return result, nil
}

// Сгенерировать ссылку
func (p *Parser) generateUrl(page int, grade, salary string) string {
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
