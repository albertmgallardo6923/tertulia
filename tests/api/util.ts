import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClienteForo } from '../../src/api/cliente';

const DIR = join(__dirname, '..', 'fixtures', 'foro-clubtesla-es');

export function fixture(nombre: string): string {
  return readFileSync(join(DIR, `${nombre}.xml`), 'utf-8');
}

/** Cliente con transporte falso que devuelve `xml` y guarda los cuerpos enviados. */
export function clienteCon(xml: string): { cliente: ClienteForo; enviados: string[] } {
  const enviados: string[] = [];
  const cliente = new ClienteForo({
    endpoint: 'https://foro.clubtesla.es/mobiquo/mobiquo.php',
    transporte: async (_e, cuerpo) => {
      enviados.push(cuerpo);
      return xml;
    },
  });
  return { cliente, enviados };
}
