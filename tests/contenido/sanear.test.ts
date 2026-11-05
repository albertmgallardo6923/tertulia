import { describe, expect, it } from 'vitest';
import { contenidoAHtml, sanear } from '../../src/contenido/sanear';

const pintar = (s: string) => contenidoAHtml(s);

function dom(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d;
}

describe('saneado: vectores XSS', () => {
  it('elimina <script>', () => {
    const h = pintar('hola<script>alert(1)</script>mundo');
    expect(h).not.toContain('<script');
    expect(h).not.toContain('alert');
  });

  it('elimina onerror y otros manejadores', () => {
    const h = pintar('<img src="https://a.es/x.png" onerror="alert(1)" onclick="x()">');
    expect(h).not.toMatch(/onerror|onclick/i);
    expect(h).toContain('https://a.es/x.png');
  });

  it('elimina javascript: en href', () => {
    const h = pintar('<a href="javascript:alert(1)">x</a>');
    expect(dom(h).querySelector('a')?.hasAttribute('href')).toBe(false);
  });

  it('elimina data: en href', () => {
    const h = pintar('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>');
    expect(h).not.toContain('data:');
  });

  it('elimina data: en img', () => {
    const h = pintar('<img src="data:image/svg+xml;base64,AAAA">');
    expect(h).not.toContain('data:');
  });

  it('[url=javascript:…] no genera enlace peligroso', () => {
    const h = pintar('[url=javascript:alert(1)]pulsa[/url]');
    expect(h).not.toMatch(/javascript/i);
    expect(dom(h).querySelector('a')?.hasAttribute('href')).toBe(false);
  });

  it('[img]javascript:…[/img] no deja src', () => {
    const h = pintar('[img]javascript:alert(1)[/img]');
    expect(h).not.toMatch(/javascript/i);
  });

  it('descarta http: (solo https)', () => {
    const h = pintar('[url=http://a.es]x[/url][img]http://a.es/x.png[/img]');
    expect(h).not.toContain('http://');
  });

  it('quita las clases de la app y conserva las bb-', () => {
    const h = pintar('<div class="tabbar modal bb-quote otra">x</div><span class="barra">y</span>');
    const d = dom(h);
    expect(d.querySelector('div')?.getAttribute('class')).toBe('bb-quote');
    expect(d.querySelector('span')?.hasAttribute('class')).toBe(false);
  });

  // Nota: happy-dom no recorre bien los hijos de un nodo eliminado, así que cada vector va aislado.
  it('elimina <svg onload>', () => {
    for (const v of ['<svg onload="alert(1)"></svg>', '<svg/onload=alert(1)>', '<svg><script>alert(1)</script></svg>']) {
      expect(pintar(v)).not.toMatch(/svg|onload|alert/i);
    }
  });

  it('elimina href con espacios delante: "  javascript:"', () => {
    const h = pintar('<a href="  javascript:alert(1)">x</a><a href="\tjava\nscript:alert(1)">y</a>');
    expect(h).not.toMatch(/javascript|java\s*script/i);
  });

  it('elimina style, iframe, form, object y embed', () => {
    expect(pintar('<div style="position:fixed">a</div>')).toBe('<div>a</div>');
    for (const v of [
      '<iframe src="https://a.es"></iframe>',
      '<form action="https://a.es"></form>',
      '<object data="https://a.es"></object>',
      '<embed src="https://a.es">',
      '<meta http-equiv="refresh" content="0;url=https://a.es">',
    ]) {
      expect(pintar(v)).not.toMatch(/iframe|<form|object|embed|meta/i);
    }
  });

  it('no deja atributos data-*', () => {
    expect(pintar('<span data-src="https://a.es" class="bb-x">a</span>')).not.toContain('data-src');
  });

  it('mXSS: etiquetas anidadas raras', () => {
    const h = sanear('<math><mi//xlink:href="data:x,<script>alert(1)</script>">');
    expect(h).not.toContain('<script');
  });
});

describe('saneado: enlaces e imágenes', () => {
  it('enlaces con target y rel seguros', () => {
    const a = dom(pintar('[url=https://ejemplo.es/a?x=1&y=2]ver[/url]')).querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://ejemplo.es/a?x=1&y=2');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  });

  it('un rel o target del foro no se conserva tal cual', () => {
    const a = dom(pintar('<a href="https://a.es" target="_self" rel="opener">x</a>')).querySelector('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  });

  it('imágenes con loading=lazy', () => {
    const i = dom(pintar('[img]https://ejemplo.es/a.png[/img]')).querySelector('img')!;
    expect(i.getAttribute('src')).toBe('https://ejemplo.es/a.png');
    expect(i.getAttribute('loading')).toBe('lazy');
  });

  it('«al tocar» sustituye las imágenes por un botón, salvo emojis', () => {
    const h = contenidoAHtml(
      '[img]https://ejemplo.es/a.png[/img] [img]https://emoji.tapatalk-cdn.com/e.png[/img]',
      { imagenes: 'tocar', textoBoton: 'Toca' },
    );
    const d = dom(h);
    expect(d.querySelectorAll('img')).toHaveLength(1);
    const b = d.querySelector('button.bb-imagen-diferida')!;
    expect(b.getAttribute('data-src')).toBe('https://ejemplo.es/a.png');
  });
});
