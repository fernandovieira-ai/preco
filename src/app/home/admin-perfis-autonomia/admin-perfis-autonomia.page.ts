import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AlertController, LoadingController } from "@ionic/angular";

import { AuthService } from "src/app/services/auth.service";
import { Alert } from "src/app/class/alert";
import {
  AutonomiaService,
  PerfilGrupoAutonomia,
  HistoricoConfigGrupo,
  UsuarioGrupoBusca,
} from "src/app/services/autonomia.service";

@Component({
  selector: "app-admin-perfis-autonomia",
  templateUrl: "./admin-perfis-autonomia.page.html",
  styleUrls: ["./admin-perfis-autonomia.page.scss"],
  standalone: false,
})
export class AdminPerfisAutonomiaPage implements OnInit {
  autenticado = false;
  adminData: { cod_usuario: number; nom_usuario: string } | null = null;

  sistemaAtivo = false;
  sistemaInfo: { dta_alteracao: string | null; nom_usuario_alteracao: string | null; des_justificativa: string | null } | null = null;

  grupos: PerfilGrupoAutonomia[] = [];
  gruposFiltrados: PerfilGrupoAutonomia[] = [];

  buscaTexto = "";
  resultadosUsuario: UsuarioGrupoBusca[] = [];

  senhaLogin = "";
  mostrarSenha = false;
  autenticando = false;

  readonly tiposPerfil = [
    { codigo: "gerente_unidade", nome: "Gerente de Unidade" },
    { codigo: "supervisor", nome: "Supervisor" },
    { codigo: "diretor", nome: "Diretor" },
  ];

  constructor(
    public auth: AuthService,
    private autonomiaService: AutonomiaService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private alert: Alert,
  ) {}

  ngOnInit() {
    if (this.autonomiaService.isAdminAutenticado()) {
      this.adminData = this.autonomiaService.getAdminAutenticado();
      this.autenticado = true;
      this.carregarParametroGeral();
      this.carregarGrupos();
    }
    // Se não estiver autenticado, o formulário de login inline (ver HTML)
    // já é exibido por padrão — nenhuma ação adicional necessária aqui.
  }

  // ---------------------------------------------------------------------
  // Parâmetro geral (kill switch)
  // ---------------------------------------------------------------------

  carregarParametroGeral() {
    this.autonomiaService.buscarParametroAutonomia(this.auth.userLogado.schema).subscribe({
      next: (res) => {
        this.sistemaAtivo = res.ativo;
        this.sistemaInfo = res;
      },
      error: (err) => this.alert.presentToast("Erro ao carregar parâmetro geral: " + err.message, 3000),
    });
  }

  async alternarSistemaGeral() {
    const novoEstado = !this.sistemaAtivo;

    const alert = await this.alertCtrl.create({
      cssClass: "custom-alert",
      backdropDismiss: false,
      header: novoEstado ? "Ativar sistema de autonomia" : "Desativar sistema de autonomia",
      subHeader: novoEstado
        ? "A partir de agora, usuários dos grupos configurados abaixo só aprovam dentro da margem definida."
        : "Todos voltam a aprovar sem checagem de margem (comportamento antigo), mesmo grupos já configurados.",
      mode: "ios",
      inputs: [{ name: "justificativa", type: "textarea", placeholder: "Motivo desta alteração" }],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: novoEstado ? "Ativar" : "Desativar",
          cssClass: novoEstado ? undefined : "alert-button-confirm",
          handler: (data) => {
            if (!data.justificativa || data.justificativa.trim() === "") {
              this.alert.presentToast("Justificativa é obrigatória", 2000);
              return false;
            }
            this.executarAlternarSistema(novoEstado, data.justificativa);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private async executarAlternarSistema(ativo: boolean, justificativa: string) {
    const loading = await this.loadingCtrl.create({ message: "Aplicando..." });
    await loading.present();

    this.autonomiaService
      .atualizarParametroAutonomia(this.auth.userLogado.schema, ativo, justificativa, this.adminData!)
      .subscribe({
        next: (res) => {
          loading.dismiss();
          this.alert.presentToast(res.message, 2500);
          this.carregarParametroGeral();
        },
        error: (err) => {
          loading.dismiss();
          this.alert.presentToast("Erro: " + (err.error?.message || err.message), 3000);
        },
      });
  }

  // ---------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------

  toggleMostrarSenha() {
    this.mostrarSenha = !this.mostrarSenha;
  }

  cancelarLogin() {
    this.router.navigate(["/home"]);
  }

  confirmarLogin() {
    if (!this.senhaLogin || this.senhaLogin.trim() === "") {
      this.alert.presentToast("Digite sua senha de login", 2000);
      return;
    }

    this.autenticando = true;

    this.autonomiaService
      .validarSenhaAdmin(this.auth.userLogado.schema, this.auth.userLogado.cod_usuario, this.senhaLogin)
      .subscribe({
        next: (res) => {
          this.autenticando = false;
          if (res.sucesso && res.admin) {
            this.senhaLogin = "";
            this.autonomiaService.setAdminAutenticado(res.admin);
            this.adminData = res.admin;
            this.autenticado = true;
            this.carregarParametroGeral();
            this.carregarGrupos();
          } else {
            this.alert.presentToast(res.mensagem || "Acesso negado", 2500);
          }
        },
        error: (err) => {
          this.autenticando = false;
          this.alert.presentToast("Erro ao validar senha: " + (err.error?.message || err.message), 3000);
        },
      });
  }

  bloquear() {
    this.autonomiaService.setAdminAutenticado(null);
    this.autenticado = false;
    this.router.navigate(["/home"]);
  }

  // ---------------------------------------------------------------------
  // Listagem e filtros
  // ---------------------------------------------------------------------

  async carregarGrupos() {
    const loading = await this.loadingCtrl.create({ message: "Carregando grupos..." });
    await loading.present();

    this.autonomiaService.listarGruposAutonomia(this.auth.userLogado.schema).subscribe({
      next: (res) => {
        loading.dismiss();
        this.grupos = (res.message || []).map((g) => ({ ...g, _alterado: false }));
        this.filtrarGrupos();
      },
      error: (err) => {
        loading.dismiss();
        this.alert.presentToast("Erro ao carregar grupos: " + err.message, 3000);
      },
    });
  }

  filtrarGrupos() {
    let resultado = [...this.grupos];

    if (this.buscaTexto && this.buscaTexto.trim()) {
      const busca = this.buscaTexto.toLowerCase().trim();
      resultado = resultado.filter(
        (g) =>
          g.des_grupo?.toLowerCase().includes(busca) ||
          g.cod_grupo?.toString().includes(busca),
      );
      this.buscarUsuario(this.buscaTexto.trim());
    } else {
      this.resultadosUsuario = [];
    }

    this.gruposFiltrados = resultado;
  }

  // Busca por NOME DE USUÁRIO (não só grupo) — ajuda o admin a achar em
  // qual grupo mexer para liberar/ajustar a autonomia de uma pessoa específica.
  buscarUsuario(busca: string) {
    if (busca.length < 3) {
      this.resultadosUsuario = [];
      return;
    }

    this.autonomiaService.buscarUsuarioGrupo(this.auth.userLogado.schema, busca).subscribe({
      next: (res) => (this.resultadosUsuario = res.message || []),
      error: () => (this.resultadosUsuario = []),
    });
  }

  // Ao clicar no grupo de um usuário encontrado, filtra a lista para aquele
  // grupo específico, pronto para o admin configurar o perfil/margem.
  irParaGrupo(cod_grupo: number) {
    const grupo = this.grupos.find((g) => g.cod_grupo === cod_grupo);
    if (!grupo) return;

    this.buscaTexto = grupo.des_grupo;
    this.resultadosUsuario = [];
    this.filtrarGrupos();
  }

  // ---------------------------------------------------------------------
  // Edição de perfil do grupo (cria se não existir, atualiza se já existir)
  // ---------------------------------------------------------------------

  iniciarEdicao(grupo: PerfilGrupoAutonomia) {
    if (!grupo.ind_perfil_aprovacao) {
      grupo.ind_perfil_aprovacao = "gerente_unidade";
      grupo.val_margem_minima_autonomia = 0.2;
    }
    grupo._alterado = true;
  }

  onCampoAlterado(grupo: PerfilGrupoAutonomia) {
    grupo._alterado = true;
  }

  async salvarGrupo(grupo: PerfilGrupoAutonomia) {
    if (!grupo.ind_perfil_aprovacao) {
      this.alert.presentToast("Selecione um perfil", 2000);
      return;
    }
    if (grupo.val_margem_minima_autonomia === null || grupo.val_margem_minima_autonomia === undefined) {
      this.alert.presentToast("Informe a margem mínima de autonomia", 2000);
      return;
    }

    const justificativa = `Configuração alterada via tela de administração para o grupo "${grupo.des_grupo}"`;
    this.executarSalvar(grupo, justificativa);
  }

  private async executarSalvar(grupo: PerfilGrupoAutonomia, justificativa: string) {
    const loading = await this.loadingCtrl.create({ message: "Salvando..." });
    await loading.present();

    this.autonomiaService
      .atualizarPerfilGrupo(this.auth.userLogado.schema, grupo, justificativa, this.adminData!)
      .subscribe({
        next: () => {
          loading.dismiss();
          this.alert.presentToast(`✅ Grupo "${grupo.des_grupo}" configurado com sucesso`, 2500);
          this.carregarGrupos();
        },
        error: (err) => {
          loading.dismiss();
          this.alert.presentToast("❌ Erro ao salvar: " + (err.error?.message || err.message), 3000);
        },
      });
  }

  // ---------------------------------------------------------------------
  // Usuários dentro do grupo (conferir quem herda a margem antes de salvar)
  // ---------------------------------------------------------------------

  async verUsuariosGrupo(grupo: PerfilGrupoAutonomia) {
    const loading = await this.loadingCtrl.create({ message: "Carregando usuários..." });
    await loading.present();

    this.autonomiaService.listarUsuariosGrupo(this.auth.userLogado.schema, grupo.cod_grupo).subscribe({
      next: async (res) => {
        loading.dismiss();
        const usuarios = res.message || [];

        const mensagem = usuarios.length === 0
          ? "Nenhum usuário ativo neste grupo."
          : usuarios
              .map((u) => `${u.nom_usuario} <span style="opacity:.6">(${u.cod_usuario})</span>`)
              .join("<br>");

        const alert = await this.alertCtrl.create({
          cssClass: "custom-alert",
          header: `Usuários — ${grupo.des_grupo}`,
          subHeader: `${usuarios.length} usuário(s) ativo(s) neste grupo`,
          message: mensagem,
          mode: "ios",
          buttons: ["Fechar"],
        });

        await alert.present();
      },
      error: (err) => {
        loading.dismiss();
        this.alert.presentToast("Erro ao carregar usuários: " + err.message, 3000);
      },
    });
  }

  // ---------------------------------------------------------------------
  // Histórico de auditoria
  // ---------------------------------------------------------------------

  verHistorico(grupo: PerfilGrupoAutonomia) {
    this.autonomiaService.historicoConfigGrupo(this.auth.userLogado.schema, grupo.cod_grupo).subscribe({
      next: (res) => this.mostrarHistorico(grupo, res.message || []),
      error: (err) => this.alert.presentToast("Erro ao buscar histórico: " + err.message, 3000),
    });
  }

  private async mostrarHistorico(grupo: PerfilGrupoAutonomia, historico: HistoricoConfigGrupo[]) {
    let mensagem: string;

    if (historico.length === 0) {
      mensagem = "Nenhuma alteração registrada ainda.";
    } else {
      mensagem = historico
        .map((h) => {
          const data = new Date(h.dta_alteracao).toLocaleString("pt-BR");
          return `<b>${data}</b> — ${h.nom_usuario_admin}<br>` +
            `${h.ind_perfil_anterior || "—"} → ${h.ind_perfil_novo || "removido"}<br>` +
            `R$ ${h.val_margem_anterior ?? "—"} → R$ ${h.val_margem_nova ?? "—"}<br>` +
            `<i>${h.des_justificativa}</i>`;
        })
        .join("<hr>");
    }

    const alert = await this.alertCtrl.create({
      cssClass: "custom-alert",
      header: `Histórico — ${grupo.des_grupo}`,
      message: mensagem,
      mode: "ios",
      buttons: ["Fechar"],
    });

    await alert.present();
  }

  // ---------------------------------------------------------------------
  // Helpers de exibição
  // ---------------------------------------------------------------------

  getNomePerfil(codigo: string | null): string {
    if (!codigo) return "Sem perfil";
    return this.tiposPerfil.find((t) => t.codigo === codigo)?.nome || codigo;
  }

  getCorPerfil(grupo: { ind_perfil_aprovacao: string | null }): string {
    if (!grupo.ind_perfil_aprovacao) return "medium";
    switch (grupo.ind_perfil_aprovacao) {
      case "gerente_unidade":
        return "success";
      case "supervisor":
        return "warning";
      case "diretor":
        return "danger";
      default:
        return "medium";
    }
  }

  trackByGrupo(index: number, grupo: PerfilGrupoAutonomia): number {
    return grupo.cod_grupo;
  }
}
