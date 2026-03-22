#!/bin/sh
set -e

echo "Running migrations..."
npm run migration:run

echo "Starting app..."
exec node dist/main.js