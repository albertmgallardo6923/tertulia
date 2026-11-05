// happy-dom define `Node.prototype.nodeName` vacío y DOMPurify (>= 3.4) lo lee desde ahí.
// Solo para los tests: lo hacemos polimórfico como en un navegador real.
const NOMBRES: Record<number, string> = {
  3: '#text',
  4: '#cdata-section',
  8: '#comment',
  9: '#document',
  11: '#document-fragment',
};

Object.defineProperty(Node.prototype, 'nodeName', {
  configurable: true,
  get(this: Node & { tagName?: string }) {
    if (this.nodeType === 1) return this.tagName ?? '';
    return NOMBRES[this.nodeType] ?? '';
  },
});
