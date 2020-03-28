import { state } from '../state';
import drawingManager from './drawingManager';
import editBoxManager from './editBoxManager';
import canvasManager from './canvasManager';
import undoRedoManager from './undoRedoManager';
import configManager from './configManager';
import coordinatesManager from './coordinatesManager';

// processes all mouse events happening inside the drawing area
const eventManager = {
  // resize of canvas and shapes requires to keep track of which
  // points is being edited across events
  resize: '',

  // redirects the event to the appropiate function
  processEvent(event) {
    if (event.type === 'mousedown') {
      const targetClass = event.target.className;

      if (targetClass.includes('canvas')) {
        [this.resize] = targetClass.split(' ')[0].split('-');
      } else {
        // if not cavas resize then set color depending on button that triggered the event
        state.ctx.strokeStyle = event.button === 2
          ? state.config.secondaryColor
          : state.config.primaryColor;
      }
    }

    // every event requires an update of cursor coordinates
    coordinatesManager.updateCoordinates(event.clientX, event.clientY);
    const { x, y } = state.coordinates;

    if (['corner', 'right', 'bottom'].includes(this.resize)) {
      this.processCanvasEvent(event, x, y);
    } else {
      switch (state.config.tool) {
        case 'pen': this.processPenEvent(event, x, y); break;
        case 'paint': this.processPaintEvent(event, x, y); break;
        case 'eraser': this.processEraserEvent(event, x, y); break;
        case 'line':
        case 'circle':
        case 'triangle':
        case 'square': this.processShapeEvent(event, x, y); break;
        default:
      }
    }
    event.stopPropagation();
  },

  processPenEvent(event, x, y) {
    switch (event.type) {
      case 'mousedown':
        undoRedoManager.addUndo();
        drawingManager.drawPen(x, y, true);
        break;
      case 'mousemove':
        if (event.buttons !== 0) {
          drawingManager.drawPen(x, y);
        }
        break;
      default:
    }
  },

  processPaintEvent(event, x, y) {
    if (event.type === 'mousedown') {
      const color = event.button === 2
        ? state.config.secondaryColor
        : state.config.primaryColor;
      const rgbColor = color.replace(/[rgba()\s]/g, '').split(',').map(str => parseInt(str, 10));
      const currentImage = state.ctx.getImageData(0, 0, canvasManager.width, canvasManager.height);
      undoRedoManager.addUndo();
      // canvas uses a weird color format where alpha is 0-255
      drawingManager.paint(x, y, [...rgbColor, 255], currentImage);
    }
  },

  processEraserEvent(event, x, y) {
    if (event.type === 'mousedown') {
      // eraser always uses secondary color
      state.ctx.strokeStyle = state.config.secondaryColor;
      // and is thicker than current width
      configManager.updateWidth(state.config.width + 10);
    }

    if (event.type === 'mouseup') {
      // restore correct width
      configManager.updateWidth();
    }

    // other than that, it behaves exactly like a pen, for now...
    this.processPenEvent(event, x, y);
  },

  processShapeEvent(event, x, y) {
    const { tool } = state.config;

    switch (event.type) {
      case 'mousedown': {
        // check if mousedown was on canvas resize box
        const source = event.srcElement;
        this.resize = source.id === 'canvas'
          ? ''
          : source.id;

        if (this.resize) {
          // redraw current shape
          drawingManager.drawShape(tool, x, y, this.resize);
        } else {
          // cleanup and start new shape
          editBoxManager.deleteBoxes();
          undoRedoManager.addUndo();
          drawingManager.drawShape(tool, x, y, 'end', true);
        }
        break;
      }
      case 'mousemove': {
        if (event.buttons !== 0) {
          undoRedoManager.softUndo();
          if (this.resize) {
            // make resize boxes follow cursor and redraw shape
            drawingManager.drawShape(tool, x, y, this.resize);
            editBoxManager.moveBoxes();
          } else {
            // redraw current shape
            drawingManager.drawShape(tool, x, y);
          }
        }
        break;
      }
      case 'mouseup': {
        // if not resizing create resize boxes
        if (!this.resize) {
          // make sure click event happened on different coordinates before creating boxes
          if (drawingManager.start.toString() !== drawingManager.end.toString()) {
            editBoxManager.createBoxes();
          }
        }
        break;
      }
      default:
    }
  },

  processCanvasEvent(event, x, y) {
    if (event.type === 'mousedown') {
      // save current drawing
      undoRedoManager.addUndo();
    }
    const boxType = this.resize;
    const width = boxType === 'corner' || boxType === 'right' ? x : null;
    const height = boxType === 'corner' || boxType === 'bottom' ? y : null;

    canvasManager.resizeCanvas(width, height);
    undoRedoManager.softUndo();

    if (event.type === 'mouseup') {
      this.resize = '';
      undoRedoManager.undoStack.pop();
      configManager.updateConfig();
    }
  },
};

export default eventManager;
