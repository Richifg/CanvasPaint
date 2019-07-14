import '../css/styles.css';

import {
  drawingArea,
  toolInputs,
  widthInputs,
  activeColorInputs,
  colorPickerInput,
  customColorDisplays,
  cursorCoordinatesDisplay,
  canvasSizeDisplay,
} from './dom-loader';

const globals = {
  // main padding - half box size
  boxOffset: 7.5,
};

// 2d context of the canvas, initialized on seutp
let ctx;

// processes all mouse events happening inside the drawing area
const eventManager = {
  // resive of canvas and shapes requires to keep track of which
  // points is being edited across events
  resize: '',

  // redirects the event to the appropiate function
  processEvent(event) {
    if (event.type === 'mousedown') {
      const targetClass = event.target.className;
      if (targetClass.includes('canvas')) {
        this.resize = targetClass.split(' ')[0].split('-')[0];
      } else {
        ctx.strokeStyle = event.button === 2
          ? configManager.secondaryColor
          : configManager.primaryColor;
      }
    }
    if (['corner', 'right', 'bottom'].includes(this.resize)) {
      this.processCanvasEvent(event);
    } else {
      switch (configManager.tool) {
        case 'pen': this.processPenEvent(event); break;
        case 'paint': this.processPaintEvent(event); break;
        case 'eraser': this.processEraserEvent(event); break;
        case 'line':
        case 'circle':
        case 'triangle':
        case 'square': this.processShapeEvent(event); break;
        default:
      }
    }
    event.stopPropagation();
  },

  processPenEvent(event) {
    const [x, y] = coordinatesManager.updateCoordinates(event.clientX, event.clientY);

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

  processPaintEvent(event) {
    const [x, y] = coordinatesManager.updateCoordinates(event.clientX, event.clientY);
    if (event.type === 'mousedown') {
      const color = event.button === 2
        ? configManager.secondaryColor
        : configManager.primaryColor;
      const rgbColor = color.replace(/[rgba()\s]/g, '').split(',').map(str => parseInt(str, 10));
      const currentImage = ctx.getImageData(0, 0, canvasManager.width, canvasManager.height);
      // canvas uses a weird color format where alpha is 0-255
      drawingManager.paint(x, y, [...rgbColor, 255], currentImage);
    }
  },

  processEraserEvent(event) {
    if (event.type === 'mousedown') {
      // eraser always uses secondary color
      ctx.strokeStyle = configManager.secondaryColor;
      // and is thicker than current width
      configManager.updateWidth(configManager.width + 10);
    }

    if (event.type === 'mouseup') {
      // restore correct width
      configManager.updateWidth();
    }

    // other than that, it behaves exactly like a pen, for now...
    this.processPenEvent(event);
  },

  processShapeEvent(event) {
    // get current cursor coordinates and selected tool
    const [x, y] = coordinatesManager.updateCoordinates(event.clientX, event.clientY);
    const { tool } = configManager;

    switch (event.type) {
      case 'mousedown': {
        // check if mousedown was on resize box
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

  processCanvasEvent(event) {
    if (event.type === 'mousedown') {
      // save current drawing
      undoRedoManager.addUndo();
    }
    const [x, y] = coordinatesManager.updateCoordinates(event.clientX, event.clientY);
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

// draws on the canvas
const drawingManager = {
  // start, end and center coordinates of the current drawing
  // used on shapes like line, square and circle
  start: [0, 0],
  end: [0, 0],
  center: [0, 0],


  drawPen(x, y, begin = false) {
    if (begin) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  },
  drawShape(tool, x, y, position = 'end', isBeginning = false) {
    // update shape start on mouse down
    if (isBeginning) {
      this.start = [x, y];
      this.center = [x, y];
    }
    // update shape start, end or both positions depending on what is being edited
    if (position === 'center') {
      // get diff in x and y coordinates due to center move
      const [lastX, lastY] = [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2];
      const [diffX, diffY] = [x - lastX, y - lastY];

      // update all coordinates
      this.start = [this.start[0] + diffX, this.start[1] + diffY];
      this.end = [this.end[0] + diffX, this.end[1] + diffY];
      this.center = [x, y];
    } else {
      // only update the edited position and recalculate center
      this[position] = [x, y];
      this.center = [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2];
    }

    switch (tool) {
      case 'line': this.drawLine(); break;
      case 'square': this.drawSquare(); break;
      case 'circle': this.drawCircle(); break;
      case 'triangle': this.drawTriangle(); break;
      default:
    }
  },
  drawLine() {
    ctx.beginPath();
    ctx.moveTo(this.start[0], this.start[1]);
    ctx.lineTo(this.end[0], this.end[1]);
    ctx.stroke();
  },
  drawSquare() {
    // not using strokeRect due to weird behavior at the meeting point of the square lines
    ctx.beginPath();
    ctx.moveTo(this.start[0], this.start[1]);
    ctx.lineTo(this.end[0], this.start[1]);
    ctx.lineTo(this.end[0], this.end[1]);
    ctx.lineTo(this.start[0], this.end[1]);
    ctx.lineTo(this.start[0], this.start[1]);
    // last line used to force line caps to meet properly
    ctx.lineTo(this.end[0], this.start[1]);
    ctx.stroke();
  },
  drawCircle() {
    // center and radii of the elipse
    const [cX, cY] = [...this.center];
    const [rX, rY] = [Math.abs(this.start[0] - cX), Math.abs(this.start[1] - cY)];

    ctx.beginPath();
    ctx.ellipse(cX, cY, rX, rY, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
  drawTriangle() {
    const p1 = [this.center[0], this.start[1]];
    const p2 = [this.start[0], this.end[1]];
    const p3 = [...this.end];

    ctx.beginPath();
    ctx.moveTo(...p1);
    ctx.lineTo(...p2);
    ctx.lineTo(...p3);
    ctx.lineTo(...p1);
    // last line used to force line caps to meet properly
    ctx.lineTo(...p2);
    ctx.stroke();
  },
  redrawShape() {
    undoRedoManager.softUndo();
    this.ctx.stroke();
  },

  // special function for the paint tool
  paint(x, y, newColor, image) {
    undoRedoManager.addUndo();
    const { width, height } = image;
    const oldColor = this.getPixelColor(x, y, image);

    // paint over only if initial pixel is has different color
    if (!this.areColorsEqual(oldColor, newColor)) {
      const pixelsToColor = [[x, y]];
      while (pixelsToColor.length) {
        const [pX, pY] = pixelsToColor.shift();
        if (this.areColorsEqual(oldColor, this.getPixelColor(pX, pY, image))) {
          this.setPixelColor(pX, pY, image, newColor);

          const upPixel = [pX, pY - 1];
          if (upPixel[1] >= 0) { pixelsToColor.push(upPixel); }

          const rightPixel = [pX + 1, pY];
          if (rightPixel[0] < width) { pixelsToColor.push(rightPixel); }

          const downPixel = [pX, pY + 1];
          if (downPixel[1] < height) { pixelsToColor.push(downPixel); }

          const leftPixel = [pX - 1, pY];
          if (leftPixel[0] >= 0) { pixelsToColor.push(leftPixel); }
        }
      }
      ctx.putImageData(image, 0, 0);
    }
  },

  getPixelIndex(x, y, image) {
    return y * 4 * image.width + 4 * x;
  },

  getPixelColor(x, y, image) {
    const pixelIndex = this.getPixelIndex(x, y, image);
    return [
      image.data[pixelIndex],
      image.data[pixelIndex + 1],
      image.data[pixelIndex + 2],
      image.data[pixelIndex + 3],
    ];
  },

  setPixelColor(x, y, image, color) {
    const pixelIndex = this.getPixelIndex(x, y, image);
    image.data[pixelIndex] = color[0];
    image.data[pixelIndex + 1] = color[1];
    image.data[pixelIndex + 2] = color[2];
    image.data[pixelIndex + 3] = color[3];
  },

  areColorsEqual(color1, color2) {
    return color1.every((val, index) => val === color2[index]);
  },
};

// stores and updates the x/y coordinates of the cursor on the canvas
const coordinatesManager = {
  // current coordinates of the cursor on client
  x: 0,
  y: 0,

  // position of canvas on client
  offsetX: 0,
  offsetY: 0,

  // updates internal coordinates and displays them on screen
  updateCoordinates(cursorX, cursorY) {
    // update coordinates to the cursor
    this.x = cursorX - this.offsetX;
    this.y = cursorY - this.offsetY;

    // update the coordinates indicator as well
    cursorCoordinatesDisplay.innerText = `${this.x} x ${this.y} px`;

    // return new coordiantes
    return [this.x, this.y];
  },
};

// keeps track of selected tool, width and colors
const configManager = {
  tool: 'pen',

  width: 1,

  primaryColor: 'rgba(0,0,0)',

  secondaryColor: 'rgba(255,255,255)',

  customColors: Array(10).fill('rgba(255,255,255'),

  updateTool() {
    const currentTool = toolInputs.find(element => element.checked).value;
    if (this.tool !== currentTool) {
      this.tool = currentTool;
      // cleanup in case a shape was being drawn
      editBoxManager.deleteBoxes();
    }
  },

  updateWidth(width = 0) {
    const currentWidth = width || parseInt(widthInputs.find(element => element.checked).value, 10);
    if (this.width !== currentWidth) {
      this.width = currentWidth;
      ctx.lineWidth = currentWidth;

      // check if a shape is currently being drawn and redraw it with new width
      if (['line', 'square', 'circle', 'triangle'].indexOf(this.tool) !== -1) {
        drawingManager.redrawShape();
      }
    }
  },

  updateConfig() {
    ctx.lineCap = 'round';
    ctx.lineWidth = this.width;
  },

  updateColor(event) {
    const activeColorElement = activeColorInputs.find(element => element.checked);
    const newColor = event.target.style.backgroundColor;
    activeColorElement.style.backgroundColor = newColor;
    colorPickerInput.value = newColor;
    this[`${activeColorElement.id}Color`] = newColor;
  },

  addNewColor(event) {
    const newColor = event.target.value;
    this.customColors.pop();
    this.customColors.unshift(newColor);
    customColorDisplays.forEach(
      (element, index) => { element.style.backgroundColor = this.customColors[index]; },
    );
    // colors returned from color picker are in hex format
    // have to read color from css to get rbg format instead of using newColor variable
    const newColorRgb = document.querySelector('.color-custom-1').style.backgroundColor;
    // simulate an event to recycle updateColor function
    this.updateColor({ target: { style: { backgroundColor: newColorRgb } } });
  },
};

// mantains the undo/redo stack
const undoRedoManager = {
  size: [0, 0],

  // stacks holding the images to undo/redo
  undoStack: [],
  redoStack: [],

  // pushes current image into undo stack, enables button and cleans redo stack
  addUndo() {
    this.undoStack.push(ctx.getImageData(0, 0, canvasManager.width, canvasManager.height));
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
      const currentImage = ctx.getImageData(0, 0, canvasManager.width, canvasManager.height);
      this.redoStack.push(currentImage);
      document.getElementById('redo-button').removeAttribute('disabled');

      // pop element from stack and restore canvas
      const lastImage = this.undoStack.pop();
      ctx.putImageData(lastImage, 0, 0);

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
      ctx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
    }
  },
  redo() {
    if (this.redoStack.length) {
      // add about to be redoed image to undo stack and enable button
      const currentImage = ctx.getImageData(0, 0, canvasManager.width, canvasManager.height);
      this.undoStack.push(currentImage);
      document.getElementById('undo-button').removeAttribute('disabled');

      // pop element from stack and restore canvas
      const lastImage = this.redoStack.pop();
      ctx.putImageData(lastImage, 0, 0);

      // disable redo button if needed
      if (!this.redoStack.length) {
        document.getElementById('redo-button').setAttribute('disabled', '');
      }
    }
  },
};

// manages the edit boxes that are created for shapes
const editBoxManager = {
  boxes: [],

  // creates 2 resize boxes at start and end point and 1 move box at shape center
  createBoxes() {
    const params = [['start', 'resize'], ['end', 'resize'], ['center', 'move']];
    params.forEach(([position, type]) => {
      // create box
      const editBox = document.createElement('div');
      editBox.id = position;
      editBox.className = `${type}-box box`;

      // push it to the desired position
      const [x, y] = drawingManager[position];
      editBox.style.left = `${x + globals.boxOffset}px`;
      editBox.style.top = `${y + globals.boxOffset}px`;
      drawingArea.appendChild(editBox);

      // keep track of created boxes
      editBoxManager.boxes.push(editBox);
    });
  },

  // deletes all active resize boxes
  deleteBoxes() {
    while (this.boxes.length) {
      const box = this.boxes.pop();
      box.parentElement.removeChild(box);
    }
  },

  // moves selected box to new coordinates
  moveBoxes() {
    ['start', 'end', 'center'].forEach((position) => {
      // new position must be offset by container padding and box size
      const box = document.getElementById(position);
      const [x, y] = drawingManager[position];
      box.style.left = `${x + globals.boxOffset}px`;
      box.style.top = `${y + globals.boxOffset}px`;
    });
  },
};

// manages the size of canvas
const canvasManager = {
  // initial canvas size
  width: 700,
  height: 400,

  rightBox: null,
  bottomBox: null,
  cornerBox: null,

  init() {
    const canvas = document.getElementById('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    this.createBoxes();
    this.moveBoxes();
  },

  createBoxes() {
    const rightBox = document.createElement('div');
    rightBox.className = 'right-box canvas-box';
    drawingArea.appendChild(rightBox);
    this.rightBox = rightBox;

    const bottomBox = document.createElement('div');
    bottomBox.className = 'bottom-box canvas-box';
    drawingArea.appendChild(bottomBox);
    this.bottomBox = bottomBox;

    const cornerBox = document.createElement('div');
    cornerBox.className = 'corner-box canvas-box';
    drawingArea.appendChild(cornerBox);
    this.cornerBox = cornerBox;
  },

  moveBoxes() {
    this.cornerBox.style.top = `${globals.boxOffset + this.height}px`;
    this.cornerBox.style.left = `${globals.boxOffset + this.width}px`;
    this.rightBox.style.top = `${globals.boxOffset + this.height / 2}px`;
    this.rightBox.style.left = `${globals.boxOffset + this.width}px`;
    this.bottomBox.style.top = `${globals.boxOffset + this.height}px`;
    this.bottomBox.style.left = `${globals.boxOffset + this.width / 2}px`;
  },

  resizeCanvas(width, height) {
    // resize canvas
    const canvas = document.getElementById('canvas');
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
  },
};

// intializes some manager variables after the document is loaded
function setup() {
  // add event listeners here to keep html clean
  drawingArea.addEventListener('mousedown', event => eventManager.processEvent(event));
  drawingArea.addEventListener('mousemove', event => eventManager.processEvent(event));
  drawingArea.addEventListener('mouseup', event => eventManager.processEvent(event));

  toolInputs.forEach(element => element.addEventListener('change', () => configManager.updateTool()));

  widthInputs.forEach(element => element.addEventListener('change', () => configManager.updateWidth()));

  const colorOptions = [...document.querySelectorAll('.color-option')];
  colorOptions.forEach(element => element.addEventListener('mouseup', event => configManager.updateColor(event)));

  colorPickerInput.addEventListener('change', event => configManager.addNewColor(event));


  // add preset colors to keep html clean as well
  const presetColor = [
    'rgb(000, 000, 000)', 'rgb(127, 127, 127)', 'rgb(136, 000, 021)', 'rgb(237, 028, 036)', 'rgb(255, 127, 039)',
    'rgb(255, 242, 000)', 'rgb(034, 177, 076)', 'rgb(000, 162, 232)', 'rgb(063, 072, 204)', 'rgb(162, 073, 164)',
    'rgb(255, 255, 255)', 'rgb(195, 195, 195)', 'rgb(185, 122, 087)', 'rgb(255, 175, 201)', 'rgb(255, 201, 14)',
    'rgb(239, 228, 176)', 'rgb(181, 230, 029)', 'rgb(153, 217, 234)', 'rgb(112, 146, 190)', 'rgb(200, 191, 231)',
  ];
  const presetColorElements = [...document.querySelectorAll('.color-preset')];
  presetColorElements.forEach(
    (element, index) => { element.style.backgroundColor = presetColor[index]; },
  );
  document.querySelector('.color-active#primary').style.backgroundColor = '#000000';
  document.querySelector('.color-active#secondary').style.backgroundColor = '#ffffff';


  // initialize canvas and get client coordiantes
  const canvas = document.getElementById('canvas');
  canvasManager.init();
  const rect = canvas.getBoundingClientRect();
  coordinatesManager.offsetX = rect.left;
  coordinatesManager.offsetY = rect.top;

  // get the only render context that will be used throughout the app
  const context2D = canvas.getContext('2d');
  context2D.lineCap = 'round';
  ctx = context2D;
}
setup();