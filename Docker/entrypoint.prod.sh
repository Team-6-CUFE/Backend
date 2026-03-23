#!/bin/sh
set -e

echo "Running migrations..."
# entrypoint.prod.sh
npx typeorm migration:run -d dist/ormconfig.js

echo "Starting app..."
exec node dist/main.js