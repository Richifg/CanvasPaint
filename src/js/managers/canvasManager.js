import { canvas, canvasSizeDisplay, drawingArea } from '../dom-loader';
import { boxOffset } from '../constants';
import { state, updateState } from '../state';

const canvasManager = {
  width: null,
  height: null,
  rightBox: null,
  bottomBox: null,
  cornerBox: null,

  init() {
    this.width = state.canvas.width;
    this.height = state.canvas.height;
    this.createBoxes();
    this.resizeCanvas(this.width, this.height);
  },

  createBoxes() {
    const rightBox = document.createElement('div');
    rightBox.className = 'right-box canvas-box box';
    drawingArea.appendChild(rightBox);
    this.rightBox = rightBox;

    const bottomBox = document.createElement('div');
    bottomBox.className = 'bottom-box canvas-box box';
    drawingArea.appendChild(bottomBox);
    this.bottomBox = bottomBox;

    const cornerBox = document.createElement('div');
    cornerBox.className = 'corner-box canvas-box box';
    drawingArea.appendChild(cornerBox);
    this.cornerBox = cornerBox;
  },

  moveBoxes() {
    this.cornerBox.style.top = `${boxOffset + this.height}px`;
    this.cornerBox.style.left = `${boxOffset + this.width}px`;
    this.rightBox.style.top = `${boxOffset + this.height / 2}px`;
    this.rightBox.style.left = `${boxOffset + this.width}px`;
    this.bottomBox.style.top = `${boxOffset + this.height}px`;
    this.bottomBox.style.left = `${boxOffset + this.width / 2}px`;
  },

  resizeCanvas(width, height) {
    if (width) {
      canvas.width = width;
      this.width = width;
    }
    if (height) {
      canvas.height = height;
      this.height = height;
    }
    this.moveBoxes();
    // update canvas size indicator
    canvasSizeDisplay.innerText = `${this.width} x ${this.height} px`;

    this.updateState();
  },

  updateState() {
    updateState({ width: this.width, height: this.height }, 'canvas');
  },
};

export default canvasManager;
