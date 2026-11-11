# Guia de estudo: arquitetura, testes e qualidade

Este guia usa como exemplo o sistema de agendamento de salas deste repositório. A ideia é ajudar a explicar os conceitos na chamada oral e relacioná-los ao código existente.

## 1. Resumo do sistema

O projeto é uma aplicação web pequena, feita em Node.js sem dependências externas. O servidor HTTP em [`server.js`](../server.js) serve a interface e uma API REST. A API aplica autenticação por token Bearer, autorização por perfil e regras para salas, reservas, bloqueios, aprovações, auditoria e notificações simuladas. Os dados ficam em SQLite, usando `node:sqlite`.

As regras importantes incluem:

- Reservas usam intervalos semiabertos `[início, fim)`: uma reserva que termina às 11h não conflita com outra que começa às 11h.
- Sala restrita gera reserva pendente, que precisa de decisão de um responsável.
- Bloqueios e reservas confirmadas impedem nova reserva no mesmo período.
- A operação de escrita e seu registro de auditoria usam uma transação.
- `BEGIN IMMEDIATE` serializa escritores SQLite, reduzindo a chance de duas requisições confirmarem o mesmo horário.

O projeto tem testes de API em [`test.js`](../test.js) e testes das funções internas em [`test-white.js`](../test-white.js). A documentação de execução está em [`testes.md`](./testes.md).

## 2. ATAM: avaliação de arquitetura por trade-offs

ATAM significa *Architecture Tradeoff Analysis Method*. É um método do Software Engineering Institute da Carnegie Mellon University para avaliar decisões de arquitetura diante de atributos de qualidade concorrentes. Ele procura riscos, pontos sensíveis e trade-offs; não é um teste funcional e não prova que o sistema está correto. O resultado depende de cenários concretos e da participação de partes interessadas. [SEI: ATAM](https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-atam/) · [Artigo original do SEI](https://insights.sei.cmu.edu/library/the-architecture-tradeoff-analysis-method-2/)

### Aplicação resumida ao agendamento

**Objetivo de negócio:** permitir que solicitantes encontrem e reservem salas sem conflito, respeitando permissões e períodos de manutenção.

| Atributo | Cenário de qualidade | Decisão atual | Risco ou trade-off a discutir |
|---|---|---|---|
| Concorrência | Cinco pedidos chegam ao mesmo tempo para a mesma sala e horário; somente um deve confirmar. | Transação SQLite com `BEGIN IMMEDIATE` e validação de conflito. | SQLite atende bem a uma instalação pequena; vários processos ou maior volume podem exigir outro banco e estratégia de concorrência. |
| Segurança | Solicitante tenta ler auditoria ou decidir solicitação alheia. | Rotas exigem autenticação e perfil; operações de reserva verificam o proprietário. | O mapa de sessões está em memória: reiniciar o processo invalida sessões e múltiplas instâncias não compartilham tokens. |
| Integridade | Responsável aprova reserva que passou a coincidir com um bloqueio. | A aprovação revalida disponibilidade dentro de transação. | Regras de negócio precisam continuar centralizadas e chamadas de aprovação devem ser testadas com bloqueio e concorrência. |
| Modificabilidade | Surge um novo perfil ou regra de disponibilidade. | Rotas, validação e acesso ao SQLite estão no mesmo arquivo. | Simplicidade atual reduz configuração, mas o arquivo concentrado pode dificultar manutenção conforme o sistema cresce. |
| Auditabilidade | Uma reserva é criada e precisa deixar registro correspondente. | Auditoria é gravada na transação da operação. | Atomicidade impede registro sem operação confirmada (e vice-versa), mas é necessário definir retenção e acesso aos logs. |
| Disponibilidade | O servidor ou processo reinicia. | Servidor Node único e banco local. | Baixo custo e simplicidade; não há redundância ou recuperação distribuída. |

Um cenário ATAM deve ser específico. Por exemplo: “Durante uma rajada de 20 pedidos simultâneos para a mesma sala, em até 2 segundos o sistema responde a todos, confirma no máximo um pedido por intervalo e registra cada conflito evitado”. O cenário aponta atributos mensuráveis, decisões envolvidas e como investigar a arquitetura.

### Termos para a chamada

- **Risco:** decisão que pode impedir um atributo de qualidade. Ex.: sessões em memória são um risco para operar com várias instâncias.
- **Não risco:** decisão analisada que parece apropriada para o contexto assumido. Ex.: SQLite pode ser adequado para uma aplicação acadêmica pequena, desde que volume e implantação sejam modestos.
- **Ponto sensível:** parâmetro cuja alteração pode afetar muito a qualidade. Ex.: serialização dos escritores pode afetar latência quando aumentam os pedidos concorrentes.
- **Trade-off:** uma decisão melhora uma qualidade e pode prejudicar outra. Ex.: transação para proteger integridade pode aumentar espera sob carga.
- **Árvore de utilidade:** organiza atributos de qualidade e os detalha em cenários priorizados por importância e dificuldade/risco.

## 3. Planejamento de casos de teste

Planejar testes começa por transformar requisitos em cenários verificáveis. Para cada caso, registre: identificador, requisito, pré-condições, dados, passos, resultado esperado, prioridade e resultado obtido. Um bom resultado esperado é observável, por exemplo “HTTP 409 e nenhuma segunda reserva confirmada”, em vez de “o sistema funciona”.

### Técnicas de projeto

- **Particionamento em classes de equivalência:** agrupar entradas que devem ter o mesmo comportamento. Para horários: formato válido, formato inválido, fim antes do início, intervalo disponível e intervalo conflitante.
- **Análise de valor-limite:** testar nas bordas. Ex.: início exatamente no fim da reserva existente deve ser aceito; início um minuto antes deve conflitar.
- **Tabela de decisão:** combinar condições e resultados. Ex.: perfil (solicitante/responsável/admin), sala restrita, bloqueio presente e justificativa fornecida.
- **Transição de estados:** validar caminhos permitidos de uma reserva: pendente → confirmada/rejeitada; confirmada/pendente → cancelada; estado encerrado não pode ser alterado novamente.
- **Teste baseado em risco:** priorizar concorrência, autorização, bloqueios e transações, pois falhas ali podem gerar reserva duplicada ou acesso indevido.

### Exemplos de casos para este sistema

| Caso | Preparação e entrada | Resultado esperado | Técnica |
|---|---|---|---|
| CT-01 Reserva normal | Solicitante autenticado; sala ativa e livre; período válido. | HTTP 200 e status `confirmada`. | Caminho principal / caixa preta |
| CT-02 Período inválido | `fim` igual ou anterior a `início`. | HTTP 400; não cria reserva. | Valor-limite |
| CT-03 Horários contíguos | Reserva A termina às 11h; reserva B começa às 11h. | B pode ser criada. | Limite de intervalo |
| CT-04 Sobreposição | A reserva 10h–11h; tentar 10h30–11h30. | HTTP 409; nenhuma duplicidade. | Partição de conflito |
| CT-05 Concorrência | Enviar cinco pedidos iguais ao mesmo tempo. | Uma resposta de sucesso e quatro conflitos. | Concorrência / integração |
| CT-06 Sala restrita | Criar reserva em sala restrita. | Status inicial `pendente`; solicitante não pode aprovar. | Tabela de decisão / autorização |
| CT-07 Bloqueio | Criar bloqueio 9h–12h e tentar reserva 10h–11h. | HTTP 409. | Partição de indisponibilidade |
| CT-08 Auditoria transacional | Forçar falha durante transação de escrita. | A alteração e a auditoria da mesma transação são revertidas. | Caixa branca / transação |

## 4. Caixa preta versus caixa branca

**Caixa preta** testa o comportamento visível sem depender da implementação interna. No projeto, [`test.js`](../test.js) faz chamadas HTTP e verifica status, corpo e regras de acesso. Isso simula melhor o uso da API e permite refatorar detalhes internos sem reescrever todos os testes.

**Caixa branca** usa conhecimento do código, funções, decisões e caminhos internos. Em [`test-white.js`](../test-white.js), os testes chamam `validar`, `confere` e `tx` diretamente. Assim é possível cobrir rapidamente entradas inválidas, ramificações e rollback.

Os dois tipos se complementam. Caixa branca pode cobrir uma condição interna difícil de alcançar em um teste grande; caixa preta demonstra que o sistema inteiro expõe o comportamento correto. Cobertura alta não significa ausência de bugs: testes podem percorrer uma linha sem verificar se o resultado está correto.

No estado atual, o módulo expõe `server._internals` para a suíte branca. Isso é útil em um projeto didático, mas em uma aplicação maior pode ser melhor separar regras em módulos e exportar as funções de domínio sem expor detalhes de infraestrutura.

## 5. Arquitetura e análise ATAM com IA agêntica

Uma IA agêntica pode ajudar a preparar uma avaliação ATAM dividindo o trabalho em papéis especializados, por exemplo:

1. **Agente de arquitetura:** identifica componentes, fluxos e decisões a partir do código e da documentação.
2. **Agente de qualidade:** propõe cenários de segurança, concorrência, desempenho, disponibilidade e manutenção.
3. **Agente de testes:** transforma cenários em casos com entradas e resultados esperados.
4. **Agente crítico:** procura suposições não comprovadas, riscos esquecidos e contradições entre requisitos, código e testes.
5. **Revisor humano:** valida fatos, prioriza cenários e decide se o risco é aceitável.

Um fluxo útil é: fornecer requisitos e arquitetura → pedir cenários com estímulo/ambiente/resposta → relacionar cada cenário a componentes e decisões → identificar risco, ponto sensível e trade-off → propor teste ou experimento que reduza a incerteza → revisar tudo com uma pessoa responsável.

Exemplo de prompt: “Analise o fluxo de criação de reserva. Gere cenários ATAM para concorrência e segurança com estímulo, ambiente, resposta mensurável, componentes envolvidos, risco, evidência no código e uma pergunta que ainda precise de validação humana. Não assuma que o teste existente prova comportamento que ele não verifica.”

IA pode acelerar leitura, gerar hipóteses e localizar caminhos de teste; ela não substitui entrevistas com stakeholders, execução de carga, inspeção de produção nem julgamento arquitetural. Uma recomendação da IA é hipótese até ser confirmada por evidência. Não envie tokens, dados pessoais ou segredos a ferramentas sem autorização e controle adequados.

## 6. Gestão de erros e bugs

Uma **falha** é o comportamento observado incorreto; um **defeito/bug** é a causa no código ou projeto. Exemplo: duas reservas conflitantes são confirmadas (falha); a causa pode ser uma verificação de disponibilidade fora de uma transação segura (defeito).

### Registro mínimo de bug

- Título curto e ambiente (versões de Node, sistema operacional e commit).
- Pré-condições e dados usados, sem senhas ou tokens reais.
- Passos exatos para reproduzir.
- Resultado esperado e resultado observado, incluindo status HTTP e mensagem.
- Frequência, impacto, prioridade/severidade e evidência (log sanitizado ou captura).
- Requisito e teste relacionado.

### Fluxo recomendado

1. Reproduzir e confirmar que o defeito não é um dado de teste inválido.
2. Classificar impacto (segurança, integridade, indisponibilidade, inconveniência) e urgência.
3. Encontrar a causa raiz, corrigir e adicionar um teste de regressão que falharia antes da correção.
4. Executar a suíte relevante e a suíte completa.
5. Revisar e fechar com referência à correção e evidência.

Para este sistema, exemplos de alta prioridade seriam: usuário acessar reserva de outra pessoa, duas reservas sobrepostas confirmadas, aprovação ignorar bloqueio ou alteração persistir sem auditoria. Uma mensagem clara ajuda a pessoa usuária; detalhes técnicos devem ir para logs controlados, evitando revelar dados sensíveis na resposta.

## 7. Testes automatizados em CI com GitHub Actions

**Integração contínua (CI)** executa verificações automaticamente a cada push ou pull request. O objetivo é encontrar regressões cedo e tornar o resultado reproduzível. GitHub Actions define workflows YAML em `.github/workflows`; os passos podem repetir comandos usados localmente, como `npm test`. [GitHub: Node.js com Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) · [GitHub: CI](https://docs.github.com/en/actions/get-started/continuous-integration)

Exemplo para este projeto (arquivo `.github/workflows/testes.yml`):

```yaml
name: Testes

on:
  push:
  pull_request:

jobs:
  testes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: '22.13'
          cache: npm
      - run: npm ci
      - run: npm test
```

O workflow acima é uma sugestão de estudo; não foi adicionado ao repositório. `npm ci` instala exatamente o que consta no lockfile. Como os testes atuais usam SQLite em memória, não dependem do `agenda.db` local. Para uso real, também se deve definir permissões mínimas do workflow, proteger segredos, revisar actions de terceiros e evitar executar código não confiável com tokens privilegiados.

## 8. JUnit 5 + JaCoCo + SonarCloud

Este tópico costuma ser ensinado no ecossistema **Java**, mas o sistema deste repositório está em **JavaScript/Node.js**. Portanto, JUnit 5 e JaCoCo não executam diretamente os testes atuais. Essa distinção é importante na apresentação: explique o fluxo dessas ferramentas como conteúdo da disciplina e depois compare com equivalentes aplicáveis ao projeto.

### Função de cada ferramenta

- **JUnit 5:** framework Java para escrever e executar testes. `@Test` marca um teste, `Assertions` verifica resultados e `@BeforeEach`/`@AfterEach` controlam preparação e limpeza. O JUnit 5 é composto por JUnit Platform, Jupiter e Vintage. [Guia oficial JUnit 5](https://docs.junit.org/5.10.0/user-guide/index.html)
- **JaCoCo:** agente e ferramenta Java que observa execução e gera relatórios de cobertura de instruções, linhas, métodos e branches. Cobertura mostra o que foi executado; não mede se os asserts são bons. [Documentação JaCoCo](https://www.jacoco.org/jacoco/trunk/doc/) · [JaCoCo Maven Plugin](https://www.jacoco.org/jacoco/trunk/doc/maven.html)
- **SonarCloud / SonarQube Cloud:** plataforma de análise que importa relatório de cobertura produzido por outra ferramenta; ela não executa os testes nem gera a cobertura. Para Java, o scanner importa o XML JaCoCo configurado no pipeline. [Visão geral de cobertura SonarQube Cloud](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/overview)

Fluxo típico Java: `JUnit executa testes → JaCoCo coleta execução e grava XML → scanner analisa código e importa XML → CI informa aprovação ou falha`.

Um teste JUnit conceitual para o limite de horário seria:

```java
@Test
void horariosContiguosNaoConflitam() {
    boolean conflita = reservaService.conflita(
        "2030-01-01T10:00", "2030-01-01T11:00",
        "2030-01-01T11:00", "2030-01-01T12:00"
    );

    assertFalse(conflita);
}
```

No sistema Node atual, os equivalentes seriam `node:test` (ou outro runner JavaScript), `c8`/Istanbul para cobertura e importação de LCOV pelo SonarQube Cloud. Não se deve misturar relatórios Java JaCoCo com código JavaScript. A plataforma de análise recebe o formato adequado à linguagem. [Sonar: cobertura de código](https://www.sonarsource.com/blog/how-sonarqube-coverage-reporting-works/)

## 9. WireMock e chamadas de API seguras

**WireMock** é um servidor de simulação de APIs HTTP. Em testes, definimos *stubs*: “se chegar uma requisição que combina com método, URL, headers ou corpo, responda com este status e conteúdo”. Depois podemos verificar se a aplicação fez a chamada esperada. [WireMock: stubbing](https://wiremock.org/docs/stubbing/) · [WireMock: verificação](https://wiremock.org/docs/verifying/)

WireMock é útil quando a aplicação depende de outro serviço, por exemplo um provedor de e-mail, calendário, identidade ou notificações externas. O sistema atual registra notificações localmente e não faz chamada HTTP de saída, então WireMock não é necessário nos testes presentes. Se essa integração for criada, um stub pode simular sucesso, timeout, HTTP 500, resposta inválida e limite de requisições sem depender do serviço real.

### Exemplo conceitual do cenário

1. Configurar WireMock para responder `503` a `POST /notificacoes`.
2. Fazer a aplicação tentar enviar uma notificação.
3. Verificar se ela trata a falha, registra erro sem vazar credenciais e não duplica a reserva.
4. Verificar quantas chamadas ocorreram e quais headers foram enviados.

### Princípios de segurança da API

- **Autenticação:** confirmar quem está fazendo o pedido. O sistema usa token Bearer retornado no login.
- **Autorização:** confirmar o que aquela identidade pode fazer. O projeto restringe auditoria a admin e decisões a responsável; também verifica propriedade da reserva.
- **Validação:** validar método, formato, intervalo, existência e estado da sala no servidor; nunca confiar somente na interface web.
- **Segredos:** não registrar nem expor token, senha ou chave em logs, respostas, código-fonte ou workflow público.
- **Transporte:** em produção, proteger tráfego externo com HTTPS e armazenar credenciais de integração em secret manager/segredos de CI.
- **Dependências externas:** limitar timeout, tratar indisponibilidade, validar resposta e não enviar dados além do necessário.
- **Mocks seguros:** WireMock substitui a API externa nos testes; não deve ser confundido com proteção real da API, e sua API administrativa não deve ficar exposta publicamente.

No exemplo do sistema, `Authorization: Bearer <token>` demonstra autenticação, enquanto a checagem do perfil e do proprietário demonstra autorização. Uma resposta 401 significa que falta autenticação válida; 403 significa que a identidade foi reconhecida, mas não tem permissão; 409 representa conflito com o estado atual, como horário reservado ou bloqueado.

## 10. Perguntas para praticar a chamada oral

1. O que ATAM avalia e como ele difere de um teste funcional?
2. Dê um exemplo de risco, ponto sensível e trade-off no sistema.
3. Por que horários contíguos não conflitam? Como você testaria a fronteira?
4. Qual a diferença entre caixa preta e caixa branca? Cite um teste de cada neste projeto.
5. Por que um teste de concorrência é importante para reservas?
6. Como a transação e a auditoria ajudam a integridade dos dados?
7. O que a CI faz quando recebe um pull request? O que faz o workflow falhar?
8. Qual é a função de JUnit 5, JaCoCo e SonarCloud? Qual limitação existe ao usá-los neste projeto Node?
9. O que WireMock simula e quando ele seria útil aqui?
10. Diferencie autenticação, autorização, HTTP 401, HTTP 403 e HTTP 409.
11. Uma cobertura de 100% garante que não há bugs? Por quê?
12. Como IA agêntica pode ajudar na avaliação ATAM e o que ainda precisa de validação humana?

## Referências consultadas

- [SEI/CMU: Architecture Tradeoff Analysis Method](https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-atam/)
- [GitHub Docs: Build and test Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [JUnit 5 User Guide](https://docs.junit.org/5.10.0/user-guide/index.html)
- [JaCoCo Documentation](https://www.jacoco.org/jacoco/trunk/doc/)
- [SonarQube Cloud: test coverage overview](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/overview)
- [WireMock: stubbing](https://wiremock.org/docs/stubbing/) e [verifying](https://wiremock.org/docs/verifying/)
