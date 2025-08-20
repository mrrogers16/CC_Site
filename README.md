# Healing Pathways Counseling Website

A professional counseling practice website built with Next.js 14+, TypeScript, Tailwind CSS, and Prisma ORM. This application provides appointment booking, service information, blog functionality, and contact forms for a mental health counseling practice.

## 🚀 Features

- **Modern Stack**: Next.js 14+ with App Router, TypeScript, Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations
- **Authentication**: Ready for NextAuth.js integration
- **Appointment Booking**: Complete booking system with calendar integration
- **Content Management**: Blog functionality with MDX support
- **Contact Forms**: Validated contact forms with email notifications
- **Testing**: Jest for unit testing, Playwright for E2E testing
- **Code Quality**: ESLint, Prettier, and strict TypeScript configuration

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **PostgreSQL** (v14.0 or higher)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd counseling-site
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration:
   - Database connection string
   - Email service credentials
   - API keys for integrations

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   
   # (Optional) Seed with initial data
   npm run db:seed
   ```

## 🚀 Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

**Development**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

**Code Quality**
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking

**Testing**
- `npm run test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run Playwright E2E tests

**Database**
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
├── components/
│   ├── ui/                # Reusable UI components
│   ├── forms/             # Form components with validation
│   ├── layout/            # Header, footer, navigation
│   └── sections/          # Page sections (hero, services, etc.)
├── lib/
│   ├── db/                # Database connection and utilities
│   ├── validations/       # Zod schemas for data validation
│   ├── utils/             # Utility functions
│   ├── errors/            # Custom error classes
│   └── config/            # Site configuration
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions
```

## 🎨 Design System

The website uses a calming, professional color palette suitable for a counseling practice:

- **Primary**: Sage Green (#4a8b8c) - calming and trustworthy
- **Secondary**: Lighter Sage (#7a9e9f)
- **Accent**: Warm Beige (#b5a588) - approachable
- **Typography**: Inter (body) + Playfair Display (headings)

## 🔧 Configuration

### Database Schema

The application includes models for:
- Users and authentication
- Services offered
- Appointment booking system
- Contact form submissions
- Blog posts and content management

### Environment Variables

Key environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Authentication secret
- Email service configuration
- Calendar integration settings
- Payment processing (Stripe)

## 📱 Key Features

### Appointment Booking
- Calendar-based booking interface
- Email confirmations and reminders
- Status tracking and management
- Conflict resolution

### Content Management
- Blog with MDX support
- SEO optimization
- Image optimization
- Dynamic sitemap generation

### Contact System
- Validated contact forms
- Email notifications
- Lead tracking and management

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Component and utility function testing with Jest
- **Integration Tests**: API route testing
- **E2E Tests**: Critical user flow testing with Playwright
- **Coverage**: Minimum 70% coverage threshold

Run all tests:
```bash
npm run test && npm run test:e2e
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Set up email service
5. Configure domain and SSL

### Recommended Hosting
- **Vercel** - Seamless Next.js deployment
- **Railway/Render** - Full-stack applications
- **AWS/Google Cloud** - Enterprise solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Review the `CLAUDE.md` file for development guidance
- Contact the development team

## 🔐 Security

This application includes:
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Secure session management

Report security issues privately to the development team.
