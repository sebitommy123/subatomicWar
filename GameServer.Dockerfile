FROM node:14
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY src/server src/server
COPY src/shared src/shared

EXPOSE 3000
EXPOSE 3042

ENV PORT=3000
ENV INTERNAL_PORT=3042

ENV CLIENTORIGIN=http://localho.st:3001

CMD [ "npm", "run", "pro:gameServer" ]
