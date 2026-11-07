# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Maintenance Mode

The application includes a built-in maintenance mode feature that can be enabled by setting the `VITE_MAINTENANCE_MODE` environment variable.

### How to Enable Maintenance Mode

1. Open the `.env` file in the project root
2. Set the maintenance mode variable:
   ```env
   VITE_MAINTENANCE_MODE=true
   ```
3. Restart the development server or rebuild the application

### Accepted Values

The following values will enable maintenance mode:
- `true`
- `1`
- `yes`

Any other value (or unset) will keep the application in normal mode.

### Features

When maintenance mode is enabled:
- All users see a professional maintenance page instead of the application
- The page includes a countdown timer that auto-refreshes every 5 minutes
- Users can manually check status with a refresh button
- Contact information is provided for urgent inquiries
- The page maintains the app's design theme and branding

### Disabling Maintenance Mode

To return to normal operation:
1. Set `VITE_MAINTENANCE_MODE=false` or remove/comment out the variable
2. Restart the development server or rebuild the application

## Authentication

Authentication runs against the Elixir/Phoenix JSON API using an opaque bearer
token stored with `react-secure-storage`.

- `src/stores/authStore.js` (Zustand) owns client/session state: the bearer
  token, the minimal `{ id, email }` auth user, and the legacy `profiledata`
  shape. The token and cached user are persisted under `meetcutes.auth.token`
  and `meetcutes.auth.user`.
- `src/services/auth.service.js` performs the HTTP calls and maps the backend's
  canonical snake_case profile into the legacy key names the app still uses.
- `src/hooks/useAuthQueries.js` (TanStack Query) loads the profile whenever a
  token is present and exposes login, register, logout, confirm, resend, and
  password-reset mutations.
- `src/context/AuthContext.jsx` is a thin compatibility layer that preserves the
  existing `useAuth()` consumer API.

Signup sends a confirmation email and does not issue a session. The user
confirms via `/email-verification?token=...`, then logs in. Password resets
arrive at `/changepassword?token=...`.

### Realtime (Phoenix Channels)

There is no legacy realtime dependency. Live event attendee updates use the
native `phoenix` JavaScript client against the Elixir socket at `/socket`:

- `src/lib/socket.js` owns one shared `Socket`, authenticated with the current
  bearer token (`params: { token }`). It reconnects with Phoenix's built-in
  backoff and disconnects when the token is cleared.
- `src/hooks/useEventChannel.js` joins `event:<id>` and invalidates the event
  query when the backend broadcasts `attendees_updated` (also accepts the
  legacy `user_joined`/`user_left` events).
- `src/pages/EventDetails.jsx` calls the hook, so attendee counts refresh
  without waiting for the list's polling interval.

The socket URL defaults to the API origin (`http://…` → `ws://…`, `https://…`
→ `wss://…`) and can be overridden with `VITE_WS_URL`.

### Backend status

The app has no hosted-BaaS SDK, no Edge Functions project, and no legacy
hosted-BaaS environment variables. Authentication, profiles, photos, locations,
events, search, discussions, and email/password flows all run against the
Elixir/Phoenix JSON API.

## Cloudflare Deployment With Wrangler

This app can be deployed to Cloudflare as a static-assets Worker using Wrangler. The app uses `BrowserRouter`, so the Wrangler config includes SPA fallback handling for deep links such as `/notifications` or `/user/:userid`.

### 1. Prepare environment variables

Create or update your local `.env` file using `.env.example` as the template.

Required variables:

- `VITE_API_URL` — base URL of the Elixir/Phoenix JSON API, for example `http://localhost:4000`. When unset the app falls back to `http://localhost:4000`.
- `VITE_SITE_URL`
- `VITE_REACT_APP_GEOAPIFY_API_KEY`

Optional variables:

- `VITE_WS_URL` — Phoenix socket endpoint. Defaults to the API origin with
  `/socket` appended (`http` → `ws`, `https` → `wss`).
- `VITE_MAINTENANCE_MODE` — see the maintenance-mode section above.

Recommended for Cloudflare:

- Set `VITE_SITE_URL` to your final Cloudflare URL, for example `https://meetcutes.your-subdomain.workers.dev`

### 2. Authenticate Wrangler

```bash
npm run cf:whoami
```

If you are not logged in yet, run:

```bash
npx wrangler login
```

### 3. Preview locally with Cloudflare

```bash
npm run cf:preview
```

This builds the Vite app and serves it through Wrangler using the config in `wrangler.toml`.

### 4. Deploy

```bash
npm run cf:deploy
```

That command:

- builds the app into `dist`
- deploys the built assets with `wrangler deploy`
- enables SPA fallback so client-side routes work after refresh

### 5. Optional custom domain

After the first deployment, you can attach a custom domain from the Cloudflare dashboard or extend `wrangler.toml` with routes for a zone you control.

### Notes

- `public/sw.js` is deployed as a static asset and will continue to work in production.
- Because this app is built by Vite, all `VITE_*` values must exist before running the build command.
- If you change `VITE_SITE_URL`, rebuild and redeploy so auth redirect URLs stay correct.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
