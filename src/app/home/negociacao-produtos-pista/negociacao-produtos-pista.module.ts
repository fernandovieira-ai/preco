import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { NegociacaoProdutosPistaPageRoutingModule } from "./negociacao-produtos-pista-routing.module";

import { NegociacaoProdutosPistaPage } from "./negociacao-produtos-pista.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NegociacaoProdutosPistaPageRoutingModule,
  ],
  declarations: [NegociacaoProdutosPistaPage],
})
export class NegociacaoProdutosPistaPageModule {}
