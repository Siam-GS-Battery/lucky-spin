FROM node:22-alpine
WORKDIR /app
COPY package.json server.js index.html ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1
CMD ["node", "server.js"]
