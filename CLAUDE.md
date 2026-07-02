# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**可修件管理系統 (Repairable Parts Management System)** - A full-stack application for managing equipment maintenance records.

- **Frontend**: Vue 3 + TypeScript + Tailwind CSS 4 + Vue Router + Pinia
- **Backend**: Express.js + MSSQL (SQL Server)
- **Architecture**: Monorepo with separate `src/` (frontend) and `api-server/` (backend)

## Development Commands

### Frontend
```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build for production (Vue TSC + Vite)
npm run preview      # Preview production build
```

### Backend API
```bash
cd api-server
npm run dev          # Start API server with nodemon (port 3000)
npm start            # Start API server (production)
npm run seed:tables  # ⚠️ References src/seed/seedTables.js, which does not exist yet
```

> No test runner or linter is configured in either package. `npm run build` (vue-tsc) is the only type/compile check.

## Architecture

### Frontend Structure
- `src/main.ts` - App entry point; initializes Vue, Pinia, router; hydrates auth state from localStorage
- `src/router/index.ts` - Vue Router config with protected routes; redirects to `/login` if not authenticated
- `src/stores/auth.ts` - Pinia auth store managing login state and user info
- `src/services/apiService.ts` - TypeScript API client with interfaces for all backend entities
- `src/services/loginService.ts` - Auth against the **external** system (POSTs to a hardcoded `http://localhost/lowPricePurSer/loginService/login`, not `VITE_API_URL`)
- `src/layouts/DefaultLayout.vue` - Main layout with header, navigation sidebar, and content area
- `src/pages/` - Page components (HomePage, RepairableParts)
- `src/components/Login.vue` - Login form with email persistence

### Backend Structure
- `api-server/src/server.js` - Express app setup (CORS, JSON parsing), **two** SQL connection pools, and a `/health` check
- `api-server/src/routes/api.js` - RESTful CRUD routes for the 4 core entities (mounted at `/api`)
- `api-server/src/routes/employee.js` - Read-only employee lookups (mounted at `/api/employee`)

**Two SQL connection pools** live in `server.js` and are exported for routes to import:
- `connectDB` → the primary app database (`DB_*` env vars, default `CaptialPlain`). Used by `api.js`.
- `connectEmployeeDB` → a separate WMS/employee database (`WMS_DB_*` env vars, falling back to `DB_*`). Used by `employee.js`.
- Both are lazily created singletons that run a `SELECT 1` liveness check on each `connect*()` call and transparently reconnect if the pool went stale.
- New route files must `require` the appropriate `connect*` function from `../server` rather than opening their own pool.

### API Endpoints
| Entity | Routes |
|--------|--------|
| ActionPhrases (處理方式) | `/api/action-phrases` (CRUD) |
| FaultReasonPhrases (故障原因) | `/api/fault-reason-phrases` (CRUD) |
| MaintTypePhrases (維修物件類型) | `/api/maint-type-phrases` (CRUD) |
| EquipmentMaintenanceRecords (設備維修記錄) | `/api/equipment-maintenance-records` (CRUD) |
| Employee (員工) | `/api/employee/employees`, `.../tmname/:tmname`, `.../keyno/:keyno` (read-only; from the WMS DB, filtered to `UNITNO LIKE 'L16%'`) |

### Database Tables
- `ActionPhrases` - Maintenance action types
- `FaultReasonPhrases` - Fault reason codes
- `MaintTypePhrases` - Maintenance type classifications
- `EquipmentMaintenanceRecords` - Equipment maintenance history (uses composite key: MaterialNo + SerialNumber + Id)

### Key Patterns
- **Auth is external + client-side only.** `loginService` calls the external login system; on success `stores/auth.ts` (a setup-style Pinia store) persists `isLoggedIn`/`userInfo` to `localStorage`. `main.ts` calls `auth.hydrate()` after Pinia is installed to restore state. The router guard (`router/index.ts`) trusts either the store **or** `localStorage`. There is no backend session/token — the Express API is unauthenticated.
- **`EquipmentMaintenanceRecords` uses a composite key** (`MaterialNo` + `SerialNumber` + `Id`), reflected in both the REST paths (`/:materialNo/:serialNumber/:id`) and the `apiService.ts` function signatures. Its list endpoint `LEFT JOIN`s the three phrase tables to resolve `*Code` columns into `*Name` fields (returned as `MaintTypeName`/`FaultReasonName`/`ActionName`).
- All SQL uses **parameterized inputs** with explicit `mssql` types (`.input('X', mssql.Int, val)`); mirror this when adding queries.
- TypeScript interfaces in `apiService.ts` are the single source of truth for API shapes; frontend uses `fetch` with centralized error handling via `handleResponse`.

### Environment Variables (.env)
```
VITE_API_URL=http://localhost:3000/api
```

### Backend (.env)
```
DB_USER=sa
DB_PASSWORD=
DB_SERVER=localhost
DB_DATABASE=CaptialPlain
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Employee/WMS pool (connectEmployeeDB) — each var falls back to its DB_* equivalent if unset
WMS_DB_USER=
WMS_DB_PASSWORD=
WMS_DB_SERVER=
WMS_DB_DATABASE=
WMS_DB_ENCRYPT=
WMS_DB_TRUST_SERVER_CERTIFICATE=

# PORT=3000   # optional; API defaults to 3000
```
