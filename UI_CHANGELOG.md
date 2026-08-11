# HeartBeat UI/UX production pass

## What changed
- Reworked the active application shell in `src/App.jsx` with a production dashboard layout.
- Added responsive desktop/tablet/mobile navigation.
- Added a sticky glass-style top bar with realtime connection state.
- Improved visual hierarchy, spacing, typography, cards, filters, and active navigation states.
- Added mobile bottom navigation and a mobile navigation drawer.
- Redesigned the dashboard hero area as an operations command center while preserving existing dashboard data/API behavior.
- Added global baseline styles in `src/index.css`.

## Behavior preserved
- Existing authentication and token refresh flow.
- Existing WebSocket live-event behavior, with reconnect backoff retained.
- Existing dashboard API calls and filters.
- Existing Reports, Failures, Analytics, Clients, Bots, Departments, Users, and Account views.

## Validation
- Vite production build completed successfully with minification disabled only for the validation environment because the uploaded dependency tree is missing the platform-specific Lightning CSS native binary.
