import { borrar, guardar, leer } from './almacen';

export const leerSesion = (foroId: string) => leer<string>(`sesion:${foroId}`);
export const guardarSesion = (foroId: string, token: string) => guardar(`sesion:${foroId}`, token);
export const borrarSesion = (foroId: string) => borrar(`sesion:${foroId}`);
