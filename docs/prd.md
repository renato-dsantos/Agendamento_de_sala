# Gestão de Disponibilidade e Alocação de Recursos

**Tipo de documento:** Product Requirements Document (PRD)  
**Versão:** 0.3
**Status:** Rascunho  
**Data:** 2026-11-09
**Responsável pelo produto:** A definir

## 1. Visão geral

A aplicação tem como finalidade centralizar o gerenciamento da disponibilidade e da alocação de salas, professores e materiais. O produto deverá apoiar o ciclo de solicitações de reserva e dar visibilidade a seus estados, aprovações, alterações, cancelamentos e movimentações associadas.

O sistema busca reduzir conflitos e inconsistências, apoiar o uso eficiente dos recursos e manter registros rastreáveis das operações realizadas. As decisões técnicas e os requisitos detalhados serão elaborados em etapa posterior.

## 2. Problema e benefícios esperados

Sem um processo centralizado, solicitantes e responsáveis podem ter dificuldade para verificar disponibilidade, coordenar recursos relacionados, tratar pedidos especiais e acompanhar o estado de cada solicitação. A movimentação de materiais e as alterações de reservas também precisam de registro consistente para que pendências e ocorrências possam ser acompanhadas.

Os benefícios esperados são:

- Maior visibilidade sobre disponibilidade e utilização dos recursos.
- Redução de conflitos de horário e de inconsistências de alocação.
- Fluxo organizado para solicitações que exigem aprovação.
- Acompanhamento de retiradas, devoluções, atrasos e ocorrências de materiais.
- Histórico consultável das reservas e das ações administrativas.

## 3. Objetivos do produto

- Centralizar solicitações e informações de disponibilidade de salas, professores e materiais.
- Apoiar uma alocação consistente e sem conflitos de horário.
- Permitir que cada perfil atue conforme suas responsabilidades e permissões.
- Dar suporte à aprovação de solicitações especiais.
- Manter rastreabilidade de reservas, decisões, movimentações e exceções.

## 4. Escopo

### 4.1. Incluído

- Consulta de disponibilidade de salas, professores e materiais.
- Gestão de solicitações de reserva, incluindo criação, consulta, alteração, cancelamento e acompanhamento de status.
- Tratamento de solicitações especiais por fluxo de aprovação.
- Administração de recursos, usuários, perfis, permissões, bloqueios e períodos de manutenção.
- Registro e acompanhamento de retiradas, devoluções, atrasos e ocorrências de materiais.
- Consulta de histórico, auditoria, conflitos, inconsistências e indicadores operacionais.
- Tratamento controlado e auditável de exceções operacionais.

### 4.2. Fora do escopo desta documentação

- Implementação de código, banco de dados, APIs ou interfaces.
- Protótipos, diagramas técnicos de arquitetura e decisões de tecnologia.
- Definição de requisitos funcionais e não funcionais detalhados nesta etapa.
- Definição de critérios de aceitação detalhados nesta etapa.
- Funcionalidades ou integrações não descritas no escopo informado; sua inclusão depende de definição futura.

### 4.3. Decisão de produto: UI observacional no MVP

A UI web observacional **não é obrigatória para o MVP**. Se disponibilizada, deve permanecer somente para consulta autorizada e não pode ser necessária para a operação do produto.

**Rationale e evidências:** a versão anterior deste PRD não estabelecia compromisso de entrega de UI; a arquitetura define a CLI como superfície operacional e descreve a UI como condicional e opcional ([Arquitetura, §1](arquitetura.md#1-visão-geral-e-objetivos-arquiteturais) e [§12](arquitetura.md#12-matriz-atam-decisões-riscos-sensibilidades-e-trade-offs)); FR-14 e NFR-05 exigem documentação das superfícies efetivamente expostas, sem exigir uma interface web ([FR-14](requisitos-funcionais.md#fr-14--documentação-dos-pontos-de-interação-expostos), [NFR-05](requisitos-nao-funcionais.md#nfr-05--documentação-dos-pontos-de-interação-públicos)). Essa decisão define prioridade de MVP, sem alterar a restrição arquitetural de leitura somente para uma eventual UI.

**Risco:** usuários que esperem consulta pela web não terão essa superfície no MVP; a superfície operacional ratificada é a CLI. Uma necessidade de UI no MVP exigirá nova decisão de produto baseada em evidência, não deve ser presumida pelos documentos derivados.

## 5. Personas e perfis de acesso

As permissões abaixo descrevem o escopo de atuação esperado para cada persona. A granularidade final das permissões e eventuais delegações ainda será detalhada.

| Persona | Escopo de acesso | Restrições principais |
|---|---|---|
| Solicitante | Disponibilidade, solicitações próprias, status e histórico próprio | Não acessa nem altera reservas de terceiros sem autorização; não pode gerar conflito; solicita aprovação quando aplicável |
| Responsável | Solicitações especiais e reservas sob sua responsabilidade; validação de professores; movimentações de materiais | Atua conforme permissões; justifica decisões quando exigido; não aprova violações de disponibilidade ou bloqueios |
| Administrador | Cadastros e configurações administrativas; usuários, perfis, permissões, bloqueios, auditoria e relatórios | Ações administrativas são auditadas; não remove recursos com reservas futuras de forma a comprometer registros; exceções permanecem controladas e rastreáveis |

### 5.1. Solicitante

**Perfil:** professor ou coordenador que consulta a disponibilidade dos recursos e gerencia as próprias reservas.

**Atuação esperada:** consultar salas, professores e materiais disponíveis; criar solicitações; alterar ou cancelar reservas próprias conforme as regras; acompanhar o status e o histórico das solicitações; receber notificações sobre aprovações, recusas, alterações e cancelamentos.

**Restrições:** não pode solicitar recurso já alocado no mesmo intervalo; não pode consultar ou modificar reservas de terceiros sem autorização; deve encaminhar solicitações com condições especiais para aprovação.

### 5.2. Responsável

**Perfil:** usuário encarregado de analisar solicitações especiais, validar alocação de professores e acompanhar movimentações de materiais.

**Atuação esperada:** analisar, aprovar ou rejeitar solicitações especiais; validar disponibilidade e alocação de professores; consultar reservas e possíveis inconsistências; registrar retiradas e devoluções; acompanhar pendências, atrasos e ocorrências; consultar o histórico de aprovações e movimentações sob sua responsabilidade.

**Restrições:** atua somente dentro das permissões atribuídas; registra justificativa nas decisões que exijam fundamentação; não aprova solicitações que violem regras de disponibilidade ou bloqueios administrativos.

### 5.3. Administrador

**Perfil:** usuário responsável pela configuração, administração e manutenção dos recursos e das regras de funcionamento.

**Atuação esperada:** cadastrar, editar, consultar e desativar salas, professores e materiais; gerenciar usuários, perfis e permissões; definir bloqueios e períodos de manutenção; configurar parâmetros de reserva; consultar conflitos, inconsistências, indicadores, logs de auditoria e relatórios de utilização; tratar situações excepcionais de forma rastreável.

**Restrições:** alterações administrativas devem permanecer registradas; recursos ligados a reservas futuras não devem ser removidos se isso comprometer a integridade dos registros; exceções não podem apagar o histórico nem permitir conflitos sem controle e auditoria.

## 6. Regras de negócio conhecidas

Esta seção registra as regras já fornecidas pelo solicitante; não substitui a futura especificação dos requisitos.

1. Um mesmo recurso não pode ser alocado em reservas conflitantes no mesmo intervalo de tempo.
2. A disponibilidade deve ser verificada antes da criação ou alteração de uma reserva.
3. Solicitações que atendam às condições especiais definidas para o produto seguem o fluxo de aprovação correspondente.
4. Alterações e cancelamentos obedecem às permissões do usuário e às regras aplicáveis à reserva.
5. Retiradas e devoluções de materiais devem possuir registros rastreáveis.
6. Bloqueios administrativos e períodos de manutenção são considerados na verificação de disponibilidade.
7. Operações relevantes mantêm histórico com usuário responsável, data, ação e dados suficientes para rastrear a alteração.
8. Exceções operacionais são controladas e auditadas, com justificativa quando aplicável.
9. Em uma reserva com múltiplos recursos, no momento do cancelamento, este é permitido para cada recurso cujo horário de início ainda não chegou. Recursos cujo início já chegou permanecem ativos e não impedem o cancelamento dos demais recursos elegíveis. Esta regra substitui o cancelamento integral do pedido como condição para cancelar recursos ainda não iniciados; as permissões e os registros existentes de cancelamento permanecem aplicáveis.

## 7. Fluxos principais em alto nível

Os fluxos abaixo representam jornadas conceituais, sem especificar telas ou comportamento técnico.

### 7.1. Solicitação de reserva

O solicitante consulta a disponibilidade, seleciona os recursos e o intervalo desejados e envia a solicitação. O sistema verifica os bloqueios e alocações existentes. Se houver condição especial, a solicitação segue para análise do responsável; caso contrário, seu estado é apresentado ao solicitante conforme as regras que serão detalhadas.

### 7.2. Análise de solicitação especial

O responsável consulta a solicitação e as informações necessárias para avaliar a disponibilidade e as condições informadas. Registra a decisão e a justificativa quando aplicável. O solicitante recebe uma notificação sobre o resultado.

### 7.3. Alteração ou cancelamento

O solicitante autorizado consulta uma reserva própria e solicita alteração ou cancelamento. Antes de confirmar uma alteração, a disponibilidade dos recursos deve ser verificada novamente. Em uma reserva com múltiplos recursos, no momento do cancelamento, a ação se aplica somente aos recursos cujo horário de início ainda não chegou; recursos já iniciados permanecem ativos e não bloqueiam o cancelamento dos demais elegíveis. O cancelamento integral do pedido não é exigido para cancelar recursos elegíveis. A ação e seu resultado ficam sujeitos às permissões e regras aplicáveis à reserva, incluindo motivo, histórico e notificação existentes.

### 7.4. Movimentação de material

O responsável registra a retirada e, posteriormente, a devolução do material relacionado à reserva. Pendências, atrasos e ocorrências ficam disponíveis para acompanhamento e consulta histórica.

### 7.5. Administração de recurso e disponibilidade

O administrador cadastra ou atualiza um recurso, define bloqueios ou períodos de manutenção e consulta impactos na disponibilidade. A desativação ou manutenção de recursos não deve comprometer registros de reservas existentes ou futuras.

## 8. Cenários de exceção conhecidos

- Recurso indisponível ou já alocado no intervalo solicitado: a solicitação não deve resultar em alocação conflitante.
- Bloqueio administrativo ou manutenção no intervalo: o recurso deve ser tratado como indisponível para a verificação.
- Solicitação sujeita a aprovação: permanece dependente de decisão do responsável, sem ser tratada como aprovada antes dessa decisão.
- Alteração que cria conflito: deve ser impedida ou não confirmada, preservando a reserva vigente conforme regras a detalhar.
- Tentativa de ação sem permissão: deve ser negada e tratada de forma compatível com as políticas de segurança e auditoria a definir.
- Material não devolvido no prazo ou com ocorrência: deve permitir registro e acompanhamento da pendência.
- Exceção administrativa: requer controle e registro de auditoria; justificativa é registrada quando aplicável.

## 9. Segurança, integridade e auditoria

O produto deve observar controle de acesso por perfil e escopo de responsabilidade, proteger reservas de terceiros contra consulta ou alteração não autorizada e preservar a consistência da alocação. As verificações de conflito, bloqueio e manutenção devem ser aplicadas antes de confirmar operações que afetem a reserva.

As operações relevantes devem manter histórico rastreável, incluindo o usuário responsável, a data, a ação e os dados necessários para compreender a alteração. Aprovações, recusas, movimentações de materiais, ações administrativas e exceções devem ser incluídas no escopo de auditoria. O nível de detalhe, retenção e consulta desses registros será definido posteriormente.

## 10. Premissas, restrições e dependências

### Premissas

- Salas, professores e materiais são recursos passíveis de consulta de disponibilidade e associação a solicitações.
- Usuários terão uma persona e permissões compatíveis com sua atuação; possíveis acumulações de perfis ainda precisam ser definidas.
- As condições que caracterizam uma solicitação especial serão configuradas ou definidas pelo negócio em etapa posterior.

### Restrições

- O documento não antecipa tecnologia, arquitetura, interface, modelo de dados ou integração.
- A aplicação deve preservar a integridade histórica de reservas e movimentações, inclusive quando recursos forem desativados.
- As regras de disponibilidade e os bloqueios administrativos não podem ser ignorados por aprovação comum.
- Requisitos detalhados e critérios de aceitação não são definidos nesta versão, por orientação do solicitante.

### Dependências e definições pendentes

- Definir critérios e categorias de solicitações especiais e seus responsáveis pela aprovação.
- Definir prazos, antecedência mínima, duração, limites de reservas e demais regras de cancelamento ou alteração não cobertas pela regra de cancelamento por recurso acima.
- Definir estados e transições do ciclo de vida da solicitação.
- Definir escopo de delegação, acumulação de perfis e permissões detalhadas.
- Definir processo e prazos de retirada e devolução, incluindo tratamento de atrasos e ocorrências.
- Definir métricas de sucesso e respectivos valores-alvo.
- Elaborar requisitos funcionais, requisitos não funcionais e critérios de aceitação em etapa posterior.
- Identificar integrações ou dependências externas, se necessárias.

## 11. Requisitos e critérios de aceitação

**Pendente por orientação do solicitante.** Esta versão não cria requisitos funcionais ou não funcionais nem critérios de aceitação. A seção deverá ser detalhada em uma etapa posterior, após a confirmação do solicitante.

## 12. Histórico do documento

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-10-22 | 0.1 | Criação do rascunho com visão, escopo e personas; requisitos e critérios de aceitação adiados. | @pm |
| 2026-10-26 | 0.2 | Registra cancelamento parcial de reservas multi-recurso conforme horário de início de cada recurso e substitui a regra de cancelamento integral do pedido para esse caso. | @pm |
| 2026-11-09 | 0.3 | Registra que a UI web observacional é opcional, não obrigatória para o MVP, com base na arquitetura e nos requisitos de documentação de superfícies expostas. | @pm |