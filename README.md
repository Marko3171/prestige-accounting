# Prestige Accounting Portal

A secure client and admin portal for uploading South African bank statements and converting PDF/CSV files into a universal CSV format.

## Setup

1. Create a Neon Postgres database and copy the connection string.
2. Update `.env` with your connection string and a secure `AUTH_SECRET`.
3. (Optional) Set `ADMIN_EMAILS` to a comma-separated list of admin accounts.

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Notes

- PDF conversion uses `pdftoppm`, `pdftotext`, and `tesseract` installed on the machine.
- If `tesseract` cannot find language data, set `TESSDATA_PREFIX` to your tessdata folder.
- The universal CSV format includes: date, description, reference, debit, credit, balance, currency.
- QA reports show page counts, transaction totals, and unmatched line counts after conversion.

## Admin Access

Create an account using an email in `ADMIN_EMAILS` to access the admin dashboard.
