import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { LoadingController } from "@ionic/angular";
import {
  tap,
  timeout,
  catchError,
  finalize,
  Subject,
  Subscription,
} from "rxjs";
import { Alert } from "src/app/class/alert";
import { minhasNegociacoesDetalhe } from "src/app/class/user";
import { AuthService } from "src/app/services/auth.service";
import { MovimentoService } from "src/app/services/movimento.service";
import { WebsocketService } from "src/app/services/websocket.service";

@Component({
  selector: "app-historico-detalhe",
  templateUrl: "./historico-detalhe.page.html",
  styleUrls: ["./historico-detalhe.page.scss"],
  standalone: false,
})
export class HistoricoDetalhePage implements OnInit {
  subscription: Subscription = new Subscription();
  refresh = new Subject<void>();

  public detalhesNegociacao: minhasNegociacoesDetalhe[] = [];
  id = 0;
  empresa = 0;
  ind_excluido = null;
  ind_aprovacao = null;

  constructor(
    private route: ActivatedRoute,
    public socket: WebsocketService,
    public auth: AuthService,
    private loadingCtrl: LoadingController,
    private movimento: MovimentoService,
    private alert: Alert,
    public router: Router,
  ) {}

  ngOnInit() {
    this.showLoading("Buscando Registros...", 50000);

    this.route.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.empresa = params["empresa"];
      this.ind_excluido = params["ind_excluido"];
      this.ind_aprovacao = params["ind_aprovacao"];

      this.movimento
        .buscaMinhasNegociacoesDetalhe(
          this.auth.userLogado.schema,
          this.auth.userLogado.cod_usuario,
          this.empresa,
          this.id,
          this.ind_aprovacao,
        )
        .pipe(
          tap((data) => {
            console.log('Dados recebidos da API:', data);
            this.detalhesNegociacao = data.message.map((item, index) => {
              // Log para debug de cada item
              console.log(`Item ${index}:`, {
                nom_pessoa: item.nom_pessoa,
                val_preco_venda: item.val_preco_venda,
                val_custo_medio: item.val_custo_medio,
                val_preco_venda_a: item.val_preco_venda_a,
                val_preco_venda_b: item.val_preco_venda_b,
                val_preco_venda_c: item.val_preco_venda_c,
                val_preco_venda_d: item.val_preco_venda_d,
                val_preco_venda_e: item.val_preco_venda_e,
                ind_tipo_negociacao: item.ind_tipo_negociacao,
                ind_percentual_valor: item.ind_percentual_valor,
              });

              const novoPreco = this.calcularNovoPreco(item);

              console.log(`Item ${index} - Preço calculado:`, novoPreco);

              return {
                ...item,
                valor_calculado: novoPreco,
                margem: this.calculaMargem(novoPreco, item.val_custo_medio),
                margem_valor: this.calculaMargemValor(
                  novoPreco,
                  item.val_custo_medio,
                ),
                percentual_alteracao: this.calculaPercentualAlteracao(
                  item.val_preco_venda,
                  novoPreco,
                ),
                texto_alteracao: this.getTextoAlteracao(item, novoPreco),
              };
            });

            console.log('Detalhes processados:', this.detalhesNegociacao);
          }),
          timeout(51000),
          catchError((err) => {
            this.handleError(err);
            throw err;
          }),
          finalize(() => {
            this.loadingCtrl.dismiss().catch(() => {});
          }),
        )
        .subscribe(() => {});
    });
  }

  aprovarRegra() {
    this.alert
      .presentAlertConfirm(
        "ATENÇÃO",
        "Este procedimento envia as regras para o EMSys3",
        "Deseja Continuar ?",
      )
      .then((data) => {
        if (data === "sim") {
          this.showLoading("Aprovando Negociação...", 50000);

          this.movimento
            .aprovaRegra(
              this.auth.userLogado.schema,
              this.empresa,
              this.auth.userLogado.nom_usuario,
              this.id,
            )
            .pipe(
              tap((data) => {
                this.alert.presentToast(data.message, 3000);
              }),
              timeout(51000),
              catchError((err) => {
                this.handleError(err);
                throw err;
              }),
              finalize(() => {
                this.loadingCtrl.dismiss().catch(() => {});
              }),
            )
            .subscribe(() => {
              setTimeout(() => {
                this.router.navigate(["/home/historico/historico-detalhe"]);
                this.socket.setAtualiacaoTarefas(
                  [{ cod_usuario: this.auth.userLogado.nom_usuario }],
                  "trocaPreco",
                );
                this.refresh = new Subject<void>();
              }, 1000);
            });
        }
      });
  }

  excluirRegra() {
    this.alert
      .presentAlertConfirm(
        "Excluir Lote de Registros",
        "",
        "Deseja realmente continuar com esta operação ?",
      )
      .then((data) => {
        if (data == "sim") {
          this.movimento
            .excluirNegociacao(
              this.auth.userLogado.schema,
              this.auth.userLogado.cod_usuario,
              this.empresa,
              this.id,
            )
            .pipe(
              tap((data) => {
                this.alert.presentToast(data.message, 3000);
              }),
              timeout(51000),
              catchError((err) => {
                this.loadingCtrl.dismiss();
                this.handleError(err);
                throw err;
              }),
            )
            .subscribe(() => {
              this.router.navigate(["/home"]);
            });
        }
      });
  }

  async showLoading(message, duration) {
    const loading = await this.loadingCtrl.create({
      message: message,
      duration: duration,
    });
    loading.present();
  }

  private handleError(error: any) {
    if (error.name === "TimeoutError") {
      this.alert.presentToast(
        "Tempo de retorno da solicitação atingido, tente novamente",
        3000,
      );
    } else {
      this.alert.presentToast(
        "Tempo de retorno da solicitação atingido, tente novamente",
        3000,
      );
    }
  }

  voltar() {
    this.router.navigate(["/home/aprovacao-negociacao"]);
  }

  calcularNovoPreco(item: minhasNegociacoesDetalhe): number {
    // Validar se o preço atual existe
    const precoAtual = item.val_preco_venda ?? 0;

    // Buscar o valor informado (o primeiro que não for null/undefined/0)
    const valorInformado =
      item.val_preco_venda_a ??
      item.val_preco_venda_b ??
      item.val_preco_venda_c ??
      item.val_preco_venda_d ??
      item.val_preco_venda_e ??
      0;

    console.log('calcularNovoPreco:', {
      precoAtual,
      valorInformado,
      ind_tipo_negociacao: item.ind_tipo_negociacao,
      ind_percentual_valor: item.ind_percentual_valor,
    });

    // Preço Fixo: retorna o valor informado ou o preço atual
    if (item.ind_tipo_negociacao === "P") {
      return valorInformado > 0 ? valorInformado : precoAtual;
    }

    // Acréscimo ou Desconto
    if (item.ind_tipo_negociacao === "A" || item.ind_tipo_negociacao === "D") {
      const sinal = item.ind_tipo_negociacao === "A" ? 1 : -1;

      if (item.ind_percentual_valor === "P") {
        // Percentual: calcular em cima do preço atual
        const resultado = precoAtual + ((precoAtual * valorInformado) / 100) * sinal;
        console.log('Cálculo percentual:', { precoAtual, valorInformado, sinal, resultado });
        return resultado;
      } else {
        // Valor: somar ou subtrair o valor fixo
        const resultado = precoAtual + valorInformado * sinal;
        console.log('Cálculo valor:', { precoAtual, valorInformado, sinal, resultado });
        return resultado;
      }
    }

    console.log('Tipo de negociação não reconhecido, retornando preço atual:', precoAtual);
    return precoAtual;
  }

  getTextoAlteracao(item: minhasNegociacoesDetalhe, novoPreco: number): string {
    const valorInformado =
      item.val_preco_venda_a ??
      item.val_preco_venda_b ??
      item.val_preco_venda_c ??
      item.val_preco_venda_d ??
      item.val_preco_venda_e ??
      0;

    const precoAtual = item.val_preco_venda ?? 0;
    const novoPrecoValidado = novoPreco ?? 0;

    // Preço Fixo: mostrar variação em R$
    if (item.ind_tipo_negociacao === "P") {
      const variacao = novoPrecoValidado - precoAtual;
      return `${variacao > 0 ? "+" : ""}R$ ${variacao.toFixed(2)}`;
    }

    // Acréscimo ou Desconto
    if (item.ind_tipo_negociacao === "A" || item.ind_tipo_negociacao === "D") {
      const sinal = item.ind_tipo_negociacao === "A" ? "+" : "-";

      if (item.ind_percentual_valor === "P") {
        // Mostrar percentual informado
        return `${sinal}${valorInformado.toFixed(2)}%`;
      } else {
        // Mostrar valor em R$ informado
        return `${sinal}R$ ${valorInformado.toFixed(2)}`;
      }
    }

    return "R$ 0.00";
  }

  calculaMargem(precoVenda: number, custo: number): number {
    // Validar se os valores são válidos
    const precoValidado = precoVenda ?? 0;
    const custoValidado = custo ?? 0;

    if (custoValidado === 0 || precoValidado === 0) {
      return 0;
    }

    return ((precoValidado - custoValidado) / precoValidado) * 100;
  }

  calculaMargemValor(precoVenda: number, custo: number): number {
    const precoValidado = precoVenda ?? 0;
    const custoValidado = custo ?? 0;

    return precoValidado - custoValidado;
  }

  calculaPercentualAlteracao(precoAtual: number, precoNovo: number): number {
    const atualValidado = precoAtual ?? 0;
    const novoValidado = precoNovo ?? 0;

    if (atualValidado === 0) {
      return 0;
    }

    return ((novoValidado - atualValidado) / atualValidado) * 100;
  }
}
