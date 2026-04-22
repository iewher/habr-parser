package models

type VacancyData struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

type ParserResult struct {
	Vacancies []VacancyData `json:"vacancies"`
	Sites     []string      `json:"sites"`
	Emails    []string      `json:"emails"`
}

type MailConfig struct {
	SMTPHost     string `json:"smtp_host"`
	SMTPPort     int    `json:"smtp_port"`
	FromEmail    string `json:"from_email"`
	FromPassword string `json:"from_password"`
	Subject      string `json:"subject"`
	Body         string `json:"body"`
}
