'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Divider,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import BrandLogoImage from '@/components/branding/BrandLogoImage';
import TooltipButton from '@/components/ui/TooltipButton';
import TooltipIconButton from '@/components/ui/TooltipIconButton';
import {
    ADD_PAYMENT_TO_ORDER_MUTATION,
    GET_ELIGIBLE_PAYMENT_METHODS_QUERY,
    GET_ELIGIBLE_SHIPPING_METHODS_QUERY,
    SET_ORDER_BILLING_ADDRESS_MUTATION,
    SET_ORDER_SHIPPING_ADDRESS_MUTATION,
    SET_ORDER_SHIPPING_METHOD_MUTATION,
    TRANSITION_ORDER_TO_STATE_MUTATION,
    fetchShopApi,
    getMutationResultMessage,
    getOperationResultMessage,
    isActiveOrder,
    type EligiblePaymentMethodsResponse,
    type EligibleShippingMethodsResponse,
} from '@/lib/vendure/shop';
import { formatCurrency } from '@/lib/checkout/demo';
import type {
    ActiveOrder,
    EligiblePaymentMethod,
    StorefrontCustomer,
    StorefrontOrderAddress,
    StorefrontOrderPayment,
    StorefrontPaymentMetadata,
} from '@/types/storefront';

const BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || '';
const BANK_CUIT = process.env.NEXT_PUBLIC_BANK_CUIT || '';
const BANK_CBU = process.env.NEXT_PUBLIC_BANK_CBU || '';
const BANK_ALIAS = process.env.NEXT_PUBLIC_BANK_ALIAS || '';
const MERCADOPAGO_ORDER_CODE_STORAGE_KEY = 'mercadopago:last-order-code';
const PERSONALIZATION_ORDER_CODE_STORAGE_KEY = 'personalization:last-order-code';
const CHECKOUT_LOGIN_HREF = `/auth/login?redirect=${encodeURIComponent('/carrito')}&reason=checkout`;

type FeedbackState = {
    severity: 'success' | 'error' | 'info' | 'warning';
    message: string;
};

type CheckoutFormState = {
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber: string;
    streetLine1: string;
    streetLine2: string;
    city: string;
    province: string;
    postalCode: string;
};

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function getInitialForm(
    customer: StorefrontCustomer | null,
    address: StorefrontOrderAddress | null | undefined,
): CheckoutFormState {
    return {
        firstName: customer?.firstName?.trim() || '',
        lastName: customer?.lastName?.trim() || '',
        emailAddress: customer?.emailAddress || '',
        phoneNumber: address?.phoneNumber || '',
        streetLine1: address?.streetLine1 || '',
        streetLine2: address?.streetLine2 || '',
        city: address?.city || '',
        province: address?.province || '',
        postalCode: address?.postalCode || '',
    };
}

function buildAddressInput(form: CheckoutFormState) {
    return {
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        streetLine1: form.streetLine1.trim(),
        streetLine2: form.streetLine2.trim() || undefined,
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
        countryCode: 'AR',
        phoneNumber: form.phoneNumber.trim() || undefined,
    };
}

function validateForm(form: CheckoutFormState): string | null {
    if (!form.firstName.trim()) return 'Ingresá tu nombre.';
    if (!form.lastName.trim()) return 'Ingresá tu apellido.';
    if (!form.emailAddress.trim()) return 'Ingresá tu email.';
    if (!form.streetLine1.trim()) return 'Ingresá tu dirección.';
    if (!form.city.trim()) return 'Ingresá la ciudad.';
    if (!form.province.trim()) return 'Ingresá la provincia.';
    if (!form.postalCode.trim()) return 'Ingresá el código postal.';
    return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}

function getPaymentMetadata(
    payment: StorefrontOrderPayment | null | undefined,
): StorefrontPaymentMetadata | null {
    const m = payment?.metadata;
    if (!isRecord(m)) return null;
    return m as StorefrontPaymentMetadata;
}

function getMercadoPagoRedirectUrl(order: ActiveOrder | null | undefined): string | null {
    const payment =
        [...(order?.payments ?? [])]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .find((p) => p.method === 'mercadopago' || getPaymentMetadata(p)?.public?.preferenceId != null) ??
        null;

    const meta = getPaymentMetadata(payment);
    const env = meta?.public?.environment;
    if (env === 'production') return meta?.public?.initPoint || meta?.public?.sandboxInitPoint || null;
    return meta?.public?.sandboxInitPoint || meta?.public?.initPoint || null;
}

function persistMercadoPagoOrderCode(code: string): void {
    if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(MERCADOPAGO_ORDER_CODE_STORAGE_KEY, code);
    }
}

function persistPersonalizationOrderCode(code: string): void {
    if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(PERSONALIZATION_ORDER_CODE_STORAGE_KEY, code);
    }
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
    return (
        <Stack direction="row" alignItems="center" spacing={0}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        boxShadow: '0 10px 20px rgba(0,72,37,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {step > 1 ? (
                        <CheckCircleIcon sx={{ fontSize: 20, color: 'white' }} />
                    ) : (
                        <Typography variant="caption" fontWeight={700} color="white">
                            1
                        </Typography>
                    )}
                </Box>
                <Typography
                    variant="body2"
                    fontWeight={step === 1 ? 700 : 500}
                    color={step === 1 ? 'primary.main' : 'text.secondary'}
                >
                    Tus datos
                </Typography>
            </Stack>

            <Box
                sx={{
                    flex: 1,
                    height: 2,
                    mx: 1.5,
                    bgcolor: step >= 2 ? 'primary.main' : 'divider',
                    minWidth: 40,
                    transition: 'background-color 0.3s',
                }}
            />

            <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: step >= 2 ? 'primary.main' : 'grey.300',
                        boxShadow: step >= 2 ? '0 10px 20px rgba(0,72,37,0.18)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.3s',
                    }}
                >
                    <Typography variant="caption" fontWeight={700} color="white">
                        2
                    </Typography>
                </Box>
                <Typography
                    variant="body2"
                    fontWeight={step === 2 ? 700 : 500}
                    color={step === 2 ? 'primary.main' : 'text.secondary'}
                >
                    Forma de pago
                </Typography>
            </Stack>
        </Stack>
    );
}

// ─── Payment method card ───────────────────────────────────────────────────────

function PaymentMethodCard({
    code,
    name,
    selected,
    onSelect,
}: {
    code: string;
    name: string;
    selected: boolean;
    onSelect: () => void;
}) {
    const icon =
        code === 'mercadopago' ? (
            <CreditCardOutlinedIcon sx={{ fontSize: 28, color: selected ? 'primary.main' : 'text.secondary' }} />
        ) : (
            <AccountBalanceOutlinedIcon sx={{ fontSize: 28, color: selected ? 'primary.main' : 'text.secondary' }} />
        );

    const label =
        code === 'mercadopago'
            ? 'Mercado Pago'
            : code === 'transferencia-bancaria'
              ? 'Transferencia bancaria'
              : name;

    const description =
        code === 'mercadopago'
            ? 'Tarjeta de crédito, débito o saldo de Mercado Pago'
            : code === 'transferencia-bancaria'
              ? 'Transferí por CBU/CVU desde tu home banking'
              : '';

    return (
        <Paper
            variant="outlined"
            onClick={onSelect}
            sx={{
                p: 2,
                borderRadius: 4,
                cursor: 'pointer',
                border: selected ? '2px solid' : '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'rgba(0,72,37,0.08)' : 'rgba(255,251,244,0.8)',
                transition: 'all 0.15s ease',
                '&:hover': {
                    borderColor: 'primary.light',
                    bgcolor: selected ? 'rgba(0,72,37,0.1)' : 'rgba(255,255,255,0.92)',
                },
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                {selected ? (
                    <RadioButtonCheckedIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
                ) : (
                    <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
                )}
                {icon}
                <Stack spacing={0.25} flex={1}>
                    <Typography fontWeight={selected ? 700 : 500}>{label}</Typography>
                    {description && (
                        <Typography variant="caption" color="text.secondary">
                            {description}
                        </Typography>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
}

// ─── Bank transfer details ─────────────────────────────────────────────────────

function BankTransferDetails() {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (value: string, key: string) => {
        void navigator.clipboard.writeText(value);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const row = (label: string, value: string, copyKey: string) => (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary" variant="body2">
                {label}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography fontWeight={600} fontFamily={copyKey === 'cbu' ? 'monospace' : 'inherit'}>
                    {value}
                </Typography>
                {(copyKey === 'cbu' || copyKey === 'alias') && (
                    <TooltipIconButton
                        onClick={() => copy(value, copyKey)}
                        size="small"
                        tooltip={copied === copyKey ? 'Dato copiado' : `Copiar ${label.toLowerCase()}`}
                        sx={{
                            p: 0.5,
                            color: copied === copyKey ? 'success.main' : 'text.disabled',
                            '&:hover': { color: 'primary.main' },
                        }}
                    >
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </TooltipIconButton>
                )}
            </Stack>
        </Stack>
    );

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'info.50',
                borderColor: 'info.200',
            }}
        >
            <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} color="info.dark">
                    Datos para transferir
                </Typography>
                {BANK_ACCOUNT_NAME && row('Titular', BANK_ACCOUNT_NAME, 'name')}
                {BANK_CUIT && row('CUIT', BANK_CUIT, 'cuit')}
                {BANK_CBU && row('CBU / CVU', BANK_CBU, 'cbu')}
                {BANK_ALIAS && row('Alias', BANK_ALIAS, 'alias')}
                {!BANK_CBU && !BANK_ALIAS && (
                    <Typography variant="body2" color="text.secondary">
                        Configurar datos bancarios en variables de entorno.
                    </Typography>
                )}
                <Divider />
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Confirmá el pedido y realizá la transferencia. Te vamos a contactar para
                    coordinar la entrega una vez que acreditemos el pago.
                </Typography>
            </Stack>
        </Paper>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                    <Stack alignItems="center" py={10}>
                        <CircularProgress />
                    </Stack>
                </Container>
            }
        >
            <CheckoutContent />
        </Suspense>
    );
}

function CheckoutContent() {
    const router = useRouter();
    const { activeOrder, customer, initialized } = useStorefront();

    const [checkoutOrder, setCheckoutOrder] = useState<ActiveOrder | null>(activeOrder);
    const [paymentMethods, setPaymentMethods] = useState<EligiblePaymentMethod[]>([]);
    const [selectedPaymentCode, setSelectedPaymentCode] = useState('');
    const [form, setForm] = useState<CheckoutFormState>(() =>
        getInitialForm(customer, activeOrder?.shippingAddress),
    );
    const [savingData, setSavingData] = useState(false);
    const [paying, setPaying] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);

    const step: 1 | 2 = paymentMethods.length > 0 ? 2 : 1;

    useEffect(() => {
        setCheckoutOrder(activeOrder);
    }, [activeOrder]);

    useEffect(() => {
        if (!initialized || customer || !checkoutOrder?.lines.length) {
            return;
        }

        router.replace(CHECKOUT_LOGIN_HREF);
    }, [checkoutOrder?.lines.length, customer, initialized, router]);

    useEffect(() => {
        const initial = getInitialForm(customer, activeOrder?.shippingAddress);
        setForm((cur) => ({
            firstName: cur.firstName || initial.firstName,
            lastName: cur.lastName || initial.lastName,
            emailAddress: cur.emailAddress || initial.emailAddress,
            phoneNumber: cur.phoneNumber || initial.phoneNumber,
            streetLine1: cur.streetLine1 || initial.streetLine1,
            streetLine2: cur.streetLine2 || initial.streetLine2,
            city: cur.city || initial.city,
            province: cur.province || initial.province,
            postalCode: cur.postalCode || initial.postalCode,
        }));
    }, [customer, activeOrder?.shippingAddress]);

    const field = (key: keyof CheckoutFormState, value: string) =>
        setForm((cur) => ({ ...cur, [key]: value }));

    const runMutation = useCallback(
        async (
            fieldName:
                | 'setOrderShippingAddress'
                | 'setOrderBillingAddress'
                | 'setOrderShippingMethod'
                | 'transitionOrderToState'
                | 'addPaymentToOrder',
            query: string,
            variables: Record<string, unknown>,
            fallback: string,
        ) => {
            const data = await fetchShopApi<Record<string, unknown>>(query, variables);
            const result = data[fieldName];
            if (isActiveOrder(result)) {
                setCheckoutOrder(result);
                return { success: true as const, order: result };
            }
            const r = getMutationResultMessage(result, fallback);
            return { success: false as const, order: null, message: r.message, errorCode: r.errorCode };
        },
        [],
    );

    const loadPaymentMethods = useCallback(async () => {
        const res = await fetchShopApi<EligiblePaymentMethodsResponse>(GET_ELIGIBLE_PAYMENT_METHODS_QUERY);
        const methods = res.eligiblePaymentMethods.filter((m) => m.isEligible);
        setPaymentMethods(methods);
        setSelectedPaymentCode((cur) => {
            const ok = methods.some((m) => m.code === cur);
            return ok ? cur : (methods[0]?.code ?? '');
        });
        return methods;
    }, []);

    const confirmData = useCallback(async () => {
        const err = validateForm(form);
        if (err) {
            setFeedback({ severity: 'error', message: err });
            return;
        }

        setSavingData(true);
        setFeedback(null);

        try {
            const email = normalizeEmail(form.emailAddress);

            if (!customer) {
                router.push(`${CHECKOUT_LOGIN_HREF}&email=${encodeURIComponent(email)}`);
                return;
            }

            const addr = buildAddressInput(form);

            const ship = await runMutation(
                'setOrderShippingAddress',
                SET_ORDER_SHIPPING_ADDRESS_MUTATION,
                { input: addr },
                'No se pudo guardar la dirección.',
            );
            if (!ship.success) {
                setFeedback({ severity: 'error', message: '¡Ups! No pudimos guardar tu dirección. Revisá los datos e intentá de nuevo.' });
                return;
            }

            const bill = await runMutation(
                'setOrderBillingAddress',
                SET_ORDER_BILLING_ADDRESS_MUTATION,
                { input: addr },
                'No se pudo guardar la dirección.',
            );
            if (!bill.success) {
                setFeedback({ severity: 'error', message: '¡Ups! No pudimos guardar tu dirección. Revisá los datos e intentá de nuevo.' });
                return;
            }

            const shippingRes = await fetchShopApi<EligibleShippingMethodsResponse>(
                GET_ELIGIBLE_SHIPPING_METHODS_QUERY,
            );
            const firstShipping = shippingRes.eligibleShippingMethods[0];

            if (!firstShipping) {
                setFeedback({ severity: 'error', message: 'Por el momento no hay opciones de envío disponibles. Contactanos para continuar.' });
                return;
            }

            const shippingMethod = await runMutation(
                'setOrderShippingMethod',
                SET_ORDER_SHIPPING_METHOD_MUTATION,
                { shippingMethodId: [firstShipping.id] },
                'No se pudo configurar el envío.',
            );
            if (!shippingMethod.success) {
                setFeedback({ severity: 'error', message: '¡Ups! No pudimos preparar el envío. Intentá de nuevo.' });
                return;
            }

            const methods = await loadPaymentMethods();
            if (methods.length === 0) {
                setFeedback({ severity: 'error', message: 'Por el momento no hay formas de pago disponibles. Contactanos.' });
            }
        } catch (error) {
            const r = getOperationResultMessage(error, '');
            setFeedback({ severity: 'error', message: r.message || '¡Ups! Algo salió mal. Revisá tu conexión e intentá de nuevo.' });
        } finally {
            setSavingData(false);
        }
    }, [customer, form, loadPaymentMethods, router, runMutation]);

    const pay = useCallback(async () => {
        if (!customer) {
            router.push(CHECKOUT_LOGIN_HREF);
            return;
        }

        if (!selectedPaymentCode) {
            setFeedback({ severity: 'error', message: 'Elegí una forma de pago para continuar.' });
            return;
        }

        setPaying(true);
        setFeedback(null);

        try {
            if (checkoutOrder?.state !== 'ArrangingPayment') {
                const t = await runMutation(
                    'transitionOrderToState',
                    TRANSITION_ORDER_TO_STATE_MUTATION,
                    { state: 'ArrangingPayment' },
                    '',
                );
                if (!t.success) {
                    setFeedback({ severity: 'error', message: '¡Ups! No pudimos preparar tu pedido. Intentá de nuevo.' });
                    return;
                }
            }

            const p = await runMutation(
                'addPaymentToOrder',
                ADD_PAYMENT_TO_ORDER_MUTATION,
                { input: { method: selectedPaymentCode, metadata: { source: 'storefront' } } },
                '',
            );

            if (!p.success || !p.order) {
                setFeedback({ severity: 'error', message: '¡Ups! No pudimos procesar el pago. Intentá de nuevo.' });
                return;
            }

            if (selectedPaymentCode === 'mercadopago') {
                persistMercadoPagoOrderCode(p.order.code);
                const url = getMercadoPagoRedirectUrl(p.order);
                if (!url) {
                    setFeedback({ severity: 'error', message: 'No pudimos conectar con Mercado Pago. Intentá de nuevo en unos segundos.' });
                    return;
                }
                window.location.href = url;
                return;
            }

            persistPersonalizationOrderCode(p.order.code);
            router.push(
                `/checkout/personalizacion?order=${encodeURIComponent(p.order.code)}&method=${encodeURIComponent(selectedPaymentCode)}`,
            );
        } catch (error) {
            const r = getOperationResultMessage(error, '');
            setFeedback({ severity: 'error', message: r.message || '¡Ups! Algo salió mal. Revisá tu conexión e intentá de nuevo.' });
        } finally {
            setPaying(false);
        }
    }, [checkoutOrder?.state, customer, runMutation, selectedPaymentCode, router]);

    const currencyCode = checkoutOrder?.currencyCode || 'ARS';
    const busy = savingData || paying;

    // ── Loading ──
    if (!initialized) {
        return (
            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                <Stack alignItems="center" py={10}>
                    <CircularProgress />
                </Stack>
            </Container>
        );
    }

    // ── Carrito vacío ──
    if (!checkoutOrder || checkoutOrder.lines.length === 0) {
        return (
            <Box
                sx={{
                    minHeight: '60vh',
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'grey.50',
                }}
            >
                <Container maxWidth="sm">
                    <Paper
                        elevation={0}
                        sx={{ p: { xs: 4, md: 6 }, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}
                    >
                        <Stack spacing={3} alignItems="center">
                            <Box
                                sx={{
                                    width: 220,
                                }}
                            >
                                <BrandLogoImage label="CLA Soulprint" />
                            </Box>
                            <Stack spacing={1}>
                                <Typography variant="h5" fontWeight={800}>
                                    Tu carrito está vacío
                                </Typography>
                                <Typography color="text.secondary">
                                    Agregá productos antes de continuar con la compra.
                                </Typography>
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TooltipButton href="/productos" variant="contained" tooltip="Ir al catálogo" sx={{ borderRadius: 2 }}>
                                    Ver productos
                                </TooltipButton>
                                <TooltipButton href="/carrito" variant="outlined" tooltip="Volver al carrito" sx={{ borderRadius: 2 }}>
                                    Ir al carrito
                                </TooltipButton>
                            </Stack>
                        </Stack>
                    </Paper>
                </Container>
            </Box>
        );
    }

    if (!customer) {
        return (
            <Box
                sx={{
                    minHeight: '60vh',
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'grey.50',
                }}
            >
                <Container maxWidth="sm">
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 4, md: 6 },
                            borderRadius: 4,
                            border: '1px solid',
                            borderColor: 'divider',
                            textAlign: 'center',
                        }}
                    >
                        <Stack spacing={3} alignItems="center">
                            <Box sx={{ width: 220 }}>
                                <BrandLogoImage label="CLA Soulprint" />
                            </Box>
                            <Stack spacing={1}>
                                <Typography variant="h5" fontWeight={800}>
                                    Ingresá para finalizar la compra
                                </Typography>
                                <Typography color="text.secondary">
                                    Te llevamos al acceso de cliente y después volvés al carrito para terminar el pedido.
                                </Typography>
                            </Stack>
                            <TooltipButton
                                href={CHECKOUT_LOGIN_HREF}
                                variant="contained"
                                tooltip="Ingresar o crear una cuenta para continuar"
                                sx={{ borderRadius: 2 }}
                            >
                                Ir al login
                            </TooltipButton>
                        </Stack>
                    </Paper>
                </Container>
            </Box>
        );
    }

    // ── Checkout principal ──
    return (
        <Box sx={{ minHeight: '100vh', py: { xs: 3, md: 5 } }}>
            <Container maxWidth="lg">
                <Stack spacing={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, md: 4 },
                            borderRadius: 5,
                            border: '1px solid',
                            borderColor: 'divider',
                            background:
                                'linear-gradient(135deg, rgba(255,251,244,0.96) 0%, rgba(247,238,224,0.96) 100%)',
                        }}
                    >
                        <Stack spacing={1.25}>
                            <Box
                                sx={{
                                    width: { xs: 180, md: 220 },
                                }}
                            >
                                <BrandLogoImage label="CLA Soulprint" />
                            </Box>
                            <Typography variant="h4" fontWeight={800}>
                                Finalizar compra
                            </Typography>
                            <Typography color="text.secondary">
                                Completá tus datos y elegí cómo querés pagar.
                            </Typography>
                        </Stack>
                    </Paper>

                    <Paper
                        elevation={0}
                        sx={{ p: 2.5, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
                    >
                        <StepIndicator step={step} />
                    </Paper>

                    {feedback && (
                        <Alert
                            severity={feedback.severity}
                            onClose={() => setFeedback(null)}
                            sx={{ borderRadius: 3 }}
                        >
                            {feedback.message}
                        </Alert>
                    )}

                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
                        <Stack spacing={3} flex={1} width="100%">
                            <Paper
                                elevation={0}
                                sx={{ p: { xs: 3, md: 4 }, borderRadius: 5, border: '1px solid', borderColor: step === 2 ? 'success.200' : 'divider' }}
                            >
                                <Stack spacing={3}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 2.5,
                                                bgcolor: step === 2 ? 'success.light' : 'primary.light',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <LocalShippingOutlinedIcon
                                                sx={{ color: step === 2 ? 'success.main' : 'primary.main' }}
                                            />
                                        </Box>
                                        <Stack>
                                            <Typography variant="h6" fontWeight={700}>
                                                Datos de entrega
                                            </Typography>
                                            {step === 2 && (
                                                <Typography variant="caption" color="success.main" fontWeight={600}>
                                                    Datos guardados correctamente
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Stack>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            label="Nombre"
                                            value={form.firstName}
                                            onChange={(e) => field('firstName', e.target.value)}
                                            fullWidth
                                            required
                                            disabled={busy || Boolean(customer)}
                                            size="small"
                                        />
                                        <TextField
                                            label="Apellido"
                                            value={form.lastName}
                                            onChange={(e) => field('lastName', e.target.value)}
                                            fullWidth
                                            required
                                            disabled={busy || Boolean(customer)}
                                            size="small"
                                        />
                                    </Stack>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            label="Email"
                                            type="email"
                                            value={form.emailAddress}
                                            onChange={(e) => field('emailAddress', e.target.value)}
                                            fullWidth
                                            required
                                            disabled={busy || Boolean(customer)}
                                            size="small"
                                            helperText={
                                                !customer
                                                    ? 'Si ya tenés cuenta, te vamos a pedir que ingreses.'
                                                    : undefined
                                            }
                                        />
                                        <TextField
                                            label="Teléfono (opcional)"
                                            value={form.phoneNumber}
                                            onChange={(e) => field('phoneNumber', e.target.value)}
                                            fullWidth
                                            disabled={busy}
                                            size="small"
                                        />
                                    </Stack>

                                    <TextField
                                        label="Dirección (calle y número)"
                                        value={form.streetLine1}
                                        onChange={(e) => field('streetLine1', e.target.value)}
                                        fullWidth
                                        required
                                        disabled={busy}
                                        size="small"
                                    />
                                    <TextField
                                        label="Piso / Departamento / Referencia (opcional)"
                                        value={form.streetLine2}
                                        onChange={(e) => field('streetLine2', e.target.value)}
                                        fullWidth
                                        disabled={busy}
                                        size="small"
                                    />

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            label="Ciudad"
                                            value={form.city}
                                            onChange={(e) => field('city', e.target.value)}
                                            fullWidth
                                            required
                                            disabled={busy}
                                            size="small"
                                        />
                                        <TextField
                                            label="Provincia"
                                            value={form.province}
                                            onChange={(e) => field('province', e.target.value)}
                                            fullWidth
                                            required
                                            disabled={busy}
                                            size="small"
                                        />
                                        <TextField
                                            label="Código postal"
                                            value={form.postalCode}
                                            onChange={(e) => field('postalCode', e.target.value)}
                                            fullWidth
                                            required
                                            disabled={busy}
                                            size="small"
                                            sx={{ maxWidth: { sm: 140 } }}
                                        />
                                    </Stack>

                                    <TooltipButton
                                        variant="contained"
                                        size="large"
                                        onClick={() => void confirmData()}
                                        disabled={busy}
                                        tooltip="Guardar los datos de entrega y continuar"
                                        sx={{ borderRadius: 2, py: 1.25 }}
                                    >
                                        {savingData ? (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CircularProgress size={18} color="inherit" />
                                                <span>Guardando...</span>
                                            </Stack>
                                        ) : step === 2 ? (
                                            'Actualizar datos'
                                        ) : (
                                            'Continuar al pago'
                                        )}
                                    </TooltipButton>
                                </Stack>
                            </Paper>

                            {step === 2 && (
                                <Paper
                                    elevation={0}
                                    sx={{ p: { xs: 3, md: 4 }, borderRadius: 5, border: '1px solid', borderColor: 'divider' }}
                                >
                                    <Stack spacing={3}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 2.5,
                                                    bgcolor: 'primary.light',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <PaymentOutlinedIcon sx={{ color: 'primary.main' }} />
                                            </Box>
                                            <Typography variant="h6" fontWeight={700}>
                                                ¿Cómo querés pagar?
                                            </Typography>
                                        </Stack>

                                        <Stack spacing={1.5}>
                                            {paymentMethods.map((method) => (
                                                <PaymentMethodCard
                                                    key={method.code}
                                                    code={method.code}
                                                    name={method.name}
                                                    selected={selectedPaymentCode === method.code}
                                                    onSelect={() => setSelectedPaymentCode(method.code)}
                                                />
                                            ))}
                                        </Stack>

                                        {selectedPaymentCode === 'transferencia-bancaria' && (
                                            <BankTransferDetails />
                                        )}

                                        <TooltipButton
                                            variant="contained"
                                            color="success"
                                            size="large"
                                            onClick={() => void pay()}
                                            disabled={!selectedPaymentCode || paying}
                                            tooltip={
                                                selectedPaymentCode === 'mercadopago'
                                                    ? 'Ir a Mercado Pago para completar el pago'
                                                    : 'Confirmar la transferencia y continuar con la carga del archivo'
                                            }
                                            sx={{
                                                borderRadius: 2,
                                                py: 1.5,
                                                fontSize: '1rem',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {paying ? (
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <CircularProgress size={20} color="inherit" />
                                                    <span>Procesando...</span>
                                                </Stack>
                                            ) : selectedPaymentCode === 'mercadopago' ? (
                                                'Pagar con Mercado Pago'
                                            ) : (
                                                'Confirmar transferencia y cargar foto'
                                            )}
                                        </TooltipButton>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            textAlign="center"
                                        >
                                            Tus datos están protegidos y nunca los compartimos con terceros.
                                        </Typography>
                                    </Stack>
                                </Paper>
                            )}
                        </Stack>

                        <Box sx={{ width: '100%', maxWidth: { lg: 360 } }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    position: { lg: 'sticky' },
                                    top: { lg: 24 },
                                    background:
                                        'linear-gradient(180deg, rgba(255,251,244,0.96) 0%, rgba(246,237,222,0.96) 100%)',
                                }}
                            >
                                <Stack spacing={2}>
                                    <Typography variant="h6" fontWeight={700}>
                                        Resumen de tu pedido
                                    </Typography>
                                    <Divider />

                                    <Stack spacing={1.5}>
                                        {checkoutOrder.lines.map((line) => (
                                            <Stack
                                                key={line.id}
                                                direction="row"
                                                justifyContent="space-between"
                                                spacing={2}
                                                alignItems="flex-start"
                                            >
                                                <Typography
                                                    color="text.secondary"
                                                    sx={{ flex: 1, lineHeight: 1.4 }}
                                                    variant="body2"
                                                >
                                                    {line.productVariant.name}
                                                    <Typography
                                                        component="span"
                                                        variant="body2"
                                                        color="text.disabled"
                                                    >
                                                        {' '}× {line.quantity}
                                                    </Typography>
                                                </Typography>
                                                <Typography fontWeight={600} variant="body2" noWrap>
                                                    {formatCurrency(line.linePriceWithTax, currencyCode)}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>

                                    <Divider />

                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary" variant="body2">
                                                Subtotal
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {formatCurrency(checkoutOrder.subTotalWithTax, currencyCode)}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary" variant="body2">
                                                Envío
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {checkoutOrder.shippingWithTax > 0
                                                    ? formatCurrency(checkoutOrder.shippingWithTax, currencyCode)
                                                    : 'A coordinar'}
                                            </Typography>
                                        </Stack>
                                    </Stack>

                                    <Paper
                                        sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            bgcolor: 'primary.light',
                                            border: '1px solid',
                                            borderColor: 'primary.100',
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography fontWeight={700}>Total</Typography>
                                            <Typography variant="h6" fontWeight={800} color="primary.main">
                                                {formatCurrency(checkoutOrder.totalWithTax, currencyCode)}
                                            </Typography>
                                        </Stack>
                                    </Paper>

                                    <TooltipButton
                                        href="/carrito"
                                        variant="text"
                                        fullWidth
                                        size="small"
                                        tooltip="Volver al carrito"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        Volver al carrito
                                    </TooltipButton>
                                </Stack>
                            </Paper>
                        </Box>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}
