# Estudo de qualidade — sistema de agendamento de salas

Respostas baseadas na implementação atual em Node.js, nos testes do projeto e nos conceitos de avaliação arquitetural.

## 1. O que ATAM avalia e como difere de um teste funcional?

ATAM (*Architecture Tradeoff Analysis Method*) avalia decisões e estruturas da arquitetura em relação a atributos de qualidade, como desempenho, segurança, disponibilidade, modificabilidade e integridade. Ele identifica cenários, riscos, pontos sensíveis e conflitos entre atributos para ajudar a equipe a entender as consequências das decisões.

Um teste funcional verifica se uma funcionalidade produz o resultado esperado para uma entrada — por exemplo, se uma reserva conflitante é recusada. ATAM é uma avaliação de arquitetura e seus trade-offs; não é uma suíte de testes que prova o funcionamento do código.

## 2. Exemplo de risco, ponto sensível e trade-off

- **Risco:** duas solicitações simultâneas para a mesma sala e horário serem confirmadas, causando dupla reserva.
- **Ponto sensível:** o mecanismo e o escopo da transação em torno da verificação de disponibilidade e da gravação. Se a verificação ocorrer fora da transação, há uma janela para outra solicitação gravar antes.
- **Trade-off:** `BEGIN IMMEDIATE` no SQLite serializa escritores e ajuda a proteger a integridade, mas pode reduzir a vazão de escritas concorrentes. O nível aceitável depende da carga esperada, que ainda não está definida.

## 3. Por que horários contíguos não conflitam? Como testar a fronteira?

O projeto trata os intervalos como semiabertos, `[início, fim)`: o início pertence ao intervalo e o fim não. Assim, uma reserva das 10h às 11h e outra das 11h às 12h apenas se tocam. A consulta de sobreposição usa `inicio_existente < fim_novo` e `fim_existente > inicio_novo`; a igualdade em uma das fronteiras não é conflito.

Os testes exercitam a fronteira pela API em `test.js` e diretamente em `test-white.js`: criar reservas contíguas deve ter sucesso, enquanto uma reserva que começa antes do término da primeira e termina depois deve receber conflito (HTTP 409 na API). Também se deve testar o caso inverso, em que a reserva nova termina exatamente quando a existente começa, e os limites inválidos, como início igual ao fim.

## 4. Diferença entre caixa preta e caixa branca; um teste de cada

Na **caixa preta**, verifica-se o comportamento pela interface pública, sem depender das funções internas. Exemplo: `test.js` envia cinco requisições simultâneas para reservar a mesma sala e verifica que uma é aceita e as outras recebem HTTP 409.

Na **caixa branca**, os testes conhecem e exercitam estruturas internas. Exemplo: `test-white.js` chama `validar()` diretamente para confirmar que intervalos contíguos são aceitos e sobreposições são rejeitadas.

## 5. Por que um teste de concorrência é importante para reservas?

Requisições concorrentes podem executar a sequência “consultar disponibilidade, depois gravar” quase ao mesmo tempo. Sem coordenação atômica, ambas podem observar a sala livre e confirmar horários incompatíveis. O teste concorrente verifica que, mesmo sob disputa, no máximo uma reserva conflitante é confirmada e as demais recebem uma resposta de conflito. O teste atual simula cinco requisições simultâneas pela API.

## 6. Como transação e auditoria ajudam na integridade?

A transação agrupa a alteração de negócio e o registro de auditoria. Se uma etapa falhar, o rollback desfaz as gravações daquele conjunto, evitando que a reserva mude sem o respectivo registro (ou que fique um registro de uma operação que não foi concluída). O projeto usa `BEGIN IMMEDIATE` para coordenar escritores SQLite e chama a auditoria no fluxo transacional. O teste de caixa branca também verifica que uma exceção provoca rollback.

Isso garante atomicidade dessas gravações locais; não define, por si só, retenção, imutabilidade administrativa ou política de recuperação da auditoria.

## 7. O que a CI faz num pull request? O que faz o workflow falhar?

Uma CI configurada para pull requests baixa o código, prepara a versão do Node, instala dependências e executa verificações automatizadas — por exemplo, `npm test`. Se os passos obrigatórios terminarem com erro, o workflow fica com falha e pode bloquear a aprovação ou integração conforme as regras do repositório.

**Neste repositório não há workflow em `.github/workflows`**; o exemplo de GitHub Actions em `docs/guia-estudo-qualidade.md` é apenas sugestão. Portanto, atualmente não há CI local do projeto que execute esses passos automaticamente ao receber um PR. Num workflow como o exemplo, falha se instalação ou testes retornarem código diferente de zero, ou se outro passo obrigatório falhar.

## 8. Função de JUnit 5, JaCoCo e SonarCloud; limitação neste projeto Node

- **JUnit 5:** framework Java para organizar e executar testes automatizados e validar resultados.
- **JaCoCo:** ferramenta Java que coleta e relata cobertura de instruções, linhas, métodos e desvios durante a execução.
- **SonarCloud / SonarQube Cloud:** analisa código e pode importar um relatório de cobertura produzido por ferramenta compatível; não substitui a execução dos testes nem gera a cobertura por si só.

A limitação é de linguagem e integração: o projeto é JavaScript em Node.js e não usa JUnit 5 nem JaCoCo diretamente. Para cobertura, ferramentas do ecossistema JavaScript como `c8` podem gerar LCOV; a análise precisa ser configurada para JavaScript e para importar esse formato. No estado atual, não há essas ferramentas nem configuração de SonarCloud no projeto.

## 9. O que WireMock simula e quando seria útil?

WireMock simula um serviço HTTP externo: permite definir respostas para requisições e verificar quais chamadas a aplicação fez. Seria útil se o sistema passasse a integrar um provedor externo de e-mail, calendário ou notificações, para testar sucesso, timeout, erros HTTP e respostas inválidas sem depender do serviço real.

Hoje as notificações são gravadas localmente na tabela `notificacoes`; não há chamada HTTP de saída. Por isso WireMock não é necessário para os testes atuais.

## 10. Autenticação, autorização, HTTP 401, 403 e 409

- **Autenticação:** verifica quem está fazendo a requisição; no projeto, o login fornece um token Bearer.
- **Autorização:** verifica quais operações e dados aquela identidade pode acessar, de acordo com perfil e escopo.
- **HTTP 401 — Unauthorized:** a requisição não tem credenciais válidas, como token ausente/inválido ou login inválido.
- **HTTP 403 — Forbidden:** a identidade foi reconhecida, mas não tem permissão para a operação; por exemplo, solicitante tentando decidir uma reserva ou consultar auditoria.
- **HTTP 409 — Conflict:** a operação conflita com o estado atual dos dados; por exemplo, horário já reservado ou bloqueado.

## 11. Cobertura de 100% garante ausência de bugs?

Não. Cobertura de 100% indica que as linhas ou desvios medidos foram executados pelos testes, mas não garante que os testes tenham asserts adequados, que todas as combinações de entradas e estados tenham sido consideradas, nem que os requisitos estejam corretos. Ainda podem existir erros de regra, concorrência, integração, segurança ou comportamento não representado nos cenários. Cobertura ajuda a encontrar trechos não exercitados; qualidade dos cenários e revisão continuam necessárias.

## 12. Como IA agêntica pode ajudar na avaliação ATAM e o que exige validação humana?

Uma IA agêntica pode organizar requisitos e decisões existentes, propor cenários de qualidade, apontar riscos e trade-offs, relacionar cenários a componentes, sugerir perguntas para stakeholders e localizar evidências no código e nos testes. Também pode ajudar a manter rastreabilidade e produzir um resumo da avaliação.

Pessoas precisam validar se os cenários refletem as prioridades reais, se as premissas e evidências estão corretas, se os trade-offs são aceitáveis e se as recomendações respeitam regras de negócio e restrições organizacionais. A IA pode omitir contexto, inventar pressupostos ou tratar uma proposta como decisão aprovada; suas conclusões não substituem a decisão dos responsáveis pela arquitetura e pelo produto.

## Referências do projeto

- [Implementação do servidor](./server.js)
- [Testes de API (caixa preta)](./test.js)
- [Testes internos (caixa branca)](./test-white.js)
- [Documentação dos testes](./docs/testes.md)
- [Guia de estudo de qualidade](./docs/guia-estudo-qualidade.md)

