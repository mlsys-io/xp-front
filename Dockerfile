FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build
# Precompress assets at max brotli (q11) + gzip (-9) for zero-CPU static serving.
RUN apk add --no-cache brotli && \
    find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' \) \
      -exec sh -c 'gzip -9 -c "$1" > "$1.gz"; brotli -q 11 -c "$1" > "$1.br"' _ {} \;

FROM --platform=linux/amd64 fholzer/nginx-brotli:v1.26.2
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
