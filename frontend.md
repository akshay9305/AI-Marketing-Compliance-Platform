# CreatiVal-AI Frontend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Project Architecture](#project-architecture)
3. [Technology Stack](#technology-stack)
4. [Getting Started](#getting-started)
5. [Project Structure](#project-structure)
6. [Features](#features)
7. [Components](#components)
8. [Pages](#pages)
9. [Routing](#routing)
10. [Authentication](#authentication)
11. [API Integration](#api-integration)
12. [Styling](#styling)
13. [Configuration](#configuration)
14. [Development Workflow](#development-workflow)

---

## Overview

**CreatiVal-AI** is a unified email marketing platform that consolidates 5-7 fragmented marketing tools into a single, AI-powered interface. The platform enables marketing teams to create compliant, professional email templates in **15-30 minutes** instead of the traditional **4-8 hours**, delivering a **10-15x productivity improvement**.

### Key Value Propositions

| Metric | Traditional Process | CreatiVal-AI | Improvement |
|--------|---------------------|--------------|-------------|
| Time per Email | 1-2 weeks | 1-2 days | **10-15x Faster** |
| Tools Required | 5-7 platforms | 1 unified | **Zero Switching** |
| Manual Steps | 10-15 actions | 3-5 actions | **66% Reduction** |
| Error Rate | High | Low | **80% Reduction** |
| Compliance | Manual Review | Real-time AI | **100% Coverage** |

---

## Project Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Pages   │  │Components│  │  Hooks   │  │   Utilities      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    State Management (Local)                      │
├─────────────────────────────────────────────────────────────────┤
│                  React Router (Client-side)                      │
├─────────────────────────────────────────────────────────────────┤
│                        Axios (HTTP)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend API (FastAPI)                          │
│                   http://localhost:8000                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| TypeScript | 5.0.2 | Type Safety |
| Vite | 4.3.2 | Build Tool & Dev Server |
| Tailwind CSS | 3.3.0 | Styling |

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react-router-dom` | 6.8.1 | Client-side routing |
| `axios` | 1.3.4 | HTTP client for API calls |
| `@monaco-editor/react` | 4.4.6 | Code editor component |
| `mjml-browser` | 4.16.1 | MJML to HTML compilation |
| `@dnd-kit/core` | 6.3.1 | Drag and drop functionality |
| `lucide-react` | 0.263.1 | Icon library |
| `recharts` | 2.8.0 | Charts and analytics |
| `clsx` & `tailwind-merge` | Latest | CSS utility management |

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

---

## Project Structure

```
frontend/
├── public/                          # Static assets
│   └── expedia_marketing_template_corrected.html
├── src/
│   ├── App.tsx                      # Main application with routing
│   ├── main.tsx                     # Application entry point
│   ├── index.css                    # Global styles & Tailwind imports
│   ├── components/                  # Reusable components
│   │   ├── Header.tsx               # Top navigation bar
│   │   ├── Sidebar.tsx              # Side navigation menu
│   │   ├── Layout.tsx               # Main layout wrapper
│   │   ├── ProtectedRoute.tsx       # Auth guard component
│   │   ├── EnhancedTemplatePlayground.tsx  # Advanced template editor
│   │   ├── TemplatePlayground.tsx   # Basic template editor
│   │   ├── ModuleEditor.tsx         # Module editing component
│   │   ├── ElementEditor.tsx        # Element editing component
│   │   ├── EditableModule.tsx       # Editable module wrapper
│   │   ├── ElementsLibrary.tsx      # UI elements library
│   │   ├── ContentValidationTab.tsx # Content validation UI
│   │   ├── CTAVerificationTab.tsx   # CTA verification UI
│   │   ├── LocaleComparisonTab.tsx  # Locale comparison UI
│   │   └── GenerateReportTab.tsx    # Report generation UI
│   └── pages/                       # Page components
│       ├── Homepage.tsx             # Landing page
│       ├── Login.tsx                # Authentication page
│       ├── Dashboard.tsx            # Business user dashboard
│       ├── Templates.tsx            # Template library
│       ├── TemplateUpload.tsx       # Template upload & analysis
│       ├── Playground.tsx           # Template editor playground
│       ├── SocialMedia.tsx          # Social media content generator
│       ├── Compliance.tsx           # Compliance management
│       ├── Analytics.tsx            # Analytics dashboard
│       └── dev/                     # Developer-specific pages
│           ├── Dashboard.tsx        # Developer dashboard
│           ├── TemplateMigration.tsx # HTML to MJML migration
│           ├── Compliance.tsx       # Dev compliance tools
│           ├── Validation.tsx       # Validation tools
│           └── Settings.tsx         # Developer settings
├── index.html                       # HTML entry point
├── package.json                     # Dependencies & scripts
├── vite.config.ts                   # Vite configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
└── postcss.config.js               # PostCSS configuration
```

---

## Features

### 1. Template Editor

The template editor provides a comprehensive environment for creating and editing email templates.

#### Capabilities:
- **MJML/HTML Code Editor** with syntax highlighting (Monaco Editor)
- **Live Preview** with real-time compilation
- **Module-based Editing** - Visual module selection and editing
- **Handlebars Variable Support** - Dynamic content placeholders
- **Auto-save** functionality
- **Export** to HTML format

#### Usage:
```tsx
// Navigate to a template in the playground
/playground/:templateId
```

### 2. Template Upload & Analysis

Upload existing HTML templates for automatic analysis and module detection.

#### Features:
- Drag & drop file upload (.html, .htm, .mjml)
- Automatic module detection
- Structure analysis (tables, divs, complexity)
- Template schema generation

### 3. Compliance Engine

Real-time compliance validation against marketing regulations.

#### Regions Supported:
- 🇺🇸 United States
- 🇪🇺 European Union (GDPR)
- 🇨🇦 Canada (CASL)
- 🇦🇺 Australia
- 🇬🇧 United Kingdom
- 🇯🇵 Japan

#### Categories:
- Email Marketing
- Social Media Marketing
- Affiliate Marketing
- Advertising
- Data Privacy

### 4. Social Media Content Generator

AI-powered social media content creation with platform-specific validation.

#### Supported Platforms:
| Platform | Max Length | Features |
|----------|------------|----------|
| Instagram | 2,200 | Hashtags, Stories, Reels |
| LinkedIn | 3,000 | Professional tone, Articles |
| Facebook | 63,206 | Events, Groups, Long-form |
| Twitter/X | 280 | Threads, Quick updates |

### 5. Template Migration (Developer)

Convert legacy HTML templates to modern MJML format.

#### Features:
- HTML to MJML conversion
- Placeholder preservation
- Side-by-side comparison
- Visual validation
- Schema extraction

---

## Components

### Layout Components

#### `Layout.tsx`
Main layout wrapper that includes sidebar and header.

```tsx
interface LayoutProps {
  children: ReactNode;
}
```

#### `Header.tsx`
Top navigation bar with search, notifications, and user profile.

Features:
- Global search functionality
- Notification bell with badge
- User dropdown menu with logout

#### `Sidebar.tsx`
Collapsible side navigation with role-based menus.

```tsx
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}
```

**Business User Menu:**
- Dashboard
- Upload Template
- Templates
- Social Media
- Compliance

**Developer Menu:**
- Dashboard
- Templates
- Validation
- Template Migration
- Compliance
- Settings

### Authentication Components

#### `ProtectedRoute.tsx`
Route guard that redirects unauthenticated users.

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
}
```

### Editor Components

#### `EnhancedTemplatePlayground.tsx`
Advanced template editor with module-level editing.

Features:
- Module detection and mapping
- Visual and code editing modes
- History management (undo/redo)
- Real-time MJML compilation

```tsx
interface EnhancedTemplatePlaygroundProps {
  template: {
    id: number;
    name: string;
    html_content: string;
    modules: Module[];
  };
  onClose: () => void;
  onSave: (htmlContent: string) => void;
}
```

---

## Pages

### Public Pages

#### Homepage (`/`)
Landing page with animated hero section and login modal.

Features:
- Animated word rotation (Design, Modification, Compliance, etc.)
- Feature highlights
- Role selection (Business/Developer)

#### Login (`/login`)
Authentication page with role-based routing.

Supports:
- Email/password authentication
- Role selection (Business/Developer)
- Demo mode fallback

### Business User Pages

#### Dashboard (`/dashboard`)
Main dashboard with statistics and activity feed.

Displays:
- Active Templates count
- Compliance Score
- Pending Reviews
- Team Members
- Recent Activity feed
- Compliance breakdown charts

#### Templates (`/templates`)
Template library with filtering and selection.

Features:
- Template list with compliance scores
- Template preview
- Quick actions (Edit, Validate)

#### Template Upload (`/template-upload`)
Upload and analyze new templates.

Workflow:
1. Drag & drop or select file
2. Enter template metadata
3. Analyze template structure
4. Save to library

#### Playground (`/playground/:id`)
Full-featured template editor.

Features:
- Code/Preview toggle
- Element insertion
- Compliance checking
- AI-assisted corrections
- Download HTML

#### Social Media (`/social-media`)
AI-powered social content generator.

Features:
- Platform selection
- Content generation from prompts
- Compliance validation
- Preview and export

#### Compliance (`/compliance`)
Compliance management dashboard.

Features:
- Region-specific rules
- Category-based validation
- Template validation history
- Issue tracking

### Developer Pages

#### Dev Dashboard (`/dev/dashboard`)
Developer-focused metrics and tools.

Displays:
- Templates Migrated
- Module Validations
- Attribute Checks
- Active Migrations
- Module Health status

#### Template Migration (`/dev/migration`)
HTML to MJML migration tool.

Features:
- Side-by-side comparison
- Schema upload
- Visual validation
- MJML output

#### Dev Validation (`/dev/validation`)
Validation tools and testing.

#### Dev Compliance (`/dev/compliance`)
Developer compliance tools.

#### Dev Settings (`/dev/settings`)
Developer configuration options.

---

## Routing

### Route Configuration

```tsx
// Public Routes
<Route path="/" element={<Homepage />} />
<Route path="/login" element={<LoginPage />} />

// Protected Business Routes
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
<Route path="/template-upload" element={<ProtectedRoute><TemplateUpload /></ProtectedRoute>} />
<Route path="/playground/:id" element={<ProtectedRoute><Playground /></ProtectedRoute>} />
<Route path="/social-media" element={<ProtectedRoute><SocialMedia /></ProtectedRoute>} />
<Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
<Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

// Protected Developer Routes
<Route path="/dev/dashboard" element={<ProtectedRoute><DevDashboard /></ProtectedRoute>} />
<Route path="/dev/templates" element={<ProtectedRoute><DevSettings /></ProtectedRoute>} />
<Route path="/dev/migration" element={<ProtectedRoute><DevTemplateMigration /></ProtectedRoute>} />
<Route path="/dev/compliance" element={<ProtectedRoute><DevCompliance /></ProtectedRoute>} />
<Route path="/dev/validation" element={<ProtectedRoute><DevValidation /></ProtectedRoute>} />
```

---

## Authentication

### Authentication Flow

1. User navigates to login page
2. Enters credentials and selects role
3. Backend validates credentials
4. On success, stores:
   - `access_token` - JWT token
   - `user` - User object (JSON)
   - `user_role` - "Business" or "Developer"
5. Redirects to appropriate dashboard

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `access_token` | string | JWT authentication token |
| `user` | JSON string | User profile object |
| `user_role` | string | "Business" or "Developer" |
| `user_email` | string | User's email address |

### Demo Mode

If the backend is unavailable, the app falls back to demo mode:
- Sets `access_token` to "demo-token"
- Allows navigation with selected role
- Useful for frontend testing

---

## API Integration

### Base Configuration

```typescript
// API calls use axios with base URL
const API_BASE = 'http://localhost:8000';

// Example API call
const response = await axios.get(`${API_BASE}/api/templates`);
```

### API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/templates` | GET | List all templates |
| `/api/templates/:id` | GET | Get template by ID |
| `/api/templates/:id` | PUT | Update template |
| `/api/templates/:id/validate` | POST | Validate template compliance |
| `/api/template-analysis/upload-and-analyze` | POST | Upload and analyze template |
| `/api/templates/sample/corrected` | GET | Get corrected template |

### Vite Proxy Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Styling

### Tailwind CSS

The project uses Tailwind CSS for styling with custom configuration.

#### Custom Styles (index.css)

```css
/* Component classes defined in index.css */
.btn-primary { /* Primary button styles */ }
.btn-secondary { /* Secondary button styles */ }
.card { /* Card container styles */ }
.sidebar-item { /* Sidebar navigation item */ }
```

### Design System

#### Colors
- **Primary**: Blue (#3b82f6)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)
- **Purple**: (#8b5cf6)

#### Shadows
- `shadow-soft`: Subtle shadow for cards
- `shadow-medium`: Standard elevation
- `shadow-lg`: High elevation

#### Gradients
- Background: `from-pink-100 via-purple-50 to-indigo-100`
- Hero: `from-gray-900 via-slate-900 to-black`
- CTA: `from-blue-500 to-purple-600`

---

## Configuration

### Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### TypeScript Configuration (`tsconfig.json`)

- Target: ES2020+
- Strict mode enabled
- JSX: react-jsx
- Module resolution: bundler

### Tailwind Configuration (`tailwind.config.js`)

Custom configuration for:
- Content paths
- Theme extensions
- Custom utilities

---

## Development Workflow

### Local Development

1. Start the backend server on port 8000
2. Run `npm run dev` to start frontend on port 3000
3. Access at `http://localhost:3000`

### Building for Production

```bash
# Type check and build
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Run ESLint
npm run lint
```

### Environment Variables

Create a `.env` file for environment-specific configuration:

```env
VITE_API_URL=http://localhost:8000
```

---

## Troubleshooting

### Common Issues

#### 1. API Connection Failed
- Ensure backend is running on port 8000
- Check proxy configuration in `vite.config.ts`

#### 2. Authentication Issues
- Clear localStorage (`localStorage.clear()`)
- Check that backend auth endpoint is available

#### 3. MJML Compilation Errors
- Verify MJML syntax is correct
- Check browser console for specific errors

#### 4. Template Upload Fails
- Ensure file is valid HTML/MJML
- Check file size limits
- Verify backend endpoint is available

---

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow React hooks best practices
- Use functional components
- Maintain component modularity

### Git Workflow

1. Create feature branch from `main`
2. Make changes with clear commits
3. Run lint before committing
4. Create pull request for review

---

## License

This project is proprietary and confidential. All rights reserved.

---

*Documentation last updated: December 2025*
