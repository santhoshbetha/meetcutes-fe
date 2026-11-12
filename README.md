# MeetCutes Frontend

React/Vite client for MeetCutes, a real-world social discovery platform built around local events, proximity search, and authenticated profiles.

## Production stack

| Layer | Technology |
| --- | --- |
| UI | React 19, Vite 7, Tailwind CSS 4, shadcn/ui + Radix primitives |
| Icons | Lucide React + React Icons |
| Client state | Zustand |
| Server state | TanStack Query |
| Forms | Formik + Yup |
| Maps | Leaflet (loaded by the location workspace) |
| Realtime | Phoenix Channels JavaScript client |
| E2E | Playwright |
| Hosting | Cloudflare Pages/Workers via Wrangler |

Authentication, profiles, locations, events, discovery, discussions, notifications, billing, and media all run against the Meetcutes Elixir/Phoenix JSON API. The client uses an opaque bearer token and does not contain a hosted-BaaS SDK or Edge Function project.

## Requirements

- Node.js 20 or newer (Node 22 is used in the production Docker image).
- npm 10 or newer.
- A running Meetcutes Phoenix API, locally or remotely.
- A Geoapify browser key for location autocomplete.

## Local development

```bash
npm install
cp .env.example .env
```

Set the API endpoints in `.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/socket
VITE_SITE_URL=http://localhost:5173
VITE_REACT_APP_GEOAPIFY_API_KEY=your_geoapify_key
```

Start the Vite dev server:

```bash
npm run dev
```

The app is served at <http://localhost:5173> by default.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Phoenix JSON API base URL. Production builds must set this explicitly. |
| `VITE_WS_URL` | No | Phoenix socket URL. Defaults to the API origin with `/socket`. |
| `VITE_SITE_URL` | Recommended | Public frontend URL used for canonical links and redirects. |
| `VITE_REACT_APP_GEOAPIFY_API_KEY` | Yes for address search | Geoapify browser key for autocomplete. |
| `VITE_MAINTENANCE_MODE` | No | `true`, `1`, or `yes` renders the maintenance screen. |
| `VITE_ASSET_HOST` | No | CDN/R2 asset host for raw user images. |
| `VITE_CDN_URL` | No | Fallback CDN host for user images. |

Vite inlines these values at build time. Rebuild and redeploy whenever a value changes.

## Application structure

```text
src/
  components/       Reusable UI, event, location, and media components
  context/          Thin compatibility providers for loading/auth consumers
  hooks/            TanStack Query hooks, channels, presence, notifications
  lib/              API client, socket client, geospatial helpers, utilities
  pages/            Route screens (signup, onboarding, dashboard, settings)
  services/         HTTP/service adapters for the Phoenix API
  stores/           Zustand stores for session, autocomplete, search, presence
e2e/                Playwright specs, helpers, and global setup
public/             Static assets and the service worker
```

### Auth and data flow

- `src/stores/authStore.js` owns the bearer token, cached auth user, and legacy profile shape.
- `src/lib/api.js` attaches `Authorization: Bearer <token>` to authenticated requests.
- `src/hooks/useAuthQueries.js` loads the signed-in profile and exposes login, register, logout, confirmation, and password-reset mutations.
- `src/services/*.service.*` map the backend's canonical snake_case payloads to the shapes consumed by the existing UI.
- `src/context/AuthContext.jsx` is a compatibility adapter that preserves the existing `useAuth()` consumer API over Zustand and TanStack Query.

### Realtime

`src/lib/socket.js` owns one shared Phoenix socket, authenticated with the current bearer token. Event and notification hooks join the relevant topics and invalidate or patch TanStack Query caches when broadcasts arrive.

### Maps

The location workspace loads Leaflet from unpkg and stores fuzzed coordinates through the profile API. Raw coordinates are never used for public display.

## Testing

Playwright starts the Phoenix API on port `4100` and the Vite app on port `5180` through `playwright.config.js`. The global setup seeds the backend with deterministic E2E accounts.

```bash
npx playwright test
# or
npm run test:e2e
```

Useful variants:

```bash
npx playwright test e2e/user-signup-flow.spec.js
npx playwright test --ui
npx playwright show-report
```

## Cloudflare deployment with Wrangler

`wrangler.toml` publishes the Vite `dist/` output as static assets with SPA fallback for React Router deep links.

```bash
npm run cf:whoami
npm run cf:preview
npm run cf:deploy
```

Commands:

- `npm run cf:build` — builds the Vite app.
- `npm run cf:preview` — builds and serves locally through Wrangler.
- `npm run cf:deploy` — builds and deploys to Cloudflare.
- `npm run cf:whoami` — shows the authenticated Wrangler account.

Before deploying, provide the `VITE_*` values through the build environment. The production API URL must be reachable from the browser and must allow the Cloudflare origin through `CORS_ORIGINS`.

### Custom domains

Attach `meetcutes.us` and any `www`/app subdomain through the Cloudflare dashboard or a Wrangler route. Rebuild after changing `VITE_SITE_URL` so auth and email redirects use the final domain.

## Maintenance mode

Set `VITE_MAINTENANCE_MODE=true` and rebuild to show the maintenance page. The backend profile flag `maintenance_mode_active` can also force the maintenance screen at runtime without a frontend rebuild.

## Docker image

The included multi-stage `Dockerfile` builds the Vite bundle and serves it with nginx, including SPA fallback and `/health`. Build arguments must include `VITE_API_URL`; the image fails the build if it is missing.

```bash
docker build \
  --build-arg VITE_API_URL=https://api.meetcutes.us \
  --build-arg VITE_WS_URL=wss://api.meetcutes.us/socket \
  --build-arg VITE_SITE_URL=https://meetcutes.us \
  -t meetcutes-frontend .
```
