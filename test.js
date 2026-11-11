// Testes de caixa preta: verificam o comportamento observável pela API HTTP.
process.env.DB = ':memory:';
const assert = require('node:assert/strict');
const server = require('./server').listen(0);
const base = () => `http://localhost:${server.address().port}`;
const call = async (p, method = 'GET', body, token) => {
  const response = await fetch(base() + '/api' + p, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: response.status, json: await response.json() };
};

(async () => {
  try {
    const login = async login => (await call('/login', 'POST', { login, senha: '123456' })).json.token;
    const solicitante = await login('solicitante');
    const responsavel = await login('responsavel');
    const admin = await login('admin');

    assert.equal((await call('/salas')).status, 401, 'salas exige autenticação');
    assert.equal((await call('/login', 'POST', { login: 'desconhecido', senha: 'errada' })).status, 401);

    const reservaBase = { sala_id: 1, inicio: '2030-01-01T10:00', fim: '2030-01-01T11:00' };
    const simultaneas = await Promise.all(Array.from({ length: 5 }, () => call('/reservas', 'POST', reservaBase, solicitante)));
    assert.equal(simultaneas.filter(r => r.status === 200).length, 1, 'somente uma reserva sobreposta deve ser confirmada');
    assert.equal(simultaneas.filter(r => r.status === 409).length, 4);
    const contigua = await call('/reservas', 'POST', { ...reservaBase, inicio: '2030-01-01T11:00', fim: '2030-01-01T12:00' }, solicitante);
    assert.equal(contigua.status, 200, 'intervalos contíguos são permitidos');

    assert.equal((await call('/reservas', 'POST', { ...reservaBase, inicio: '2030-01-01T12:00', fim: '2030-01-01T11:00' }, solicitante)).status, 400);
    const restrita = await call('/reservas', 'POST', { sala_id: 3, inicio: '2030-02-01T10:00', fim: '2030-02-01T11:00' }, solicitante);
    assert.equal(restrita.json.status, 'pendente');
    assert.equal((await call(`/reservas/${restrita.json.id}/decisao`, 'POST', { aprovar: true, justificativa: 'ok' }, solicitante)).status, 403);
    await call('/bloqueios', 'POST', { sala_id: 3, inicio: '2030-02-01T09:00', fim: '2030-02-01T12:00', motivo: 'manutenção' }, admin);
    assert.equal((await call(`/reservas/${restrita.json.id}/decisao`, 'POST', { aprovar: true, justificativa: 'ok' }, responsavel)).status, 409,
      'aprovação não pode contornar bloqueio');

    const minhasReservas = await call('/reservas', 'GET', undefined, solicitante);
    const reservaAlheia = minhasReservas.json.find(r => r.id === contigua.json.id);
    assert.ok(reservaAlheia, 'solicitante consulta as próprias reservas');
    assert.equal((await call('/auditoria', 'GET', undefined, solicitante)).status, 403);
    assert.equal((await call('/auditoria', 'GET', undefined, admin)).status, 200);
    console.log('OK: testes de caixa preta (API)');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
