import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@vendure/admin-ui/core';
import { homeCarouselRoutes } from './routes';
import { HomeCarouselListComponent } from './components/home-carousel-list/home-carousel-list.component';
import { HomeCarouselDetailComponent } from './components/home-carousel-detail/home-carousel-detail.component';
import { HomeCarouselSettingsComponent } from './components/home-carousel-settings/home-carousel-settings.component';

@NgModule({
    imports: [SharedModule, RouterModule.forChild(homeCarouselRoutes)],
    declarations: [
        HomeCarouselListComponent,
        HomeCarouselDetailComponent,
        HomeCarouselSettingsComponent,
    ],
})
export class HomeCarouselModule {}
