export const debounceFunction = (func, delay) => {
  let id = '';
  return function () {
    clearTimeout(id);
    id = setTimeout(func.bind(this, ...arguments), delay);
  };
};
