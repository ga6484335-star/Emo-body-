// Authentic 5x7 ASCII font table (columns left-to-right, LSB = top row)
// Covers printable ASCII 0x20 (space) through 0x7E (~)
const FONT_5X7: Record<number, [number, number, number, number, number]> = {
  32: [0x00, 0x00, 0x00, 0x00, 0x00], // ' '
  33: [0x00, 0x00, 0x5f, 0x00, 0x00], // '!'
  34: [0x00, 0x07, 0x00, 0x07, 0x00], // '"'
  35: [0x14, 0x7f, 0x14, 0x7f, 0x14], // '#'
  36: [0x24, 0x2a, 0x7f, 0x2a, 0x12], // '$'
  37: [0x23, 0x13, 0x08, 0x64, 0x62], // '%'
  38: [0x36, 0x49, 0x55, 0x22, 0x50], // '&'
  39: [0x00, 0x05, 0x03, 0x00, 0x00], // '''
  40: [0x00, 0x1c, 0x22, 0x41, 0x00], // '('
  41: [0x00, 0x41, 0x22, 0x1c, 0x00], // ')'
  42: [0x14, 0x08, 0x3e, 0x08, 0x14], // '*'
  43: [0x08, 0x08, 0x3e, 0x08, 0x08], // '+'
  44: [0x00, 0x50, 0x30, 0x00, 0x00], // ','
  45: [0x08, 0x08, 0x08, 0x08, 0x08], // '-'
  46: [0x00, 0x60, 0x60, 0x00, 0x00], // '.'
  47: [0x20, 0x10, 0x08, 0x04, 0x02], // '/'
  48: [0x3e, 0x51, 0x49, 0x45, 0x3e], // '0'
  49: [0x00, 0x42, 0x7f, 0x40, 0x00], // '1'
  50: [0x42, 0x61, 0x51, 0x49, 0x46], // '2'
  51: [0x21, 0x41, 0x45, 0x4b, 0x31], // '3'
  52: [0x18, 0x14, 0x12, 0x7f, 0x10], // '4'
  53: [0x27, 0x45, 0x45, 0x45, 0x39], // '5'
  54: [0x3c, 0x4a, 0x49, 0x49, 0x30], // '6'
  55: [0x01, 0x71, 0x09, 0x05, 0x03], // '7'
  56: [0x36, 0x49, 0x49, 0x49, 0x36], // '8'
  57: [0x06, 0x49, 0x49, 0x29, 0x1e], // '9'
  58: [0x00, 0x36, 0x36, 0x00, 0x00], // ':'
  59: [0x00, 0x56, 0x36, 0x00, 0x00], // ';'
  60: [0x08, 0x14, 0x22, 0x41, 0x00], // '<'
  61: [0x14, 0x14, 0x14, 0x14, 0x14], // '='
  62: [0x00, 0x41, 0x22, 0x14, 0x08], // '>'
  63: [0x02, 0x01, 0x51, 0x09, 0x06], // '?'
  64: [0x32, 0x49, 0x79, 0x41, 0x3e], // '@'
  65: [0x7e, 0x11, 0x11, 0x11, 0x7e], // 'A'
  66: [0x7f, 0x49, 0x49, 0x49, 0x36], // 'B'
  67: [0x3e, 0x41, 0x41, 0x41, 0x22], // 'C'
  68: [0x7f, 0x41, 0x41, 0x22, 0x1c], // 'D'
  69: [0x7f, 0x49, 0x49, 0x49, 0x41], // 'E'
  70: [0x7f, 0x09, 0x09, 0x09, 0x01], // 'F'
  71: [0x3e, 0x41, 0x49, 0x49, 0x7a], // 'G'
  72: [0x7f, 0x08, 0x08, 0x08, 0x7f], // 'H'
  73: [0x00, 0x41, 0x7f, 0x41, 0x00], // 'I'
  74: [0x20, 0x40, 0x41, 0x3f, 0x01], // 'J'
  75: [0x7f, 0x08, 0x14, 0x22, 0x41], // 'K'
  76: [0x7f, 0x40, 0x40, 0x40, 0x40], // 'L'
  77: [0x7f, 0x02, 0x0c, 0x02, 0x7f], // 'M'
  78: [0x7f, 0x04, 0x08, 0x10, 0x7f], // 'N'
  79: [0x3e, 0x41, 0x41, 0x41, 0x3e], // 'O'
  80: [0x7f, 0x09, 0x09, 0x09, 0x06], // 'P'
  81: [0x3e, 0x41, 0x51, 0x21, 0x5e], // 'Q'
  82: [0x7f, 0x09, 0x19, 0x29, 0x46], // 'R'
  83: [0x46, 0x49, 0x49, 0x49, 0x31], // 'S'
  84: [0x01, 0x01, 0x7f, 0x01, 0x01], // 'T'
  85: [0x3f, 0x40, 0x40, 0x40, 0x3f], // 'U'
  86: [0x1f, 0x20, 0x40, 0x20, 0x1f], // 'V'
  87: [0x3f, 0x40, 0x38, 0x40, 0x3f], // 'W'
  88: [0x63, 0x14, 0x08, 0x14, 0x63], // 'X'
  89: [0x07, 0x08, 0x70, 0x08, 0x07], // 'Y'
  90: [0x61, 0x51, 0x49, 0x45, 0x43], // 'Z'
  91: [0x00, 0x7f, 0x41, 0x41, 0x00], // '['
  92: [0x02, 0x04, 0x08, 0x10, 0x20], // '\'
  93: [0x00, 0x41, 0x41, 0x7f, 0x00], // ']'
  94: [0x04, 0x02, 0x01, 0x02, 0x04], // '^'
  95: [0x40, 0x40, 0x40, 0x40, 0x40], // '_'
  96: [0x00, 0x01, 0x02, 0x04, 0x00], // '`'
  97: [0x20, 0x54, 0x54, 0x54, 0x78], // 'a'
  98: [0x7f, 0x48, 0x44, 0x44, 0x38], // 'b'
  99: [0x38, 0x44, 0x44, 0x44, 0x20], // 'c'
  100: [0x38, 0x44, 0x44, 0x48, 0x7f], // 'd'
  101: [0x38, 0x54, 0x54, 0x54, 0x18], // 'e'
  102: [0x08, 0x7e, 0x09, 0x01, 0x02], // 'f'
  103: [0x0c, 0x52, 0x52, 0x52, 0x3e], // 'g'
  104: [0x7f, 0x08, 0x04, 0x04, 0x78], // 'h'
  105: [0x00, 0x44, 0x7d, 0x40, 0x00], // 'i'
  106: [0x20, 0x40, 0x44, 0x3d, 0x00], // 'j'
  107: [0x7f, 0x10, 0x28, 0x44, 0x00], // 'k'
  108: [0x00, 0x41, 0x7f, 0x40, 0x00], // 'l'
  109: [0x7c, 0x04, 0x18, 0x04, 0x78], // 'm'
  110: [0x7c, 0x08, 0x04, 0x04, 0x78], // 'n'
  111: [0x38, 0x44, 0x44, 0x44, 0x38], // 'o'
  112: [0x7c, 0x14, 0x14, 0x14, 0x08], // 'p'
  113: [0x08, 0x14, 0x14, 0x18, 0x7c], // 'q'
  114: [0x7c, 0x08, 0x04, 0x04, 0x08], // 'r'
  115: [0x48, 0x54, 0x54, 0x54, 0x20], // 's'
  116: [0x04, 0x3f, 0x44, 0x40, 0x20], // 't'
  117: [0x3c, 0x40, 0x40, 0x20, 0x7c], // 'u'
  118: [0x1c, 0x20, 0x40, 0x20, 0x1c], // 'v'
  119: [0x3c, 0x40, 0x30, 0x40, 0x3c], // 'w'
  120: [0x44, 0x28, 0x10, 0x28, 0x44], // 'x'
  121: [0x0c, 0x50, 0x50, 0x50, 0x3c], // 'y'
  122: [0x44, 0x64, 0x54, 0x4c, 0x44], // 'z'
  123: [0x00, 0x08, 0x36, 0x41, 0x00], // '{'
  124: [0x00, 0x00, 0x7f, 0x00, 0x00], // '|'
  125: [0x00, 0x41, 0x36, 0x08, 0x00], // '}'
  126: [0x10, 0x08, 0x08, 0x10, 0x08], // '~'
};

export const SSD1306_BLACK = 0;
export const SSD1306_WHITE = 1;
export const SSD1306_INVERSE = 2;

export class VirtualSSD1306 {
  public readonly width: number;
  public readonly height: number;
  private workBuffer: Uint8Array;
  private displayBuffer: Uint8Array;
  public initialized = false;
  public i2cAddress = 0x3c;
  public inverted = false;
  public dimmed = false;
  public cursorX = 0;
  public cursorY = 0;
  public textSize = 1;
  public textColor = SSD1306_WHITE;
  public textBgColor = -1; // -1 = transparent
  public textWrap = true;
  public frameCount = 0;
  public drawCallsCount = 0;

  constructor(width = 128, height = 64) {
    this.width = width;
    this.height = height;
    this.workBuffer = new Uint8Array(width * height);
    this.displayBuffer = new Uint8Array(width * height);
  }

  public reset(): void {
    this.workBuffer.fill(0);
    this.displayBuffer.fill(0);
    this.initialized = false;
    this.inverted = false;
    this.dimmed = false;
    this.cursorX = 0;
    this.cursorY = 0;
    this.textSize = 1;
    this.textColor = SSD1306_WHITE;
    this.textBgColor = -1;
    this.frameCount = 0;
    this.drawCallsCount = 0;
  }

  public begin(_vcs = 0x02, addr = 0x3c): boolean {
    this.initialized = true;
    this.i2cAddress = addr || 0x3c;
    // Start blank — never show splash screen unless firmware explicitly draws!
    this.workBuffer.fill(0);
    this.displayBuffer.fill(0);
    return true;
  }

  public clearDisplay(): void {
    this.workBuffer.fill(0);
    this.drawCallsCount++;
  }

  public display(): void {
    this.displayBuffer.set(this.workBuffer);
    this.frameCount++;
  }

  public getDisplayBuffer(): Uint8Array {
    return this.displayBuffer;
  }

  public getActivePixelCount(): number {
    let count = 0;
    for (let i = 0; i < this.displayBuffer.length; i++) {
      if (this.displayBuffer[i] !== 0) count++;
    }
    return count;
  }

  public invertDisplay(inv: boolean): void {
    this.inverted = Boolean(inv);
  }

  public dim(d: boolean): void {
    this.dimmed = Boolean(d);
  }

  public drawPixel(x: number, y: number, color = SSD1306_WHITE): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    const idx = iy * this.width + ix;
    if (color === SSD1306_WHITE) {
      this.workBuffer[idx] = 1;
    } else if (color === SSD1306_BLACK) {
      this.workBuffer[idx] = 0;
    } else if (color === SSD1306_INVERSE) {
      this.workBuffer[idx] = this.workBuffer[idx] ? 0 : 1;
    }
    this.drawCallsCount++;
  }

  public getPixel(x: number, y: number): number {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return 0;
    return this.displayBuffer[iy * this.width + ix];
  }

  public drawFastHLine(x: number, y: number, w: number, color = SSD1306_WHITE): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    if (iy < 0 || iy >= this.height) return;
    for (let dx = 0; dx < iw; dx++) {
      this.drawPixel(ix + dx, iy, color);
    }
  }

  public drawFastVLine(x: number, y: number, h: number, color = SSD1306_WHITE): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const ih = Math.round(h);
    if (ix < 0 || ix >= this.width) return;
    for (let dy = 0; dy < ih; dy++) {
      this.drawPixel(ix, iy + dy, color);
    }
  }

  public drawLine(x0: number, y0: number, x1: number, y1: number, color = SSD1306_WHITE): void {
    let ix0 = Math.round(x0);
    let iy0 = Math.round(y0);
    const ix1 = Math.round(x1);
    const iy1 = Math.round(y1);

    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.drawPixel(ix0, iy0, color);
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  public drawRect(x: number, y: number, w: number, h: number, color = SSD1306_WHITE): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    const ih = Math.round(h);
    if (iw <= 0 || ih <= 0) return;
    this.drawFastHLine(ix, iy, iw, color);
    this.drawFastHLine(ix, iy + ih - 1, iw, color);
    this.drawFastVLine(ix, iy, ih, color);
    this.drawFastVLine(ix + iw - 1, iy, ih, color);
  }

  public fillRect(x: number, y: number, w: number, h: number, color = SSD1306_WHITE): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    const ih = Math.round(h);
    if (iw <= 0 || ih <= 0) return;
    for (let dy = 0; dy < ih; dy++) {
      this.drawFastHLine(ix, iy + dy, iw, color);
    }
  }

  private drawCircleHelper(x0: number, y0: number, r: number, cornerMask: number, color: number): void {
    let f = 1 - r;
    let ddFx = 1;
    let ddFy = -2 * r;
    let x = 0;
    let y = r;

    while (x < y) {
      if (f >= 0) {
        y--;
        ddFy += 2;
        f += ddFy;
      }
      x++;
      ddFx += 2;
      f += ddFx;
      if (cornerMask & 0x4) {
        this.drawPixel(x0 + x, y0 + y, color);
        this.drawPixel(x0 + y, y0 + x, color);
      }
      if (cornerMask & 0x2) {
        this.drawPixel(x0 + x, y0 - y, color);
        this.drawPixel(x0 + y, y0 - x, color);
      }
      if (cornerMask & 0x8) {
        this.drawPixel(x0 - y, y0 + x, color);
        this.drawPixel(x0 - x, y0 + y, color);
      }
      if (cornerMask & 0x1) {
        this.drawPixel(x0 - y, y0 - x, color);
        this.drawPixel(x0 - x, y0 - y, color);
      }
    }
  }

  private fillCircleHelper(
    x0: number,
    y0: number,
    r: number,
    corners: number,
    delta: number,
    color: number
  ): void {
    let f = 1 - r;
    let ddFx = 1;
    let ddFy = -2 * r;
    let x = 0;
    let y = r;
    let px = x;
    let py = y;
    const d = delta + 1;

    while (x < y) {
      if (f >= 0) {
        y--;
        ddFy += 2;
        f += ddFy;
      }
      x++;
      ddFx += 2;
      f += ddFx;
      if (x < y + 1) {
        if (corners & 1) this.drawFastVLine(x0 + x, y0 - y, 2 * y + d, color);
        if (corners & 2) this.drawFastVLine(x0 - x, y0 - y, 2 * y + d, color);
      }
      if (y !== py) {
        if (corners & 1) this.drawFastVLine(x0 + py, y0 - px, 2 * px + d, color);
        if (corners & 2) this.drawFastVLine(x0 - py, y0 - px, 2 * px + d, color);
        py = y;
      }
      px = x;
    }
  }

  public drawRoundRect(x: number, y: number, w: number, h: number, r: number, color = SSD1306_WHITE): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    const ih = Math.round(h);
    const maxR = Math.floor(Math.min(iw, ih) / 2);
    const ir = Math.max(0, Math.min(Math.round(r), maxR));
    this.drawFastHLine(ix + ir, iy, iw - 2 * ir, color);
    this.drawFastHLine(ix + ir, iy + ih - 1, iw - 2 * ir, color);
    this.drawFastVLine(ix, iy + ir, ih - 2 * ir, color);
    this.drawFastVLine(ix + iw - 1, iy + ir, ih - 2 * ir, color);
    this.drawCircleHelper(ix + ir, iy + ir, ir, 1, color);
    this.drawCircleHelper(ix + iw - ir - 1, iy + ir, ir, 2, color);
    this.drawCircleHelper(ix + iw - ir - 1, iy + ih - ir - 1, ir, 4, color);
    this.drawCircleHelper(ix + ir, iy + ih - ir - 1, ir, 8, color);
  }

  public fillRoundRect(x: number, y: number, w: number, h: number, r: number, color = SSD1306_WHITE): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    const ih = Math.round(h);
    const maxR = Math.floor(Math.min(iw, ih) / 2);
    const ir = Math.max(0, Math.min(Math.round(r), maxR));
    this.fillRect(ix + ir, iy, iw - 2 * ir, ih, color);
    this.fillCircleHelper(ix + iw - ir - 1, iy + ir, ir, 1, ih - 2 * ir - 1, color);
    this.fillCircleHelper(ix + ir, iy + ir, ir, 2, ih - 2 * ir - 1, color);
  }

  public drawCircle(x0: number, y0: number, r: number, color = SSD1306_WHITE): void {
    const cx = Math.round(x0);
    const cy = Math.round(y0);
    const ir = Math.round(r);
    if (ir < 0) return;
    let f = 1 - ir;
    let ddFx = 1;
    let ddFy = -2 * ir;
    let x = 0;
    let y = ir;

    this.drawPixel(cx, cy + ir, color);
    this.drawPixel(cx, cy - ir, color);
    this.drawPixel(cx + ir, cy, color);
    this.drawPixel(cx - ir, cy, color);

    while (x < y) {
      if (f >= 0) {
        y--;
        ddFy += 2;
        f += ddFy;
      }
      x++;
      ddFx += 2;
      f += ddFx;
      this.drawPixel(cx + x, cy + y, color);
      this.drawPixel(cx - x, cy + y, color);
      this.drawPixel(cx + x, cy - y, color);
      this.drawPixel(cx - x, cy - y, color);
      this.drawPixel(cx + y, cy + x, color);
      this.drawPixel(cx - y, cy + x, color);
      this.drawPixel(cx + y, cy - x, color);
      this.drawPixel(cx - y, cy - x, color);
    }
  }

  public fillCircle(x0: number, y0: number, r: number, color = SSD1306_WHITE): void {
    const cx = Math.round(x0);
    const cy = Math.round(y0);
    const ir = Math.round(r);
    if (ir < 0) return;
    this.drawFastVLine(cx, cy - ir, 2 * ir + 1, color);
    this.fillCircleHelper(cx, cy, ir, 3, 0, color);
  }

  public drawTriangle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = SSD1306_WHITE
  ): void {
    this.drawLine(x0, y0, x1, y1, color);
    this.drawLine(x1, y1, x2, y2, color);
    this.drawLine(x2, y2, x0, y0, color);
  }

  public fillTriangle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = SSD1306_WHITE
  ): void {
    let ax = Math.round(x0),
      ay = Math.round(y0);
    let bx = Math.round(x1),
      by = Math.round(y1);
    let cx = Math.round(x2),
      cy = Math.round(y2);

    if (ay > by) {
      [ax, bx] = [bx, ax];
      [ay, by] = [by, ay];
    }
    if (by > cy) {
      [bx, cx] = [cx, bx];
      [by, cy] = [cy, by];
    }
    if (ay > by) {
      [ax, bx] = [bx, ax];
      [ay, by] = [by, ay];
    }

    if (ay === cy) {
      const minX = Math.min(ax, bx, cx);
      const maxX = Math.max(ax, bx, cx);
      this.drawFastHLine(minX, ay, maxX - minX + 1, color);
      return;
    }

    const dx01 = bx - ax,
      dy01 = by - ay;
    const dx02 = cx - ax,
      dy02 = cy - ay;
    const dx12 = cx - bx,
      dy12 = cy - by;
    let sa = 0,
      sb = 0;
    const last = by === cy ? by : by - 1;

    for (let y = ay; y <= last; y++) {
      const a = dy01 !== 0 ? ax + Math.trunc(sa / dy01) : ax;
      const b = dy02 !== 0 ? ax + Math.trunc(sb / dy02) : ax;
      sa += dx01;
      sb += dx02;
      const startX = Math.min(a, b);
      const endX = Math.max(a, b);
      this.drawFastHLine(startX, y, endX - startX + 1, color);
    }

    sa = dx12 * (last + 1 - by);
    sb = dx02 * (last + 1 - ay);
    for (let y = last + 1; y <= cy; y++) {
      const a = dy12 !== 0 ? bx + Math.trunc(sa / dy12) : bx;
      const b = dy02 !== 0 ? ax + Math.trunc(sb / dy02) : ax;
      sa += dx12;
      sb += dx02;
      const startX = Math.min(a, b);
      const endX = Math.max(a, b);
      this.drawFastHLine(startX, y, endX - startX + 1, color);
    }
  }

  public drawBitmap(
    x: number,
    y: number,
    bitmap: number[],
    w: number,
    h: number,
    color = SSD1306_WHITE
  ): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    const ih = Math.round(h);
    const byteWidth = Math.floor((iw + 7) / 8);
    for (let j = 0; j < ih; j++) {
      for (let i = 0; i < iw; i++) {
        const byteIdx = j * byteWidth + Math.floor(i / 8);
        const byteVal = bitmap[byteIdx] ?? 0;
        if (byteVal & (0x80 >> (i & 7))) {
          this.drawPixel(ix + i, iy + j, color);
        }
      }
    }
  }

  public setCursor(x: number, y: number): void {
    this.cursorX = Math.round(x);
    this.cursorY = Math.round(y);
  }

  public setTextSize(s: number): void {
    this.textSize = Math.max(1, Math.min(8, Math.round(s)));
  }

  public setTextColor(color: number, bg = -1): void {
    this.textColor = color;
    this.textBgColor = bg;
  }

  public drawChar(x: number, y: number, charCode: number, color: number, bg: number, size: number): void {
    const glyph = FONT_5X7[charCode] ?? FONT_5X7[63]; // fallback '?'
    for (let col = 0; col < 5; col++) {
      const colBits = glyph[col];
      for (let row = 0; row < 8; row++) {
        const on = (colBits >> row) & 1;
        if (on) {
          if (size === 1) this.drawPixel(x + col, y + row, color);
          else this.fillRect(x + col * size, y + row * size, size, size, color);
        } else if (bg >= 0 && bg !== color) {
          if (size === 1) this.drawPixel(x + col, y + row, bg);
          else this.fillRect(x + col * size, y + row * size, size, size, bg);
        }
      }
    }
  }

  public print(text: string): void {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "\n") {
        this.cursorX = 0;
        this.cursorY += this.textSize * 8;
        continue;
      }
      if (ch === "\r") continue;
      if (this.textWrap && this.cursorX + this.textSize * 6 > this.width) {
        this.cursorX = 0;
        this.cursorY += this.textSize * 8;
      }
      this.drawChar(
        this.cursorX,
        this.cursorY,
        ch.charCodeAt(0),
        this.textColor,
        this.textBgColor,
        this.textSize
      );
      this.cursorX += this.textSize * 6;
    }
  }

  public println(text = ""): void {
    this.print(text + "\n");
  }

  /**
   * Produces authentic SSD1306 1024-byte page-organized hex dump (8 pages x 128 cols)
   */
  public getPageBytes(): Uint8Array {
    const pages = Math.ceil(this.height / 8);
    const out = new Uint8Array(pages * this.width);
    for (let p = 0; p < pages; p++) {
      for (let x = 0; x < this.width; x++) {
        let b = 0;
        for (let bit = 0; bit < 8; bit++) {
          const y = p * 8 + bit;
          if (y < this.height && this.displayBuffer[y * this.width + x]) {
            b |= 1 << bit;
          }
        }
        out[p * this.width + x] = b;
      }
    }
    return out;
  }
}
