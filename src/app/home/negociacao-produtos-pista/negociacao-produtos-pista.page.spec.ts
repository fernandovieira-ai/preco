import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NegociacaoProdutosPistaPage } from "./negociacao-produtos-pista.page";

describe("NegociacaoProdutosPistaPage", () => {
  let component: NegociacaoProdutosPistaPage;
  let fixture: ComponentFixture<NegociacaoProdutosPistaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NegociacaoProdutosPistaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
