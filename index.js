var Transform = require('readable-stream').Transform
var Buffer = require('buffer').Buffer
var Decoder = require('./decoder.js')
var inherits = require('inherits')
module.exports = Base64Decode

function Base64Decode(opts) {
  if (!(this instanceof Base64Decode)) {
    return new Base64Decode(opts)
  }

  Transform.call(this, opts)
  this._decoder = new Decoder
}

inherits(Base64Decode, Transform)

Base64Decode.prototype._transform = function Base64Decode_transform(chunk, enc, callback) {
  if (!Buffer.isBuffer(chunk)) {
    // well, this sort of defeats the purpose...
    chunk = new Buffer(chunk, enc)
  }
  this._decoder.decode(chunk)
  callback(null, chunk.slice(0, this._decoder.lastIDX - this._decoder.backOff))
}
