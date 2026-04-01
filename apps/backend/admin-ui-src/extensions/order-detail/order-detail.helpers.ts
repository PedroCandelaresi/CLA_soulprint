export type OperatorTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type OrderJourneyStatus =
    | 'pending_payment'
    | 'paid'
    | 'awaiting_personalization'
    | 'personalization_received'
    | 'in_production'
    | 'ready_to_ship'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export interface OrderDashboardLine {
    id: string;
    quantity: number;
    productName: string;
    variantName: string;
    sku: string | null;
    unitPriceWithTax: number;
    requiresPersonalization: boolean;
    personalizationStatus: string;
    personalizationNotes: string | null;
    personalizationUploadedAt: string | null;
    personalizationApprovedAt: string | null;
    personalizationSnapshotFileName: string | null;
    personalizationAssetPreview: string | null;
    personalizationAssetSource: string | null;
    personalizationAssetMimeType: string | null;
}

export interface OrderDashboardViewModel {
    id: string | null;
    code: string | null;
    createdAt: string | null;
    currencyCode: string;
    totalWithTax: number;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    orderState: string;
    businessStatus: OrderJourneyStatus;
    businessStatusLabel: string;
    businessStatusDescription: string;
    businessStatusTone: OperatorTone;
    paymentState: string;
    paymentLabel: string;
    paymentDescription: string;
    paymentTone: OperatorTone;
    isPaid: boolean;
    hasPaymentMismatch: boolean;
    paymentAmount: number | null;
    paymentMethod: string | null;
    paymentTransactionId: string | null;
    personalizationRequired: boolean;
    personalizationOverallStatus: string;
    personalizationTone: OperatorTone;
    personalizationLabel: string;
    personalizationDescription: string;
    personalizationRequiredCount: number;
    personalizationCompletedCount: number;
    personalizationPendingCount: number;
    latestAssetUrl: string | null;
    latestAssetPreview: string | null;
    latestAssetFileName: string | null;
    latestAssetUploadedAt: string | null;
    shippingMethodLabel: string | null;
    shippingPriceCents: number | null;
    shippingTone: OperatorTone;
    shippingLabel: string;
    shippingDescription: string;
    shipmentStatus: string | null;
    trackingNumber: string | null;
    shippingAddress: string[];
    shippingSnapshot: Record<string, unknown> | null;
    productionStatus: string;
    productionLabel: string;
    productionUpdatedAt: string | null;
    lines: OrderDashboardLine[];
    nextStepTitle: string;
    nextStepDescription: string;
    nextStepChecklist: string[];
    primaryActionKey: string | null;
    primaryActionLabel: string | null;
    primaryActionVariant: 'primary' | 'success' | 'secondary';
    secondaryActionKey: string | null;
    secondaryActionLabel: string | null;
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function firstNonEmpty(...values: unknown[]): string | null {
    for (const value of values) {
        const normalized = normalizeText(value);
        if (normalized) {
            return normalized;
        }
    }
    return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function isPaidState(orderState: string, paymentState: string): boolean {
    return ['PaymentAuthorized', 'PaymentSettled'].includes(orderState)
        || ['Authorized', 'Settled'].includes(paymentState);
}

function isCompletedLineStatus(status: string): boolean {
    return status === 'uploaded' || status === 'approved';
}

function mapTone(input: OrderJourneyStatus): OperatorTone {
    switch (input) {
        case 'pending_payment':
            return 'warning';
        case 'awaiting_personalization':
            return 'warning';
        case 'cancelled':
            return 'danger';
        case 'paid':
            return 'info';
        case 'personalization_received':
        case 'in_production':
        case 'ready_to_ship':
        case 'shipped':
        case 'delivered':
            return 'success';
    }
}

function getBusinessStatus(order: any, lines: OrderDashboardLine[]): OrderJourneyStatus {
    const cf = (order?.customFields ?? {}) as Record<string, unknown>;
    const orderState = normalizeText(order?.state);
    const paymentState = normalizeText(order?.payments?.[order?.payments?.length - 1]?.state);
    const isPaid = isPaidState(order?.state ?? '', order?.payments?.[order?.payments?.length - 1]?.state ?? '');

    if (orderState.toLowerCase() === 'cancelled') {
        return 'cancelled';
    }
    if (!isPaid) {
        return 'pending_payment';
    }

    const shipmentStatus = normalizeText(cf.andreaniShipmentStatus).toLowerCase();
    const trackingNumber = firstNonEmpty(cf.andreaniTrackingNumber);
    if (shipmentStatus.includes('deliver') || shipmentStatus.includes('entreg')) {
        return 'delivered';
    }
    if (trackingNumber) {
        return 'shipped';
    }

    const productionStatus = normalizeText(cf.productionStatus);
    if (productionStatus === 'ready') {
        return 'ready_to_ship';
    }
    if (productionStatus === 'in-production') {
        return 'in_production';
    }

    const requiredLines = lines.filter((line) => line.requiresPersonalization);
    if (requiredLines.length > 0) {
        const completed = requiredLines.filter((line) => isCompletedLineStatus(line.personalizationStatus)).length;
        if (completed < requiredLines.length) {
            return 'awaiting_personalization';
        }
        return 'personalization_received';
    }

    return 'paid';
}

function getBusinessCopy(status: OrderJourneyStatus): { label: string; description: string } {
    switch (status) {
        case 'pending_payment':
            return {
                label: 'Esperando pago',
                description: 'Todavía no hace falta fabricar ni preparar envío. El equipo puede esperar la confirmación.',
            };
        case 'paid':
            return {
                label: 'Pago confirmado',
                description: 'El pedido ya quedó acreditado. Si no requiere imagen, puede pasar a producción.',
            };
        case 'awaiting_personalization':
            return {
                label: 'Falta archivo del cliente',
                description: 'El pedido está pago, pero todavía falta al menos una imagen para poder avanzar.',
            };
        case 'personalization_received':
            return {
                label: 'Archivo recibido',
                description: 'Ya hay material cargado para todas las líneas que lo necesitan. El pedido puede revisarse y pasar a producción.',
            };
        case 'in_production':
            return {
                label: 'En producción',
                description: 'El taller ya está trabajando sobre este pedido.',
            };
        case 'ready_to_ship':
            return {
                label: 'Listo para enviar',
                description: 'El pedido está terminado. El próximo paso operativo es despacharlo.',
            };
        case 'shipped':
            return {
                label: 'Enviado',
                description: 'El pedido ya salió. Solo queda hacer seguimiento del transporte.',
            };
        case 'delivered':
            return {
                label: 'Entregado',
                description: 'El correo informó la entrega al cliente.',
            };
        case 'cancelled':
            return {
                label: 'Cancelado',
                description: 'No hace falta continuar con producción ni envío.',
            };
    }
}

function getPaymentCopy(orderState: string, paymentState: string, hasMismatch: boolean): { label: string; description: string; tone: OperatorTone } {
    if (hasMismatch) {
        return {
            label: 'Revisar pago',
            description: 'Hay señales mezcladas entre el estado de la orden y el registro del pago. Conviene revisar antes de avanzar.',
            tone: 'danger',
        };
    }
    if (isPaidState(orderState, paymentState)) {
        return {
            label: paymentState === 'Authorized' ? 'Pago autorizado' : 'Pago confirmado',
            description: paymentState === 'Authorized'
                ? 'El pago fue autorizado. La orden ya puede considerarse cobrada para la operación.'
                : 'El dinero quedó acreditado correctamente.',
            tone: 'success',
        };
    }
    return {
        label: 'Pago pendiente',
        description: 'El cliente todavía no terminó el pago o el sistema aún no lo reflejó.',
        tone: 'warning',
    };
}

function getPersonalizationCopy(requiredCount: number, completedCount: number): { status: string; label: string; description: string; tone: OperatorTone } {
    if (requiredCount === 0) {
        return {
            status: 'not-required',
            label: 'No requiere personalización',
            description: 'Este pedido puede avanzar sin que el cliente cargue archivos.',
            tone: 'neutral',
        };
    }
    if (completedCount === 0) {
        return {
            status: 'pending',
            label: 'Faltan todos los archivos',
            description: 'Todavía no hay ninguna imagen lista para revisar.',
            tone: 'warning',
        };
    }
    if (completedCount < requiredCount) {
        return {
            status: 'partial',
            label: 'Faltan algunos archivos',
            description: `Hay ${completedCount} línea(s) listas y ${requiredCount - completedCount} pendiente(s).`,
            tone: 'warning',
        };
    }
    return {
        status: 'complete',
        label: 'Todo recibido',
        description: 'Ya están cargados todos los archivos necesarios para producir.',
        tone: 'success',
    };
}

function getShippingCopy(methodLabel: string | null, trackingNumber: string | null, shipmentStatus: string | null, isPaid: boolean): { label: string; description: string; tone: OperatorTone } {
    if (trackingNumber) {
        return {
            label: 'En camino',
            description: shipmentStatus
                ? `El correo informó: ${shipmentStatus}.`
                : 'El pedido ya tiene tracking y está en etapa logística.',
            tone: 'success',
        };
    }
    if (methodLabel) {
        return {
            label: 'Envío elegido',
            description: isPaid
                ? 'La opción de entrega ya está definida. Falta terminar producción y despachar.'
                : 'La opción de entrega ya fue elegida por el cliente.',
            tone: isPaid ? 'info' : 'neutral',
        };
    }
    return {
        label: 'Falta definir envío',
        description: 'Todavía no aparece una opción de envío guardada para esta orden.',
        tone: isPaid ? 'warning' : 'neutral',
    };
}

function getProductionLabel(status: string): string {
    switch (status) {
        case 'in-production':
            return 'En producción';
        case 'ready':
            return 'Listo para enviar';
        default:
            return 'Sin iniciar';
    }
}

function parseShippingSnapshot(raw: unknown): Record<string, unknown> | null {
    if (typeof raw !== 'string' || !raw.trim()) {
        return null;
    }
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function formatAddress(order: any): string[] {
    const address = order?.shippingAddress;
    if (!address) {
        return [];
    }

    const firstLine = firstNonEmpty(address.fullName);
    const secondLine = [firstNonEmpty(address.streetLine1), firstNonEmpty(address.streetLine2)].filter(Boolean).join(' ');
    const thirdLine = [firstNonEmpty(address.city), firstNonEmpty(address.province)].filter(Boolean).join(', ');
    const fourthLine = [firstNonEmpty(address.postalCode), firstNonEmpty(address.country)].filter(Boolean).join(' · ');

    return [firstLine, secondLine, thirdLine, fourthLine].filter((line): line is string => Boolean(line));
}

function getLatestAssetLine(lines: OrderDashboardLine[]): OrderDashboardLine | null {
    const linesWithAssets = lines.filter((line) => line.personalizationAssetSource || line.personalizationAssetPreview);
    if (linesWithAssets.length === 0) {
        return null;
    }

    return [...linesWithAssets].sort((left, right) => {
        const leftTime = left.personalizationUploadedAt ? new Date(left.personalizationUploadedAt).getTime() : 0;
        const rightTime = right.personalizationUploadedAt ? new Date(right.personalizationUploadedAt).getTime() : 0;
        return rightTime - leftTime;
    })[0] ?? linesWithAssets[0];
}

function getNextStep(viewModel: Omit<OrderDashboardViewModel, 'nextStepTitle' | 'nextStepDescription' | 'nextStepChecklist' | 'primaryActionKey' | 'primaryActionLabel' | 'primaryActionVariant' | 'secondaryActionKey' | 'secondaryActionLabel'>) {
    if (viewModel.businessStatus === 'cancelled') {
        return {
            title: 'No requiere acción',
            description: 'La orden está cancelada. Solo hace falta conservar el registro.',
            checklist: ['No fabricar', 'No despachar'],
            primaryActionKey: null,
            primaryActionLabel: null,
            primaryActionVariant: 'secondary' as const,
            secondaryActionKey: null,
            secondaryActionLabel: null,
        };
    }

    if (!viewModel.isPaid) {
        return {
            title: 'Esperar confirmación del pago',
            description: 'Todavía no conviene iniciar producción ni revisar envío.',
            checklist: [
                'Verificar luego si el pago entra correctamente',
                'No fabricar ni preparar despacho todavía',
            ],
            primaryActionKey: null,
            primaryActionLabel: null,
            primaryActionVariant: 'secondary' as const,
            secondaryActionKey: null,
            secondaryActionLabel: null,
        };
    }

    if (viewModel.personalizationRequired && viewModel.personalizationPendingCount > 0) {
        return {
            title: 'Esperar la imagen faltante',
            description: `Faltan ${viewModel.personalizationPendingCount} archivo(s) para poder avanzar con el pedido.`,
            checklist: [
                'Revisar en la pestaña Personalización qué línea está pendiente',
                'Si el cliente demora, hacer seguimiento manual por email o WhatsApp',
            ],
            primaryActionKey: viewModel.latestAssetUrl ? 'open-latest-asset' : null,
            primaryActionLabel: viewModel.latestAssetUrl ? 'Abrir último archivo recibido' : null,
            primaryActionVariant: 'secondary' as const,
            secondaryActionKey: null,
            secondaryActionLabel: null,
        };
    }

    if (viewModel.productionStatus === 'not-started') {
        return {
            title: 'Revisar y empezar producción',
            description: 'La orden ya está lista para entrar al taller.',
            checklist: [
                'Confirmar que la imagen correcta está cargada',
                'Corroborar notas del cliente antes de producir',
            ],
            primaryActionKey: 'start-production',
            primaryActionLabel: 'Iniciar producción',
            primaryActionVariant: 'primary' as const,
            secondaryActionKey: viewModel.latestAssetUrl ? 'open-latest-asset' : null,
            secondaryActionLabel: viewModel.latestAssetUrl ? 'Ver archivo' : null,
        };
    }

    if (viewModel.productionStatus === 'in-production') {
        return {
            title: 'Terminar trabajo y marcar listo',
            description: 'Cuando el producto esté finalizado, dejalo preparado para despacho.',
            checklist: [
                'Finalizar fabricación',
                'Empaquetar el pedido y dejarlo listo para envío',
            ],
            primaryActionKey: 'mark-ready',
            primaryActionLabel: 'Marcar listo para enviar',
            primaryActionVariant: 'success' as const,
            secondaryActionKey: viewModel.latestAssetUrl ? 'open-latest-asset' : null,
            secondaryActionLabel: viewModel.latestAssetUrl ? 'Ver archivo' : null,
        };
    }

    if (viewModel.productionStatus === 'ready' && !viewModel.trackingNumber) {
        return {
            title: 'Preparar despacho',
            description: 'El pedido está terminado. El próximo hito es coordinar envío y tracking.',
            checklist: [
                'Confirmar el método de envío elegido',
                'Despachar y cargar seguimiento cuando exista',
            ],
            primaryActionKey: null,
            primaryActionLabel: null,
            primaryActionVariant: 'secondary' as const,
            secondaryActionKey: null,
            secondaryActionLabel: null,
        };
    }

    if (viewModel.trackingNumber) {
        return {
            title: 'Hacer seguimiento logístico',
            description: 'El pedido ya está en manos del correo.',
            checklist: [
                'Controlar tracking si el cliente consulta',
                'Esperar actualización del transportista',
            ],
            primaryActionKey: null,
            primaryActionLabel: null,
            primaryActionVariant: 'secondary' as const,
            secondaryActionKey: viewModel.latestAssetUrl ? 'open-latest-asset' : null,
            secondaryActionLabel: viewModel.latestAssetUrl ? 'Ver archivo' : null,
        };
    }

    return {
        title: 'Pedido listo para seguimiento',
        description: 'No hay bloqueos evidentes en este momento.',
        checklist: ['Verificar si hace falta una gestión manual puntual'],
        primaryActionKey: null,
        primaryActionLabel: null,
        primaryActionVariant: 'secondary' as const,
        secondaryActionKey: null,
        secondaryActionLabel: null,
    };
}

export function getToneClass(tone: OperatorTone): string {
    return `cla-tone-${tone}`;
}

export function getPersonalizationLineStatusLabel(status: string): string {
    switch (status) {
        case 'pending-upload':
            return 'Pendiente';
        case 'uploaded':
            return 'Archivo cargado';
        case 'approved':
            return 'Aprobado';
        case 'rejected':
            return 'Rechazado';
        default:
            return 'No requerida';
    }
}

export function getPersonalizationLineStatusTone(status: string): OperatorTone {
    switch (status) {
        case 'uploaded':
        case 'approved':
            return 'success';
        case 'rejected':
            return 'danger';
        case 'pending-upload':
            return 'warning';
        default:
            return 'neutral';
    }
}

export function buildOrderDashboard(order: any): OrderDashboardViewModel {
    const cf = (order?.customFields ?? {}) as Record<string, unknown>;
    const lastPayment = order?.payments?.[order?.payments?.length - 1] ?? null;
    const lines: OrderDashboardLine[] = (order?.lines ?? []).map((line: any) => ({
        id: String(line?.id ?? ''),
        quantity: Number(line?.quantity ?? 0),
        productName: firstNonEmpty(line?.productVariant?.product?.name, 'Producto') ?? 'Producto',
        variantName: firstNonEmpty(line?.productVariant?.name, 'Variante') ?? 'Variante',
        sku: firstNonEmpty(line?.productVariant?.sku),
        unitPriceWithTax: Number(line?.unitPriceWithTax ?? 0),
        requiresPersonalization: line?.productVariant?.customFields?.requiresPersonalization === true,
        personalizationStatus: firstNonEmpty(line?.customFields?.personalizationStatus, 'not-required') ?? 'not-required',
        personalizationNotes: firstNonEmpty(line?.customFields?.personalizationNotes),
        personalizationUploadedAt: firstNonEmpty(line?.customFields?.personalizationUploadedAt),
        personalizationApprovedAt: firstNonEmpty(line?.customFields?.personalizationApprovedAt),
        personalizationSnapshotFileName: firstNonEmpty(line?.customFields?.personalizationSnapshotFileName),
        personalizationAssetPreview: firstNonEmpty(line?.customFields?.personalizationAsset?.preview),
        personalizationAssetSource: firstNonEmpty(line?.customFields?.personalizationAsset?.source),
        personalizationAssetMimeType: firstNonEmpty(line?.customFields?.personalizationAsset?.mimeType),
    }));

    const requiredLines = lines.filter((line) => line.requiresPersonalization);
    const completedLines = requiredLines.filter((line) => isCompletedLineStatus(line.personalizationStatus));
    const latestAssetLine = getLatestAssetLine(requiredLines);
    const businessStatus = getBusinessStatus(order, lines);
    const businessCopy = getBusinessCopy(businessStatus);
    const paymentState = firstNonEmpty(lastPayment?.state, order?.state) ?? 'Sin estado';
    const hasPaymentMismatch = order?.state === 'ArrangingPayment'
        && (order?.payments ?? []).some((payment: any) => ['Authorized', 'Settled'].includes(payment?.state));
    const paymentCopy = getPaymentCopy(order?.state ?? '', lastPayment?.state ?? '', hasPaymentMismatch);
    const personalizationCopy = getPersonalizationCopy(requiredLines.length, completedLines.length);
    const shippingMethodLabel = firstNonEmpty(cf.shippingMethodLabel, cf.andreaniServiceName);
    const trackingNumber = firstNonEmpty(cf.andreaniTrackingNumber);
    const shipmentStatus = firstNonEmpty(cf.andreaniShipmentStatus);
    const shippingCopy = getShippingCopy(
        shippingMethodLabel,
        trackingNumber,
        shipmentStatus,
        isPaidState(order?.state ?? '', lastPayment?.state ?? ''),
    );
    const productionStatus = firstNonEmpty(cf.productionStatus, 'not-started') ?? 'not-started';
    const baseViewModel = {
        id: firstNonEmpty(order?.id),
        code: firstNonEmpty(order?.code),
        createdAt: firstNonEmpty(order?.createdAt),
        currencyCode: firstNonEmpty(order?.currencyCode, 'ARS') ?? 'ARS',
        totalWithTax: Number(order?.totalWithTax ?? 0),
        customerName: firstNonEmpty(
            [firstNonEmpty(order?.customer?.firstName), firstNonEmpty(order?.customer?.lastName)].filter(Boolean).join(' '),
            cf.buyerFullName,
        ),
        customerEmail: firstNonEmpty(order?.customer?.emailAddress, cf.buyerEmail),
        customerPhone: firstNonEmpty(cf.buyerPhone),
        orderState: firstNonEmpty(order?.state, 'Sin estado') ?? 'Sin estado',
        businessStatus,
        businessStatusLabel: businessCopy.label,
        businessStatusDescription: businessCopy.description,
        businessStatusTone: mapTone(businessStatus),
        paymentState,
        paymentLabel: paymentCopy.label,
        paymentDescription: paymentCopy.description,
        paymentTone: paymentCopy.tone,
        isPaid: isPaidState(order?.state ?? '', lastPayment?.state ?? ''),
        hasPaymentMismatch,
        paymentAmount: typeof lastPayment?.amount === 'number' ? lastPayment.amount : null,
        paymentMethod: firstNonEmpty(lastPayment?.method),
        paymentTransactionId: firstNonEmpty(lastPayment?.transactionId),
        personalizationRequired: requiredLines.length > 0,
        personalizationOverallStatus: personalizationCopy.status,
        personalizationTone: personalizationCopy.tone,
        personalizationLabel: personalizationCopy.label,
        personalizationDescription: personalizationCopy.description,
        personalizationRequiredCount: requiredLines.length,
        personalizationCompletedCount: completedLines.length,
        personalizationPendingCount: requiredLines.length - completedLines.length,
        latestAssetUrl: latestAssetLine?.personalizationAssetSource ?? null,
        latestAssetPreview: latestAssetLine?.personalizationAssetPreview ?? null,
        latestAssetFileName: latestAssetLine?.personalizationSnapshotFileName ?? null,
        latestAssetUploadedAt: latestAssetLine?.personalizationUploadedAt ?? null,
        shippingMethodLabel,
        shippingPriceCents: typeof cf.shippingPriceCents === 'number' ? cf.shippingPriceCents : null,
        shippingTone: shippingCopy.tone,
        shippingLabel: shippingCopy.label,
        shippingDescription: shippingCopy.description,
        shipmentStatus,
        trackingNumber,
        shippingAddress: formatAddress(order),
        shippingSnapshot: parseShippingSnapshot(cf.shippingSnapshotJson),
        productionStatus,
        productionLabel: getProductionLabel(productionStatus),
        productionUpdatedAt: firstNonEmpty(cf.productionUpdatedAt),
        lines,
    };
    const nextStep = getNextStep(baseViewModel);

    return {
        ...baseViewModel,
        nextStepTitle: nextStep.title,
        nextStepDescription: nextStep.description,
        nextStepChecklist: nextStep.checklist,
        primaryActionKey: nextStep.primaryActionKey,
        primaryActionLabel: nextStep.primaryActionLabel,
        primaryActionVariant: nextStep.primaryActionVariant,
        secondaryActionKey: nextStep.secondaryActionKey,
        secondaryActionLabel: nextStep.secondaryActionLabel,
    };
}
