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
  forkJoin,
  of,
} from "rxjs";
import { Alert } from "src/app/class/alert";
import { minhasNegociacoes } from "src/app/class/user";
import { AuthService } from "src/app/services/auth.service";
import { MovimentoService } from "src/app/services/movimento.service";
import { WebsocketService } from "src/app/services/websocket.service";
import { AutonomiaService, ValidacaoAutonomia } from "src/app/services/autonomia.service";

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
    private autonomiaService: AutonomiaService,
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
        this.auth.userLogado.empresa,
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
        this.auth.userLogado.empresa,
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
          nom_usuario: negociacao.nom_usuario,
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

    this.showLoading("Verificando autonomia...", 15000);

    // Valida autonomia para cada empresa do lote (a margem pode variar por posto)
    const validacoes$ = lote.empresas.map((empresa) =>
      this.autonomiaService
        .validarAutonomiaAprovacao(
          this.auth.userLogado.schema,
          this.auth.userLogado.cod_usuario,
          empresa.cod_empresa,
          lote.seq_lote_alteracao,
        )
        .pipe(
          catchError(() =>
            // Fail-safe: se a validação falhar por erro de rede/servidor,
            // não bloqueia o fluxo — mantém o comportamento legado.
            of<ValidacaoAutonomia>({
              pode_aprovar: true,
              perfil: "erro_validacao",
              margem_autonomia: null,
              margem_negociacao: null,
              motivo: null,
              sistema_autonomia_ativo: false,
            }),
          ),
        ),
    );

    forkJoin(validacoes$).subscribe((validacoes: ValidacaoAutonomia[]) => {
      this.loadingCtrl.dismiss().catch(() => {});

      const bloqueio = validacoes.find((v) => v.sistema_autonomia_ativo && !v.pode_aprovar);

      if (bloqueio && !bloqueio.qtd_liberados) {
        // Nenhum item pode ser aprovado agora — só faz sentido pedir
        // aprovação superior, não há o que aprovar direto.
        this.oferecerSolicitarAprovacao(lote, bloqueio);
      } else if (bloqueio) {
        // Alguns itens do lote estão dentro da autonomia e outros não —
        // aprova o que pode ser aprovado, avisando que o restante fica
        // pendente (aprovaRegra faz essa separação item a item).
        this.confirmarEAprovarLote(lote, bloqueio);
      } else {
        this.confirmarEAprovarLote(lote);
      }
    });
  }

  private async oferecerSolicitarAprovacao(lote, validacao: ValidacaoAutonomia) {
    const margem = validacao.margem_negociacao !== null ? `R$ ${Number(validacao.margem_negociacao).toFixed(2)}` : "desconhecida";
    const autonomia = validacao.margem_autonomia !== null ? `R$ ${Number(validacao.margem_autonomia).toFixed(2)}` : "—";

    const confirmado = await this.alert.presentAlertConfirmCuston(
      "Fora da sua autonomia",
      `Margem deste lote: ${margem} | Sua autonomia: ${autonomia}`,
      validacao.motivo || "Esta negociação precisa de aprovação de um supervisor/diretor.",
      "Cancelar",
      "Solicitar Aprovação",
      "warning",
    );

    if (!confirmado) return;

    this.showLoading("Enviando solicitação...", 15000);

    this.autonomiaService
      .solicitarAprovacaoSuperior(
        this.auth.userLogado.schema,
        lote.empresas[0].cod_empresa,
        lote.seq_lote_alteracao,
        this.auth.userLogado.cod_usuario,
        this.auth.userLogado.nom_usuario,
        `Margem ${Number(validacao.margem_negociacao).toFixed(2)} abaixo da autonomia (${Number(validacao.margem_autonomia).toFixed(2)})`,
      )
      .pipe(
        timeout(15000),
        finalize(() => this.loadingCtrl.dismiss().catch(() => {})),
      )
      .subscribe({
        next: () => {
          this.feedbackMensagem = "Solicitação enviada para aprovação superior.";
          this.feedbackTipo = "sucesso";
          this.mostrarFeedback = true;
          setTimeout(() => (this.mostrarFeedback = false), 5000);
        },
        error: (err) => {
          this.alert.presentToast("Erro ao solicitar aprovação: " + (err.error?.message || err.message), 3000);
        },
      });
  }

  private confirmarEAprovarLote(lote, bloqueio?: ValidacaoAutonomia) {
    const qtdEmpresas = lote.empresas.length;
    const empresasNomes = lote.empresas.map(e => e.nom_fantasia).join(', ');
    let mensagem = qtdEmpresas > 1
      ? `Este lote contém ${qtdEmpresas} postos: ${empresasNomes}`
      : `Posto: ${empresasNomes}`;

    if (bloqueio && bloqueio.qtd_bloqueados) {
      mensagem += `\n\n⚠️ ${bloqueio.qtd_liberados} de ${bloqueio.qtd_total} item(ns) estão dentro da sua autonomia e serão aprovados. ${bloqueio.qtd_bloqueados} item(ns) ficarão pendentes de aprovação superior.`;
    }

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
          let houveParcial = false;

          lote.empresas.forEach((empresa, index) => {
            this.movimento
              .aprovaRegra(
                this.auth.userLogado.schema,
                empresa.cod_empresa,
                this.auth.userLogado.nom_usuario,
                lote.seq_lote_alteracao,
                this.auth.userLogado.cod_usuario,
              )
              .pipe(
                tap((data) => {
                  aprovados++;
                  if (data?.parcial) {
                    houveParcial = true;
                  }

                  // Se for a última aprovação
                  if (aprovados + erros === qtdEmpresas) {
                    this.loadingCtrl.dismiss().catch(() => {});

                    if (erros === 0 && !houveParcial) {
                      this.feedbackMensagem = `${qtdEmpresas} negociação(ões) aprovada(s) com sucesso!`;
                      this.feedbackTipo = 'sucesso';

                      // Remove o lote da tela imediatamente (não espera o
                      // round-trip do socket) — evita que o card fique
                      // visível com o botão "Aprovar" clicável de novo.
                      this.lotesAgrupados = this.lotesAgrupados.filter(
                        (l) => l.seq_lote_alteracao !== lote.seq_lote_alteracao,
                      );
                    } else if (erros === 0 && houveParcial) {
                      // Alguns itens do lote ficaram fora da autonomia —
                      // o card continua na tela (agora só com os itens
                      // pendentes) para não esconder o que falta aprovar.
                      this.feedbackMensagem = `${data?.message || "Alguns itens ficaram pendentes de aprovação superior."}`;
                      this.feedbackTipo = 'sucesso';
                      this.buscaNegociacoesEmpresa();
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

                // Remove o lote da tela imediatamente, sem esperar o
                // re-fetch — evita o card ficar visível com os botões
                // clicáveis de novo.
                this.lotesAgrupados = this.lotesAgrupados.filter(
                  (l) => l.seq_lote_alteracao !== lote.seq_lote_alteracao,
                );

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
