# Testes do sistema de agendamento

O projeto possui testes de caixa preta e de caixa branca. Os testes usam um banco SQLite em memória (`:memory:`), então não alteram o arquivo `agenda.db`.

## Como executar

Abra o terminal na pasta raiz do projeto e execute:

```bash
npm test
```

Esse comando executa os dois grupos. Para executar apenas um deles:

```bash
npm run test:black
npm run test:white
```

No PowerShell, se a política de execução bloquear `npm`, use `npm.cmd` no lugar, por exemplo `npm.cmd test`.

## Testes de caixa preta

O arquivo [`test.js`](../test.js) envia requisições HTTP para a API e verifica os resultados observáveis, sem acessar diretamente as funções internas.

| Cenário | Resultado esperado |
|---|---|
| Consultar salas sem autenticação | A API retorna HTTP 401. |
| Entrar com usuário ou senha inválidos | A API retorna HTTP 401. |
| Enviar cinco reservas simultâneas para o mesmo horário e sala | Uma reserva é aceita e as outras quatro recebem HTTP 409 por conflito. |
| Reservar um horário que começa exatamente quando outra reserva termina | A reserva é aceita, pois os intervalos contíguos não se sobrepõem. |
| Criar reserva com horário final anterior ao inicial | A API retorna HTTP 400. |
| Reservar sala restrita | A reserva fica com status `pendente`. |
| Solicitante tentar decidir uma reserva | A API retorna HTTP 403. |
| Responsável aprovar uma reserva durante um bloqueio | A API retorna HTTP 409. |
| Consultar as próprias reservas | A reserva do solicitante aparece na resposta. |
| Solicitante consultar auditoria | A API retorna HTTP 403; o administrador consegue consultar (HTTP 200). |

## Testes de caixa branca

O arquivo [`test-white.js`](../test-white.js) chama funções e consulta o banco diretamente para verificar regras internas.

| Regra interna | Verificação |
|---|---|
| Formato de data e hora (`DT`) | Aceita `AAAA-MM-DDTHH:MM` e rejeita outro formato. |
| Validação de intervalo (`validar`) | Rejeita formato inválido e horário final igual ao inicial com erro 400. |
| Existência e estado da sala (`validar`) | Rejeita sala inexistente ou desativada com erro 404. |
| Conflito de reserva (`validar`) | Rejeita sobreposição com erro 409 e permite horários contíguos. |
| Bloqueio de sala (`validar`) | Rejeita período bloqueado com erro 409 e inclui o motivo do bloqueio. |
| Verificação de senha (`confere`) | Aceita a senha correta e rejeita uma senha incorreta. |
| Transação (`tx`) | Desfaz a gravação quando a função transacional lança um erro. |

## Arquivos relacionados

- [`test.js`](../test.js): testes de caixa preta pela API.
- [`test-white.js`](../test-white.js): testes de caixa branca das regras internas.
- [`server.js`](../server.js): implementação da API e das funções testadas.
- [`package.json`](../package.json): comandos de execução dos testes.
