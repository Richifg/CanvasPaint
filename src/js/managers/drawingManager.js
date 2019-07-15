import { state, updateState } from '../state';

// draws on the canvas
const drawingManager = {
  // start, end and center coordinates of the current drawing
  // used on shapes like line, square and circle
  start: [0, 0],
  end: [0, 0],
  center: [0, 0],


  drawPen(x, y, begin = false) {
    if (begin) {
      state.ctx.beginPath();
      state.ctx.moveTo(x, y);
    }
    state.ctx.lineTo(x, y);
    state.ctx.stroke();
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

    this.updateState();

    switch (tool) {
      case 'line': this.drawLine(); break;
      case 'square': this.drawSquare(); break;
      case 'circle': this.drawCircle(); break;
      case 'triangle': this.drawTriangle(); break;
      default:
    }
  },

  drawLine() {
    state.ctx.beginPath();
    state.ctx.moveTo(this.start[0], this.start[1]);
    state.ctx.lineTo(this.end[0], this.end[1]);
    state.ctx.stroke();
  },

  drawSquare() {
    // not using strokeRect due to weird behavior at the meeting point of the square lines
    state.ctx.beginPath();
    state.ctx.moveTo(this.start[0], this.start[1]);
    state.ctx.lineTo(this.end[0], this.start[1]);
    state.ctx.lineTo(this.end[0], this.end[1]);
    state.ctx.lineTo(this.start[0], this.end[1]);
    state.ctx.lineTo(this.start[0], this.start[1]);
    // last line used to force line caps to meet properly
    state.ctx.lineTo(this.end[0], this.start[1]);
    state.ctx.stroke();
  },

  drawCircle() {
    // center and radii of the elipse
    const [cX, cY] = [...this.center];
    const [rX, rY] = [Math.abs(this.start[0] - cX), Math.abs(this.start[1] - cY)];

    state.ctx.beginPath();
    state.ctx.ellipse(cX, cY, rX, rY, 0, 0, Math.PI * 2);
    state.ctx.stroke();
  },

  drawTriangle() {
    const p1 = [this.center[0], this.start[1]];
    const p2 = [this.start[0], this.end[1]];
    const p3 = [...this.end];

    state.ctx.beginPath();
    state.ctx.moveTo(...p1);
    state.ctx.lineTo(...p2);
    state.ctx.lineTo(...p3);
    state.ctx.lineTo(...p1);
    // last line used to force line caps to meet properly
    state.ctx.lineTo(...p2);
    state.ctx.stroke();
  },

  redrawShape() {
    state.ctx.stroke();
  },

  // paint tool requires manipulation of individual pixels
  // so it has its own set of special functions
  paint(x, y, newColor, image) {
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
      state.ctx.putImageData(image, 0, 0);
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
    [
      image.data[pixelIndex],
      image.data[pixelIndex + 1],
      image.data[pixelIndex + 2],
      image.data[pixelIndex + 3],
    ] = color;
  },

  areColorsEqual(color1, color2) {
    return color1.every((val, index) => val === color2[index]);
  },

  updateState() {
    updateState({ start: this.start, end: this.end, center: this.center }, 'drawing');
  },
};

export default drawingManager;
