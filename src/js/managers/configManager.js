import drawingManager from './drawingManager';
import editBoxManager from './editBoxManager';
import undoRedoManager from './undoRedoManager';
import { state, updateState } from '../state';
import {
  toolInputs,
  widthInputs,
  colorPickerInput,
  activeColorInputs,
  activeColorDisplays,
  customColorDisplays,
} from '../utility/elements';

// keeps track of selected tool, width and colors
const configManager = {
  width: 1,
  customColors: Array(10).fill('rgba(255,255,255'),

  updateTool() {
    const currentTool = toolInputs.find(element => element.checked).value;
    if (state.config.tool !== currentTool) {
      updateState({ tool: currentTool }, 'config');
      // cleanup in case a shape was being drawn
      editBoxManager.deleteBoxes();
    }
  },

  updateWidth(width = 0) {
    const currentWidth = width || parseInt(widthInputs.find(element => element.checked).value, 10);
    if (state.config.width !== currentWidth) {
      updateState({ width: currentWidth }, 'config');
      state.ctx.lineWidth = currentWidth;

      // check if a shape is currently being drawn and redraw it with new width
      if (['line', 'square', 'circle', 'triangle'].indexOf(state.config.tool) !== -1) {
        undoRedoManager.softUndo();
        drawingManager.redrawShape();
      }
    }
  },

  updateConfig() {
    state.ctx.lineCap = 'round';
    state.ctx.lineWidth = state.config.width;
  },

  updateColor(event) {
    const activeColorElement = activeColorInputs.find(element => element.checked);
    const newColor = event.target.style.backgroundColor;
    activeColorDisplays.find(element => element.id === activeColorElement.value)
      .style.backgroundColor = newColor;
    colorPickerInput.value = newColor;
    this[`${activeColorElement.value}Color`] = newColor;

    updateState({ [`${activeColorElement.value}Color`]: newColor }, 'config');
  },

  addNewColor(event) {
    const newColor = event.target.value;
    this.customColors.pop();
    this.customColors.unshift(newColor);
    customColorDisplays.forEach(
      (element, index) => { element.style.backgroundColor = this.customColors[index]; },
    );
    // colors returned from color picker are in hex format
    // have to read color from css to get rbg format instead of using the newColor variable
    const newColorRgb = document.querySelector('.color-custom-1').style.backgroundColor;
    // simulate an event to recycle updateColor function
    this.updateColor({ target: { style: { backgroundColor: newColorRgb } } });
  },
};

export default configManager;
