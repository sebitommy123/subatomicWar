FROM node:14
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 8080
ENV PORT=8080

EXPOSE 8081
ENV INTERNAL_PORT=8081

CMD [ "node", "src/server/index.js" ]
