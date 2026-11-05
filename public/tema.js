/* Aplica el tema antes del primer pintado (se carga bloqueando desde index.html; sin scripts en línea por la CSP). */
(function () {
  var tema = 'oscuro';
  try {
    var guardado = localStorage.getItem('tertulia.tema');
    if (guardado === 'claro' || guardado === 'auto') tema = guardado;
  } catch (e) {}
  document.documentElement.setAttribute('data-tema', tema);
  var claro = tema === 'claro' || (tema === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta && claro) meta.setAttribute('content', '#F7F7F4');
})();
