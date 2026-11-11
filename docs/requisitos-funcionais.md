# Requisitos Funcionais

**Versão:** 0.1.1

## 1. Escopo

Este documento detalha os requisitos funcionais do produto de gestão de disponibilidade e alocação de salas, professores e materiais descrito em [PRD](prd.md). Abrange consulta e administração de recursos, reservas, aprovações, movimentações de materiais, auditoria, notificações, relatórios e documentação dos pontos de interação expostos pelo produto.

Os requisitos abaixo são obrigatórios. Este documento não define arquitetura, tecnologia, modelo de dados, interface técnica ou implementação. Regras de negócio ainda não definidas no PRD permanecem como pendências, sem serem presumidas aqui.

## 2. Termos e premissas

- **Recurso:** sala, professor ou material/equipamento que pode ser consultado e associado a uma reserva.
- **Solicitante:** usuário que consulta disponibilidade e gerencia as próprias solicitações, respeitando suas permissões.
- **Responsável:** usuário autorizado a tratar solicitações especiais e atividades sob sua responsabilidade, incluindo validações e movimentações de materiais.
- **Administrador:** usuário autorizado a administrar cadastros, usuários, perfis, permissões, bloqueios, auditoria e relatórios.
- **Reserva confirmada:** reserva que passou pelas verificações e aprovações obrigatórias aplicáveis. Os estados e transições detalhados ainda serão definidos.
- Os limites de acesso por perfil seguem a seção 5 do PRD. A granularidade final, delegações e acumulação de perfis continuam pendentes.
- A origem de cada requisito identifica o item correspondente deste pedido e a seção pertinente do PRD; quando o pedido explicita um detalhe ainda não escrito no PRD, ele é tratado como complemento autorizado do escopo, não como decisão técnica.

## 3. Requisitos

### FR-01 — Autenticação e autorização por perfil

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 1; PRD, seções 5, 9 e 10.

O sistema deve autenticar usuários e autorizar cada consulta ou operação conforme o perfil e as permissões atribuídas: Solicitante, Responsável ou Administrador. Deve respeitar os limites do PRD: o Solicitante não consulta nem altera reservas de terceiros sem autorização; o Responsável atua somente no escopo autorizado e não aprova violações de disponibilidade ou bloqueios; ações administrativas do Administrador permanecem sujeitas a auditoria e não podem comprometer registros históricos.

**Critérios de verificação:**
- Com uma sessão autenticada de cada perfil, verificar que as operações permitidas no respectivo escopo podem ser executadas.
- Verificar que operações fora do escopo são negadas e não alteram dados.
- Verificar que um Solicitante não acessa reservas de terceiros sem autorização e que um Responsável não aprova uma solicitação incompatível com disponibilidade ou bloqueio.

### FR-02 — Cadastro e consulta de recursos

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 2; PRD, seções 4.1, 5.3 e 7.5.

O sistema deve permitir cadastrar e consultar salas, professores e materiais. A criação e a alteração de cadastros devem respeitar as permissões administrativas; a consulta deve respeitar o escopo de acesso de cada perfil. A desativação ou manutenção de um recurso não deve apagar ou comprometer registros de reservas e movimentações relacionados.

**Critérios de verificação:**
- Cadastrar e consultar ao menos um registro de cada tipo de recurso, com perfis autorizados.
- Verificar que um perfil sem permissão administrativa não consegue criar ou alterar cadastros.
- Desativar um recurso associado a registros e verificar que o histórico relacionado permanece consultável.

### FR-03 — Pesquisa de recursos

**Obrigatoriedade:** Obrigatório | **Status no incremento atual:** o filtro por capacidade está explicitamente adiado e não faz parte deste incremento. A intenção de oferecer esse filtro em incremento futuro permanece; sua semântica e seus critérios de verificação ainda dependem de decisão do produto. | **Origem:** Pedido, item 3; PRD, seções 3, 4.1, 5 e 7.1.

Neste incremento, o sistema deve permitir pesquisar recursos por tipo, localização, competência e disponibilidade. Os resultados devem corresponder aos critérios informados e não devem expor reservas ou dados fora das permissões do usuário. O filtro por capacidade permanece parte da intenção futura do requisito, mas não deve ser interpretado ou implementado neste incremento; não se presume aqui o significado de capacidade, sua representação ou sua aplicabilidade aos tipos de recurso.

**Critérios de verificação:**
- Executar pesquisas usando cada critério incluído neste incremento e combinações aplicáveis aos recursos cadastrados.
- Comparar os resultados com os atributos e a disponibilidade registrados para confirmar que atendem aos filtros incluídos neste incremento.
- Verificar que os resultados respeitam o escopo de acesso do perfil utilizado.
- O filtro por capacidade não é critério de aceite deste incremento; seus critérios serão definidos quando o produto decidir a semântica para implementação futura.

### FR-04 — Criação, alteração e cancelamento de reservas

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 4; PRD, seções 4.1, 5, 6 e 7.1–7.3; decisão de produto de 2026-10-26.

O sistema deve permitir criar, alterar e cancelar reservas conforme as permissões do usuário e as regras aplicáveis. O Solicitante pode gerenciar as próprias reservas dentro das regras; terceiros só podem atuar quando autorizados. A alteração deve verificar novamente disponibilidade e bloqueios antes de ser confirmada. A reserva vigente deve ser preservada quando uma alteração incompatível não puder ser confirmada. Em uma reserva com múltiplos recursos, a elegibilidade para cancelamento é avaliada por recurso no momento da solicitação: somente recursos cujo horário de início ainda não chegou podem ser cancelados; recursos cujo início já chegou permanecem ativos e não impedem o cancelamento dos demais recursos elegíveis. Não se exige cancelar todos os recursos do pedido para cancelar os elegíveis. Mantêm-se o motivo, o histórico e a notificação previstos para cancelamentos, bem como as regras de autorização existentes.

**Critérios de verificação:**
- Criar, alterar e cancelar uma reserva com um perfil autorizado e verificar o estado resultante e o registro da ação.
- Tentar alterar ou cancelar reserva fora do escopo do perfil e verificar que a ação é negada sem alteração da reserva.
- Alterar uma reserva para intervalo ou recurso incompatível e verificar que a alteração não é confirmada e que a reserva vigente permanece preservada.
- Em uma reserva multi-recurso com horários de início futuros e já alcançados, cancelar os recursos ainda não iniciados e verificar que somente esses são cancelados; os já iniciados permanecem ativos e não impedem a ação.
- Verificar que o cancelamento dos recursos elegíveis mantém motivo, histórico e notificação previstos para cancelamentos.

### FR-05 — Detecção de sobreposição de horário

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 5; PRD, seções 6, 7.1, 7.3, 8 e 9.

Antes de confirmar uma criação ou alteração, o sistema deve detectar sobreposição de horário para qualquer recurso associado à reserva, inclusive a agenda do professor, e impedir a confirmação conflitante. A verificação também deve considerar reservas existentes e bloqueios aplicáveis.

**Critérios de verificação:**
- Tentar confirmar duas reservas com horários sobrepostos para a mesma sala, para o mesmo professor e para o mesmo material; verificar que nenhuma segunda alocação conflitante é confirmada.
- Repetir a verificação em uma alteração de reserva e verificar que a operação conflitante não é confirmada.
- Verificar que intervalos sem sobreposição não são tratados como conflito, conforme a regra de limites de intervalo que vier a ser definida.

### FR-06 — Integridade sob solicitações simultâneas

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 6; PRD, seções 3, 6, 8 e 9.

O sistema deve impedir dupla reserva quando solicitações simultâneas tentarem alocar o mesmo recurso em intervalos conflitantes. O resultado deve preservar a regra de não haver alocações confirmadas conflitantes, sem prescrever mecanismo técnico.

**Critérios de verificação:**
- Submeter solicitações simultâneas para o mesmo recurso e intervalo conflitante.
- Verificar que no máximo uma solicitação resulta em reserva confirmada e que nenhuma combinação de resultados deixa duas reservas confirmadas conflitantes.
- Verificar que as demais solicitações recebem resultado compatível com a indisponibilidade, sem estado ambíguo de confirmação.

### FR-07 — Aprovação de recursos restritos

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 7; PRD, seções 5.1–5.2, 6, 7.1–7.2 e 8.

Solicitações de recursos classificados como restritos devem exigir aprovação de um Responsável autorizado. A aprovação deve ocorrer antes da confirmação da reserva. Uma solicitação pendente ou rejeitada não pode ser apresentada como reserva confirmada.

**Critérios de verificação:**
- Solicitar um recurso classificado como restrito e verificar que a reserva não é confirmada antes da decisão do Responsável autorizado.
- Aprovar a solicitação com um Responsável autorizado e verificar que ela só então pode seguir para confirmação, sujeita às demais verificações.
- Tentar aprovar com usuário sem autorização e verificar que a ação é negada e registrada conforme os requisitos de auditoria.

### FR-08 — Bloqueio por manutenção

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 8; PRD, seções 4.1, 5.3, 6, 7.5 e 8.

O sistema deve considerar bloqueios administrativos e períodos de manutenção na disponibilidade e impedir a confirmação de reserva de recurso bloqueado no intervalo correspondente. Uma aprovação não pode ignorar o bloqueio.

**Critérios de verificação:**
- Registrar ou configurar um bloqueio/período de manutenção para um recurso e verificar que ele aparece indisponível no intervalo abrangido.
- Tentar reservar o recurso durante o bloqueio e verificar que a confirmação é impedida.
- Verificar que a aprovação de uma solicitação não permite contornar o bloqueio.

### FR-09 — Registro de retirada e devolução

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 9; PRD, seções 4.1, 5.2, 6 e 7.4.

O sistema deve permitir que Responsáveis autorizados registrem e consultem a retirada e a devolução de materiais e equipamentos associados às reservas. Os registros devem permitir acompanhar pendências, atrasos e ocorrências sem perder o vínculo com o recurso e a reserva pertinentes.

**Critérios de verificação:**
- Registrar a retirada e a devolução de um material/equipamento e consultar os registros associados ao item e à reserva.
- Verificar que um usuário sem permissão não registra movimentações.
- Registrar uma pendência ou ocorrência e verificar que ela pode ser consultada para acompanhamento.

### FR-10 — Histórico de auditoria

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 10; PRD, seções 5, 6 e 9.

O sistema deve manter histórico rastreável das mudanças e operações relevantes, incluindo, no mínimo, ator, data, ação e dados necessários para identificar e compreender o que mudou. O histórico deve abranger reservas, decisões de aprovação ou recusa, movimentações de materiais, ações administrativas e exceções operacionais, conforme aplicável.

**Critérios de verificação:**
- Executar uma alteração de reserva, uma decisão de aprovação/recusa, uma movimentação e uma ação administrativa; verificar que cada operação gera registro com ator, data, ação e dados pertinentes.
- Consultar os registros e verificar que é possível relacioná-los ao objeto afetado e reconstruir a mudança relevante.
- Verificar que uma alteração ou desativação de recurso não apaga o histórico associado.

### FR-11 — Notificações de eventos

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 11; PRD, seções 5.1, 7.1–7.3 e 8.

O sistema deve comunicar ao solicitante eventos relevantes da solicitação, incluindo aprovação, recusa, alteração e cancelamento. A forma de produto permanece pendente: notificações simuladas ou integração a uma API externa são alternativas ainda não decididas; este requisito não escolhe uma delas.

**Critérios de verificação:**
- Gerar aprovação, recusa, alteração e cancelamento e verificar que cada evento produz a comunicação correspondente ao solicitante.
- Verificar que a comunicação corresponde ao estado efetivo da solicitação e não anuncia aprovação antes da decisão necessária.
- Validar o comportamento conforme a alternativa de produto que vier a ser escolhida, sem presumir integração ou tecnologia nesta especificação.

### FR-12 — Relatório de utilização e conflitos evitados

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 12; PRD, seções 2, 4.1 e 5.3.

O sistema deve disponibilizar relatório de utilização por recurso, horas alocadas e conflitos evitados. A fórmula, o período de apuração, os filtros e a apresentação do indicador de conflitos evitados permanecem a definir.

**Critérios de verificação:**
- Gerar relatório para recursos com reservas registradas e verificar que apresenta utilização por recurso e horas alocadas.
- Verificar que o relatório contempla o indicador de conflitos evitados, sem validar uma fórmula ainda não acordada.
- Após definição das regras de cálculo, comparar os valores apresentados com um conjunto de dados de referência aprovado pelo produto.

### FR-14 — Documentação dos pontos de interação expostos

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 14; PRD, seções 4.2, 7 e 10.

O produto deve documentar sua API, caso exponha uma, ou os fluxos públicos do sistema, conforme a forma de exposição que vier a ser definida. A documentação deve corresponder ao comportamento disponibilizado ao público consumidor e não pressupõe que uma API será criada.

**Critérios de verificação:**
- Identificar a forma de interação pública efetivamente exposta pelo produto.
- Verificar que a documentação correspondente descreve os pontos de interação e seus resultados observáveis, e que não documenta como disponível um fluxo ou interface inexistente.
- Se houver API exposta, verificar que seus recursos e comportamentos públicos estão documentados; caso contrário, verificar a documentação dos fluxos públicos aplicáveis.

## 4. Decisões abertas e pendências

- Definir a granularidade de permissões, delegações e acumulação de perfis.
- Definir critérios para classificar recursos restritos, responsáveis autorizados e condições de aprovação.
- Definir estados e transições das solicitações e as regras de criação, alteração e cancelamento, incluindo prazos e limites.
- Definir regras para limites dos intervalos de horário e demais parâmetros necessários à validação de sobreposição.
- Escolher entre notificações simuladas e integração a uma API externa, e definir eventos, conteúdo e destinatários aplicáveis.
- Definir fórmula, período, filtros e apresentação do indicador de conflitos evitados e dos demais dados do relatório.
- Definir se o produto exporá API, fluxos públicos ou ambos, e o público consumidor pertinente.
- Definir os dados e prazos operacionais de retirada/devolução e o tratamento de atrasos e ocorrências.
- Definir critérios de aceitação detalhados que dependam das decisões acima.
- Definir a semântica do filtro por capacidade de FR-03 e seus critérios de verificação para um incremento futuro.

## 5. Histórico de versões

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-10-26 | 0.1.0 | Versão inicial identificada do documento; registra a decisão de adiar o filtro por capacidade de FR-03 do incremento atual, mantendo sua intenção futura e sem definir sua semântica. | @pm |
| 2026-10-26 | 0.1.1 | Especifica cancelamento por recurso em reservas multi-recurso: recursos ainda não iniciados podem ser cancelados sem cancelar os já iniciados; preserva autorização, motivo, histórico e notificação. | @pm |