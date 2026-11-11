# Agendamento de salas (Node puro)

Requer Node ≥ 22.13 (usa `node:sqlite` embutido; **zero dependências**).

    npm start        # http://localhost:3000  (cria agenda.db com dados de demonstração)
    npm test         # testes de concorrência, bloqueio, aprovação e permissões

Usuários de demonstração (senha `123456`): `solicitante`, `responsavel`, `admin`.

## O que está implementado (rastreio aos requisitos)
| Requisito | Onde |
|---|---|
| FR-01/NFR-01 autenticação + perfil, negação por padrão | tabela de rotas (`R(...)`) e `doUsuario` |
| FR-02 cadastro/consulta, desativação lógica | `/api/salas`, `/api/salas/:id/ativa` |
| FR-03 pesquisa por localização e disponibilidade (capacidade adiada) | `GET /api/salas` |
| FR-04 criar/alterar/cancelar (motivo obrigatório) | `/api/reservas…` |
| FR-05/06 sobreposição + concorrência | `validar()` dentro de `tx()` (`BEGIN IMMEDIATE`) |
| FR-07 salas restritas exigem aprovação | `status='pendente'` + `/decisao` |
| FR-08 bloqueio/manutenção; aprovação não contorna | `validar()` |
| FR-10/NFR-03 auditoria atômica com a operação | `audit()` na mesma transação |
| FR-11 notificações simuladas | tabela `notificacoes` |
| FR-12 relatório (conflitos evitados: fórmula provisória) | `GET /api/relatorio` |
| FR-14/NFR-05 documentação dos pontos expostos | este README |

## API
`POST /api/login` · `GET|POST /api/salas` · `POST /api/salas/:id/ativa` · `GET|POST /api/bloqueios` ·
`GET|POST /api/reservas` · `PUT /api/reservas/:id` · `POST /api/reservas/:id/cancelar` ·
`POST /api/reservas/:id/decisao` · `GET /api/notificacoes` · `GET /api/auditoria` · `GET /api/relatorio`
(Autorização: `Authorization: Bearer <token>` retornado no login.)

## Fora desta versão
Professores e materiais (retirada/devolução, FR-09), cancelamento parcial multi-recurso, filtro por capacidade.
