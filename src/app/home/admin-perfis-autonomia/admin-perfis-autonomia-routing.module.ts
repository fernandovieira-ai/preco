import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { AdminPerfisAutonomiaPage } from "./admin-perfis-autonomia.page";

const routes: Routes = [
  {
    path: "",
    component: AdminPerfisAutonomiaPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminPerfisAutonomiaPageRoutingModule {}
