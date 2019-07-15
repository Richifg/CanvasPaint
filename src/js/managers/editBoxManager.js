import { drawingArea } from '../dom-loader';
import { boxOffset } from '../constants';
import { state } from '../state';

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
      const [x, y] = state.drawing[position];
      editBox.style.left = `${x + boxOffset}px`;
      editBox.style.top = `${y + boxOffset}px`;
      drawingArea.appendChild(editBox);

      // prevent context menu from opening on boxes
      editBox.addEventListener('contextmenu', event => event.preventDefault());

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
      const [x, y] = state.drawing[position];
      box.style.left = `${x + boxOffset}px`;
      box.style.top = `${y + boxOffset}px`;
    });
  },
};

export default editBoxManager;
