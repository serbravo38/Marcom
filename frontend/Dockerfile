# Etapa de build
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de producción
FROM nginx:alpine
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/America/Santiago /etc/localtime \
    && echo America/Santiago > /etc/timezone

ENV TZ=America/Santiago
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]