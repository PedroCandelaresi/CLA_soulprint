import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

const GET_SETTINGS = gql`
    query GetHomeCarouselSettings {
        homeCarouselSettings {
            id
            transitionEffect
            autoplayEnabled
            autoplayInterval
            showArrows
            showDots
        }
    }
`;

const UPDATE_SETTINGS = gql`
    mutation UpdateHomeCarouselSettings($input: UpdateHomeCarouselSettingsInput!) {
        updateHomeCarouselSettings(input: $input) {
            id
            transitionEffect
            autoplayEnabled
            autoplayInterval
            showArrows
            showDots
        }
    }
`;

@Component({
    selector: 'home-carousel-settings',
    templateUrl: './home-carousel-settings.component.html',
})
export class HomeCarouselSettingsComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    loading = false;
    saving = false;

    readonly transitionOptions = [
        { value: 'fade', label: 'Fade' },
        { value: 'slide', label: 'Slide' },
        { value: 'zoom', label: 'Zoom' },
    ];

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private router: Router,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.form = this.fb.group({
            transitionEffect: ['fade'],
            autoplayEnabled: [true],
            autoplayInterval: [5500, [Validators.min(1000)]],
            showArrows: [true],
            showDots: [true],
        });
        this.load();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private load(): void {
        this.loading = true;
        this.dataService
            .query(GET_SETTINGS)
            .mapSingle((data: any) => data.homeCarouselSettings)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (s: any) => {
                    if (s) {
                        this.form.patchValue({
                            transitionEffect: s.transitionEffect,
                            autoplayEnabled: s.autoplayEnabled,
                            autoplayInterval: s.autoplayInterval,
                            showArrows: s.showArrows,
                            showDots: s.showDots,
                        });
                    }
                    this.loading = false;
                },
                error: () => {
                    this.notificationService.error('No se pudieron cargar los ajustes');
                    this.loading = false;
                },
            });
    }

    save(): void {
        if (this.form.invalid) return;
        const v = this.form.getRawValue();
        this.saving = true;
        this.dataService
            .mutate(UPDATE_SETTINGS, {
                input: {
                    transitionEffect: v.transitionEffect,
                    autoplayEnabled: !!v.autoplayEnabled,
                    autoplayInterval: Number(v.autoplayInterval),
                    showArrows: !!v.showArrows,
                    showDots: !!v.showDots,
                },
            })
            .subscribe({
                next: () => {
                    this.saving = false;
                    this.notificationService.success('Ajustes guardados');
                },
                error: (err: any) => {
                    this.saving = false;
                    this.notificationService.error(err?.graphQLErrors?.[0]?.message || 'No se pudo guardar');
                },
            });
    }

    back(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }
}
