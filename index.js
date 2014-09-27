var Transform = require('readable-stream').Transform
var Buffer = require('buffer').Buffer
var inherits = require('inherits')

module.exports = Base64Decode

function Base64Decode(opts) {
  if (!(this instanceof Base64Decode)) {
    return new Base64Decode(opts)
  }

  Transform.call(this, opts)
  this._cursor = 3
  this._current = 0
  this._last = 0
}

inherits(Base64Decode, Transform)

var proto = Base64Decode.prototype

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

var charMapArr = []
for(var i = 0, len = 256; i < len; ++i) {
  charMapArr[i] = charMap[i] || 0
}
proto._charMap = new Uint8Array(charMapArr)

proto._transform = function Base64Decode_transform(chunk, enc, callback) {
  if (!Buffer.isBuffer(chunk)) {
    // well, this sort of defeats the purpose...
    chunk = new Buffer(chunk, enc)
  }
  var chunkIdx = 0
  var backOff = 0
  var byte = 0
  var input

  for(var idx = 0, len = chunk.length; idx < len; ++idx) {
    this._last = this._current

    input = chunk[idx]
    backOff += Boolean(input == 61) | 0
    this._current = this._charMap[input]

    switch(this._cursor) {
      case 0: byte = (this._last & 0x3f) << 2 | (this._current & 0x30) >> 4; break
      case 1: byte = (this._last & 0x0f) << 4 | (this._current & 0x3c) >> 2; break
      case 2: byte = (this._last & 0x03) << 6 | (this._current & 0x3f); break
      case 3: break
    }

    ++this._cursor
    this._cursor &= 3
    if (this._cursor) {
      // write the byte out
      chunk[chunkIdx++] = byte
    }
  }

  callback(null, chunk.slice(0, chunkIdx - backOff))
}

proto._flush = function Base64Decode_flush(ready) {
}
