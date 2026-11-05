// Tipos de dominio (limpios, en español, fechas como Date).

export interface Config {
  version: string; // p. ej. "sm21" (software + versión del plugin)
  nivelApi: number;
  abierto: boolean;
  invitadoPermitido: boolean;
  tipoLogin: string; // "username" | "email" ...
  soportaUltimos: boolean;
  tiposPush: string[];
  usuarioId: string;
  bruto: Record<string, string>; // todos los campos escalares, como texto
}

export interface Foro {
  id: string; // puede llevar prefijo "c" (categoría)
  nombre: string;
  padreId: string | null; // null en la raíz
  soloCategoria: boolean; // sub_only: no se puede entrar a listar temas
  puedePublicar: boolean;
  puedeSuscribir: boolean;
  suscrito: boolean;
  hayNuevos: boolean;
  url: string;
  hijos: Foro[];
}

export interface Tema {
  id: string;
  foroId: string;
  foroNombre: string;
  titulo: string;
  resumen: string;
  respuestas: number;
  vistas: number;
  autorId: string;
  autor: string;
  fecha: Date | null;
  hayNuevos: boolean;
  cerrado: boolean;
  fijo: boolean;
  suscrito: boolean;
}

export interface Mensaje {
  id: string;
  titulo: string;
  contenido: string; // HTML + BBCode mezclados: sanear antes de pintar
  autorId: string;
  autor: string;
  fecha: Date | null;
  puedeEditar: boolean;
}

export interface ResultadoTemas {
  total: number;
  temas: Tema[];
}

export interface Hilo {
  tema: Omit<Tema, 'resumen' | 'respuestas' | 'hayNuevos'>;
  totalMensajes: number;
  puedeResponder: boolean;
  mensajes: Mensaje[];
}

export interface ResultadoLogin {
  exito: boolean;
  mensaje: string;
  usuarioId: string;
  usuario: string;
}

export interface ResultadoAccion {
  exito: boolean;
  mensaje: string;
  id: string; // id del mensaje o tema creado, si aplica
}
