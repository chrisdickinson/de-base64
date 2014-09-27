var Readable = require('readable-stream').Readable
var fromBase64 = require('./index.js')
var brake = require('brake')
var test = require('tape')
var fs = require('fs')

test('works with one padding byte', function(assert) {
  var transform = fromBase64()
  var buf = new Buffer(new Buffer('hi').toString('base64'))

  transform.on('data', function(result) {
    assert.equal(result.toString(), 'hi')
    assert.equal(result.parent, buf.parent)
    assert.equal(result.offset, buf.offset)
  })

  transform.on('finish', assert.end)
  transform.end(buf)
})

test('works with two padding bytes', function(assert) {
  var transform = fromBase64()
  var buf = new Buffer(new Buffer('!').toString('base64'))

  transform.on('data', function(result) {
    assert.equal(result.toString(), '!')
    assert.equal(result.parent, buf.parent)
    assert.equal(result.offset, buf.offset)
  })

  transform.on('finish', assert.end)
  transform.end(buf)
})

test('works with small buffers', function(assert) {
  fs.readFile(__filename, function(err, buf) {
    var expect = buf
    var b64 = new Buffer(buf.toString('base64'))
    var idx = 0

    var input = new Readable
    input._read = function () {
      this.push(b64)
      this.push(null)
    }

    var ok = true

    input.pipe(brake(1, 1)).pipe(fromBase64()).on('data', function(buf) {
      for(var i = 0; i < buf.length; ++i) {
        ok = ok && expect[i + idx] === buf[i]
      }
      idx += buf.length
    }).on('finish', function() {
      assert.ok(ok)
      assert.equal(idx, expect.length)
    })
  })

  assert.end()
})
