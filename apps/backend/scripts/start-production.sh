#!/bin/sh
set -eu

node <<'NODE'
const fs = require('fs');
const path = require('path');

const enabled = ['ADMIN_TESTING_MODE', 'ENABLE_ADMIN_TESTING', 'TESTING_MODE']
    .some(name => process.env[name] === 'true');
const configPath = path.join(process.cwd(), 'static/admin-ui/auto-login-config.json');

if (enabled) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
        configPath,
        JSON.stringify({
            enabled: true,
            username: process.env.SUPERADMIN_USERNAME || 'superadmin',
            password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
            timeoutMs: Number(process.env.ADMIN_AUTO_LOGIN_TIMEOUT_MS || 15000),
            timestamp: new Date().toISOString(),
        }, null, 2),
        'utf8',
    );
    console.log('[cla] Runtime auto-login config generated');
} else {
    fs.rmSync(configPath, { force: true });
    console.log('[cla] Runtime auto-login disabled');
}
NODE

node dist/migrations/run-migrations.js
exec node dist/bootstrap/index.js
