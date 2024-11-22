import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./home/home.component').then((m) => m.HomeComponent),
    },
    {
        path: 'todos',
        loadComponent: () =>
            import('./todos/todos.component').then((m) => m.TodosComponent),
    },
    { 
        path: 'local-game',
        loadComponent: () =>
            import('./local-game/local-game.component').then(
                (m) => m.LocalGameComponent
            ),
    },

];
