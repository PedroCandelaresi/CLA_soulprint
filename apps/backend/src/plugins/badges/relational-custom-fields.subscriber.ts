import { Injectable } from '@nestjs/common';
import {
    Collection,
    CollectionTranslation,
    Product,
    ProductTranslation,
    Promotion,
    TransactionalConnection,
} from '@vendure/core';
// PromotionTranslation is not part of the public API; import from the internal entity path.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PromotionTranslation } = require('@vendure/core/dist/entity/promotion/promotion-translation.entity');

const RELATIONAL_CUSTOM_FIELDS_FIX_KEY = '__fix_relational_custom_fields__';

type RelationalCustomFieldsHost =
    | Collection
    | CollectionTranslation
    | Product
    | ProductTranslation
    | Promotion;

@Injectable()
export class RelationalCustomFieldsSubscriber {
    constructor(connection: TransactionalConnection) {
        connection.rawConnection.subscribers.push(this as never);
    }

    afterLoad(entity: unknown): void {
        this.ensureRelationalCustomFields(entity);
    }

    beforeInsert(event: EntityEventLike): void {
        this.ensureRelationalCustomFields(event.entity);
    }

    beforeUpdate(event: EntityEventLike): void {
        this.ensureRelationalCustomFields(event.entity);
        this.ensureRelationalCustomFields(event.databaseEntity);
    }

    beforeRemove(event: EntityEventLike): void {
        this.ensureRelationalCustomFields(event.entity);
        this.ensureRelationalCustomFields(event.databaseEntity);
    }

    private ensureRelationalCustomFields(entity: unknown): void {
        if (!isRelationalCustomFieldsHost(entity)) {
            return;
        }

        if (entity.customFields == null) {
            entity.customFields = {
                [RELATIONAL_CUSTOM_FIELDS_FIX_KEY]: false,
            };
            return;
        }

        if (
            typeof entity.customFields === 'object' &&
            !(RELATIONAL_CUSTOM_FIELDS_FIX_KEY in entity.customFields)
        ) {
            (
                entity.customFields as Record<string, unknown>
            )[RELATIONAL_CUSTOM_FIELDS_FIX_KEY] = false;
        }
    }
}

interface EntityEventLike {
    entity?: unknown;
    databaseEntity?: unknown;
}

function isRelationalCustomFieldsHost(
    entity: unknown,
): entity is RelationalCustomFieldsHost {
    return (
        entity instanceof Collection ||
        entity instanceof CollectionTranslation ||
        entity instanceof Product ||
        entity instanceof ProductTranslation ||
        entity instanceof Promotion ||
        entity instanceof PromotionTranslation
    );
}
