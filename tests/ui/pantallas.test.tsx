import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { guardarAjustes } from '../../src/datos/ajustes';
import { ErrorProxy } from '../../src/transporte';
import { App } from '../../src/ui/App';
import { AnadirForo, ArbolForo, ListaForos, ListaTemas } from '../../src/ui/pantallas/Foros';
import { Bienvenida, PantallaClave } from '../../src/ui/pantallas/Inicio';
import { Novedades } from '../../src/ui/pantallas/Novedades';
import { PantallaTema } from '../../src/ui/pantallas/Tema';
import { Yo } from '../../src/ui/pantallas/Yo';
import { clienteCon, fixture } from '../api/util';
import { desmontarTodo, esperarTexto, fijarUrl, foroDemo, montar, prepararEntorno } from './util';

afterEach(() => {
  desmontarTodo();
  vi.unstubAllGlobals();
});

describe('pantallas con fixtures (modo demostración)', () => {
  beforeEach(() => prepararEntorno(true));

  it('Novedades: agrupa por foro y muestra los últimos temas', async () => {
    await foroDemo();
    const { cliente } = clienteCon(fixture('get_latest_topic'));
    const esperado = (await cliente.getUltimosTemas(0, 19)).temas[0]!.titulo;
    const c = await montar(<Novedades />);
    await esperarTexto(c, esperado);
    expect(c.querySelector('h2.seccion')?.textContent).toContain('Club Tesla España');
    expect(c.textContent).toContain('Últimos temas');
    expect(c.querySelectorAll('a.fila--tema').length).toBeGreaterThan(0);
    expect(c.querySelector('a.fila--tema')?.getAttribute('href')).toMatch(/^#\/foros\/foro\.clubtesla\.es\/t\/\d+$/);
  });

  it('Novedades sin foros: estado vacío con enlace para añadir', async () => {
    const c = await montar(<Novedades />);
    await esperarTexto(c, 'Aún no tienes foros');
    expect(c.querySelector('a.btn')?.getAttribute('href')).toBe('#/foros/nuevo');
  });

  it('Novedades con sesión pide no leídos', async () => {
    await foroDemo('ana');
    const c = await montar(<Novedades />);
    await esperarTexto(c, 'No leídos');
  });

  it('Foros: lista los foros añadidos', async () => {
    await foroDemo();
    const c = await montar(<ListaForos />);
    await esperarTexto(c, 'Club Tesla España');
    expect(c.textContent).toContain('Invitado');
    expect(c.querySelector('a[aria-label="Añadir foro"]')).not.toBeNull();
  });

  it('Foros: árbol de subforos con categorías y enlaces', async () => {
    const foro = await foroDemo();
    const c = await montar(<ArbolForo foroId={foro.id} />);
    await esperarTexto(c, 'Club Tesla España');
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(c.querySelectorAll('.fila--categoria').length).toBeGreaterThan(0);
    expect(c.querySelector('a.fila')?.getAttribute('href')).toContain('/f/');
  });

  it('Foros: lista de temas paginada', async () => {
    const foro = await foroDemo();
    const c = await montar(<ListaTemas foroId={foro.id} subforoId="3" pagina={1} />);
    await act(() => new Promise((r) => setTimeout(r, 80)));
    expect(c.querySelectorAll('a.fila--tema').length).toBeGreaterThan(0);
  });

  it('Añadir foro: descubre el foro y ofrece iniciar sesión o invitado', async () => {
    const c = await montar(<AnadirForo />);
    const entrada = c.querySelector('input[name="foro"]') as HTMLInputElement;
    await act(() => {
      entrada.value = 'foro.clubtesla.es';
      entrada.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(() => {
      c.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await esperarTexto(c, 'Foro compatible encontrado');
    const usuario = c.querySelector('input[name="username"]');
    expect(usuario?.getAttribute('autocomplete')).toBe('username');
    expect(c.querySelector('input[type="password"]')?.getAttribute('autocomplete')).toBe('current-password');
    expect(c.textContent).toContain('Entrar como invitado');
  });

  it('Tema: pinta mensajes saneados, fecha relativa y enlace para iniciar sesión (invitado)', async () => {
    const foro = await foroDemo();
    const c = await montar(<PantallaTema foroId={foro.id} temaId="14162" pagina={1} />);
    await esperarTexto(c, 'Inicia sesión para responder');
    const mensajes = c.querySelectorAll('article.mensaje');
    expect(mensajes.length).toBeGreaterThan(0);
    expect(c.querySelector('script')).toBeNull();
    expect(c.querySelector('[onerror],[onclick]')).toBeNull();
    c.querySelectorAll('.contenido-foro a').forEach((a) => {
      expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
      expect(a.getAttribute('href') ?? 'https:').toMatch(/^https:/);
    });
    expect(c.querySelector('.mensaje-cab strong')?.textContent).toBeTruthy();
    expect(c.querySelector('a[href$="/p/ultimo"]')).not.toBeNull();
  });

  it('Tema con sesión: botones Responder, Citar y Marcar como leído', async () => {
    const foro = await foroDemo('ana');
    const c = await montar(<PantallaTema foroId={foro.id} temaId="14162" pagina={1} />);
    await esperarTexto(c, 'Marcar como leído');
    expect(c.textContent).toContain('Citar');
    const responder = [...c.querySelectorAll('button.btn-primario')].find((b) => b.textContent === 'Responder')!;
    await act(() => {
      (responder as HTMLButtonElement).click();
    });
    await act(() => new Promise((r) => setTimeout(r, 30)));
    expect(c.querySelector('textarea')).not.toBeNull();
  });

  it('Yo: cuentas, ajustes y acerca de', async () => {
    await foroDemo('ana');
    const c = await montar(<Yo />);
    await esperarTexto(c, 'Sesión de ana');
    expect(c.textContent).toContain('Cerrar sesión');
    expect(c.textContent).toContain('Cargar imágenes');
    expect(c.textContent).toContain('Tamaño de letra');
    expect(c.textContent).toContain('Acerca de');
  });

  it('Yo: cerrar sesión borra el usuario del foro', async () => {
    await foroDemo('ana');
    const c = await montar(<Yo />);
    await esperarTexto(c, 'Cerrar sesión');
    const boton = [...c.querySelectorAll('button')].find((b) => b.textContent === 'Cerrar sesión')!;
    await act(() => {
      boton.click();
    });
    await esperarTexto(c, 'Invitado');
  });

  it('Yo: cambiar «Cargar imágenes» actualiza el ajuste', async () => {
    const c = await montar(<Yo />);
    await act(() => new Promise((r) => setTimeout(r, 30)));
    const tocar = [...c.querySelectorAll('.segmentado button')].find((b) => b.textContent === 'Al tocar')!;
    await act(() => {
      (tocar as HTMLButtonElement).click();
    });
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(tocar.getAttribute('aria-checked')).toBe('true');
  });

  it('App: barra de pestañas con las cinco secciones y Próximamente en Mensajes y Avisos', async () => {
    await foroDemo();
    const c = await montar(<App />);
    const nombres = [...c.querySelectorAll('nav.pestanas a')].map((a) => a.textContent);
    expect(nombres).toEqual(['Novedades', 'Foros', 'Mensajes', 'Avisos', 'Yo']);
    for (const [hash, texto] of [['#/mensajes', 'Aquí verás'], ['#/avisos', 'Aquí recibirás']] as const) {
      await act(() => {
        location.hash = hash;
        dispatchEvent(new Event('hashchange'));
      });
      await esperarTexto(c, 'Próximamente');
      expect(c.textContent).toContain(texto);
    }
    await act(() => {
      location.hash = '';
    });
  });
});

describe('primer uso (sin demo)', () => {
  beforeEach(() => prepararEntorno(false));

  it('en Safari (sin instalar) solo se ve la guía de instalación', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const c = await montar(<App />);
    expect(c.textContent).toContain('Añadir a pantalla de inicio');
    expect(c.querySelectorAll('ol.pasos li')).toHaveLength(4);
    expect(c.querySelector('nav.pestanas')).toBeNull();
    expect(c.querySelector('input')).toBeNull();
  });

  it('instalada y sin clave: pide la clave de la app', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const c = await montar(<App />);
    expect(c.querySelector('input[type="password"]')).not.toBeNull();
    expect(c.textContent).toContain('Clave de la app');
  });

  it('Bienvenida pinta la guía', async () => {
    const c = await montar(<Bienvenida />);
    expect(c.textContent).toContain('Compartir');
  });

  it('clave incorrecta: muestra el error y no guarda; clave correcta: guarda', async () => {
    const respuestas = [
      new Response('{"ok":true}'),
      new Response('{"error":"clave"}', { status: 401 }),
      new Response('{"ok":true}'),
      new Response('{"error":"direccion","codigo":"vacio"}', { status: 400 }),
    ];
    vi.stubGlobal('fetch', vi.fn(async () => respuestas.shift()!));
    const alLista = vi.fn();
    const c = await montar(<PantallaClave onLista={alLista} />);
    const campo = c.querySelector('input') as HTMLInputElement;
    const enviar = async (v: string) => {
      await act(() => {
        campo.value = v;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(() => {
        c.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await act(() => new Promise((r) => setTimeout(r, 30)));
    };
    await enviar('mala');
    expect(c.textContent).toContain('La clave de la app no es correcta');
    expect(alLista).not.toHaveBeenCalled();
    await enviar('buena');
    expect(alLista).toHaveBeenCalled();
    const { ajustesActuales } = await import('../../src/datos/ajustes');
    expect(ajustesActuales().clave).toBe('buena');
  });

  it('Novedades muestra el error del proxy en cada foro, con texto en español', async () => {
    await guardarAjustes({ clave: 'k' });
    fijarUrl('http://localhost/');
    const foro = await (async () => {
      // El foro se guarda a mano: sin demo no se puede descubrir.
      const { guardarForo } = await import('../../src/datos/foros');
      const { aConfig } = await import('../../src/api/cliente');
      const f = {
        id: 'foro.ejemplo.es', nombre: 'Foro Ejemplo', host: 'foro.ejemplo.es',
        endpoint: 'https://foro.ejemplo.es/mobiquo/mobiquo.php', config: aConfig({}),
      };
      await guardarForo(f);
      return f;
    })();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"limite"}', { status: 429 })));
    const c = await montar(<Novedades />);
    await esperarTexto(c, 'Demasiadas peticiones');
    expect(c.textContent).toContain(foro.nombre);
    expect(new ErrorProxy('limite').codigo).toBe('limite');
  });
});
