# Material Info API (物料基本資料) — Design

## Purpose

Expose read-only lookups of material basic info (物料基本資料) from the WMS database, joined with its system/sub-system names, so the frontend can look up materials by number or name.

## Location & Wiring

- New file: `api-server/src/routes/material.js`
- Registered in `api-server/src/server.js`:
  ```js
  const materialRouter = require('./routes/material');
  app.use('/api/materials', materialRouter);
  ```
- Uses `connectEmployeeDB` (the WMS connection pool already exported from `server.js`), not `connectDB` — `MaterialInfo`, `MainSystem`, and `SubSystem` live in the WMS database, same as `Employee`.

## Base Query

```sql
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
```

JSON responses use the Chinese column aliases as-is (matches the source query verbatim; no renaming to English).

## Endpoints

Mirrors the existing `employee.js` route shape (separate path-param endpoints per lookup field, not a combined query-string filter):

| Method & Path | Behavior |
|---|---|
| `GET /api/materials` | Base query, no filter, all materials, ordered by `MaterialInfo.MaterialNo` |
| `GET /api/materials/materialno/:materialNo` | Adds `WHERE MaterialInfo.MaterialNo LIKE @MaterialNo`, param wrapped as `%value%` (fuzzy) |
| `GET /api/materials/materialname/:materialName` | Adds `WHERE MaterialInfo.MaterialName LIKE @MaterialName`, param wrapped as `%value%` (fuzzy) |

Both fuzzy endpoints only filter on a single field each — no combined AND-filter endpoint (out of scope per user decision).

## Error Handling

Same pattern as every other route in the codebase:
```js
try {
  const pool = await connectEmployeeDB();
  const result = await pool.request()./* ... */query(/* ... */);
  res.json(result.recordset);
} catch (error) {
  console.error('Error fetching ...', error);
  res.status(500).json({ error: error.message });
}
```

## Parameterization

Follows `employee.js`'s `tmname` fuzzy-lookup style — relies on `mssql`'s implicit type inference from a JS string input (no explicit `mssql.NVarChar(...)` type), consistent with that file:
```js
.input('MaterialNo', `%${req.params.materialNo}%`)
```

## Out of Scope

- No create/update/delete — read-only, matching `employee.js`.
- No combined multi-field search endpoint.
- No pagination (matches existing convention across all routes).
