# MARCOM - Plataforma Web de Gestión Tecnológica e Inventario

[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_--_TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/Duoc_UC-Capstone_PTY4614-D99B00)](https://www.duoc.cl/)

---

## 1. Descripción del Proyecto
**MARCOM** es una plataforma web distribuida orientada a optimizar la trazabilidad y gestión operativa de empresas de mantenimiento e inventario tecnológico (especialmente en estaciones de servicio y tiendas de conveniencia).

El sistema resuelve la falta de registro centralizado integrando:
* **Inventario Tecnológico:** Control de stock por número de serie, estados de equipos y trazabilidad por códigos QR.
* **Órdenes de Trabajo en Terreno:** Asignación de servicios, seguimiento en tiempo real y captura de evidencia digital.
* **Facturación Electrónica & Pagos:** Integración con la pasarela de pagos **Flow** y emisión de Documentos Tributarios Electrónicos (DTE / SII).
* **Dashboard Analítico:** Panel interactivo con métricas operativas y KPIs en tiempo real para la toma de decisiones.

---

## 2. Integrantes del Equipo y Roles

| Nombre | Rol Principal | Responsabilidades Clave |
| :--- | :--- | :--- |
| **Julio Cesar Mena Torres** | **Frontend Developer & QA Lead** | Desarrollo de la SPA en React + TypeScript, maquetado con Tailwind CSS, consumo de API Gateway, captura de evidencias digitales y ejecución de la suite de pruebas. |
| **Sergio Bravo** | **Backend Developer** | Diseño y construcción de microservicios RESTful en Python (FastAPI), modelos ORM (SQLAlchemy), esquemas Pydantic y API Gateway. |
| **Felipe Madrid** | **Scrum Master** | Facilitación de ceremonias Scrum, control del Sprint Backlog y gestión de entregables académicos. |
| **Marco Mena** | **Product Owner** | Levantamiento de requerimientos de negocio, priorización del Product Backlog y validación de criterios de aceptación. |

---

## 3. Stack Tecnológico

* **Frontend (SPA):** React 18, TypeScript, Vite, React Router DOM, Lucide Icons.
* **Testing Frontend (QA):** Jest, React Testing Library, Oxlint.
* **Backend Microservicios:** Python 3.11+, FastAPI, SQLAlchemy, Pydantic, JWT Auth (RBAC).
* **API Gateway & Proxy:** FastAPI Gateway / Nginx.
* **Base de Datos:** PostgreSQL 15 con esquemas aislados para autenticación, inventario, trabajo y facturación.
* **Contenerización y Orquestación:** Docker & Docker Compose.

---

## 4. Arquitectura de la Solución

El sistema se estructura bajo una arquitectura de microservicios contenedores comunicados a través de un API Gateway centralizado.

```text
┌────────────────────────────────────────────────────────┐
│            Frontend Client (React SPA / Vite)          │
└───────────────────────────┬────────────────────────────┘
│  HTTP / REST (JWT Auth)
▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI API Gateway                  │
└──────┬────────────────────┬───────────────────┬────────┘
│                    │                   │
▼                    ▼                   ▼
┌──────────────┐     ┌──────────────┐    ┌──────────────┐
│ Auth Service │     │ Inventory Svc│    │Work Order Svc│ ... (Billing Svc)
└──────┬───────┘     └──────┬───────┘    └──────┬───────┘
│                    │                   │
└────────────────────┼───────────────────┘
▼
┌────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                    │
│ (auth_schema | inventory_schema | work_order_schema)   │
└────────────────────────────────────────────────────────┘
```

---

## 5. Metodología de Trabajo

El desarrollo se gestiona bajo el marco **Agile Scrum**, dividido en 4 sprints principales enfocados en entregas modulares de valor:
* **Sprint 1:** Autenticación (RBAC), usuarios y módulo de inventario.
* **Sprint 2:** Gestión de órdenes de trabajo y evidencias digitales.
* **Sprint 3:** Integración con pasarela Flow y módulo de facturación.
* **Sprint 4:** Dashboard analítico de KPIs y hardening de pruebas.

---

## 6. Instrucciones de Ejecución Local (Docker)

### Requisitos Previos
* Tener instalado **Git**, **Docker Desktop** y **Docker Compose**.

### Pasos para levantar el proyecto

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/serbravo38/Marcom.git
   cd Marcom
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```

3. **Construir y levantar los contenedores:**
   ```bash
   docker compose up --build -d
   ```

4. **Acceder a las aplicaciones:**
* **Frontend Web:** `http://localhost:5173`
* **API Gateway (Swagger):** `http://localhost:8000/docs`
* **PostgreSQL:** `localhost:5432`

5. **Detener el entorno:**
   ```bash
   docker compose down -v
   ```

---

## 7. Beneficios del proyecto

1. **Cumplimiento del Anexo 2 (GitHub):** incluye nombre, descripción, stack, despliegue y metodología.
2. **Coherencia de roles:** deja explicitado el enfoque de Frontend y QA junto con el trabajo de backend y producto.
3. **Pauta de calidad C1 y C4:** muestra la integración con Docker Compose y la validación del sistema.

