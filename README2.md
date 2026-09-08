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
* **Órdenes de Trabajo en Terreno:** Asignación de servicios, seguimiento en tiempo real y captura de evidencia digital (firmas táctiles en canvas y fotografías).
* **Facturación Electrónica & Pagos:** Integración con la pasarela de pagos **Flow** y emisión de Documentos Tributarios Electrónicos (DTE / SII).
* **Dashboard Analítico:** Panel interactivo con métricas operativas y KPIs en tiempo real para la toma de decisiones.

---

## 2. Integrantes del Equipo y Roles

| Nombre | Rol Principal | Responsabilidades Clave |
| :--- | :--- | :--- |
| **Julio Mena** | **Frontend Developer & QA Lead** | Desarrollo de la SPA en React + TypeScript, maquetado con Tailwind CSS, consumo de API Gateway, captura de evidencias digitales, desarrollo del Dashboard de KPIs y ejecución de la suite de pruebas unitarias/integración (Jest / React Testing Library). |
| **Sergio Bravo** | **Backend Developer** | Diseño y construcción de microservicios RESTful en Python (FastAPI), modelos ORM (SQLAlchemy), esquemas Pydantic y API Gateway. |
| **Felipe Madrid** | **Scrum Master** | Facilitación de ceremonias Scrum, control del Sprint Backlog, remoción de impedimentos y gestión de entregables académicos. |
| **Marco Mena** | **Product Owner** | Levantamiento de requerimientos de negocio, priorización del Product Backlog y validación de Criterios de Aceptación. |

---

## 3. Stack Tecnológico

* **Frontend (SPA):** React 18, TypeScript, Vite, Tailwind CSS, React Router DOM, Axios, Lucide Icons, Canvas API (firmas).
* **Testing Frontend (QA):** Jest, React Testing Library, Oxlint.
* **Backend Microservicios:** Python 3.11+, FastAPI, SQLAlchemy, Pydantic, JWT Auth (RBAC).
* **API Gateway & Proxy:** FastAPI Gateway / Nginx.
* **Base de Datos:** PostgreSQL 15 (Esquemas aislados: `auth_schema`, `inventory_schema`, `work_order_schema`, `billing_schema`).
* **Contenerización y Orquestación:** Docker & Docker Compose.

---

## 4. Arquitectura de la Solución

El sistema se estructura bajo una arquitectura de **Microservicios Contenerizados** comunicados a través de un **API Gateway centralizado**:


```

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

El desarrollo se gestiona bajo el marco **Agile Scrum**, dividido en 4 Sprints principales enfocados en entregas modulares de valor:
* **Sprint 1:** Autenticación (RBAC), Usuarios y Módulo de Inventario.
* **Sprint 2:** Gestión de Órdenes de Trabajo y Evidencias Digitales.
* **Sprint 3:** Integración con Pasarela Flow y Módulo de Facturación.
* **Sprint 4:** Dashboard Analítico de KPIs, Hardening de Pruebas (QA) y Despliegue.

---

## 6. Instrucciones de Ejecución Local (Despliegue con Docker)

### Requisitos Previos
* Tener instalado **Git**, **Docker Desktop** y **Docker Compose**.

### Pasos para Levantar el Proyecto

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/MARCOM.git](https://github.com/tu-usuario/MARCOM.git)
   cd MARCOM

```

2. **Configurar Variables de Entorno:**
Copia el archivo `.env.example` a `.env` en la raíz del proyecto (o utiliza los valores por defecto para entorno local):
```bash
cp .env.example .env

```


3. **Construir y Levantar los Contenedores:**
Ejecuta el siguiente comando para orquestar la base de datos, backend gateway, microservicios y frontend:
```bash
docker compose up --build -d

```


4. **Cargar Datos de Prueba (Opcional):**
Si deseas poblar la base de datos con información de prueba/locales:
```bash
python scripts/cargar_locales_ejemplo.py

```


5. **Acceder a las Aplicaciones:**
* **Frontend Web (React SPA):** `http://localhost:5173` o `http://localhost:3000`
* **API Gateway Documentation (Swagger):** `http://localhost:8000/docs`
* **PostgreSQL Database:** `localhost:5432`


6. **Ejecutar Pruebas de Calidad (QA - Frontend):**
Para correr la suite de pruebas unitarias y de componentes en el entorno frontend:
```bash
cd frontend
npm test

```


7. **Detener el Entorno:**
```bash
docker compose down -v

```



```

---

###  Beneficios de esta actualización para la Evaluación de Capstone:
1. **Cumplimiento del Anexo 2 (GitHub):** Incluye los 8 puntos obligatorios exigidos por la Escuela de Informática de Duoc UC (Nombre, Descripción, Tecnologías, Instrucciones Docker, Integrantes con Roles, Metodología, Arquitectura y Pruebas)[cite: 11].
2. **Coherencia de Rol:** Deja explicitado tu doble rol como **Frontend Developer & QA Lead**, destacando el trabajo en React, TypeScript y la suite de pruebas automatizadas[cite: 5, 7, 8].
3. **Pauta de Calidad C1 y C4:** Muestra la integración del sistema con Docker Compose y los comandos de testing para validación docente[cite: 5, 7, 8, 11].

```
