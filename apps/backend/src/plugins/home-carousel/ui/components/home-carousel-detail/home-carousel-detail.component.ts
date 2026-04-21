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

interface SelectedAsset {
    id: string;
    preview: string;
    name: string;
}

const GET_SLIDE = gql`
    query GetHomeCarouselSlide($id: ID!) {
        homeCarouselSlide(id: $id) {
            id
            title
            subtitle
            description
            primaryButtonText
            primaryButtonUrl
            secondaryButtonText
            secondaryButtonUrl
            linkType
            openInNewTab
            isActive
            sortOrder
            altText
            layout
            textTheme
            badgeText
            badgeColor
            badgeVariant
            desktopAsset { id name preview }
            mobileAsset { id name preview }
        }
    }
`;

const CREATE_SLIDE = gql`
    mutation CreateHomeCarouselSlide($input: CreateHomeCarouselSlideInput!) {
        createHomeCarouselSlide(input: $input) { id title }
    }
`;

const UPDATE_SLIDE = gql`
    mutation UpdateHomeCarouselSlide($input: UpdateHomeCarouselSlideInput!) {
        updateHomeCarouselSlide(input: $input) { id title }
    }
`;

const GET_NEXT_SORT_ORDER = gql`
    query GetHomeCarouselNextSortOrder {
        homeCarouselSlides(options: { sort: { sortOrder: DESC }, take: 1 }) {
            items {
                sortOrder
            }
        }
    }
`;

@Component({
    selector: 'home-carousel-detail',
    templateUrl: './home-carousel-detail.component.html',
})
export class HomeCarouselDetailComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    isNew = true;
    loading = false;
    saving = false;
    desktopAsset: SelectedAsset | null = null;
    mobileAsset: SelectedAsset | null = null;

    readonly layoutOptions = [
        { value: 'split_left', label: 'Split · texto izquierda' },
        { value: 'split_right', label: 'Split · texto derecha' },
        { value: 'full_image', label: 'Foto completa' },
    ];
    readonly textThemeOptions = [
        { value: 'dark', label: 'Oscuro' },
        { value: 'light', label: 'Claro' },
    ];
    readonly badgeVariantOptions = [
        { value: 'solid', label: 'Solid' },
        { value: 'outline', label: 'Outline' },
        { value: 'pill', label: 'Pill' },
    ];
    readonly linkTypeOptions = [
        { value: 'internal', label: 'Interno' },
        { value: 'external', label: 'Externo' },
    ];

    private slideId: string | null = null;
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
            title: ['', [Validators.required]],
            subtitle: [''],
            description: [''],
            primaryButtonText: [''],
            primaryButtonUrl: [''],
            secondaryButtonText: [''],
            secondaryButtonUrl: [''],
            linkType: ['internal'],
            openInNewTab: [false],
            isActive: [true],
            sortOrder: [0, [Validators.min(0)]],
            altText: [''],
            layout: ['split_left'],
            textTheme: ['dark'],
            badgeText: [''],
            badgeColor: ['#c7a46b'],
            badgeVariant: ['solid'],
        });

        this.slideId = this.route.snapshot.paramMap.get('id');
        this.isNew = !this.slideId;
        if (!this.isNew && this.slideId) {
            this.load(this.slideId);
        } else {
            this.loadCreateDefaults();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private load(id: string): void {
        this.loading = true;
        this.dataService
            .query(GET_SLIDE, { id })
            .mapSingle((data: any) => data.homeCarouselSlide)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (slide: any) => {
                    if (!slide) {
                        this.notificationService.error('Slide no encontrado');
                        this.router.navigate(['../'], { relativeTo: this.route });
                        return;
                    }
                    this.form.patchValue({
                        title: slide.title,
                        subtitle: slide.subtitle ?? '',
                        description: slide.description ?? '',
                        primaryButtonText: slide.primaryButtonText ?? '',
                        primaryButtonUrl: slide.primaryButtonUrl ?? '',
                        secondaryButtonText: slide.secondaryButtonText ?? '',
                        secondaryButtonUrl: slide.secondaryButtonUrl ?? '',
                        linkType: slide.linkType,
                        openInNewTab: slide.openInNewTab,
                        isActive: slide.isActive,
                        sortOrder: slide.sortOrder,
                        altText: slide.altText ?? '',
                        layout: slide.layout,
                        textTheme: slide.textTheme,
                        badgeText: slide.badgeText ?? '',
                        badgeColor: slide.badgeColor ?? '#c7a46b',
                        badgeVariant: slide.badgeVariant,
                    });
                    this.desktopAsset = slide.desktopAsset ?? null;
                    this.mobileAsset = slide.mobileAsset ?? null;
                    this.loading = false;
                },
                error: () => {
                    this.notificationService.error('No se pudo cargar el slide');
                    this.loading = false;
                },
            });
    }

    pickAsset(target: 'desktop' | 'mobile'): void {
        this.modalService
            .fromComponent(AssetPickerDialogComponent, {
                size: 'xl',
                closable: true,
                locals: { multiSelect: false, initialTags: [] },
            })
            .subscribe((result: any) => {
                if (result?.length) {
                    if (target === 'desktop') this.desktopAsset = result[0];
                    else this.mobileAsset = result[0];
                }
            });
    }

    clearAsset(target: 'desktop' | 'mobile'): void {
        if (target === 'desktop') this.desktopAsset = null;
        else this.mobileAsset = null;
    }

    save(): void {
        if (this.saving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notificationService.error('Revisá los campos obligatorios antes de guardar.');
            return;
        }
        const v = this.form.getRawValue();
        const base = {
            title: String(v.title).trim(),
            subtitle: v.subtitle || null,
            description: v.description || null,
            primaryButtonText: v.primaryButtonText || null,
            primaryButtonUrl: v.primaryButtonUrl || null,
            secondaryButtonText: v.secondaryButtonText || null,
            secondaryButtonUrl: v.secondaryButtonUrl || null,
            linkType: v.linkType,
            openInNewTab: !!v.openInNewTab,
            isActive: !!v.isActive,
            sortOrder: Number(v.sortOrder),
            altText: v.altText || null,
            layout: v.layout,
            textTheme: v.textTheme,
            badgeText: v.badgeText || null,
            badgeColor: v.badgeColor || null,
            badgeVariant: v.badgeVariant,
            desktopAssetId: this.desktopAsset?.id ?? null,
            mobileAssetId: this.mobileAsset?.id ?? null,
        };
        this.saving = true;
        if (this.isNew) {
            this.dataService.mutate(CREATE_SLIDE, { input: base }).subscribe({
                next: (data: any) => {
                    this.saving = false;
                    this.notificationService.success('Slide creado');
                    this.router.navigate(['../', data.createHomeCarouselSlide.id], { relativeTo: this.route });
                },
                error: (err: any) => {
                    this.saving = false;
                    this.notificationService.error(err?.graphQLErrors?.[0]?.message || 'No se pudo crear');
                },
            });
        } else {
            this.dataService.mutate(UPDATE_SLIDE, { input: { id: this.slideId, ...base } }).subscribe({
                next: () => {
                    this.saving = false;
                    this.notificationService.success('Slide guardado');
                },
                error: (err: any) => {
                    this.saving = false;
                    this.notificationService.error(err?.graphQLErrors?.[0]?.message || 'No se pudo guardar');
                },
            });
        }
    }

    cancel(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }

    get previewTitle(): string {
        return this.form?.get('title')?.value || 'Título del slide';
    }

    get previewSubtitle(): string {
        return this.form?.get('subtitle')?.value || 'CLA Soulprint';
    }

    get previewDescription(): string {
        return this.form?.get('description')?.value || 'Configurá el contenido y la imagen antes de publicar.';
    }

    get previewBadgeText(): string {
        return this.form?.get('badgeText')?.value || '';
    }

    get previewBadgeColor(): string {
        return this.form?.get('badgeColor')?.value || '#c7a46b';
    }

    get previewLayoutLabel(): string {
        const value = this.form?.get('layout')?.value;
        return this.layoutOptions.find((opt) => opt.value === value)?.label ?? 'Split · texto izquierda';
    }

    get previewThemeLabel(): string {
        const value = this.form?.get('textTheme')?.value;
        return this.textThemeOptions.find((opt) => opt.value === value)?.label ?? 'Oscuro';
    }

    private loadCreateDefaults(): void {
        this.dataService
            .query(GET_NEXT_SORT_ORDER)
            .mapSingle((data: any) => data.homeCarouselSlides?.items?.[0]?.sortOrder)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (lastSortOrder: number | null | undefined) => {
                    const sortOrderControl = this.form.get('sortOrder');
                    if (!sortOrderControl || sortOrderControl.dirty) {
                        return;
                    }
                    const nextSortOrder =
                        typeof lastSortOrder === 'number' && Number.isFinite(lastSortOrder)
                            ? lastSortOrder + 1
                            : 0;
                    sortOrderControl.setValue(nextSortOrder);
                },
            });
    }
}
