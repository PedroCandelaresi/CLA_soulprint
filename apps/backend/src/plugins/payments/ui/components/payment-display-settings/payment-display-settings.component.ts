import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DataService, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

const GET_SETTINGS = gql`
    query GetStorefrontPaymentSettings {
        storefrontPaymentSettings {
            id
            sectionTitle
            footerText
        }
    }
`;

const UPDATE_SETTINGS = gql`
    mutation UpdateStorefrontPaymentSettings($input: UpdateStorefrontPaymentSettingsInput!) {
        updateStorefrontPaymentSettings(input: $input) {
            id
            sectionTitle
            footerText
        }
    }
`;

@Component({
    selector: 'payment-display-settings',
    templateUrl: './payment-display-settings.component.html',
})
export class PaymentDisplaySettingsComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    loading = false;
    saving = false;

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
    ) {}

    ngOnInit(): void {
        this.form = this.fb.group({
            sectionTitle: [''],
            footerText: [''],
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
            .mapSingle((data: any) => data.storefrontPaymentSettings)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (settings: any) => {
                    this.form.patchValue({
                        sectionTitle: settings?.sectionTitle ?? '',
                        footerText: settings?.footerText ?? '',
                    });
                    this.loading = false;
                },
                error: () => {
                    this.notificationService.error('No se pudieron cargar los ajustes de pagos');
                    this.loading = false;
                },
            });
    }

    save(): void {
        if (this.form.invalid) return;

        const value = this.form.getRawValue();
        this.saving = true;
        this.dataService
            .mutate(UPDATE_SETTINGS, {
                input: {
                    sectionTitle: value.sectionTitle,
                    footerText: value.footerText,
                },
            })
            .subscribe({
                next: () => {
                    this.saving = false;
                    this.notificationService.success('Ajustes de pagos guardados');
                },
                error: (err: any) => {
                    this.saving = false;
                    this.notificationService.error(err?.graphQLErrors?.[0]?.message || 'No se pudo guardar');
                },
            });
    }
}
