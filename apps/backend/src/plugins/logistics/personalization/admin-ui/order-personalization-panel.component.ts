import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CustomDetailComponent, DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ORDER_PERSONALIZATION_QUERY } from './personalization.module';
import {
    buildPersonalizationViewModel,
    getPersonalizationLineStatusLabel,
    getPersonalizationLineStatusTone,
    getToneClass,
    PersonalizationLineView,
    PersonalizationViewModel,
} from './personalization.helpers';

@Component({
    selector: 'cla-order-personalization-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="vm$ | async as vm">
        <section class="cla-panel">
            <header class="cla-panel__header">
                <div>
                    <p class="cla-panel__eyebrow">Personalización</p>
                    <h3>{{ vm.personalizationLabel }}</h3>
                </div>
                <span class="cla-status-pill" [ngClass]="getToneClass(vm.personalizationTone)">
                    {{ vm.personalizationRequired ? (vm.personalizationCompletedCount + '/' + vm.personalizationRequiredCount + ' listas') : 'No aplica' }}
                </span>
            </header>

            <p class="cla-panel__copy">{{ vm.personalizationDescription }}</p>

            <div class="cla-alert cla-alert--warning" *ngIf="vm.personalizationRequired && vm.personalizationPendingCount > 0">
                Todavía falta al menos un archivo. El pedido no debería pasar a producción hasta completar lo pendiente.
            </div>

            <div class="cla-empty" *ngIf="!vm.personalizationRequired">
                Ninguna línea de este pedido necesita imagen del cliente.
            </div>

            <div class="cla-line-list" *ngIf="vm.personalizationRequired">
                <article class="cla-line-card" *ngFor="let line of requiredLines(vm)">
                    <div class="cla-line-card__header">
                        <div>
                            <h4>{{ line.productName }}</h4>
                            <p>{{ line.variantName }} · Cantidad {{ line.quantity }}</p>
                        </div>
                        <span class="cla-status-pill" [ngClass]="getToneClass(getPersonalizationLineStatusTone(line.personalizationStatus))">
                            {{ getPersonalizationLineStatusLabel(line.personalizationStatus) }}
                        </span>
                    </div>

                    <div class="cla-line-grid">
                        <div class="cla-preview" *ngIf="line.personalizationAssetPreview; else noPreview">
                            <img
                                [src]="line.personalizationAssetPreview"
                                [alt]="line.personalizationSnapshotFileName || line.productName"
                                class="cla-preview__image">
                        </div>
                        <ng-template #noPreview>
                            <div class="cla-preview cla-preview--empty">
                                <span *ngIf="line.personalizationAssetSource; else noAssetText">Hay archivo, pero sin miniatura</span>
                                <ng-template #noAssetText>El cliente todavía no cargó un archivo para esta línea.</ng-template>
                            </div>
                        </ng-template>

                        <div class="cla-line-meta">
                            <div class="cla-detail-row">
                                <span>Archivo</span>
                                <strong>{{ line.personalizationSnapshotFileName || 'Sin archivo todavía' }}</strong>
                            </div>
                            <div class="cla-detail-row" *ngIf="line.personalizationUploadedAt">
                                <span>Subido el</span>
                                <strong>{{ line.personalizationUploadedAt | date:'dd/MM/yyyy HH:mm' }}</strong>
                            </div>
                            <div class="cla-detail-row" *ngIf="line.personalizationApprovedAt">
                                <span>Aprobado el</span>
                                <strong>{{ line.personalizationApprovedAt | date:'dd/MM/yyyy HH:mm' }}</strong>
                            </div>
                            <div class="cla-notes" *ngIf="line.personalizationNotes">
                                <span class="cla-notes__label">Indicaciones del cliente</span>
                                <p>{{ line.personalizationNotes }}</p>
                            </div>
                            <div class="cla-link-row" *ngIf="line.personalizationAssetSource">
                                <a [href]="line.personalizationAssetSource" target="_blank" rel="noreferrer noopener">
                                    Abrir archivo completo
                                </a>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    </ng-container>
    `,
    styles: [`
        .cla-panel { display: grid; gap: 14px; padding: 18px; border-radius: 18px; border: 1px solid var(--color-component-border-200); background: #fff; }
        .cla-panel__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
        .cla-panel__eyebrow { margin: 0 0 4px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--color-grey-600); }
        .cla-panel h3 { margin: 0; font-size: 21px; }
        .cla-panel__copy { margin: 0; color: var(--color-grey-700); line-height: 1.5; }
        .cla-status-pill { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .cla-tone-neutral { background: var(--color-grey-100); color: var(--color-grey-700); }
        .cla-tone-info { background: var(--color-primary-100); color: var(--color-primary-700); }
        .cla-tone-success { background: var(--color-success-150); color: var(--color-success-700); }
        .cla-tone-warning { background: var(--color-warning-150); color: var(--color-warning-700); }
        .cla-tone-danger { background: var(--color-error-150); color: var(--color-error-700); }
        .cla-alert { padding: 12px 14px; border-radius: 12px; font-size: 14px; line-height: 1.45; }
        .cla-alert--warning { background: var(--color-warning-150); color: var(--color-warning-700); }
        .cla-empty { padding: 16px; border-radius: 14px; background: var(--color-grey-100); color: var(--color-grey-700); }
        .cla-line-list { display: grid; gap: 14px; }
        .cla-line-card { display: grid; gap: 12px; padding: 16px; border-radius: 16px; border: 1px solid var(--color-component-border-200); background: #fff; }
        .cla-line-card__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
        .cla-line-card__header h4 { margin: 0; font-size: 17px; }
        .cla-line-card__header p { margin: 4px 0 0; color: var(--color-grey-700); font-size: 13px; }
        .cla-line-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; }
        .cla-preview { display: flex; align-items: center; justify-content: center; min-height: 220px; border-radius: 14px; background: var(--color-grey-100); border: 1px dashed var(--color-component-border-300); color: var(--color-grey-700); text-align: center; padding: 16px; }
        .cla-preview--empty { font-size: 14px; line-height: 1.45; }
        .cla-preview__image { width: 100%; height: 220px; object-fit: cover; border-radius: 12px; }
        .cla-line-meta { display: grid; gap: 10px; }
        .cla-detail-row { display: flex; justify-content: space-between; gap: 12px; padding-top: 8px; border-top: 1px solid var(--color-component-border-200); color: var(--color-grey-700); }
        .cla-detail-row strong { text-align: right; }
        .cla-notes { padding: 12px 14px; border-radius: 12px; background: var(--color-primary-100); }
        .cla-notes__label { display: block; margin-bottom: 4px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--color-grey-700); }
        .cla-notes p { margin: 0; line-height: 1.45; }
        .cla-link-row a { color: var(--color-primary-700); font-weight: 700; text-decoration: none; }
        .cla-link-row a:hover { text-decoration: underline; }
        @media (max-width: 840px) {
            .cla-panel__header, .cla-line-card__header { flex-direction: column; }
            .cla-line-grid { grid-template-columns: 1fr; }
        }
    `],
})
export class OrderPersonalizationPanelComponent implements CustomDetailComponent, OnInit {
    entity$!: Observable<any>;
    detailForm: any;

    vm$!: Observable<PersonalizationViewModel>;

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.vm$ = this.entity$.pipe(
            switchMap((entity: { id: string | number }) =>
                this.dataService.query(ORDER_PERSONALIZATION_QUERY, { id: entity.id }).mapSingle(
                    (data: any) => buildPersonalizationViewModel(data.order),
                ),
            ),
        );
    }

    requiredLines(vm: PersonalizationViewModel): PersonalizationLineView[] {
        return vm.lines.filter((line) => line.requiresPersonalization);
    }

    getToneClass = getToneClass;
    getPersonalizationLineStatusLabel = getPersonalizationLineStatusLabel;
    getPersonalizationLineStatusTone = getPersonalizationLineStatusTone;
}
