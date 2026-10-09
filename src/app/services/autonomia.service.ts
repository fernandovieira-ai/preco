import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, take } from "rxjs";
import { environment } from "src/environments/environment";
import * as CryptoJS from "crypto-js";

export interface ItemAutonomiaBloqueado {
  seq_registro: number;
  cod_item: number;
  margem: number | null;
  perfil: string;
  margem_autonomia: number | null;
  motivo: string | null;
}

export interface ValidacaoAutonomia {
  pode_aprovar: boolean;
  perfil: string;
  margem_autonomia: number | null;
  margem_negociacao: number | null;
  motivo: string | null;
  sistema_autonomia_ativo: boolean;
  // Avaliação item a item (cliente a cliente) dentro do lote — nem todo
  // item de um lote tem a mesma margem, então só os que estão fora da
  // autonomia ficam bloqueados; os demais podem ser aprovados normalmente.
  qtd_total?: number;
  qtd_liberados?: number;
  qtd_bloqueados?: number;
  itens_bloqueados?: ItemAutonomiaBloqueado[];
}

export interface ItemNegociacaoAutonomia {
  cod_item: number;
  des_item?: string;
  cod_empresa: number;
  margem_valor: number;
}

export interface ValidacaoAutonomiaNegociacao {
  sistema_autonomia_ativo: boolean;
  qtd_total: number;
  qtd_liberados: number;
  qtd_bloqueados: number;
  margem_autonomia: number | null;
  itens_bloqueados: ItemAutonomiaBloqueado[];
}

export interface PerfilGrupoAutonomia {
  cod_grupo: number;
  des_grupo: string;
  qtd_usuarios: number;
  ind_perfil_aprovacao: "gerente_unidade" | "supervisor" | "diretor" | null;
  val_margem_minima_autonomia: number | null;
  perfil_ativo: "S" | "N" | null;
  dta_alteracao: string | null;
  nom_usuario_alteracao: string | null;
  // campos auxiliares de UI (não vêm do backend)
  _alterado?: boolean;
}

export interface UsuarioGrupoBusca {
  cod_usuario: number;
  nom_usuario: string;
  grupos: {
    cod_grupo: number;
    des_grupo: string;
    ind_perfil_aprovacao: "gerente_unidade" | "supervisor" | "diretor" | null;
    val_margem_minima_autonomia: number | null;
    perfil_ativo: "S" | "N" | null;
  }[];
}

export interface AdminPerfil {
  cod_usuario: number;
  nom_usuario: string;
  ind_ativo: "S" | "N";
  dta_cadastro: string;
  dta_ultimo_acesso: string | null;
  qtd_acessos: number;
}

export interface UsuarioBuscaSimples {
  cod_usuario: number;
  nom_usuario: string;
}

export interface HistoricoConfigGrupo {
  seq_historico: number;
  cod_grupo: number;
  des_grupo: string;
  cod_usuario_admin: number;
  nom_usuario_admin: string;
  ind_perfil_anterior: string | null;
  ind_perfil_novo: string | null;
  val_margem_anterior: number | null;
  val_margem_nova: number | null;
  des_justificativa: string;
  dta_alteracao: string;
}

@Injectable({
  providedIn: "root",
})
export class AutonomiaService {
  private readonly baseURL = environment["endPoint"];

  // Sessão de admin fica em memória (não persiste em localStorage por design:
  // cada acesso à tela de administração exige a senha novamente).
  private adminAutenticado: { cod_usuario: number; nom_usuario: string } | null = null;

  constructor(private httpClient: HttpClient) {}

  private httpOptions() {
    const token = window.localStorage.getItem("token");
    return {
      headers: new HttpHeaders({
        "Content-Type": "application/json",
        Authorization: `${token}`,
      }),
    };
  }

  // ---------------------------------------------------------------------
  // Validação de autonomia (usado no fluxo de aprovação de negociações)
  // ---------------------------------------------------------------------

  validarAutonomiaAprovacao(
    schema: string,
    cod_usuario: number,
    cod_empresa: number,
    seq_lote: number,
  ): Observable<ValidacaoAutonomia> {
    const body = { schema, cod_usuario, cod_empresa, seq_lote };
    return this.httpClient
      .post<ValidacaoAutonomia>(`${this.baseURL}/validarAutonomiaAprovacao`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  // Mesma análise de autonomia, mas ANTES de o lote existir no banco —
  // usada nas telas de negociação para avisar o usuário, antes de enviar,
  // quais itens já serão aprovados automaticamente e quais ficarão
  // pendentes de aprovação superior.
  validarAutonomiaNegociacao(
    schema: string,
    cod_usuario: number,
    itens: ItemNegociacaoAutonomia[],
  ): Observable<ValidacaoAutonomiaNegociacao> {
    const body = { schema, cod_usuario, itens };
    return this.httpClient
      .post<ValidacaoAutonomiaNegociacao>(`${this.baseURL}/validarAutonomiaNegociacao`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  solicitarAprovacaoSuperior(
    schema: string,
    cod_empresa: number,
    seq_lote: number,
    cod_usuario_solicitante: number,
    nom_usuario_solicitante: string,
    des_observacao?: string,
  ): Observable<any> {
    const body = {
      schema,
      cod_empresa,
      seq_lote,
      cod_usuario_solicitante,
      nom_usuario_solicitante,
      des_observacao,
    };
    return this.httpClient
      .post<any>(`${this.baseURL}/solicitarAprovacaoSuperior`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  listarPendentesAprovacaoSuperior(schema: string): Observable<{ message: any[] }> {
    return this.httpClient
      .post<{ message: any[] }>(`${this.baseURL}/listarPendentesAprovacaoSuperior`, { schema })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  // ---------------------------------------------------------------------
  // Autenticação da tela de administração (senha extra, sessão em memória)
  // ---------------------------------------------------------------------

  // Não existe senha admin separada: valida contra a MESMA senha de login
  // que o usuário já usa no app (mesmo hash MD5 calculado no login.page.ts).
  validarSenhaAdmin(
    schema: string,
    cod_usuario: number,
    senha: string,
  ): Observable<{ sucesso: boolean; mensagem?: string; admin?: { cod_usuario: number; nom_usuario: string } }> {
    const senha_admin = CryptoJS.MD5(senha).toString().toUpperCase();
    const body = { schema, cod_usuario, senha_admin };
    return this.httpClient
      .post<any>(`${this.baseURL}/validarSenhaAdmin`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  setAdminAutenticado(admin: { cod_usuario: number; nom_usuario: string } | null) {
    this.adminAutenticado = admin;
  }

  getAdminAutenticado() {
    return this.adminAutenticado;
  }

  isAdminAutenticado(): boolean {
    return this.adminAutenticado !== null;
  }

  // ---------------------------------------------------------------------
  // Parâmetro geral (kill switch) — liga/desliga toda a regra de autonomia
  // ---------------------------------------------------------------------

  buscarParametroAutonomia(schema: string): Observable<{
    ativo: boolean;
    dta_alteracao: string | null;
    nom_usuario_alteracao: string | null;
    des_justificativa: string | null;
  }> {
    return this.httpClient
      .post<any>(`${this.baseURL}/buscarParametroAutonomia`, { schema })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  atualizarParametroAutonomia(
    schema: string,
    ativo: boolean,
    des_justificativa: string,
    admin: { cod_usuario: number; nom_usuario: string },
  ): Observable<any> {
    const body = {
      schema,
      ativo,
      des_justificativa,
      cod_usuario_admin: admin.cod_usuario,
      nom_usuario_admin: admin.nom_usuario,
    };
    return this.httpClient
      .post<any>(`${this.baseURL}/atualizarParametroAutonomia`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  // ---------------------------------------------------------------------
  // Administração de perfis — por GRUPO do EMSys3 (não mais por usuário)
  // ---------------------------------------------------------------------

  listarGruposAutonomia(schema: string): Observable<{ message: PerfilGrupoAutonomia[] }> {
    return this.httpClient
      .post<{ message: PerfilGrupoAutonomia[] }>(`${this.baseURL}/listarGruposAutonomia`, { schema })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  listarUsuariosGrupo(
    schema: string,
    cod_grupo: number,
  ): Observable<{ message: { cod_usuario: number; nom_usuario: string; empresa: number[] }[] }> {
    return this.httpClient
      .post<any>(`${this.baseURL}/listarUsuariosGrupo`, { schema, cod_grupo })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  atualizarPerfilGrupo(
    schema: string,
    grupo: Partial<PerfilGrupoAutonomia>,
    des_justificativa: string,
    admin: { cod_usuario: number; nom_usuario: string },
  ): Observable<any> {
    const body = {
      schema,
      cod_grupo: grupo.cod_grupo,
      des_grupo: grupo.des_grupo,
      ind_perfil_aprovacao: grupo.ind_perfil_aprovacao,
      val_margem_minima_autonomia: grupo.val_margem_minima_autonomia,
      des_justificativa,
      cod_usuario_admin: admin.cod_usuario,
      nom_usuario_admin: admin.nom_usuario,
    };
    return this.httpClient
      .post<any>(`${this.baseURL}/atualizarPerfilGrupo`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  buscarUsuarioGrupo(schema: string, busca: string): Observable<{ message: UsuarioGrupoBusca[] }> {
    return this.httpClient
      .post<{ message: UsuarioGrupoBusca[] }>(`${this.baseURL}/buscarUsuarioGrupo`, { schema, busca })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  desativarPerfilGrupo(
    schema: string,
    cod_grupo: number,
    des_justificativa: string,
    admin: { cod_usuario: number; nom_usuario: string },
  ): Observable<any> {
    const body = {
      schema,
      cod_grupo,
      des_justificativa,
      cod_usuario_admin: admin.cod_usuario,
      nom_usuario_admin: admin.nom_usuario,
    };
    return this.httpClient
      .post<any>(`${this.baseURL}/desativarPerfilGrupo`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  historicoConfigGrupo(schema: string, cod_grupo: number): Observable<{ message: HistoricoConfigGrupo[] }> {
    return this.httpClient
      .post<{ message: HistoricoConfigGrupo[] }>(`${this.baseURL}/historicoConfigGrupo`, { schema, cod_grupo })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  // ---------------------------------------------------------------------
  // Administradores do sistema (quem acessa a tela de autonomia)
  // ---------------------------------------------------------------------

  listarAdminsAutonomia(schema: string): Observable<{ message: AdminPerfil[] }> {
    return this.httpClient
      .post<{ message: AdminPerfil[] }>(`${this.baseURL}/listarAdminsAutonomia`, { schema })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  // Busca usuário ATIVO já sincronizado do EMSys3 — nunca cria usuário novo.
  buscarUsuarioParaAdmin(schema: string, busca: string): Observable<{ message: UsuarioBuscaSimples[] }> {
    return this.httpClient
      .post<{ message: UsuarioBuscaSimples[] }>(`${this.baseURL}/buscarUsuarioParaAdmin`, { schema, busca })
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  adicionarAdminAutonomia(
    schema: string,
    usuario: UsuarioBuscaSimples,
    admin: { cod_usuario: number; nom_usuario: string },
  ): Observable<any> {
    const body = {
      schema,
      cod_usuario: usuario.cod_usuario,
      nom_usuario: usuario.nom_usuario,
      cod_usuario_admin: admin.cod_usuario,
    };
    return this.httpClient
      .post<any>(`${this.baseURL}/adicionarAdminAutonomia`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }

  removerAdminAutonomia(
    schema: string,
    cod_usuario: number,
    admin: { cod_usuario: number; nom_usuario: string },
  ): Observable<any> {
    const body = { schema, cod_usuario, cod_usuario_admin: admin.cod_usuario };
    return this.httpClient
      .post<any>(`${this.baseURL}/removerAdminAutonomia`, body)
      .pipe(
        take(1),
        catchError((err) => {
          throw err;
        }),
      );
  }
}
