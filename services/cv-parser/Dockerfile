# Dedicated parser image. Run with the restrictions in CV_SECURITY.md; never pass application credentials.
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY scripts/cv-parser-service.ts ./scripts/cv-parser-service.ts
COPY src/lib/cv/extract-text.ts ./src/lib/cv/extract-text.ts
USER node
ENV NODE_ENV=production
CMD ["node", "--import", "tsx", "scripts/cv-parser-service.ts"]
