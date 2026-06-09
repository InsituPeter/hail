FROM node:18-alpine

WORKDIR /src

COPY package.*json ./

RUN  npm install

COPY . .

RUN npx prisma generate

EXPOSE 8810

CMD ["sh", "-c", "npx prisma migrate deploy && node app.js"]