'use strict'

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

// For readers interested in optimization, hopefully you
// came here after reading `decoder.js`. If you're just 
// trying to debug, then feel free to skip the following
// megacomment.
//
// The most interesting problem I had in trying to optimize
// this decoder is as follows: initially, I set out to make
// this decode "in-place" -- that is to say, it would decode
// the buffer into itself. This is made possible by the fact
// that we're always reading at least 1 byte of where we would
// be outputting. `decoder.js` *still* works this way.
//
// But there's a bit of an issue, when it comes to node 0.11.14.
// If you are piped to directly from `fs.ReadStream`, the Buffer
// instances you receive are *polymorphic*. That is, you are called
// with several different sorts of Buffers. This is a horrible thing
// for this decoder, since it is loading and storing data back into
// the buffer. Those loads and stores are deopted until eventually 
// V8 throws up its hands and replaces them with Generic loads and
// stores, which prevent certain loop optimizations. This slows
// the decoder to a crawl. 
//
// Instead, we copy the incoming buffer into a new Buffer, and blit
// into that. The copy adds minimal overhead in node 0.10, fixes node
// 0.11 issues, and, helpfully, puts us back into good graces with 
// regards to "don't mutate the buffer you were handed it is a hot
// stove and you will burn yourself".

Base64Decode.prototype._transform = function Base64Decode_transform(chunk, enc, callback) {
  if (!Buffer.isBuffer(chunk)) {
    // well, this sort of defeats the purpose...
    chunk = new Buffer(chunk, enc)
  }

  chunk = new Buffer(chunk)
  var last = this._decoder.decode(chunk)
  callback(null, chunk.slice(0, last))
}
