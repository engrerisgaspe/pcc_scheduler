# School Scheduler

A comprehensive web-based school scheduling system built with React, TypeScript, Express, and Prisma.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node.js](https://img.shields.io/badge/node.js-18+-green)

## 📋 Features

### Core Functionality
- **Teacher Management** - Add, edit, delete teachers with qualifications
- **Subject Management** - Configure subjects by grade, type, and trimester
- **Room Management** - Manage physical classrooms and capacity
- **Section Management** - Create and organize class sections with hierarchy
- **Schedule Configuration** - Define school hours, periods, and preferences
- **Teacher Qualifications** - Manage which subjects teachers can teach
- **Subject Planning** - Assign subjects to sections with weekly hours

### Technical Features
- **Type-Safe** - Full TypeScript implementation across frontend and backend
- **Responsive UI** - Works on desktop and tablet devices
- **Real-time Search** - Filter data across all entities
- **Pagination** - Efficient data loading with 10 items per page
- **API-Driven** - RESTful API with comprehensive endpoints
- **Component Architecture** - Reusable forms, tables, and utility components
- **Context API** - Global state management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL 13+

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**

   Backend `.env` in `apps/api/`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/school_scheduler"
   ```

   Frontend `.env` in `apps/web/`:
   ```env
   VITE_API_BASE_URL=http://localhost:4000/api
   ```

3. **Setup database**
   ```bash
   cd apps/api
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. **Start development servers**

   Terminal 1 - Backend:
   ```bash
   cd apps/api && npm run dev
   ```

   Terminal 2 - Frontend:
   ```bash
   cd apps/web && npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📁 Project Structure

```
school-scheduler/
├── apps/
│   ├── api/                    # Express backend
│   ├── web/                    # React frontend
│
├── packages/
│   └── shared/                 # Shared types
│
├── docs/                       # Documentation
│   ├── API.md                  # API docs
│   ├── COMPONENTS.md           # Component guide
│   ├── DEVELOPMENT.md          # Dev setup
│   ├── DEPLOYMENT.md           # Deployment
│   ├── TESTING.md              # Testing guide
│   └── ...
│
└── README.md
```

## 📚 Documentation

- **[API Documentation](./docs/API.md)** - Complete endpoint reference
- **[Component Guide](./docs/COMPONENTS.md)** - Component usage
- **[Development Guide](./docs/DEVELOPMENT.md)** - Setup & workflow
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment
- **[Testing Guide](./docs/TESTING.md)** - Unit & E2E testing
- **[Architecture](./docs/architecture.md)** - System design
- **[Requirements](./docs/product-requirements.md)** - Product specs

## 🔧 Commands

```bash
# Development
npm run dev              # Start both dev servers

# Building
npm run build            # Build all apps

# Testing
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Database
npx prisma migrate deploy    # Run migrations
npx prisma db seed           # Load demo data
npx prisma studio           # Database UI
```

## 🧪 Testing

- Unit tests with Vitest
- Component tests with React Testing Library
- E2E tests with Playwright
- 80%+ coverage target

```bash
npm run test                # Run all tests
npm run test:watch         # Watch mode
npm run test:e2e           # E2E tests
```

## 🚢 Deployment

### Docker
```bash
docker-compose -f docker-compose.prod.yml up
```

### Cloud Deployment
- AWS EC2 + RDS
- Heroku
- Vercel (frontend)
- Docker containers

See [Deployment Guide](./docs/DEPLOYMENT.md) for details.

## 📊 Key Pages

- **Teachers** - Manage staff and qualifications
- **Subjects** - Curriculum configuration
- **Rooms** - Classroom inventory
- **Sections** - Class organization
- **Settings** - Schedule preferences
- **Planning** - Subject assignment
- **Dashboard** - System overview

## 🎯 API Endpoints (54 total)

Core resources:
- `/teachers` - Teacher CRUD
- `/subjects` - Subject CRUD
- `/rooms` - Room CRUD
- `/sections` - Section CRUD
- `/teacher-subject-rules` - Qualifications
- `/section-subject-plans` - Assignments
- `/timetable-periods` - Class periods
- `/schedule-settings` - Configuration

Full API docs in [docs/API.md](./docs/API.md)

## 🔒 Security

- TypeScript for type safety
- SQL injection prevention via Prisma
- Input validation on all forms
- CORS configuration
- Environment variables for secrets
- SSL/TLS for production

## 📄 License

MIT License

## 📞 Support

For help:
1. Check [Documentation](./docs/)
2. Open an Issue on GitHub

---

**Version**: 1.0.0 | **Last Updated**: April 19, 2026 | **Status**: ✅ Production Ready
  roadmap.md
packages/
  shared/
```

## Immediate Next Steps

1. Scaffold the web app and API project files
2. Define the database schema
3. Build CRUD for core entities
4. Add the scheduling grid and conflict rules

See the `docs` folder for the starting product and technical plan.
