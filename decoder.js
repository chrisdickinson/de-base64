'use strict'

module.exports = Decoder

// The decoder object. base64 follows a repeating
// pattern -- 4 bytes of input create 3 bytes of
// output. The pattern looks something like the 
// following:
// 
//   +-----+-----+-----+-----+
//   |  S  |  G  |  V  |  5  |  input
//   +-----+-=---+---=-+-----+
//   |   H   |   e   |   y   |  output
//   +-------+-------+-------+
//
// To decode this input, we can keep the last two
// inputs around. We can apply the following pattern
// to "last" and "current":
//
// 0. last = current 
//    (store the incoming byte, but don't output anything)
//
// 1. output = last & 00111111 << 0 | current & 00110000 >> 4
//    last = current
//     +-----+--
//     |  S  |  G
//     +-----+-=
//         H
//
// 2. output = last & 00001111 << 4 | current & 00111100 >> 2
//    last = current
//
//           ----+----
//            G  |  V 
//           =---+---=
//               e
//
// 3. output = last & 00000111 << 6 | current & 00111111
//    last = current
//
//                    -+-----+
//                  V  |  5  |
//                   =-+-----+
//                       y
// 4. last = current (no output, because we already exhausted
//                   the byte containing "5"!)
//
// Between writes, we take care of maintaining the necessary state
// using `_cursor`, an integer bound between [0, 4), and _current,
// which holds the last "current" input we saw. You'll note that, in 
// the algorithm above, the first and last step are identical, leaving
// us with 4 steps.
//
// Importantly, we start on the "skip a byte" step (step 4), so we 
// can build up enough information to start outputting bytes.

function Decoder() {
  this._current = 0
  this._cursor = 3
}

var proto = Decoder.prototype

// A mapping between ASCII input values and 6-bit
// surrogate values. Originally, this was held in a
// precomputed object literal (hanging off the prototype)
// which turned out to beslow. Then, a Uint8Array (also, 
// somehow, slow). The fastest of the "lookup table" 
// variants was actually a plain array!
//
// However, it turned out that branching wasn't as
// expensive as object lookups -- something that eventually
// developed as a theme!

function map(inp) {
  return inp > 64 ?
      inp > 96 ? inp - 71 : inp - 65 :
      inp == 61 ? 0 : inp + 4
}

// `decodeByte` decodes a pair of input bytes into a single
// output byte (for steps 0-2). For step 3, return a constant
// "0" value.

function decodeByte(input, cursor, last, current) {
  return cursor > 1 ?
      (cursor < 3 ? (last & 0x03) << 6 | (current & 0x3f) : 0) :
      (cursor > 0 ? (last & 0x0f) << 4 | (current & 0x3c) >> 2 :
      (last & 0x3f) << 2 | (current & 0x30) >> 4)
}

// Here's the bulk of what I spent my time optimizing.
// Since we're looking at the end result, it might be worthwhile
// to detail how we arrived here.
//
// I tried a few strategies to make this fast.
//
// First, I tried to eliminate all branching -- which was difficult
// but ultimately possible. My hypothesis was that if the flow graph
// was linear, optimization would result in faster code. That hypothesis 
// was (evidently) incorrect.
//
// Then I tried storing the state values in temporary values -- aliasing
// `_current` and `_cursor` to new variables, and then reassigning them to
// `this` after the loop. While it *seems* like that survived, for a while
// it was dropped. Notably, in early iterations, I was (unnecessarily) storing
// `this._last` as well. The problem with aliasing and re-assigning was that
// the loop was being JIT'd via on-stack replacement (OSR). OSR often adds a
// soft deopt at the end of the loop (since it's only optimized the loop body).
//
// I also tried manually inlining the `decodeByte` function, which survives
// below as `decodeInlined`. At this point, the difference in performance between
// inlined and not is nil -- proof that V8 is doing good work inlining!
//
// So, some takeaways:
//
// * Branching can be fast compared to lookups. Especially if the lookups generate
//   "Load.*Generic" style IR operations.
// * Avoid unnecessary OSR deopts by avoiding modifying state after the loop. Gather
//   state mutations before the loop. For instance, I pre-set the next run's "_current"
//   and "_cursor" values before entering the loop.
// * Try to avoid setting "visible" values inside of the loop. That is to say -- for
//   a while I kept `_cursor` and `_current` updated by modifying them directly in the
//   loop. By aliasing them, then assigning the state to the predicted outcome, all
//   of the comparisons are held in registers -- there's no chance of them having to
//   do a `StoreKeyedGeneric`, which could call back into JS and thus prevents certain
//   loop optimizations.
//
// Once you're done reading this function, you should head over to `index.js`.

proto.decode = function Decoder_decode(chunk) {
  var current = this._current
  var cursor = this._cursor
  var len = chunk.length
  var lastIDX = 0
  var output
  var input
  var next

  // "v & 3" is the same operation as "v % 4". For all powers 
  // of two N, "v & (N - 1)" === "v % N".
  this._cursor = (this._cursor + len) & 3
  this._current = map(chunk[len - 1])

  for(var idx = 0; idx < len; ++idx) {
    input = chunk[idx]
    next = map(input)
    output = decodeByte(input, cursor, current, next)
    current = next

    // this used to be represented as `++cursor; cursor &= 3`,
    // but V8 did a much better job of representing the code
    // it was represented as a single assign operation.
    cursor = (cursor + 1) & 3

    // skip output if the input was `=`, or if we're on
    // "skip a byte" step.
    if (cursor && input != 61) {
      chunk[lastIDX++] = output
    }
  }

  return lastIDX
}

proto.decodeInlined = function Decoder_decodeInlined(chunk) {
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

    cursor = (cursor + 1) & 3

    if (cursor && input !== 61) {
      chunk[lastIDX++] = byte
    }
  }

  this._current = current
  return lastIDX
}
