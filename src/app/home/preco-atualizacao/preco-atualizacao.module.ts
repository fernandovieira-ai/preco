import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PrecoAtualizacaoPageRoutingModule } from './preco-atualizacao-routing.module';

import { PrecoAtualizacaoPage } from './preco-atualizacao.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PrecoAtualizacaoPageRoutingModule
  ],
  declarations: [PrecoAtualizacaoPage]
})
export class PrecoAtualizacaoPageModule {}
