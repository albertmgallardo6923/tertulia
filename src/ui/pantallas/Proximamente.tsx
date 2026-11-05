import { t } from '../../i18n';
import { Pantalla, Vacio } from '../componentes';

export function Proximamente({ pestana }: { pestana: 'mensajes' | 'avisos' }) {
  return (
    <Pantalla titulo={t(`pestanas.${pestana}`)}>
      <Vacio titulo={t('comun.proximamente')} texto={t(`${pestana}.proximamente`)} />
    </Pantalla>
  );
}
