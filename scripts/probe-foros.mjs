#!/usr/bin/env node
// Fase 0: comprueba si cada foro de docs/foros.md expone la API de Tapatalk.
// Uso: node scripts/probe-foros.mjs [docs/foros.md]
// Escribe docs/foros-estado.md y tests/fixtures/<foro>/get_config.xml.
// Solo hace 2 peticiones por foro, con 1 s de pausa entre foros. No envía credenciales.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const archivo = process.argv[2] ?? 'docs/foros.md';
const UA = 'Tertulia/0.1 (lector personal de foros)';

const texto = await readFile(archivo, 'utf8');
const urls = [...texto.matchAll(/\|\s*([^|]+?)\s*\|\s*(https?:\/\/[^\s|]+)\s*\|/g)]
  .map(([, nombre, url]) => ({ nombre: nombre.trim(), url: url.replace(/\/+$/, '') }))
  .filter(f => !f.url.includes('ejemplo.com'));

if (urls.length === 0) {
  console.log('No hay foros en', archivo);
  process.exit(1);
}

const slug = u => new URL(u).hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-');
const espera = ms => new Promise(r => setTimeout(r, ms));

function miembros(xml) {
  const out = {};
  for (const m of xml.matchAll(/<member>\s*<name>([^<]+)<\/name>\s*<value>\s*(?:<(\w+)>([\s\S]*?)<\/\2>|([^<]*))\s*<\/value>\s*<\/member>/g)) {
    const [, nombre, tipo, valor, crudo] = m;
    let v = valor ?? crudo ?? '';
    if (tipo === 'base64') v = Buffer.from(v.trim(), 'base64').toString('utf8');
    if (tipo === 'boolean') v = v.trim() === '1';
    out[nombre] = v;
  }
  return out;
}

const filas = [];
for (const foro of urls) {
  const endpoint = `${foro.url}/mobiquo/mobiquo.php`;
  const fila = { ...foro, get: '', config: '', software: '', version: '', nota: '' };
  try {
    const r1 = await fetch(endpoint, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    fila.get = String(r1.status);
    const body = '<?xml version="1.0"?><methodCall><methodName>get_config</methodName><params></params></methodCall>';
    const r2 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'text/xml' },
      body,
    });
    const xml = await r2.text();
    fila.config = String(r2.status);
    if (r2.ok && xml.includes('<methodResponse')) {
      const c = miembros(xml);
      fila.software = c.sys_version ?? c.forum_system ?? '';
      fila.version = c.version ?? c.api_level ?? '';
      fila.nota = [c.is_open === false ? 'cerrado' : '', c.guest_okay === false ? 'sin invitados' : '']
        .filter(Boolean).join(', ');
      const dir = `tests/fixtures/${slug(foro.url)}`;
      await mkdir(dir, { recursive: true });
      await writeFile(`${dir}/get_config.xml`, xml);
    } else {
      fila.nota = /cloudflare|cf-ray|challenge/i.test(xml) ? 'bloqueo antibots' : 'sin API de Tapatalk';
    }
  } catch (e) {
    const causa = e.cause?.code ?? e.cause?.errors?.[0]?.code ?? e.cause?.message ?? e.message;
    fila.nota = `error: ${causa}`.slice(0, 60);
  }
  filas.push(fila);
  console.log(`${fila.nombre}: GET ${fila.get || '-'} · get_config ${fila.config || '-'} · ${fila.software} ${fila.version} ${fila.nota}`.trim());
  await espera(1000);
}

const ok = filas.filter(f => f.config === '200' && !f.nota.includes('sin API') && !f.nota.includes('bloqueo'));
const md = [
  '# Estado de los foros',
  '',
  `Comprobado: ${new Date().toISOString().slice(0, 10)} · compatibles: ${ok.length} de ${filas.length}`,
  '',
  '| foro | GET mobiquo | get_config | software | versión plugin | nota |',
  '| --- | --- | --- | --- | --- | --- |',
  ...filas.map(f => `| ${f.nombre} | ${f.get} | ${f.config} | ${f.software} | ${f.version} | ${f.nota} |`),
  '',
].join('\n');
await writeFile('docs/foros-estado.md', md);
console.log(`\nCompatibles: ${ok.length}/${filas.length} → docs/foros-estado.md`);
