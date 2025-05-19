import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KitchenDashboardComponent } from './kitchen/kitchen-dashboard/kitchen-dashboard.component';

const routes: Routes = [
  { path: '', component: KitchenDashboardComponent },  // ruta raíz
  // otras rutas si tienes...
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
