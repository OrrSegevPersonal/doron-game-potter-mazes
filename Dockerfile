FROM node:18-alpine

WORKDIR /app

COPY server.js .
COPY index.html .
COPY css/ ./css/
COPY js/ ./js/

EXPOSE 8080

CMD ["node", "server.js"]
