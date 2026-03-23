#!/bin/sh
set -e

echo "Running migrations..."
# entrypoint.prod.sh
npx typeorm migration:run -d dist/ormconfig.js

echo "Starting dev server..."
exec npm run dev