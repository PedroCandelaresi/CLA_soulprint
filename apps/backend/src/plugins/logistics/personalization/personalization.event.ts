import { Order, RequestContext, VendureEvent } from '@vendure/core';

export class PersonalizationReceivedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public order: Order,
        public orderLineId: string,
    ) {
        super();
    }
}
