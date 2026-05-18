import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { LoadingController } from "@ionic/angular";
import {
  tap,
  timeout,
  catchError,
  finalize,
  debounceTime,
  distinctUntilChanged,
  Subscription,
  Subject,
} from "rxjs";
import { Alert } from "src/app/class/alert";
import { minhasNegociacoes } from "src/app/class/user";
import { AuthService } from "src/app/services/auth.service";
import { MovimentoService } from "src/app/services/movimento.service";
import { WebsocketService } from "src/app/services/websocket.service";

@Component({
  selector: "app-aprovacao-negociacao",
  templateUrl: "./aprovacao-negociacao.page.html",
  styleUrls: ["./aprovacao-negociacao.page.scss"],
  standalone: false,
})
export class AprovacaoNegociacaoPage implements OnInit, OnDestroy {
  public negociacoesEmpresa: minhasNegociacoes[] = [];
  public lotesAgrupados: any[] = []; // Negociações agrupadas por lote
  public progress;
  subscription: Subscription = new Subscription();
  refresh = new Subject<void>();

  // Feedback de aprovação/reprovação
  feedbackMensagem: string = '';
  feedbackTipo: 'sucesso' | 'erro' | '' = '';
  mostrarFeedback: boolean = false;

  constructor(
    public auth: AuthService,
    public socket: WebsocketService,
    private loadingCtrl: LoadingController,
    public movimento: MovimentoService,
    private alert: Alert,
    public router: Router,
  ) {}

  ngOnInit() {
    this.socket.usuarioApp(this.auth.userLogado.nom_usuario, "trocaPreco");

    this.subscription = this.socket
      .getAtualizacaoTarefas()
      .pipe(
        debounceTime(100),
        distinctUntilChanged(),
        tap(() => {
          this.buscaNegociacoesEmpresa();
          this.socket.observableExecutado = 1;
        }),
        catchError((err) => {
          console.error("Erro do observable:", err);
          this.alert.presentToast(err.error.message, 4000);
          throw err;
        }),
      )
      .subscribe();

    if (this.socket.observableExecutado == 0) {
      this.buscaNegociacoesEmpresaStart();
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.socket.socketExitApp(
        [{ cod_usuario: this.auth.userLogado.nom_usuario }],
        "trocaPreco",
      );
    }
  }

  buscaNegociacoesEmpresa() {
    this.showLoading("Buscando Registros...", 50000);

    this.movimento
      .buscaNegociacoesEmpresa(
        this.auth.userLogado.schema,
        this.auth.userLogado.cod_empresa_sel,
      )
      .pipe(
        tap((data) => {
          this.negociacoesEmpresa = data.message;
          this.agruparNegociacoesPorLote();
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
        this.socket.executouBuscaTarefas = 1;
      });
  }

  buscaNegociacoesEmpresaStart() {
    this.showLoading("Buscando Registros...", 50000);

    this.movimento
      .buscaNegociacoesEmpresa(
        this.auth.userLogado.schema,
        this.auth.userLogado.cod_empresa_sel,
      )
      .pipe(
        tap((data) => {
          this.negociacoesEmpresa = data.message;
          this.agruparNegociacoesPorLote();
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
        this.socket.executouBuscaTarefas = 1;
      });
  }

  // Agrupar negociações por lote
  agruparNegociacoesPorLote() {
    const lotesMap = new Map<number, any>();

    this.negociacoesEmpresa.forEach((negociacao) => {
      const loteKey = negociacao.seq_lote_alteracao;

      if (!lotesMap.has(loteKey)) {
        lotesMap.set(loteKey, {
          seq_lote_alteracao: negociacao.seq_lote_alteracao,
          des_observacao: negociacao.des_observacao,
          dta_inclusao: negociacao.dta_inclusao,
          progresso: negociacao.progresso,
          total: negociacao.total,
          total_registros: negociacao.total_registros,
          ind_excluido: negociacao.ind_excluido,
          error: negociacao.error,
          empresas: [],
        });
      }

      // Adicionar empresa ao lote
      lotesMap.get(loteKey).empresas.push({
        cod_empresa: negociacao.cod_empresa,
        nom_fantasia: negociacao.nom_fantasia,
      });
    });

    // Converter Map para array
    this.lotesAgrupados = Array.from(lotesMap.values());
  }

  // Verifica se o usuário tem permissão para aprovar negociações
  get podeAprovarNegociacao(): boolean {
    return this.auth.userLogado?.ind_aprova_negociacao === "S";
  }

  aprovarLote(lote) {
    // Validar permissão antes de aprovar
    if (!this.podeAprovarNegociacao) {
      this.alert.presentAlert(
        "Sem Permissão",
        "",
        "Você não tem permissão para aprovar negociações. Entre em contato com o administrador.",
      );
      return;
    }

    const qtdEmpresas = lote.empresas.length;
    const empresasNomes = lote.empresas.map(e => e.nom_fantasia).join(', ');
    const mensagem = qtdEmpresas > 1
      ? `Este lote contém ${qtdEmpresas} postos: ${empresasNomes}`
      : `Posto: ${empresasNomes}`;

    this.alert
      .presentAlertConfirm(
        "ATENÇÃO",
        `Este procedimento envia as regras para o EMSys3\n${mensagem}`,
        "Deseja Continuar ?",
      )
      .then((data) => {
        if (data === "sim") {
          this.showLoading(`Aprovando ${qtdEmpresas} negociação(ões)...`, 50000);

          // Aprovar para cada empresa do lote
          let aprovados = 0;
          let erros = 0;

          lote.empresas.forEach((empresa, index) => {
            this.movimento
              .aprovaRegra(
                this.auth.userLogado.schema,
                empresa.cod_empresa,
                this.auth.userLogado.nom_usuario,
                lote.seq_lote_alteracao,
              )
              .pipe(
                tap((data) => {
                  aprovados++;

                  // Se for a última aprovação
                  if (aprovados + erros === qtdEmpresas) {
                    this.loadingCtrl.dismiss().catch(() => {});

                    if (erros === 0) {
                      this.feedbackMensagem = `${qtdEmpresas} negociação(ões) aprovada(s) com sucesso!`;
                      this.feedbackTipo = 'sucesso';
                    } else {
                      this.feedbackMensagem = `${aprovados} aprovada(s), ${erros} com erro`;
                      this.feedbackTipo = 'erro';
                    }

                    this.mostrarFeedback = true;
                    setTimeout(() => {
                      this.mostrarFeedback = false;
                    }, 5000);

                    setTimeout(() => {
                      this.socket.setAtualiacaoTarefas(
                        [{ cod_usuario: this.auth.userLogado.nom_usuario }],
                        "trocaPreco",
                      );
                      this.refresh = new Subject<void>();
                    }, 1000);
                  }
                }),
                timeout(51000),
                catchError((err) => {
                  erros++;

                  if (aprovados + erros === qtdEmpresas) {
                    this.loadingCtrl.dismiss().catch(() => {});
                    this.feedbackMensagem = `${aprovados} aprovada(s), ${erros} com erro`;
                    this.feedbackTipo = 'erro';
                    this.mostrarFeedback = true;

                    setTimeout(() => {
                      this.mostrarFeedback = false;
                    }, 5000);
                  }

                  throw err;
                }),
              )
              .subscribe();
          });
        }
      });
  }

  reprovarLote(lote) {
    // Validar permissão antes de reprovar
    if (!this.podeAprovarNegociacao) {
      this.alert.presentAlert(
        "Sem Permissão",
        "",
        "Você não tem permissão para reprovar negociações. Entre em contato com o administrador.",
      );
      return;
    }

    const qtdEmpresas = lote.empresas.length;
    const empresasNomes = lote.empresas.map(e => e.nom_fantasia).join(', ');
    const mensagem = qtdEmpresas > 1
      ? `Este lote contém ${qtdEmpresas} postos: ${empresasNomes}`
      : `Posto: ${empresasNomes}`;

    this.alert
      .presentAlertConfirm(
        "ATENÇÃO",
        `Deseja reprovar esta negociação?\n${mensagem}`,
        "Esta ação não poderá ser desfeita",
      )
      .then((data) => {
        if (data === "sim") {
          this.showLoading(`Reprovando ${qtdEmpresas} negociação(ões)...`, 50000);

          this.movimento
            .reprovaRegra(this.auth.userLogado.schema, lote.seq_lote_alteracao)
            .pipe(
              tap((data) => {
                this.feedbackMensagem = `${qtdEmpresas} negociação(ões) reprovada(s) com sucesso!`;
                this.feedbackTipo = 'sucesso';
                this.mostrarFeedback = true;

                // Esconder feedback após 5 segundos
                setTimeout(() => {
                  this.mostrarFeedback = false;
                }, 5000);
              }),
              timeout(51000),
              catchError((err) => {
                this.feedbackMensagem = err.error?.message || 'Erro ao reprovar negociação';
                this.feedbackTipo = 'erro';
                this.mostrarFeedback = true;

                setTimeout(() => {
                  this.mostrarFeedback = false;
                }, 5000);

                throw err;
              }),
              finalize(() => {
                this.loadingCtrl.dismiss().catch(() => {});
              }),
            )
            .subscribe(() => {
              setTimeout(() => {
                this.socket.setAtualiacaoTarefas(
                  [{ cod_usuario: this.auth.userLogado.nom_usuario }],
                  "trocaPreco",
                );
                this.refresh = new Subject<void>();
                this.buscaNegociacoesEmpresa();
              }, 1000);
            });
        }
      });
  }

  goToHistoricoDetalhe(item, cod, ind_excluido) {
    this.router.navigate(["/home/historico/historico-detalhe"], {
      queryParams: {
        id: item,
        empresa: cod,
        ind_excluido: ind_excluido,
        ind_aprovacao: "S",
      }, // ou paramMap: { id: item.id }
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
}
