# Marketing Compliance Platform - Frontend Setup

## Quick Start Guide

This React TypeScript frontend is designed to match the beautiful dashboard aesthetic you provided, adapted for a marketing compliance platform.

### 🚀 Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

### 🎨 Design Features

The frontend replicates the design aesthetic from your reference image:

#### **Layout & Navigation**
- **Fixed Sidebar**: Clean navigation with icons (Dashboard, Templates, Compliance, Analytics)
- **Brand Identity**: "MarketGuard" branding with blue accent
- **User Profile**: Header with search, notifications, and user info
- **Responsive Design**: Mobile-friendly layout

#### **Dashboard Components**
- **Welcome Section**: Gradient hero card with user greeting (Sarah Wilson, Marketing Manager, NY, USA)
- **Stats Cards**: Key metrics with icons and trend indicators
  - Active Templates (23)
  - Compliance Score (89%)
  - Pending Reviews (7)
  - Team Members (12)
- **Data Visualizations**: 
  - Pie chart for compliance overview
  - Bar charts for monthly performance
  - Line chart for compliance trends
- **Activity Feed**: Recent actions and notifications
- **Quick Actions**: Create templates, run checks, view analytics

#### **Color Scheme** (Matching Your Image)
- **Primary**: Blue gradients (`#0284c7` to `#0369a1`)
- **Secondary**: Purple accents (`#8b5cf6`)
- **Success**: Green (`#22c55e`)
- **Warning**: Orange (`#f59e0b`)
- **Background**: Soft gradients from pink to purple to indigo

#### **Typography & Spacing**
- **Font**: Inter (Google Fonts)
- **Cards**: Rounded corners with soft shadows
- **Spacing**: Consistent 6-unit grid system
- **Icons**: Lucide React icons for consistency

### 📊 Dashboard Features

#### **Compliance Metrics**
- **Real-time Scores**: Live compliance percentage tracking
- **Visual Indicators**: Color-coded status (green, yellow, red)
- **Trend Analysis**: Week-over-week improvement tracking

#### **Template Management**
- **Active Count**: Number of live marketing templates
- **Status Tracking**: Approved, pending, flagged templates
- **Quick Actions**: Create new templates directly from dashboard

#### **Activity Monitoring**
- **Recent Actions**: Template approvals, compliance checks, violations
- **Team Activity**: User actions and notifications
- **Priority Alerts**: Urgent compliance issues

### 🛠️ Technical Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Recharts** for data visualization
- **React Router** for navigation

### 📱 Responsive Design

The dashboard adapts beautifully across devices:
- **Desktop**: Full sidebar and multi-column layouts
- **Tablet**: Collapsible sidebar, adjusted grid
- **Mobile**: Hidden sidebar with drawer, single-column cards

### 🚦 Getting Started

1. **Install Dependencies**: Run `npm install` to set up all packages
2. **Start Development**: Use `npm run dev` to launch the dev server
3. **View Dashboard**: Open `http://localhost:3000` to see the interface
4. **Customize**: Modify colors, content, and layout in the React components

### 🎯 Next Steps for Hackathon

For your 3-day hackathon, focus on:

1. **Day 1**: Get the dashboard running and customize the data
2. **Day 2**: Connect to your Python FastAPI backend
3. **Day 3**: Add real compliance validation and demo scenarios

The foundation is ready - you just need to connect it to your backend API and add the compliance logic!

### 📂 File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.tsx      # Main layout wrapper
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   └── Header.tsx      # Top header with search/user
│   ├── pages/
│   │   ├── Dashboard.tsx   # Main dashboard (fully built)
│   │   ├── Templates.tsx   # Template management (placeholder)
│   │   ├── Compliance.tsx  # Compliance tools (placeholder)
│   │   └── Analytics.tsx   # Analytics view (placeholder)
│   ├── index.css          # Tailwind styles
│   ├── App.tsx            # Router setup
│   └── main.tsx           # App entry point
├── package.json           # Dependencies
├── tailwind.config.js     # Design system
└── vite.config.ts         # Build config
```

### 🎨 Customization

To match your specific branding:
1. **Colors**: Edit `tailwind.config.js` primary colors
2. **Logo**: Replace "MarketGuard" in `Sidebar.tsx`
3. **User Info**: Update name/role in `Header.tsx` and `Dashboard.tsx`
4. **Content**: Modify the dashboard cards and metrics to fit your demo

The interface is ready to showcase your marketing compliance platform! 🚀

$env:APP_CONFIG = "development.env"; $env:APP_CONFIG_PATH = "config"; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000      