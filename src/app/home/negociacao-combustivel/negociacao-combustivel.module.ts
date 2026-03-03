import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NegociacaoCombustivelPageRoutingModule } from './negociacao-combustivel-routing.module';

import { NegociacaoCombustivelPage } from './negociacao-combustivel.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NegociacaoCombustivelPageRoutingModule
  ],
  declarations: [NegociacaoCombustivelPage]
})
export class NegociacaoCombustivelPageModule {}
