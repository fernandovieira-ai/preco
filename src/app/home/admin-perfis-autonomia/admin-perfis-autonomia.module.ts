import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { AdminPerfisAutonomiaPageRoutingModule } from "./admin-perfis-autonomia-routing.module";

import { AdminPerfisAutonomiaPage } from "./admin-perfis-autonomia.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminPerfisAutonomiaPageRoutingModule,
  ],
  declarations: [AdminPerfisAutonomiaPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminPerfisAutonomiaPageModule {}
