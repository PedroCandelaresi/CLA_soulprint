#!/bin/sh
set -eu

node <<'NODE'
const fs = require('fs');
const path = require('path');

const enabled = ['ADMIN_TESTING_MODE', 'ENABLE_ADMIN_TESTING', 'TESTING_MODE']
    .some(name => process.env[name] === 'true');
const adminUiPath = path.join(process.cwd(), 'static/admin-ui');
const brandingPath = path.join(process.cwd(), 'static/admin-ui-branding');
const configPath = path.join(adminUiPath, 'auto-login-config.json');
const managedScripts = [
    {
        source: path.join(brandingPath, 'cla-admin-enhancements.js'),
        target: path.join(adminUiPath, 'cla-admin-enhancements.js'),
        src: '/admin/cla-admin-enhancements.js',
    },
    {
        source: path.join(brandingPath, 'auto-login.js'),
        target: path.join(adminUiPath, 'auto-login.js'),
        src: '/admin/auto-login.js',
    },
];

for (const script of managedScripts) {
    if (fs.existsSync(script.source)) {
        fs.mkdirSync(path.dirname(script.target), { recursive: true });
        fs.copyFileSync(script.source, script.target);
    }
}

const indexPath = path.join(adminUiPath, 'index.html');
if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html
        .replace(/\s*<script src="(?:\/admin\/)?cla-admin-enhancements\.js" defer><\/script>/g, '')
        .replace(/\s*<script src="(?:\/admin\/)?auto-login\.js" defer><\/script>/g, '');

    const scriptsToInject = managedScripts
        .map(script => `    <script src="${script.src}" defer></script>`)
        .join('\n') + '\n';

    html = html.replace(/<\/body>/i, scriptsToInject + '</body>');
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('[cla] Runtime admin UI hooks ensured');
}

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
