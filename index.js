var Transform = require('stream').Transform
var Buffer = require('buffer').Buffer
var util = require('util')

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

util.inherits(Base64Decode, Transform)

var proto = Base64Decode.prototype

proto._charMap = {
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

proto._transform = function Base64Decode_transform(chunk, enc, callback) {
  if (!Buffer.isBuffer(chunk)) {
    // well, this sort of defeats the purpose...
    chunk = new Buffer(chunk, enc)
  }
  var byte = 0
  var last = this._last
  var current = this._current
  var cursor = this._cursor
  var map = this._charMap
  var chunkIdx = 0
  var input

  for(var idx = 0, len = chunk.length; idx < len; ++idx) {
    last = current

    input = chunk[idx]
    current = map[input]

    switch(cursor) {
      case 0: byte = (last & 0x3f) << 2 | (current & 0x30) >> 4; break
      case 1: byte = (last & 0x0f) << 4 | (current & 0x3c) >> 2; break
      case 2: byte = (last & 0x03) << 6 | (current & 0x3f); break
      case 3: break
    }

    ++cursor
    cursor &= 3
    if (cursor) {
      // write the byte out
      chunk[chunkIdx++] = byte
    }
  }

  this._last = last
  this._current = current
  this._cursor = cursor

  callback(null, chunk.slice(0, chunkIdx))
}

proto._flush = function Base64Decode_flush(ready) {
}
