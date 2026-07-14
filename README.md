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
