#!/bin/sh
set -eu

node <<'NODE'
const fs = require('fs');
const path = require('path');

const adminUiPath = path.join(process.cwd(), 'static/admin-ui');
const brandingPath = path.join(process.cwd(), 'static/admin-ui-branding');
const managedScripts = [
    {
        source: path.join(brandingPath, 'cla-admin-enhancements.js'),
        target: path.join(adminUiPath, 'cla-admin-enhancements.js'),
        src: '/admin/cla-admin-enhancements.js',
    },
];
const removedLegacyPublicFiles = [
    path.join(adminUiPath, 'auto-login.js'),
    path.join(adminUiPath, 'auto-login-config.json'),
    path.join(adminUiPath, 'manual-admin-cla.md'),
];

for (const filePath of removedLegacyPublicFiles) {
    fs.rmSync(filePath, { force: true });
}

for (const file of managedScripts) {
    if (fs.existsSync(file.source)) {
        fs.mkdirSync(path.dirname(file.target), { recursive: true });
        fs.copyFileSync(file.source, file.target);
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
NODE

node dist/migrations/run-migrations.js
exec node dist/bootstrap/index.js
