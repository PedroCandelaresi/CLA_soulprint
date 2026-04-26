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

                    <div class="cla-side-list">
                        <div class="cla-side-card" *ngFor="let side of line.sides">
                            <div class="cla-side-card__header">
                                <strong>{{ side.label }}</strong>
                                <span class="cla-side-mode">{{ side.mode === 'text' ? 'Frase' : (side.mode === 'image' ? 'Archivo' : 'Sin dorso') }}</span>
                            </div>

                            <div class="cla-side-grid" *ngIf="side.mode === 'image'; else textPersonalization">
                                <div class="cla-preview" *ngIf="side.assetPreview; else noPreview">
                                    <a
                                        [href]="side.assetSource || side.assetPreview"
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        data-cla-tip="Abrir el archivo del cliente en una pestaña nueva."
                                    >
                                        <img
                                            [src]="side.assetPreview"
                                            [alt]="side.snapshotFileName || line.productName"
                                            class="cla-preview__image">
                                    </a>
                                </div>
                                <ng-template #noPreview>
                                    <div class="cla-preview cla-preview--empty">
                                        <span *ngIf="side.assetSource; else noAssetText">Hay archivo, pero sin miniatura</span>
                                        <ng-template #noAssetText>El cliente todavía no cargó un archivo para {{ side.label | lowercase }}.</ng-template>
                                    </div>
                                </ng-template>

                                <div class="cla-line-meta">
                                    <div class="cla-detail-row">
                                        <span>Archivo</span>
                                        <strong>{{ side.snapshotFileName || 'Sin archivo todavía' }}</strong>
                                    </div>
                                    <div class="cla-detail-row" *ngIf="side.uploadedAt">
                                        <span>Subido el</span>
                                        <strong>{{ side.uploadedAt | date:'dd/MM/yyyy HH:mm' }}</strong>
                                    </div>
                                    <div class="cla-detail-row" *ngIf="side.assetMimeType">
                                        <span>Tipo</span>
                                        <strong>{{ side.assetMimeType }}</strong>
                                    </div>
                                    <div class="cla-link-row" *ngIf="side.assetSource">
                                        <a
                                            [href]="side.assetSource"
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            data-cla-tip="Abrir el archivo del cliente en una pestaña nueva."
                                        >
                                            Abrir archivo completo
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <ng-template #textPersonalization>
                                <div class="cla-text-box" *ngIf="side.text; else noText">
                                    <span class="cla-notes__label">Frase del cliente</span>
                                    <p>{{ side.text }}</p>
                                </div>
                                <ng-template #noText>
                                    <div class="cla-preview cla-preview--empty">
                                        El cliente todavía no cargó una frase para {{ side.label | lowercase }}.
                                    </div>
                                </ng-template>
                            </ng-template>
                        </div>
                    </div>

                    <div class="cla-notes" *ngIf="line.personalizationNotes">
                        <span class="cla-notes__label">Indicaciones del cliente</span>
                        <p>{{ line.personalizationNotes }}</p>
                    </div>
                </article>
            </div>
        </section>
    </ng-container>
    `,
    styles: [`
        .cla-panel { display: grid; gap: 16px; padding: 22px; border-radius: 24px; border: 1px solid var(--cla-border); background: linear-gradient(180deg, rgba(255, 253, 248, 0.96), rgba(255, 255, 255, 0.98)); box-shadow: var(--cla-shadow-sm); }
        .cla-panel__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
        .cla-panel__eyebrow { margin: 0 0 6px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--cla-muted); }
        .cla-panel h3 { margin: 0; font-size: 22px; color: var(--cla-green-dk); }
        .cla-panel__copy { margin: 0; color: var(--cla-ink-soft); line-height: 1.6; }
        .cla-status-pill { display: inline-flex; align-items: center; justify-content: center; padding: 7px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; border: 1px solid transparent; }
        .cla-tone-neutral { background: rgba(23, 52, 40, 0.08); color: var(--cla-ink-soft); border-color: rgba(23, 52, 40, 0.10); }
        .cla-tone-info { background: rgba(199, 164, 107, 0.16); color: #7a5a1d; border-color: rgba(199, 164, 107, 0.22); }
        .cla-tone-success { background: rgba(0, 72, 37, 0.12); color: var(--cla-green-dk); border-color: rgba(0, 72, 37, 0.14); }
        .cla-tone-warning { background: rgba(199, 164, 107, 0.18); color: #7a5a1d; border-color: rgba(199, 164, 107, 0.24); }
        .cla-tone-danger { background: rgba(158, 42, 42, 0.12); color: #7a1e1e; border-color: rgba(158, 42, 42, 0.18); }
        .cla-alert { padding: 14px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; border: 1px solid transparent; }
        .cla-alert--warning { background: linear-gradient(135deg, rgba(199, 164, 107, 0.18), rgba(244, 234, 213, 0.72)); color: #73561d; border-color: rgba(199, 164, 107, 0.24); }
        .cla-empty { padding: 16px; border-radius: 16px; background: linear-gradient(180deg, rgba(249, 245, 237, 0.92), rgba(255, 255, 255, 0.98)); color: var(--cla-ink-soft); border: 1px dashed var(--cla-border-strong); }
        .cla-line-list { display: grid; gap: 14px; }
        .cla-line-card { display: grid; gap: 14px; padding: 18px; border-radius: 20px; border: 1px solid var(--cla-border); background: linear-gradient(180deg, rgba(255, 253, 248, 0.96), rgba(255, 255, 255, 0.98)); box-shadow: 0 16px 32px rgba(2, 44, 24, 0.08); }
        .cla-line-card__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
        .cla-line-card__header h4 { margin: 0; font-size: 17px; color: var(--cla-green-dk); }
        .cla-line-card__header p { margin: 4px 0 0; color: var(--cla-muted); font-size: 13px; }
        .cla-side-list { display: grid; gap: 14px; }
        .cla-side-card { display: grid; gap: 12px; padding: 14px; border-radius: 16px; background: rgba(249, 245, 237, 0.58); border: 1px solid var(--cla-border); }
        .cla-side-card__header { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: var(--cla-green-dk); }
        .cla-side-mode { display: inline-flex; align-items: center; padding: 5px 10px; border-radius: 999px; background: rgba(0, 72, 37, 0.08); color: var(--cla-ink-soft); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .cla-side-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; }
        .cla-preview { display: flex; align-items: center; justify-content: center; min-height: 220px; border-radius: 18px; background: linear-gradient(180deg, rgba(249, 245, 237, 0.92), rgba(255, 255, 255, 0.98)); border: 1px dashed rgba(0, 72, 37, 0.16); color: var(--cla-ink-soft); text-align: center; padding: 16px; }
        .cla-preview a { display: block; width: 100%; }
        .cla-preview--empty { font-size: 14px; line-height: 1.5; }
        .cla-preview__image { width: 100%; height: 220px; object-fit: cover; border-radius: 14px; border: 1px solid var(--cla-border); box-shadow: 0 10px 22px rgba(2, 44, 24, 0.08); }
        .cla-line-meta { display: grid; gap: 10px; }
        .cla-detail-row { display: flex; justify-content: space-between; gap: 12px; padding-top: 10px; border-top: 1px solid var(--cla-border); color: var(--cla-ink-soft); }
        .cla-detail-row strong { text-align: right; color: var(--cla-green-dk); }
        .cla-notes { padding: 12px 14px; border-radius: 14px; background: rgba(199, 164, 107, 0.12); border: 1px solid rgba(199, 164, 107, 0.18); }
        .cla-notes__label { display: block; margin-bottom: 4px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--cla-muted); }
        .cla-notes p { margin: 0; line-height: 1.5; color: var(--cla-ink-soft); }
        .cla-text-box { padding: 14px 16px; border-radius: 14px; background: rgba(255, 255, 255, 0.84); border: 1px solid var(--cla-border); }
        .cla-text-box p { margin: 0; white-space: pre-wrap; line-height: 1.55; color: var(--cla-green-dk); font-weight: 600; }
        .cla-link-row a { color: var(--cla-green); font-weight: 700; text-decoration: none; }
        .cla-link-row a:hover { color: var(--cla-green-lt); text-decoration: underline; }
        @media (max-width: 840px) {
            .cla-panel__header, .cla-line-card__header { flex-direction: column; }
            .cla-side-grid { grid-template-columns: 1fr; }
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
