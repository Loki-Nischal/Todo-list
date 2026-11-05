# Daylight

A responsive todo app built with **Next.js App Router, React, Tailwind CSS, and Django**, with SQLite persistence.

## Run locally

Requires Node.js 20.9+ and Python 3.10+.

```sh
npm install
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/python backend/manage.py migrate
```

Run the backend in one terminal:

```sh
npm run backend
```

Run the frontend in another:

```sh
npm run dev
```

Open http://localhost:3000. Django runs on http://127.0.0.1:8000; Next.js forwards `/api/` requests to it. Both servers must be running.

## Features

- Create, edit, complete, reopen, and delete tasks.
- Optional notes and due dates; low, medium, and high priorities.
- Personal, Work, and Learning projects.
- All tasks, Today, Upcoming, and Completed views.
- Search, status filters, and sorting by date, priority, or newest.
- Live task totals and completion progress.
- Responsive navigation, keyboard accessible task dialog, and search shortcut (Cmd/Ctrl+K).
- Empty, loading, and connection error states; no demo data is added automatically.

Tasks are stored in `backend/db.sqlite3`. Each browser receives an anonymous session cookie and its own task list. The session lasts one year; clearing cookies or using another browser creates a separate workspace. This starter does not include account login or cross-device synchronization. Django CSRF protection is enabled for all mutations.

## Checks

```sh
npm run lint
npm run build
npm run test:backend
```

With both servers running and Google Chrome installed, run `npm run test:e2e` for desktop task workflows and mobile navigation checks. The Next.js scripts use Webpack for compatibility with restricted local environments.

After building, `npm start` serves the production frontend. Keep Django running separately.

## Configuration

See `.env.example`. Next.js reads `DJANGO_API_URL` from `.env.local`. Set Django variables in the shell environment; Django does not load `.env` files automatically. Local development trusts `localhost` and `127.0.0.1` on ports 3000 and 3001 (Next.js may choose 3001 when 3000 is occupied). For any other address or port, set `DJANGO_CSRF_TRUSTED_ORIGINS` to a comma-separated list of your frontend origins and restart Django. An explicit value replaces the defaults. Production requires explicit trusted origins.

For deployment, set `DJANGO_DEBUG=0`, a private `DJANGO_SECRET_KEY`, allowed hosts and HTTPS CSRF origins, use a production WSGI server, and persist/back up the database. Secure cookies are enabled when debug is disabled.

## Structure

- `src/app/`: Next.js page, layout, and metadata.
- `src/App.jsx`: task dashboard and task editor.
- `src/App.css`: Tailwind CSS and visual styling.
- `backend/config/`: Django configuration and routes.
- `backend/todos/`: task model, API, migrations, and tests.

Framework setup references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides).
