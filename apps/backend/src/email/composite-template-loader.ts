import fs from 'node:fs/promises';
import path from 'node:path';
import type { Injector, RequestContext } from '@vendure/core';
import type { LoadTemplateInput, Partial, TemplateLoader } from '@vendure/email-plugin';

export class CompositeEmailTemplateLoader implements TemplateLoader {
    constructor(private readonly templatePaths: string[]) {}

    async loadTemplate(_injector: Injector, _ctx: RequestContext, { type, templateName }: LoadTemplateInput): Promise<string> {
        for (const templateRoot of this.templatePaths) {
            const fullPath = path.join(templateRoot, type, templateName);
            try {
                return await fs.readFile(fullPath, 'utf8');
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;
                if (code !== 'ENOENT') {
                    throw error;
                }
            }
        }

        throw new Error(`Email template not found for ${type}/${templateName}`);
    }

    async loadPartials(): Promise<Partial[]> {
        const partials = new Map<string, string>();

        for (const templateRoot of this.templatePaths) {
            const partialsPath = path.join(templateRoot, 'partials');
            try {
                const files = await fs.readdir(partialsPath);
                for (const file of files) {
                    const name = path.basename(file, '.hbs');
                    if (partials.has(name)) {
                        continue;
                    }
                    const content = await fs.readFile(path.join(partialsPath, file), 'utf8');
                    partials.set(name, content);
                }
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;
                if (code !== 'ENOENT') {
                    throw error;
                }
            }
        }

        return Array.from(partials.entries()).map(([name, content]) => ({ name, content }));
    }
}

export function createEmailTemplateLoader(defaultTemplatePath: string): CompositeEmailTemplateLoader {
    return new CompositeEmailTemplateLoader([
        path.join(__dirname, '../../email-templates'),
        defaultTemplatePath,
    ]);
}
