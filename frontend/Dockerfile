# Etapa 1: Construcción del Frontend (React + TypeScript + Vite)
FROM node:22-slim AS builder

WORKDIR /app

# Instalar dependencias (incluyendo binarios nativos de Linux para Rolldown/Vite 8)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copiar el código fuente y compilar para producción
COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Etapa 2: Servidor Web de Producción y Reverse Proxy (Nginx)
FROM nginx:1.27-alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
