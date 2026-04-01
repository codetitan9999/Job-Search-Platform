FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY app.js index.html server.js styles.css ./
COPY lib ./lib
COPY data/.gitkeep ./data/.gitkeep
COPY uploads/.gitkeep ./uploads/.gitkeep

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV STORAGE_ROOT=/app/storage

RUN mkdir -p /app/storage/data /app/storage/uploads

EXPOSE 3000

CMD ["node", "server.js"]
