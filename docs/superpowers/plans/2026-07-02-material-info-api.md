# Material Info API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `/api/materials` route that exposes 物料基本資料 (material basic info) joined with its system/sub-system names, queryable by exact-list, fuzzy MaterialNo, or fuzzy MaterialName.

**Architecture:** A new Express router (`api-server/src/routes/material.js`) following the exact shape of the existing `employee.js` router — three `GET` endpoints, all using the same base SQL (joined across `MaterialInfo`, `MainSystem`, `SubSystem`) with an optional `WHERE ... LIKE` clause appended for the two fuzzy-search endpoints. It is registered in `server.js` and uses the already-existing `connectEmployeeDB` pool (WMS database), not the primary `connectDB` pool.

**Tech Stack:** Express.js router + `mssql` parameterized queries (Node.js, CommonJS `require`/`module.exports`, matching every other file in `api-server/src/routes/`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-material-info-api-design.md`
- Use `connectEmployeeDB` (WMS pool), imported via `const { connectEmployeeDB } = require('../server');` — never open a new pool.
- JSON response keys use the Chinese aliases exactly as given in the base SQL (物料編號, 物料名稱, 規格, 系統代號, 系統名稱, 子系統代號, 子系統名稱) — do not rename to English.
- Parameterize all inputs via `.input(name, value)`; rely on `mssql`'s implicit type inference from the JS string (no explicit `mssql.NVarChar(...)`), matching `employee.js`'s `tmname` endpoint style — do not follow `api.js`'s explicit-type style for this file.
- Fuzzy endpoints wrap the path param as `` `%${value}%` `` before passing to `.input(...)`; the SQL itself uses a plain `LIKE @Param` (no `%` in the SQL string).
- Read-only: `GET` endpoints only. No `POST`/`PUT`/`DELETE`, no pagination — matches every other route file.
- **No automated test runner is configured in this repo** (confirmed: no `test` script in `api-server/package.json`, no test framework installed). Verification for every step is: (a) `node --check <file>` for syntax, and (b) a running dev server + `curl` for behavior. If a local SQL Server / WMS DB is not reachable in your environment, a `500` with a SQL connection error still confirms the route is wired correctly — a `404` does not.

---

### Task 1: Create `material.js` with the base "get all" endpoint and wire it into `server.js`

**Files:**
- Create: `api-server/src/routes/material.js`
- Modify: `api-server/src/server.js:116-120`

**Interfaces:**
- Consumes: `connectEmployeeDB` exported from `api-server/src/server.js` (already exists, used identically by `api-server/src/routes/employee.js`).
- Produces: `BASE_QUERY` (a template string constant in `material.js`) and the Express `router` object (`module.exports = router`), both consumed by Task 2 to add the two fuzzy endpoints to the same file/router.

- [ ] **Step 1: Create `api-server/src/routes/material.js`**

```js
const express = require('express');
const router = express.Router();
const { connectEmployeeDB } = require('../server');

const BASE_QUERY = `
  SELECT
    MaterialInfo.MaterialNo AS 物料編號,
    MaterialInfo.MaterialName AS 物料名稱,
    MaterialInfo.spec AS 規格,
    MaterialInfo.SystemId AS 系統代號,
    MainSystem.SystemName AS 系統名稱,
    MaterialInfo.SubSystemId AS 子系統代號,
    SubSystem.SubSystemName AS 子系統名稱
  FROM MaterialInfo
  INNER JOIN MainSystem ON MainSystem.SystemId = MaterialInfo.SystemId
  INNER JOIN SubSystem ON MaterialInfo.SystemId = SubSystem.SystemId
    AND MaterialInfo.SubSystemId = SubSystem.SubSystemId
`;

// Get all materials
router.get('/', async (req, res) => {
  try {
    const pool = await connectEmployeeDB();
    const result = await pool.request()
      .query(`${BASE_QUERY} ORDER BY MaterialInfo.MaterialNo`);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: Syntax-check the new file**

Run: `node --check api-server/src/routes/material.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Wire the router into `server.js`**

In `api-server/src/server.js`, replace lines 116-120:

```js
// API Routes
const apiRouter = require('./routes/api');
const employeeRouter = require('./routes/employee');
app.use('/api', apiRouter);
app.use('/api/employee', employeeRouter);
```

with:

```js
// API Routes
const apiRouter = require('./routes/api');
const employeeRouter = require('./routes/employee');
const materialRouter = require('./routes/material');
app.use('/api', apiRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/materials', materialRouter);
```

- [ ] **Step 4: Syntax-check `server.js`**

Run: `node --check api-server/src/server.js`
Expected: no output, exit code 0.

- [ ] **Step 5: Start the dev server and verify the route responds**

Run: `cd api-server && npm run dev` (leave running in background)
Then: `curl -s http://localhost:3000/api/materials`
Expected: either a JSON array of material records (DB reachable), or a JSON `{"error": "..."}` with HTTP 500 from a SQL connection failure (DB unreachable in this environment — this still confirms the route is registered and calling `connectEmployeeDB()`). A `404 Not Found` means the wiring in Step 3 is wrong — fix before continuing.
Stop the dev server after verifying (`Ctrl+C` / kill the background process).

- [ ] **Step 6: Commit**

```bash
git add api-server/src/routes/material.js api-server/src/server.js
git commit -m "feat: add GET /api/materials for material basic info lookup"
```

---

### Task 2: Add fuzzy search endpoints by MaterialNo and MaterialName

**Files:**
- Modify: `api-server/src/routes/material.js` (append two new route handlers after the `router.get('/', ...)` block from Task 1)

**Interfaces:**
- Consumes: `BASE_QUERY` and `connectEmployeeDB` from Task 1 (same file, already in scope — no new imports needed).
- Produces: final `material.js` router with 3 total endpoints, matching the spec's endpoint table exactly.

- [ ] **Step 1: Append the two fuzzy-search route handlers**

In `api-server/src/routes/material.js`, insert the following between the `router.get('/', ...)` block and `module.exports = router;`:

```js
// Fuzzy search by MaterialNo
router.get('/materialno/:materialNo', async (req, res) => {
  try {
    const pool = await connectEmployeeDB();
    const result = await pool.request()
      .input('MaterialNo', `%${req.params.materialNo}%`)
      .query(`${BASE_QUERY} WHERE MaterialInfo.MaterialNo LIKE @MaterialNo ORDER BY MaterialInfo.MaterialNo`);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching materials by MaterialNo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fuzzy search by MaterialName
router.get('/materialname/:materialName', async (req, res) => {
  try {
    const pool = await connectEmployeeDB();
    const result = await pool.request()
      .input('MaterialName', `%${req.params.materialName}%`)
      .query(`${BASE_QUERY} WHERE MaterialInfo.MaterialName LIKE @MaterialName ORDER BY MaterialInfo.MaterialNo`);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching materials by MaterialName:', error);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 2: Syntax-check the file**

Run: `node --check api-server/src/routes/material.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Start the dev server and verify both new routes**

Run: `cd api-server && npm run dev` (leave running in background)
Then:
```bash
curl -s http://localhost:3000/api/materials/materialno/ABC
curl -s http://localhost:3000/api/materials/materialname/%E9%9B%BB%E6%BA%90
```
Expected: same success/DB-unreachable behavior as Task 1 Step 5 (JSON array, or a 500 with a SQL error — not a 404). The second URL is `電源` (a placeholder Chinese test term) URL-encoded; substitute any real material name/number if you have DB access.
Stop the dev server after verifying.

- [ ] **Step 4: Commit**

```bash
git add api-server/src/routes/material.js
git commit -m "feat: add fuzzy search by MaterialNo and MaterialName to /api/materials"
```
