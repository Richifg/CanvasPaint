import { cursorCoordinatesDisplay } from '../dom-loader';
import { updateState } from '../state';

// updates the x/y coordinates of the cursor on the canvas
const coordinatesManager = {
  // position of canvas on client
  offsetX: 0,
  offsetY: 0,

  // updates internal coordinates and displays them on screen
  updateCoordinates(cursorX, cursorY) {
    // update coordinates to the cursor
    const [x, y] = [cursorX - this.offsetX, cursorY - this.offsetY];

    // update the coordinates indicator as well
    cursorCoordinatesDisplay.innerText = `${x} x ${y} px`;

    updateState({ x, y }, 'coordinates');
  },
};

export default coordinatesManager;
