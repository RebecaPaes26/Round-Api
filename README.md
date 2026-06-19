# Round API

API Nest.js + Prisma + PostgreSQL do Round Multidisciplinar.

## Rodar localmente

```powershell
cd C:\Users\hmrg\Documents\GitHub\Round-Api
Copy-Item .env.example .env
docker compose up -d postgres
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

Acesse:

- API: http://localhost:3333/api
- Health: http://localhost:3333/api/health

## Rodar API + banco em Docker

```powershell
cd C:\Users\hmrg\Documents\GitHub\Round-Api
docker compose up --build
```

Se as tabelas ainda nao existirem:

```powershell
docker compose exec api pnpm prisma:migrate
docker compose exec api pnpm prisma:seed
```

## Endpoints migrados

- `apiListPatients` -> `GET /api/patients`
- `apiSavePatient` -> `POST /api/patients`
- `apiArchivePatient` -> `PATCH /api/patients/:id/archive`
- `apiStartRoundFull` -> `POST /api/rounds/start`
- `apiDashboard` -> `GET /api/dashboard`
- `apiHistory` -> `GET /api/history`
- `apiDailyReport` -> `GET /api/daily-report`
