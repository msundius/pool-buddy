# --- Build stage: install all deps and build frontend + server bundle ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Drop dev dependencies so the runtime image only carries production modules
# (the server bundle keeps packages external, so pg etc. must remain installed).
RUN npm prune --omit=dev

# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3030
CMD ["node", "dist/server.cjs"]
