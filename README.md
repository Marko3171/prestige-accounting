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
   - `BLOB_READ_WRITE_TOKEN` (required on Vercel for durable file storage)
   - `CONVERSION_SERVICE_URL` (required on Vercel for PDF conversion)
   - `CONVERSION_SERVICE_TOKEN` (optional bearer token for conversion service auth)
4. Deploy.
5. Run database migrations against production once:

```bash
npx prisma migrate deploy
```

Notes:
- The build runs `npm run db:generate` automatically via the `build` script.
- The app automatically uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, and local `storage/` when it is not set.
- Vercel Blob SDK server uploads currently require `access: public`; file names are randomized, but treat Blob URLs as sensitive.
- PDF conversion depends on `pdftoppm`, `pdftotext`, and `tesseract` binaries. These are not available by default in Vercel serverless functions, so set `CONVERSION_SERVICE_URL` to an external worker/service that exposes `POST /convert-pdf`.

### Conversion Service Contract

`POST {CONVERSION_SERVICE_URL}/convert-pdf` with `multipart/form-data`:
- `file` (PDF file)
- `uploadId` (string)
- `bankName` (optional string)

If `CONVERSION_SERVICE_TOKEN` is set, this app sends:
- `Authorization: Bearer {CONVERSION_SERVICE_TOKEN}`

Expected JSON response:
- `csv` (string, required)
- `warnings` (string[], optional)
- `qaReport` (object, required)
- `transactions` (number, optional)
- `pageCount` (number, optional)
- `previewBase64` (string, optional)
- `previewMime` (string, optional)

A ready-to-deploy worker scaffold is included in `conversion-service/`.

### Post-Deploy Smoke Check

Run after deployment:

```bash
npm run smoke:deploy -- https://your-app.vercel.app
```
