// Modo demostración (?demo): respuestas grabadas, sin red. Se carga solo bajo demanda.
import config from '../tests/fixtures/foro-clubtesla-es/get_config.xml?raw';
import foros from '../tests/fixtures/foro-clubtesla-es/get_forum.xml?raw';
import ultimos from '../tests/fixtures/foro-clubtesla-es/get_latest_topic.xml?raw';
import hilo from '../tests/fixtures/foro-clubtesla-es/get_thread.xml?raw';

const exito =
  '<?xml version="1.0" encoding="UTF-8"?><methodResponse><params><param><value><struct>' +
  '<member><name>result</name><value><boolean>1</boolean></value></member>' +
  '<member><name>result_text</name><value><base64/></value></member>' +
  '<member><name>username</name><value><string>demo</string></value></member>' +
  '<member><name>user_id</name><value><string>1</string></value></member>' +
  '</struct></value></param></params></methodResponse>';

const b64 = (texto: string) => btoa(String.fromCharCode(...new TextEncoder().encode(texto)));

/** Añade mensajes de ejemplo al hilo grabado (que solo trae 2) para que la demo enseñe citas, lo nuevo y lo propio. */
function ampliarHilo(xml: string): string {
  const posts = xml.match(/<value><struct><member><name>topic_id<\/name>[\s\S]*?<\/struct><\/value>/g);
  const molde = posts?.[1];
  if (!posts || !molde) return xml;
  const ahora = Math.floor(Date.now() / 1000);
  const largo = Array.from({ length: 5 }, (_, i) => `Punto ${i + 1}: la ventana de entrega se confirma por la app unas dos semanas antes y puede moverse unos días.`).join('\n');
  const nuevos: [string, number, string][] = [
    ['marta_ev', 3 * 86400, '[quote="usuario3"]Respecto al tema logística, en Shanghái hay 3 puertos en los que los barcos cargan Teslas para transportarlos hasta Europa[/quote]Gracias por el resumen, aclara mucho. Yo tengo la entrega prevista para finales de mes y todavía no me han dicho el puerto.'],
    ['javi.sanz', 2 * 86400, `[quote="marta_ev"]${largo}[/quote]Eso mismo me pasó a mí. Lo importante es no cambiar nada del pedido una vez confirmada la fecha.\n\nMás detalles en [url=https://example.com/entregas]esta guía[/url].`],
    ['demo', 3 * 3600, 'Me confirmaron la ventana de entrega esta mañana. Os cuento cómo va la recogida.'],
    ['Lucía R', 25 * 60, 'Enhorabuena. Cuando la recojas, haz fotos de la pintura con luz natural antes de firmar nada.'],
  ];
  const extra = nuevos
    .map(([autor, atras, texto], i) =>
      molde
        .replace(/(<name>post_id<\/name><value><string>)\d+/, `$1${310700 + i}`)
        .replace(/(<name>post_content<\/name><value><base64>)[^<]*/, `$1${b64(texto)}`)
        .replace(/(<name>post_author_name<\/name><value><base64>)[^<]*/, `$1${b64(autor)}`)
        .replace(/(<name>timestamp<\/name><value><string>)\d+/, `$1${ahora - atras}`)
        .replace(/(<name>post_time<\/name><value><dateTime\.iso8601>)[^<]*/, `$1${new Date((ahora - atras) * 1000).toISOString().replace(/[-:]|\.\d+/g, '')}+00:00`),
    )
    .join('');
  return xml.replace(posts[posts.length - 1]!, (ultimo) => ultimo + extra);
}

const RESPUESTAS: Record<string, string> = {
  get_config: config,
  get_forum: foros,
  get_latest_topic: ultimos,
  // El primer tema aparece con mensajes nuevos para que la demo muestre el punto de no leído.
  get_unread_topic: ultimos.replace(/(<name>new_post<\/name><value><boolean>)0/, (_m, p) => p + '1'),
  get_subscribed_topic: ultimos,
  get_topic: ultimos,
  // La demo simula a un usuario que puede responder (el fixture se grabó como invitado).
  get_thread: ampliarHilo(hilo.replace(/(<name>can_reply<\/name><value><boolean>)0/, (_m, p) => p + '1')),
};

export function responderDemo(cuerpoXml: string): string {
  const metodo = /<methodName>(\w+)</.exec(cuerpoXml)?.[1] ?? '';
  return RESPUESTAS[metodo] ?? exito;
}
