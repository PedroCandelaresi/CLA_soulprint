'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { CustomerAddress, CustomerAddressInput } from '@/types/storefront';
import { useCustomerAccount } from './CustomerAccountProvider';
import {
    AccountEmptyState,
    AccountErrorState,
    AccountSectionCard,
    AccountStatusChip,
} from './AccountShared';
import { formatAddressLines } from './accountPresentation';

type FeedbackState = {
    severity: 'success' | 'error';
    message: string;
};

const baseAddressForm: CustomerAddressInput = {
    fullName: '',
    company: '',
    streetLine1: '',
    streetLine2: '',
    city: '',
    province: '',
    postalCode: '',
    countryCode: '',
    phoneNumber: '',
    defaultShippingAddress: false,
    defaultBillingAddress: false,
};

function mapAddressToForm(address: CustomerAddress): CustomerAddressInput {
    return {
        id: address.id,
        fullName: address.fullName || '',
        company: address.company || '',
        streetLine1: address.streetLine1,
        streetLine2: address.streetLine2 || '',
        city: address.city || '',
        province: address.province || '',
        postalCode: address.postalCode || '',
        countryCode: address.country.code,
        phoneNumber: address.phoneNumber || '',
        defaultShippingAddress: Boolean(address.defaultShippingAddress),
        defaultBillingAddress: Boolean(address.defaultBillingAddress),
    };
}

export default function AccountAddresses() {
    const { accountError, availableCountries, customer, deleteAddress, saveAddress } = useCustomerAccount();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CustomerAddress | null>(null);
    const [form, setForm] = useState<CustomerAddressInput>(baseAddressForm);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const countryOptions = useMemo(
        () => availableCountries.slice().sort((left, right) => left.name.localeCompare(right.name, 'es')),
        [availableCountries],
    );

    if (accountError) {
        return <AccountErrorState message={accountError} />;
    }

    if (!customer) {
        return (
            <AccountEmptyState
                title="No pudimos cargar tus direcciones"
                description="Intentá nuevamente en unos segundos para administrar tus destinos de envío y facturación."
            />
        );
    }

    const openCreateDialog = () => {
        setFeedback(null);
        setForm({
            ...baseAddressForm,
            countryCode: countryOptions[0]?.code || '',
        });
        setDialogOpen(true);
    };

    const openEditDialog = (address: CustomerAddress) => {
        setFeedback(null);
        setForm(mapAddressToForm(address));
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (saving) {
            return;
        }
        setDialogOpen(false);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFeedback(null);

        if (!form.fullName.trim() || !form.streetLine1.trim() || !form.city.trim() || !form.postalCode.trim()) {
            setFeedback({
                severity: 'error',
                message: 'Completá nombre completo, calle, ciudad y código postal para guardar la dirección.',
            });
            return;
        }

        if (!form.countryCode) {
            setFeedback({
                severity: 'error',
                message: 'Seleccioná un país válido para continuar.',
            });
            return;
        }

        setSaving(true);
        const result = await saveAddress(form);
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success ? 'Dirección guardada correctamente.' : 'No se pudo guardar la dirección.'),
        });
        if (result.success) {
            setDialogOpen(false);
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        const result = await deleteAddress(deleteTarget.id);
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success ? 'Dirección eliminada correctamente.' : 'No se pudo eliminar la dirección.'),
        });
        if (result.success) {
            setDeleteTarget(null);
        }
        setDeleting(false);
    };

    return (
        <Stack spacing={3}>
            <Stack spacing={0.75}>
                <Typography variant="h4" fontWeight={700}>
                    Direcciones
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Organizá tus direcciones de envío y facturación para acelerar futuras compras.
                </Typography>
            </Stack>

            {feedback && !dialogOpen && !deleteTarget && (
                <Alert severity={feedback.severity}>{feedback.message}</Alert>
            )}

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
            >
                <Typography variant="body2" color="text.secondary">
                    Podés marcar direcciones preferidas para envío y facturación desde cada ficha.
                </Typography>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
                    Nueva dirección
                </Button>
            </Stack>

            {customer.addresses.length === 0 ? (
                <AccountEmptyState
                    title="Todavía no guardaste direcciones"
                    description="Agregá una dirección para agilizar tus próximas compras y tener tus datos listos en checkout."
                    action={
                        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
                            Agregar dirección
                        </Button>
                    }
                />
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
                    }}
                >
                    {customer.addresses.map((address) => (
                        <AccountSectionCard key={address.id} sx={{ height: '100%' }}>
                            <Stack spacing={2}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    justifyContent="space-between"
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                >
                                    <Stack spacing={0.5}>
                                        <Typography variant="h6" fontWeight={700}>
                                            {address.fullName || 'Dirección guardada'}
                                        </Typography>
                                        {address.company && (
                                            <Typography variant="body2" color="text.secondary">
                                                {address.company}
                                            </Typography>
                                        )}
                                    </Stack>

                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {address.defaultShippingAddress && (
                                            <AccountStatusChip label="Predeterminada para envío" color="info" />
                                        )}
                                        {address.defaultBillingAddress && (
                                            <AccountStatusChip label="Predeterminada para facturación" color="secondary" />
                                        )}
                                    </Stack>
                                </Stack>

                                <Stack spacing={0.6}>
                                    {formatAddressLines(address).map((line) => (
                                        <Typography key={line} variant="body2" color="text.secondary">
                                            {line}
                                        </Typography>
                                    ))}
                                    {address.phoneNumber && (
                                        <Typography variant="body2" color="text.secondary">
                                            Teléfono: {address.phoneNumber}
                                        </Typography>
                                    )}
                                </Stack>

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<EditOutlinedIcon fontSize="small" />}
                                        onClick={() => openEditDialog(address)}
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                        variant="text"
                                        color="inherit"
                                        startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                                        onClick={() => setDeleteTarget(address)}
                                    >
                                        Eliminar
                                    </Button>
                                </Stack>
                            </Stack>
                        </AccountSectionCard>
                    ))}
                </Box>
            )}

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>{form.id ? 'Editar dirección' : 'Nueva dirección'}</DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent>
                        <Stack spacing={2}>
                            {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}
                            <TextField
                                label="Nombre completo"
                                value={form.fullName}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, fullName: event.target.value }))
                                }
                                required
                                fullWidth
                            />
                            <TextField
                                label="Empresa"
                                value={form.company || ''}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, company: event.target.value }))
                                }
                                fullWidth
                            />
                            <TextField
                                label="Calle y número"
                                value={form.streetLine1}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, streetLine1: event.target.value }))
                                }
                                required
                                fullWidth
                            />
                            <TextField
                                label="Piso, departamento o referencia"
                                value={form.streetLine2 || ''}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, streetLine2: event.target.value }))
                                }
                                fullWidth
                            />

                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 2,
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                                }}
                            >
                                <TextField
                                    label="Ciudad"
                                    value={form.city}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, city: event.target.value }))
                                    }
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="Provincia / estado"
                                    value={form.province || ''}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, province: event.target.value }))
                                    }
                                    fullWidth
                                />
                                <TextField
                                    label="Código postal"
                                    value={form.postalCode}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, postalCode: event.target.value }))
                                    }
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="País"
                                    value={form.countryCode}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, countryCode: event.target.value }))
                                    }
                                    select
                                    fullWidth
                                >
                                    {countryOptions.map((country) => (
                                        <MenuItem key={country.id} value={country.code}>
                                            {country.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            <TextField
                                label="Teléfono de contacto"
                                value={form.phoneNumber || ''}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
                                }
                                fullWidth
                            />

                            <Stack>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={form.defaultShippingAddress}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    defaultShippingAddress: event.target.checked,
                                                }))
                                            }
                                        />
                                    }
                                    label="Usar como dirección predeterminada de envío"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={form.defaultBillingAddress}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    defaultBillingAddress: event.target.checked,
                                                }))
                                            }
                                        />
                                    }
                                    label="Usar como dirección predeterminada de facturación"
                                />
                            </Stack>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={closeDialog} color="inherit">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="contained" disabled={saving}>
                            Guardar dirección
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog open={Boolean(deleteTarget)} onClose={() => (deleting ? null : setDeleteTarget(null))} maxWidth="xs" fullWidth>
                <DialogTitle>Eliminar dirección</DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}
                        <Typography variant="body2" color="text.secondary">
                            Esta acción quitará la dirección guardada de tu cuenta. Si la usabas como predeterminada,
                            vas a poder elegir otra más adelante.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setDeleteTarget(null)} color="inherit" disabled={deleting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        color="error"
                        variant="contained"
                        disabled={deleting}
                    >
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
