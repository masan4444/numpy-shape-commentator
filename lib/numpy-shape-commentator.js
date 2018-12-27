'use babel';

import NumpyShapeCommentatorView from './numpy-shape-commentator-view';
import { CompositeDisposable } from 'atom';

export default {

  numpyShapeCommentatorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.numpyShapeCommentatorView = new NumpyShapeCommentatorView(state.numpyShapeCommentatorViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.numpyShapeCommentatorView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'numpy-shape-commentator:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.numpyShapeCommentatorView.destroy();
  },

  serialize() {
    return {
      numpyShapeCommentatorViewState: this.numpyShapeCommentatorView.serialize()
    };
  },

  toggle() {
    console.log('NumpyShapeCommentator was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
