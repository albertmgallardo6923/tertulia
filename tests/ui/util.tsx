import { render, type VNode } from 'preact';
import { act } from 'preact/test-utils';
import { cargarAjustes, guardarAjustes } from '../../src/datos/ajustes';
import { usarSoloMemoria, vaciarMemoria } from '../../src/datos/almacen';
import { descubrirForo } from '../../src/datos/descubrir-foro';
import { guardarForo, idDeEndpoint, type ForoGuardado } from '../../src/datos/foros';
import { configurarRitmo } from '../../src/transporte';

type Ventana = { happyDOM: { setURL(u: string): void } };

export function fijarUrl(url: string): void {
  (window as unknown as Ventana).happyDOM.setURL(url);
}

/** Entorno limpio: memoria vacía, ajustes por defecto y (opcionalmente) modo demostración. */
export async function prepararEntorno(demo: boolean): Promise<void> {
  usarSoloMemoria(true);
  vaciarMemoria();
  configurarRitmo(0);
  fijarUrl(demo ? 'http://localhost/?demo' : 'http://localhost/');
  await cargarAjustes();
  if (demo) await guardarAjustes({ clave: 'demo' });
}

export async function foroDemo(usuario?: string): Promise<ForoGuardado> {
  const d = await descubrirForo('foro.clubtesla.es', 0);
  const foro: ForoGuardado = {
    id: idDeEndpoint(d.endpoint),
    nombre: 'Club Tesla España',
    host: new URL(d.endpoint).hostname,
    endpoint: d.endpoint,
    config: d.config,
    usuario,
  };
  await guardarForo(foro);
  return foro;
}

const contenedores: HTMLElement[] = [];

export async function montar(vnode: VNode): Promise<HTMLElement> {
  const cont = document.createElement('div');
  document.body.append(cont);
  contenedores.push(cont);
  await act(() => {
    render(vnode, cont);
  });
  return cont;
}

export function desmontarTodo(): void {
  for (const c of contenedores.splice(0)) {
    render(null, c);
    c.remove();
  }
}

/** Deja correr promesas y temporizadores hasta que el texto aparezca. */
export async function esperarTexto(cont: HTMLElement, texto: string, ms = 3000): Promise<void> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    await act(() => new Promise<void>((r) => setTimeout(r, 15)));
    if ((cont.textContent ?? '').includes(texto)) return;
  }
  throw new Error(`No apareció «${texto}». Contenido: ${(cont.textContent ?? '').slice(0, 300)}`);
}
