# Prestige Accounting Portal

[![CI](https://github.com/Marko3171/prestige-accounting/actions/workflows/ci.yml/badge.svg)](https://github.com/Marko3171/prestige-accounting/actions/workflows/ci.yml)

A secure client and admin portal for uploading South African bank statements and converting PDF/CSV files into a universal CSV format.

## Setup

1. Create a Neon Postgres database and copy the connection string.
2. Create a `.env` file using `.env.example` as a starting point.
3. Update `.env` with your connection string and a secure `AUTH_SECRET`.
4. (Optional) Set `ADMIN_EMAILS` to a comma-separated list of admin accounts.

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

## Deployment (Vercel)

1. Push the repo to GitHub (already done for this project).
2. In Vercel, click **New Project** and import `Marko3171/prestige-accounting`.
3. Set the environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `ADMIN_EMAILS` (optional)
4. Deploy.

Notes:
- The build runs `npm run db:generate` automatically via the `build` script.
- File storage under `storage/` and `data/` is local-only. For production, consider moving uploads to a hosted bucket (e.g., S3) and update the storage layer accordingly.
