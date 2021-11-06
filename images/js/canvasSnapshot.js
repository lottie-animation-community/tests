const snapshot = (canvas, container, width, height) => {
  const canvasElement = document.createElement('canvas');
  container.appendChild(canvasElement);
  canvasElement.width = width;
  canvasElement.height = height;
  canvasElement.style.width = `${width}px`;
  canvasElement.style.height = `${height}px`;
  canvasElement.style.display = 'inline-block';
  canvasElement.style.verticalAlign = 'top';
  const canvasContext = canvasElement.getContext('2d');
  canvasContext.drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    canvasElement.width,
    canvasElement.height,
  );
};

export default snapshot;
