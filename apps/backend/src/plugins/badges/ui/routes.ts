import { Route } from '@angular/router';
import { BadgeListComponent } from './components/badge-list/badge-list.component';
import { BadgeDetailComponent } from './components/badge-detail/badge-detail.component';

export const badgesRoutes: Route[] = [
    {
        path: '',
        pathMatch: 'full',
        component: BadgeListComponent,
    },
    {
        path: 'create',
        component: BadgeDetailComponent,
    },
    {
        path: ':id',
        component: BadgeDetailComponent,
    },
];
