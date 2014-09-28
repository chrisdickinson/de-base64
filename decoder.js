'use strict'

module.exports = Decoder

function Decoder() {
  this._current = 0
  this._cursor = 3
}

var proto = Decoder.prototype

function map(inp) {
  return inp > 64 ?
      inp > 96 ? inp - 71 : inp - 65 :
      inp == 61 ? 0 : inp + 4
}

var cursor = 0

function decodeByte(input, cursor, last, current) {
  return cursor > 1 ?
      (cursor < 3 ? (last & 0x03) << 6 | (current & 0x3f) : 0) :
      (cursor > 0 ? (last & 0x0f) << 4 | (current & 0x3c) >> 2 :
      (last & 0x3f) << 2 | (current & 0x30) >> 4)
}

proto.decode = function Decoder_decode(chunk) {
  var current = this._current
  var cursor = this._cursor
  var len = chunk.length
  var lastIDX = 0
  var output
  var input
  var next
  this._cursor = (this._cursor + len) & 3
  this._current = map(chunk[len - 1])

  for(var idx = 0; idx < len; ++idx) {
    input = chunk[idx]
    next = map(input)
    output = decodeByte(input, cursor, current, next)
    current = next
    cursor = (cursor + 1) & 3
    if (cursor && input != 61) {
      chunk[lastIDX++] = output
    }
  }

  return lastIDX
}

proto.decodeInlined = function Decoder_decode(chunk) {
  // reset lastIDX and backOff -- they're used
  // by the outer transform to determine where
  // to slice the chunk.
  var lastIDX = 0
  var byte
  var last = 0
  var current = this._current
  var cursor = this._cursor
  var len = chunk.length
  this._cursor = (cursor + len) & 3
  for(var idx = 0; idx < len; ++idx) {
    // decodeByte was removed from the body of the function in order
    // to use inlining vs. OSR -- OSR would often add soft deopt instructions
    // after the loop.
    var input = chunk[idx]
    last = current
    current = map(input)
    byte =
      cursor > 1 ?
        (cursor < 3 ? (last & 0x03) << 6 | (current & 0x3f) : 0) :
        (cursor > 0 ? (last & 0x0f) << 4 | (current & 0x3c) >> 2 :
        (last & 0x3f) << 2 | (current & 0x30) >> 4)

    // this is the same as `cursor %= 4`, and limits
    // the cursor to one of four possible integer values.
    // state 3 is "skip a byte".
    cursor = (cursor + 1) & 3

    // only emit a byte if the last operation was *not* "skip a byte".
    if (cursor && input !== 61) {
      chunk[lastIDX++] = byte
    }
  }

  this._current = current
  return lastIDX
}
