import { describe, expect, it } from 'vitest';
import { bbcodeAHtml } from '../../src/contenido/bbcode';
import { contenidoAHtml } from '../../src/contenido/sanear';

describe('BBCode', () => {
  it('etiquetas simples', () => {
    expect(bbcodeAHtml('[b]a[/b] [i]b[/i] [u]c[/u] [s]d[/s]')).toBe('<b>a</b> <i>b</i> <u>c</u> <s>d</s>');
  });

  it('anidadas y de la misma etiqueta', () => {
    expect(bbcodeAHtml('[b]uno [i]dos [b]tres[/b][/i] cuatro[/b]')).toBe(
      '<b>uno <i>dos <b>tres</b></i> cuatro</b>',
    );
  });

  it('citas anidadas con autor', () => {
    const h = bbcodeAHtml('[quote=Ana]hola [quote="Luis" pid=3]dentro[/quote] fin[/quote]');
    expect(h).toContain('<cite>Ana</cite>');
    expect(h).toContain('<cite>Luis</cite>');
    expect(h.match(/<blockquote/g)).toHaveLength(2);
  });

  it('[url] con y sin parámetro', () => {
    expect(bbcodeAHtml('[url]https://a.es[/url]')).toBe('<a href="https://a.es">https://a.es</a>');
    expect(bbcodeAHtml('[url=https://a.es]ir[/url]')).toBe('<a href="https://a.es">ir</a>');
  });

  it('[img] dentro de [url]', () => {
    const h = contenidoAHtml('[url=https://a.es][img]https://a.es/x.png[/img][/url]');
    expect(h).toContain('<a href="https://a.es"');
    expect(h).toContain('<img');
  });

  it('[list] con [*] y lista numerada', () => {
    expect(bbcodeAHtml('[list][*]a[*]b[/list]')).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(bbcodeAHtml('[list=1]<br />[*]a<br />[*]b<br />[/list]')).toBe('<ol><li>a</li><li>b</li></ol>');
  });

  it('[spoiler] y [code] literal', () => {
    expect(bbcodeAHtml('[spoiler=Ojo]x[/spoiler]')).toContain('<summary>Ojo</summary>');
    const c = bbcodeAHtml('[code][b]no[/b]<br />[i]x[/i][/code]');
    expect(c).toContain('<pre class="bb-code"><code>[b]no[/b]\n[i]x[/i]</code></pre>');
  });

  it('[color] y [size] solo con clases', () => {
    expect(bbcodeAHtml('[color=red]x[/color]')).toBe('<span class="bb-color-red">x</span>');
    expect(bbcodeAHtml('[color=#0000ff]x[/color]')).toContain('bb-color-blue');
    expect(bbcodeAHtml('[size=6]x[/size]')).toContain('bb-size-xl');
    expect(bbcodeAHtml('[color=red;background:url(x)]x[/color]')).toBe('x');
  });

  it('desconocido y sin cerrar se deja como texto', () => {
    expect(bbcodeAHtml('[foo]x[/foo] [b]abierto')).toBe('[foo]x[/foo] [b]abierto');
  });

  it('conserva el HTML del foro y convierte saltos reales si no hay <br>', () => {
    expect(bbcodeAHtml('a<br />b')).toBe('a<br />b');
    expect(bbcodeAHtml('a\nb')).toBe('a<br>b');
  });

  it('no se deja colar las marcas internas', () => {
    expect(bbcodeAHtml('0')).toBe('0');
  });

  it('entrada hostil grande termina rápido', () => {
    const t0 = Date.now();
    bbcodeAHtml('[b]'.repeat(5000) + 'x' + '[/b]'.repeat(5000));
    bbcodeAHtml('[quote]'.repeat(3000));
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});
