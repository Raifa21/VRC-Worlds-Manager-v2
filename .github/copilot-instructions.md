# Project Overview

This is a desktop application built with **Next.js** (frontend) and **Tauri** (backend in Rust).  
We follow **Test-Driven Development (TDD)**, keeping changes small and iterative.  
The focus is on correctness, maintainability, and clarity.

## Folder Structure

- `/src`: Next.js frontend source code
- `/src-tauri`: Tauri backend (Rust)
- `/public`: Static assets
- `/docs`: Documentation and specs

## Libraries and Frameworks

- Next.js + React (frontend)
- Tailwind CSS for styling
- Shadcn/UI for UI components
- Tauri (Rust backend)
- @tauri-apps/plugin-log for logging

## Coding Standards

- TypeScript strict mode
- Functional components + hooks
- Arrow functions for callbacks
- **All logs must use `@tauri-apps/plugin-log` instead of `console.log`.**
- Git commits follow conventional commits

## Development Workflow

- Practice **TDD**: always write a failing test first, then code, then refactor.
- Apply **YAGNI**: only implement what is necessary for current requirements.
- Work in **baby steps**: make minimal changes, run tests, commit often.
- Strive for **pair programming** style thinking: explain decisions as if to a peer.
- Keep refactors incremental and supported by tests.

## Tauri Guidelines

- Use Tauri commands for backend logic (no direct Node APIs).
- Access filesystem and OS APIs only through Tauri secure APIs.
- Store configuration in `AppConfigDir` or `AppDataDir`.
- Keep Rust backend minimal; domain/business logic should stay in the frontend.

## Testing & QA

- Storybook (with Vite builder) for component previews
- Lost Pixel for visual regression testing (preferred)
- Vitest + Testing Library for unit/integration tests

## UI Guidelines

- Provide light/dark mode toggle
- Favor grid-based layouts for clarity
- Maintain consistent padding, spacing, and modern design
