import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./home/home.component').then((m) => m.HomeComponent),
    },
    {
        path: 'home',
        redirectTo: '',
        pathMatch: 'full',
    },
    {
        path: 'auth',
        loadComponent: () =>
            import('./auth/auth.component').then((m) => m.AuthComponent),
    },
    {
        path: 'room/:id',
        loadComponent: () =>
            import('./room/room.component').then((m) => m.RoomComponent),
    },
    {
        path: 'local-game',
        loadComponent: () =>
            import('./local-game/local-game.component').then(
                (m) => m.LocalGameComponent
            ),
    },
    {
        path: 'learn-more',
        loadComponent: () =>
            import('./learn-more/learn-more.component').then(
                (m) => m.LearnMoreComponent
            ),
    },

    {
        path: 'shop',
        loadComponent: () =>
            import('./shop/shop.component').then(
                (m) => m.ShopComponent
            ),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [authGuard],
    },
    {
        path: 'game-hub',
        loadComponent: () =>
            import('./game-hub/game-hub.component').then((m) => m.GameHubComponent),
        canActivate: [authGuard],
    },

    {
        path: 'feline-forum',
        loadComponent: () =>
           import('./feline-forum/feline-forum.component').then((m) => m.FelineForumComponent),
        canActivate: [authGuard],
    },

 


];
