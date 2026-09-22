# Correção: Permissão de Empresas por Usuário

## 📋 Problema Identificado

Na tela inicial (Home), quando o usuário selecionava empresas, o sistema não estava respeitando as empresas PERMITIDAS cadastradas no campo `empresa` da `tab_usuario`.

## ✅ Solução Implementada

### Arquivo Corrigido: `src/app/home/home.page.ts`

**Linha 537** - Método `atualizarDadosAposSincronizacao()`

**ANTES:**
```typescript
this.movimento
  .buscaEmpresasBase(
    this.auth.userLogado.schema,
    this.auth.userLogado.cod_empresa_sel,  // ❌ Usava empresas SELECIONADAS
  )
```

**DEPOIS:**
```typescript
this.movimento
  .buscaEmpresasBase(
    this.auth.userLogado.schema,
    this.auth.userLogado.empresa,  // ✅ Usa empresas PERMITIDAS
  )
```

## 🔒 Como Funciona Agora

1. **Login (`tab_usuario`)**: Retorna campo `empresa` com array de códigos de empresas permitidas
   
2. **Tela Home**: Busca empresas usando `auth.userLogado.empresa` (empresas permitidas)
   - Linha 61: ✅ Já estava correto
   - Linha 537: ✅ Corrigido nesta atualização

3. **Backend (`buscaEmpresasBase`)**: Filtra empresas pelo array recebido

4. **Resultado**: Usuário só consegue ver e selecionar empresas que estão liberadas no cadastro dele

## 📊 Estrutura de Dados

### Classe User (`src/app/class/user.ts`)
```typescript
export class user {
  cod_usuario: number;
  nom_usuario: string;
  cod_empresa_usuario: empresa[];    // Empresas selecionadas pelo usuário na UI
  schema: string;
  cod_empresa_sel: any[];            // Códigos das empresas selecionadas
  empresa: any[];                    // ⭐ Empresas PERMITIDAS (vem da tab_usuario)
  des_rede: string;
  img_rede: string;
  ind_aprova_negociacao: string;
}
```

### Banco de Dados - tab_usuario
```sql
CREATE TABLE tab_usuario (
  cod_usuario SERIAL PRIMARY KEY,
  nom_usuario VARCHAR(100),
  senha VARCHAR(50),
  schema_base VARCHAR(50),
  empresa INTEGER[],              -- ⭐ Array com códigos das empresas permitidas
  des_rede VARCHAR(255),
  img_rede BYTEA,
  ind_aprova_negociacao CHAR(1),
  ind_ativo CHAR(1)
);
```

## 🔐 Segurança

- ✅ Usuário só vê empresas permitidas no filtro da tela inicial
- ✅ Backend valida empresas pelo array recebido
- ✅ Não é possível selecionar empresas não autorizadas

## 📝 Observações

- O campo `cod_empresa_sel` continua existindo para controle de UI (quais empresas o usuário marcou)
- O campo `empresa` é a fonte de verdade para permissões
- Sempre usar `auth.userLogado.empresa` ao buscar/filtrar empresas no backend

---

**Data da Correção**: 22/09/2026  
**Arquivo Alterado**: `src/app/home/home.page.ts` (linha 537)
