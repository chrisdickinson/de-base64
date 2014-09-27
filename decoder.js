module.exports = Decoder

function Decoder() {
  this._last = 0
  this._current = 0
  this._offset = 0
  this.backOff = 0
  this.lastIDX = 0
}

var proto = Decoder.prototype

var charMap = {
  65:  0,  78: 13,   97: 26,  110: 39,  48: 52,
  66:  1,  79: 14,   98: 27,  111: 40,  49: 53,
  67:  2,  80: 15,   99: 28,  112: 41,  50: 54,
  68:  3,  81: 16,  100: 29,  113: 42,  51: 55,
  69:  4,  82: 17,  101: 30,  114: 43,  52: 56,
  70:  5,  83: 18,  102: 31,  115: 44,  53: 57,
  71:  6,  84: 19,  103: 32,  116: 45,  54: 58,
  72:  7,  85: 20,  104: 33,  117: 46,  55: 59,
  73:  8,  86: 21,  105: 34,  118: 47,  56: 60,
  74:  9,  87: 22,  106: 35,  119: 48,  57: 61,
  75: 10,  88: 23,  107: 36,  120: 49,  43: 62,
  76: 11,  89: 24,  108: 37,  121: 50,  47: 63,
  77: 12,  90: 25,  109: 38,  122: 51,  61: 0
}

var charMapArr = new Array(256) 
for(var i = 0, len = 256; i < len; ++i) {
  charMapArr[i] = charMap[i] || 0
}
proto._charMap = charMapArr

function map(inp) {
  return inp > 64 ?
      inp > 96 ? inp - 71 : inp - 65 :
      inp == 61 ? 0 : inp + 4
}

proto.decodeByte = function Decoder_decodeByte(input) {
  var byte = 0
  this._last = this._current
  this._current = map(input)

  this.backOff += input == 61 ? 1 : 0
  
  byte = this._cursor > 1 ? (this._cursor < 3 ? (this._last & 0x03) << 6 | (this._current & 0x3f) : 0) :
         (this._cursor > 0 ? (this._last & 0x0f) << 4 | (this._current & 0x3c) >> 2 : (this._last & 0x3f) << 2 | (this._current & 0x30) >> 4)

  ++this._cursor
  this._cursor &= 3

  return byte
}

proto.decode = function Decoder_decode(chunk) {
  this.lastIDX = 0
  this.backOff = 0

  var output

  for(var idx = 0, len = chunk.length; idx < len; ++idx) {
    output = this.decodeByte(chunk[idx])
    if (this._cursor) {
      chunk[this.lastIDX++] = output
    }
  }
}
