
export default class BetterCtx {

  constructor(ctx) {
    this.ctx = ctx;
    this.offsetX = 30;
    this.offsetY = 0;
    this.zoom = 1;

    this.xA = this.gameCoordsToCanvasX;
    this.yA = this.gameCoordsToCanvasY;

    this.lastRect = null;
    this.lastCircle = null;

    ctx.imageSmoothingEnabled = false
  }

  get abs() {
    return this.ctx;
  }

  canvasCoordsToGameX(x) {
    return (x - this.offsetX) / this.zoom;
  }

  canvasCoordsToGameY(y) {
    return (y - this.offsetY) / this.zoom;
  }

  gameCoordsToCanvasX(x) {
    //game coordinates to canvas coordinates

    return x * this.zoom + this.offsetX;
  }

  gameCoordsToCanvasY(y) {
    //game coordinates to canvas coordinates

    return y * this.zoom + this.offsetY;
  }

  measureText(text) {
    let res = this.ctx.measureText(text);
    return { width: res.width / this.zoom };
  }

  fillRect(x, y, width, height) {
    if (typeof x == "object") {
      y = x.y;
      width = x.width;
      height = x.height;
      x = x.x;
    }

    this.ctx.fillRect(this.xA(x), this.yA(y), width * this.zoom, height * this.zoom);

    this.lastRect = {
      x, y, width, height
    };
  }

  fillCircle(x, y, radius) {
    this.ctx.beginPath();
    this.ctx.arc(this.xA(x), this.yA(y), radius * this.zoom, 0, 2 * Math.PI);
    this.ctx.fill();

    this.lastCircle = {
      x, y, radius
    };
  }

  arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    this.ctx.arc(this.xA(x), this.yA(y), radius * this.zoom, startAngle, endAngle, anticlockwise);
  }

  createLinearGradient(x0, y0, x1, y1) {
    return this.ctx.createLinearGradient(this.xA(x0), this.yA(y0), this.xA(x1), this.yA(y1));
  }

  beginPath() {
    this.ctx.beginPath();
  }

  moveTo(x, y) {
    this.ctx.moveTo(this.xA(x), this.yA(y));
  }

  lineTo(x, y) {
    this.ctx.lineTo(this.xA(x), this.yA(y));
  }

  stroke() {
    this.ctx.stroke();
  }

  fill() {
    this.ctx.fill();
  }

  closePath() {
    this.ctx.closePath();
  }

  clearRect(x, y, width, height) {
    this.ctx.clearRect(this.xA(x), this.yA(y), width * this.zoom, height * this.zoom);
  }

  drawImage(img, x, y, width, height, x2, y2, width2, height2) {
    if(!img) return;

    if (!x2) {
      this.ctx.drawImage(img, this.xA(x), this.yA(y), width * this.zoom, height * this.zoom);
    } else {
      this.ctx.drawImage(img, x, y, width, height, this.xA(x2), this.yA(y2), width2 * this.zoom, height2 * this.zoom);
    }
  }

  drawFrame(sheet, x, y, width, height, frameNum) {
    const { asset, frames } = sheet;

    let frame = frames[frameNum];

    if (frame == null) return;

    this.drawImage(asset, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
  }

  animateSheet(sheet, x, y, width, height, frameTime) {
    
    let frameCount = sheet.frames.length;

    let frame = (Math.floor(Date.now() / frameTime)) % frameCount;

    this.drawFrame(sheet, x, y, width, height, frame);

  }

  fillText(text, x, y) {
    this.ctx.fillText(text, this.xA(x), this.yA(y));
  }

  save() {
    this.ctx.save();
  }

  restore() {
    this.ctx.restore();
  }

  set fillStyle(color) {
    this.ctx.fillStyle = color;
  }
  
  set strokeStyle(color) {
    this.ctx.strokeStyle = color;
  }

  set lineWidth(width) {
    this.ctx.lineWidth = width;
  }
  
  set lineCap(cap) {
    this.ctx.lineCap = cap;
  }

  set font(font) {
    this.ctx.font = font;
  }

  set textAlign(textAlign) {
    this.ctx.textAlign = textAlign;
  }

  set textBaseline(textBaseline) {
    this.ctx.textBaseline = textBaseline;
  }

  set fontSize(fontSize) {
    this.ctx.font = fontSize * this.zoom + "px Arial";
  }

  set globalAlpha(alpha) {
    this.ctx.globalAlpha = alpha;
  }

  get globalAlpha() {
    return this.ctx.globalAlpha;
  }

  get fillStyle() {
    return this.ctx.fillStyle;
  }

  get strokeStyle() {
    return this.ctx.strokeStyle;
  }

  get lineWidth() {
    return this.ctx.lineWidth;
  }

  get lineCap() {
    return this.ctx.lineCap;
  }
  
  get font() {
    return this.ctx.font;
  }

}
