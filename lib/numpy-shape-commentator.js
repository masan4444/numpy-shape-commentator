'use babel';

import { CompositeDisposable, File, TextBuffer } from 'atom';
import NumpyShapeCommentatorView from './numpy-shape-commentator-view';

const helpers = require('atom-linter');

// const SHAPE_COMMENT_REGEXP = new RegExp(' ? ?#_ [\\(\\)\\d, ]+[\\),]', 'g');
const SHAPE_COMMENT_REGEXP = new RegExp(' ? ?#_ .*', 'g');
const isWindows = process.platform === 'win32';

export default {

  numpyShapeCommentatorView: null,
  modalPanel: null,
  subscriptions: null,
  userArguments_str: null,

  activate(state) {
    this.numpyShapeCommentatorView = new NumpyShapeCommentatorView(
      state.numpyShapeCommentatorViewState,
      (key, args) => this.setArguments(key, args),
    );
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.numpyShapeCommentatorView.getElement(),
      visible: false,
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'numpy-shape-commentator:showInputDialog': () => this.showInputDialog(),
      'numpy-shape-commentator:insertShapeComment': () => this.insertShapeComment(),
      'numpy-shape-commentator:removeShapeComment': () => {
        this.removeShapeComment(atom.workspace.getActivePaneItem());
        atom.notifications.addSuccess('Remove Shape Comment!');
      },
      'numpy-shape-commentator:highlightShapeComment': () => this.highlightShapeComment(atom.workspace.getActivePaneItem()),
      'numpy-shape-commentator:dehighlightShapeComment': () => this.dehighlightShapeComment(atom.workspace.getActivePaneItem()),
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.numpyShapeCommentatorView.destroy();
  },

  serialize() {
    return {
      numpyShapeCommentatorViewState: this.numpyShapeCommentatorView.serialize(),
    };
  },

  showInputDialog() {
    this.modalPanel.show();
    this.numpyShapeCommentatorView.show(this.userArguments_str);
  },

  setArguments(key, args) {
    if (key === 'Enter') {
      this.userArguments_str = args;
      this.modalPanel.hide();
    } else if (key === 'Escape') {
      this.modalPanel.hide();
    }
  },

  getShapeCommentPosition(textbuffer) {
    const ranges = [];
    const itr = out => ranges.push(out.range);
    textbuffer.scan(SHAPE_COMMENT_REGEXP, itr);
    return ranges;
  },

  removeShapeComment(editor) {
    const itr = out => out.replace('');
    editor.scan(SHAPE_COMMENT_REGEXP, itr);
  },

  removeShapeCommentInRange(editor, range) {
    const itr = out => out.replace('');
    editor.scanInBufferRange(SHAPE_COMMENT_REGEXP, range, itr);
  },

  highlight(editor, ranges) {
    ranges.forEach((range_) => {
      const range = range_.copy();
      range.start.column += 2;
      const marker = editor.markScreenRange(range, { invalidate: 'inside' });
      editor.decorateMarker(marker, { type: 'highlight', class: 'shape-comment-highlight' });
    });
  },

  highlightShapeComment(editor) {
    const ranges = this.getShapeCommentPosition(new TextBuffer(editor.getText()));
    this.highlight(editor, ranges);
  },

  dehighlightShapeComment(editor) {
    const decorations = editor.getHighlightDecorations({ class: 'shape-comment-highlight' });
    decorations.forEach(decorate => decorate.destroy());
  },

  async removeFiles(files) {
    const filepaths = files.filter(file => file.existsSync()).map(file => file.getPath());
    if (filepaths.length) {
      await helpers.exec(isWindows ? 'del' : 'rm', filepaths);
    }
  },

  async insertShapeComment() {
    const editor = atom.workspace.getActivePaneItem();

    // copy file which has no shape_comment to 'filename'.shape_commentator_tmp
    const fileContent = editor.getText();
    const tmpFilePath = `${editor.getPath().replace('\\', '/')}.shape_commentator_tmp`;
    const tmpFile = new File(tmpFilePath);
    tmpFile.writeSync(fileContent.replace(SHAPE_COMMENT_REGEXP, ''));

    const commentedFilePath = `${tmpFilePath}.commented.py`;
    const commentedFile = new File(commentedFilePath);
    this.removeFiles([commentedFile]);

    // run shape_commentotor
    const executablePath = atom.config.get('numpy-shape-commentator.executablePath').split(' ');
    const command = executablePath[0];
    const args = executablePath.slice(1, executablePath.length);
    args.push(tmpFilePath);
    const userArguments = this.userArguments_str ? this.userArguments_str.split(' ') : [];
    const execOpts = {
      stream: 'stderr',
      allowEmptyStderr: true,
    };
    const output = await helpers.exec(command, args.concat(userArguments), execOpts);

    // regExp for error in running script
    const errReg = new RegExp(
      'exec\\(code.*\\)\\r?\\n'
      + ' *File "<string>", line (\\d+), in <module>\\r?\\n'
      + '(.*\\r?\\n)*'
      + '(\\w*Error): (.*)',
      'gm',
    );
    const match = errReg.exec(output);

    if (!output || (commentedFile.existsSync() && match)) {
      // success
      // merge current content with new commented content
      const commentedBuffer = TextBuffer.loadSync(commentedFilePath);
      const oldTextBuffer = new TextBuffer(editor.getText());

      const newShapeCommentRanges = [];
      this.getShapeCommentPosition(commentedBuffer).forEach((range) => {
        const newShapeComment = commentedBuffer.getTextInRange(range);
        const textInRange = editor.getTextInBufferRange(range);
        if (textInRange === '' || /^ {2}#_/.test(textInRange)) {
          if (/^ {2}#_/.test(textInRange)) {
            // remove old shape comment
            const oldRange = range.copy();
            oldRange.end.column = oldTextBuffer.lineLengthForRow(range.start.row);
            this.removeShapeCommentInRange(editor, oldRange);
          }
          editor.setTextInBufferRange(range, newShapeComment);
          newShapeCommentRanges.push(range);
        }
      });

      // highlight new shape comment
      this.dehighlightShapeComment(editor);
      this.highlight(editor, newShapeCommentRanges);

      let successMesseage = 'insert shape comment';
      if (userArguments.length) {
        successMesseage += userArguments.reduce((msg, arg) => `${msg}${arg}, `, ' (arg : [');
        successMesseage += '])';
      }
      atom.notifications.addSuccess(successMesseage);

      if (output) {
        // if error has occur
        const showErrorDetails = atom.config.get('numpy-shape-commentator.showErrorDetails');
        const option = {
          detail: showErrorDetails ? output : "check 'showErrorDetails' if you want watch error details",
          description: `${match[3]}: ${match[4]}`,
          dismissable: showErrorDetails,
        };
        atom.notifications.addWarning(`${match[3]} in line ${match[1]}`, option);
      }
    } else {
      // fail
      const option = {
        detail: output,
        dismissable: true,
      };
      atom.notifications.addError('failed to insert shape comment', option);
    }

    this.removeFiles([tmpFile, commentedFile]);
  },

  config: {
    showErrorDetails: {
      title: 'show Error Details',
      type: 'boolean',
      description: 'show error details if errors ocurr',
      default: false,
    },
    executablePath: {
      title: 'executable Path',
      type: 'string',
      description: 'path to use shape_commentator',
      default: 'python3 -m shape_commentator',
    },
  },

};
