# Cloud Run image for the thin App integration boundary.
#
# The service has no runtime dependencies, so there is no `npm install` layer
# and no `node_modules` to cache: the image is the Node runtime plus the files
# in src/. That is also why there is no build stage. Identity tokens for the
# private RAG service come from the Cloud Run metadata server (src/auth.js), so
# no auth library and no key file are baked in either.
FROM node:22-alpine

# `node` is an unprivileged user that the official image already provides.
# SECURITY_BASELINE.md keeps runtime identities least-privilege; running the
# process as root inside the container would undo that for no benefit.
WORKDIR /app

COPY package.json ./
COPY src ./src

USER node

# Cloud Run sets PORT at runtime and expects the container to honour it.
# 8080 is both its default and the port documented in .env.example.
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# `RAG_SERVICE_URL` is supplied by the deployment, not baked into the image.
# The process exits immediately if it is missing (see src/config.js).
CMD ["node", "src/main.js"]
