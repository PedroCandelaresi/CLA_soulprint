import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, ModalService, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface CarouselSlideItem {
    id: string;
    title: string;
    subtitle: string | null;
    isActive: boolean;
    sortOrder: number;
    layout: string;
    badgeText: string | null;
    desktopAsset: { id: string; preview: string } | null;
}

const GET_SLIDES = gql`
    query GetHomeCarouselSlides {
        homeCarouselSlides(options: { sort: { sortOrder: ASC }, take: 200 }) {
            items {
                id
                title
                subtitle
                isActive
                sortOrder
                layout
                badgeText
                desktopAsset {
                    id
                    preview
                }
            }
            totalItems
        }
    }
`;

const TOGGLE_ACTIVE = gql`
    mutation ToggleHomeCarouselSlideActive($id: ID!, $isActive: Boolean!) {
        updateHomeCarouselSlide(input: { id: $id, isActive: $isActive }) {
            id
            isActive
        }
    }
`;

const DELETE_SLIDE = gql`
    mutation DeleteHomeCarouselSlide($id: ID!) {
        deleteHomeCarouselSlide(id: $id) {
            result
            message
        }
    }
`;

const REORDER_SLIDES = gql`
    mutation ReorderHomeCarouselSlides($orderedIds: [ID!]!) {
        reorderHomeCarouselSlides(orderedIds: $orderedIds) {
            id
            sortOrder
        }
    }
`;

@Component({
    selector: 'home-carousel-list',
    templateUrl: './home-carousel-list.component.html',
})
export class HomeCarouselListComponent implements OnInit, OnDestroy {
    slides: CarouselSlideItem[] = [];
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
        this.load();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    load(): void {
        this.loading = true;
        this.dataService
            .query(GET_SLIDES)
            .mapStream((data: any) => data.homeCarouselSlides)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (result: any) => {
                    this.slides = result.items;
                    this.totalItems = result.totalItems;
                    this.loading = false;
                },
                error: () => {
                    this.notificationService.error('No se pudieron cargar los slides');
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

    navigateToSettings(): void {
        this.router.navigate(['./settings'], { relativeTo: this.route });
    }

    toggleActive(slide: CarouselSlideItem): void {
        const next = !slide.isActive;
        this.dataService.mutate(TOGGLE_ACTIVE, { id: slide.id, isActive: next }).subscribe({
            next: () => {
                slide.isActive = next;
                this.notificationService.success(next ? 'Slide activado' : 'Slide desactivado');
            },
            error: () => this.notificationService.error('No se pudo actualizar el slide'),
        });
    }

    move(slide: CarouselSlideItem, direction: -1 | 1): void {
        const index = this.slides.indexOf(slide);
        const target = index + direction;
        if (target < 0 || target >= this.slides.length) {
            return;
        }
        const reordered = [...this.slides];
        reordered.splice(index, 1);
        reordered.splice(target, 0, slide);
        this.slides = reordered;
        const orderedIds = reordered.map((s) => s.id);
        this.dataService.mutate(REORDER_SLIDES, { orderedIds }).subscribe({
            next: () => this.load(),
            error: () => {
                this.notificationService.error('No se pudo reordenar');
                this.load();
            },
        });
    }

    deleteSlide(slide: CarouselSlideItem): void {
        this.modalService
            .dialog({
                title: `Eliminar slide "${slide.title}"`,
                body: 'Esta acción no se puede deshacer.',
                buttons: [
                    { type: 'secondary', label: 'Cancelar' },
                    { type: 'danger', label: 'Eliminar', returnValue: true },
                ],
            })
            .subscribe((confirmed) => {
                if (!confirmed) return;
                this.dataService.mutate(DELETE_SLIDE, { id: slide.id }).subscribe({
                    next: (data: any) => {
                        const res = data.deleteHomeCarouselSlide;
                        if (res.result === 'DELETED') {
                            this.notificationService.success('Slide eliminado');
                            this.slides = this.slides.filter((s) => s.id !== slide.id);
                            this.totalItems -= 1;
                        } else {
                            this.notificationService.error(res.message || 'No se pudo eliminar');
                        }
                    },
                    error: () => this.notificationService.error('Error al eliminar'),
                });
            });
    }
}
