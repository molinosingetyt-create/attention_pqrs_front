# === Build ===
FROM node:20-alpine AS builder
WORKDIR /app

# Copia package.json y (si existe) package-lock.json
COPY package*.json ./

# Usa 'npm ci' cuando hay lockfile (reproducible) y 'npm install' como fallback.
RUN if [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps ; \
    else \
      npm install --legacy-peer-deps --no-audit --no-fund ; \
    fi

COPY . .
RUN npm run build -- --configuration production

# === Runtime ===
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/pqrs-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
