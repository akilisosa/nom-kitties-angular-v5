export const getScaledValue = (value: number, size: number) => {

  const scaleFactor = size / 600;
  return Math.round(value * scaleFactor);
}

export  const generateRandomPosition = (collectibleRadius: number, obstacleList: any[], size: number): { x: number, y: number } => {
  let position: any;
  let validPosition = false;

  while (!validPosition) {
    position = {
      x: Math.random() * (size - 2 * collectibleRadius) + collectibleRadius,
      y: Math.random() * (size - 2 * collectibleRadius) + collectibleRadius
    };

    // Check if position overlaps with any obstacles
    validPosition = !obstacleList.some(obstacle =>
      position.x + collectibleRadius > obstacle.x &&
      position.x - collectibleRadius < obstacle.x + obstacle.width &&
      position.y + collectibleRadius > obstacle.y &&
      position.y - collectibleRadius < obstacle.y + obstacle.height
    );
  }

  return position;
}

export const   spawnCollectible = (radius: number, obstacleList: any[], 
  size: number, collectibleList: any[], treatsOnFloor: number) => {
  if (collectibleList.length < treatsOnFloor) {
    const position = generateRandomPosition(radius, obstacleList, size);
    collectibleList.push({
      x: position.x,
      y: position.y,
      radius,
      color: '#FF4E00',
      active: true
    });
  }
}

export const drawKitty = (ctx: any, x: number, y: number, width: number, color: string = '#040607') => {

  const scale = width / 50; // SVG viewBox is 50x50w


  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Main body outline (cls-3)
  ctx.fillStyle = color;
  ctx.strokeStyle = 'black'; // Add stroke color
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(8.6, 1.52);
  ctx.bezierCurveTo(11, 1.05, 14.3, 6.83, 15.71, 8.51);
  ctx.bezierCurveTo(21.03, 7.84, 26.45, 7.8, 31.77, 8.51);
  ctx.bezierCurveTo(32.78, 7.27, 33.61, 5.86, 34.65, 4.65);
  ctx.bezierCurveTo(38.29, 0.4, 39.08, -0.01, 42.49, 6.12);
  ctx.bezierCurveTo(46.73, 13.74, 50.19, 28.3, 44.21, 35.66);
  ctx.bezierCurveTo(42.24, 38.08, 39.32, 39.73, 36.49, 40.93);
  ctx.lineTo(36.49, 44.24);
  ctx.bezierCurveTo(38.52, 44.19, 41.78, 44.76, 43.41, 43.69);
  ctx.bezierCurveTo(44.77, 42.79, 44.94, 40.64, 46.96, 40.5);
  ctx.bezierCurveTo(51.74, 40.17, 50.93, 47.79, 42.67, 49.69);
  ctx.bezierCurveTo(38.39, 49.44, 13.76, 50.02, 12.27, 49.69);
  ctx.bezierCurveTo(10.13, 49.22, 11.49, 42.81, 11.11, 41.05);
  ctx.bezierCurveTo(-1.14, 36.5, -1.51, 24.72, 1.8, 13.72);
  ctx.bezierCurveTo(2.45, 11.53, 6.53, 1.93, 8.6, 1.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}


