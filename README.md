# Circl

Circl is a Next.js accountability workspace for building small, recurring focus circles. It helps people organize standing accountability groups, join live work sessions, and stay consistent with shared streaks, synchronized timers, and collaborative check-ins.

This project is built as a lightweight social productivity MVP for deep work, study, admin, and creative sessions.

## Product overview

Circl combines three core ideas:

- Standing circles: recurring accountability groups with shared time slots and weekly streaks
- Drop-in sessions: lightweight rooms for ad hoc coworking and quick focus sprints
- Live focus rooms: synchronized timers, member goals, status tracking, and chat for a shared work experience

The app is designed around short, encouraging accountability loops rather than solo productivity tools.

## Key features

- Create and browse focus circles
- Filter between standing circles and drop-in rooms
- Join an active session from a circle card
- Shared session timer with synchronized countdown across members
- One-line personal goal declarations
- Camera/availability indicators for each participant
- Progress status check-ins: Done, Partial, or Blocked
- Real-time chat inside a session
- Weekly streak tracking for standing circles
- Invite links to grow or share a circle
- Authentication with email/password and a mock Google-style sign-in path
- Prisma-based persistence with SQLite for local development

## Tech stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite database
- Socket.IO for real-time room events
- JWT-based auth cookies
- bcrypt for password hashing

## Repository structure

```text
Circl/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── circles/
│   │   │   ├── invite/
│   │   │   └── sessions/
│   │   ├── fonts/
│   │   ├── globals.css
│   │   ├── invite/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── room/
│   ├── lib/
│   │   ├── auth.ts
│   │   └── prisma.ts
│   └──
├── .eslintrc.json
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── server.js
├── tailwind.config.ts
├── tsconfig.json
├── README.md
└── package-lock.json
```

## Core app flow

### 1. User onboarding
Users sign in or create an account from the landing page. Authentication is handled through server routes under `src/app/api/auth/` and JWT cookies managed via `src/lib/auth.ts`.

### 2. Circle creation and discovery
Authenticated users can create circles and browse existing public circles. Circle creation logic lives in `src/app/api/circles/route.ts` and is presented on the home dashboard in `src/app/page.tsx`.

### 3. Session participation
When a user joins a circle session, they are redirected to a live room at `/room/[sessionId]`. That page provides:

- synchronized countdown timer
- participant cards and goal declarations
- session status check-ins
- text chat
- invite sharing and standing circle conversion

### 4. Real-time collaboration
Socket.IO is used in `server.js` to broadcast events like:

- user joins
- goal updates
- camera toggles
- status changes
- chat messages
- timer synchronization

## Database model

The Prisma schema defines the main domain objects:

- User
- Circle
- CircleMember
- Session
- SessionParticipant
- ChatMessage

Major schema concepts:

- One user can organize many circles and join many circles
- Each circle can have multiple members and sessions
- A session is tied to a circle and includes participants and chat messages
- Standing circles support recurring accountability and streak tracking

## Local development

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file in the project root if needed for local configuration. At minimum, the app expects a JWT secret for auth token signing.

```bash
JWT_SECRET=your-local-jwt-secret
```

For production, you should also set a stronger secret and use a secure database configuration if moving beyond the SQLite local setup.

### Prepare the database

The schema uses SQLite via Prisma:

```bash
npx prisma generate
npx prisma db push
```

If the SQLite file is not present, Prisma will create it for local development.

### Start the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Production scripts

```bash
npm run build
npm run start
```

The project also includes a custom `server.js` entry to run the Next.js app alongside Socket.IO, which is important for the live room experience.

## Notes on architecture

This repo intentionally keeps the app simple and product-focused:

- App routes in `src/app` handle the user interface and API endpoints
- Shared logic lives in `src/lib`
- Prisma schema centralizes persistence rules
- Socket server runs alongside Next to enable collaboration in real time
- The app is optimized for a small, intimate group workflow rather than large-scale multi-user conferencing

## Security and defaults

A default fallback JWT secret is defined in `src/lib/auth.ts` for local development (`tiny-focus-circles-secret-key-12345`), but this should be replaced in production with a secure environment variable.

## Roadmap ideas

Possible extensions for the project include:

- real Google OAuth integration
- recurring event scheduling and calendar sync
- push notifications and reminders
- richer member analytics and streak dashboards
- room moderation and organizer controls
- improved mobile UX for live sessions

## License

This project currently does not appear to declare a license file in the repository root. If you plan to publish or distribute it externally, consider adding an explicit license such as MIT.

## Summary

Circl is a small but compelling focus community product: it turns lightweight productivity sessions into social accountability loops. The project is built around recurring work circles, shared sessions, and live coordination, making it a good example of a focused collaboration app built with Next.js, Prisma, and Socket.IO.


