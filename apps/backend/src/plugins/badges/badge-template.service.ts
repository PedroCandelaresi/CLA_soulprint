import { Injectable } from '@nestjs/common';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext, TransactionalConnection, UserInputError } from '@vendure/core';
import { BadgeTemplate } from './badge-template.entity';
import { Badge } from './badge.entity';

export interface CreateBadgeTemplateInput {
    name: string;
    svgTemplate: string;
    defaultParams?: string | null;
}

export interface UpdateBadgeTemplateInput {
    id: ID;
    name?: string | null;
    svgTemplate?: string | null;
    defaultParams?: string | null;
}

@Injectable()
export class BadgeTemplateService {
    constructor(private readonly connection: TransactionalConnection) {}

    findAll(ctx: RequestContext): Promise<BadgeTemplate[]> {
        return this.connection.getRepository(ctx, BadgeTemplate).find({
            order: { name: 'ASC' },
        });
    }

    findOne(ctx: RequestContext, id: ID): Promise<BadgeTemplate | null> {
        return this.connection.getRepository(ctx, BadgeTemplate).findOne({ where: { id } });
    }

    async create(ctx: RequestContext, input: CreateBadgeTemplateInput): Promise<BadgeTemplate> {
        const repo = this.connection.getRepository(ctx, BadgeTemplate);
        const template = new BadgeTemplate({
            name: requireNonEmpty(input.name, 'name'),
            svgTemplate: requireNonEmpty(input.svgTemplate, 'svgTemplate'),
            defaultParams: normalizeJsonParam(input.defaultParams),
        });
        return repo.save(template);
    }

    async update(ctx: RequestContext, input: UpdateBadgeTemplateInput): Promise<BadgeTemplate> {
        const repo = this.connection.getRepository(ctx, BadgeTemplate);
        const template = await this.connection.getEntityOrThrow(ctx, BadgeTemplate, input.id);

        if (hasOwn(input, 'name')) {
            template.name = requireNonEmpty(input.name, 'name');
        }
        if (hasOwn(input, 'svgTemplate')) {
            template.svgTemplate = requireNonEmpty(input.svgTemplate, 'svgTemplate');
        }
        if (hasOwn(input, 'defaultParams')) {
            template.defaultParams = normalizeJsonParam(input.defaultParams);
        }

        const saved = await repo.save(template);

        // Re-render all badges that use this template so renderedSvg stays in sync.
        await this.rerenderBadgesForTemplate(ctx, saved);

        return saved;
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const repo = this.connection.getRepository(ctx, BadgeTemplate);
        const template = await repo.findOne({ where: { id } });

        if (!template) {
            return { result: DeletionResult.NOT_DELETED, message: 'Template no encontrado.' };
        }

        await repo.remove(template);
        return { result: DeletionResult.DELETED };
    }

    /**
     * Replaces {{key}} placeholders in svgTemplate with values from
     * the merged params object (defaultParams overridden by overrideParams).
     * Values are XML-escaped to prevent malformed SVG.
     */
    renderSvg(
        svgTemplate: string,
        defaultParams: string | null,
        overrideParams: string | null,
    ): string {
        const base = safeParseJson(defaultParams) ?? {};
        const override = safeParseJson(overrideParams) ?? {};
        const params: Record<string, string> = { ...base, ...override };
        return svgTemplate.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
            escapeXml(String(params[key] ?? '')),
        );
    }

    private async rerenderBadgesForTemplate(
        ctx: RequestContext,
        template: BadgeTemplate,
    ): Promise<void> {
        const badgeRepo = this.connection.getRepository(ctx, Badge);
        const badges = await badgeRepo.find({ where: { templateId: template.id } });

        if (badges.length === 0) {
            return;
        }

        const rendered = badges.map((badge) => ({
            ...badge,
            renderedSvg: this.renderSvg(template.svgTemplate, template.defaultParams, badge.templateParams),
        }));

        await badgeRepo.save(rendered);
    }
}

function safeParseJson(json: string | null | undefined): Record<string, string> | null {
    if (!json) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(json);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed as Record<string, string>;
        }
        return null;
    } catch {
        return null;
    }
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function normalizeJsonParam(value: string | null | undefined): string | null {
    if (value == null || value.trim() === '') {
        return null;
    }
    // Validate it's valid JSON before storing.
    try {
        JSON.parse(value);
        return value.trim();
    } catch {
        throw new UserInputError('El campo "defaultParams" debe ser un JSON válido.');
    }
}

function hasOwn<T extends object, K extends PropertyKey>(
    value: T,
    key: K,
): value is T & Record<K, unknown> {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function requireNonEmpty(value: string | null | undefined, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new UserInputError(`El campo "${field}" es obligatorio.`);
    }
    return value.trim();
}
