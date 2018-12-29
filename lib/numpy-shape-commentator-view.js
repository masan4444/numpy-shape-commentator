'use babel';

export default class NumpyShapeCommentatorView {
  constructor(serializedState, callback) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('numpy-shape-commentator');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'Set arguments and press Enter. (Esc)';

    this.editorElement = document.createElement('atom-text-editor');
    this.editorElement.setAttribute('mini', true);
    this.editor = atom.workspace.buildTextEditor({
      lineNumberGutterVisible: false,
      placeholderText: 'arg1 arg2 arg3...',
    });
    this.editorElement.setModel(this.editor);
    this.editorElement.onkeydown = (e) => {
      const args = this.editor.getText();
      if (e.key === 'Enter' || e.key === 'Escape') {
        callback(e.key, args);
      }
    };

    this.element.appendChild(this.editorElement);
    this.element.appendChild(message);
  }

  show(args) {
    if (args) {
      this.editor.setText(args);
    }
    this.editor.element.focus();
    this.editor.selectAll();
  }

  /* eslint class-methods-use-this: ["error", { "exceptMethods": ["serialize"] }] */
  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }
}
