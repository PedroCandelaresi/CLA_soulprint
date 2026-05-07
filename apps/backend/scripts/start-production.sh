#!/bin/sh
set -eu

node dist/migrations/run-migrations.js
exec node dist/bootstrap/index.js
