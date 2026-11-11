# Requisitos Não Funcionais

## 1. Escopo

Este documento registra os atributos de qualidade obrigatórios para o produto de gestão de disponibilidade e alocação descrito em [PRD](prd.md), complementando os requisitos funcionais em [Requisitos Funcionais](requisitos-funcionais.md). Abrange segurança e escopo de permissão, consistência e integridade, rastreabilidade, usabilidade e documentação dos pontos de interação públicos.

Os requisitos são verificáveis por inspeção e testes de comportamento, sem determinar arquitetura, tecnologia ou implementação. Metas quantitativas, plataformas e limiares não especificados são indicados como **a definir**; nenhum valor é presumido.

## 2. Termos e premissas

- **Perfil:** Solicitante, Responsável ou Administrador, com limites de acesso descritos na seção 5 do PRD.
- **Operação relevante:** operação que altera reservas, decisões, movimentações, cadastros, permissões, bloqueios ou trata exceções, conforme o escopo de auditoria do PRD.
- **Ponto de interação público:** API e/ou fluxo do sistema disponibilizado a usuários ou consumidores externos, conforme a forma de exposição que vier a ser definida.
- Os requisitos funcionais detalham as operações às quais estes atributos se aplicam. Os limiares de desempenho, disponibilidade, retenção, cobertura, plataformas-alvo e métricas de usabilidade permanecem a definir quando aplicáveis; este documento não introduz metas numéricas.

## 3. Requisitos

### NFR-01 — Segurança e escopo de permissão

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, requisitos não funcionais de segurança e escopo de permissão; PRD, seções 5, 8 e 9; requisito funcional FR-01.

O sistema deve aplicar autenticação e autorização por perfil e escopo de responsabilidade a consultas e operações. Tentativas não autorizadas de consultar ou alterar reservas, recursos ou dados administrativos devem ser negadas sem produzir a alteração solicitada. Os limites específicos dos perfis devem permanecer consistentes com o PRD e com as permissões atribuídas.

**Critérios de verificação:**
- Executar uma matriz de testes com operações permitidas e proibidas para os três perfis e verificar que os resultados respeitam os limites definidos.
- Tentar consultar ou alterar reservas de terceiros sem autorização e verificar que o acesso é negado e que os dados não são alterados.
- Verificar que usuários sem autorização não conseguem aprovar solicitações restritas nem contornar bloqueios de disponibilidade.
- Critérios quantitativos adicionais de segurança: a definir, caso sejam estabelecidos pelo produto.

### NFR-02 — Consistência e integridade das alocações

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, requisitos não funcionais de consistência/integridade inclusive concorrência; PRD, seções 6, 8 e 9; requisitos funcionais FR-04 a FR-08.

O sistema deve preservar a integridade das reservas diante de criação e alteração de solicitações, incluindo solicitações concorrentes. Uma operação não pode resultar em dupla reserva confirmada para o mesmo recurso em intervalo conflitante, inclusive para a agenda do professor, nem confirmar reserva que viole bloqueio ou manutenção aplicável.

**Critérios de verificação:**
- Testar solicitações simultâneas conflitantes para sala, professor e material e verificar que não há duas reservas confirmadas conflitantes.
- Testar criação e alteração diante de conflito ou bloqueio e verificar que a operação incompatível não é confirmada e que os dados válidos existentes são preservados.
- Verificar a consistência dos estados apresentados após sucesso, rejeição ou conflito, sem confirmação ambígua.
- Metas quantitativas de tempo de resposta ou volume concorrente: a definir.

### NFR-03 — Rastreabilidade e auditabilidade

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, requisitos não funcionais de rastreabilidade/auditabilidade; PRD, seções 5, 6 e 9; requisito funcional FR-10.

As operações relevantes devem manter registros que permitam identificar ator, data, ação e dados necessários para compreender a mudança e relacioná-la ao objeto afetado. A consulta ou manutenção desses registros deve respeitar as permissões aplicáveis, e o histórico não pode ser comprometido pela desativação de um recurso ou por mudanças posteriores.

**Critérios de verificação:**
- Executar operações relevantes nos domínios de reserva, aprovação, movimentação e administração e verificar a presença dos campos mínimos exigidos.
- Verificar que um auditor autorizado consegue relacionar os registros ao objeto afetado e compreender a mudança registrada.
- Verificar que alterações posteriores e desativação de recursos não removem nem corrompem o histórico associado.
- Prazo de retenção, tempo de consulta e metas quantitativas de auditoria: a definir.

### NFR-04 — Usabilidade, responsividade e mensagens de erro

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, item 13 e requisitos não funcionais de usabilidade; PRD, seções 1, 7 e 8.

As interfaces disponibilizadas pelo produto devem ser responsivas nos dispositivos e plataformas-alvo a definir. Mensagens de erro devem comunicar de forma compreensível o motivo observável da falha ou recusa e, quando aplicável, a ação necessária para prosseguir, sem revelar dados que o perfil não pode acessar.

**Critérios de verificação:**
- Verificar os fluxos públicos e de usuário nos dispositivos, plataformas e dimensões de tela que vierem a ser definidos, confirmando que o conteúdo e os controles necessários permanecem utilizáveis sem sobreposição ou perda de informação.
- Provocar erros de permissão, indisponibilidade, conflito e validação e verificar que as mensagens identificam a condição de forma compreensível e não expõem dados restritos.
- Métricas de usabilidade, critérios de acessibilidade, plataformas-alvo e dimensões de tela: a definir.

### NFR-05 — Documentação dos pontos de interação públicos

**Obrigatoriedade:** Obrigatório | **Origem:** Pedido, requisito não funcional de documentação de API/fluxos públicos; PRD, seções 4.2 e 7; requisito funcional FR-14.

Os pontos de interação efetivamente expostos pelo produto devem ter documentação correspondente: API, se houver, e/ou fluxos públicos, conforme a forma de exposição definida. A documentação deve refletir o comportamento disponível e permanecer coerente com ele.

**Critérios de verificação:**
- Identificar as APIs e/ou os fluxos públicos efetivamente expostos e verificar que cada um possui documentação correspondente.
- Conferir a documentação com o comportamento observável e identificar divergências, pontos documentados inexistentes ou pontos expostos sem documentação.
- Formato, localização, idioma, processo de atualização e nível de detalhe da documentação: a definir.

## 4. Decisões abertas e pendências

- Definir métricas-alvo e limiares de segurança, desempenho, capacidade concorrente, disponibilidade, auditoria e usabilidade, quando aplicáveis.
- Definir plataformas, dispositivos e dimensões de tela suportados.
- Definir critérios de acessibilidade e métricas de usabilidade, se aplicáveis ao produto.
- Definir escopo, prazo de retenção e regras de consulta dos registros de auditoria.
- Definir se o produto exporá API, fluxos públicos ou ambos, além do público consumidor e do nível de detalhe documental.
- Definir como os perfis e suas permissões serão atribuídos, delegados ou acumulados, respeitando os limites já descritos no PRD.