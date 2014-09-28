# de-base64

A streaming base64 decoder. Built to play with [IRHydra2](http://mrale.ph/irhydra/2/).
You [probably](#disclaimer) don't need it.

```

var fromBase64 = require('de-base64')

someBase64Stream.pipe(fromBase64())

```

## API

### fromBase64(opts) -> Transform

Create a new transform stream, passing `opts` through.

### require('de-base64/decoder') -> Decoder

A low-level, streaming base64 decoder.

### Decoder.prototype.decode(chunk : Array-like) -> Number

Decodes base64 input from the `chunk` directly back into the chunk.
Returns the new length so you can `slice` the chunk yourself.

## Disclaimer

*Note*: After painstaking optimization, it turns out that simply calling `new
Buffer(chunk, 'base64')` inside a simple transform stream is faster. But what
about memory usage, you cry out? Surely you could blit the output back into 
the incoming buffer, and not have to make so many copies!

Sure enough, you can -- and I tried that. Doing so is *unsafe* and breaks the
stream API contract, and worse of all, *really slows things down*. You can't
even avoid allocating new objects -- you have to slice the original buffer, so
you're at least allocating a new Buffer.

This library exists mostly because I think bit-twiddling and JS optimization
are fun. It might be more useful if the chunks you're receiving are small (so
you can avoid hopping between C++ and JS a bunch), or if you're in browser; I
am not holding out a lot of hope there, though.

In lieu of a specific purpose, I'd like to direct you to `decoder.js` -- I
detail some of the approaches I tried there.

## License

MIT
