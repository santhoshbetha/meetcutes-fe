FROM node:22-alpine AS build

WORKDIR /app

ENV CI=true

# Cache the dependency layer independently of source changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite inlines these at build time. Pass them with `--build-arg`.
ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_SITE_URL=""
ARG VITE_MAINTENANCE_MODE="false"
ARG VITE_ASSET_HOST=""
ARG VITE_CDN_URL=""
# Public browser key, not a server-side secret.
ARG VITE_REACT_APP_GEOAPIFY_API_KEY=""

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_MAINTENANCE_MODE=$VITE_MAINTENANCE_MODE \
    VITE_ASSET_HOST=$VITE_ASSET_HOST \
    VITE_CDN_URL=$VITE_CDN_URL \
    VITE_REACT_APP_GEOAPIFY_API_KEY=$VITE_REACT_APP_GEOAPIFY_API_KEY

# A production bundle must never silently fall back to localhost.
RUN if [ -z "$VITE_API_URL" ]; then \
      echo "VITE_API_URL build argument is required (for example https://api.meetcutes.us)" >&2; \
      exit 1; \
    fi

RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
