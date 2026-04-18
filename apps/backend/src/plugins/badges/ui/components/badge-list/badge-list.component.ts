import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, ModalService, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface BadgeItem {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
    priority: number;
    expiresAt: string | null;
    backgroundColor: string | null;
    textColor: string | null;
    featuredAsset: { id: string; preview: string } | null;
}

const GET_BADGES = gql`
    query GetBadgeList {
        badges(options: { sort: { priority: ASC } }) {
            items {
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
                    preview
                }
            }
            totalItems
        }
    }
`;

const DELETE_BADGE = gql`
    mutation DeleteBadge($id: ID!) {
        deleteBadge(id: $id) {
            result
            message
        }
    }
`;

const TOGGLE_BADGE_ENABLED = gql`
    mutation ToggleBadgeEnabled($id: ID!, $enabled: Boolean!) {
        updateBadge(input: { id: $id, enabled: $enabled }) {
            id
            enabled
        }
    }
`;

@Component({
    selector: 'badge-list',
    templateUrl: './badge-list.component.html',
})
export class BadgeListComponent implements OnInit, OnDestroy {
    badges: BadgeItem[] = [];
    totalItems = 0;
    loading = false;

    private destroy$ = new Subject<void>();

    constructor(
        private dataService: DataService,
        private notificationService: NotificationService,
        private modalService: ModalService,
        private router: Router,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.loadBadges();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadBadges(): void {
        this.loading = true;
        this.dataService
            .query(GET_BADGES)
            .mapStream((data: any) => data.badges)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (result: any) => {
                    this.badges = result.items;
                    this.totalItems = result.totalItems;
                    this.loading = false;
                },
                error: () => {
                    this.notificationService.error('No se pudo cargar la lista de badges');
                    this.loading = false;
                },
            });
    }

    navigateToCreate(): void {
        this.router.navigate(['./create'], { relativeTo: this.route });
    }

    navigateToEdit(id: string): void {
        this.router.navigate(['./', id], { relativeTo: this.route });
    }

    toggleEnabled(badge: BadgeItem): void {
        const nextEnabled = !badge.enabled;
        this.dataService
            .mutate(TOGGLE_BADGE_ENABLED, { id: badge.id, enabled: nextEnabled })
            .subscribe({
                next: () => {
                    badge.enabled = nextEnabled;
                    this.notificationService.success(
                        nextEnabled ? 'Badge activado' : 'Badge desactivado',
                    );
                },
                error: () => {
                    this.notificationService.error('No se pudo actualizar el badge');
                },
            });
    }

    deleteBadge(badge: BadgeItem): void {
        this.modalService
            .dialog({
                title: `Eliminar badge "${badge.name}"`,
                body: 'Esta acción no se puede deshacer. Los productos que tengan este badge asignado lo perderán automáticamente.',
                buttons: [
                    { type: 'secondary', label: 'Cancelar' },
                    { type: 'danger', label: 'Eliminar', returnValue: true },
                ],
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.dataService.mutate(DELETE_BADGE, { id: badge.id }).subscribe({
                    next: (data: any) => {
                        const res = data.deleteBadge;
                        if (res.result === 'DELETED') {
                            this.notificationService.success('Badge eliminado');
                            this.badges = this.badges.filter((b) => b.id !== badge.id);
                            this.totalItems -= 1;
                        } else {
                            this.notificationService.error(
                                res.message || 'No se pudo eliminar el badge',
                            );
                        }
                    },
                    error: () => {
                        this.notificationService.error('Error al eliminar el badge');
                    },
                });
            });
    }

    isExpired(expiresAt: string | null): boolean {
        if (!expiresAt) {
            return false;
        }
        return new Date(expiresAt).getTime() < Date.now();
    }
}
