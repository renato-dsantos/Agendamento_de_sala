// Agendamento de salas — Node puro (http + node:sqlite). Sem dependências externas.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.env.DB || 'agenda.db');
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS usuarios(id INTEGER PRIMARY KEY,nome TEXT,login TEXT UNIQUE,senha TEXT,perfil TEXT);
CREATE TABLE IF NOT EXISTS salas(id INTEGER PRIMARY KEY,nome TEXT,localizacao TEXT,restrita INTEGER DEFAULT 0,ativa INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS reservas(id INTEGER PRIMARY KEY,sala_id INTEGER REFERENCES salas(id),usuario_id INTEGER REFERENCES usuarios(id),inicio TEXT,fim TEXT,motivo TEXT,status TEXT,justificativa TEXT);
CREATE TABLE IF NOT EXISTS bloqueios(id INTEGER PRIMARY KEY,sala_id INTEGER REFERENCES salas(id),inicio TEXT,fim TEXT,motivo TEXT);
CREATE TABLE IF NOT EXISTS auditoria(id INTEGER PRIMARY KEY,data TEXT,ator TEXT,acao TEXT,objeto TEXT,dados TEXT);
CREATE TABLE IF NOT EXISTS notificacoes(id INTEGER PRIMARY KEY,usuario_id INTEGER,data TEXT,mensagem TEXT);`);

const hash = (s, salt = crypto.randomBytes(8).toString('hex')) => salt + ':' + crypto.scryptSync(s, salt, 32).toString('hex');
const confere = (s, h) => hash(s, h.split(':')[0]) === h;
if (!db.prepare('SELECT 1 FROM usuarios').get()) {
  const u = db.prepare('INSERT INTO usuarios(nome,login,senha,perfil) VALUES(?,?,?,?)');
  u.run('Ana (Solicitante)', 'solicitante', hash('123456'), 'solicitante');
  u.run('Bruno (Responsável)', 'responsavel', hash('123456'), 'responsavel');
  u.run('Carla (Administradora)', 'admin', hash('123456'), 'admin');
  const s = db.prepare('INSERT INTO salas(nome,localizacao,restrita) VALUES(?,?,?)');
  s.run('Sala 101', 'Bloco A', 0); s.run('Sala 202', 'Bloco B', 0); s.run('Laboratório de Informática', 'Bloco C', 1);
}

const E = (status, erro) => Object.assign(new Error(erro), { status });
const agora = () => new Date().toISOString();
const audit = (ator, acao, objeto, dados) => db.prepare('INSERT INTO auditoria(data,ator,acao,objeto,dados) VALUES(?,?,?,?,?)').run(agora(), ator, acao, objeto, JSON.stringify(dados || {}));
const notificar = (uid, msg) => db.prepare('INSERT INTO notificacoes(usuario_id,data,mensagem) VALUES(?,?,?)').run(uid, agora(), msg); // notificação simulada (FR-11)
// Transação imediata: serializa escritores, eliminando a janela entre "verificar" e "confirmar" (FR-06).
function tx(fn) { db.exec('BEGIN IMMEDIATE'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } }

const DT = /^\d{4}-\d\d-\d\dT\d\d:\d\d$/;
// Verificação única de disponibilidade. Intervalos semiabertos [início,fim): reservas contíguas não conflitam.
function validar(salaId, inicio, fim, ignorarId = 0) {
  if (!DT.test(inicio || '') || !DT.test(fim || '')) throw E(400, 'Informe início e fim no formato AAAA-MM-DDTHH:MM.');
  if (inicio >= fim) throw E(400, 'O fim deve ser posterior ao início.');
  const sala = db.prepare('SELECT * FROM salas WHERE id=?').get(salaId);
  if (!sala || !sala.ativa) throw E(404, 'Sala inexistente ou desativada.');
  const b = db.prepare('SELECT motivo FROM bloqueios WHERE sala_id=? AND inicio<? AND fim>?').get(salaId, fim, inicio);
  if (b) throw E(409, `Sala indisponível por bloqueio/manutenção (${b.motivo}).`);
  if (db.prepare("SELECT 1 FROM reservas WHERE sala_id=? AND status='confirmada' AND id<>? AND inicio<? AND fim>?").get(salaId, ignorarId, fim, inicio))
    throw E(409, 'A sala já está reservada neste intervalo.');
  return sala;
}

const sessoes = new Map(), rotas = [];
// perfis: null = público; [] = qualquer autenticado; lista = perfis permitidos
const R = (m, p, perfis, f) => rotas.push({ m, re: new RegExp('^' + p.replace(/:\w+/g, '(\\d+)') + '$'), perfis, f });
const reservaDe = id => { const r = db.prepare('SELECT * FROM reservas WHERE id=?').get(id); if (!r) throw E(404, 'Reserva não encontrada.'); return r; };
const doUsuario = (u, r) => { if (r.usuario_id !== u.id && u.perfil !== 'admin') throw E(403, 'Sem permissão sobre esta reserva.'); };

R('POST', '/api/login', null, (_, b) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE login=?').get(b.login || '');
  if (!u || !confere(b.senha || '', u.senha)) throw E(401, 'Login ou senha inválidos.');
  const token = crypto.randomUUID(); sessoes.set(token, { id: u.id, nome: u.nome, login: u.login, perfil: u.perfil });
  return { token, nome: u.nome, perfil: u.perfil };
});
R('GET', '/api/salas', [], (u, _, __, q) => {
  let sql = 'SELECT id,nome,localizacao,restrita,ativa FROM salas WHERE 1=1', a = [];
  if (u.perfil !== 'admin') sql += ' AND ativa=1';
  if (q.get('localizacao')) { sql += ' AND localizacao LIKE ?'; a.push('%' + q.get('localizacao') + '%'); }
  let salas = db.prepare(sql).all(...a);
  const de = q.get('de'), ate = q.get('ate');
  if (de && ate) salas = salas.filter(s => { try { validar(s.id, de, ate); return true; } catch { return false; } }); // filtro por disponibilidade
  return salas;
});
R('POST', '/api/salas', ['admin'], (u, b) => tx(() => {
  if (!b.nome) throw E(400, 'Informe o nome da sala.');
  const r = db.prepare('INSERT INTO salas(nome,localizacao,restrita) VALUES(?,?,?)').run(b.nome, b.localizacao || '', b.restrita ? 1 : 0);
  audit(u.login, 'sala_criada', 'sala:' + r.lastInsertRowid, b); return { id: Number(r.lastInsertRowid) };
}));
R('POST', '/api/salas/:id/ativa', ['admin'], (u, b, [id]) => tx(() => { // desativação lógica: preserva histórico
  db.prepare('UPDATE salas SET ativa=? WHERE id=?').run(b.ativa ? 1 : 0, id); audit(u.login, b.ativa ? 'sala_ativada' : 'sala_desativada', 'sala:' + id, {}); return { ok: true };
}));
R('POST', '/api/bloqueios', ['admin'], (u, b) => tx(() => {
  if (!DT.test(b.inicio || '') || !DT.test(b.fim || '') || b.inicio >= b.fim) throw E(400, 'Período de bloqueio inválido.');
  const r = db.prepare('INSERT INTO bloqueios(sala_id,inicio,fim,motivo) VALUES(?,?,?,?)').run(b.sala_id, b.inicio, b.fim, b.motivo || 'manutenção');
  audit(u.login, 'bloqueio_criado', 'sala:' + b.sala_id, b); return { id: Number(r.lastInsertRowid) };
}));
R('GET', '/api/bloqueios', ['admin'], () => db.prepare('SELECT b.*,s.nome sala FROM bloqueios b JOIN salas s ON s.id=b.sala_id ORDER BY inicio DESC').all());

R('GET', '/api/reservas', [], u => db.prepare(`SELECT r.*,s.nome sala,s.restrita,us.nome solicitante FROM reservas r JOIN salas s ON s.id=r.sala_id JOIN usuarios us ON us.id=r.usuario_id
  ${u.perfil === 'solicitante' ? 'WHERE r.usuario_id=?' : 'WHERE ?=?'} ORDER BY r.inicio DESC`).all(...(u.perfil === 'solicitante' ? [u.id] : [1, 1])));
R('POST', '/api/reservas', [], (u, b) => tx(() => {
  const sala = validar(b.sala_id, b.inicio, b.fim);
  const status = sala.restrita ? 'pendente' : 'confirmada'; // restrita: exige aprovação (FR-07)
  const r = db.prepare('INSERT INTO reservas(sala_id,usuario_id,inicio,fim,motivo,status) VALUES(?,?,?,?,?,?)').run(sala.id, u.id, b.inicio, b.fim, b.motivo || '', status);
  audit(u.login, 'reserva_criada', 'reserva:' + r.lastInsertRowid, { ...b, status });
  return { id: Number(r.lastInsertRowid), status };
}));
R('PUT', '/api/reservas/:id', [], (u, b, [id]) => tx(() => {
  const r = reservaDe(id); doUsuario(u, r);
  if (!['confirmada', 'pendente'].includes(r.status)) throw E(400, 'Esta reserva não pode mais ser alterada.');
  const sala = validar(r.sala_id, b.inicio, b.fim, r.id); // revalida; em falha, rollback preserva a reserva vigente
  const status = sala.restrita ? 'pendente' : 'confirmada';
  db.prepare('UPDATE reservas SET inicio=?,fim=?,motivo=?,status=? WHERE id=?').run(b.inicio, b.fim, b.motivo ?? r.motivo, status, id);
  audit(u.login, 'reserva_alterada', 'reserva:' + id, { de: [r.inicio, r.fim], para: [b.inicio, b.fim], status });
  notificar(r.usuario_id, `Reserva #${id} alterada (${status}).`); return { status };
}));
R('POST', '/api/reservas/:id/cancelar', [], (u, b, [id]) => tx(() => {
  const r = reservaDe(id); doUsuario(u, r);
  if (!['confirmada', 'pendente'].includes(r.status)) throw E(400, 'Reserva já encerrada.');
  if (!b.motivo) throw E(400, 'Informe o motivo do cancelamento.');
  db.prepare("UPDATE reservas SET status='cancelada',justificativa=? WHERE id=?").run(b.motivo, id);
  audit(u.login, 'reserva_cancelada', 'reserva:' + id, { motivo: b.motivo }); notificar(r.usuario_id, `Reserva #${id} cancelada.`); return { ok: true };
}));
R('POST', '/api/reservas/:id/decisao', ['responsavel'], (u, b, [id]) => tx(() => {
  const r = reservaDe(id);
  if (r.status !== 'pendente') throw E(400, 'A solicitação não está pendente.');
  if (!b.justificativa) throw E(400, 'Informe a justificativa da decisão.');
  if (b.aprovar) validar(r.sala_id, r.inicio, r.fim, r.id); // aprovação NÃO contorna conflito nem bloqueio
  const status = b.aprovar ? 'confirmada' : 'rejeitada';
  db.prepare('UPDATE reservas SET status=?,justificativa=? WHERE id=?').run(status, b.justificativa, id);
  audit(u.login, b.aprovar ? 'reserva_aprovada' : 'reserva_rejeitada', 'reserva:' + id, { justificativa: b.justificativa });
  notificar(r.usuario_id, `Reserva #${id} ${b.aprovar ? 'aprovada' : 'recusada'}: ${b.justificativa}`); return { status };
}));
R('GET', '/api/notificacoes', [], u => db.prepare('SELECT * FROM notificacoes WHERE usuario_id=? ORDER BY id DESC LIMIT 50').all(u.id));
R('GET', '/api/auditoria', ['admin'], () => db.prepare('SELECT * FROM auditoria ORDER BY id DESC LIMIT 200').all());
R('GET', '/api/relatorio', ['admin', 'responsavel'], () => ({
  // "Conflitos evitados" = tentativas rejeitadas por conflito/bloqueio (fórmula provisória: FR-12 ainda não a define).
  conflitos_evitados: db.prepare("SELECT COUNT(*) n FROM auditoria WHERE acao='conflito_evitado'").get().n,
  utilizacao: db.prepare(`SELECT s.nome sala,COUNT(r.id) reservas,ROUND(COALESCE(SUM((julianday(r.fim)-julianday(r.inicio))*24),0),2) horas
    FROM salas s LEFT JOIN reservas r ON r.sala_id=s.id AND r.status='confirmada' GROUP BY s.id`).all() }));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (c, o) => { res.writeHead(c, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
  if (!url.pathname.startsWith('/api')) {
    const f = [path.join(__dirname, 'public', 'index.html'), path.join(__dirname, 'index.html')].find(fs.existsSync);
    if (!f) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('index.html não encontrado. Coloque-o em "public\\index.html" ou ao lado do server.js.'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(f));
  }
  let body = {};
  try { const ch = []; for await (const c of req) ch.push(c); if (ch.length) body = JSON.parse(Buffer.concat(ch)); } catch { return send(400, { erro: 'JSON inválido.' }); }
  const rota = rotas.find(r => r.m === req.method && r.re.test(url.pathname));
  if (!rota) return send(404, { erro: 'Rota inexistente.' });
  const u = sessoes.get((req.headers.authorization || '').replace('Bearer ', ''));
  try {
    if (rota.perfis) {
      if (!u) throw E(401, 'Autenticação necessária.');
      if (rota.perfis.length && !rota.perfis.includes(u.perfil)) throw E(403, 'Seu perfil não permite esta operação.');
    }
    send(200, rota.f(u, body, url.pathname.match(rota.re).slice(1).map(Number), url.searchParams));
  } catch (e) {
    if (!e.status) { console.error(e); return send(500, { erro: 'Erro interno. Nada foi alterado.' }); }
    // tentativas negadas e conflitos evitados ficam registrados (fora da transação revertida)
    if (e.status === 403 || e.status === 409) audit(u?.login || 'anônimo', e.status === 403 ? 'acesso_negado' : 'conflito_evitado', req.method + ' ' + url.pathname, { erro: e.message });
    send(e.status, { erro: e.message });
  }
});
module.exports = server;
// Exporta as regras internas para testes unitários de caixa branca.
server._internals = { validar, tx, confere, DT, db };
if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
