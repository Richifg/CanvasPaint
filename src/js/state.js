// several managers use state properties they do not set

export const state = {
  ctx: null,
  // set by canvasManager
  canvas: {
    width: 700,
    height: 400,
  },
  // set by drawingManager
  drawing: {
    start: 0,
    end: 0,
    center: 0,
  },
  // set by configManager
  config: {
    tool: 'pen',
    width: 1,
    primaryColor: 'rgba(0,0,0)',
    secondaryColor: 'rgba(255,255,255)',
  },
  // set by coordinatesManager
  coordinates: {
    x: 0,
    y: 0,
  },
};

export function updateState(newItems, category) {
  state[category] = Object.assign(state[category], newItems);
  // DEBUG ONLY
  // if (category !== 'coordinates') console.log(state);
}
