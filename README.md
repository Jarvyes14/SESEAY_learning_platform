# Government Learning Platform MVP

Functional learning management MVP for government integrity, ethics, transparency, compliance,
accountability, and anti-corruption training.

## Stack

- React, React Router, Tailwind CSS, and Vite
- Express REST API
- PostgreSQL and Prisma ORM
- JWT authentication stored in httpOnly cookies
- Docker Compose with frontend, backend, PostgreSQL, and pgAdmin

## Start the platform

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend health check: http://localhost:4000/health
- pgAdmin: http://localhost:5050

Local development uses the Vite dev server for the frontend.

Initial platform account:

- Email: `admin@example.gov`
- Password: `Admin123!`
- Role: `platform_admin`

No organizations, courses, students, enrollments, grades, progress, or certificates are seeded.
The seed is repeatable and does not delete data created after initial startup.

## pgAdmin

Sign in to pgAdmin with the values from `.env`:

- Email: `admin@example.gov`
- Password: `admin_dev_password`

Register the PostgreSQL server using:

- Host: `postgres`
- Port: `5432`
- Database: `integrity_learning`
- Username: `integrity`
- Password: `integrity_dev_password`

In production, pgAdmin is optional and only starts when the `tools` profile is enabled.

## First-use workflow

1. Sign in as the platform administrator.
2. Create an organization if institution-specific accounts or certificate names are needed.
3. Create an instructor and a student from **Users**.
4. Create a draft course from **Courses**.
5. Build its hierarchy: course blocks, topics, and activities.
6. Publish the course after at least one activity exists.
7. Sign in as the student and enroll.
8. Complete activities in sequence.
9. Review assignment submissions from **Grades**.
10. A certificate is generated only after full completion and a passing final grade.

## Course model

```text
Course
  CourseBlock
    Topic
      Activity
```

Supported activity types:

- YouTube video
- Reading content
- Questions
- Incorrect section identification
- Assignment forms
- Final exams

## Anti-skip and grading rules

- Activity progress is initialized when a student enrolls.
- Only the first activity is initially available.
- Completing one activity unlocks the next activity across topic and block boundaries.
- Reading completion requires server-measured minimum elapsed time and explicit confirmation.
- Video completion requires server-checked elapsed time and the configured watch percentage.
- Questions and exams require complete answers and are automatically graded.
- Assignment forms enforce required fields and remain pending until instructor review.
- Attempts are stored individually.
- Final grade uses the best grade for each graded activity.
- Topic and block percentages are calculated from their activity records.
- Course percentage is calculated from all activity records.
- Certificates require 100% completion, a passing final grade, and certificate enablement.

## Roles

- `platform_admin`
- `government_admin`
- `organization_admin`
- `instructor`
- `student`

Public registration is disabled. Administrators create user accounts.

## API

All routes are prefixed with `/api`.

- `/auth`
- `/users`
- `/organizations`
- `/courses`
- `/blocks`
- `/topics`
- `/activities`
- `/enrollments`
- `/progress`
- `/grades`
- `/certificates`
- `/reports`

The API uses authentication middleware, role checks, Zod request validation, bcrypt password
hashing, Helmet, credentialed CORS, and rate limiting on login.

## Database and migrations

Apply migrations and seed locally:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

The functional MVP migration intentionally removes the previous demonstration domain and data.
Back up any database that contains information you need before applying it.

## Production deployment with a domain

Production uses:

- Caddy as the public reverse proxy
- Automatic HTTPS certificates from Let's Encrypt
- Nginx serving the built React app
- Express behind the internal Docker network
- PostgreSQL on the internal Docker network

Only ports `80` and `443` need to be publicly exposed.

### 1. Point DNS to the server

Create an `A` record for your domain:

```text
capacitacion.tudominio.gob.mx -> SERVER_PUBLIC_IP
```

Wait until DNS resolves to the server.

### 2. Configure `.env`

Copy the template:

```bash
cp .env.example .env
```

Set the production values:

```env
APP_DOMAIN=capacitacion.tudominio.gob.mx
PUBLIC_APP_URL=https://capacitacion.tudominio.gob.mx
PUBLIC_API_URL=/api
ACME_EMAIL=admin@tudominio.gob.mx

POSTGRES_USER=integrity
POSTGRES_PASSWORD=use-a-strong-database-password
POSTGRES_DB=integrity_learning

JWT_SECRET=use-a-long-random-secret
COOKIE_SECURE=true
CLIENT_URL=https://capacitacion.tudominio.gob.mx
```

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

### 3. Start production

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Open:

```text
https://capacitacion.tudominio.gob.mx
```

The backend is available through the same domain:

```text
https://capacitacion.tudominio.gob.mx/api
https://capacitacion.tudominio.gob.mx/health
```

### 4. Optional pgAdmin in production

Start pgAdmin only when needed:

```bash
docker compose -f docker-compose.prod.yml --profile tools up -d pgadmin
```

Then open:

```text
http://SERVER_PUBLIC_IP:5050
```

For security, prefer keeping pgAdmin closed unless you are actively using it.

### Production routing

```text
https://your-domain/
  -> Caddy
  -> frontend container, Nginx static React build

https://your-domain/api/*
  -> Caddy
  -> backend container, Express API

https://your-domain/health
  -> Caddy
  -> backend container health check
```

### Production security checklist

- Use a real domain pointing to the server.
- Open firewall ports `80` and `443`.
- Use a strong `POSTGRES_PASSWORD`.
- Use a strong `JWT_SECRET`.
- Set `COOKIE_SECURE=true`.
- Set `CLIENT_URL` and `PUBLIC_APP_URL` to the HTTPS domain.
- Do not expose PostgreSQL publicly.
- Do not leave pgAdmin running publicly unless protected by additional network controls.

## Disabled features

Unimplemented operations remain visible but disabled in the interface, including bulk user import,
content import, report export, course duplication, and bulk certificate downloads.

## Stop services

```bash
docker compose down
```

To also delete PostgreSQL and pgAdmin volumes:

```bash
docker compose down -v
```
