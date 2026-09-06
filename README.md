# source_trace_response_function

Servicio encargado de **retornar la respuesta del análisis** que la IA realiza sobre el código fuente suministrado.

Está construido como una aplicación Express que se despliega en AWS Lambda detrás de API Gateway (a través de `aws-serverless-express`), y lee los resultados desde una tabla de DynamoDB.

---

## Requisitos previos

- **Node.js 20+** y npm.
- Credenciales de **AWS** configuradas en el entorno (`aws configure` o variables `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`), con permisos de lectura sobre la tabla de DynamoDB.
- Acceso a la tabla de DynamoDB del proyecto (por defecto `source_trace_db` en `us-east-1`).

> Sin credenciales de AWS válidas y acceso a la tabla, la aplicación levanta pero las consultas fallan con error 500.

---

## Levantar el repo en local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiá el archivo de ejemplo y ajustá los valores:

```bash
cp .env.example .env
```

Variables relevantes para este servicio:

| Variable              | Descripción                                        | Default          |
|-----------------------|----------------------------------------------------|------------------|
| `PORT`                | Puerto del servidor local                          | `3001`           |
| `DEBUG`               | Namespace de logs (`debug`)                        | `response:*`     |
| `AWS_REGION`          | Región de AWS                                      | `us-east-1`      |
| `DYNAMODB_TABLE_NAME` | Nombre de la tabla de DynamoDB con los resultados  | `source_trace_db`|

> El `.env` **no** se carga automáticamente. Exportá las variables en tu shell, usá tu configuración de AWS por defecto, o antepené las variables al comando (`DYNAMODB_TABLE_NAME=source_trace_db npm start`).

### 3. Compilar y arrancar

```bash
npm start
```

Esto ejecuta `tsc` (salida en `build/`) y levanta el servidor en `http://localhost:3001`.

Para iterar más rápido sin recompilar en cada cambio podés usar `ts-node`:

```bash
npx ts-node src/bin/server.ts
```

### 4. Probar el endpoint

El servicio expone una única ruta:

```
GET /V1/product/status/analysis
```

Recibe el identificador del job por header **`x-job-id`**. El servicio consulta todos los registros del job (`PK = JOB#<x-job-id>`), toma el item `METADATA` y le agrega el arreglo `evidences` con las evidencias (`SK` que empiezan por `EVIDENCE#`).

```bash
curl 'http://localhost:3001/V1/product/status/analysis' \
  --header 'x-job-id: a1b2c3'
```

Respuesta de ejemplo:

```json
{
  "PK": "JOB#a1b2c3",
  "SK": "METADATA",
  "status": "completed",
  "createdAt": "2026-09-04T15:00:00Z",
  "updatedAt": "2026-09-04T15:03:12Z",
  "generalInfo": {
    "projectName": "customer-api",
    "mainLanguage": "Java",
    "mainFramework": "Spring Boot",
    "approxFileCount": 84
  },
  "functionalAnalysis": {
    "summary": "Esta aplicación es una API REST para gestión de clientes..."
  },
  "componentsIdentified": ["Controllers", "Services", "Repositories", "Models"],
  "architecturePattern": "MVC",
  "evidences": [
    {
      "key": "results/a1b2c3/diagram-architecture.png",
      "label": "Diagrama de arquitectura MVC identificado"
    }
  ]
}
```

Si no existe el item `METADATA` para ese job, responde `404`.

---

## Scripts disponibles

| Comando         | Descripción                                            |
|-----------------|-------------------------------------------------------|
| `npm install`   | Instala dependencias                                   |
| `npm run build` | Compila TypeScript a `build/`                          |
| `npm start`     | Compila y levanta el servidor local (`build/bin/server.js`) |

---

## Estructura del proyecto

```
src/
├── app.ts                        # Configuración de Express (middlewares, CORS, rutas)
├── config.ts                     # Variables de entorno y defaults
├── bin/server.ts                 # Entrypoint del servidor local
├── adapters/
│   ├── routes.ts                 # Definición de rutas
│   └── statusAdapter/            # Handler de GET /V1/product/status/analysis
├── ports/
│   └── databasePort/             # Acceso a DynamoDB
└── domain/models/dynamo/         # Interfaces del modelo de datos (JobMetadata, JobEvidence, ...)

lambda/index.js                   # Entrypoint para AWS Lambda (aws-serverless-express)
```

---

## Despliegue

El paquete que se sube a Lambda usa `lambda/index.js` como handler, que carga `build/app`. Antes de empaquetar hay que correr `npm run build` para regenerar `build/`.
