import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    AssetPickerDialogComponent,
    DataService,
    ModalService,
    NotificationService,
} from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface SelectedAsset {
    id: string;
    preview: string;
    name: string;
}

const GET_BADGE = gql`
    query GetBadgeDetail($id: ID!) {
        badge(id: $id) {
            id
            name
            code
            enabled
            priority
            expiresAt
            backgroundColor
            textColor
            featuredAsset {
                id
                name
                preview
            }
        }
    }
`;

const CREATE_BADGE = gql`
    mutation CreateBadge($input: CreateBadgeInput!) {
        createBadge(input: $input) {
            id
            name
            code
        }
    }
`;

const UPDATE_BADGE = gql`
    mutation UpdateBadge($input: UpdateBadgeInput!) {
        updateBadge(input: $input) {
            id
            name
            code
            enabled
            priority
            expiresAt
            backgroundColor
            textColor
            featuredAsset {
                id
                name
                preview
            }
        }
    }
`;

function toDatetimeLocal(value: string | Date | null | undefined): string {
    if (!value) {
        return '';
    }
    const d = new Date(value as string);
    if (isNaN(d.getTime())) {
        return '';
    }
    // Produces 'YYYY-MM-DDTHH:mm' expected by datetime-local input
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        d.getFullYear() +
        '-' +
        pad(d.getMonth() + 1) +
        '-' +
        pad(d.getDate()) +
        'T' +
        pad(d.getHours()) +
        ':' +
        pad(d.getMinutes())
    );
}

@Component({
    selector: 'badge-detail',
    templateUrl: './badge-detail.component.html',
})
export class BadgeDetailComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    isNew = true;
    loading = false;
    saving = false;
    selectedAsset: SelectedAsset | null = null;

    private badgeId: string | null = null;
    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private modalService: ModalService,
        private router: Router,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.form = this.fb.group({
            name: ['', [Validators.required]],
            code: ['', [Validators.required]],
            enabled: [true],
            priority: [0, [Validators.min(0)]],
            expiresAt: [''],
            backgroundColor: [''],
            textColor: [''],
        });

        this.badgeId = this.route.snapshot.paramMap.get('id');
        this.isNew = !this.badgeId;

        if (!this.isNew && this.badgeId) {
            this.loadBadge(this.badgeId);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadBadge(id: string): void {
        this.loading = true;
        this.dataService
            .query(GET_BADGE, { id })
            .mapSingle((data: any) => data.badge)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (badge: any) => {
                    if (!badge) {
                        this.notificationService.error('Badge no encontrado');
                        this.router.navigate(['../'], { relativeTo: this.route });
                        return;
                    }
                    this.form.patchValue({
                        name: badge.name,
                        code: badge.code,
                        enabled: badge.enabled,
                        priority: badge.priority,
                        expiresAt: toDatetimeLocal(badge.expiresAt),
                        backgroundColor: badge.backgroundColor ?? '',
                        textColor: badge.textColor ?? '',
                    });
                    // Code is a permanent identifier — read-only on edit
                    this.form.get('code')!.disable();
                    if (badge.featuredAsset) {
                        this.selectedAsset = badge.featuredAsset;
                    }
                    this.loading = false;
                },
                error: () => {
                    this.notificationService.error('No se pudo cargar el badge');
                    this.loading = false;
                },
            });
    }

    openAssetPicker(): void {
        this.modalService
            .fromComponent(AssetPickerDialogComponent, {
                size: 'xl',
                closable: true,
                locals: {
                    multiSelect: false,
                    initialTags: [],
                },
            })
            .subscribe((result: any) => {
                if (result?.length) {
                    this.selectedAsset = result[0];
                }
            });
    }

    clearAsset(): void {
        this.selectedAsset = null;
    }

    clearColor(field: 'backgroundColor' | 'textColor'): void {
        this.form.get(field)!.setValue('');
    }

    get previewBg(): string | null {
        return this.form.get('backgroundColor')?.value || null;
    }

    get previewText(): string | null {
        return this.form.get('textColor')?.value || null;
    }

    save(): void {
        if (this.form.invalid) {
            return;
        }

        const rawValues = this.form.getRawValue(); // includes disabled controls (code)
        const expiresAtRaw: string = rawValues.expiresAt;
        const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;
        const backgroundColor = rawValues.backgroundColor || null;
        const textColor = rawValues.textColor || null;
        const featuredAssetId = this.selectedAsset?.id ?? null;

        this.saving = true;

        if (this.isNew) {
            const input = {
                name: rawValues.name,
                code: rawValues.code,
                enabled: rawValues.enabled,
                priority: Number(rawValues.priority),
                expiresAt,
                backgroundColor,
                textColor,
                featuredAssetId,
            };

            this.dataService.mutate(CREATE_BADGE, { input }).subscribe({
                next: (data: any) => {
                    this.saving = false;
                    this.notificationService.success('Badge creado correctamente');
                    this.router.navigate(['../', data.createBadge.id], {
                        relativeTo: this.route,
                    });
                },
                error: (err: any) => {
                    this.saving = false;
                    const message =
                        err?.graphQLErrors?.[0]?.message || 'No se pudo crear el badge';
                    this.notificationService.error(message);
                },
            });
        } else {
            const input: Record<string, unknown> = {
                id: this.badgeId,
                name: rawValues.name,
                enabled: rawValues.enabled,
                priority: Number(rawValues.priority),
                expiresAt,
                backgroundColor,
                textColor,
                featuredAssetId,
            };

            this.dataService.mutate(UPDATE_BADGE, { input }).subscribe({
                next: () => {
                    this.saving = false;
                    this.notificationService.success('Badge guardado correctamente');
                },
                error: (err: any) => {
                    this.saving = false;
                    const message =
                        err?.graphQLErrors?.[0]?.message || 'No se pudo guardar el badge';
                    this.notificationService.error(message);
                },
            });
        }
    }

    cancel(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }
}
