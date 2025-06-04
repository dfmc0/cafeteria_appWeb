import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KitchenDashboardComponent } from './kitchen/kitchen-dashboard/kitchen-dashboard.component';

const routes: Routes = [
  { path: '', component: KitchenDashboardComponent }, // Ruta por defecto
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
