'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import PhotoCameraBackOutlinedIcon from '@mui/icons-material/PhotoCameraBackOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import {
    changePassword,
    getCustomerDashboard,
    requestEmailChange,
    updateCustomerProfile,
} from '@/lib/auth/client';
import { useCustomer } from '@/components/auth/CustomerProvider';
import { ANDREANI_ENABLED, buildAndreaniTrackingUrl } from '@/lib/andreani/config';
import {
    deriveOrderBusinessStatus,
    getBusinessStatusPresentation,
    getProductionStatusLabel,
} from '@/lib/orders/business-status';
import OrderProgressTimeline from '@/components/orders/OrderProgressTimeline';
import type { CustomerDashboardData, CustomerOrderSummary } from '@/types/customer-account';

function formatDate(value: string | null): string {
    if (!value) {
        return 'Sin fecha';
    }
    return new Date(value).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatMoney(value: number, currencyCode: string): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode || 'ARS',
        maximumFractionDigits: 0,
    }).format(value / 100);
}

function getPersonalizationLabel(order: CustomerOrderSummary): string {
    const status = order.personalization?.personalizationStatus ?? 'not-required';
    if (status === 'uploaded') {
        return 'Foto subida';
    }
    if (status === 'pending') {
        return 'Pendiente';
    }
    return 'No requerida';
}

function getPersonalizationColor(order: CustomerOrderSummary): 'default' | 'warning' | 'success' {
    const status = order.personalization?.personalizationStatus ?? 'not-required';
    if (status === 'uploaded') {
        return 'success';
    }
    if (status === 'pending') {
        return 'warning';
    }
    return 'default';
}

function needsBuyerData(customer: CustomerDashboardData['customer']): boolean {
    return !customer.firstName || !customer.lastName || !customer.phoneNumber || !customer.documentNumber;
}

const PAGE_SIZE = 10;

function isReasonableDocumentNumber(value: string): boolean {
    const normalized = value.replace(/\D/g, '');
    return normalized.length >= 7 && normalized.length <= 8;
}

export default function AccountDashboard() {
    const { authStatus } = useCustomer();
    const [data, setData] = useState<CustomerDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [newEmailAddress, setNewEmailAddress] = useState('');
    const [emailChangePassword, setEmailChangePassword] = useState('');
    const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
    const [emailChangeMessage, setEmailChangeMessage] = useState<string | null>(null);
    const [emailChangeError, setEmailChangeError] = useState<string | null>(null);

    const loadDashboard = useEffectEvent(async () => {
        setIsLoading(true);
        const response = await getCustomerDashboard();

        if (!response.success || !response.data) {
            if (response.error?.includes('sesión') && typeof window !== 'undefined') {
                window.location.href = '/auth/login?next=/auth/account';
                return;
            }
            setData(null);
            setCurrentPage(1);
            setError(response.error || 'No se pudo cargar tu cuenta.');
            setIsLoading(false);
            return;
        }

        setData(response.data);
        setCurrentPage(1);
        setFirstName(response.data.customer.firstName || '');
        setLastName(response.data.customer.lastName || '');
        setPhoneNumber(response.data.customer.phoneNumber || '');
        setDocumentNumber(response.data.customer.documentNumber || '');
        setNewEmailAddress(response.data.customer.emailAddress || '');
        setError(null);
        setIsLoading(false);
    });

    useEffect(() => {
        void loadDashboard();
    }, []);

    useEffect(() => {
        if (authStatus === 'guest' && typeof window !== 'undefined') {
            window.location.href = '/auth/login?next=/auth/account';
        }
    }, [authStatus]);

    async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSavingProfile(true);
        setProfileError(null);
        setProfileMessage(null);

        if (documentNumber.trim() && !isReasonableDocumentNumber(documentNumber)) {
            setProfileError('Ingresá un DNI válido de 7 u 8 dígitos.');
            setIsSavingProfile(false);
            return;
        }

        const response = await updateCustomerProfile({
            firstName,
            lastName,
            phoneNumber,
            documentNumber,
        });

        if (!response.success) {
            setProfileError(response.error || 'No se pudo actualizar tu perfil.');
            setIsSavingProfile(false);
            return;
        }

        setProfileMessage('Tus datos se guardaron correctamente.');
        await loadDashboard();
        setIsSavingProfile(false);
    }

    async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsChangingPassword(true);
        setPasswordError(null);
        setPasswordMessage(null);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordError('Completá la contraseña actual y la nueva contraseña.');
            setIsChangingPassword(false);
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordError('La nueva contraseña y su confirmación no coinciden.');
            setIsChangingPassword(false);
            return;
        }

        const response = await changePassword({
            currentPassword,
            newPassword,
        });

        if (!response.success) {
            setPasswordError(response.error || 'No se pudo cambiar la contraseña.');
            setIsChangingPassword(false);
            return;
        }

        setPasswordMessage(response.message || 'Tu contraseña se actualizó correctamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsChangingPassword(false);
    }

    async function handleRequestEmailChange(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsRequestingEmailChange(true);
        setEmailChangeError(null);
        setEmailChangeMessage(null);

        if (!newEmailAddress || !emailChangePassword) {
            setEmailChangeError('Completá el nuevo email y tu contraseña actual.');
            setIsRequestingEmailChange(false);
            return;
        }

        const response = await requestEmailChange({
            password: emailChangePassword,
            newEmailAddress,
        });

        if (!response.success) {
            setEmailChangeError(response.error || 'No se pudo solicitar el cambio de email.');
            setIsRequestingEmailChange(false);
            return;
        }

        setEmailChangeMessage(
            response.message || 'Te enviamos un enlace al nuevo email para confirmar el cambio.',
        );
        setEmailChangePassword('');
        setIsRequestingEmailChange(false);
    }

    const totalPages = data ? Math.max(1, Math.ceil(data.orders.length / PAGE_SIZE)) : 1;
    const pagedOrders = data
        ? data.orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
        : [];

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="lg">
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'var(--cla-brand-green)' }}>
                            Mi cuenta
                        </Typography>
                        <Typography color="text.secondary">
                            {ANDREANI_ENABLED
                                ? 'Revisá tus pedidos, el tracking de Andreani y la personalización pendiente o ya enviada.'
                                : 'Revisá tus pedidos y la personalización pendiente o ya enviada.'}
                        </Typography>
                    </Box>

                    {isLoading && (
                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <CircularProgress size={22} />
                                    <Typography>Cargando tu dashboard...</Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {!isLoading && error && (
                        <Alert
                            severity="warning"
                            action={(
                                <Button color="inherit" size="small" startIcon={<RefreshOutlinedIcon />} onClick={() => void loadDashboard()}>
                                    Reintentar
                                </Button>
                            )}
                        >
                            {error}
                        </Alert>
                    )}

                    {!isLoading && data && (
                        <>
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Stack
                                        spacing={2}
                                        component="form"
                                        onSubmit={handleSaveProfile}
                                    >
                                        <Box>
                                            <Typography variant="h5" fontWeight={700}>
                                                {data.customer.firstName || data.customer.lastName
                                                    ? `${data.customer.firstName} ${data.customer.lastName}`.trim()
                                                    : 'Cliente'}
                                            </Typography>
                                            <Typography color="text.secondary">
                                                {data.customer.emailAddress}
                                            </Typography>
                                        </Box>

                                        {needsBuyerData(data.customer) && (
                                            <Alert severity="warning">
                                                Completá nombre, teléfono y DNI para dejar tu cuenta lista y evitar huecos en futuras compras o seguimientos.
                                            </Alert>
                                        )}

                                        {profileError && (
                                            <Alert severity="error">
                                                {profileError}
                                            </Alert>
                                        )}

                                        {profileMessage && (
                                            <Alert severity="success">
                                                {profileMessage}
                                            </Alert>
                                        )}

                                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                            <TextField
                                                fullWidth
                                                label="Nombre"
                                                value={firstName}
                                                onChange={(event) => setFirstName(event.target.value)}
                                                autoComplete="given-name"
                                            />
                                            <TextField
                                                fullWidth
                                                label="Apellido"
                                                value={lastName}
                                                onChange={(event) => setLastName(event.target.value)}
                                                autoComplete="family-name"
                                            />
                                        </Stack>

                                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                            <TextField
                                                fullWidth
                                                label="Teléfono"
                                                value={phoneNumber}
                                                onChange={(event) => setPhoneNumber(event.target.value)}
                                                autoComplete="tel"
                                            />
                                            <TextField
                                                fullWidth
                                                label="DNI / Documento"
                                                value={documentNumber}
                                                onChange={(event) => setDocumentNumber(event.target.value)}
                                            />
                                        </Stack>

                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                                            <Button
                                                type="submit"
                                                variant="outlined"
                                                disabled={isSavingProfile}
                                            >
                                                {isSavingProfile ? 'Guardando...' : 'Guardar datos de comprador'}
                                            </Button>
                                            <Typography variant="body2" color="text.secondary">
                                                Email de cuenta: {data.customer.emailAddress}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>

                            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                                <Card variant="outlined" sx={{ borderRadius: 3, flex: 1 }}>
                                    <CardContent>
                                        <Stack spacing={2} component="form" onSubmit={handleChangePassword}>
                                            <Box>
                                                <Typography variant="h6" fontWeight={700}>
                                                    Cambiar contraseña
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Actualizá tu contraseña para mantener la cuenta protegida.
                                                </Typography>
                                            </Box>

                                            {passwordError && <Alert severity="error">{passwordError}</Alert>}
                                            {passwordMessage && <Alert severity="success">{passwordMessage}</Alert>}

                                            <TextField
                                                fullWidth
                                                label="Contraseña actual"
                                                type="password"
                                                value={currentPassword}
                                                onChange={(event) => setCurrentPassword(event.target.value)}
                                                autoComplete="current-password"
                                            />
                                            <TextField
                                                fullWidth
                                                label="Nueva contraseña"
                                                type="password"
                                                value={newPassword}
                                                onChange={(event) => setNewPassword(event.target.value)}
                                                autoComplete="new-password"
                                            />
                                            <TextField
                                                fullWidth
                                                label="Confirmar nueva contraseña"
                                                type="password"
                                                value={confirmNewPassword}
                                                onChange={(event) => setConfirmNewPassword(event.target.value)}
                                                autoComplete="new-password"
                                            />

                                            <Button
                                                type="submit"
                                                variant="outlined"
                                                startIcon={<LockResetOutlinedIcon />}
                                                disabled={isChangingPassword}
                                            >
                                                {isChangingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Card variant="outlined" sx={{ borderRadius: 3, flex: 1 }}>
                                    <CardContent>
                                        <Stack spacing={2} component="form" onSubmit={handleRequestEmailChange}>
                                            <Box>
                                                <Typography variant="h6" fontWeight={700}>
                                                    Cambiar email
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Te vamos a enviar un enlace de confirmación al nuevo email.
                                                </Typography>
                                            </Box>

                                            {emailChangeError && <Alert severity="error">{emailChangeError}</Alert>}
                                            {emailChangeMessage && <Alert severity="success">{emailChangeMessage}</Alert>}

                                            <TextField
                                                fullWidth
                                                label="Nuevo email"
                                                type="email"
                                                value={newEmailAddress}
                                                onChange={(event) => setNewEmailAddress(event.target.value)}
                                                autoComplete="email"
                                            />
                                            <TextField
                                                fullWidth
                                                label="Contraseña actual"
                                                type="password"
                                                value={emailChangePassword}
                                                onChange={(event) => setEmailChangePassword(event.target.value)}
                                                autoComplete="current-password"
                                            />

                                            <Button
                                                type="submit"
                                                variant="outlined"
                                                startIcon={<AlternateEmailOutlinedIcon />}
                                                disabled={isRequestingEmailChange}
                                            >
                                                {isRequestingEmailChange ? 'Enviando...' : 'Solicitar cambio de email'}
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Stack>

                            {data.orders.length === 0 ? (
                                <Alert severity="info">
                                    Todavía no hay pedidos asociados a esta cuenta.
                                </Alert>
                            ) : (
                                <Stack spacing={2.5}>
                                    {pagedOrders.map((order) => {
                                        const businessStatus = deriveOrderBusinessStatus(order);
                                        const statusPresentation = getBusinessStatusPresentation(businessStatus);

                                        return (
                                        <Card key={order.code} variant="outlined" sx={{ borderRadius: 3 }}>
                                            <CardContent>
                                                <Stack spacing={2}>
                                                    <Stack
                                                        direction={{ xs: 'column', md: 'row' }}
                                                        spacing={2}
                                                        justifyContent="space-between"
                                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                                    >
                                                        <Box>
                                                            <Typography variant="h5" fontWeight={700}>
                                                                Pedido {order.code}
                                                            </Typography>
                                                            <Typography color="text.secondary">
                                                                {formatDate(order.orderPlacedAt || order.createdAt)}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {formatMoney(order.totalWithTax, order.currencyCode)}
                                                        </Typography>
                                                    </Stack>

                                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
                                                        <Chip color={statusPresentation.tone} label={`Estado: ${statusPresentation.label}`} />
                                                        <Chip icon={<ReceiptLongOutlinedIcon />} label={`Pago: ${order.payment.state || order.state}`} />
                                                        {order.trackingCode ? (
                                                            <Chip
                                                                icon={<LocalShippingOutlinedIcon />}
                                                                label={`Envío: ${order.trackingCode}`}
                                                                component="a"
                                                                href={buildAndreaniTrackingUrl(order.trackingCode)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                clickable
                                                            />
                                                        ) : (
                                                            <Chip icon={<LocalShippingOutlinedIcon />} label={`Envío: ${order.shipmentState || 'Aún no disponible'}`} />
                                                        )}
                                                        <Chip icon={<PhotoCameraBackOutlinedIcon />} color={getPersonalizationColor(order)} label={`Personalización: ${getPersonalizationLabel(order)}`} />
                                                    </Stack>

                                                    <Typography variant="body2" color="text.secondary">
                                                        {statusPresentation.description}
                                                    </Typography>

                                                    {order.personalization?.requiresPersonalization && order.personalization.personalizationStatus === 'pending' && (
                                                        <Alert severity="warning">
                                                            Acción requerida: este pedido necesita una imagen para fabricar el producto. La orden seguirá pendiente hasta que la subas.
                                                        </Alert>
                                                    )}

                                                    <Divider />

                                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                                        <Box flex={1}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {order.items.length} producto(s) · {order.totalQuantity} unidad(es)
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Estado de la orden: {order.state}
                                                            </Typography>
                                                            {order.buyer?.fullName && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Comprador: {order.buyer.fullName}
                                                                </Typography>
                                                            )}
                                                            {order.buyer?.email && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Email compra: {order.buyer.email}
                                                                </Typography>
                                                            )}
                                                            {order.buyer?.phone && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Teléfono compra: {order.buyer.phone}
                                                                </Typography>
                                                            )}
                                                            <Typography variant="body2" color="text.secondary">
                                                                Producción: {getProductionStatusLabel(order.productionStatus)}
                                                                {order.productionUpdatedAt ? ` · ${formatDate(order.productionUpdatedAt)}` : ''}
                                                            </Typography>
                                                            {order.trackingCode && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Tracking:{' '}
                                                                    <a
                                                                        href={buildAndreaniTrackingUrl(order.trackingCode)}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{ color: 'var(--cla-brand-green)', fontWeight: 600 }}
                                                                    >
                                                                        {order.trackingCode}
                                                                    </a>
                                                                </Typography>
                                                            )}
                                                            {ANDREANI_ENABLED && order.logistics?.serviceName && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Servicio Andreani: {order.logistics.serviceName}
                                                                </Typography>
                                                            )}
                                                            {order.personalization?.originalFilename && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Archivo actual: {order.personalization.originalFilename}
                                                                </Typography>
                                                            )}
                                                        </Box>

                                                        <Stack spacing={2} width={{ xs: '100%', md: 280 }}>
                                                            <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                                                                <CardContent sx={{ p: 2 }}>
                                                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                                                        Progreso del pedido
                                                                    </Typography>
                                                                    <OrderProgressTimeline order={order} compact />
                                                                </CardContent>
                                                            </Card>

                                                            {order.personalization?.assetPreviewUrl && (
                                                                <Box
                                                                    component="img"
                                                                    src={order.personalization.assetPreviewUrl}
                                                                    alt={order.personalization.originalFilename || `Personalización ${order.code}`}
                                                                    sx={{
                                                                        width: '100%',
                                                                        height: 140,
                                                                        objectFit: 'cover',
                                                                        borderRadius: 2,
                                                                        border: '1px solid',
                                                                        borderColor: 'divider',
                                                                    }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </Stack>

                                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                                        <Button
                                                            component={Link}
                                                            href={`/auth/orders/${encodeURIComponent(order.code)}`}
                                                            prefetch={false}
                                                            variant="contained"
                                                        >
                                                            Ver detalle
                                                        </Button>
                                                        {order.personalization?.requiresPersonalization && (
                                                            <Button
                                                                component={Link}
                                                                href={`/auth/orders/${encodeURIComponent(order.code)}#personalizacion`}
                                                                prefetch={false}
                                                                variant="outlined"
                                                                startIcon={<OpenInNewOutlinedIcon />}
                                                            >
                                                                Subir o reemplazar foto
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                        );
                                    })}

                                    {totalPages > 1 && (
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={2}
                                            alignItems={{ xs: 'stretch', sm: 'center' }}
                                            justifyContent="space-between"
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                Página {currentPage} de {totalPages}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    variant="outlined"
                                                    disabled={currentPage <= 1}
                                                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                                >
                                                    Anterior
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    disabled={currentPage >= totalPages}
                                                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                                >
                                                    Siguiente
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    )}
                                </Stack>
                            )}
                        </>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}
