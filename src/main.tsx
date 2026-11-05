import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { usarSoloMemoria } from './datos/almacen';
import { ajustesActuales, cargarAjustes, guardarAjustes } from './datos/ajustes';
import { descubrirForo } from './datos/descubrir-foro';
import { guardarForo, idDeEndpoint, listarForos } from './datos/foros';
import { esDemo } from './transporte';
import { App } from './ui/App';
import './ui/estilos.css';

/** Modo demostración: un foro de ejemplo con las respuestas grabadas; no se escribe nada en el dispositivo. */
async function prepararDemo(): Promise<void> {
  usarSoloMemoria();
  await cargarAjustes();
  await guardarAjustes({ clave: 'demo' });
  if ((await listarForos()).length === 0) {
    const d = await descubrirForo('foro.clubtesla.es', 0);
    await guardarForo({
      id: idDeEndpoint(d.endpoint),
      nombre: 'Club Tesla España',
      host: new URL(d.endpoint).hostname,
      endpoint: d.endpoint,
      config: d.config,
    });
  }
}

/** Pide almacenamiento persistente una sola vez para que iOS no borre IndexedDB. */
async function pedirPersistencia(): Promise<void> {
  if (ajustesActuales().persistenciaPedida) return;
  try {
    await navigator.storage?.persist?.();
  } finally {
    await guardarAjustes({ persistenciaPedida: true });
  }
}

async function arrancar(): Promise<void> {
  if (esDemo()) await prepararDemo();
  else {
    await cargarAjustes();
    void pedirPersistencia();
    registerSW({ immediate: true });
  }
  render(<App />, document.getElementById('app')!);
}

void arrancar();
