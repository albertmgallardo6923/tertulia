// Iconos de trazo propios (SVG en línea, trazo de 1.5 px) dibujados para esta app.
import type { ComponentChildren } from 'preact';

function Icono({ children, tam = 26 }: { children: ComponentChildren; tam?: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IcoNovedades = () => (
  <Icono>
    <path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z" />
    <path d="M9 9h6M9 12.5h6M9 16h3" />
  </Icono>
);
export const IcoForos = () => (
  <Icono>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h8A2.5 2.5 0 0 1 17 6.5v4a2.5 2.5 0 0 1-2.5 2.5H10l-3.5 3v-3A2.5 2.5 0 0 1 4 10.5z" />
    <path d="M20 9.5a2.5 2.5 0 0 1 0 5V19l-3-2.5h-3.5" />
  </Icono>
);
export const IcoMensajes = () => (
  <Icono>
    <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
    <path d="m4.5 8 7.5 5.5L19.5 8" />
  </Icono>
);
export const IcoAvisos = () => (
  <Icono>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Icono>
);
export const IcoYo = () => (
  <Icono>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icono>
);
export const IcoCompartir = () => (
  <Icono tam={28}>
    <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
    <path d="M7 11H5.5v9h13v-9H17" />
  </Icono>
);
export const IcoMas = () => (
  <Icono tam={24}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);
export const IcoMasCuadro = () => (
  <Icono tam={28}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </Icono>
);
export const IcoAtras = () => (
  <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10 2 2 10l8 8" />
  </svg>
);
export const IcoChevron = () => (
  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m1.5 1.5 5 5.5-5 5.5" />
  </svg>
);
export const IcoFijado = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M14 3 21 10l-2 1-3 3-.5 4.5L14 20l-4-4-6 5 5-6-4-4 1.5-1.5 4.5-.5 3-3z" />
  </svg>
);
export const IcoBocadillo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5.5 4.5h13A2.5 2.5 0 0 1 21 7v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5v-3.5h-1A2.5 2.5 0 0 1 3 15V7a2.5 2.5 0 0 1 2.5-2.5z" />
  </svg>
);
export const IcoEnviar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 19.5V5M5.5 11.5 12 5l6.5 6.5" />
  </svg>
);
export const IcoCerrar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);
export const IcoPuntos = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5.5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18.5" cy="12" r="1.6" />
  </svg>
);
