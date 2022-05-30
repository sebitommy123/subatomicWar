FROM node:14
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3002

ENV PORT=3002

CMD [ "npm", "run", "start" ]
