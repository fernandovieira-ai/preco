import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { NegociacaoProdutosPistaPage } from "./negociacao-produtos-pista.page";

const routes: Routes = [
  {
    path: "",
    component: NegociacaoProdutosPistaPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NegociacaoProdutosPistaPageRoutingModule {}
