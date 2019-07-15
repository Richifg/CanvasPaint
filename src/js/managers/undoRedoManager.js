import { state } from '../state';
import editBoxManager from './editBoxManager';

// mantains the undo/redo stack
const undoRedoManager = {
  size: [0, 0],

  // stacks holding the images to undo/redo
  undoStack: [],
  redoStack: [],

  // pushes current image into undo stack, enables button and cleans redo stack
  addUndo() {
    this.undoStack.push(state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height));
    document.getElementById('undo-button').removeAttribute('disabled');
    this.redoStack = [];
    document.getElementById('redo-button').setAttribute('disabled', '');
  },

  // undo redo logic
  undo() {
    if (this.undoStack.length) {
      // clean resize boxes if existent
      editBoxManager.deleteBoxes();

      // add about to be undoed image to redo stack and enable button
      const currentImage = state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
      this.redoStack.push(currentImage);
      document.getElementById('redo-button').removeAttribute('disabled');

      // pop element from stack and restore canvas
      const lastImage = this.undoStack.pop();
      state.ctx.putImageData(lastImage, 0, 0);

      // disable undo button if needed
      if (!this.undoStack.length) {
        document.getElementById('undo-button').setAttribute('disabled', '');
      }
    }
  },
  softUndo() {
    // called by the shape functions when being redrawn
    // similar to regular undo but doesn't alter the stacks
    if (this.undoStack.length) {
      state.ctx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
    }
  },
  redo() {
    if (this.redoStack.length) {
      // add about to be redoed image to undo stack and enable button
      const currentImage = state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
      this.undoStack.push(currentImage);
      document.getElementById('undo-button').removeAttribute('disabled');

      // pop element from stack and restore canvas
      const lastImage = this.redoStack.pop();
      state.ctx.putImageData(lastImage, 0, 0);

      // disable redo button if needed
      if (!this.redoStack.length) {
        document.getElementById('redo-button').setAttribute('disabled', '');
      }
    }
  },
};

export default undoRedoManager;
