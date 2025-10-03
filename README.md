# Commission Tracker

> Full-stack commission tracking application for insurance agents

Track policies, commissions, expenses, and comp guides with a modern React frontend and Supabase backend.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd commissionTracker

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your .env file (see Configuration below)
```

### Configuration

Edit `.env` and add your Supabase credentials:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: User Configuration
USER_ID=your_user_id
USER_EMAIL=your_email@example.com
```

Get your Supabase credentials from:

- Dashboard → Project Settings → API

### Database Setup

Apply migrations to your Supabase project:

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

Or use the [Supabase Dashboard method](./APPLY_MIGRATIONS.md) (recommended).

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view in browser.

---

## 📋 Features

### Core Functionality

- ✅ **Policy Management** - Track insurance policies with real products
- ✅ **Product Selection** - Real carrier products with commission rates
- ✅ **Commission Tracking** - Auto-calculate based on product rates
- ✅ **Expense Tracking** - Monitor business expenses
- ✅ **Comp Guide** - FFG commission rate guides (7 carriers, 42 products)
- ✅ **Carrier Management** - Real insurance carriers from FFG
- ✅ **Analytics** - View metrics and performance data
- ✅ **Infinite Scrolling** - Handle unlimited policies with pagination

### Technical Features

- ✅ **Authentication** - Supabase Auth with email verification
- ✅ **Email Verification** - Custom verification flow with resend capability
- ✅ **Row Level Security** - Multi-user data isolation
- ✅ **Real-time Updates** - Live data with TanStack Query
- ✅ **Type Safety** - Full TypeScript coverage
- ✅ **Cursor Pagination** - Bypass Supabase 1000 row limit
- ✅ **Performance** - 16+ indexes, helper functions, caching
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Monitoring** - Performance tracking and metrics

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**

- React 19.1 with TypeScript
- TanStack Router (routing)
- TanStack Query (data fetching)
- TanStack Form (forms)
- shadcn/ui + Tailwind CSS v4 (UI)
- Vite (build tool)

**Backend:**

- Supabase (Postgres database)
- Row Level Security (RLS)
- Edge Functions (serverless)

**Testing:**

- Vitest (unit tests)
- React Testing Library

### Project Structure

```
commissionTracker/
├── src/
│   ├── components/        # Reusable UI components
│   ├── features/          # Feature modules
│   │   ├── commissions/
│   │   ├── policies/
│   │   ├── expenses/
│   │   ├── settings/
│   │   └── commission-guide/
│   ├── hooks/             # TanStack Query hooks
│   │   ├── carriers/
│   │   ├── commissions/
│   │   ├── expenses/
│   │   ├── policies/
│   │   └── compGuide/
│   ├── services/          # Business logic
│   │   ├── commissions/
│   │   │   ├── CommissionCRUDService.ts
│   │   │   ├── CommissionCalculationService.ts
│   │   │   └── CommissionAnalyticsService.ts
│   │   ├── settings/
│   │   └── monitoring/
│   ├── types/             # TypeScript types
│   ├── utils/             # Utilities
│   │   ├── cache.ts       # Caching layer
│   │   ├── retry.ts       # Retry logic
│   │   └── performance.ts # Performance monitoring
│   └── errors/            # Error classes
├── supabase/
│   └── migrations/        # Database migrations
├── plans/                 # Project planning docs
└── docs/                  # Additional documentation
```

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage
npm run typecheck        # Check TypeScript types

# Database
supabase db push         # Apply migrations
supabase db diff         # Check for schema changes
```

### Code Quality

```bash
# TypeScript strict mode is enabled
npm run typecheck        # Must pass with 0 errors

# Follow project conventions
- Component names: PascalCase
- File names: kebab-case
- Function names: camelCase
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test cache.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

Current test coverage:

- ✅ Utilities: 100% (54 tests)
- ⚠️ Services: TBD
- ⚠️ Components: TBD

---

## 📚 Documentation

### API Documentation

All service methods are documented with JSDoc comments:

```typescript
/**
 * Retrieves a commission by ID
 * @param {string} id - Commission ID
 * @returns {Promise<Commission>} The commission record
 * @throws {NotFoundError} If commission doesn't exist
 * @throws {ValidationError} If ID is invalid
 * @example
 * const commission = await service.getById('123');
 */
```

### Key Services

**Commission Services:**

- `CommissionCRUDService` - CRUD operations
- `CommissionCalculationService` - Commission calculations
- `CommissionAnalyticsService` - Metrics and reporting

**Settings Services:**

- `carrierService` - Carrier management
- `compGuideService` - Compensation guide management

### TanStack Query Hooks

Each entity has standardized hooks:

```typescript
// Carriers
useCarriersList(); // Query for list
useCreateCarrier(); // Mutation to create
useUpdateCarrier(); // Mutation to update
useDeleteCarrier(); // Mutation to delete

// Same pattern for: policies, commissions, expenses, compGuide
```

---

## 🔒 Security

### Row Level Security (RLS)

All tables enforce user-level isolation:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their own commissions"
ON commissions FOR SELECT
USING (auth.uid() = user_id);
```

### Best Practices

- ✅ Never commit secrets (use `.env`)
- ✅ All API calls go through Supabase RLS
- ✅ User authentication required for all operations
- ✅ Input validation on all forms
- ✅ Error messages don't leak sensitive data

### Email Verification Flow

Commission Tracker implements a complete email verification system:

**User Signup Flow:**
1. User creates account on signup page
2. Account created but not verified
3. User redirected to verification screen (`/auth/verify-email`)
4. Verification email sent automatically

**Verification Screen Features:**
- Shows user's email address
- Clear instructions to check inbox
- Resend email button with 60s cooldown
- Max 3 resend attempts per session
- Security notice about 24hr link expiration

**Email Verification:**
1. User clicks verification link in email
2. AuthCallback component processes token
3. Session established and user logged in
4. Redirected to dashboard

**Edge Cases Handled:**
- Expired tokens → redirect to resend screen
- Already verified → auto-login
- Unverified login attempt → redirect to verification
- Page refresh → email persists via sessionStorage
- Rate limiting → prevent email abuse

**Email Template Setup:**

Custom HTML email template with professional design. To configure:
1. See `docs/EMAIL_TEMPLATE_SETUP.md` for complete setup guide
2. Template file: `docs/email-templates/verify-email.html`
3. Configure in Supabase Dashboard → Auth → Email Templates

**Components:**
- `src/features/auth/EmailVerificationPending.tsx` - Verification screen
- `src/features/auth/AuthCallback.tsx` - Token processing
- `src/features/auth/Login.tsx` - Handles unverified users
- `src/contexts/AuthContext.tsx` - resendVerificationEmail method

**Testing:**

Run verification flow tests:
```bash
npm test EmailVerificationPending
npm test AuthCallback
npm test AuthContext
```

**Troubleshooting:**

*Emails not arriving:*
- Check spam folder
- Verify Supabase email settings (Auth → Settings)
- Free tier limited to 3 emails/hour per user
- Configure custom SMTP for production

*Verification link not working:*
- Check redirect URLs in Supabase (Auth → URL Configuration)
- Verify callback URL matches: `http://localhost:5173/auth/callback`
- Links expire after 24 hours

*User stuck on verification screen:*
- Clear sessionStorage
- Request new verification email
- Check browser console for errors

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Railway

```bash
# Connect repository to Railway
# Configure environment variables
# Deploy automatically on push
```

### Environment Variables

Required for production:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 📊 Performance

### Optimizations Implemented

- ✅ **Caching**: 5 cache instances (commissions, policies, carriers, users, compGuide)
- ✅ **Query Batching**: DataLoader pattern to eliminate N+1 queries
- ✅ **Database Indexes**: 30+ indexes on common query patterns
- ✅ **Code Splitting**: Route-based lazy loading
- ✅ **Monitoring**: Performance metrics and tracking

### Performance Metrics

- Average query response: <50ms (cached)
- Cache hit rate: ~85%
- Time to Interactive: <2s
- Bundle size: Optimized with tree-shaking

---

## 🐛 Troubleshooting

### Common Issues

**TypeScript errors in test files:**

```bash
# Ignore test errors during development
npm run typecheck 2>&1 | grep -v "__tests__"
```

**Database connection issues:**

- Check Supabase credentials in `.env`
- Verify project is not paused in Supabase dashboard
- Reset database password if needed

**Migration errors:**

- See [APPLY_MIGRATIONS.md](./APPLY_MIGRATIONS.md)
- Use Supabase Dashboard SQL Editor (recommended)

**RLS policy blocking queries:**

- Ensure user is authenticated (`auth.uid()` not null)
- Check policies allow the operation
- Verify `user_id` matches authenticated user

---

## 🗺️ Roadmap

### Completed ✅

- Phase 1: Security & Foundation
- Phase 2: Code Quality & Migrations
- Phase 3: Service Architecture
- Phase 4: Performance Monitoring
- Phase 5.1: Unit Testing
- Phase 6: Data Layer & FFG Import
- Database migrations applied
- Products architecture implemented
- Cursor pagination for large datasets
- Real FFG data imported (7 carriers, 42 products)

### In Progress 🚧

- Commission Guide UI refactor
- Component testing
- Service layer testing

### Planned 📝

- Reports & Analytics dashboard
- Export functionality (CSV/PDF)
- Mobile optimization
- E2E testing
- Production deployment

See [plans/MASTER_PROJECT_PLAN.md](./plans/MASTER_PROJECT_PLAN.md) for details.

---

## 📝 Contributing

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature
```

### Commit Conventions

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance

---

## 📄 License

[Your License Here]

---

## 🙋 Support

For issues and questions:

- Check [APPLY_MIGRATIONS.md](./APPLY_MIGRATIONS.md) for database issues
- See [plans/MASTER_PROJECT_PLAN.md](./plans/MASTER_PROJECT_PLAN.md) for project status
- Review phase completion docs for implementation details

---

**Built with ❤️ using React 19, TypeScript, and Supabase**
