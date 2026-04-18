const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { setupScaffold, setBaseHref } = require('@vendure/ui-devkit/compiler/scaffold');

const backendRoot = path.join(__dirname, '..');
const outputPath = path.join(backendRoot, 'static/admin-ui');
const buildWorkspacePath = path.join(backendRoot, '.admin-ui-build');
const brandingDir = path.join(backendRoot, 'static/admin-ui-branding');
const badgesExtensionPath = path.join(backendRoot, 'src/plugins/badges/ui');
const personalizationExtensionPath = path.join(
    backendRoot,
    'src/plugins/logistics/personalization/admin-ui',
);
const workspaceNodeModulesPath = path.join(buildWorkspacePath, 'node_modules');
const uiDevkitPackagePath = require.resolve('@vendure/ui-devkit/package.json');
const adminUiPackagePath = require.resolve('@vendure/admin-ui/package.json', { paths: [path.dirname(uiDevkitPackagePath)] });
const uiDevkitRoot = path.dirname(uiDevkitPackagePath);
const rootNodeModulesPath = path.join(backendRoot, '..', '..', 'node_modules');
const ngCompilerPath = require.resolve('@angular/cli/bin/ng', { paths: [uiDevkitRoot] });
const uiDevkitPackageJson = require(uiDevkitPackagePath);
const adminUiPackageJson = require(adminUiPackagePath);
const typescriptPackageJson = require(require.resolve('typescript/package.json', { paths: [backendRoot] }));
const scaffoldDependencies = {
    ...(adminUiPackageJson.dependencies ?? {}),
    ...(uiDevkitPackageJson.dependencies ?? {}),
};
const dependencyResolvePaths = [path.dirname(adminUiPackagePath), path.dirname(uiDevkitPackagePath), backendRoot];

const extensions = [
    {
        id: 'badges-ui-extension',
        extensionPath: badgesExtensionPath,
        ngModules: [
            {
                type: 'lazy',
                route: 'badges',
                ngModuleFileName: 'badges.module.ts',
                ngModuleName: 'BadgesModule',
            },
        ],
        providers: ['providers.ts'],
        globalStyles: [path.join(brandingDir, 'admin-ui-branding.css')],
        staticAssets: [
            {
                path: path.join(brandingDir, 'admin-login-hero.svg'),
                rename: 'assets/admin-login-hero.svg',
            },
            {
                path: path.join(brandingDir, 'marca-ejemplo.svg'),
                rename: 'assets/marca-ejemplo.svg',
            },
        ],
    },
    {
        id: 'personalization-ui-extension',
        extensionPath: personalizationExtensionPath,
        ngModules: [
            {
                type: 'shared',
                ngModuleFileName: 'personalization.module.ts',
                ngModuleName: 'OrderPersonalizationModule',
            },
        ],
    },
];

function resolvePackageDir(packageName) {
    try {
        return path.dirname(require.resolve(`${packageName}/package.json`, { paths: dependencyResolvePaths }));
    } catch (error) {
        if (error?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED' && error?.code !== 'MODULE_NOT_FOUND') {
            throw error;
        }
    }

    let currentPath = path.dirname(require.resolve(packageName, { paths: dependencyResolvePaths }));

    while (true) {
        const packageJsonPath = path.join(currentPath, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson?.name === packageName) {
                return currentPath;
            }
        }

        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            break;
        }
        currentPath = parentPath;
    }

    throw new Error(`Could not resolve package directory for ${packageName}.`);
}

function runAngularBuild() {
    return new Promise((resolve, reject) => {
        const buildProcess = spawn(process.execPath, [ngCompilerPath, 'build', '--configuration', 'production'], {
            cwd: buildWorkspacePath,
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_PATH: `${workspaceNodeModulesPath}${path.delimiter}${rootNodeModulesPath}`,
            },
        });

        buildProcess.on('close', code => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`Angular Admin UI build failed with exit code ${code ?? 'unknown'}.`));
        });
    });
}

async function prepareWorkspace() {
    await fsp.rm(buildWorkspacePath, { recursive: true, force: true });
    await setupScaffold(buildWorkspacePath, extensions);
    await setBaseHref(buildWorkspacePath, '/');

    if (fs.existsSync(workspaceNodeModulesPath)) {
        await fsp.rm(workspaceNodeModulesPath, { recursive: true, force: true });
    }

    await fsp.mkdir(workspaceNodeModulesPath, { recursive: true });

    for (const dependencyName of Object.keys(scaffoldDependencies)) {
        const packageDir = resolvePackageDir(dependencyName);
        const targetPath = path.join(workspaceNodeModulesPath, dependencyName);
        await fsp.mkdir(path.dirname(targetPath), { recursive: true });
        await fsp.symlink(packageDir, targetPath, 'dir');
    }

    const scaffoldPackageJsonPath = path.join(buildWorkspacePath, 'package.json');
    const scaffoldPackageJson = JSON.parse(await fsp.readFile(scaffoldPackageJsonPath, 'utf8'));

    scaffoldPackageJson.dependencies = { ...scaffoldDependencies };
    scaffoldPackageJson.devDependencies = {
        ...(scaffoldPackageJson.devDependencies ?? {}),
        typescript: typescriptPackageJson.version,
    };

    await fsp.writeFile(scaffoldPackageJsonPath, `${JSON.stringify(scaffoldPackageJson, null, 2)}\n`, 'utf8');
}

async function finalizeBuild() {
    const distPath = path.join(buildWorkspacePath, 'dist');

    if (!fs.existsSync(path.join(distPath, 'vendure-ui-config.json'))) {
        throw new Error(`Compiled Admin UI is missing vendure-ui-config.json at ${distPath}.`);
    }

    await fsp.rm(outputPath, { recursive: true, force: true });
    await fsp.mkdir(path.dirname(outputPath), { recursive: true });
    await fsp.cp(distPath, outputPath, { recursive: true });
    await fsp.rm(buildWorkspacePath, { recursive: true, force: true });
}

async function main() {
    await prepareWorkspace();
    process.stdout.write(`Running ${process.execPath} ${ngCompilerPath} build --configuration production\n`);
    await runAngularBuild();
    await finalizeBuild();
    process.stdout.write(`Admin UI preparado en ${outputPath}\n`);
}

main().catch(async error => {
    await fsp.rm(buildWorkspacePath, { recursive: true, force: true });
    console.error('Admin UI preparation failed:', error);
    process.exit(1);
});
