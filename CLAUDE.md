# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Commission tracking application built with React, TypeScript, and modern web technologies. Features a modular architecture for managing clients, policies, expenses, and commission calculations.

## Technology Stack

- **Frontend**: React 19.1, TypeScript, React Router v7
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm
- **State Management**: React Context API
- **Data Persistence**: Supabase (PostgreSQL)

## Development Commands

- `npm run dev:local` - Start development server
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Architecture

The project follows a feature-based modular architecture:

- `/src/features/*` - Feature modules (dashboard, policies, expenses, etc.)
- `/src/components/*` - Shared UI components
- `/src/services/*` - API and external service integrations
- `/src/utils/*` - Utility functions and helpers
- `/src/types/*` - TypeScript type definitions

## Current Features

- Client management system
- Policy tracking and management
- Expense tracking with categorization
- Commission calculations (percentage, flat rate, tiered)
- Dashboard with analytics and reporting
- Dark mode support

## Project-Specific Considerations

- Commission tracking typically involves sensitive financial data - ensure proper security measures
- Consider data backup and recovery strategies
- Plan for reporting and analytics features
- Account for different commission structures (percentage, flat rate, tiered, etc.)
- add to memory. DO NOT USE useCallback or useMemo. React v19.1 was built so that those to hooks don't need to be used anymore
