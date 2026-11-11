// Testes de caixa branca: cobrem funções e decisões internas do servidor.
process.env.DB = ':memory:';
const assert = require('node:assert/strict');
const server = require('./server');
const { validar, tx, confere, DT, db } = server._internals;

try {
  assert.equal(DT.test('2030-01-01T09:30'), true);
  assert.equal(DT.test('01/01/2030 09:30'), false);

  assert.throws(() => validar(1, 'inválido', '2030-01-01T11:00'), e => e.status === 400);
  assert.throws(() => validar(1, '2030-01-01T11:00', '2030-01-01T11:00'), e => e.status === 400);
  assert.throws(() => validar(999, '2030-01-01T10:00', '2030-01-01T11:00'), e => e.status === 404);

  db.prepare('INSERT INTO reservas(sala_id,usuario_id,inicio,fim,motivo,status) VALUES(?,?,?,?,?,?)')
    .run(1, 1, '2030-01-01T10:00', '2030-01-01T11:00', '', 'confirmada');
  assert.throws(() => validar(1, '2030-01-01T10:30', '2030-01-01T11:30'), e => e.status === 409);
  assert.equal(validar(1, '2030-01-01T11:00', '2030-01-01T12:00').id, 1, 'limites de intervalo contíguos não conflitam');

  db.prepare('INSERT INTO bloqueios(sala_id,inicio,fim,motivo) VALUES(?,?,?,?)')
    .run(2, '2030-01-02T09:00', '2030-01-02T12:00', 'manutenção');
  assert.throws(() => validar(2, '2030-01-02T10:00', '2030-01-02T11:00'), e => e.status === 409 && /manutenção/.test(e.message));
  db.prepare('UPDATE salas SET ativa=0 WHERE id=2').run();
  assert.throws(() => validar(2, '2030-01-03T10:00', '2030-01-03T11:00'), e => e.status === 404);

  const senha = 'segredo';
  const salt = 'teste123';
  const crypto = require('node:crypto');
  const hash = salt + ':' + crypto.scryptSync(senha, salt, 32).toString('hex');
  assert.equal(confere(senha, hash), true);
  assert.equal(confere('incorreta', hash), false);

  assert.throws(() => tx(() => {
    db.prepare("INSERT INTO auditoria(data,ator,acao,objeto,dados) VALUES('agora','teste','teste','teste','{}')").run();
    throw new Error('forçar rollback');
  }), /forçar rollback/);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM auditoria WHERE acao='teste'").get().n, 0, 'tx desfaz alterações ao ocorrer erro');
  console.log('OK: testes de caixa branca (regras internas)');
} finally {
  db.close();
}
