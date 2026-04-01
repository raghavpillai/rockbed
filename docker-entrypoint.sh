#!/bin/sh
# Run prisma db push on first boot (creates tables if they don't exist)
cd /app/packages/db && npx prisma db push --skip-generate 2>/dev/null || true
cd /app
exec bun apps/web/server.js
