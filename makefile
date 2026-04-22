.PHONY: parser mailer

parser:
	go run ./cmd/parser

mailer:
	go run ./cmd/mailer
