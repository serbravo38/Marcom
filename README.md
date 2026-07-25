# Proyecto APT / MARCOM

Este es un sistema modular basado en una arquitectura de microservicios utilizando **FastAPI** para los servicios backend, **Docker Compose** para la persistencia de datos centralizada con **PostgreSQL**, y un **API Gateway** como punto de entrada único.

## Estructura del Proyecto

- `database/`: Scripts SQL para la base de datos y esquemas.
- `services/`: Carpeta contenedora de los microservicios individuales (FastAPI).
- `gateway/`: API Gateway para enrutamiento y autenticación.
- `docker-compose.yml`: Orquestación de contenedores.

## Requisitos Previos

1. **Git**
2. **Docker Desktop** (con Docker Compose)
3. **Python 3.10+** (para desarrollo local de servicios sin Docker si es necesario)

## Cómo empezar (Fase 1)

1. Levantar la base de datos PostgreSQL:
   ```bash
   docker compose up -d
   ```
2. La base de datos ejecutará automáticamente el script `database/init.sql` para crear los esquemas, tablas e índices.
