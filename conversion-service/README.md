# Conversion Service

Standalone PDF conversion API for the main portal.

## Endpoint

- `POST /convert-pdf`
- Content-Type: `multipart/form-data`
- Fields:
  - `file` (required, PDF)
  - `uploadId` (optional)
  - `bankName` (optional)
- Auth:
  - If `CONVERSION_SERVICE_TOKEN` is set, send `Authorization: Bearer <token>`.

Response JSON:
- `csv` (string)
- `warnings` (string[])
- `qaReport` (object)
- `transactions` (number)
- `pageCount` (number)
- `previewBase64` (string | null)
- `previewMime` (string | null)

## Local Run

```bash
cd conversion-service
npm install
npm run start
```

Health check:

```bash
curl http://localhost:8080/health
```

## Docker Build

Build from repository root:

```bash
docker build -f conversion-service/Dockerfile -t prestige-conversion-service .
docker run --rm -p 8080:8080 -e CONVERSION_SERVICE_TOKEN=replace-me prestige-conversion-service
```

## Configure Main App

In your main app deployment env:

- `CONVERSION_SERVICE_URL=https://<your-service-domain>`
- `CONVERSION_SERVICE_TOKEN=<same-token>`
