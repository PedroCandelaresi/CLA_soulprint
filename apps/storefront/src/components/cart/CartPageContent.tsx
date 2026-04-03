'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useEffect, useRef, useState } from 'react';
import type { CartLine } from '@/types/cart';
import { ANDREANI_DISABLED_MESSAGE, ANDREANI_ENABLED } from '@/lib/andreani/config';
import { useCart } from './CartProvider';
import { GetnetCheckoutButton } from '../payments/GetnetCheckoutButton';
import AndreaniShippingPanel from '../logistics/AndreaniShippingPanel';
import { useCustomer } from '@/components/auth/CustomerProvider';

function formatMoney(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode,
    }).format(amount / 100);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDigits(value: string): string {
    return value.replace(/\D/g, '');
}

export default function CartPageContent() {
    const router = useRouter();
    const { cart, error, clearError, isInitializing, isMutating, updateLineQuantity, removeLine, saveBuyerDetails } = useCart();
    const {
        customer,
        authStatus,
        error: customerError,
        isAuthenticated,
        isLoading: isCustomerLoading,
        refreshCustomer,
    } = useCustomer();
    const [busyLineId, setBusyLineId] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [buyerError, setBuyerError] = useState<string | null>(null);
    const [buyerMessage, setBuyerMessage] = useState<string | null>(null);
    const [isSavingBuyer, setIsSavingBuyer] = useState(false);
    const buyerDataSeedRef = useRef<string | null>(null);
    const lastCustomerIdRef = useRef<string | null>(customer?.id || null);
    const effectiveEmail = isAuthenticated ? (customer?.emailAddress || email) : email;
    const isCheckoutContextLoading = isCustomerLoading || isInitializing;
    const isCheckoutContextBusy = isCheckoutContextLoading || isMutating || isSavingBuyer;

    useEffect(() => {
        const nextCustomerId = customer?.id || null;
        if (lastCustomerIdRef.current === nextCustomerId) {
            return;
        }

        lastCustomerIdRef.current = nextCustomerId;
        router.refresh();
    }, [customer?.id, router]);

    useEffect(() => {
        if (!cart) {
            buyerDataSeedRef.current = null;
            return;
        }

        const identitySeed = isAuthenticated ? customer?.id || 'authenticated' : 'guest';
        const nextSeed = `${cart.code}:${identitySeed}`;
        if (buyerDataSeedRef.current === nextSeed) {
            return;
        }

        const snapshot = cart.buyer;
        const customerFullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim();
        setFullName(snapshot?.fullName || customerFullName || '');
        setEmail(isAuthenticated ? customer?.emailAddress || snapshot?.email || '' : snapshot?.email || '');
        setPhone(snapshot?.phone || customer?.phoneNumber || '');
        setBuyerError(null);
        setBuyerMessage(null);
        buyerDataSeedRef.current = nextSeed;
    }, [
        cart,
        customer,
        isAuthenticated,
    ]);

    function validateBuyerData(): string | null {
        if (fullName.trim().length < 3) {
            return 'Ingresá nombre y apellido del comprador.';
        }
        if (!EMAIL_REGEX.test(effectiveEmail.trim())) {
            return 'Ingresá un email válido.';
        }
        if (getDigits(phone).length < 8) {
            return 'Ingresá un teléfono válido.';
        }
        return null;
    }

    async function persistBuyerData(showSuccessMessage = false): Promise<void> {
        const validationError = validateBuyerData();
        if (validationError) {
            setBuyerError(validationError);
            throw new Error(validationError);
        }

        setIsSavingBuyer(true);
        setBuyerError(null);
        if (showSuccessMessage) {
            setBuyerMessage(null);
        }

        try {
            await saveBuyerDetails({
                fullName,
                email: effectiveEmail,
                phone,
            });

            if (showSuccessMessage) {
                setBuyerMessage('Datos del comprador guardados.');
            }
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'No se pudieron guardar los datos del comprador.';
            setBuyerError(message);
            throw saveError instanceof Error ? saveError : new Error(message);
        } finally {
            setIsSavingBuyer(false);
        }
    }

    async function handleQuantityChange(line: CartLine, quantity: number) {
        setBusyLineId(line.id);
        try {
            await updateLineQuantity(line.id, quantity);
        } finally {
            setBusyLineId(null);
        }
    }

    async function handleRemove(lineId: string) {
        setBusyLineId(lineId);
        try {
            await removeLine(lineId);
        } finally {
            setBusyLineId(null);
        }
    }

    if (isInitializing) {
        return (
            <Box minHeight="40vh" display="grid" sx={{ placeItems: 'center' }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress />
                    <Typography color="text.secondary">Cargando carrito...</Typography>
                </Stack>
            </Box>
        );
    }

    if (!cart || cart.lines.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, textAlign: 'center' }}>
                <Stack spacing={2} alignItems="center">
                    <Typography variant="h3" fontWeight={700}>Tu carrito está vacío</Typography>
                    <Typography color="text.secondary" maxWidth={520}>
                        Agregá productos reales desde la tienda y acá vas a ver la orden activa de Vendure.
                    </Typography>
                    <Button component={Link} href="/productos" variant="contained" size="large">
                        Ir a la tienda
                    </Button>
                </Stack>
            </Paper>
        );
    }

    return (
        <Stack
            spacing={3}
            sx={(theme) => ({
                '--header-height': '64px',
                [theme.breakpoints.up('md')]: {
                    '--header-height': '72px',
                },
            })}
        >
            <Box>
                <Typography variant="h3" fontWeight={700}>Carrito</Typography>
                <Typography color="text.secondary">
                    {cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'} en tu orden activa
                </Typography>
            </Box>

            {error ? (
                <Alert severity="error" onClose={clearError}>
                    {error}
                </Alert>
            ) : null}

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
                <Stack spacing={2} flex={1} width="100%">
                    {cart.lines.map((line) => {
                        const image = line.featuredAsset?.preview || '/images/backgrounds/errorimg.svg';
                        const itemBusy = isMutating && busyLineId === line.id;

                        return (
                            <Card key={line.id} variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                        <Box
                                            sx={{
                                                width: { xs: '100%', sm: 140 },
                                                minWidth: { sm: 140 },
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                bgcolor: '#f5f5f5',
                                            }}
                                        >
                                            <Image
                                                src={image}
                                                alt={line.productVariant.product.name}
                                                width={140}
                                                height={140}
                                                style={{ width: '100%', height: 'auto', display: 'block' }}
                                            />
                                        </Box>

                                        <Stack spacing={1.5} flex={1}>
                                            <Box sx={{ minWidth: 0 }}>
                                                {line.productVariant.product.slug ? (
                                                    <Typography
                                                        component={Link}
                                                        href={`/productos/${line.productVariant.product.slug}`}
                                                        variant="h5"
                                                        noWrap
                                                        sx={{
                                                            display: 'block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            textDecoration: 'none',
                                                            color: 'text.primary',
                                                            '&:hover': { color: 'primary.main' },
                                                        }}
                                                    >
                                                        {line.productVariant.product.name}
                                                    </Typography>
                                                ) : (
                                                    <Typography
                                                        variant="h5"
                                                        color="text.primary"
                                                        noWrap
                                                        sx={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {line.productVariant.product.name}
                                                    </Typography>
                                                )}
                                                <Typography
                                                    color="text.secondary"
                                                    noWrap
                                                    sx={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    Variante: {line.productVariant.name}
                                                </Typography>
                                            </Box>

                                            <Stack
                                                direction={{ xs: 'column', md: 'row' }}
                                                spacing={2}
                                                alignItems={{ xs: 'flex-start', md: 'center' }}
                                                justifyContent="space-between"
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <IconButton
                                                        aria-label="disminuir cantidad"
                                                        onClick={() => {
                                                            if (line.quantity === 1) {
                                                                void handleRemove(line.id);
                                                                return;
                                                            }
                                                            void handleQuantityChange(line, line.quantity - 1);
                                                        }}
                                                        disabled={itemBusy}
                                                    >
                                                        <RemoveIcon />
                                                    </IconButton>
                                                    <Typography minWidth={24} textAlign="center" fontWeight={700}>
                                                        {itemBusy ? '...' : line.quantity}
                                                    </Typography>
                                                    <IconButton
                                                        aria-label="aumentar cantidad"
                                                        onClick={() => void handleQuantityChange(line, line.quantity + 1)}
                                                        disabled={itemBusy}
                                                    >
                                                        <AddIcon />
                                                    </IconButton>
                                                </Stack>

                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Box textAlign={{ xs: 'left', md: 'right' }}>
                                                        <Typography color="text.secondary">
                                                            Unitario: {formatMoney(line.unitPriceWithTax, cart.currencyCode)}
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {formatMoney(line.linePriceWithTax, cart.currencyCode)}
                                                        </Typography>
                                                    </Box>
                                                    <IconButton
                                                        aria-label="eliminar item"
                                                        color="error"
                                                        onClick={() => void handleRemove(line.id)}
                                                        disabled={itemBusy}
                                                    >
                                                        <DeleteOutlineIcon />
                                                    </IconButton>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>

                <Paper
                    variant="outlined"
                    sx={{
                        width: '100%',
                        maxWidth: 360,
                        p: 3,
                        borderRadius: 4,
                        position: { lg: 'sticky' },
                        top: { lg: 'calc(var(--header-height) + 16px)' },
                    }}
                >
                    <Stack spacing={2}>
                        <Typography variant="h5" fontWeight={700}>Resumen</Typography>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography color="text.secondary">Subtotal</Typography>
                            <Typography>{formatMoney(cart.subTotalWithTax, cart.currencyCode)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography color="text.secondary">Envío</Typography>
                            <Typography>{formatMoney(cart.shippingWithTax, cart.currencyCode)}</Typography>
                        </Stack>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight={700}>Total</Typography>
                            <Typography variant="h5" fontWeight={700}>
                                {formatMoney(cart.totalWithTax, cart.currencyCode)}
                            </Typography>
                        </Stack>
                        <Divider />
                        <Stack spacing={2}>
                            {isCustomerLoading ? (
                                <Stack spacing={1.5} alignItems="center" py={1}>
                                    <CircularProgress size={24} />
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        Verificando tu sesión para habilitar el pago...
                                    </Typography>
                                </Stack>
                            ) : authStatus === 'error' ? (
                                <Stack spacing={2}>
                                    <Typography variant="h6" fontWeight={700}>No pudimos validar tu sesión</Typography>
                                    <Alert severity="warning">
                                        {customerError || 'Hubo un problema al confirmar tu cuenta. Reintentá antes de seguir al pago.'}
                                    </Alert>
                                    <Button variant="outlined" fullWidth onClick={() => void refreshCustomer()}>
                                        Reintentar sesión
                                    </Button>
                                </Stack>
                            ) : !isAuthenticated ? (
                                <Stack spacing={2}>
                                    <Typography variant="h6" fontWeight={700}>Cuenta requerida para pagar</Typography>
                                    <Alert severity="info">
                                        Para finalizar la compra tenés que crear una cuenta o iniciar sesión. Tu carrito no se pierde: cuando vuelvas autenticado, retoma esta misma orden.
                                    </Alert>
                                    <Button
                                        component={Link}
                                        href="/auth/register?next=%2Fcarrito"
                                        prefetch={false}
                                        variant="contained"
                                        fullWidth
                                    >
                                        Crear cuenta
                                    </Button>
                                    <Button
                                        component={Link}
                                        href="/auth/login?next=%2Fcarrito"
                                        prefetch={false}
                                        variant="outlined"
                                        fullWidth
                                    >
                                        Iniciar sesión
                                    </Button>
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        También podés entrar con Google desde la pantalla de login y volver directo al carrito.
                                    </Typography>
                                </Stack>
                            ) : (
                                <>
                                    <Typography variant="h6" fontWeight={700}>Datos del comprador</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Guardamos un snapshot en la orden antes del pago para que el pedido quede identificado aunque después cambie la cuenta.
                                    </Typography>

                                    <Alert severity="info">
                                        Si editás nombre o teléfono acá, también se actualizan en tu cuenta. El email se toma siempre desde la sesión autenticada.
                                    </Alert>

                                    {buyerError && (
                                        <Alert severity="error" onClose={() => setBuyerError(null)}>
                                            {buyerError}
                                        </Alert>
                                    )}

                                    {buyerMessage && (
                                        <Alert severity="success" onClose={() => setBuyerMessage(null)}>
                                            {buyerMessage}
                                        </Alert>
                                    )}

                                    <TextField
                                        label="Nombre completo"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        autoComplete="name"
                                        required
                                    />

                                    <TextField
                                        label="Email"
                                        type="email"
                                        value={effectiveEmail}
                                        autoComplete="email"
                                        required
                                        InputProps={{ readOnly: true }}
                                        helperText="Se usa el email verificado de tu cuenta."
                                    />

                                    <TextField
                                        label="Teléfono"
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        autoComplete="tel"
                                        required
                                    />

                                    <Button
                                        variant="outlined"
                                        onClick={() => void persistBuyerData(true)}
                                        disabled={isCheckoutContextBusy}
                                    >
                                        {isSavingBuyer ? 'Guardando...' : 'Guardar datos del comprador'}
                                    </Button>
                                </>
                            )}
                        </Stack>
                        <Divider />
                        {ANDREANI_ENABLED ? (
                            <AndreaniShippingPanel cart={cart} />
                        ) : (
                            <Alert severity="info">{ANDREANI_DISABLED_MESSAGE}</Alert>
                        )}
                        <Divider />
                        {isAuthenticated ? (
                            <>
                                {isCheckoutContextBusy ? (
                                    <Alert severity="info" icon={<CircularProgress size={18} />}>
                                        Estamos actualizando tu sesión y tu carrito antes de enviarte al pago.
                                    </Alert>
                                ) : null}
                                <GetnetCheckoutButton
                                    cart={cart}
                                    onBeforeCheckout={() => persistBuyerData(false)}
                                    disabled={isCheckoutContextBusy}
                                />
                            </>
                        ) : authStatus === 'error' ? (
                            <Alert
                                severity="warning"
                                action={(
                                    <Button color="inherit" size="small" onClick={() => void refreshCustomer()}>
                                        Reintentar
                                    </Button>
                                )}
                            >
                                No pudimos confirmar la sesión. Reintentá antes de iniciar el pago.
                            </Alert>
                        ) : (
                            <Alert severity="warning">
                                El pago queda bloqueado hasta que verifiques tu cuenta e inicies sesión.
                            </Alert>
                        )}
                        <Button component={Link} href="/productos" variant="outlined" fullWidth>
                            Seguir comprando
                        </Button>
                    </Stack>
                </Paper>
            </Stack>
        </Stack>
    );
}
