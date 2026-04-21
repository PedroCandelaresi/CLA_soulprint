import { Route } from '@angular/router';
import { HomeCarouselListComponent } from './components/home-carousel-list/home-carousel-list.component';
import { HomeCarouselDetailComponent } from './components/home-carousel-detail/home-carousel-detail.component';
import { HomeCarouselSettingsComponent } from './components/home-carousel-settings/home-carousel-settings.component';

export const homeCarouselRoutes: Route[] = [
    { path: '', pathMatch: 'full', component: HomeCarouselListComponent },
    { path: 'settings', component: HomeCarouselSettingsComponent },
    { path: 'create', component: HomeCarouselDetailComponent },
    { path: ':id', component: HomeCarouselDetailComponent },
];
