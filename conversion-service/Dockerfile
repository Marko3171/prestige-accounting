FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  poppler-utils \
  tesseract-ocr \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY conversion-service/package.json ./package.json
RUN npm install

COPY conversion-service/src ./src
COPY src ../src

EXPOSE 8080
CMD ["npm", "run", "start"]
