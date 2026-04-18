import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@vendure/admin-ui/core';
import { badgesRoutes } from './routes';
import { BadgeListComponent } from './components/badge-list/badge-list.component';
import { BadgeDetailComponent } from './components/badge-detail/badge-detail.component';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild(badgesRoutes),
    ],
    declarations: [
        BadgeListComponent,
        BadgeDetailComponent,
    ],
})
export class BadgesModule {}
