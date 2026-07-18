# Known Issues — ForgeDev SaaS Backend

This codebase contains intentional bugs and incomplete features for practice purposes.

## Security Issues

1. **Weak authentication** — JWT is not used. Tokens are base64-encoded strings that anyone can forge. See `src/middleware/index.ts`.
2. **Plain text passwords** — Passwords are stored without hashing. See `prisma/seed.ts` and `src/routes/auth.routes.ts`.
3. **Missing RBAC on settings** — The `/api/settings` PUT route has no permission check. Any authenticated user (even viewers) can change tenant settings. See `src/routes/settings.routes.ts`.

## Data Isolation Bugs

4. **Cross-tenant data leak** — The `GET /api/analytics/aggregate` endpoint is missing the `tenantId` filter in one of its inner queries, potentially returning data from all tenants.
5. **Widget deletion** — `DELETE /api/widgets/:id` does not check tenant isolation before deleting.

## Performance Issues

6. **N+1 query in aggregate** — `GET /api/analytics/aggregate` loads all events into memory, then runs a separate query per label. This causes timeouts with large datasets.
7. **In-memory aggregation** — `GET /api/analytics/summary` loads all events and aggregates in JavaScript instead of using SQL `groupBy`.

## Code Quality

8. **Inconsistent response formats** — Some routes return `{ data: ... }`, others return raw objects, and some return `{ message: ... }`.
9. **Dead code** — The export feature (`exportToCSV` in utils) was never fully implemented.
10. **Missing validation** — Team member invitation doesn't validate email format.
11. **Inconsistent HTTP status codes** — Delete returns 204 in some routes, 200 with JSON in others.
12. **TODO comments** — Multiple TODO/FIXME comments scattered through the codebase indicating incomplete work.
