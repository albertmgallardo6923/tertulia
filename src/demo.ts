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

const RESPUESTAS: Record<string, string> = {
  get_config: config,
  get_forum: foros,
  get_latest_topic: ultimos,
  get_unread_topic: ultimos,
  get_subscribed_topic: ultimos,
  get_topic: ultimos,
  // La demo simula a un usuario que puede responder (el fixture se grabó como invitado).
  get_thread: hilo.replace(/(<name>can_reply<\/name><value><boolean>)0/, (_m, p) => p + '1'),
};

export function responderDemo(cuerpoXml: string): string {
  const metodo = /<methodName>(\w+)</.exec(cuerpoXml)?.[1] ?? '';
  return RESPUESTAS[metodo] ?? exito;
}
