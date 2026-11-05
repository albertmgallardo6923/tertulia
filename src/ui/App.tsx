import { useEffect } from 'preact/hooks';
import { esDemo } from '../transporte';
import { BarraPestanas } from './componentes';
import { useAjustes, useRuta } from './hooks';
import { AnadirForo, ArbolForo, ListaForos, ListaTemas, PantallaLogin } from './pantallas/Foros';
import { Bienvenida, estaInstalada, PantallaClave } from './pantallas/Inicio';
import { Novedades } from './pantallas/Novedades';
import { Proximamente } from './pantallas/Proximamente';
import { PantallaNuevoTema, PantallaTema } from './pantallas/Tema';
import { Yo } from './pantallas/Yo';
import { aplicarTema } from './tema';

const PESTANAS = ['novedades', 'foros', 'mensajes', 'avisos', 'yo'];

function numero(s: string | undefined): number {
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function RutaForos({ resto }: { resto: string[] }) {
  const [a, b, c, d, e] = resto;
  if (!a) return <ListaForos />;
  if (a === 'nuevo') return <AnadirForo />;
  if (!b) return <ArbolForo foroId={a} />;
  if (b === 'login') return <PantallaLogin foroId={a} />;
  if (b === 'f' && c) {
    if (d === 'nuevo') return <PantallaNuevoTema foroId={a} subforoId={c} />;
    return <ListaTemas foroId={a} subforoId={c} pagina={d === 'p' ? numero(e) : 1} />;
  }
  if (b === 't' && c) {
    const pagina = d === 'p' ? (e === 'ultimo' ? 'ultimo' : numero(e)) : 1;
    return <PantallaTema foroId={a} temaId={c} pagina={pagina} />;
  }
  return <ListaForos />;
}

export function App() {
  const ajustes = useAjustes();
  const ruta = useRuta();
  const demo = esDemo();

  useEffect(() => {
    document.documentElement.dataset.letra = ajustes.letra;
  }, [ajustes.letra]);

  useEffect(() => aplicarTema(ajustes.tema), [ajustes.tema]);

  // Fuera de la app instalada solo se muestra la guía (el almacenamiento de Safari no se comparte).
  if (!demo && !estaInstalada()) return <Bienvenida />;
  if (!demo && !ajustes.clave) return <PantallaClave onLista={() => undefined} />;

  const [primera, ...resto] = ruta;
  const pestana = primera && PESTANAS.includes(primera) ? primera : 'novedades';

  let pantalla;
  switch (pestana) {
    case 'foros':
      pantalla = <RutaForos resto={resto} />;
      break;
    case 'mensajes':
    case 'avisos':
      pantalla = <Proximamente pestana={pestana} />;
      break;
    case 'yo':
      pantalla = <Yo />;
      break;
    default:
      pantalla = <Novedades />;
  }

  const profunda = pestana === 'foros' && resto.length > 0;
  return (
    <div class="app">
      <div class="contenido">
        <div key={ruta.join('/')} class={`transicion${profunda ? ' transicion--empuja' : ''}`}>
          {pantalla}
        </div>
      </div>
      <BarraPestanas activa={pestana} />
    </div>
  );
}
