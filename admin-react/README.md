# choma Admin Dashboard - React

A modern admin dashboard built with React, TypeScript, and Tailwind CSS.

## Features

- 📊 Dashboard with key metrics
- 📋 Orders management with filtering and assignment
- 👨‍🍳 Chef management (coming soon)
- 👥 User management (coming soon)
- 🎨 Clean, responsive UI with Tailwind CSS
- ⚡ Fast development with Vite
- 🔧 TypeScript for better development experience

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3001](http://localhost:3001) to view the dashboard

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout wrapper
│   ├── Sidebar.tsx     # Navigation sidebar
│   └── Header.tsx      # Top header
├── pages/              # Page components
│   ├── Dashboard.tsx   # Dashboard overview
│   ├── Orders.tsx      # Orders management
│   ├── Chefs.tsx       # Chef management
│   └── Users.tsx       # User management
├── services/           # API services (coming soon)
├── types/              # TypeScript type definitions
└── App.tsx             # Main app component
```

## Backend Integration

The app is configured to proxy API requests to `http://localhost:5001`. Make sure your backend is running on port 5001.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Heroicons** - Icon library