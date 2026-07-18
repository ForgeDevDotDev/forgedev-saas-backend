# ForgeDev SaaS Backend

Multi-tenant analytics SaaS backend built with Express, TypeScript, Prisma, and SQLite.

## Features

- **Multi-tenant architecture** with data isolation per tenant
- **RBAC** (Role-Based Access Control) with admin, editor, and viewer roles
- **Analytics events** storage and aggregation queries
- **Dashboard & Widget** management per tenant
- **Team management** with invitations
- **Settings** per tenant

## Tech Stack

- Express.js — Web framework
- TypeScript — Type safety
- Prisma — ORM with SQLite
- Zod — Schema validation (partially implemented)

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database
npm run prisma:seed

# Start development server
npm run dev
```

## API Routes

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login |
| `POST /api/auth/refresh` | Refresh token |
| `GET /api/auth/me` | Get current user |
| `GET /api/tenants` | Get current tenant |
| `PUT /api/tenants/:id` | Update tenant |
| `GET /api/users` | List tenant users |
| `POST /api/users` | Create user |
| `PUT /api/users/:id` | Update user |
| `PUT /api/users/:id/role` | Assign role |
| `GET /api/roles` | List roles |
| `POST /api/roles` | Create role |
| `GET /api/dashboards` | List dashboards |
| `POST /api/dashboards` | Create dashboard |
| `GET /api/widgets` | List widgets |
| `POST /api/widgets` | Create widget |
| `GET /api/analytics/events` | List events |
| `GET /api/analytics/aggregate` | Aggregate query |
| `GET /api/analytics/summary` | Summary stats |
| `GET /api/analytics/export` | Export data (CSV) |
| `GET /api/settings` | Get settings |
| `PUT /api/settings` | Update settings |
| `GET /api/team` | List team |
| `POST /api/team/invite` | Invite member |
| `DELETE /api/team/:id` | Remove member |

## Seed Data

The seed creates two Spanish SaaS companies:
- **RecursosHR Analytics** — HR analytics platform (pro plan)
- **NóminaPro** — Payroll management (enterprise plan)

Default users:
- admin@recursoshr.com / admin123
- editor@recursoshr.com / editor123
- viewer@recursoshr.com / viewer123

## Known Issues

See `KNOWN-ISSUES.md` for a list of bugs and incomplete features suitable for practice.

## License

See `LICENSE` and `CLA.md` for licensing information.
