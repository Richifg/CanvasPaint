// imports for webapck to find
import '../css/styles.css';

import canvasManager from './managers/canvasManager';
import undoRedoManager from './managers/undoRedoManager';
import configManager from './managers/configManager';
import coordinatesManager from './managers/coordinatesManager';
import eventManager from './managers/eventManager';
import { state } from './state';

import {
  drawingArea,
  canvas,
  toolInputs,
  widthInputs,
  colorPickerInput,
} from './utility/elements';

function setup() {
  // initialize canvas and get client coordinates
  canvasManager.init();
  const rect = canvas.getBoundingClientRect();
  coordinatesManager.offsetX = parseInt(rect.left, 10);
  coordinatesManager.offsetY = parseInt(rect.top, 10);

  // get the one render context that will be used throughout the app
  const context2D = canvas.getContext('2d');
  state.ctx = context2D;
  configManager.updateConfig();

  // add all event listeners here to keep html clean
  drawingArea.addEventListener('mousedown', event => eventManager.processEvent(event));
  drawingArea.addEventListener('mousemove', event => eventManager.processEvent(event));
  drawingArea.addEventListener('mouseup', event => eventManager.processEvent(event));

  toolInputs.forEach(element => element.addEventListener('change', () => configManager.updateTool()));
  widthInputs.forEach(element => element.addEventListener('change', () => configManager.updateWidth()));
  colorPickerInput.addEventListener('change', event => configManager.addNewColor(event));

  [...document.querySelectorAll('.color-option')].forEach(
    element => element.addEventListener('mouseup', event => configManager.updateColor(event)),
  );

  document.getElementById('undo-button').addEventListener('mouseup', () => undoRedoManager.undo());
  document.getElementById('redo-button').addEventListener('mouseup', () => undoRedoManager.redo());

  // remove right-click menu
  canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); });
  [...document.querySelectorAll('.box')].forEach(
    element => element.addEventListener('contextmenu', (event) => { event.preventDefault(); }),
  );

  // add preset colors here to keep html clean as well
  // rbg format is used through the app because it maps easly to canvas image format
  const presetColor = [
    'rgb(000, 000, 000)', 'rgb(127, 127, 127)', 'rgb(136, 000, 021)', 'rgb(237, 028, 036)', 'rgb(255, 127, 039)',
    'rgb(255, 242, 000)', 'rgb(034, 177, 076)', 'rgb(000, 162, 232)', 'rgb(063, 072, 204)', 'rgb(162, 073, 164)',
    'rgb(255, 255, 255)', 'rgb(195, 195, 195)', 'rgb(185, 122, 087)', 'rgb(255, 175, 201)', 'rgb(255, 201, 14)',
    'rgb(239, 228, 176)', 'rgb(181, 230, 029)', 'rgb(153, 217, 234)', 'rgb(112, 146, 190)', 'rgb(200, 191, 231)',
  ];
  [...document.querySelectorAll('.color-preset')].forEach(
    (element, index) => { element.style.backgroundColor = presetColor[index]; },
  );
  document.querySelector('.color-active#primary').style.backgroundColor = '#000000';
  document.querySelector('.color-active#secondary').style.backgroundColor = '#ffffff';
}

document.addEventListener('DOMContentLoaded', () => setup());
