import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NegociacaoCombustivelPage } from './negociacao-combustivel.page';

describe('NegociacaoCombustivelPage', () => {
  let component: NegociacaoCombustivelPage;
  let fixture: ComponentFixture<NegociacaoCombustivelPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(NegociacaoCombustivelPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
