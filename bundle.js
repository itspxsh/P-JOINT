(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
const svg2ttf = require('fonteditor-core')
},{"fonteditor-core":27}],6:[function(require,module,exports){
'use strict'

/**
 * Ponyfill for `Array.prototype.find` which is only available in ES6 runtimes.
 *
 * Works with anything that has a `length` property and index access properties, including NodeList.
 *
 * @template {unknown} T
 * @param {Array<T> | ({length:number, [number]: T})} list
 * @param {function (item: T, index: number, list:Array<T> | ({length:number, [number]: T})):boolean} predicate
 * @param {Partial<Pick<ArrayConstructor['prototype'], 'find'>>?} ac `Array.prototype` by default,
 * 				allows injecting a custom implementation in tests
 * @returns {T | undefined}
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
 * @see https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.find
 */
function find(list, predicate, ac) {
	if (ac === undefined) {
		ac = Array.prototype;
	}
	if (list && typeof ac.find === 'function') {
		return ac.find.call(list, predicate);
	}
	for (var i = 0; i < list.length; i++) {
		if (Object.prototype.hasOwnProperty.call(list, i)) {
			var item = list[i];
			if (predicate.call(undefined, item, i, list)) {
				return item;
			}
		}
	}
}

/**
 * "Shallow freezes" an object to render it immutable.
 * Uses `Object.freeze` if available,
 * otherwise the immutability is only in the type.
 *
 * Is used to create "enum like" objects.
 *
 * @template T
 * @param {T} object the object to freeze
 * @param {Pick<ObjectConstructor, 'freeze'> = Object} oc `Object` by default,
 * 				allows to inject custom object constructor for tests
 * @returns {Readonly<T>}
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
function freeze(object, oc) {
	if (oc === undefined) {
		oc = Object
	}
	return oc && typeof oc.freeze === 'function' ? oc.freeze(object) : object
}

/**
 * Since we can not rely on `Object.assign` we provide a simplified version
 * that is sufficient for our needs.
 *
 * @param {Object} target
 * @param {Object | null | undefined} source
 *
 * @returns {Object} target
 * @throws TypeError if target is not an object
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 * @see https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.assign
 */
function assign(target, source) {
	if (target === null || typeof target !== 'object') {
		throw new TypeError('target is not an object')
	}
	for (var key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			target[key] = source[key]
		}
	}
	return target
}

/**
 * All mime types that are allowed as input to `DOMParser.parseFromString`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#Argument02 MDN
 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#domparsersupportedtype WHATWG HTML Spec
 * @see DOMParser.prototype.parseFromString
 */
var MIME_TYPE = freeze({
	/**
	 * `text/html`, the only mime type that triggers treating an XML document as HTML.
	 *
	 * @see DOMParser.SupportedType.isHTML
	 * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/HTML Wikipedia
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring WHATWG HTML Spec
	 */
	HTML: 'text/html',

	/**
	 * Helper method to check a mime type if it indicates an HTML document
	 *
	 * @param {string} [value]
	 * @returns {boolean}
	 *
	 * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/HTML Wikipedia
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring 	 */
	isHTML: function (value) {
		return value === MIME_TYPE.HTML
	},

	/**
	 * `application/xml`, the standard mime type for XML documents.
	 *
	 * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType registration
	 * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
	 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
	 */
	XML_APPLICATION: 'application/xml',

	/**
	 * `text/html`, an alias for `application/xml`.
	 *
	 * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
	 * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
	 */
	XML_TEXT: 'text/xml',

	/**
	 * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
	 * but is parsed as an XML document.
	 *
	 * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType registration
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
	 * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
	 */
	XML_XHTML_APPLICATION: 'application/xhtml+xml',

	/**
	 * `image/svg+xml`,
	 *
	 * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
	 * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
	 * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
	 */
	XML_SVG_IMAGE: 'image/svg+xml',
})

/**
 * Namespaces that are used in this code base.
 *
 * @see http://www.w3.org/TR/REC-xml-names
 */
var NAMESPACE = freeze({
	/**
	 * The XHTML namespace.
	 *
	 * @see http://www.w3.org/1999/xhtml
	 */
	HTML: 'http://www.w3.org/1999/xhtml',

	/**
	 * Checks if `uri` equals `NAMESPACE.HTML`.
	 *
	 * @param {string} [uri]
	 *
	 * @see NAMESPACE.HTML
	 */
	isHTML: function (uri) {
		return uri === NAMESPACE.HTML
	},

	/**
	 * The SVG namespace.
	 *
	 * @see http://www.w3.org/2000/svg
	 */
	SVG: 'http://www.w3.org/2000/svg',

	/**
	 * The `xml:` namespace.
	 *
	 * @see http://www.w3.org/XML/1998/namespace
	 */
	XML: 'http://www.w3.org/XML/1998/namespace',

	/**
	 * The `xmlns:` namespace
	 *
	 * @see https://www.w3.org/2000/xmlns/
	 */
	XMLNS: 'http://www.w3.org/2000/xmlns/',
})

exports.assign = assign;
exports.find = find;
exports.freeze = freeze;
exports.MIME_TYPE = MIME_TYPE;
exports.NAMESPACE = NAMESPACE;

},{}],7:[function(require,module,exports){
var conventions = require("./conventions");
var dom = require('./dom')
var entities = require('./entities');
var sax = require('./sax');

var DOMImplementation = dom.DOMImplementation;

var NAMESPACE = conventions.NAMESPACE;

var ParseError = sax.ParseError;
var XMLReader = sax.XMLReader;

/**
 * Normalizes line ending according to https://www.w3.org/TR/xml11/#sec-line-ends:
 *
 * > XML parsed entities are often stored in computer files which,
 * > for editing convenience, are organized into lines.
 * > These lines are typically separated by some combination
 * > of the characters CARRIAGE RETURN (#xD) and LINE FEED (#xA).
 * >
 * > To simplify the tasks of applications, the XML processor must behave
 * > as if it normalized all line breaks in external parsed entities (including the document entity)
 * > on input, before parsing, by translating all of the following to a single #xA character:
 * >
 * > 1. the two-character sequence #xD #xA
 * > 2. the two-character sequence #xD #x85
 * > 3. the single character #x85
 * > 4. the single character #x2028
 * > 5. any #xD character that is not immediately followed by #xA or #x85.
 *
 * @param {string} input
 * @returns {string}
 */
function normalizeLineEndings(input) {
	return input
		.replace(/\r[\n\u0085]/g, '\n')
		.replace(/[\r\u0085\u2028]/g, '\n')
}

/**
 * @typedef Locator
 * @property {number} [columnNumber]
 * @property {number} [lineNumber]
 */

/**
 * @typedef DOMParserOptions
 * @property {DOMHandler} [domBuilder]
 * @property {Function} [errorHandler]
 * @property {(string) => string} [normalizeLineEndings] used to replace line endings before parsing
 * 						defaults to `normalizeLineEndings`
 * @property {Locator} [locator]
 * @property {Record<string, string>} [xmlns]
 *
 * @see normalizeLineEndings
 */

/**
 * The DOMParser interface provides the ability to parse XML or HTML source code
 * from a string into a DOM `Document`.
 *
 * _xmldom is different from the spec in that it allows an `options` parameter,
 * to override the default behavior._
 *
 * @param {DOMParserOptions} [options]
 * @constructor
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-parsing-and-serialization
 */
function DOMParser(options){
	this.options = options ||{locator:{}};
}

DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var isHTML = /\/x?html?$/.test(mimeType);//mimeType.toLowerCase().indexOf('html') > -1;
  	var entityMap = isHTML ? entities.HTML_ENTITIES : entities.XML_ENTITIES;
	if(locator){
		domBuilder.setDocumentLocator(locator)
	}

	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(isHTML){
		defaultNSMap[''] = NAMESPACE.HTML;
	}
	defaultNSMap.xml = defaultNSMap.xml || NAMESPACE.XML;
	var normalize = options.normalizeLineEndings || normalizeLineEndings;
	if (source && typeof source === 'string') {
		sax.parse(
			normalize(source),
			defaultNSMap,
			entityMap
		)
	} else {
		sax.errorHandler.error('invalid doc source')
	}
	return domBuilder.doc;
}
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {}
	var isCallback = errorImpl instanceof Function;
	locator = locator||{}
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg)}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler
 *
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;

		this.locator && position(this.locator,el)
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr)
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins)
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode)
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm)
	    appendElement(this, comm);
	},

	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},

	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt)
	        appendElement(this, dt);
					this.doc.doctype = dt;
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		throw new ParseError(error, this.locator);
	}
}
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null}
})

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

exports.__DOMHandler = DOMHandler;
exports.normalizeLineEndings = normalizeLineEndings;
exports.DOMParser = DOMParser;

},{"./conventions":6,"./dom":8,"./entities":9,"./sax":11}],8:[function(require,module,exports){
var conventions = require("./conventions");

var find = conventions.find;
var NAMESPACE = conventions.NAMESPACE;

/**
 * A prerequisite for `[].filter`, to drop elements that are empty
 * @param {string} input
 * @returns {boolean}
 */
function notEmptyString (input) {
	return input !== ''
}
/**
 * @see https://infra.spec.whatwg.org/#split-on-ascii-whitespace
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * @param {string} input
 * @returns {string[]} (can be empty)
 */
function splitOnASCIIWhitespace(input) {
	// U+0009 TAB, U+000A LF, U+000C FF, U+000D CR, U+0020 SPACE
	return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : []
}

/**
 * Adds element as a key to current if it is not already present.
 *
 * @param {Record<string, boolean | undefined>} current
 * @param {string} element
 * @returns {Record<string, boolean | undefined>}
 */
function orderedSetReducer (current, element) {
	if (!current.hasOwnProperty(element)) {
		current[element] = true;
	}
	return current;
}

/**
 * @see https://infra.spec.whatwg.org/#ordered-set
 * @param {string} input
 * @returns {string[]}
 */
function toOrderedSet(input) {
	if (!input) return [];
	var list = splitOnASCIIWhitespace(input);
	return Object.keys(list.reduce(orderedSetReducer, {}))
}

/**
 * Uses `list.indexOf` to implement something like `Array.prototype.includes`,
 * which we can not rely on being available.
 *
 * @param {any[]} list
 * @returns {function(any): boolean}
 */
function arrayIncludes (list) {
	return function(element) {
		return list && list.indexOf(element) !== -1;
	}
}

function copy(src,dest){
	for(var p in src){
		if (Object.prototype.hasOwnProperty.call(src, p)) {
			dest[p] = src[p];
		}
	}
}

/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(!(pt instanceof Super)){
		function t(){};
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknown Class:"+Class)
		}
		pt.constructor = Class
	}
}

// Node Types
var NodeType = {}
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {}
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);

/**
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 */
function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
};
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException)

/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
};
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0,
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index.
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	},
	/**
	 * @private
	 * @param {function (Node):boolean} predicate
	 * @returns {Node[]}
	 */
	filter: function (predicate) {
		return Array.prototype.filter.call(this, predicate);
	},
	/**
	 * @private
	 * @param {Node} item
	 * @returns {number}
	 */
	indexOf: function (item) {
		return Array.prototype.indexOf.call(this, item);
	},
};

function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
}

_extends(LiveNodeList,NodeList);

/**
 * Objects implementing the NamedNodeMap interface are used
 * to represent collections of nodes that can be accessed by name.
 * Note that NamedNodeMap does not inherit from NodeList;
 * NamedNodeMaps are not maintained in any particular order.
 * Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index,
 * but this is simply to allow convenient enumeration of the contents of a NamedNodeMap,
 * and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities
 */
function NamedNodeMap() {
};

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1
		while(i<lastIndex){
			list[i] = list[++i]
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw new DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;


	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR

	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};

/**
 * The DOMImplementation interface represents an object providing methods
 * which are not dependent on any particular document.
 * Such an object is returned by the `Document.implementation` property.
 *
 * __The individual methods describe the differences compared to the specs.__
 *
 * @constructor
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation MDN
 * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490 DOM Level 1 Core (Initial)
 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-102161490 DOM Level 2 Core
 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-102161490 DOM Level 3 Core
 * @see https://dom.spec.whatwg.org/#domimplementation DOM Living Standard
 */
function DOMImplementation() {
}

DOMImplementation.prototype = {
	/**
	 * The DOMImplementation.hasFeature() method returns a Boolean flag indicating if a given feature is supported.
	 * The different implementations fairly diverged in what kind of features were reported.
	 * The latest version of the spec settled to force this method to always return true, where the functionality was accurate and in use.
	 *
	 * @deprecated It is deprecated and modern browsers return true in all cases.
	 *
	 * @param {string} feature
	 * @param {string} [version]
	 * @returns {boolean} always true
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/hasFeature MDN
	 * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-5CED94D7 DOM Level 1 Core
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-hasfeature DOM Living Standard
	 */
	hasFeature: function(feature, version) {
			return true;
	},
	/**
	 * Creates an XML Document object of the specified type with its document element.
	 *
	 * __It behaves slightly different from the description in the living standard__:
	 * - There is no interface/class `XMLDocument`, it returns a `Document` instance.
	 * - `contentType`, `encoding`, `mode`, `origin`, `url` fields are currently not declared.
	 * - this implementation is not validating names or qualified names
	 *   (when parsing XML strings, the SAX parser takes care of that)
	 *
	 * @param {string|null} namespaceURI
	 * @param {string} qualifiedName
	 * @param {DocumentType=null} doctype
	 * @returns {Document}
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocument MDN
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocument DOM Level 2 Core (initial)
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument  DOM Level 2 Core
	 *
	 * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
	 * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
	 * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
	 */
	createDocument: function(namespaceURI,  qualifiedName, doctype){
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype || null;
		if (doctype){
			doc.appendChild(doctype);
		}
		if (qualifiedName){
			var root = doc.createElementNS(namespaceURI, qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	/**
	 * Returns a doctype, with the given `qualifiedName`, `publicId`, and `systemId`.
	 *
	 * __This behavior is slightly different from the in the specs__:
	 * - this implementation is not validating names or qualified names
	 *   (when parsing XML strings, the SAX parser takes care of that)
	 *
	 * @param {string} qualifiedName
	 * @param {string} [publicId]
	 * @param {string} [systemId]
	 * @returns {DocumentType} which can either be used with `DOMImplementation.createDocument` upon document creation
	 * 				  or can be put into the document via methods like `Node.insertBefore()` or `Node.replaceChild()`
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocumentType MDN
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocType DOM Level 2 Core
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocumenttype DOM Living Standard
	 *
	 * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
	 * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
	 * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
	 */
	createDocumentType: function(qualifiedName, publicId, systemId){
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId || '';
		node.systemId = systemId || '';

		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
};

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises
		_insertBefore(this, newChild,oldChild, assertPreReplacementValidityInDocument);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
	/**
	 * Look up the prefix associated to the given namespace URI, starting from this node.
	 * **The default namespace declarations are ignored by this method.**
	 * See Namespace Prefix Lookup for details on the algorithm used by this method.
	 *
	 * _Note: The implementation seems to be incomplete when compared to the algorithm described in the specs._
	 *
	 * @param {string | null} namespaceURI
	 * @returns {string | null}
	 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespacePrefix
	 * @see https://www.w3.org/TR/DOM-Level-3-Core/namespaces-algorithms.html#lookupNamespacePrefixAlgo
	 * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
	 * @see https://github.com/xmldom/xmldom/issues/322
	 */
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
						if (Object.prototype.hasOwnProperty.call(map, n) && map[n] === namespaceURI) {
							return n;
						}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(Object.prototype.hasOwnProperty.call(map, prefix)){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
	this.ownerDocument = this;
}

function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns === NAMESPACE.XMLNS){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value
	}
}

function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns === NAMESPACE.XMLNS){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:'']
	}
}

/**
 * Updates `el.childNodes`, updating the indexed items and it's `length`.
 * Passing `newChild` means it will be appended.
 * Otherwise it's assumed that an item has been removed,
 * and `el.firstNode` and it's `.nextSibling` are used
 * to walk the current list of child nodes.
 *
 * @param {Document} doc
 * @param {Node} el
 * @param {Node} [newChild]
 * @private
 */
function _onUpdateChild (doc, el, newChild) {
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if (newChild) {
			cs[cs.length++] = newChild;
		} else {
			var child = el.firstChild;
			var i = 0;
			while (child) {
				cs[i++] = child;
				child = child.nextSibling;
			}
			cs.length = i;
			delete cs[cs.length];
		}
	}
}

/**
 * Removes the connections between `parentNode` and `child`
 * and any existing `child.previousSibling` or `child.nextSibling`.
 *
 * @see https://github.com/xmldom/xmldom/issues/135
 * @see https://github.com/xmldom/xmldom/issues/145
 *
 * @param {Node} parentNode
 * @param {Node} child
 * @returns {Node} the child that was removed.
 * @private
 */
function _removeChild (parentNode, child) {
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if (previous) {
		previous.nextSibling = next;
	} else {
		parentNode.firstChild = next;
	}
	if (next) {
		next.previousSibling = previous;
	} else {
		parentNode.lastChild = previous;
	}
	child.parentNode = null;
	child.previousSibling = null;
	child.nextSibling = null;
	_onUpdateChild(parentNode.ownerDocument, parentNode);
	return child;
}

/**
 * Returns `true` if `node` can be a parent for insertion.
 * @param {Node} node
 * @returns {boolean}
 */
function hasValidParentNodeType(node) {
	return (
		node &&
		(node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.ELEMENT_NODE)
	);
}

/**
 * Returns `true` if `node` can be inserted according to it's `nodeType`.
 * @param {Node} node
 * @returns {boolean}
 */
function hasInsertableNodeType(node) {
	return (
		node &&
		(isElementNode(node) ||
			isTextNode(node) ||
			isDocTypeNode(node) ||
			node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ||
			node.nodeType === Node.COMMENT_NODE ||
			node.nodeType === Node.PROCESSING_INSTRUCTION_NODE)
	);
}

/**
 * Returns true if `node` is a DOCTYPE node
 * @param {Node} node
 * @returns {boolean}
 */
function isDocTypeNode(node) {
	return node && node.nodeType === Node.DOCUMENT_TYPE_NODE;
}

/**
 * Returns true if the node is an element
 * @param {Node} node
 * @returns {boolean}
 */
function isElementNode(node) {
	return node && node.nodeType === Node.ELEMENT_NODE;
}
/**
 * Returns true if `node` is a text node
 * @param {Node} node
 * @returns {boolean}
 */
function isTextNode(node) {
	return node && node.nodeType === Node.TEXT_NODE;
}

/**
 * Check if en element node can be inserted before `child`, or at the end if child is falsy,
 * according to the presence and position of a doctype node on the same level.
 *
 * @param {Document} doc The document node
 * @param {Node} child the node that would become the nextSibling if the element would be inserted
 * @returns {boolean} `true` if an element can be inserted before child
 * @private
 * https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 */
function isElementInsertionPossible(doc, child) {
	var parentChildNodes = doc.childNodes || [];
	if (find(parentChildNodes, isElementNode) || isDocTypeNode(child)) {
		return false;
	}
	var docTypeNode = find(parentChildNodes, isDocTypeNode);
	return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
}

/**
 * Check if en element node can be inserted before `child`, or at the end if child is falsy,
 * according to the presence and position of a doctype node on the same level.
 *
 * @param {Node} doc The document node
 * @param {Node} child the node that would become the nextSibling if the element would be inserted
 * @returns {boolean} `true` if an element can be inserted before child
 * @private
 * https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 */
function isElementReplacementPossible(doc, child) {
	var parentChildNodes = doc.childNodes || [];

	function hasElementChildThatIsNotChild(node) {
		return isElementNode(node) && node !== child;
	}

	if (find(parentChildNodes, hasElementChildThatIsNotChild)) {
		return false;
	}
	var docTypeNode = find(parentChildNodes, isDocTypeNode);
	return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
}

/**
 * @private
 * Steps 1-5 of the checks before inserting and before replacing a child are the same.
 *
 * @param {Node} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node=} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 * @see https://dom.spec.whatwg.org/#concept-node-replace
 */
function assertPreInsertionValidity1to5(parent, node, child) {
	// 1. If `parent` is not a Document, DocumentFragment, or Element node, then throw a "HierarchyRequestError" DOMException.
	if (!hasValidParentNodeType(parent)) {
		throw new DOMException(HIERARCHY_REQUEST_ERR, 'Unexpected parent node type ' + parent.nodeType);
	}
	// 2. If `node` is a host-including inclusive ancestor of `parent`, then throw a "HierarchyRequestError" DOMException.
	// not implemented!
	// 3. If `child` is non-null and its parent is not `parent`, then throw a "NotFoundError" DOMException.
	if (child && child.parentNode !== parent) {
		throw new DOMException(NOT_FOUND_ERR, 'child not in parent');
	}
	if (
		// 4. If `node` is not a DocumentFragment, DocumentType, Element, or CharacterData node, then throw a "HierarchyRequestError" DOMException.
		!hasInsertableNodeType(node) ||
		// 5. If either `node` is a Text node and `parent` is a document,
		// the sax parser currently adds top level text nodes, this will be fixed in 0.9.0
		// || (node.nodeType === Node.TEXT_NODE && parent.nodeType === Node.DOCUMENT_NODE)
		// or `node` is a doctype and `parent` is not a document, then throw a "HierarchyRequestError" DOMException.
		(isDocTypeNode(node) && parent.nodeType !== Node.DOCUMENT_NODE)
	) {
		throw new DOMException(
			HIERARCHY_REQUEST_ERR,
			'Unexpected node type ' + node.nodeType + ' for parent node type ' + parent.nodeType
		);
	}
}

/**
 * @private
 * Step 6 of the checks before inserting and before replacing a child are different.
 *
 * @param {Document} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node | undefined} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 * @see https://dom.spec.whatwg.org/#concept-node-replace
 */
function assertPreInsertionValidityInDocument(parent, node, child) {
	var parentChildNodes = parent.childNodes || [];
	var nodeChildNodes = node.childNodes || [];

	// DocumentFragment
	if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
		var nodeChildElements = nodeChildNodes.filter(isElementNode);
		// If node has more than one element child or has a Text node child.
		if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'More than one element or text in fragment');
		}
		// Otherwise, if `node` has one element child and either `parent` has an element child,
		// `child` is a doctype, or `child` is non-null and a doctype is following `child`.
		if (nodeChildElements.length === 1 && !isElementInsertionPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Element in fragment can not be inserted before doctype');
		}
	}
	// Element
	if (isElementNode(node)) {
		// `parent` has an element child, `child` is a doctype,
		// or `child` is non-null and a doctype is following `child`.
		if (!isElementInsertionPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one element can be added and only after doctype');
		}
	}
	// DocumentType
	if (isDocTypeNode(node)) {
		// `parent` has a doctype child,
		if (find(parentChildNodes, isDocTypeNode)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one doctype is allowed');
		}
		var parentElementChild = find(parentChildNodes, isElementNode);
		// `child` is non-null and an element is preceding `child`,
		if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Doctype can only be inserted before an element');
		}
		// or `child` is null and `parent` has an element child.
		if (!child && parentElementChild) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Doctype can not be appended since element is present');
		}
	}
}

/**
 * @private
 * Step 6 of the checks before inserting and before replacing a child are different.
 *
 * @param {Document} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node | undefined} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 * @see https://dom.spec.whatwg.org/#concept-node-replace
 */
function assertPreReplacementValidityInDocument(parent, node, child) {
	var parentChildNodes = parent.childNodes || [];
	var nodeChildNodes = node.childNodes || [];

	// DocumentFragment
	if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
		var nodeChildElements = nodeChildNodes.filter(isElementNode);
		// If `node` has more than one element child or has a Text node child.
		if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'More than one element or text in fragment');
		}
		// Otherwise, if `node` has one element child and either `parent` has an element child that is not `child` or a doctype is following `child`.
		if (nodeChildElements.length === 1 && !isElementReplacementPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Element in fragment can not be inserted before doctype');
		}
	}
	// Element
	if (isElementNode(node)) {
		// `parent` has an element child that is not `child` or a doctype is following `child`.
		if (!isElementReplacementPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one element can be added and only after doctype');
		}
	}
	// DocumentType
	if (isDocTypeNode(node)) {
		function hasDoctypeChildThatIsNotChild(node) {
			return isDocTypeNode(node) && node !== child;
		}

		// `parent` has a doctype child that is not `child`,
		if (find(parentChildNodes, hasDoctypeChildThatIsNotChild)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one doctype is allowed');
		}
		var parentElementChild = find(parentChildNodes, isElementNode);
		// or an element is preceding `child`.
		if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Doctype can only be inserted before an element');
		}
	}
}

/**
 * @private
 * @param {Node} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node=} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 */
function _insertBefore(parent, node, child, _inDocumentAssertion) {
	// To ensure pre-insertion validity of a node into a parent before a child, run these steps:
	assertPreInsertionValidity1to5(parent, node, child);

	// If parent is a document, and any of the statements below, switched on the interface node implements,
	// are true, then throw a "HierarchyRequestError" DOMException.
	if (parent.nodeType === Node.DOCUMENT_NODE) {
		(_inDocumentAssertion || assertPreInsertionValidityInDocument)(parent, node, child);
	}

	var cp = node.parentNode;
	if(cp){
		cp.removeChild(node);//remove and update
	}
	if(node.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = node.firstChild;
		if (newFirst == null) {
			return node;
		}
		var newLast = node.lastChild;
	}else{
		newFirst = newLast = node;
	}
	var pre = child ? child.previousSibling : parent.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = child;


	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parent.firstChild = newFirst;
	}
	if(child == null){
		parent.lastChild = newLast;
	}else{
		child.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parent;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parent.ownerDocument||parent, parent);
	//console.log(parent.lastChild.nextSibling == null)
	if (node.nodeType == DOCUMENT_FRAGMENT_NODE) {
		node.firstChild = node.lastChild = null;
	}
	return node;
}

/**
 * Appends `newChild` to `parentNode`.
 * If `newChild` is already connected to a `parentNode` it is first removed from it.
 *
 * @see https://github.com/xmldom/xmldom/issues/135
 * @see https://github.com/xmldom/xmldom/issues/145
 * @param {Node} parentNode
 * @param {Node} newChild
 * @returns {Node}
 * @private
 */
function _appendSingleChild (parentNode, newChild) {
	if (newChild.parentNode) {
		newChild.parentNode.removeChild(newChild);
	}
	newChild.parentNode = parentNode;
	newChild.previousSibling = parentNode.lastChild;
	newChild.nextSibling = null;
	if (newChild.previousSibling) {
		newChild.previousSibling.nextSibling = newChild;
	} else {
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument, parentNode, newChild);
	return newChild;
}

Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	/**
	 * The DocumentType node of the document.
	 *
	 * @readonly
	 * @type DocumentType
	 */
	doctype :  null,
	documentElement :  null,
	_inc : 1,

	insertBefore :  function(newChild, refChild){//raises
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		_insertBefore(this, newChild, refChild);
		newChild.ownerDocument = this;
		if (this.documentElement === null && newChild.nodeType === ELEMENT_NODE) {
			this.documentElement = newChild;
		}

		return newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	replaceChild: function (newChild, oldChild) {
		//raises
		_insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
		newChild.ownerDocument = this;
		if (oldChild) {
			this.removeChild(oldChild);
		}
		if (isElementNode(newChild)) {
			this.documentElement = newChild;
		}
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		})
		return rtv;
	},

	/**
	 * The `getElementsByClassName` method of `Document` interface returns an array-like object
	 * of all child elements which have **all** of the given class name(s).
	 *
	 * Returns an empty list if `classeNames` is an empty string or only contains HTML white space characters.
	 *
	 *
	 * Warning: This is a live LiveNodeList.
	 * Changes in the DOM will reflect in the array as the changes occur.
	 * If an element selected by this array no longer qualifies for the selector,
	 * it will automatically be removed. Be aware of this for iteration purposes.
	 *
	 * @param {string} classNames is a string representing the class name(s) to match; multiple class names are separated by (ASCII-)whitespace
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
	 * @see https://dom.spec.whatwg.org/#concept-getelementsbyclassname
	 */
	getElementsByClassName: function(classNames) {
		var classNamesSet = toOrderedSet(classNames)
		return new LiveNodeList(this, function(base) {
			var ls = [];
			if (classNamesSet.length > 0) {
				_visitNode(base.documentElement, function(node) {
					if(node !== base && node.nodeType === ELEMENT_NODE) {
						var nodeClassNames = node.getAttribute('class')
						// can be null if the attribute does not exist
						if (nodeClassNames) {
							// before splitting and iterating just compare them for the most common case
							var matches = classNames === nodeClassNames;
							if (!matches) {
								var nodeClassNamesSet = toOrderedSet(nodeClassNames)
								matches = classNamesSet.every(arrayIncludes(nodeClassNamesSet))
							}
							if(matches) {
								ls.push(node);
							}
						}
					}
				});
			}
			return ls;
		});
	},

	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.localName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
};
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name)
		attr && this.removeAttributeNode(attr);
	},

	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},

	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},

	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;

		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
};
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
};
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);

	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
}
_extends(CharacterData,Node);
function Text() {
};
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
}
_extends(Text,CharacterData);
function Comment() {
};
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
}
_extends(Comment,CharacterData);

function CDATASection() {
};
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
}
_extends(CDATASection,CharacterData);


function DocumentType() {
};
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
};
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
};
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
};
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
};
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
}
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9 && this.documentElement || this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;

	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			]
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}

function needNamespaceDefine(node, isHTML, visibleNamespaces) {
	var prefix = node.prefix || '';
	var uri = node.namespaceURI;
	// According to [Namespaces in XML 1.0](https://www.w3.org/TR/REC-xml-names/#ns-using) ,
	// and more specifically https://www.w3.org/TR/REC-xml-names/#nsc-NoPrefixUndecl :
	// > In a namespace declaration for a prefix [...], the attribute value MUST NOT be empty.
	// in a similar manner [Namespaces in XML 1.1](https://www.w3.org/TR/xml-names11/#ns-using)
	// and more specifically https://www.w3.org/TR/xml-names11/#nsc-NSDeclared :
	// > [...] Furthermore, the attribute value [...] must not be an empty string.
	// so serializing empty namespace value like xmlns:ds="" would produce an invalid XML document.
	if (!uri) {
		return false;
	}
	if (prefix === "xml" && uri === NAMESPACE.XML || uri === NAMESPACE.XMLNS) {
		return false;
	}

	var i = visibleNamespaces.length
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		if (ns.prefix === prefix) {
			return ns.namespace !== uri;
		}
	}
	return true;
}
/**
 * Well-formed constraint: No < in Attribute Values
 * > The replacement text of any entity referred to directly or indirectly
 * > in an attribute value must not contain a <.
 * @see https://www.w3.org/TR/xml11/#CleanAttrVals
 * @see https://www.w3.org/TR/xml11/#NT-AttValue
 *
 * Literal whitespace other than space that appear in attribute values
 * are serialized as their entity references, so they will be preserved.
 * (In contrast to whitespace literals in the input which are normalized to spaces)
 * @see https://www.w3.org/TR/xml11/#AVNormalize
 * @see https://w3c.github.io/DOM-Parsing/#serializing-an-element-s-attributes
 */
function addSerializedAttribute(buf, qualifiedName, value) {
	buf.push(' ', qualifiedName, '="', value.replace(/[<>&"\t\n\r]/g, _xmlEncoder), '"')
}

function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if (!visibleNamespaces) {
		visibleNamespaces = [];
	}

	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else{
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}

	switch(node.nodeType){
	case ELEMENT_NODE:
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;

		isHTML = NAMESPACE.isHTML(node.namespaceURI) || isHTML

		var prefixedNodeName = nodeName
		if (!isHTML && !node.prefix && node.namespaceURI) {
			var defaultNS
			// lookup current default ns from `xmlns` attribute
			for (var ai = 0; ai < attrs.length; ai++) {
				if (attrs.item(ai).name === 'xmlns') {
					defaultNS = attrs.item(ai).value
					break
				}
			}
			if (!defaultNS) {
				// lookup current default ns in visibleNamespaces
				for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
					var namespace = visibleNamespaces[nsi]
					if (namespace.prefix === '' && namespace.namespace === node.namespaceURI) {
						defaultNS = namespace.namespace
						break
					}
				}
			}
			if (defaultNS !== node.namespaceURI) {
				for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
					var namespace = visibleNamespaces[nsi]
					if (namespace.namespace === node.namespaceURI) {
						if (namespace.prefix) {
							prefixedNodeName = namespace.prefix + ':' + nodeName
						}
						break
					}
				}
			}
		}

		buf.push('<', prefixedNodeName);

		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}

		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				addSerializedAttribute(buf, prefix ? 'xmlns:' + prefix : "xmlns", uri);
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}

		// add namespace for current node
		if (nodeName === prefixedNodeName && needNamespaceDefine(node, isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			addSerializedAttribute(buf, prefix ? 'xmlns:' + prefix : "xmlns", uri);
			visibleNamespaces.push({ prefix: prefix, namespace:uri });
		}

		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else{
						serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
					child = child.nextSibling;
				}
			}
			buf.push('</',prefixedNodeName,'>');
		}else{
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return addSerializedAttribute(buf, node.name, node.value);
	case TEXT_NODE:
		/**
		 * The ampersand character (&) and the left angle bracket (<) must not appear in their literal form,
		 * except when used as markup delimiters, or within a comment, a processing instruction, or a CDATA section.
		 * If they are needed elsewhere, they must be escaped using either numeric character references or the strings
		 * `&amp;` and `&lt;` respectively.
		 * The right angle bracket (>) may be represented using the string " &gt; ", and must, for compatibility,
		 * be escaped using either `&gt;` or a character reference when it appears in the string `]]>` in content,
		 * when that string is not marking the end of a CDATA section.
		 *
		 * In the content of elements, character data is any string of characters
		 * which does not contain the start-delimiter of any markup
		 * and does not include the CDATA-section-close delimiter, `]]>`.
		 *
		 * @see https://www.w3.org/TR/xml/#NT-CharData
		 * @see https://w3c.github.io/DOM-Parsing/#xml-serializing-a-text-node
		 */
		return buf.push(node.data
			.replace(/[<&>]/g,_xmlEncoder)
		);
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC ', pubid);
			if (sysid && sysid!='.') {
				buf.push(' ', sysid);
			}
			buf.push('>');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM ', sysid, '>');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for (var n in node) {
		if (Object.prototype.hasOwnProperty.call(node, n)) {
			var v = node[n];
			if (typeof v != "object") {
				if (v != node2[n]) {
					node2[n] = v;
				}
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});

		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},

			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;

				default:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		})

		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}

		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value
		}
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	exports.DocumentType = DocumentType;
	exports.DOMException = DOMException;
	exports.DOMImplementation = DOMImplementation;
	exports.Element = Element;
	exports.Node = Node;
	exports.NodeList = NodeList;
	exports.XMLSerializer = XMLSerializer;
//}

},{"./conventions":6}],9:[function(require,module,exports){
var freeze = require('./conventions').freeze;

/**
 * The entities that are predefined in every XML document.
 *
 * @see https://www.w3.org/TR/2006/REC-xml11-20060816/#sec-predefined-ent W3C XML 1.1
 * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-predefined-ent W3C XML 1.0
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Predefined_entities_in_XML Wikipedia
 */
exports.XML_ENTITIES = freeze({amp:'&', apos:"'", gt:'>', lt:'<', quot:'"'})

/**
 * A map of currently 241 entities that are detected in an HTML document.
 * They contain all entries from `XML_ENTITIES`.
 *
 * @see XML_ENTITIES
 * @see DOMParser.parseFromString
 * @see DOMImplementation.prototype.createHTMLDocument
 * @see https://html.spec.whatwg.org/#named-character-references WHATWG HTML(5) Spec
 * @see https://www.w3.org/TR/xml-entity-names/ W3C XML Entity Names
 * @see https://www.w3.org/TR/html4/sgml/entities.html W3C HTML4/SGML
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Character_entity_references_in_HTML Wikipedia (HTML)
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Entities_representing_special_characters_in_XHTML Wikpedia (XHTML)
 */
exports.HTML_ENTITIES = freeze({
       lt: '<',
       gt: '>',
       amp: '&',
       quot: '"',
       apos: "'",
       Agrave: "À",
       Aacute: "Á",
       Acirc: "Â",
       Atilde: "Ã",
       Auml: "Ä",
       Aring: "Å",
       AElig: "Æ",
       Ccedil: "Ç",
       Egrave: "È",
       Eacute: "É",
       Ecirc: "Ê",
       Euml: "Ë",
       Igrave: "Ì",
       Iacute: "Í",
       Icirc: "Î",
       Iuml: "Ï",
       ETH: "Ð",
       Ntilde: "Ñ",
       Ograve: "Ò",
       Oacute: "Ó",
       Ocirc: "Ô",
       Otilde: "Õ",
       Ouml: "Ö",
       Oslash: "Ø",
       Ugrave: "Ù",
       Uacute: "Ú",
       Ucirc: "Û",
       Uuml: "Ü",
       Yacute: "Ý",
       THORN: "Þ",
       szlig: "ß",
       agrave: "à",
       aacute: "á",
       acirc: "â",
       atilde: "ã",
       auml: "ä",
       aring: "å",
       aelig: "æ",
       ccedil: "ç",
       egrave: "è",
       eacute: "é",
       ecirc: "ê",
       euml: "ë",
       igrave: "ì",
       iacute: "í",
       icirc: "î",
       iuml: "ï",
       eth: "ð",
       ntilde: "ñ",
       ograve: "ò",
       oacute: "ó",
       ocirc: "ô",
       otilde: "õ",
       ouml: "ö",
       oslash: "ø",
       ugrave: "ù",
       uacute: "ú",
       ucirc: "û",
       uuml: "ü",
       yacute: "ý",
       thorn: "þ",
       yuml: "ÿ",
       nbsp: "\u00a0",
       iexcl: "¡",
       cent: "¢",
       pound: "£",
       curren: "¤",
       yen: "¥",
       brvbar: "¦",
       sect: "§",
       uml: "¨",
       copy: "©",
       ordf: "ª",
       laquo: "«",
       not: "¬",
       shy: "­­",
       reg: "®",
       macr: "¯",
       deg: "°",
       plusmn: "±",
       sup2: "²",
       sup3: "³",
       acute: "´",
       micro: "µ",
       para: "¶",
       middot: "·",
       cedil: "¸",
       sup1: "¹",
       ordm: "º",
       raquo: "»",
       frac14: "¼",
       frac12: "½",
       frac34: "¾",
       iquest: "¿",
       times: "×",
       divide: "÷",
       forall: "∀",
       part: "∂",
       exist: "∃",
       empty: "∅",
       nabla: "∇",
       isin: "∈",
       notin: "∉",
       ni: "∋",
       prod: "∏",
       sum: "∑",
       minus: "−",
       lowast: "∗",
       radic: "√",
       prop: "∝",
       infin: "∞",
       ang: "∠",
       and: "∧",
       or: "∨",
       cap: "∩",
       cup: "∪",
       'int': "∫",
       there4: "∴",
       sim: "∼",
       cong: "≅",
       asymp: "≈",
       ne: "≠",
       equiv: "≡",
       le: "≤",
       ge: "≥",
       sub: "⊂",
       sup: "⊃",
       nsub: "⊄",
       sube: "⊆",
       supe: "⊇",
       oplus: "⊕",
       otimes: "⊗",
       perp: "⊥",
       sdot: "⋅",
       Alpha: "Α",
       Beta: "Β",
       Gamma: "Γ",
       Delta: "Δ",
       Epsilon: "Ε",
       Zeta: "Ζ",
       Eta: "Η",
       Theta: "Θ",
       Iota: "Ι",
       Kappa: "Κ",
       Lambda: "Λ",
       Mu: "Μ",
       Nu: "Ν",
       Xi: "Ξ",
       Omicron: "Ο",
       Pi: "Π",
       Rho: "Ρ",
       Sigma: "Σ",
       Tau: "Τ",
       Upsilon: "Υ",
       Phi: "Φ",
       Chi: "Χ",
       Psi: "Ψ",
       Omega: "Ω",
       alpha: "α",
       beta: "β",
       gamma: "γ",
       delta: "δ",
       epsilon: "ε",
       zeta: "ζ",
       eta: "η",
       theta: "θ",
       iota: "ι",
       kappa: "κ",
       lambda: "λ",
       mu: "μ",
       nu: "ν",
       xi: "ξ",
       omicron: "ο",
       pi: "π",
       rho: "ρ",
       sigmaf: "ς",
       sigma: "σ",
       tau: "τ",
       upsilon: "υ",
       phi: "φ",
       chi: "χ",
       psi: "ψ",
       omega: "ω",
       thetasym: "ϑ",
       upsih: "ϒ",
       piv: "ϖ",
       OElig: "Œ",
       oelig: "œ",
       Scaron: "Š",
       scaron: "š",
       Yuml: "Ÿ",
       fnof: "ƒ",
       circ: "ˆ",
       tilde: "˜",
       ensp: " ",
       emsp: " ",
       thinsp: " ",
       zwnj: "‌",
       zwj: "‍",
       lrm: "‎",
       rlm: "‏",
       ndash: "–",
       mdash: "—",
       lsquo: "‘",
       rsquo: "’",
       sbquo: "‚",
       ldquo: "“",
       rdquo: "”",
       bdquo: "„",
       dagger: "†",
       Dagger: "‡",
       bull: "•",
       hellip: "…",
       permil: "‰",
       prime: "′",
       Prime: "″",
       lsaquo: "‹",
       rsaquo: "›",
       oline: "‾",
       euro: "€",
       trade: "™",
       larr: "←",
       uarr: "↑",
       rarr: "→",
       darr: "↓",
       harr: "↔",
       crarr: "↵",
       lceil: "⌈",
       rceil: "⌉",
       lfloor: "⌊",
       rfloor: "⌋",
       loz: "◊",
       spades: "♠",
       clubs: "♣",
       hearts: "♥",
       diams: "♦"
});

/**
 * @deprecated use `HTML_ENTITIES` instead
 * @see HTML_ENTITIES
 */
exports.entityMap = exports.HTML_ENTITIES

},{"./conventions":6}],10:[function(require,module,exports){
var dom = require('./dom')
exports.DOMImplementation = dom.DOMImplementation
exports.XMLSerializer = dom.XMLSerializer
exports.DOMParser = require('./dom-parser').DOMParser

},{"./dom":8,"./dom-parser":7}],11:[function(require,module,exports){
var NAMESPACE = require("./conventions").NAMESPACE;

//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]///\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

/**
 * Creates an error that will not be caught by XMLReader aka the SAX parser.
 *
 * @param {string} message
 * @param {any?} locator Optional, can provide details about the location in the source
 * @constructor
 */
function ParseError(message, locator) {
	this.message = message
	this.locator = locator
	if(Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
}
ParseError.prototype = new Error();
ParseError.prototype.name = ParseError.name

function XMLReader(){

}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {})
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
}
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if (Object.hasOwnProperty.call(entityMap, k)) {
			return entityMap[k];
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g
	var locator = domBuilder.locator;

	var parseStack = [{currentNSMap:defaultNSMapCopy}]
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart + 2, end).replace(/[ \t\n\r]+$/g, '');
				var config = parseStack.pop();
				if(end<0){

	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase()
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for (var prefix in localNSMap) {
							if (Object.prototype.hasOwnProperty.call(localNSMap, prefix)) {
								domBuilder.endPrefixMapping(prefix);
							}
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName ); // No known test case
					}
		        }else{
		        	parseStack.push(config)
		        }

				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;


				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					domBuilder.locator = locator2
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
					domBuilder.locator = locator;
				}else{
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
				}

				if (NAMESPACE.isHTML(el.uri) && !el.closed) {
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder)
				} else {
					end++;
				}
			}
		}catch(e){
			if (e instanceof ParseError) {
				throw e;
			}
			errorHandler.error('element parse error: '+e)
			end = -1;
		}
		if(end>start){
			start = end;
		}else{
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){

	/**
	 * @param {string} qname
	 * @param {string} value
	 * @param {number} startIndex
	 */
	function addAttribute(qname, value, startIndex) {
		if (el.attributeNames.hasOwnProperty(qname)) {
			errorHandler.fatalError('Attribute ' + qname + ' redefined')
		}
		el.addValue(
			qname,
			// @see https://www.w3.org/TR/xml/#AVNormalize
			// since the xmldom sax parser does not "interpret" DTD the following is not implemented:
			// - recursive replacement of (DTD) entity references
			// - trimming and collapsing multiple spaces into a single one for attributes that are not of type CDATA
			value.replace(/[\t\n\r]/g, ' ').replace(/&#?\w+;/g, entityReplacer),
			startIndex
		)
	}
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName'); // No known test case
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="')
					attrName = source.slice(start,p)
				}
				start = p+1;
				p = source.indexOf(c,start)
				if(p>0){
					value = source.slice(start, p);
					addAttribute(attrName, value, start-1);
					s = S_ATTR_END;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start, p);
				addAttribute(attrName, value, start);
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="'); // No known test case
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
				break;
				case S_ATTR_SPACE:
					el.closed = true;
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')") // No known test case
			}
			break;
		case ''://end document
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1)
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!');
					addAttribute(attrName, value, start)
				}else{
					if(!NAMESPACE.isHTML(currentNSMap['']) || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!')
					}
					addAttribute(value, value, start)
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p)
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start, p);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					addAttribute(attrName, value, start)
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if (!NAMESPACE.isHTML(currentNSMap['']) || !attrName.match(/^(?:disabled|checked|selected)$/i)) {
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!')
					}
					addAttribute(attrName, attrName, start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!')
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName
		}else{
			localName = qName;
			prefix = null
			nsPrefix = qName === 'xmlns' && ''
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {}
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={})
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = NAMESPACE.XMLNS
			domBuilder.startPrefixMapping(nsPrefix, value)
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = NAMESPACE.XML;
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || '']

				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for (prefix in localNSMap) {
				if (Object.prototype.hasOwnProperty.call(localNSMap, prefix)) {
					domBuilder.endPrefixMapping(prefix);
				}
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}

		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>')
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName)
		}
		closeMap[tagName] =pos
	}
	return pos<elStartEnd;
	//}
}

function _copy (source, target) {
	for (var n in source) {
		if (Object.prototype.hasOwnProperty.call(source, n)) {
			target[n] = source[n];
		}
	}
}

function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2)
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else{
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA()
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId)
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = false;
			var sysid = false;
			if(len>3){
				if(/^public$/i.test(matchs[2][0])){
					pubid = matchs[3][0];
					sysid = len>4 && matchs[4][0];
				}else if(/^system$/i.test(matchs[2][0])){
					sysid = matchs[3][0];
				}
			}
			var lastMatch = matchs[len-1]
			domBuilder.startDTD(name, pubid, sysid);
			domBuilder.endDTD();

			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

function ElementAttributes(){
	this.attributeNames = {}
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName
	},
	addValue:function(qName, value, offset) {
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this.attributeNames[qName] = this.length;
		this[this.length++] = {qName:qName,value:value,offset:offset}
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
}



function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

exports.XMLReader = XMLReader;
exports.ParseError = ParseError;

},{"./conventions":6}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file DOM解析器，兼容node端和浏览器端
 * @author mengke01(kekee000@gmail.com)
 */
/* eslint-disable no-undef */
var _default = typeof window !== 'undefined' && window.DOMParser ? window.DOMParser : require('@xmldom/xmldom').DOMParser;
exports["default"] = _default;
},{"@xmldom/xmldom":10}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
/**
 * @file 用于国际化的字符串管理类
 * @author mengke01(kekee000@gmail.com)
 */

function appendLanguage(store, languageList) {
  languageList.forEach(function (item) {
    var language = item[0];
    store[language] = Object.assign(store[language] || {}, item[1]);
  });
  return store;
}

/**
 * 管理国际化字符，根据lang切换语言版本
 *
 * @class I18n
 * @param {Array} languageList 当前支持的语言列表
 * @param {string=} defaultLanguage 默认语言
 * languageList = [
 *     'en-us', // 语言名称
 *     langObject // 语言字符串列表
 * ]
 */
var I18n = /*#__PURE__*/function () {
  function I18n(languageList, defaultLanguage) {
    _classCallCheck(this, I18n);
    this.store = appendLanguage({}, languageList);
    this.setLanguage(defaultLanguage || typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase() || 'en-us');
  }

  /**
   * 设置语言
   *
   * @param {string} language 语言
   * @return {this}
   */
  _createClass(I18n, [{
    key: "setLanguage",
    value: function setLanguage(language) {
      if (!this.store[language]) {
        language = 'en-us';
      }
      this.lang = this.store[this.language = language];
      return this;
    }

    /**
     * 添加一个语言字符串
     *
     * @param {string} language 语言
     * @param {Object} langObject 语言对象
     * @return {this}
     */
  }, {
    key: "addLanguage",
    value: function addLanguage(language, langObject) {
      appendLanguage(this.store, [[language, langObject]]);
      return this;
    }

    /**
     * 获取当前语言字符串
     *
     * @param  {string} path 语言路径
     * @return {string}      语言字符串
     */
  }, {
    key: "get",
    value: function get(path) {
      var ref = path.split('.');
      var refObject = this.lang;
      var level;
      while (refObject != null && (level = ref.shift())) {
        refObject = refObject[level];
      }
      return refObject != null ? refObject : '';
    }
  }]);
  return I18n;
}();
exports["default"] = I18n;
},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clone = clone;
exports.curry = curry;
exports.debounce = debounce;
exports.equals = equals;
exports.generic = generic;
exports.isArray = isArray;
exports.isDate = isDate;
exports.isEmptyObject = isEmptyObject;
exports.isFunction = isFunction;
exports.isObject = isObject;
exports.isString = isString;
exports.overwrite = overwrite;
exports.throttle = throttle;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
/**
 * @file 语言相关函数
 * @author mengke01(kekee000@gmail.com)
 */

function isArray(obj) {
  return obj != null && toString.call(obj).slice(8, -1) === 'Array';
}
function isObject(obj) {
  return obj != null && toString.call(obj).slice(8, -1) === 'Object';
}
function isString(obj) {
  return obj != null && toString.call(obj).slice(8, -1) === 'String';
}
function isFunction(obj) {
  return obj != null && toString.call(obj).slice(8, -1) === 'Function';
}
function isDate(obj) {
  return obj != null && toString.call(obj).slice(8, -1) === 'Date';
}
function isEmptyObject(object) {
  for (var name in object) {
    // eslint-disable-next-line no-prototype-builtins
    if (object.hasOwnProperty(name)) {
      return false;
    }
  }
  return true;
}

/**
 * 为函数提前绑定前置参数（柯里化）
 *
 * @see http://en.wikipedia.org/wiki/Currying
 * @param {Function} fn 要绑定的函数
 * @param {...Array} cargs cargs
 * @return {Function}
 */
function curry(fn) {
  for (var _len = arguments.length, cargs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    cargs[_key - 1] = arguments[_key];
  }
  return function () {
    for (var _len2 = arguments.length, rargs = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      rargs[_key2] = arguments[_key2];
    }
    var args = cargs.concat(rargs);
    // eslint-disable-next-line no-invalid-this
    return fn.apply(this, args);
  };
}

/**
 * 方法静态化, 反绑定、延迟绑定
 *
 * @param {Function} method 待静态化的方法
 * @return {Function} 静态化包装后方法
 */
function generic(method) {
  return function () {
    for (var _len3 = arguments.length, fargs = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      fargs[_key3] = arguments[_key3];
    }
    return Function.call.apply(method, fargs);
  };
}

/**
 * 设置覆盖相关的属性值
 *
 * @param {Object} thisObj 覆盖对象
 * @param {Object} thatObj 值对象
 * @param {Array.<string>} fields 字段
 * @return {Object} thisObj
 */
function overwrite(thisObj, thatObj, fields) {
  if (!thatObj) {
    return thisObj;
  }

  // 这里`fields`未指定则仅overwrite自身可枚举的字段，指定`fields`则不做限制
  fields = fields || Object.keys(thatObj);
  fields.forEach(function (field) {
    // 拷贝对象
    if (thisObj[field] && _typeof(thisObj[field]) === 'object' && thatObj[field] && _typeof(thatObj[field]) === 'object') {
      overwrite(thisObj[field], thatObj[field]);
    } else {
      thisObj[field] = thatObj[field];
    }
  });
  return thisObj;
}

/**
 * 深复制对象，仅复制数据
 *
 * @param {Object} source 源数据
 * @return {Object} 复制的数据
 */
function clone(source) {
  if (!source || _typeof(source) !== 'object') {
    return source;
  }
  var cloned = source;
  if (isArray(source)) {
    cloned = source.slice().map(clone);
  } else if (isObject(source) && 'isPrototypeOf' in source) {
    cloned = {};
    for (var _i = 0, _Object$keys = Object.keys(source); _i < _Object$keys.length; _i++) {
      var key = _Object$keys[_i];
      cloned[key] = clone(source[key]);
    }
  }
  return cloned;
}

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time.
// @see underscore.js
function throttle(func, wait) {
  var context;
  var args;
  var timeout;
  var result;
  var previous = 0;
  var later = function later() {
    previous = new Date();
    timeout = null;
    result = func.apply(context, args);
  };
  return function () {
    var now = new Date();
    var remaining = wait - (now - previous);
    // eslint-disable-next-line no-invalid-this
    context = this;
    if (remaining <= 0) {
      clearTimeout(timeout);
      timeout = null;
      previous = now;
      for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }
      result = func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
// @see underscore.js
function debounce(func, wait, immediate) {
  var timeout;
  var result;
  return function () {
    for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }
    // eslint-disable-next-line no-invalid-this
    var context = this;
    var later = function later() {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
    }
    return result;
  };
}

/**
 * 判断两个对象的字段是否相等
 *
 * @param  {Object} thisObj 要比较的对象
 * @param  {Object} thatObj 参考对象
 * @param  {Array} fields 指定字段
 * @return {boolean}  是否相等
 */
function equals(thisObj, thatObj, fields) {
  if (thisObj === thatObj) {
    return true;
  }
  if (thisObj == null && thatObj == null) {
    return true;
  }
  if (thisObj == null && thatObj != null || thisObj != null && thatObj == null) {
    return false;
  }

  // 这里`fields`未指定则仅overwrite自身可枚举的字段，指定`fields`则不做限制
  fields = fields || (_typeof(thisObj) === 'object' ? Object.keys(thisObj) : []);
  if (!fields.length) {
    return thisObj === thatObj;
  }
  var equal = true;
  for (var i = 0, l = fields.length, field; equal && i < l; i++) {
    field = fields[i];
    if (thisObj[field] && _typeof(thisObj[field]) === 'object' && thatObj[field] && _typeof(thatObj[field]) === 'object') {
      equal = equal && equals(thisObj[field], thatObj[field]);
    } else {
      equal = equal && thisObj[field] === thatObj[field];
    }
  }
  return equal;
}
},{}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file 字符串相关的函数
 * @author mengke01(kekee000@gmail.com)
 */
var _default = {
  /**
   * HTML解码字符串
   *
   * @param {string} source 源字符串
   * @return {string}
   */
  decodeHTML: function decodeHTML(source) {
    var str = String(source).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

    // 处理转义的中文和实体字符
    return str.replace(/&#([\d]+);/g, function ($0, $1) {
      return String.fromCodePoint(parseInt($1, 10));
    });
  },
  /**
   * HTML编码字符串
   *
   * @param {string} source 源字符串
   * @return {string}
   */
  encodeHTML: function encodeHTML(source) {
    return String(source).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  /**
   * 获取string字节长度
   *
   * @param {string} source 源字符串
   * @return {number} 长度
   */
  getLength: function getLength(source) {
    // eslint-disable-next-line no-control-regex
    return String(source).replace(/[^\x00-\xff]/g, '11').length;
  },
  /**
   * 字符串格式化，支持如 ${xxx.xxx} 的语法
   *
   * @param {string} source 模板字符串
   * @param {Object} data 数据
   * @return {string} 格式化后字符串
   */
  format: function format(source, data) {
    return source.replace(/\$\{([\w.]+)\}/g, function ($0, $1) {
      var ref = $1.split('.');
      var refObject = data;
      var level;
      while (refObject != null && (level = ref.shift())) {
        refObject = refObject[level];
      }
      return refObject != null ? refObject : '';
    });
  },
  /**
   * 使用指定字符填充字符串,默认`0`
   *
   * @param {string} str 字符串
   * @param {number} size 填充到的大小
   * @param {string=} ch 填充字符
   * @return {string} 字符串
   */
  pad: function pad(str, size, ch) {
    str = String(str);
    if (str.length > size) {
      return str.slice(str.length - size);
    }
    return new Array(size - str.length + 1).join(ch || '0') + str;
  },
  /**
   * 获取字符串哈希编码
   *
   * @param {string} str 字符串
   * @return {number} 哈希值
   */
  hashcode: function hashcode(str) {
    if (!str) {
      return 0;
    }
    var hash = 0;
    for (var i = 0, l = str.length; i < l; i++) {
      hash = 0x7FFFFFFFF & hash * 31 + str.charCodeAt(i);
    }
    return hash;
  }
};
exports["default"] = _default;
},{}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.computePath = exports.computeBounding = void 0;
exports.computePathBox = computePathBox;
exports.quadraticBezier = void 0;
var _pathIterator = _interopRequireDefault(require("./pathIterator"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 计算曲线包围盒
 * @author mengke01(kekee000@gmail.com)
 *
 * modify from:
 * zrender
 * https://github.com/ecomfe/zrender/blob/master/src/tool/computeBoundingBox.js
 */

/**
 * 计算包围盒
 *
 * @param {Array} points 点集
 * @return {Object} bounding box
 */
function computeBoundingBox(points) {
  if (points.length === 0) {
    return false;
  }
  var left = points[0].x;
  var right = points[0].x;
  var top = points[0].y;
  var bottom = points[0].y;
  for (var i = 1; i < points.length; i++) {
    var p = points[i];
    if (p.x < left) {
      left = p.x;
    }
    if (p.x > right) {
      right = p.x;
    }
    if (p.y < top) {
      top = p.y;
    }
    if (p.y > bottom) {
      bottom = p.y;
    }
  }
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

/**
 * 计算二阶贝塞尔曲线的包围盒
 * http://pissang.net/blog/?p=91
 *
 * @param {Object} p0 p0
 * @param {Object} p1 p1
 * @param {Object} p2 p2
 * @return {Object} bound对象
 */
function computeQuadraticBezierBoundingBox(p0, p1, p2) {
  // Find extremities, where derivative in x dim or y dim is zero
  var tmp = p0.x + p2.x - 2 * p1.x;
  // p1 is center of p0 and p2 in x dim
  var t1;
  if (tmp === 0) {
    t1 = 0.5;
  } else {
    t1 = (p0.x - p1.x) / tmp;
  }
  tmp = p0.y + p2.y - 2 * p1.y;
  // p1 is center of p0 and p2 in y dim
  var t2;
  if (tmp === 0) {
    t2 = 0.5;
  } else {
    t2 = (p0.y - p1.y) / tmp;
  }
  t1 = Math.max(Math.min(t1, 1), 0);
  t2 = Math.max(Math.min(t2, 1), 0);
  var ct1 = 1 - t1;
  var ct2 = 1 - t2;
  var x1 = ct1 * ct1 * p0.x + 2 * ct1 * t1 * p1.x + t1 * t1 * p2.x;
  var y1 = ct1 * ct1 * p0.y + 2 * ct1 * t1 * p1.y + t1 * t1 * p2.y;
  var x2 = ct2 * ct2 * p0.x + 2 * ct2 * t2 * p1.x + t2 * t2 * p2.x;
  var y2 = ct2 * ct2 * p0.y + 2 * ct2 * t2 * p1.y + t2 * t2 * p2.y;
  return computeBoundingBox([p0, p2, {
    x: x1,
    y: y1
  }, {
    x: x2,
    y: y2
  }]);
}

/**
 * 计算曲线包围盒
 *
 * @private
 * @param {...Array} args 坐标点集, 支持多个path
 * @return {Object} {x, y, width, height}
 */
function computePathBoundingBox() {
  var points = [];
  var iterator = function iterator(c, p0, p1, p2) {
    if (c === 'L') {
      points.push(p0);
      points.push(p1);
    } else if (c === 'Q') {
      var bound = computeQuadraticBezierBoundingBox(p0, p1, p2);
      points.push(bound);
      points.push({
        x: bound.x + bound.width,
        y: bound.y + bound.height
      });
    }
  };
  if (arguments.length === 1) {
    (0, _pathIterator["default"])(arguments.length <= 0 ? undefined : arguments[0], function (c, p0, p1, p2) {
      if (c === 'L') {
        points.push(p0);
        points.push(p1);
      } else if (c === 'Q') {
        var bound = computeQuadraticBezierBoundingBox(p0, p1, p2);
        points.push(bound);
        points.push({
          x: bound.x + bound.width,
          y: bound.y + bound.height
        });
      }
    });
  } else {
    for (var i = 0, l = arguments.length; i < l; i++) {
      (0, _pathIterator["default"])(i < 0 || arguments.length <= i ? undefined : arguments[i], iterator);
    }
  }
  return computeBoundingBox(points);
}

/**
 * 计算曲线点边界
 *
 * @private
 * @param {...Array} args path对象, 支持多个path
 * @return {Object} {x, y, width, height}
 */
function computePathBox() {
  var points = [];
  if (arguments.length === 1) {
    points = arguments.length <= 0 ? undefined : arguments[0];
  } else {
    for (var i = 0, l = arguments.length; i < l; i++) {
      Array.prototype.splice.apply(points, [points.length, 0].concat(i < 0 || arguments.length <= i ? undefined : arguments[i]));
    }
  }
  return computeBoundingBox(points);
}
var computeBounding = computeBoundingBox;
exports.computeBounding = computeBounding;
var quadraticBezier = computeQuadraticBezierBoundingBox;
exports.quadraticBezier = quadraticBezier;
var computePath = computePathBoundingBox;
exports.computePath = computePath;
},{"./pathIterator":21}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = getArc;
var _bezierCubic2Q = _interopRequireDefault(require("../math/bezierCubic2Q2"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 使用插值法获取椭圆弧度，以支持svg arc命令
 * @author mengke01(kekee000@gmail.com)
 *
 * modify from:
 * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
 * references:
 * http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
 */

var TAU = Math.PI * 2;
function vectorAngle(ux, uy, vx, vy) {
  // Calculate an angle between two vectors
  var sign = ux * vy - uy * vx < 0 ? -1 : 1;
  var umag = Math.sqrt(ux * ux + uy * uy);
  var vmag = Math.sqrt(ux * ux + uy * uy);
  var dot = ux * vx + uy * vy;
  var div = dot / (umag * vmag);
  if (div > 1 || div < -1) {
    // rounding errors, e.g. -1.0000000000000002 can screw up this
    div = Math.max(div, -1);
    div = Math.min(div, 1);
  }
  return sign * Math.acos(div);
}
function correctRadii(midx, midy, rx, ry) {
  // Correction of out-of-range radii
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  var Λ = midx * midx / (rx * rx) + midy * midy / (ry * ry);
  if (Λ > 1) {
    rx *= Math.sqrt(Λ);
    ry *= Math.sqrt(Λ);
  }
  return [rx, ry];
}
function getArcCenter(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ) {
  // Convert from endpoint to center parameterization,
  // see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes

  // Step 1.
  //
  // Moving an ellipse so origin will be the middlepoint between our two
  // points. After that, rotate it to line up ellipse axes with coordinate
  // axes.
  //
  var x1p = cos_φ * (x1 - x2) / 2 + sin_φ * (y1 - y2) / 2;
  var y1p = -sin_φ * (x1 - x2) / 2 + cos_φ * (y1 - y2) / 2;
  var rx_sq = rx * rx;
  var ry_sq = ry * ry;
  var x1p_sq = x1p * x1p;
  var y1p_sq = y1p * y1p;

  // Step 2.
  //
  // Compute coordinates of the centre of this ellipse (cx', cy')
  // in the new coordinate system.
  //
  var radicant = rx_sq * ry_sq - rx_sq * y1p_sq - ry_sq * x1p_sq;
  if (radicant < 0) {
    // due to rounding errors it might be e.g. -1.3877787807814457e-17
    radicant = 0;
  }
  radicant /= rx_sq * y1p_sq + ry_sq * x1p_sq;
  radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);
  var cxp = radicant * rx / ry * y1p;
  var cyp = radicant * -ry / rx * x1p;

  // Step 3.
  //
  // Transform back to get centre coordinates (cx, cy) in the original
  // coordinate system.
  //
  var cx = cos_φ * cxp - sin_φ * cyp + (x1 + x2) / 2;
  var cy = sin_φ * cxp + cos_φ * cyp + (y1 + y2) / 2;

  // Step 4.
  //
  // Compute angles (θ1, Δθ).
  //
  var v1x = (x1p - cxp) / rx;
  var v1y = (y1p - cyp) / ry;
  var v2x = (-x1p - cxp) / rx;
  var v2y = (-y1p - cyp) / ry;
  var θ1 = vectorAngle(1, 0, v1x, v1y);
  var Δθ = vectorAngle(v1x, v1y, v2x, v2y);
  if (fs === 0 && Δθ > 0) {
    Δθ -= TAU;
  }
  if (fs === 1 && Δθ < 0) {
    Δθ += TAU;
  }
  return [cx, cy, θ1, Δθ];
}
function approximateUnitArc(θ1, Δθ) {
  // Approximate one unit arc segment with bézier curves,
  // see http://math.stackexchange.com/questions/873224/
  //      calculate-control-points-of-cubic-bezier-curve-approximating-a-part-of-a-circle
  var α = 4 / 3 * Math.tan(Δθ / 4);
  var x1 = Math.cos(θ1);
  var y1 = Math.sin(θ1);
  var x2 = Math.cos(θ1 + Δθ);
  var y2 = Math.sin(θ1 + Δθ);
  return [x1, y1, x1 - y1 * α, y1 + x1 * α, x2 + y2 * α, y2 - x2 * α, x2, y2];
}
function a2c(x1, y1, x2, y2, fa, fs, rx, ry, φ) {
  var sin_φ = Math.sin(φ * TAU / 360);
  var cos_φ = Math.cos(φ * TAU / 360);

  // Make sure radii are valid
  //
  var x1p = cos_φ * (x1 - x2) / 2 + sin_φ * (y1 - y2) / 2;
  var y1p = -sin_φ * (x1 - x2) / 2 + cos_φ * (y1 - y2) / 2;
  if (x1p === 0 && y1p === 0) {
    // we're asked to draw line to itself
    return [];
  }
  if (rx === 0 || ry === 0) {
    // one of the radii is zero
    return [];
  }
  var radii = correctRadii(x1p, y1p, rx, ry);
  rx = radii[0];
  ry = radii[1];

  // Get center parameters (cx, cy, θ1, Δθ)
  //
  var cc = getArcCenter(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ);
  var result = [];
  var θ1 = cc[2];
  var Δθ = cc[3];

  // Split an arc to multiple segments, so each segment
  // will be less than τ/4 (= 90°)
  //
  var segments = Math.max(Math.ceil(Math.abs(Δθ) / (TAU / 4)), 1);
  Δθ /= segments;
  for (var i = 0; i < segments; i++) {
    result.push(approximateUnitArc(θ1, Δθ));
    θ1 += Δθ;
  }

  // We have a bezier approximation of a unit circle,
  // now need to transform back to the original ellipse
  //
  return result.map(function (curve) {
    for (var _i = 0; _i < curve.length; _i += 2) {
      var x = curve[_i + 0];
      var y = curve[_i + 1];

      // scale
      x *= rx;
      y *= ry;

      // rotate
      var xp = cos_φ * x - sin_φ * y;
      var yp = sin_φ * x + cos_φ * y;

      // translate
      curve[_i + 0] = xp + cc[0];
      curve[_i + 1] = yp + cc[1];
    }
    return curve;
  });
}

/**
 * 获取椭圆弧度
 *
 * @param {number} rx 椭圆长半轴
 * @param {number} ry 椭圆短半轴
 * @param {number} angle 旋转角度
 * @param {number} largeArc 是否大圆弧
 * @param {number} sweep 是否延伸圆弧
 * @param {Object} p0 分割点1
 * @param {Object} p1 分割点2
 * @return {Array} 分割后的路径
 */
function getArc(rx, ry, angle, largeArc, sweep, p0, p1) {
  var result = a2c(p0.x, p0.y, p1.x, p1.y, largeArc, sweep, rx, ry, angle);
  var path = [];
  if (result.length) {
    path.push({
      x: result[0][0],
      y: result[0][1],
      onCurve: true
    });

    // 将三次曲线转换成二次曲线
    result.forEach(function (c) {
      var q2Array = (0, _bezierCubic2Q["default"])({
        x: c[0],
        y: c[1]
      }, {
        x: c[2],
        y: c[3]
      }, {
        x: c[4],
        y: c[5]
      }, {
        x: c[6],
        y: c[7]
      });
      q2Array[0][2].onCurve = true;
      path.push(q2Array[0][1]);
      path.push(q2Array[0][2]);
      if (q2Array[1]) {
        q2Array[1][2].onCurve = true;
        path.push(q2Array[1][1]);
        path.push(q2Array[1][2]);
      }
    });
  }
  return path;
}
},{"../math/bezierCubic2Q2":28}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mul = mul;
exports.multiply = multiply;
/**
 * @file matrix变换操作
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 仿射矩阵相乘
 *
 * @param  {Array=} matrix1 矩阵1
 * @param  {Array=} matrix2 矩阵2
 * @return {Array}         新矩阵
 */
function mul() {
  var matrix1 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [1, 0, 0, 1];
  var matrix2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [1, 0, 0, 1];
  // 旋转变换 4 个参数
  if (matrix1.length === 4) {
    return [matrix1[0] * matrix2[0] + matrix1[2] * matrix2[1], matrix1[1] * matrix2[0] + matrix1[3] * matrix2[1], matrix1[0] * matrix2[2] + matrix1[2] * matrix2[3], matrix1[1] * matrix2[2] + matrix1[3] * matrix2[3]];
  }
  // 旋转位移变换, 6 个参数

  return [matrix1[0] * matrix2[0] + matrix1[2] * matrix2[1], matrix1[1] * matrix2[0] + matrix1[3] * matrix2[1], matrix1[0] * matrix2[2] + matrix1[2] * matrix2[3], matrix1[1] * matrix2[2] + matrix1[3] * matrix2[3], matrix1[0] * matrix2[4] + matrix1[2] * matrix2[5] + matrix1[4], matrix1[1] * matrix2[4] + matrix1[3] * matrix2[5] + matrix1[5]];
}

/**
 * 多个仿射矩阵相乘
 *
 * @param {...Array} matrixs matrix array
 * @return {Array}         新矩阵
 */
function multiply() {
  var result = arguments.length <= 0 ? undefined : arguments[0];
  for (var i = 1, matrix; matrix = i < 0 || arguments.length <= i ? undefined : arguments[i]; i++) {
    result = mul(result, matrix);
  }
  return result;
}
},{}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = pathAdjust;
/**
 * @file 调整路径缩放和平移
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对path坐标进行调整
 *
 * @param {Object} contour 坐标点
 * @param {number} scaleX x缩放比例
 * @param {number} scaleY y缩放比例
 * @param {number} offsetX x偏移
 * @param {number} offsetY y偏移
 *
 * @return {Object} contour 坐标点
 */
function pathAdjust(contour, scaleX, scaleY, offsetX, offsetY) {
  scaleX = scaleX === undefined ? 1 : scaleX;
  scaleY = scaleY === undefined ? 1 : scaleY;
  var x = offsetX || 0;
  var y = offsetY || 0;
  var p;
  for (var i = 0, l = contour.length; i < l; i++) {
    p = contour[i];
    p.x = scaleX * (p.x + x);
    p.y = scaleY * (p.y + y);
  }
  return contour;
}
},{}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = pathCeil;
/**
 * @file 对路径进行四舍五入
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对path坐标进行调整
 *
 * @param {Array} contour 轮廓点数组
 * @param {number} point 四舍五入的点数
 * @return {Object} contour 坐标点
 */
function pathCeil(contour, point) {
  var p;
  for (var i = 0, l = contour.length; i < l; i++) {
    p = contour[i];
    if (!point) {
      p.x = Math.round(p.x);
      p.y = Math.round(p.y);
    } else {
      p.x = Number(p.x.toFixed(point));
      p.y = Number(p.y.toFixed(point));
    }
  }
  return contour;
}
},{}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = pathIterator;
/**
 * @file 遍历路径的路径集合，包括segment和 bezier curve
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 遍历路径的路径集合
 *
 * @param {Array} contour 坐标点集
 * @param {Function} callBack 回调函数，参数集合：command, p0, p1, p2, i
 * p0, p1, p2 直线或者贝塞尔曲线参数
 * i 当前遍历的点
 * 其中command = L 或者 Q，表示直线或者贝塞尔曲线
 */
function pathIterator(contour, callBack) {
  var curPoint;
  var prevPoint;
  var nextPoint;
  var cursorPoint; // cursorPoint 为当前单个绘制命令的起点

  for (var i = 0, l = contour.length; i < l; i++) {
    curPoint = contour[i];
    prevPoint = i === 0 ? contour[l - 1] : contour[i - 1];
    nextPoint = i === l - 1 ? contour[0] : contour[i + 1];

    // 起始坐标
    if (i === 0) {
      if (curPoint.onCurve) {
        cursorPoint = curPoint;
      } else if (prevPoint.onCurve) {
        cursorPoint = prevPoint;
      } else {
        cursorPoint = {
          x: (prevPoint.x + curPoint.x) / 2,
          y: (prevPoint.y + curPoint.y) / 2
        };
      }
    }

    // 直线
    if (curPoint.onCurve && nextPoint.onCurve) {
      if (false === callBack('L', curPoint, nextPoint, 0, i)) {
        break;
      }
      cursorPoint = nextPoint;
    } else if (!curPoint.onCurve) {
      if (nextPoint.onCurve) {
        if (false === callBack('Q', cursorPoint, curPoint, nextPoint, i)) {
          break;
        }
        cursorPoint = nextPoint;
      } else {
        var last = {
          x: (curPoint.x + nextPoint.x) / 2,
          y: (curPoint.y + nextPoint.y) / 2
        };
        if (false === callBack('Q', cursorPoint, curPoint, last, i)) {
          break;
        }
        cursorPoint = last;
      }
    }
  }
}
},{}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = pathRotate;
/**
 * @file 路径旋转
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对path坐标进行调整
 *
 * @param {Object} contour 坐标点
 * @param {number} angle 角度
 * @param {number} centerX x偏移
 * @param {number} centerY y偏移
 *
 * @return {Object} contour 坐标点
 */
function pathRotate(contour, angle, centerX, centerY) {
  angle = angle === undefined ? 0 : angle;
  var x = centerX || 0;
  var y = centerY || 0;
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  var px;
  var py;
  var p;

  // x1=cos(angle)*x-sin(angle)*y;
  // y1=cos(angle)*y+sin(angle)*x;
  for (var i = 0, l = contour.length; i < l; i++) {
    p = contour[i];
    px = cos * (p.x - x) - sin * (p.y - y);
    py = cos * (p.y - y) + sin * (p.x - x);
    p.x = px + x;
    p.y = py + y;
  }
  return contour;
}
},{}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = transform;
/**
 * @file 对轮廓进行transform变换
 * @author mengke01(kekee000@gmail.com)
 *
 * 参考资料：
 * http://blog.csdn.net/henren555/article/details/9699449
 *
 *  |X|    |a      c       e|    |x|
 *  |Y| =  |b      d       f| *  |y|
 *  |1|    |0      0       1|    |1|
 *
 *  X = x * a + y * c + e
 *  Y = x * b + y * d + f
 */

/**
 * 图形仿射矩阵变换
 *
 * @param {Array.<Object>} contour 轮廓点
 * @param {number} a m11
 * @param {number} b m12
 * @param {number} c m21
 * @param {number} d m22
 * @param {number} e dx
 * @param {number} f dy
 * @return {Array.<Object>} contour 轮廓点
 */
function transform(contour, a, b, c, d, e, f) {
  var x;
  var y;
  var p;
  for (var i = 0, l = contour.length; i < l; i++) {
    p = contour[i];
    x = p.x;
    y = p.y;
    p.x = x * a + y * c + e;
    p.y = x * b + y * d + f;
  }
  return contour;
}
},{}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file 圆路径集合，逆时针
 * @author mengke01(kekee000@gmail.com)
 */
var _default = [{
  x: 582,
  y: 0
}, {
  x: 758,
  y: 75
}, {
  x: 890,
  y: 208
}, {
  x: 965,
  y: 384
}, {
  x: 965,
  y: 583
}, {
  x: 890,
  y: 760
}, {
  x: 758,
  y: 891
}, {
  x: 582,
  y: 966
}, {
  x: 383,
  y: 966
}, {
  x: 207,
  y: 891
}, {
  x: 75,
  y: 760
}, {
  x: 0,
  y: 583
}, {
  x: 0,
  y: 384
}, {
  x: 75,
  y: 208
}, {
  x: 207,
  y: 75
}, {
  x: 383,
  y: 0
}];
exports["default"] = _default;
},{}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _computeBoundingBox = require("./computeBoundingBox");
var _pathAdjust = _interopRequireDefault(require("./pathAdjust"));
var _pathRotate = _interopRequireDefault(require("./pathRotate"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
/**
 * 翻转路径
 *
 * @param {Array} paths 路径数组
 * @param {number} xScale x翻转
 * @param {number} yScale y翻转
 * @return {Array} 变换后的路径
 */
function mirrorPaths(paths, xScale, yScale) {
  var _computePath = _computeBoundingBox.computePath.apply(void 0, _toConsumableArray(paths)),
    x = _computePath.x,
    y = _computePath.y,
    width = _computePath.width,
    height = _computePath.height;
  if (xScale === -1) {
    paths.forEach(function (p) {
      (0, _pathAdjust["default"])(p, -1, 1, -x, 0);
      (0, _pathAdjust["default"])(p, 1, 1, x + width, 0);
      p.reverse();
    });
  }
  if (yScale === -1) {
    paths.forEach(function (p) {
      (0, _pathAdjust["default"])(p, 1, -1, 0, -y);
      (0, _pathAdjust["default"])(p, 1, 1, 0, y + height);
      p.reverse();
    });
  }
  return paths;
}
var _default = {
  /**
   * 旋转路径
   *
   * @param {Array} paths 路径数组
   * @param {number} angle 弧度
   * @return {Array} 变换后的路径
   */
  rotate: function rotate(paths, angle) {
    if (!angle) {
      return paths;
    }
    var bound = _computeBoundingBox.computePath.apply(void 0, _toConsumableArray(paths));
    var cx = bound.x + bound.width / 2;
    var cy = bound.y + bound.height / 2;
    paths.forEach(function (p) {
      (0, _pathRotate["default"])(p, angle, cx, cy);
    });
    return paths;
  },
  /**
   * 路径组变换
   *
   * @param {Array} paths 路径数组
   * @param {number} x x 方向缩放
   * @param {number} y y 方向缩放
   * @return {Array} 变换后的路径
   */
  move: function move(paths, x, y) {
    var bound = _computeBoundingBox.computePath.apply(void 0, _toConsumableArray(paths));
    paths.forEach(function (path) {
      (0, _pathAdjust["default"])(path, 1, 1, x - bound.x, y - bound.y);
    });
    return paths;
  },
  mirror: function mirror(paths) {
    return mirrorPaths(paths, -1, 1);
  },
  flip: function flip(paths) {
    return mirrorPaths(paths, 1, -1);
  }
};
exports["default"] = _default;
},{"./computeBoundingBox":16,"./pathAdjust":19,"./pathRotate":22}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = reducePath;
/**
 * @file 缩减path大小，去除冗余节点
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 判断点是否多余的点
 *
 * @param {Object} prev 上一个
 * @param {Object} p 当前
 * @param {Object} next 下一个
 * @return {boolean}
 */
function redundant(prev, p, next) {
  // 是否重合的点, 只有两个点同在曲线上或者同不在曲线上移出
  if ((p.onCurve && next.onCurve || !p.onCurve && !next.onCurve) && Math.pow(p.x - next.x, 2) + Math.pow(p.y - next.y, 2) <= 1) {
    return true;
  }

  // 三点同线 检查直线点
  if (p.onCurve && prev.onCurve && next.onCurve && Math.abs((next.y - p.y) * (prev.x - p.x) - (prev.y - p.y) * (next.x - p.x)) <= 0.001) {
    return true;
  }

  // 三点同线 检查控制点
  if (!p.onCurve && prev.onCurve && next.onCurve && Math.abs((next.y - p.y) * (prev.x - p.x) - (prev.y - p.y) * (next.x - p.x)) <= 0.001) {
    return true;
  }
  return false;
}

/**
 * 缩减glyf，去除冗余节点
 *
 * @param {Array} contour 路径对象
 * @return {Array} 路径对象
 */
function reducePath(contour) {
  if (!contour.length) {
    return contour;
  }
  var prev;
  var next;
  var p;
  for (var i = contour.length - 1, last = i; i >= 0; i--) {
    // 这里注意逆序
    p = contour[i];
    next = i === last ? contour[0] : contour[i + 1];
    prev = i === 0 ? contour[last] : contour[i - 1];
    if (redundant(prev, p, next)) {
      contour.splice(i, 1);
      last--;
      continue;
    }
  }
  return contour;
}
},{}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Font", {
  enumerable: true,
  get: function get() {
    return _font["default"];
  }
});
exports["default"] = void 0;
Object.defineProperty(exports, "woff2", {
  enumerable: true,
  get: function get() {
    return _index["default"];
  }
});
var _font = _interopRequireDefault(require("./ttf/font"));
var _ttf = _interopRequireDefault(require("./ttf/ttf"));
var _ttfreader = _interopRequireDefault(require("./ttf/ttfreader"));
var _ttfwriter = _interopRequireDefault(require("./ttf/ttfwriter"));
var _ttf2eot = _interopRequireDefault(require("./ttf/ttf2eot"));
var _eot2ttf = _interopRequireDefault(require("./ttf/eot2ttf"));
var _ttf2woff = _interopRequireDefault(require("./ttf/ttf2woff"));
var _woff2ttf = _interopRequireDefault(require("./ttf/woff2ttf"));
var _ttf2svg = _interopRequireDefault(require("./ttf/ttf2svg"));
var _svg2ttfobject = _interopRequireDefault(require("./ttf/svg2ttfobject"));
var _reader = _interopRequireDefault(require("./ttf/reader"));
var _writer = _interopRequireDefault(require("./ttf/writer"));
var _otfreader = _interopRequireDefault(require("./ttf/otfreader"));
var _otf2ttfobject = _interopRequireDefault(require("./ttf/otf2ttfobject"));
var _ttf2base = _interopRequireDefault(require("./ttf/ttf2base64"));
var _ttf2icon = _interopRequireDefault(require("./ttf/ttf2icon"));
var _ttftowoff = _interopRequireDefault(require("./ttf/ttftowoff2"));
var _woff2tottf = _interopRequireDefault(require("./ttf/woff2tottf"));
var _index = _interopRequireDefault(require("../woff2/index"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 主函数
 * @author mengke01(kekee000@gmail.com)
 */

var modules = {
  Font: _font["default"],
  TTF: _ttf["default"],
  TTFReader: _ttfreader["default"],
  TTFWriter: _ttfwriter["default"],
  ttf2eot: _ttf2eot["default"],
  eot2ttf: _eot2ttf["default"],
  ttf2woff: _ttf2woff["default"],
  woff2ttf: _woff2ttf["default"],
  ttf2svg: _ttf2svg["default"],
  svg2ttfobject: _svg2ttfobject["default"],
  Reader: _reader["default"],
  Writer: _writer["default"],
  OTFReader: _otfreader["default"],
  otf2ttfobject: _otf2ttfobject["default"],
  ttf2base64: _ttf2base["default"],
  ttf2icon: _ttf2icon["default"],
  ttftowoff2: _ttftowoff["default"],
  woff2tottf: _woff2tottf["default"],
  woff2: _index["default"]
};
var _default = modules;
exports["default"] = _default;
if (typeof exports !== 'undefined') {
  // eslint-disable-next-line import/no-commonjs
  module.exports = modules;
}
},{"../woff2/index":122,"./ttf/eot2ttf":40,"./ttf/font":42,"./ttf/otf2ttfobject":45,"./ttf/otfreader":46,"./ttf/reader":47,"./ttf/svg2ttfobject":49,"./ttf/ttf":93,"./ttf/ttf2base64":94,"./ttf/ttf2eot":95,"./ttf/ttf2icon":96,"./ttf/ttf2svg":97,"./ttf/ttf2woff":99,"./ttf/ttfreader":100,"./ttf/ttftowoff2":101,"./ttf/ttfwriter":102,"./ttf/woff2tottf":119,"./ttf/woff2ttf":120,"./ttf/writer":121}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = bezierCubic2Q2;
/**
 * @file 三次贝塞尔转二次贝塞尔
 * @author mengke01(kekee000@gmail.com)
 *
 * references:
 * https://github.com/search?utf8=%E2%9C%93&q=svg2ttf
 * http://www.caffeineowl.com/graphics/2d/vectorial/cubic2quad01.html
 *
 */

function toQuad(p1, c1, c2, p2) {
  // Quad control point is (3*c2 - p2 + 3*c1 - p1)/4
  var x = (3 * c2.x - p2.x + 3 * c1.x - p1.x) / 4;
  var y = (3 * c2.y - p2.y + 3 * c1.y - p1.y) / 4;
  return [p1, {
    x: x,
    y: y
  }, p2];
}

/**
 * 三次贝塞尔转二次贝塞尔
 *
 * @param {Object} p1 开始点
 * @param {Object} c1 控制点1
 * @param {Object} c2 控制点2
 * @param {Object} p2 结束点
 * @return {Array} 二次贝塞尔控制点
 */
function bezierCubic2Q2(p1, c1, c2, p2) {
  // 判断极端情况，控制点和起止点一样
  if (p1.x === c1.x && p1.y === c1.y && c2.x === p2.x && c2.y === p2.y) {
    return [[p1, {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    }, p2]];
  }
  var mx = p2.x - 3 * c2.x + 3 * c1.x - p1.x;
  var my = p2.y - 3 * c2.y + 3 * c1.y - p1.y;

  // control points near
  if (mx * mx + my * my <= 4) {
    return [toQuad(p1, c1, c2, p2)];
  }

  // Split to 2 qubic beziers by midpoints
  // (p2 + 3*c2 + 3*c1 + p1)/8
  var mp = {
    x: (p2.x + 3 * c2.x + 3 * c1.x + p1.x) / 8,
    y: (p2.y + 3 * c2.y + 3 * c1.y + p1.y) / 8
  };
  return [toQuad(p1, {
    x: (p1.x + c1.x) / 2,
    y: (p1.y + c1.y) / 2
  }, {
    x: (p1.x + 2 * c1.x + c2.x) / 4,
    y: (p1.y + 2 * c1.y + c2.y) / 4
  }, mp), toQuad(mp, {
    x: (p2.x + c1.x + 2 * c2.x) / 4,
    y: (p2.y + c1.y + 2 * c2.y) / 4
  }, {
    x: (p2.x + c2.x) / 2,
    y: (p2.y + c2.y) / 2
  }, p2)];
}
},{}],29:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file Buffer和ArrayBuffer转换
 * @author mengke01(kekee000@gmail.com)
 */
/* eslint-disable no-undef */
var _default = {
  /**
   * Buffer转换成ArrayBuffer
   *
   * @param {Buffer} buffer 缓冲数组
   * @return {ArrayBuffer}
   */
  toArrayBuffer: function toArrayBuffer(buffer) {
    var length = buffer.length;
    var view = new DataView(new ArrayBuffer(length), 0, length);
    for (var i = 0, l = length; i < l; i++) {
      view.setUint8(i, buffer[i], false);
    }
    return view.buffer;
  },
  /**
   * ArrayBuffer转换成Buffer
   *
   * @param {ArrayBuffer} arrayBuffer 缓冲数组
   * @return {Buffer}
   */
  toBuffer: function toBuffer(arrayBuffer) {
    if (Array.isArray(arrayBuffer)) {
      return Buffer.from(arrayBuffer);
    }
    var length = arrayBuffer.byteLength;
    var view = new DataView(arrayBuffer, 0, length);
    var buffer = Buffer.alloc(length);
    for (var i = 0, l = length; i < l; i++) {
      buffer[i] = view.getUint8(i, false);
    }
    return buffer;
  }
};
exports["default"] = _default;
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file 默认的ttf字体配置
 * @author mengke01(kekee000@gmail.com)
 */
var _default = {
  // 默认的字体编码
  fontId: 'fonteditor',
  // 默认的名字集合
  name: {
    // 默认的字体家族
    fontFamily: 'fonteditor',
    fontSubFamily: 'Medium',
    uniqueSubFamily: 'FontEditor 1.0 : fonteditor',
    version: 'Version 1.0; FontEditor (v1.0)',
    postScriptName: 'fonteditor'
  }
};
exports["default"] = _default;
},{}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file 空的ttf格式json对象
 * @author mengke01(kekee000@gmail.com)
 */
/* eslint-disable  */
var _default = {
  "version": 1,
  "numTables": 10,
  "searchRange": 128,
  "entrySelector": 3,
  "rangeShift": 64,
  "head": {
    "version": 1,
    "fontRevision": 1,
    "checkSumAdjustment": 0,
    "magickNumber": 1594834165,
    "flags": 11,
    "unitsPerEm": 1024,
    "created": 1428940800000,
    "modified": 1428940800000,
    "xMin": 34,
    "yMin": 0,
    "xMax": 306,
    "yMax": 682,
    "macStyle": 0,
    "lowestRecPPEM": 8,
    "fontDirectionHint": 2,
    "indexToLocFormat": 0,
    "glyphDataFormat": 0
  },
  "glyf": [{
    "contours": [[{
      "x": 34,
      "y": 0,
      "onCurve": true
    }, {
      "x": 34,
      "y": 682,
      "onCurve": true
    }, {
      "x": 306,
      "y": 682,
      "onCurve": true
    }, {
      "x": 306,
      "y": 0,
      "onCurve": true
    }], [{
      "x": 68,
      "y": 34,
      "onCurve": true
    }, {
      "x": 272,
      "y": 34,
      "onCurve": true
    }, {
      "x": 272,
      "y": 648,
      "onCurve": true
    }, {
      "x": 68,
      "y": 648,
      "onCurve": true
    }]],
    "xMin": 34,
    "yMin": 0,
    "xMax": 306,
    "yMax": 682,
    "advanceWidth": 374,
    "leftSideBearing": 34,
    "name": ".notdef"
  }],
  "cmap": {},
  "name": {
    "fontFamily": "fonteditor",
    "fontSubFamily": "Medium",
    "uniqueSubFamily": "FontEditor 1.0 : fonteditor",
    "version": "Version 1.0 ; FontEditor (v0.0.1)",
    "postScriptName": "fonteditor",
    "fullName": "fonteditor"
  },
  "hhea": {
    "version": 1,
    "ascent": 812,
    "descent": -212,
    "lineGap": 92,
    "advanceWidthMax": 374,
    "minLeftSideBearing": 34,
    "minRightSideBearing": 68,
    "xMaxExtent": 306,
    "caretSlopeRise": 1,
    "caretSlopeRun": 0,
    "caretOffset": 0,
    "reserved0": 0,
    "reserved1": 0,
    "reserved2": 0,
    "reserved3": 0,
    "metricDataFormat": 0,
    "numOfLongHorMetrics": 1
  },
  "post": {
    "italicAngle": 0,
    "postoints": 65411,
    "underlinePosition": 50,
    "underlineThickness": 0,
    "isFixedPitch": 0,
    "minMemType42": 0,
    "maxMemType42": 0,
    "minMemType1": 0,
    "maxMemType1": 1,
    "format": 2
  },
  "maxp": {
    "version": 1.0,
    "numGlyphs": 0,
    "maxPoints": 0,
    "maxContours": 0,
    "maxCompositePoints": 0,
    "maxCompositeContours": 0,
    "maxZones": 0,
    "maxTwilightPoints": 0,
    "maxStorage": 0,
    "maxFunctionDefs": 0,
    "maxStackElements": 0,
    "maxSizeOfInstructions": 0,
    "maxComponentElements": 0,
    "maxComponentDepth": 0
  },
  "OS/2": {
    "version": 4,
    "xAvgCharWidth": 1031,
    "usWeightClass": 400,
    "usWidthClass": 5,
    "fsType": 0,
    "ySubscriptXSize": 665,
    "ySubscriptYSize": 716,
    "ySubscriptXOffset": 0,
    "ySubscriptYOffset": 143,
    "ySuperscriptXSize": 665,
    "ySuperscriptYSize": 716,
    "ySuperscriptXOffset": 0,
    "ySuperscriptYOffset": 491,
    "yStrikeoutSize": 51,
    "yStrikeoutPosition": 265,
    "sFamilyClass": 0,
    "bFamilyType": 2,
    "bSerifStyle": 0,
    "bWeight": 6,
    "bProportion": 3,
    "bContrast": 0,
    "bStrokeVariation": 0,
    "bArmStyle": 0,
    "bLetterform": 0,
    "bMidline": 0,
    "bXHeight": 0,
    "ulUnicodeRange1": 1,
    "ulUnicodeRange2": 268435456,
    "ulUnicodeRange3": 0,
    "ulUnicodeRange4": 0,
    "achVendID": "PfEd",
    "fsSelection": 192,
    "usFirstCharIndex": 65535,
    "usLastCharIndex": -1,
    "sTypoAscender": 812,
    "sTypoDescender": -212,
    "sTypoLineGap": 92,
    "usWinAscent": 812,
    "usWinDescent": 212,
    "ulCodePageRange1": 1,
    "ulCodePageRange2": 0,
    "sxHeight": 792,
    "sCapHeight": 0,
    "usDefaultChar": 0,
    "usBreakChar": 32,
    "usMaxContext": 1
  }
};
exports["default"] = _default;
},{}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file 复合图元标记位
 * @author mengke01(kekee000@gmail.com)
 *
 * 复合图元标记位
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html
 */
var _default = {
  ARG_1_AND_2_ARE_WORDS: 0x01,
  ARGS_ARE_XY_VALUES: 0x02,
  ROUND_XY_TO_GRID: 0x04,
  WE_HAVE_A_SCALE: 0x08,
  RESERVED: 0x10,
  MORE_COMPONENTS: 0x20,
  WE_HAVE_AN_X_AND_Y_SCALE: 0x40,
  WE_HAVE_A_TWO_BY_TWO: 0x80,
  WE_HAVE_INSTRUCTIONS: 0x100,
  USE_MY_METRICS: 0x200,
  OVERLAP_COMPOUND: 0x400,
  SCALED_COMPONENT_OFFSET: 0x800,
  UNSCALED_COMPONENT_OFFSET: 0x1000
};
exports["default"] = _default;
},{}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.win = exports.mac = void 0;
/**
 * @file Unicode Platform-specific Encoding Identifiers
 * @author mengke01(kekee000@gmail.com)
 */
// mac encoding id
var mac = {
  'Default': 0,
  // default use
  'Version1.1': 1,
  'ISO10646': 2,
  'UnicodeBMP': 3,
  'UnicodenonBMP': 4,
  'UnicodeVariationSequences': 5,
  'FullUnicodecoverage': 6
};

// windows encoding id
exports.mac = mac;
var win = {
  Symbol: 0,
  UCS2: 1,
  // default use
  ShiftJIS: 2,
  PRC: 3,
  BigFive: 4,
  Johab: 5,
  UCS4: 6
};
exports.win = win;
},{}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file 轮廓标记位
 * @author mengke01(kekee000@gmail.com)
 *
 * see:
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html
 */
var _default = {
  ONCURVE: 0x01,
  // on curve ,off curve
  XSHORT: 0x02,
  // x-Short Vector
  YSHORT: 0x04,
  // y-Short Vector
  REPEAT: 0x08,
  // next byte is flag repeat count
  XSAME: 0x10,
  // This x is same (Positive x-Short vector)
  YSAME: 0x20,
  // This y is same (Positive y-Short vector)
  Reserved1: 0x40,
  Reserved2: 0x80
};
exports["default"] = _default;
},{}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file ttf `name`编码表
 * @author mengke01(kekee000@gmail.com)
 */

var nameId = {
  0: 'copyright',
  1: 'fontFamily',
  2: 'fontSubFamily',
  3: 'uniqueSubFamily',
  4: 'fullName',
  5: 'version',
  6: 'postScriptName',
  7: 'tradeMark',
  8: 'manufacturer',
  9: 'designer',
  10: 'description',
  11: 'urlOfFontVendor',
  12: 'urlOfFontDesigner',
  13: 'licence',
  14: 'urlOfLicence',
  16: 'preferredFamily',
  17: 'preferredSubFamily',
  18: 'compatibleFull',
  19: 'sampleText'
};

// 反转names
var nameIdHash = {};
Object.keys(nameId).forEach(function (id) {
  nameIdHash[nameId[id]] = +id;
});
nameId.names = nameIdHash;
var _default = nameId;
exports["default"] = _default;
},{}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file 字体所属平台
 * @author mengke01(kekee000@gmail.com)
 */
var _default = {
  Unicode: 0,
  Macintosh: 1,
  // mac
  reserved: 2,
  Microsoft: 3 // win
};
exports["default"] = _default;
},{}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file Mac glyf命名表
 * @author mengke01(kekee000@gmail.com)
 *
 * see:
 * http://www.microsoft.com/typography/otspec/WGL4.htm
 */
var _default = {
  0: '.notdef',
  1: '.null',
  2: 'nonmarkingreturn',
  3: 'space',
  4: 'exclam',
  5: 'quotedbl',
  6: 'numbersign',
  7: 'dollar',
  8: 'percent',
  9: 'ampersand',
  10: 'quotesingle',
  11: 'parenleft',
  12: 'parenright',
  13: 'asterisk',
  14: 'plus',
  15: 'comma',
  16: 'hyphen',
  17: 'period',
  18: 'slash',
  19: 'zero',
  20: 'one',
  21: 'two',
  22: 'three',
  23: 'four',
  24: 'five',
  25: 'six',
  26: 'seven',
  27: 'eight',
  28: 'nine',
  29: 'colon',
  30: 'semicolon',
  31: 'less',
  32: 'equal',
  33: 'greater',
  34: 'question',
  35: 'at',
  36: 'A',
  37: 'B',
  38: 'C',
  39: 'D',
  40: 'E',
  41: 'F',
  42: 'G',
  43: 'H',
  44: 'I',
  45: 'J',
  46: 'K',
  47: 'L',
  48: 'M',
  49: 'N',
  50: 'O',
  51: 'P',
  52: 'Q',
  53: 'R',
  54: 'S',
  55: 'T',
  56: 'U',
  57: 'V',
  58: 'W',
  59: 'X',
  60: 'Y',
  61: 'Z',
  62: 'bracketleft',
  63: 'backslash',
  64: 'bracketright',
  65: 'asciicircum',
  66: 'underscore',
  67: 'grave',
  68: 'a',
  69: 'b',
  70: 'c',
  71: 'd',
  72: 'e',
  73: 'f',
  74: 'g',
  75: 'h',
  76: 'i',
  77: 'j',
  78: 'k',
  79: 'l',
  80: 'm',
  81: 'n',
  82: 'o',
  83: 'p',
  84: 'q',
  85: 'r',
  86: 's',
  87: 't',
  88: 'u',
  89: 'v',
  90: 'w',
  91: 'x',
  92: 'y',
  93: 'z',
  94: 'braceleft',
  95: 'bar',
  96: 'braceright',
  97: 'asciitilde',
  98: 'Adieresis',
  99: 'Aring',
  100: 'Ccedilla',
  101: 'Eacute',
  102: 'Ntilde',
  103: 'Odieresis',
  104: 'Udieresis',
  105: 'aacute',
  106: 'agrave',
  107: 'acircumflex',
  108: 'adieresis',
  109: 'atilde',
  110: 'aring',
  111: 'ccedilla',
  112: 'eacute',
  113: 'egrave',
  114: 'ecircumflex',
  115: 'edieresis',
  116: 'iacute',
  117: 'igrave',
  118: 'icircumflex',
  119: 'idieresis',
  120: 'ntilde',
  121: 'oacute',
  122: 'ograve',
  123: 'ocircumflex',
  124: 'odieresis',
  125: 'otilde',
  126: 'uacute',
  127: 'ugrave',
  128: 'ucircumflex',
  129: 'udieresis',
  130: 'dagger',
  131: 'degree',
  132: 'cent',
  133: 'sterling',
  134: 'section',
  135: 'bullet',
  136: 'paragraph',
  137: 'germandbls',
  138: 'registered',
  139: 'copyright',
  140: 'trademark',
  141: 'acute',
  142: 'dieresis',
  143: 'notequal',
  144: 'AE',
  145: 'Oslash',
  146: 'infinity',
  147: 'plusminus',
  148: 'lessequal',
  149: 'greaterequal',
  150: 'yen',
  151: 'mu',
  152: 'partialdiff',
  153: 'summation',
  154: 'product',
  155: 'pi',
  156: 'integral',
  157: 'ordfeminine',
  158: 'ordmasculine',
  159: 'Omega',
  160: 'ae',
  161: 'oslash',
  162: 'questiondown',
  163: 'exclamdown',
  164: 'logicalnot',
  165: 'radical',
  166: 'florin',
  167: 'approxequal',
  168: 'Delta',
  169: 'guillemotleft',
  170: 'guillemotright',
  171: 'ellipsis',
  172: 'nonbreakingspace',
  173: 'Agrave',
  174: 'Atilde',
  175: 'Otilde',
  176: 'OE',
  177: 'oe',
  178: 'endash',
  179: 'emdash',
  180: 'quotedblleft',
  181: 'quotedblright',
  182: 'quoteleft',
  183: 'quoteright',
  184: 'divide',
  185: 'lozenge',
  186: 'ydieresis',
  187: 'Ydieresis',
  188: 'fraction',
  189: 'currency',
  190: 'guilsinglleft',
  191: 'guilsinglright',
  192: 'fi',
  193: 'fl',
  194: 'daggerdbl',
  195: 'periodcentered',
  196: 'quotesinglbase',
  197: 'quotedblbase',
  198: 'perthousand',
  199: 'Acircumflex',
  200: 'Ecircumflex',
  201: 'Aacute',
  202: 'Edieresis',
  203: 'Egrave',
  204: 'Iacute',
  205: 'Icircumflex',
  206: 'Idieresis',
  207: 'Igrave',
  208: 'Oacute',
  209: 'Ocircumflex',
  210: 'apple',
  211: 'Ograve',
  212: 'Uacute',
  213: 'Ucircumflex',
  214: 'Ugrave',
  215: 'dotlessi',
  216: 'circumflex',
  217: 'tilde',
  218: 'macron',
  219: 'breve',
  220: 'dotaccent',
  221: 'ring',
  222: 'cedilla',
  223: 'hungarumlaut',
  224: 'ogonek',
  225: 'caron',
  226: 'Lslash',
  227: 'lslash',
  228: 'Scaron',
  229: 'scaron',
  230: 'Zcaron',
  231: 'zcaron',
  232: 'brokenbar',
  233: 'Eth',
  234: 'eth',
  235: 'Yacute',
  236: 'yacute',
  237: 'Thorn',
  238: 'thorn',
  239: 'minus',
  240: 'multiply',
  241: 'onesuperior',
  242: 'twosuperior',
  243: 'threesuperior',
  244: 'onehalf',
  245: 'onequarter',
  246: 'threequarters',
  247: 'franc',
  248: 'Gbreve',
  249: 'gbreve',
  250: 'Idotaccent',
  251: 'Scedilla',
  252: 'scedilla',
  253: 'Cacute',
  254: 'cacute',
  255: 'Ccaron',
  256: 'ccaron',
  257: 'dcroat'
};
exports["default"] = _default;
},{}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file unicode 编码与postName对照表
 * @author mengke01(kekee000@gmail.com)
 *
 * see:
 * http://www.microsoft.com/typography/otspec/WGL4.htm
 */
var _default = {
  0: 1,
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 1,
  6: 1,
  7: 1,
  8: 1,
  9: 2,
  10: 1,
  11: 1,
  12: 1,
  13: 2,
  14: 1,
  15: 1,
  16: 1,
  17: 1,
  18: 1,
  19: 1,
  20: 1,
  21: 1,
  22: 1,
  23: 1,
  24: 1,
  25: 1,
  26: 1,
  27: 1,
  28: 1,
  29: 1,
  30: 1,
  31: 1,
  32: 3,
  33: 4,
  34: 5,
  35: 6,
  36: 7,
  37: 8,
  38: 9,
  39: 10,
  40: 11,
  41: 12,
  42: 13,
  43: 14,
  44: 15,
  45: 16,
  46: 17,
  47: 18,
  48: 19,
  49: 20,
  50: 21,
  51: 22,
  52: 23,
  53: 24,
  54: 25,
  55: 26,
  56: 27,
  57: 28,
  58: 29,
  59: 30,
  60: 31,
  61: 32,
  62: 33,
  63: 34,
  64: 35,
  65: 36,
  66: 37,
  67: 38,
  68: 39,
  69: 40,
  70: 41,
  71: 42,
  72: 43,
  73: 44,
  74: 45,
  75: 46,
  76: 47,
  77: 48,
  78: 49,
  79: 50,
  80: 51,
  81: 52,
  82: 53,
  83: 54,
  84: 55,
  85: 56,
  86: 57,
  87: 58,
  88: 59,
  89: 60,
  90: 61,
  91: 62,
  92: 63,
  93: 64,
  94: 65,
  95: 66,
  96: 67,
  97: 68,
  98: 69,
  99: 70,
  100: 71,
  101: 72,
  102: 73,
  103: 74,
  104: 75,
  105: 76,
  106: 77,
  107: 78,
  108: 79,
  109: 80,
  110: 81,
  111: 82,
  112: 83,
  113: 84,
  114: 85,
  115: 86,
  116: 87,
  117: 88,
  118: 89,
  119: 90,
  120: 91,
  121: 92,
  122: 93,
  123: 94,
  124: 95,
  125: 96,
  126: 97,
  160: 172,
  161: 163,
  162: 132,
  163: 133,
  164: 189,
  165: 150,
  166: 232,
  167: 134,
  168: 142,
  169: 139,
  170: 157,
  171: 169,
  172: 164,
  174: 138,
  175: 218,
  176: 131,
  177: 147,
  178: 242,
  179: 243,
  180: 141,
  181: 151,
  182: 136,
  184: 222,
  185: 241,
  186: 158,
  187: 170,
  188: 245,
  189: 244,
  190: 246,
  191: 162,
  192: 173,
  193: 201,
  194: 199,
  195: 174,
  196: 98,
  197: 99,
  198: 144,
  199: 100,
  200: 203,
  201: 101,
  202: 200,
  203: 202,
  204: 207,
  205: 204,
  206: 205,
  207: 206,
  208: 233,
  209: 102,
  210: 211,
  211: 208,
  212: 209,
  213: 175,
  214: 103,
  215: 240,
  216: 145,
  217: 214,
  218: 212,
  219: 213,
  220: 104,
  221: 235,
  222: 237,
  223: 137,
  224: 106,
  225: 105,
  226: 107,
  227: 109,
  228: 108,
  229: 110,
  230: 160,
  231: 111,
  232: 113,
  233: 112,
  234: 114,
  235: 115,
  236: 117,
  237: 116,
  238: 118,
  239: 119,
  240: 234,
  241: 120,
  242: 122,
  243: 121,
  244: 123,
  245: 125,
  246: 124,
  247: 184,
  248: 161,
  249: 127,
  250: 126,
  251: 128,
  252: 129,
  253: 236,
  254: 238,
  255: 186,
  262: 253,
  263: 254,
  268: 255,
  269: 256,
  273: 257,
  286: 248,
  287: 249,
  304: 250,
  305: 215,
  321: 226,
  322: 227,
  338: 176,
  339: 177,
  350: 251,
  351: 252,
  352: 228,
  353: 229,
  376: 187,
  381: 230,
  382: 231,
  402: 166,
  710: 216,
  711: 225,
  728: 219,
  729: 220,
  730: 221,
  731: 224,
  733: 223,
  960: 155,
  8211: 178,
  8212: 179,
  8216: 182,
  8217: 183,
  8218: 196,
  8220: 180,
  8221: 181,
  8222: 197,
  8224: 130,
  8225: 194,
  8226: 135,
  8230: 171,
  8240: 198,
  8249: 190,
  8250: 191,
  8355: 247,
  8482: 140,
  8486: 159,
  8706: 152,
  8710: 168,
  8719: 154,
  8721: 153,
  8722: 239,
  8725: 188,
  8729: 195,
  8730: 165,
  8734: 146,
  8747: 156,
  8776: 167,
  8800: 143,
  8804: 148,
  8805: 149,
  9674: 185,
  61441: 192,
  61442: 193,
  64257: 192,
  64258: 193,
  65535: 0 // 0xFFFF指向.notdef
};
exports["default"] = _default;
},{}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = eot2base64;
var _bytes2base = _interopRequireDefault(require("./util/bytes2base64"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file eot数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * eot数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function eot2base64(arrayBuffer) {
  return 'data:font/eot;charset=utf-8;base64,' + (0, _bytes2base["default"])(arrayBuffer);
}
},{"./util/bytes2base64":103}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = eot2ttf;
var _reader = _interopRequireDefault(require("./reader"));
var _writer = _interopRequireDefault(require("./writer"));
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file eot转ttf
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * eot格式转换成ttf字体格式
 *
 * @param {ArrayBuffer} eotBuffer eot缓冲数组
 * @param {Object} options 选项
 *
 * @return {ArrayBuffer} ttf格式byte流
 */
// eslint-disable-next-line no-unused-vars
function eot2ttf(eotBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // 这里用小尾方式读取
  var eotReader = new _reader["default"](eotBuffer, 0, eotBuffer.byteLength, true);

  // check magic number
  var magicNumber = eotReader.readUint16(34);
  if (magicNumber !== 0x504C) {
    _error["default"].raise(10110);
  }

  // check version
  var version = eotReader.readUint32(8);
  if (version !== 0x20001 && version !== 0x10000 && version !== 0x20002) {
    _error["default"].raise(10110);
  }
  var eotSize = eotBuffer.byteLength || eotBuffer.length;
  var fontSize = eotReader.readUint32(4);
  var fontOffset = 82;
  var familyNameSize = eotReader.readUint16(fontOffset);
  fontOffset += 4 + familyNameSize;
  var styleNameSize = eotReader.readUint16(fontOffset);
  fontOffset += 4 + styleNameSize;
  var versionNameSize = eotReader.readUint16(fontOffset);
  fontOffset += 4 + versionNameSize;
  var fullNameSize = eotReader.readUint16(fontOffset);
  fontOffset += 2 + fullNameSize;

  // version 0x20001
  if (version === 0x20001 || version === 0x20002) {
    var rootStringSize = eotReader.readUint16(fontOffset + 2);
    fontOffset += 4 + rootStringSize;
  }

  // version 0x20002
  if (version === 0x20002) {
    fontOffset += 10;
    var signatureSize = eotReader.readUint16(fontOffset);
    fontOffset += 2 + signatureSize;
    fontOffset += 4;
    var eudcFontSize = eotReader.readUint32(fontOffset);
    fontOffset += 4 + eudcFontSize;
  }
  if (fontOffset + fontSize > eotSize) {
    _error["default"].raise(10001);
  }

  // support slice
  if (eotBuffer.slice) {
    return eotBuffer.slice(fontOffset, fontOffset + fontSize);
  }

  // not support ArrayBuffer.slice eg. IE10
  var bytes = eotReader.readBytes(fontOffset, fontSize);
  return new _writer["default"](new ArrayBuffer(fontSize)).writeBytes(bytes).getBuffer();
}
},{"./error":41,"./reader":47,"./writer":121}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _string = _interopRequireDefault(require("../common/string"));
var _i18n = _interopRequireDefault(require("./i18n"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
var _default = {
  /**
   * 抛出一个异常
   *
   * @param  {Object} e 异常号或者异常对象
   * @param  {...Array} fargs args 参数
   *
   * 例如：
   * e = 1001
   * e = {
   *     number: 1001,
   *     data: 错误数据
   * }
   */
  raise: function raise(e) {
    var number;
    var data;
    if (_typeof(e) === 'object') {
      number = e.number || 0;
      data = e.data;
    } else {
      number = e;
    }
    var message = _i18n["default"].lang[number];
    for (var _len = arguments.length, fargs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      fargs[_key - 1] = arguments[_key];
    }
    if (fargs.length > 0) {
      var args = _typeof(fargs[0]) === 'object' ? fargs[0] : fargs;
      message = _string["default"].format(message, args);
    }
    var event = new Error(message);
    event.number = number;
    if (data) {
      event.data = data;
    }
    throw event;
  }
};
exports["default"] = _default;
},{"../common/string":15,"./i18n":44}],42:[function(require,module,exports){
(function (process,Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _buffer = _interopRequireDefault(require("../nodejs/buffer"));
var _getEmptyttfObject = _interopRequireDefault(require("./getEmptyttfObject"));
var _ttf = _interopRequireDefault(require("./ttf"));
var _woff2ttf = _interopRequireDefault(require("./woff2ttf"));
var _otf2ttfobject = _interopRequireDefault(require("./otf2ttfobject"));
var _eot2ttf = _interopRequireDefault(require("./eot2ttf"));
var _svg2ttfobject = _interopRequireDefault(require("./svg2ttfobject"));
var _ttfreader = _interopRequireDefault(require("./ttfreader"));
var _ttfwriter = _interopRequireDefault(require("./ttfwriter"));
var _ttf2eot = _interopRequireDefault(require("./ttf2eot"));
var _ttf2woff = _interopRequireDefault(require("./ttf2woff"));
var _ttf2svg = _interopRequireDefault(require("./ttf2svg"));
var _ttf2symbol = _interopRequireDefault(require("./ttf2symbol"));
var _ttftowoff = _interopRequireDefault(require("./ttftowoff2"));
var _woff2tottf = _interopRequireDefault(require("./woff2tottf"));
var _ttf2base = _interopRequireDefault(require("./ttf2base64"));
var _eot2base = _interopRequireDefault(require("./eot2base64"));
var _woff2base = _interopRequireDefault(require("./woff2base64"));
var _svg2base = _interopRequireDefault(require("./svg2base64"));
var _bytes2base = _interopRequireDefault(require("./util/bytes2base64"));
var _woff2tobase = _interopRequireDefault(require("./woff2tobase64"));
var _optimizettf = _interopRequireDefault(require("./util/optimizettf"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
// 必须是nodejs环境下的Buffer对象才能触发buffer转换
var SUPPORT_BUFFER = (typeof process === "undefined" ? "undefined" : _typeof(process)) === 'object' && _typeof(process.versions) === 'object' && typeof process.versions.node !== 'undefined' && typeof Buffer === 'function';
var Font = /*#__PURE__*/function () {
  /**
   * 字体对象构造函数
   *
   * @param {ArrayBuffer|Buffer|string} buffer  字体数据
   * @param {Object} options  读取参数
   */
  function Font(buffer) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      type: 'ttf'
    };
    _classCallCheck(this, Font);
    // 字形对象
    if (_typeof(buffer) === 'object' && buffer.glyf) {
      this.set(buffer);
    }
    // buffer
    else if (buffer) {
      this.read(buffer, options);
    }
    // 空
    else {
      this.readEmpty();
    }
  }

  /**
   * 设置一个空的 ttfObject 对象
   *
   * @return {Font}
   */
  _createClass(Font, [{
    key: "readEmpty",
    value: function readEmpty() {
      this.data = (0, _getEmptyttfObject["default"])();
      return this;
    }

    /**
     * 读取字体数据
     *
     * @param {ArrayBuffer|Buffer|string} buffer  字体数据
     * @param {Object} options  读取参数
     * @param {string} options.type 字体类型
     *
     * ttf, woff , eot 读取配置
     * @param {boolean} options.hinting 保留hinting信息
     * @param {boolean} options.compound2simple 复合字形转简单字形
     *
     * woff 读取配置
     * @param {Function} options.inflate 解压相关函数
     *
     * svg 读取配置
     * @param {boolean} options.combinePath 是否合并成单个字形，仅限于普通svg导入
     * @return {Font}
     */
  }, {
    key: "read",
    value: function read(buffer, options) {
      // nodejs buffer
      if (SUPPORT_BUFFER) {
        if (buffer instanceof Buffer) {
          buffer = _buffer["default"].toArrayBuffer(buffer);
        }
      }
      if (options.type === 'ttf') {
        this.data = new _ttfreader["default"](options).read(buffer);
      } else if (options.type === 'otf') {
        this.data = (0, _otf2ttfobject["default"])(buffer, options);
      } else if (options.type === 'eot') {
        buffer = (0, _eot2ttf["default"])(buffer, options);
        this.data = new _ttfreader["default"](options).read(buffer);
      } else if (options.type === 'woff') {
        buffer = (0, _woff2ttf["default"])(buffer, options);
        this.data = new _ttfreader["default"](options).read(buffer);
      } else if (options.type === 'woff2') {
        buffer = (0, _woff2tottf["default"])(buffer, options);
        this.data = new _ttfreader["default"](options).read(buffer);
      } else if (options.type === 'svg') {
        this.data = (0, _svg2ttfobject["default"])(buffer, options);
      } else {
        throw new Error('not support font type' + options.type);
      }
      this.type = options.type;
      return this;
    }

    /**
     * 写入字体数据
     *
     * @param {Object} options  写入参数
     * @param {string} options.type   字体类型, 默认 ttf
     * @param {boolean} options.toBuffer nodejs 环境中返回 Buffer 对象, 默认 true
     *
     * ttf 字体参数
     * @param {boolean} options.hinting 保留hinting信息
     *
     * svg,woff 字体参数
     * @param {Object} options.metadata 字体相关的信息
     *
     * woff 字体参数
     * @param {Function} options.deflate 压缩相关函数
     * @return {Buffer|ArrayBuffer|string}
     */
  }, {
    key: "write",
    value: function write() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      if (!options.type) {
        options.type = this.type;
      }
      var buffer = null;
      if (options.type === 'ttf') {
        buffer = new _ttfwriter["default"](options).write(this.data);
      } else if (options.type === 'eot') {
        buffer = new _ttfwriter["default"](options).write(this.data);
        buffer = (0, _ttf2eot["default"])(buffer, options);
      } else if (options.type === 'woff') {
        buffer = new _ttfwriter["default"](options).write(this.data);
        buffer = (0, _ttf2woff["default"])(buffer, options);
      } else if (options.type === 'woff2') {
        buffer = new _ttfwriter["default"](options).write(this.data);
        buffer = (0, _ttftowoff["default"])(buffer, options);
      } else if (options.type === 'svg') {
        buffer = (0, _ttf2svg["default"])(this.data, options);
      } else if (options.type === 'symbol') {
        buffer = (0, _ttf2symbol["default"])(this.data, options);
      } else {
        throw new Error('not support font type' + options.type);
      }
      if (SUPPORT_BUFFER) {
        if (false !== options.toBuffer && buffer instanceof ArrayBuffer) {
          buffer = _buffer["default"].toBuffer(buffer);
        }
      }
      return buffer;
    }

    /**
     * 转换成 base64编码
     *
     * @param {Object} options  写入参数
     * @param {string} options.type   字体类型, 默认 ttf
     * 其他 options参数, 参考 write
     * @see write
     *
     * @param {ArrayBuffer} buffer  如果提供了buffer数据则使用 buffer数据, 否则转换现有的 font
     * @return {string}
     */
  }, {
    key: "toBase64",
    value: function toBase64(options, buffer) {
      if (!options.type) {
        options.type = this.type;
      }
      if (buffer) {
        if (SUPPORT_BUFFER) {
          if (buffer instanceof Buffer) {
            buffer = _buffer["default"].toArrayBuffer(buffer);
          }
        }
      } else {
        options.toBuffer = false;
        buffer = this.write(options);
      }
      var base64Str;
      if (options.type === 'ttf') {
        base64Str = (0, _ttf2base["default"])(buffer);
      } else if (options.type === 'eot') {
        base64Str = (0, _eot2base["default"])(buffer);
      } else if (options.type === 'woff') {
        base64Str = (0, _woff2base["default"])(buffer);
      } else if (options.type === 'woff2') {
        base64Str = (0, _woff2tobase["default"])(buffer);
      } else if (options.type === 'svg') {
        base64Str = (0, _svg2base["default"])(buffer);
      } else if (options.type === 'symbol') {
        base64Str = (0, _svg2base["default"])(buffer, 'image/svg+xml');
      } else {
        throw new Error('not support font type' + options.type);
      }
      return base64Str;
    }

    /**
     * 设置 font 对象
     *
     * @param {Object} data font的ttfObject对象
     * @return {this}
     */
  }, {
    key: "set",
    value: function set(data) {
      this.data = data;
      return this;
    }

    /**
     * 获取 font 数据
     *
     * @return {Object} ttfObject 对象
     */
  }, {
    key: "get",
    value: function get() {
      return this.data;
    }

    /**
     * 对字形数据进行优化
     *
     * @param  {Object} out  输出结果
     * @param  {boolean|Object} out.result `true` 或者有问题的地方
     * @return {Font}
     */
  }, {
    key: "optimize",
    value: function optimize(out) {
      var result = (0, _optimizettf["default"])(this.data);
      if (out) {
        out.result = result;
      }
      return this;
    }

    /**
     * 将字体中的复合字形转为简单字形
     *
     * @return {this}
     */
  }, {
    key: "compound2simple",
    value: function compound2simple() {
      var ttf = new _ttf["default"](this.data);
      ttf.compound2simple();
      this.data = ttf.get();
      return this;
    }

    /**
     * 对字形按照unicode编码排序
     *
     * @return {this}
     */
  }, {
    key: "sort",
    value: function sort() {
      var ttf = new _ttf["default"](this.data);
      ttf.sortGlyf();
      this.data = ttf.get();
      return this;
    }

    /**
     * 查找相关字形
     *
     * @param  {Object} condition 查询条件
     * @param  {Array|number} condition.unicode unicode编码列表或者单个unicode编码
     * @param  {string} condition.name glyf名字，例如`uniE001`, `uniE`
     * @param  {Function} condition.filter 自定义过滤器
     * @example
     *     condition.filter(glyf) {
     *         return glyf.name === 'logo';
     *     }
     * @return {Array}  glyf字形列表
     */
  }, {
    key: "find",
    value: function find(condition) {
      var ttf = new _ttf["default"](this.data);
      var indexList = ttf.findGlyf(condition);
      return indexList.length ? ttf.getGlyf(indexList) : indexList;
    }

    /**
     * 合并 font 到当前的 font
     *
     * @param {Object} font Font 对象
     * @param {Object} options 参数选项
     * @param {boolean} options.scale 是否自动缩放
     * @param {boolean} options.adjustGlyf 是否调整字形以适应边界
     *                                     (和 options.scale 参数互斥)
     *
     * @return {Font}
     */
  }, {
    key: "merge",
    value: function merge(font, options) {
      var ttf = new _ttf["default"](this.data);
      ttf.mergeGlyf(font.get(), options);
      this.data = ttf.get();
      return this;
    }
  }]);
  return Font;
}();
/**
 * 读取字体数据返回字体对象
 *
 * @param {ArrayBuffer|Buffer|string} buffer 字体数据
 * @param {Object} options  读取参数
 * @return {Font}
 */
exports["default"] = Font;
Font.create = function (buffer, options) {
  return new Font(buffer, options);
};

/**
 * base64序列化buffer 数据
 *
 * @param {ArrayBuffer|Buffer|string} buffer 字体数据
 * @return {Font}
 */
Font.toBase64 = function (buffer) {
  if (typeof buffer === 'string') {
    // node 环境中没有 btoa 函数
    if (typeof btoa === 'undefined') {
      return Buffer.from(buffer, 'binary').toString('base64');
    }
    return btoa(buffer);
  }
  return (0, _bytes2base["default"])(buffer);
};
}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"../nodejs/buffer":29,"./eot2base64":39,"./eot2ttf":40,"./getEmptyttfObject":43,"./otf2ttfobject":45,"./svg2base64":48,"./svg2ttfobject":49,"./ttf":93,"./ttf2base64":94,"./ttf2eot":95,"./ttf2svg":97,"./ttf2symbol":98,"./ttf2woff":99,"./ttfreader":100,"./ttftowoff2":101,"./ttfwriter":102,"./util/bytes2base64":103,"./util/optimizettf":110,"./woff2base64":117,"./woff2tobase64":118,"./woff2tottf":119,"./woff2ttf":120,"_process":4,"buffer":2}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = getEmpty;
var _lang = require("../common/lang");
var _empty = _interopRequireDefault(require("./data/empty"));
var _default = _interopRequireDefault(require("./data/default"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 获取空的ttf对象
 * @author mengke01(kekee000@gmail.com)
 */

function getEmpty() {
  var ttf = (0, _lang.clone)(_empty["default"]);
  Object.assign(ttf.name, _default["default"].name);
  ttf.head.created = ttf.head.modified = Date.now();
  return ttf;
}
},{"../common/lang":14,"./data/default":30,"./data/empty":31}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _I18n = _interopRequireDefault(require("../common/I18n"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 语言字符串管理
 * @author mengke01(kekee000@gmail.com)
 */

var zh = {
  // error define
  10001: '超出读取范围：${0}, ${1}',
  10002: '超出写入范围：${0}, ${1}',
  10003: '未知数据类型：${0}, ${1}',
  10004: '不支持svg解析',
  10101: '错误的ttf文件',
  10102: '错误的woff文件',
  10103: '错误的svg文件',
  10104: '读取ttf文件错误',
  10105: '读取woff文件错误',
  10106: '读取svg文件错误',
  10107: '写入ttf文件错误',
  10108: '写入woff文件错误',
  10109: '写入svg文件错误',
  10112: '写入svg symbol 错误',
  10110: '读取eot文件错误',
  10111: '读取eot字体错误',
  10200: '重复的unicode代码点，字形序号：${0}',
  10201: 'ttf字形轮廓数据为空',
  10202: '不支持标志位：ARGS_ARE_XY_VALUES',
  10203: '未找到表：${0}',
  10204: '读取ttf表错误',
  10205: '未找到解压函数',
  10301: '错误的otf文件',
  10302: '读取otf表错误',
  10303: 'otf字形轮廓数据为空'
};
var en = {
  // error define
  10001: 'Reading index out of range: ${0}, ${1}',
  10002: 'Writing index out of range: ${0}, ${1}',
  10003: 'Unknown datatype: ${0}, ${1}',
  10004: 'No svg parser',
  10101: 'ttf file damaged',
  10102: 'woff file damaged',
  10103: 'svg file damaged',
  10104: 'Read ttf error',
  10105: 'Read woff error',
  10106: 'Read svg error',
  10107: 'Write ttf error',
  10108: 'Write woff error',
  10109: 'Write svg error',
  10112: 'Write svg symbol error',
  10110: 'Read eot error',
  10111: 'Write eot error',
  10200: 'Repeat unicode, glyph index: ${0}',
  10201: 'ttf `glyph` data is empty',
  10202: 'Not support compound glyph flag: ARGS_ARE_XY_VALUES',
  10203: 'No ttf table: ${0}',
  10204: 'Read ttf table data error',
  10205: 'No zip deflate function',
  10301: 'otf file damaged',
  10302: 'Read otf table error',
  10303: 'otf `glyph` data is empty'
};
var _default = new _I18n["default"]([['zh-cn', zh], ['en-us', en]], typeof window !== 'undefined' ? window.language : 'en-us');
exports["default"] = _default;
},{"../common/I18n":13}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = otf2ttfobject;
var _error = _interopRequireDefault(require("./error"));
var _otfreader = _interopRequireDefault(require("./otfreader"));
var _otfContours2ttfContours = _interopRequireDefault(require("./util/otfContours2ttfContours"));
var _computeBoundingBox = require("../graphics/computeBoundingBox");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
/**
 * otf格式转ttf格式对象
 *
 * @param  {ArrayBuffer|otfObject} otfBuffer 原始数据或者解析后的otf数据
 * @param  {Object} options   参数
 * @return {Object}          ttfObject对象
 */
function otf2ttfobject(otfBuffer, options) {
  var otfObject;
  if (otfBuffer instanceof ArrayBuffer) {
    var otfReader = new _otfreader["default"](options);
    otfObject = otfReader.read(otfBuffer);
    otfReader.dispose();
  } else if (otfBuffer.head && otfBuffer.glyf && otfBuffer.cmap) {
    otfObject = otfBuffer;
  } else {
    _error["default"].raise(10111);
  }

  // 转换otf轮廓
  otfObject.glyf.forEach(function (g) {
    g.contours = (0, _otfContours2ttfContours["default"])(g.contours);
    var box = _computeBoundingBox.computePathBox.apply(void 0, _toConsumableArray(g.contours));
    if (box) {
      g.xMin = box.x;
      g.xMax = box.x + box.width;
      g.yMin = box.y;
      g.yMax = box.y + box.height;
      g.leftSideBearing = g.xMin;
    } else {
      g.xMin = 0;
      g.xMax = 0;
      g.yMin = 0;
      g.yMax = 0;
      g.leftSideBearing = 0;
    }
  });
  otfObject.version = 0x1;

  // 修改maxp相关配置
  otfObject.maxp.version = 1.0;
  otfObject.maxp.maxZones = otfObject.maxp.maxTwilightPoints ? 2 : 1;
  delete otfObject.CFF;
  delete otfObject.VORG;
  return otfObject;
}
},{"../graphics/computeBoundingBox":16,"./error":41,"./otfreader":46,"./util/otfContours2ttfContours":111}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _directory = _interopRequireDefault(require("./table/directory"));
var _supportOtf = _interopRequireDefault(require("./table/support-otf"));
var _reader = _interopRequireDefault(require("./reader"));
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var OTFReader = /*#__PURE__*/function () {
  /**
   * OTF读取函数
   *
   * @param {Object} options 写入参数
   * @constructor
   */
  function OTFReader() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, OTFReader);
    options.subset = options.subset || [];
    this.options = options;
  }

  /**
   * 初始化
   *
   * @param {ArrayBuffer} buffer buffer对象
   * @return {Object} ttf对象
   */
  _createClass(OTFReader, [{
    key: "readBuffer",
    value: function readBuffer(buffer) {
      var reader = new _reader["default"](buffer, 0, buffer.byteLength, false);
      var font = {};

      // version
      font.version = reader.readString(0, 4);
      if (font.version !== 'OTTO') {
        _error["default"].raise(10301);
      }

      // num tables
      font.numTables = reader.readUint16();
      if (font.numTables <= 0 || font.numTables > 100) {
        _error["default"].raise(10302);
      }

      // searchRange
      font.searchRange = reader.readUint16();

      // entrySelector
      font.entrySelector = reader.readUint16();

      // rangeShift
      font.rangeShift = reader.readUint16();
      font.tables = new _directory["default"](reader.offset).read(reader, font);
      if (!font.tables.head || !font.tables.cmap || !font.tables.CFF) {
        _error["default"].raise(10302);
      }
      font.readOptions = this.options;

      // 读取支持的表数据
      Object.keys(_supportOtf["default"]).forEach(function (tableName) {
        if (font.tables[tableName]) {
          var offset = font.tables[tableName].offset;
          font[tableName] = new _supportOtf["default"][tableName](offset).read(reader, font);
        }
      });
      if (!font.CFF.glyf) {
        _error["default"].raise(10303);
      }
      reader.dispose();
      return font;
    }

    /**
     * 关联glyf相关的信息
     *
     * @param {Object} font font对象
     */
  }, {
    key: "resolveGlyf",
    value: function resolveGlyf(font) {
      var codes = font.cmap;
      var glyf = font.CFF.glyf;
      var subsetMap = font.readOptions.subset ? font.subsetMap : null; // 当前ttf的子集列表
      // unicode
      Object.keys(codes).forEach(function (c) {
        var i = codes[c];
        if (subsetMap && !subsetMap[i]) {
          return;
        }
        if (!glyf[i].unicode) {
          glyf[i].unicode = [];
        }
        glyf[i].unicode.push(+c);
      });

      // leftSideBearing
      font.hmtx.forEach(function (item, i) {
        if (subsetMap && !subsetMap[i]) {
          return;
        }
        glyf[i].advanceWidth = glyf[i].advanceWidth || item.advanceWidth || 0;
        glyf[i].leftSideBearing = item.leftSideBearing;
      });

      // 设置了subsetMap之后需要选取subset中的字形
      if (subsetMap) {
        var subGlyf = [];
        Object.keys(subsetMap).forEach(function (i) {
          subGlyf.push(glyf[+i]);
        });
        glyf = subGlyf;
      }
      font.glyf = glyf;
    }

    /**
     * 清除非必须的表
     *
     * @param {Object} font font对象
     */
  }, {
    key: "cleanTables",
    value: function cleanTables(font) {
      delete font.readOptions;
      delete font.tables;
      delete font.hmtx;
      delete font.post.glyphNameIndex;
      delete font.post.names;
      delete font.subsetMap;

      // 删除无用的表
      var cff = font.CFF;
      delete cff.glyf;
      delete cff.charset;
      delete cff.encoding;
      delete cff.gsubrs;
      delete cff.gsubrsBias;
      delete cff.subrs;
      delete cff.subrsBias;
    }

    /**
     * 获取解析后的ttf文档
     *
     * @param {ArrayBuffer} buffer buffer对象
     *
     * @return {Object} ttf文档
     */
  }, {
    key: "read",
    value: function read(buffer) {
      this.font = this.readBuffer(buffer);
      this.resolveGlyf(this.font);
      this.cleanTables(this.font);
      return this.font;
    }

    /**
     * 注销
     */
  }, {
    key: "dispose",
    value: function dispose() {
      delete this.font;
      delete this.options;
    }
  }]);
  return OTFReader;
}();
exports["default"] = OTFReader;
},{"./error":41,"./reader":47,"./table/directory":73,"./table/support-otf":90}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _lang = require("../common/lang");
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i["return"] && (_r = _i["return"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
// 检查数组支持情况
if (typeof ArrayBuffer === 'undefined' || typeof DataView === 'undefined') {
  throw new Error('not support ArrayBuffer and DataView');
}

// 数据类型
var dataType = {
  Int8: 1,
  Int16: 2,
  Int32: 4,
  Uint8: 1,
  Uint16: 2,
  Uint32: 4,
  Float32: 4,
  Float64: 8
};
var Reader = /*#__PURE__*/function () {
  /**
   * 读取器
   *
   * @constructor
   * @param {Array.<byte>} buffer 缓冲数组
   * @param {number} offset 起始偏移
   * @param {number} length 数组长度
   * @param {boolean} littleEndian 是否小尾
   */
  function Reader(buffer, offset, length, littleEndian) {
    _classCallCheck(this, Reader);
    var bufferLength = buffer.byteLength || buffer.length;
    this.offset = offset || 0;
    this.length = length || bufferLength - this.offset;
    this.littleEndian = littleEndian || false;
    this.view = new DataView(buffer, this.offset, this.length);
  }

  /**
   * 读取指定的数据类型
   *
   * @param {string} type 数据类型
   * @param {number=} offset 位移
   * @param {boolean=} littleEndian 是否小尾
   * @return {number} 返回值
   */
  _createClass(Reader, [{
    key: "read",
    value: function read(type, offset, littleEndian) {
      // 使用当前位移
      if (undefined === offset) {
        offset = this.offset;
      }

      // 使用小尾
      if (undefined === littleEndian) {
        littleEndian = this.littleEndian;
      }

      // 扩展方法
      if (undefined === dataType[type]) {
        return this['read' + type](offset, littleEndian);
      }
      var size = dataType[type];
      this.offset = offset + size;
      return this.view['get' + type](offset, littleEndian);
    }

    /**
     * 获取指定的字节数组
     *
     * @param {number} offset 偏移
     * @param {number} length 字节长度
     * @return {Array} 字节数组
     */
  }, {
    key: "readBytes",
    value: function readBytes(offset) {
      var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (length == null) {
        length = offset;
        offset = this.offset;
      }
      if (length < 0 || offset + length > this.length) {
        _error["default"].raise(10001, this.length, offset + length);
      }
      var buffer = [];
      for (var i = 0; i < length; ++i) {
        buffer.push(this.view.getUint8(offset + i));
      }
      this.offset = offset + length;
      return buffer;
    }

    /**
     * 读取一个string
     *
     * @param {number} offset 偏移
     * @param {number} length 长度
     * @return {string} 字符串
     */
  }, {
    key: "readString",
    value: function readString(offset) {
      var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (length == null) {
        length = offset;
        offset = this.offset;
      }
      if (length < 0 || offset + length > this.length) {
        _error["default"].raise(10001, this.length, offset + length);
      }
      var value = '';
      for (var i = 0; i < length; ++i) {
        var c = this.readUint8(offset + i);
        value += String.fromCharCode(c);
      }
      this.offset = offset + length;
      return value;
    }

    /**
     * 读取一个字符
     *
     * @param {number} offset 偏移
     * @return {string} 字符串
     */
  }, {
    key: "readChar",
    value: function readChar(offset) {
      return this.readString(offset, 1);
    }

    /**
     * 读取一个uint24整形
     *
     * @param {number} offset 偏移
     * @return {number}
     */
  }, {
    key: "readUint24",
    value: function readUint24(offset) {
      var _this$readBytes = this.readBytes(offset || this.offset, 3),
        _this$readBytes2 = _slicedToArray(_this$readBytes, 3),
        i = _this$readBytes2[0],
        j = _this$readBytes2[1],
        k = _this$readBytes2[2];
      return (i << 16) + (j << 8) + k;
    }

    /**
     * 读取fixed类型
     *
     * @param {number} offset 偏移
     * @return {number} float
     */
  }, {
    key: "readFixed",
    value: function readFixed(offset) {
      if (undefined === offset) {
        offset = this.offset;
      }
      var val = this.readInt32(offset, false) / 65536.0;
      return Math.ceil(val * 100000) / 100000;
    }

    /**
     * 读取长日期
     *
     * @param {number} offset 偏移
     * @return {Date} Date对象
     */
  }, {
    key: "readLongDateTime",
    value: function readLongDateTime(offset) {
      if (undefined === offset) {
        offset = this.offset;
      }

      // new Date(1970, 1, 1).getTime() - new Date(1904, 1, 1).getTime();
      var delta = -2077545600000;
      var time = this.readUint32(offset + 4, false);
      var date = new Date();
      date.setTime(time * 1000 + delta);
      return date;
    }

    /**
     * 跳转到指定偏移
     *
     * @param {number} offset 偏移
     * @return {Object} this
     */
  }, {
    key: "seek",
    value: function seek(offset) {
      if (undefined === offset) {
        this.offset = 0;
      }
      if (offset < 0 || offset > this.length) {
        _error["default"].raise(10001, this.length, offset);
      }
      this.offset = offset;
      return this;
    }

    /**
     * 注销
     */
  }, {
    key: "dispose",
    value: function dispose() {
      delete this.view;
    }
  }]);
  return Reader;
}(); // 直接支持的数据类型
exports["default"] = Reader;
Object.keys(dataType).forEach(function (type) {
  Reader.prototype['read' + type] = (0, _lang.curry)(Reader.prototype.read, type);
});
},{"../common/lang":14,"./error":41}],48:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = svg2base64;
/**
 * @file svg字符串转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * svg字符串转base64编码
 *
 * @param {string} svg svg对象
 * @param {string} scheme  头部
 * @return {string} base64编码
 */
function svg2base64(svg) {
  var scheme = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'font/svg';
  if (typeof btoa === 'undefined') {
    return 'data:' + scheme + ';charset=utf-8;base64,' + Buffer.from(svg, 'binary').toString('base64');
  }
  return 'data:' + scheme + ';charset=utf-8;base64,' + btoa(svg);
}
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = svg2ttfObject;
var _string = _interopRequireDefault(require("../common/string"));
var _DOMParser = _interopRequireDefault(require("../common/DOMParser"));
var _path2contours = _interopRequireDefault(require("./svg/path2contours"));
var _svgnode2contours = _interopRequireDefault(require("./svg/svgnode2contours"));
var _computeBoundingBox = require("../graphics/computeBoundingBox");
var _pathsUtil = _interopRequireDefault(require("../graphics/pathsUtil"));
var _glyfAdjust = _interopRequireDefault(require("./util/glyfAdjust"));
var _error = _interopRequireDefault(require("./error"));
var _getEmptyttfObject = _interopRequireDefault(require("./getEmptyttfObject"));
var _reduceGlyf = _interopRequireDefault(require("./util/reduceGlyf"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
/**
 * 加载xml字符串
 *
 * @param {string} xml xml字符串
 * @return {XMLDocument}
 */
function loadXML(xml) {
  if (_DOMParser["default"]) {
    try {
      var domParser = new _DOMParser["default"]();
      var xmlDoc = domParser.parseFromString(xml, 'text/xml');
      return xmlDoc;
    } catch (exp) {
      _error["default"].raise(10103);
    }
  }
  _error["default"].raise(10004);
}

/**
 * 对xml文本进行处理
 *
 * @param  {string} svg svg文本
 * @return {string} 处理后文本
 */
function resolveSVG(svg) {
  // 去除xmlns，防止xmlns导致svg解析错误
  svg = svg.replace(/\s+xmlns(?::[\w-]+)?=("|')[^"']*\1/g, ' ').replace(/<defs[>\s][\s\S]+?\/defs>/g, function (text) {
    if (text.indexOf('</font>') >= 0) {
      return text;
    }
    return '';
  }).replace(/<use[>\s][\s\S]+?\/use>/g, '');
  return svg;
}

/**
 * 获取空的ttf格式对象
 *
 * @return {Object} ttfObject对象
 */
function getEmptyTTF() {
  var ttf = (0, _getEmptyttfObject["default"])();
  ttf.head.unitsPerEm = 0; // 去除unitsPerEm以便于重新计算
  ttf.from = 'svgfont';
  return ttf;
}

/**
 * 获取空的对象，用来作为ttf的容器
 *
 * @return {Object} ttfObject对象
 */
function getEmptyObject() {
  return {
    'from': 'svg',
    'OS/2': {},
    'name': {},
    'hhea': {},
    'head': {},
    'post': {},
    'glyf': []
  };
}

/**
 * 根据边界获取unitsPerEm
 *
 * @param {number} xMin x最小值
 * @param {number} xMax x最大值
 * @param {number} yMin y最小值
 * @param {number} yMax y最大值
 * @return {number}
 */
function getUnitsPerEm(xMin, xMax, yMin, yMax) {
  var seed = Math.ceil(Math.min(yMax - yMin, xMax - xMin));
  if (!seed) {
    return 1024;
  }
  if (seed <= 128) {
    return seed;
  }

  // 获取合适的unitsPerEm
  var unitsPerEm = 128;
  while (unitsPerEm < 16384) {
    if (seed <= 1.2 * unitsPerEm) {
      return unitsPerEm;
    }
    unitsPerEm <<= 1;
  }
  return 1024;
}

/**
 * 对ttfObject进行处理，去除小数
 *
 * @param {Object} ttf ttfObject
 * @return {Object} ttfObject
 */
function resolve(ttf) {
  // 如果是svg格式字体，则去小数
  // 由于svg格式导入时候会出现字形重复问题，这里进行优化
  if (ttf.from === 'svgfont' && ttf.head.unitsPerEm > 128) {
    ttf.glyf.forEach(function (g) {
      if (g.contours) {
        (0, _glyfAdjust["default"])(g);
        (0, _reduceGlyf["default"])(g);
      }
    });
  }
  // 否则重新计算字形大小，缩放到1024的em
  else {
    var xMin = 16384;
    var xMax = -16384;
    var yMin = 16384;
    var yMax = -16384;
    ttf.glyf.forEach(function (g) {
      if (g.contours) {
        var bound = _computeBoundingBox.computePathBox.apply(void 0, _toConsumableArray(g.contours));
        if (bound) {
          xMin = Math.min(xMin, bound.x);
          xMax = Math.max(xMax, bound.x + bound.width);
          yMin = Math.min(yMin, bound.y);
          yMax = Math.max(yMax, bound.y + bound.height);
        }
      }
    });
    var unitsPerEm = getUnitsPerEm(xMin, xMax, yMin, yMax);
    var scale = 1024 / unitsPerEm;
    ttf.glyf.forEach(function (g) {
      (0, _glyfAdjust["default"])(g, scale, scale);
      (0, _reduceGlyf["default"])(g);
    });
    ttf.head.unitsPerEm = 1024;
  }
  return ttf;
}

/**
 * 解析字体信息相关节点
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} ttf ttf对象
 * @return {Object} ttf对象
 */
function parseFont(xmlDoc, ttf) {
  var metaNode = xmlDoc.getElementsByTagName('metadata')[0];
  var fontNode = xmlDoc.getElementsByTagName('font')[0];
  var fontFaceNode = xmlDoc.getElementsByTagName('font-face')[0];
  if (metaNode && metaNode.textContent) {
    ttf.metadata = _string["default"].decodeHTML(metaNode.textContent.trim());
  }

  // 解析font，如果有font节点说明是svg格式字体文件
  if (fontNode) {
    ttf.id = fontNode.getAttribute('id') || '';
    ttf.hhea.advanceWidthMax = +(fontNode.getAttribute('horiz-adv-x') || 0);
    ttf.from = 'svgfont';
  }
  if (fontFaceNode) {
    var OS2 = ttf['OS/2'];
    ttf.name.fontFamily = fontFaceNode.getAttribute('font-family') || '';
    OS2.usWeightClass = +(fontFaceNode.getAttribute('font-weight') || 0);
    ttf.head.unitsPerEm = +(fontFaceNode.getAttribute('units-per-em') || 0);

    // 解析panose, eg: 2 0 6 3 0 0 0 0 0 0
    var panose = (fontFaceNode.getAttribute('panose-1') || '').split(' ');
    ['bFamilyType', 'bSerifStyle', 'bWeight', 'bProportion', 'bContrast', 'bStrokeVariation', 'bArmStyle', 'bLetterform', 'bMidline', 'bXHeight'].forEach(function (name, i) {
      OS2[name] = +(panose[i] || 0);
    });
    ttf.hhea.ascent = +(fontFaceNode.getAttribute('ascent') || 0);
    ttf.hhea.descent = +(fontFaceNode.getAttribute('descent') || 0);
    OS2.bXHeight = +(fontFaceNode.getAttribute('x-height') || 0);

    // 解析bounding
    var box = (fontFaceNode.getAttribute('bbox') || '').split(' ');
    ['xMin', 'yMin', 'xMax', 'yMax'].forEach(function (name, i) {
      ttf.head[name] = +(box[i] || '');
    });
    ttf.post.underlineThickness = +(fontFaceNode.getAttribute('underline-thickness') || 0);
    ttf.post.underlinePosition = +(fontFaceNode.getAttribute('underline-position') || 0);

    // unicode range
    var unicodeRange = fontFaceNode.getAttribute('unicode-range');
    if (unicodeRange) {
      unicodeRange.replace(/u\+([0-9A-Z]+)(-[0-9A-Z]+)?/i, function ($0, a, b) {
        OS2.usFirstCharIndex = Number('0x' + a);
        OS2.usLastCharIndex = b ? Number('0x' + b.slice(1)) : 0xFFFFFFFF;
      });
    }
  }
  return ttf;
}

/**
 * 解析字体信息相关节点
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} ttf ttf对象
 * @return {Object} ttf对象
 */
function parseGlyf(xmlDoc, ttf) {
  var missingNode = xmlDoc.getElementsByTagName('missing-glyph')[0];

  // 解析glyf
  var d;
  var unicode;
  if (missingNode) {
    var missing = {
      name: '.notdef'
    };
    if (missingNode.getAttribute('horiz-adv-x')) {
      missing.advanceWidth = +missingNode.getAttribute('horiz-adv-x');
    }
    if (d = missingNode.getAttribute('d')) {
      missing.contours = (0, _path2contours["default"])(d);
    }

    // 去除默认的空字形
    if (ttf.glyf[0] && ttf.glyf[0].name === '.notdef') {
      ttf.glyf.splice(0, 1);
    }
    ttf.glyf.unshift(missing);
  }
  var glyfNodes = xmlDoc.getElementsByTagName('glyph');
  if (glyfNodes.length) {
    for (var i = 0, l = glyfNodes.length; i < l; i++) {
      var node = glyfNodes[i];
      var glyf = {
        name: node.getAttribute('glyph-name') || node.getAttribute('name') || ''
      };
      if (node.getAttribute('horiz-adv-x')) {
        glyf.advanceWidth = +node.getAttribute('horiz-adv-x');
      }
      if (unicode = node.getAttribute('unicode')) {
        var nextUnicode = [];
        var totalCodePoints = 0;
        for (var ui = 0; ui < unicode.length; ui++) {
          var ucp = unicode.codePointAt(ui);
          nextUnicode.push(ucp);
          ui = ucp > 0xffff ? ui + 1 : ui;
          totalCodePoints += 1;
        }
        if (totalCodePoints === 1) {
          // TTF can't handle ligatures
          glyf.unicode = nextUnicode;
          if (d = node.getAttribute('d')) {
            glyf.contours = (0, _path2contours["default"])(d);
          }
          ttf.glyf.push(glyf);
        }
      }
    }
  }
  return ttf;
}

/**
 * 解析字体信息相关节点
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} ttf ttf对象
 */
function parsePath(xmlDoc, ttf) {
  // 单个path组成一个glfy字形
  var contours;
  var glyf;
  var node;
  var pathNodes = xmlDoc.getElementsByTagName('path');
  if (pathNodes.length) {
    for (var i = 0, l = pathNodes.length; i < l; i++) {
      node = pathNodes[i];
      glyf = {
        name: node.getAttribute('name') || ''
      };
      contours = (0, _svgnode2contours["default"])([node]);
      glyf.contours = contours;
      ttf.glyf.push(glyf);
    }
  }

  // 其他svg指令组成一个glyf字形
  contours = (0, _svgnode2contours["default"])(Array.prototype.slice.call(xmlDoc.getElementsByTagName('*')).filter(function (node) {
    return node.tagName !== 'path';
  }));
  if (contours) {
    glyf = {
      name: ''
    };
    glyf.contours = contours;
    ttf.glyf.push(glyf);
  }
}

/**
 * 解析xml文档
 *
 * @param {XMLDocument} xmlDoc XML文档对象
 * @param {Object} options 导入选项
 *
 * @return {Object} 解析后对象
 */
function parseXML(xmlDoc, options) {
  if (!xmlDoc.getElementsByTagName('svg').length) {
    _error["default"].raise(10106);
  }
  var ttf;

  // 如果是svg字体格式，则解析glyf，否则解析path
  if (xmlDoc.getElementsByTagName('font')[0]) {
    ttf = getEmptyTTF();
    parseFont(xmlDoc, ttf);
    parseGlyf(xmlDoc, ttf);
  } else {
    ttf = getEmptyObject();
    parsePath(xmlDoc, ttf);
  }
  if (!ttf.glyf.length) {
    _error["default"].raise(10201);
  }
  if (ttf.from === 'svg') {
    var glyf = ttf.glyf;
    var i;
    var l;
    // 合并导入的字形为单个字形
    if (options.combinePath) {
      var combined = [];
      for (i = 0, l = glyf.length; i < l; i++) {
        var contours = glyf[i].contours;
        for (var index = 0, length = contours.length; index < length; index++) {
          combined.push(contours[index]);
        }
      }
      glyf[0].contours = combined;
      glyf.splice(1);
    }

    // 对字形进行反转
    for (i = 0, l = glyf.length; i < l; i++) {
      // 这里为了使ai等工具里面的字形方便导入，对svg做了反向处理
      glyf[i].contours = _pathsUtil["default"].flip(glyf[i].contours);
    }
  }
  return ttf;
}

/**
 * svg格式转ttfObject格式
 *
 * @param {string} svg svg格式
 * @param {Object=} options 导入选项
 * @param {boolean} options.combinePath 是否合并成单个字形，仅限于普通svg导入
 * @return {Object} ttfObject
 */
function svg2ttfObject(svg) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    combinePath: false
  };
  var xmlDoc = svg;
  if (typeof svg === 'string') {
    svg = resolveSVG(svg);
    xmlDoc = loadXML(svg);
  }
  var ttf = parseXML(xmlDoc, options);
  return resolve(ttf);
}
},{"../common/DOMParser":12,"../common/string":15,"../graphics/computeBoundingBox":16,"../graphics/pathsUtil":25,"./error":41,"./getEmptyttfObject":43,"./svg/path2contours":54,"./svg/svgnode2contours":57,"./util/glyfAdjust":109,"./util/reduceGlyf":113}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = contoursTransform;
var _matrix = require("../../graphics/matrix");
var _pathTransform = _interopRequireDefault(require("../../graphics/pathTransform"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 根据transform参数变换轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 根据transform参数变换轮廓
 *
 * @param {Array} contours 轮廓集合
 * @param {Array} transforms 变换指令集合
 *     transforms = [{
 *         name: 'scale'
 *         params: [3,4]
 *     }]
 *
 * @return {Array} 变换后的轮廓数组
 */
function contoursTransform(contours, transforms) {
  if (!contours || !contours.length || !transforms || !transforms.length) {
    return contours;
  }
  var matrix = [1, 0, 0, 1, 0, 0];
  for (var i = 0, l = transforms.length; i < l; i++) {
    var transform = transforms[i];
    var params = transform.params;
    var radian = null;
    switch (transform.name) {
      case 'translate':
        matrix = (0, _matrix.mul)(matrix, [1, 0, 0, 1, params[0], params[1]]);
        break;
      case 'scale':
        matrix = (0, _matrix.mul)(matrix, [params[0], 0, 0, params[1], 0, 0]);
        break;
      case 'matrix':
        matrix = (0, _matrix.mul)(matrix, [params[0], params[1], params[2], params[3], params[4], params[5]]);
        break;
      case 'rotate':
        radian = params[0] * Math.PI / 180;
        if (params.length > 1) {
          matrix = (0, _matrix.multiply)(matrix, [1, 0, 0, 1, -params[1], -params[2]], [Math.cos(radian), Math.sin(radian), -Math.sin(radian), Math.cos(radian), 0, 0], [1, 0, 0, 1, params[1], params[2]]);
        } else {
          matrix = (0, _matrix.mul)(matrix, [Math.cos(radian), Math.sin(radian), -Math.sin(radian), Math.cos(radian), 0, 0]);
        }
        break;
      case 'skewX':
        matrix = (0, _matrix.mul)(matrix, [1, 0, Math.tan(params[0] * Math.PI / 180), 1, 0, 0]);
        break;
      case 'skewY':
        matrix = (0, _matrix.mul)(matrix, [1, Math.tan(params[0] * Math.PI / 180), 0, 1, 0, 0]);
        break;
    }
  }
  contours.forEach(function (p) {
    (0, _pathTransform["default"])(p, matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
  });
  return contours;
}
},{"../../graphics/matrix":18,"../../graphics/pathTransform":23}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = oval2contour;
var _computeBoundingBox = require("../../graphics/computeBoundingBox");
var _pathAdjust = _interopRequireDefault(require("../../graphics/pathAdjust"));
var _circle = _interopRequireDefault(require("../../graphics/path/circle"));
var _lang = require("../../common/lang");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 椭圆转换成轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 椭圆转换成轮廓
 *
 * @param {number} cx 椭圆中心点x
 * @param {number} cy 椭圆中心点y
 * @param {number} rx 椭圆x轴半径
 * @param {number} ry 椭圆y周半径
 * @return {Array} 轮廓数组
 */
function oval2contour(cx, cy, rx, ry) {
  if (undefined === ry) {
    ry = rx;
  }
  var bound = (0, _computeBoundingBox.computePath)(_circle["default"]);
  var scaleX = +rx * 2 / bound.width;
  var scaleY = +ry * 2 / bound.height;
  var centerX = bound.width * scaleX / 2;
  var centerY = bound.height * scaleY / 2;
  var contour = (0, _lang.clone)(_circle["default"]);
  (0, _pathAdjust["default"])(contour, scaleX, scaleY);
  (0, _pathAdjust["default"])(contour, 1, 1, +cx - centerX, +cy - centerY);
  return contour;
}
},{"../../common/lang":14,"../../graphics/computeBoundingBox":16,"../../graphics/path/circle":24,"../../graphics/pathAdjust":19}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;
/**
 * @file 解析参数数组
 * @author mengke01(kekee000@gmail.com)
 */

var SEGMENT_REGEX = /-?\d+(?:\.\d+)?(?:e[-+]?\d+)?\b/g;

/**
 * 获取参数值
 *
 * @param  {string} d 参数
 * @return {number}   参数值
 */
function getSegment(d) {
  return +d.trim();
}

/**
 * 解析参数数组
 *
 * @param  {string} str 参数字符串
 * @return {Array}   参数数组
 */
function _default(str) {
  if (!str) {
    return [];
  }
  var matchs = str.match(SEGMENT_REGEX);
  return matchs ? matchs.map(getSegment) : [];
}
},{}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = parseTransform;
var _parseParams = _interopRequireDefault(require("./parseParams"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 解析transform参数
 * @author mengke01(kekee000@gmail.com)
 */

var TRANSFORM_REGEX = /(\w+)\s*\(([\d-.,\s]*)\)/g;

/**
 * 解析transform参数
 *
 * @param {string} str 参数字符串
 * @return {Array} transform数组, 格式如下：
 *     [
 *         {
 *             name: 'scale',
 *             params: []
 *         }
 *     ]
 */
function parseTransform(str) {
  if (!str) {
    return false;
  }
  TRANSFORM_REGEX.lastIndex = 0;
  var transforms = [];
  var match;
  while (match = TRANSFORM_REGEX.exec(str)) {
    transforms.push({
      name: match[1],
      params: (0, _parseParams["default"])(match[2])
    });
  }
  return transforms;
}
},{"./parseParams":52}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = path2contours;
var _bezierCubic2Q = _interopRequireDefault(require("../../math/bezierCubic2Q2"));
var _getArc = _interopRequireDefault(require("../../graphics/getArc"));
var _parseParams = _interopRequireDefault(require("./parseParams"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file svg path转换为轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 三次贝塞尔曲线，转二次贝塞尔曲线
 *
 * @param {Array} cubicList 三次曲线数组
 * @param {Array} contour 当前解析后的轮廓数组
 * @return {Array} 当前解析后的轮廓数组
 */
function cubic2Points(cubicList, contour) {
  var i;
  var l;
  var q2List = [];
  cubicList.forEach(function (c) {
    var list = (0, _bezierCubic2Q["default"])(c[0], c[1], c[2], c[3]);
    for (i = 0, l = list.length; i < l; i++) {
      q2List.push(list[i]);
    }
  });
  var q2;
  var prevq2;
  for (i = 0, l = q2List.length; i < l; i++) {
    q2 = q2List[i];
    if (i === 0) {
      contour.push({
        x: q2[1].x,
        y: q2[1].y
      });
      contour.push({
        x: q2[2].x,
        y: q2[2].y,
        onCurve: true
      });
    } else {
      prevq2 = q2List[i - 1];
      // 检查是否存在切线点
      if (prevq2[1].x + q2[1].x === 2 * q2[0].x && prevq2[1].y + q2[1].y === 2 * q2[0].y) {
        contour.pop();
      }
      contour.push({
        x: q2[1].x,
        y: q2[1].y
      });
      contour.push({
        x: q2[2].x,
        y: q2[2].y,
        onCurve: true
      });
    }
  }
  contour.push({
    x: q2[2].x,
    y: q2[2].y,
    onCurve: true
  });
  return contour;
}

/**
 * svg 命令数组转轮廓
 *
 * @param {Array} segments svg 命令数组
 * @return {Array} 轮廓数组
 */
function segments2Contours(segments) {
  // 解析segments
  var contours = [];
  var contour = [];
  var prevX = 0;
  var prevY = 0;
  var segment;
  var args;
  var cmd;
  var relative;
  var q;
  var ql;
  var px;
  var py;
  var cubicList;
  var p1;
  var p2;
  var c1;
  var c2;
  var prevCubicC1; // 三次贝塞尔曲线前一个控制点，用于绘制`s`命令

  for (var i = 0, l = segments.length; i < l; i++) {
    segment = segments[i];
    cmd = segment.cmd;
    relative = segment.relative;
    args = segment.args;
    if (args && !args.length && cmd !== 'Z') {
      console.warn('`' + cmd + '` command args empty!');
      continue;
    }
    if (cmd === 'Z') {
      contours.push(contour);
      contour = [];
    } else if (cmd === 'M' || cmd === 'L') {
      if (args.length % 2) {
        throw new Error('`M` command error:' + args.join(','));
      }

      // 这里可能会连续绘制，最后一个是终点
      if (relative) {
        px = prevX;
        py = prevY;
      } else {
        px = 0;
        py = 0;
      }
      for (q = 0, ql = args.length; q < ql; q += 2) {
        if (relative) {
          px += args[q];
          py += args[q + 1];
        } else {
          px = args[q];
          py = args[q + 1];
        }
        contour.push({
          x: px,
          y: py,
          onCurve: true
        });
      }
      prevX = px;
      prevY = py;
    } else if (cmd === 'H') {
      if (relative) {
        prevX += args[0];
      } else {
        prevX = args[0];
      }
      contour.push({
        x: prevX,
        y: prevY,
        onCurve: true
      });
    } else if (cmd === 'V') {
      if (relative) {
        prevY += args[0];
      } else {
        prevY = args[0];
      }
      contour.push({
        x: prevX,
        y: prevY,
        onCurve: true
      });
    }
    // 二次贝塞尔
    else if (cmd === 'Q') {
      // 这里可能会连续绘制，最后一个是终点
      if (relative) {
        px = prevX;
        py = prevY;
      } else {
        px = 0;
        py = 0;
      }
      for (q = 0, ql = args.length; q < ql; q += 4) {
        contour.push({
          x: px + args[q],
          y: py + args[q + 1]
        });
        contour.push({
          x: px + args[q + 2],
          y: py + args[q + 3],
          onCurve: true
        });
        if (relative) {
          px += args[q + 2];
          py += args[q + 3];
        } else {
          px = 0;
          py = 0;
        }
      }
      if (relative) {
        prevX = px;
        prevY = py;
      } else {
        prevX = args[ql - 2];
        prevY = args[ql - 1];
      }
    }
    // 二次贝塞尔平滑
    else if (cmd === 'T') {
      // 这里需要移除上一个曲线的终点
      var last = contour.pop();
      var pc = contour[contour.length - 1];
      if (!pc) {
        pc = last;
      }
      contour.push(pc = {
        x: 2 * last.x - pc.x,
        y: 2 * last.y - pc.y
      });
      px = prevX;
      py = prevY;
      for (q = 0, ql = args.length - 2; q < ql; q += 2) {
        if (relative) {
          px += args[q];
          py += args[q + 1];
        } else {
          px = args[q];
          py = args[q + 1];
        }
        last = {
          x: px,
          y: py
        };
        contour.push(pc = {
          x: 2 * last.x - pc.x,
          y: 2 * last.y - pc.y
        });
      }
      if (relative) {
        prevX = px + args[ql];
        prevY = py + args[ql + 1];
      } else {
        prevX = args[ql];
        prevY = args[ql + 1];
      }
      contour.push({
        x: prevX,
        y: prevY,
        onCurve: true
      });
    }
    // 三次贝塞尔
    else if (cmd === 'C') {
      if (args.length % 6) {
        throw new Error('`C` command params error:' + args.join(','));
      }

      // 这里可能会连续绘制，最后一个是终点
      cubicList = [];
      if (relative) {
        px = prevX;
        py = prevY;
      } else {
        px = 0;
        py = 0;
      }
      p1 = {
        x: prevX,
        y: prevY
      };
      for (q = 0, ql = args.length; q < ql; q += 6) {
        c1 = {
          x: px + args[q],
          y: py + args[q + 1]
        };
        c2 = {
          x: px + args[q + 2],
          y: py + args[q + 3]
        };
        p2 = {
          x: px + args[q + 4],
          y: py + args[q + 5]
        };
        cubicList.push([p1, c1, c2, p2]);
        p1 = p2;
        if (relative) {
          px += args[q + 4];
          py += args[q + 5];
        } else {
          px = 0;
          py = 0;
        }
      }
      if (relative) {
        prevX = px;
        prevY = py;
      } else {
        prevX = args[ql - 2];
        prevY = args[ql - 1];
      }
      cubic2Points(cubicList, contour);
      prevCubicC1 = cubicList[cubicList.length - 1][2];
    }
    // 三次贝塞尔平滑
    else if (cmd === 'S') {
      if (args.length % 4) {
        throw new Error('`S` command params error:' + args.join(','));
      }

      // 这里可能会连续绘制，最后一个是终点
      cubicList = [];
      if (relative) {
        px = prevX;
        py = prevY;
      } else {
        px = 0;
        py = 0;
      }

      // 这里需要移除上一个曲线的终点
      p1 = contour.pop();
      if (!prevCubicC1) {
        prevCubicC1 = p1;
      }
      c1 = {
        x: 2 * p1.x - prevCubicC1.x,
        y: 2 * p1.y - prevCubicC1.y
      };
      for (q = 0, ql = args.length; q < ql; q += 4) {
        c2 = {
          x: px + args[q],
          y: py + args[q + 1]
        };
        p2 = {
          x: px + args[q + 2],
          y: py + args[q + 3]
        };
        cubicList.push([p1, c1, c2, p2]);
        p1 = p2;
        c1 = {
          x: 2 * p1.x - c2.x,
          y: 2 * p1.y - c2.y
        };
        if (relative) {
          px += args[q + 2];
          py += args[q + 3];
        } else {
          px = 0;
          py = 0;
        }
      }
      if (relative) {
        prevX = px;
        prevY = py;
      } else {
        prevX = args[ql - 2];
        prevY = args[ql - 1];
      }
      cubic2Points(cubicList, contour);
      prevCubicC1 = cubicList[cubicList.length - 1][2];
    }
    // 求弧度, rx, ry, angle, largeArc, sweep, ex, ey
    else if (cmd === 'A') {
      if (args.length % 7) {
        throw new Error('arc command params error:' + args.join(','));
      }
      for (q = 0, ql = args.length; q < ql; q += 7) {
        var ex = args[q + 5];
        var ey = args[q + 6];
        if (relative) {
          ex = prevX + ex;
          ey = prevY + ey;
        }
        var path = (0, _getArc["default"])(args[q], args[q + 1], args[q + 2], args[q + 3], args[q + 4], {
          x: prevX,
          y: prevY
        }, {
          x: ex,
          y: ey
        });
        if (path && path.length > 1) {
          for (var r = 1, rl = path.length; r < rl; r++) {
            contour.push(path[r]);
          }
        }
        prevX = ex;
        prevY = ey;
      }
    }
  }
  return contours;
}

/**
 * svg path转轮廓
 *
 * @param {string} path svg的path字符串
 * @return {Array} 转换后的轮廓
 */
function path2contours(path) {
  if (!path || !path.length) {
    return null;
  }
  path = path.trim();

  // 修正头部不为`m`的情况
  if (path[0] !== 'M' && path[0] !== 'm') {
    path = 'M 0 0' + path;
  }

  // 修复中间没有结束符`z`的情况
  path = path.replace(/(\d+)\s*(m|$)/gi, '$1z$2');

  // 获取segments
  var segments = [];
  var cmd;
  var relative = false;
  var lastIndex;
  var args;
  for (var i = 0, l = path.length; i < l; i++) {
    var c = path[i].toUpperCase();
    var r = c !== path[i];
    switch (c) {
      case 'M':
        /* jshint -W086 */
        if (i === 0) {
          cmd = c;
          lastIndex = 1;
          break;
        }
      // eslint-disable-next-line no-fallthrough
      case 'Q':
      case 'T':
      case 'C':
      case 'S':
      case 'H':
      case 'V':
      case 'L':
      case 'A':
      case 'Z':
        if (cmd === 'Z') {
          segments.push({
            cmd: 'Z'
          });
        } else {
          args = path.slice(lastIndex, i);
          segments.push({
            cmd: cmd,
            relative: relative,
            args: (0, _parseParams["default"])(args)
          });
        }
        cmd = c;
        relative = r;
        lastIndex = i + 1;
        break;
    }
  }
  segments.push({
    cmd: 'Z'
  });
  return segments2Contours(segments);
}
},{"../../graphics/getArc":17,"../../math/bezierCubic2Q2":28,"./parseParams":52}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = polygon2contour;
var _parseParams = _interopRequireDefault(require("./parseParams"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 多边形转换成轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 多边形转换成轮廓
 *
 * @param {Array} points 多边形点集合
 * @return {Array} contours
 */
function polygon2contour(points) {
  if (!points || !points.length) {
    return null;
  }
  var contours = [];
  var segments = (0, _parseParams["default"])(points);
  for (var i = 0, l = segments.length; i < l; i += 2) {
    contours.push({
      x: segments[i],
      y: segments[i + 1],
      onCurve: true
    });
  }
  return contours;
}
},{"./parseParams":52}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = rect2contour;
/**
 * @file 矩形转换成轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 矩形转换成轮廓
 *
 * @param {number} x 左上角x
 * @param {number} y 左上角y
 * @param {number} width 宽度
 * @param {number} height 高度
 * @return {Array} 轮廓数组
 */
function rect2contour(x, y, width, height) {
  x = +x;
  y = +y;
  width = +width;
  height = +height;
  return [{
    x: x,
    y: y,
    onCurve: true
  }, {
    x: x + width,
    y: y,
    onCurve: true
  }, {
    x: x + width,
    y: y + height,
    onCurve: true
  }, {
    x: x,
    y: y + height,
    onCurve: true
  }];
}
},{}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = svgnode2contours;
var _path2contours = _interopRequireDefault(require("./path2contours"));
var _oval2contour = _interopRequireDefault(require("./oval2contour"));
var _polygon2contour = _interopRequireDefault(require("./polygon2contour"));
var _rect2contour = _interopRequireDefault(require("./rect2contour"));
var _parseTransform = _interopRequireDefault(require("./parseTransform"));
var _contoursTransform = _interopRequireDefault(require("./contoursTransform"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file svg节点转字形轮廓
 * @author mengke01(kekee000@gmail.com)
 */

// 支持的解析器集合
var support = {
  path: {
    parse: _path2contours["default"],
    // 解析器
    params: ['d'],
    // 参数列表
    contours: true // 是否是多个轮廓
  },

  circle: {
    parse: _oval2contour["default"],
    params: ['cx', 'cy', 'r']
  },
  ellipse: {
    parse: _oval2contour["default"],
    params: ['cx', 'cy', 'rx', 'ry']
  },
  rect: {
    parse: _rect2contour["default"],
    params: ['x', 'y', 'width', 'height']
  },
  polygon: {
    parse: _polygon2contour["default"],
    params: ['points']
  },
  polyline: {
    parse: _polygon2contour["default"],
    params: ['points']
  }
};

/**
 * svg节点转字形轮廓
 *
 * @param {Array} xmlNodes xml节点集合
 * @return {Array|false} 轮廓数组
 */
function svgnode2contours(xmlNodes) {
  var i;
  var length;
  var j;
  var jlength;
  var segment; // 当前指令
  var parsedSegments = []; // 解析后的指令

  if (xmlNodes.length) {
    var _loop = function _loop() {
      var node = xmlNodes[i];
      var name = node.tagName;
      if (support[name]) {
        var supportParams = support[name].params;
        var params = [];
        for (j = 0, jlength = supportParams.length; j < jlength; j++) {
          params.push(node.getAttribute(supportParams[j]));
        }
        segment = {
          name: name,
          params: params,
          transform: (0, _parseTransform["default"])(node.getAttribute('transform'))
        };
        if (node.parentNode) {
          var curNode = node.parentNode;
          var transforms = segment.transform || [];
          var transAttr;
          var iterator = function iterator(t) {
            transforms.unshift(t);
          };
          while (curNode !== null && curNode.tagName !== 'svg') {
            transAttr = curNode.getAttribute('transform');
            if (transAttr) {
              (0, _parseTransform["default"])(transAttr).reverse().forEach(iterator);
            }
            curNode = curNode.parentNode;
          }
          segment.transform = transforms.length ? transforms : null;
        }
        parsedSegments.push(segment);
      }
    };
    for (i = 0, length = xmlNodes.length; i < length; i++) {
      _loop();
    }
  }
  if (parsedSegments.length) {
    var result = [];
    for (i = 0, length = parsedSegments.length; i < length; i++) {
      segment = parsedSegments[i];
      var parser = support[segment.name];
      var contour = parser.parse.apply(null, segment.params);
      if (contour && contour.length) {
        var contours = parser.contours ? contour : [contour];

        // 如果有变换则应用变换规则
        if (segment.transform) {
          contours = (0, _contoursTransform["default"])(contours, segment.transform);
        }
        for (j = 0, jlength = contours.length; j < jlength; j++) {
          result.push(contours[j]);
        }
      }
    }
    return result;
  }
  return false;
}
},{"./contoursTransform":50,"./oval2contour":51,"./parseTransform":53,"./path2contours":54,"./polygon2contour":55,"./rect2contour":56}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _string = _interopRequireDefault(require("../util/string"));
var _encoding = _interopRequireDefault(require("./cff/encoding"));
var _cffStandardStrings = _interopRequireDefault(require("./cff/cffStandardStrings"));
var _parseCFFDict = _interopRequireDefault(require("./cff/parseCFFDict"));
var _parseCFFGlyph = _interopRequireDefault(require("./cff/parseCFFGlyph"));
var _parseCFFCharset = _interopRequireDefault(require("./cff/parseCFFCharset"));
var _parseCFFEncoding = _interopRequireDefault(require("./cff/parseCFFEncoding"));
var _reader = _interopRequireDefault(require("../reader"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file cff表
 * @author mengke01(kekee000@gmail.com)
 *
 * reference:
 * http://wwwimages.adobe.com/content/dam/Adobe/en/devnet/font/pdfs/5176.CFF.pdf
 *
 * modify from:
 * https://github.com/nodebox/opentype.js/blob/master/src/tables/cff.js
 */

/**
 * 获取cff偏移
 *
 * @param  {Reader} reader  读取器
 * @param  {number} offSize 偏移大小
 * @param  {number} offset  起始偏移
 * @return {number}         偏移
 */
function getOffset(reader, offSize) {
  var v = 0;
  for (var i = 0; i < offSize; i++) {
    v <<= 8;
    v += reader.readUint8();
  }
  return v;
}

/**
 * 解析cff表头部
 *
 * @param  {Reader} reader 读取器
 * @return {Object}        头部字段
 */
function parseCFFHead(reader) {
  var head = {};
  head.startOffset = reader.offset;
  head.endOffset = head.startOffset + 4;
  head.formatMajor = reader.readUint8();
  head.formatMinor = reader.readUint8();
  head.size = reader.readUint8();
  head.offsetSize = reader.readUint8();
  return head;
}

/**
 * 解析`CFF`表索引
 *
 * @param  {Reader} reader       读取器
 * @param  {number} offset       偏移
 * @param  {Funciton} conversionFn 转换函数
 * @return {Object}              表对象
 */
function parseCFFIndex(reader, offset, conversionFn) {
  if (offset) {
    reader.seek(offset);
  }
  var start = reader.offset;
  var offsets = [];
  var objects = [];
  var count = reader.readUint16();
  var i;
  var l;
  if (count !== 0) {
    var offsetSize = reader.readUint8();
    for (i = 0, l = count + 1; i < l; i++) {
      offsets.push(getOffset(reader, offsetSize));
    }
    for (i = 0, l = count; i < l; i++) {
      var value = reader.readBytes(offsets[i + 1] - offsets[i]);
      if (conversionFn) {
        value = conversionFn(value);
      }
      objects.push(value);
    }
  }
  return {
    objects: objects,
    startOffset: start,
    endOffset: reader.offset
  };
}

// Subroutines are encoded using the negative half of the number space.
// See type 2 chapter 4.7 "Subroutine operators".
function calcCFFSubroutineBias(subrs) {
  var bias;
  if (subrs.length < 1240) {
    bias = 107;
  } else if (subrs.length < 33900) {
    bias = 1131;
  } else {
    bias = 32768;
  }
  return bias;
}
var _default = _table["default"].create('cff', [], {
  read: function read(reader, font) {
    var offset = this.offset;
    reader.seek(offset);
    var head = parseCFFHead(reader);
    var nameIndex = parseCFFIndex(reader, head.endOffset, _string["default"].getString);
    var topDictIndex = parseCFFIndex(reader, nameIndex.endOffset);
    var stringIndex = parseCFFIndex(reader, topDictIndex.endOffset, _string["default"].getString);
    var globalSubrIndex = parseCFFIndex(reader, stringIndex.endOffset);
    var cff = {
      head: head
    };

    // 全局子glyf数据
    cff.gsubrs = globalSubrIndex.objects;
    cff.gsubrsBias = calcCFFSubroutineBias(globalSubrIndex.objects);

    // 顶级字典数据
    var dictReader = new _reader["default"](new Uint8Array(topDictIndex.objects[0]).buffer);
    var topDict = _parseCFFDict["default"].parseTopDict(dictReader, 0, dictReader.length, stringIndex.objects);
    cff.topDict = topDict;

    // 私有字典数据
    var privateDictLength = topDict["private"][0];
    var privateDict = {};
    var privateDictOffset;
    if (privateDictLength) {
      privateDictOffset = offset + topDict["private"][1];
      privateDict = _parseCFFDict["default"].parsePrivateDict(reader, privateDictOffset, privateDictLength, stringIndex.objects);
      cff.defaultWidthX = privateDict.defaultWidthX;
      cff.nominalWidthX = privateDict.nominalWidthX;
    } else {
      cff.defaultWidthX = 0;
      cff.nominalWidthX = 0;
    }

    // 私有子glyf数据
    if (privateDict.subrs) {
      var subrOffset = privateDictOffset + privateDict.subrs;
      var subrIndex = parseCFFIndex(reader, subrOffset);
      cff.subrs = subrIndex.objects;
      cff.subrsBias = calcCFFSubroutineBias(cff.subrs);
    } else {
      cff.subrs = [];
      cff.subrsBias = 0;
    }
    cff.privateDict = privateDict;

    // 解析glyf数据和名字
    var charStringsIndex = parseCFFIndex(reader, offset + topDict.charStrings);
    var nGlyphs = charStringsIndex.objects.length;
    if (topDict.charset < 3) {
      // @author: fr33z00
      // See end of chapter 13 (p22) of #5176.CFF.pdf :
      // Still more optimization is possible by
      // observing that many fonts adopt one of 3 common charsets. In
      // these cases the operand to the charset operator in the Top DICT
      // specifies a predefined charset id, in place of an offset, as shown in table 22
      cff.charset = _cffStandardStrings["default"];
    } else {
      cff.charset = (0, _parseCFFCharset["default"])(reader, offset + topDict.charset, nGlyphs, stringIndex.objects);
    }

    // Standard encoding
    if (topDict.encoding === 0) {
      cff.encoding = _encoding["default"].standardEncoding;
    }
    // Expert encoding
    else if (topDict.encoding === 1) {
      cff.encoding = _encoding["default"].expertEncoding;
    } else {
      cff.encoding = (0, _parseCFFEncoding["default"])(reader, offset + topDict.encoding);
    }
    cff.glyf = [];

    // only parse subset glyphs
    var subset = font.readOptions.subset;
    if (subset && subset.length > 0) {
      // subset map
      var subsetMap = {
        0: true // 设置.notdef
      };

      var codes = font.cmap;

      // unicode to index
      Object.keys(codes).forEach(function (c) {
        if (subset.indexOf(+c) > -1) {
          var i = codes[c];
          subsetMap[i] = true;
        }
      });
      font.subsetMap = subsetMap;
      Object.keys(subsetMap).forEach(function (i) {
        i = +i;
        var glyf = (0, _parseCFFGlyph["default"])(charStringsIndex.objects[i], cff, i);
        glyf.name = cff.charset[i];
        cff.glyf[i] = glyf;
      });
    }
    // parse all
    else {
      for (var i = 0, l = nGlyphs; i < l; i++) {
        var glyf = (0, _parseCFFGlyph["default"])(charStringsIndex.objects[i], cff, i);
        glyf.name = cff.charset[i];
        cff.glyf.push(glyf);
      }
    }
    return cff;
  },
  // eslint-disable-next-line no-unused-vars
  write: function write(writer, font) {
    throw new Error('not support write cff table');
  },
  // eslint-disable-next-line no-unused-vars
  size: function size(font) {
    throw new Error('not support get cff table size');
  }
});
exports["default"] = _default;
},{"../reader":47,"../util/string":114,"./cff/cffStandardStrings":61,"./cff/encoding":62,"./cff/parseCFFCharset":64,"./cff/parseCFFDict":65,"./cff/parseCFFEncoding":66,"./cff/parseCFFGlyph":67,"./table":92}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file GPOS
 * @author fr33z00(https://github.com/fr33z00)
 *
 * @reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cvt.html
 */
var _default = _table["default"].create('GPOS', [], {
  read: function read(reader, ttf) {
    var length = ttf.tables.GPOS.length;
    return reader.readBytes(this.offset, length);
  },
  write: function write(writer, ttf) {
    if (ttf.GPOS) {
      writer.writeBytes(ttf.GPOS, ttf.GPOS.length);
    }
  },
  size: function size(ttf) {
    return ttf.GPOS ? ttf.GPOS.length : 0;
  }
});
exports["default"] = _default;
},{"./table":92}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _struct = _interopRequireDefault(require("./struct"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file OS/2表
 * @author mengke01(kekee000@gmail.com)
 *
 * http://www.microsoft.com/typography/otspec/os2.htm
 */
var _default = _table["default"].create('OS/2', [['version', _struct["default"].Uint16], ['xAvgCharWidth', _struct["default"].Int16], ['usWeightClass', _struct["default"].Uint16], ['usWidthClass', _struct["default"].Uint16], ['fsType', _struct["default"].Uint16], ['ySubscriptXSize', _struct["default"].Uint16], ['ySubscriptYSize', _struct["default"].Uint16], ['ySubscriptXOffset', _struct["default"].Uint16], ['ySubscriptYOffset', _struct["default"].Uint16], ['ySuperscriptXSize', _struct["default"].Uint16], ['ySuperscriptYSize', _struct["default"].Uint16], ['ySuperscriptXOffset', _struct["default"].Uint16], ['ySuperscriptYOffset', _struct["default"].Uint16], ['yStrikeoutSize', _struct["default"].Uint16], ['yStrikeoutPosition', _struct["default"].Uint16], ['sFamilyClass', _struct["default"].Uint16],
// Panose
['bFamilyType', _struct["default"].Uint8], ['bSerifStyle', _struct["default"].Uint8], ['bWeight', _struct["default"].Uint8], ['bProportion', _struct["default"].Uint8], ['bContrast', _struct["default"].Uint8], ['bStrokeVariation', _struct["default"].Uint8], ['bArmStyle', _struct["default"].Uint8], ['bLetterform', _struct["default"].Uint8], ['bMidline', _struct["default"].Uint8], ['bXHeight', _struct["default"].Uint8],
// unicode range
['ulUnicodeRange1', _struct["default"].Uint32], ['ulUnicodeRange2', _struct["default"].Uint32], ['ulUnicodeRange3', _struct["default"].Uint32], ['ulUnicodeRange4', _struct["default"].Uint32],
// char 4
['achVendID', _struct["default"].String, 4], ['fsSelection', _struct["default"].Uint16], ['usFirstCharIndex', _struct["default"].Uint16], ['usLastCharIndex', _struct["default"].Uint16], ['sTypoAscender', _struct["default"].Int16], ['sTypoDescender', _struct["default"].Int16], ['sTypoLineGap', _struct["default"].Int16], ['usWinAscent', _struct["default"].Uint16], ['usWinDescent', _struct["default"].Uint16],
// version 0 above 39

['ulCodePageRange1', _struct["default"].Uint32], ['ulCodePageRange2', _struct["default"].Uint32],
// version 1 above 41

['sxHeight', _struct["default"].Int16], ['sCapHeight', _struct["default"].Int16], ['usDefaultChar', _struct["default"].Uint16], ['usBreakChar', _struct["default"].Uint16], ['usMaxContext', _struct["default"].Uint16]
// version 2,3,4 above 46
], {
  read: function read(reader, ttf) {
    var format = reader.readUint16(this.offset);
    var struct = this.struct;

    // format2
    if (format === 0) {
      struct = struct.slice(0, 39);
    } else if (format === 1) {
      struct = struct.slice(0, 41);
    }
    var OS2Head = _table["default"].create('os2head', struct);
    var tbl = new OS2Head(this.offset).read(reader, ttf);

    // 补齐其他version的字段
    var os2Fields = {
      ulCodePageRange1: 1,
      ulCodePageRange2: 0,
      sxHeight: 0,
      sCapHeight: 0,
      usDefaultChar: 0,
      usBreakChar: 32,
      usMaxContext: 0
    };
    return Object.assign(os2Fields, tbl);
  },
  size: function size(ttf) {
    // 更新其他表的统计信息
    // header
    var xMin = 16384;
    var yMin = 16384;
    var xMax = -16384;
    var yMax = -16384;

    // hhea
    var advanceWidthMax = -1;
    var minLeftSideBearing = 16384;
    var minRightSideBearing = 16384;
    var xMaxExtent = -16384;

    // os2 count
    var xAvgCharWidth = 0;
    var usFirstCharIndex = 0x10FFFF;
    var usLastCharIndex = -1;

    // maxp
    var maxPoints = 0;
    var maxContours = 0;
    var maxCompositePoints = 0;
    var maxCompositeContours = 0;
    var maxSizeOfInstructions = 0;
    var maxComponentElements = 0;
    var glyfNotEmpty = 0; // 非空glyf
    var hinting = ttf.writeOptions ? ttf.writeOptions.hinting : false;

    // 计算instructions和functiondefs
    if (hinting) {
      if (ttf.cvt) {
        maxSizeOfInstructions = Math.max(maxSizeOfInstructions, ttf.cvt.length);
      }
      if (ttf.prep) {
        maxSizeOfInstructions = Math.max(maxSizeOfInstructions, ttf.prep.length);
      }
      if (ttf.fpgm) {
        maxSizeOfInstructions = Math.max(maxSizeOfInstructions, ttf.fpgm.length);
      }
    }
    ttf.glyf.forEach(function (glyf) {
      // 统计control point信息
      if (glyf.compound) {
        var compositeContours = 0;
        var compositePoints = 0;
        glyf.glyfs.forEach(function (g) {
          var cglyf = ttf.glyf[g.glyphIndex];
          if (!cglyf) {
            return;
          }
          compositeContours += cglyf.contours ? cglyf.contours.length : 0;
          if (cglyf.contours && cglyf.contours.length) {
            cglyf.contours.forEach(function (contour) {
              compositePoints += contour.length;
            });
          }
        });
        maxComponentElements++;
        maxCompositePoints = Math.max(maxCompositePoints, compositePoints);
        maxCompositeContours = Math.max(maxCompositeContours, compositeContours);
      }
      // 简单图元
      else if (glyf.contours && glyf.contours.length) {
        maxContours = Math.max(maxContours, glyf.contours.length);
        var points = 0;
        glyf.contours.forEach(function (contour) {
          points += contour.length;
        });
        maxPoints = Math.max(maxPoints, points);
      }
      if (hinting && glyf.instructions) {
        maxSizeOfInstructions = Math.max(maxSizeOfInstructions, glyf.instructions.length);
      }

      // 统计边界信息
      if (glyf.xMin < xMin) {
        xMin = glyf.xMin;
      }
      if (glyf.yMin < yMin) {
        yMin = glyf.yMin;
      }
      if (glyf.xMax > xMax) {
        xMax = glyf.xMax;
      }
      if (glyf.yMax > yMax) {
        yMax = glyf.yMax;
      }
      advanceWidthMax = Math.max(advanceWidthMax, glyf.advanceWidth);
      minLeftSideBearing = Math.min(minLeftSideBearing, glyf.leftSideBearing);
      minRightSideBearing = Math.min(minRightSideBearing, glyf.advanceWidth - glyf.xMax);
      xMaxExtent = Math.max(xMaxExtent, glyf.xMax);
      xAvgCharWidth += glyf.advanceWidth;
      glyfNotEmpty++;
      var unicodes = glyf.unicode;
      if (typeof glyf.unicode === 'number') {
        unicodes = [glyf.unicode];
      }
      if (Array.isArray(unicodes)) {
        unicodes.forEach(function (unicode) {
          if (unicode !== 0xFFFF) {
            usFirstCharIndex = Math.min(usFirstCharIndex, unicode);
            usLastCharIndex = Math.max(usLastCharIndex, unicode);
          }
        });
      }
    });

    // 重新设置version 4
    ttf['OS/2'].version = 0x4;
    ttf['OS/2'].achVendID = (ttf['OS/2'].achVendID + '    ').slice(0, 4);
    ttf['OS/2'].xAvgCharWidth = xAvgCharWidth / (glyfNotEmpty || 1);
    ttf['OS/2'].ulUnicodeRange2 = 268435456;
    ttf['OS/2'].usFirstCharIndex = usFirstCharIndex;
    ttf['OS/2'].usLastCharIndex = usLastCharIndex;

    // rewrite hhea
    ttf.hhea.version = ttf.hhea.version || 0x1;
    ttf.hhea.advanceWidthMax = advanceWidthMax;
    ttf.hhea.minLeftSideBearing = minLeftSideBearing;
    ttf.hhea.minRightSideBearing = minRightSideBearing;
    ttf.hhea.xMaxExtent = xMaxExtent;

    // rewrite head
    ttf.head.version = ttf.head.version || 0x1;
    ttf.head.lowestRecPPEM = ttf.head.lowestRecPPEM || 0x8;
    ttf.head.xMin = xMin;
    ttf.head.yMin = yMin;
    ttf.head.xMax = xMax;
    ttf.head.yMax = yMax;

    // head rewrite
    if (ttf.support.head) {
      var _ttf$support$head = ttf.support.head,
        _xMin = _ttf$support$head.xMin,
        _yMin = _ttf$support$head.yMin,
        _xMax = _ttf$support$head.xMax,
        _yMax = _ttf$support$head.yMax;
      if (_xMin != null) {
        ttf.head.xMin = _xMin;
      }
      if (_yMin != null) {
        ttf.head.yMin = _yMin;
      }
      if (_xMax != null) {
        ttf.head.xMax = _xMax;
      }
      if (_yMax != null) {
        ttf.head.yMax = _yMax;
      }
    }
    // hhea rewrite
    if (ttf.support.hhea) {
      var _ttf$support$hhea = ttf.support.hhea,
        _advanceWidthMax = _ttf$support$hhea.advanceWidthMax,
        _xMaxExtent = _ttf$support$hhea.xMaxExtent,
        _minLeftSideBearing = _ttf$support$hhea.minLeftSideBearing,
        _minRightSideBearing = _ttf$support$hhea.minRightSideBearing;
      if (_advanceWidthMax != null) {
        ttf.hhea.advanceWidthMax = _advanceWidthMax;
      }
      if (_xMaxExtent != null) {
        ttf.hhea.xMaxExtent = _xMaxExtent;
      }
      if (_minLeftSideBearing != null) {
        ttf.hhea.minLeftSideBearing = _minLeftSideBearing;
      }
      if (_minRightSideBearing != null) {
        ttf.hhea.minRightSideBearing = _minRightSideBearing;
      }
    }
    // 这里根据存储的maxp来设置新的maxp，避免重复计算maxp
    ttf.maxp = ttf.maxp || {};
    ttf.support.maxp = {
      version: 1.0,
      numGlyphs: ttf.glyf.length,
      maxPoints: maxPoints,
      maxContours: maxContours,
      maxCompositePoints: maxCompositePoints,
      maxCompositeContours: maxCompositeContours,
      maxZones: ttf.maxp.maxZones || 0,
      maxTwilightPoints: ttf.maxp.maxTwilightPoints || 0,
      maxStorage: ttf.maxp.maxStorage || 0,
      maxFunctionDefs: ttf.maxp.maxFunctionDefs || 0,
      maxStackElements: ttf.maxp.maxStackElements || 0,
      maxSizeOfInstructions: maxSizeOfInstructions,
      maxComponentElements: maxComponentElements,
      maxComponentDepth: maxComponentElements ? 1 : 0
    };
    return _table["default"].size.call(this, ttf);
  }
});
exports["default"] = _default;
},{"./struct":89,"./table":92}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file cffStandardStrings.js
 * @author mengke01(kekee000@gmail.com)
 */
var cffStandardStrings = ['.notdef', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright', 'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater', 'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore', 'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', 'exclamdown', 'cent', 'sterling', 'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle', 'quotedblleft', 'guillemotleft', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'endash', 'dagger', 'daggerdbl', 'periodcentered', 'paragraph', 'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright', 'guillemotright', 'ellipsis', 'perthousand', 'questiondown', 'grave', 'acute', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'dieresis', 'ring', 'cedilla', 'hungarumlaut', 'ogonek', 'caron', 'emdash', 'AE', 'ordfeminine', 'Lslash', 'Oslash', 'OE', 'ordmasculine', 'ae', 'dotlessi', 'lslash', 'oslash', 'oe', 'germandbls', 'onesuperior', 'logicalnot', 'mu', 'trademark', 'Eth', 'onehalf', 'plusminus', 'Thorn', 'onequarter', 'divide', 'brokenbar', 'degree', 'thorn', 'threequarters', 'twosuperior', 'registered', 'minus', 'eth', 'multiply', 'threesuperior', 'copyright', 'Aacute', 'Acircumflex', 'Adieresis', 'Agrave', 'Aring', 'Atilde', 'Ccedilla', 'Eacute', 'Ecircumflex', 'Edieresis', 'Egrave', 'Iacute', 'Icircumflex', 'Idieresis', 'Igrave', 'Ntilde', 'Oacute', 'Ocircumflex', 'Odieresis', 'Ograve', 'Otilde', 'Scaron', 'Uacute', 'Ucircumflex', 'Udieresis', 'Ugrave', 'Yacute', 'Ydieresis', 'Zcaron', 'aacute', 'acircumflex', 'adieresis', 'agrave', 'aring', 'atilde', 'ccedilla', 'eacute', 'ecircumflex', 'edieresis', 'egrave', 'iacute', 'icircumflex', 'idieresis', 'igrave', 'ntilde', 'oacute', 'ocircumflex', 'odieresis', 'ograve', 'otilde', 'scaron', 'uacute', 'ucircumflex', 'udieresis', 'ugrave', 'yacute', 'ydieresis', 'zcaron', 'exclamsmall', 'Hungarumlautsmall', 'dollaroldstyle', 'dollarsuperior', 'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', '266 ff', 'onedotenleader', 'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle', 'fouroldstyle', 'fiveoldstyle', 'sixoldstyle', 'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'commasuperior', 'threequartersemdash', 'periodsuperior', 'questionsmall', 'asuperior', 'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', 'isuperior', 'lsuperior', 'msuperior', 'nsuperior', 'osuperior', 'rsuperior', 'ssuperior', 'tsuperior', 'ff', 'ffi', 'ffl', 'parenleftinferior', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall', 'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall', 'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall', 'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', 'exclamdownsmall', 'centoldstyle', 'Lslashsmall', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall', 'Brevesmall', 'Caronsmall', 'Dotaccentsmall', 'Macronsmall', 'figuredash', 'hypheninferior', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall', 'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds', 'zerosuperior', 'foursuperior', 'fivesuperior', 'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior', 'zeroinferior', 'oneinferior', 'twoinferior', 'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior', 'seveninferior', 'eightinferior', 'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior', 'commainferior', 'Agravesmall', 'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall', 'Aringsmall', 'AEsmall', 'Ccedillasmall', 'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall', 'Igravesmall', 'Iacutesmall', 'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall', 'Oacutesmall', 'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall', 'Uacutesmall', 'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall', '001.000', '001.001', '001.002', '001.003', 'Black', 'Bold', 'Book', 'Light', 'Medium', 'Regular', 'Roman', 'Semibold'];
var _default = cffStandardStrings;
exports["default"] = _default;
},{}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file cff名字设置
 * @author mengke01(kekee000@gmail.com)
 */

var cffStandardEncoding = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright', 'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater', 'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore', 'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'exclamdown', 'cent', 'sterling', 'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle', 'quotedblleft', 'guillemotleft', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', '', 'endash', 'dagger', 'daggerdbl', 'periodcentered', '', 'paragraph', 'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright', 'guillemotright', 'ellipsis', 'perthousand', '', 'questiondown', '', 'grave', 'acute', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'dieresis', '', 'ring', 'cedilla', '', 'hungarumlaut', 'ogonek', 'caron', 'emdash', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'AE', '', 'ordfeminine', '', '', '', '', 'Lslash', 'Oslash', 'OE', 'ordmasculine', '', '', '', '', '', 'ae', '', '', '', 'dotlessi', '', '', 'lslash', 'oslash', 'oe', 'germandbls'];
var cffExpertEncoding = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'space', 'exclamsmall', 'Hungarumlautsmall', '', 'dollaroldstyle', 'dollarsuperior', 'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', 'twodotenleader', 'onedotenleader', 'comma', 'hyphen', 'period', 'fraction', 'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle', 'fouroldstyle', 'fiveoldstyle', 'sixoldstyle', 'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'colon', 'semicolon', 'commasuperior', 'threequartersemdash', 'periodsuperior', 'questionsmall', '', 'asuperior', 'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', '', '', 'isuperior', '', '', 'lsuperior', 'msuperior', 'nsuperior', 'osuperior', '', '', 'rsuperior', 'ssuperior', 'tsuperior', '', 'ff', 'fi', 'fl', 'ffi', 'ffl', 'parenleftinferior', '', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall', 'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall', 'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall', 'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'exclamdownsmall', 'centoldstyle', 'Lslashsmall', '', '', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall', 'Brevesmall', 'Caronsmall', '', 'Dotaccentsmall', '', '', 'Macronsmall', '', '', 'figuredash', 'hypheninferior', '', '', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall', '', '', '', 'onequarter', 'onehalf', 'threequarters', 'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds', '', '', 'zerosuperior', 'onesuperior', 'twosuperior', 'threesuperior', 'foursuperior', 'fivesuperior', 'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior', 'zeroinferior', 'oneinferior', 'twoinferior', 'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior', 'seveninferior', 'eightinferior', 'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior', 'commainferior', 'Agravesmall', 'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall', 'Aringsmall', 'AEsmall', 'Ccedillasmall', 'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall', 'Igravesmall', 'Iacutesmall', 'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall', 'Oacutesmall', 'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall', 'Uacutesmall', 'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall'];
var _default = {
  standardEncoding: cffStandardEncoding,
  expertEncoding: cffExpertEncoding
};
exports["default"] = _default;
},{}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = getCFFString;
var _cffStandardStrings = _interopRequireDefault(require("./cffStandardStrings"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 获取cff字符串
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 根据索引获取cff字符串
 *
 * @param  {Object} strings 标准cff字符串索引
 * @param  {number} index   索引号
 * @return {number}         字符串索引
 */
function getCFFString(strings, index) {
  if (index <= 390) {
    index = _cffStandardStrings["default"][index];
  }
  // Strings below index 392 are standard CFF strings and are not encoded in the font.
  else {
    index = strings[index - 391];
  }
  return index;
}
},{"./cffStandardStrings":61}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = parseCFFCharset;
var _getCFFString = _interopRequireDefault(require("./getCFFString"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 解析cff字符集
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 解析cff字形名称
 * See Adobe TN #5176 chapter 13, "Charsets".
 *
 * @param  {Reader} reader  读取器
 * @param  {number} start   起始偏移
 * @param  {number} nGlyphs 字形个数
 * @param  {Object} strings cff字符串字典
 * @return {Array}         字符集
 */
function parseCFFCharset(reader, start, nGlyphs, strings) {
  if (start) {
    reader.seek(start);
  }
  var i;
  var sid;
  var count;
  // The .notdef glyph is not included, so subtract 1.
  nGlyphs -= 1;
  var charset = ['.notdef'];
  var format = reader.readUint8();
  if (format === 0) {
    for (i = 0; i < nGlyphs; i += 1) {
      sid = reader.readUint16();
      charset.push((0, _getCFFString["default"])(strings, sid));
    }
  } else if (format === 1) {
    while (charset.length <= nGlyphs) {
      sid = reader.readUint16();
      count = reader.readUint8();
      for (i = 0; i <= count; i += 1) {
        charset.push((0, _getCFFString["default"])(strings, sid));
        sid += 1;
      }
    }
  } else if (format === 2) {
    while (charset.length <= nGlyphs) {
      sid = reader.readUint16();
      count = reader.readUint16();
      for (i = 0; i <= count; i += 1) {
        charset.push((0, _getCFFString["default"])(strings, sid));
        sid += 1;
      }
    }
  } else {
    throw new Error('Unknown charset format ' + format);
  }
  return charset;
}
},{"./getCFFString":63}],65:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _getCFFString = _interopRequireDefault(require("./getCFFString"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 解析cffdict数据
 * @author mengke01(kekee000@gmail.com)
 */

var TOP_DICT_META = [{
  name: 'version',
  op: 0,
  type: 'SID'
}, {
  name: 'notice',
  op: 1,
  type: 'SID'
}, {
  name: 'copyright',
  op: 1200,
  type: 'SID'
}, {
  name: 'fullName',
  op: 2,
  type: 'SID'
}, {
  name: 'familyName',
  op: 3,
  type: 'SID'
}, {
  name: 'weight',
  op: 4,
  type: 'SID'
}, {
  name: 'isFixedPitch',
  op: 1201,
  type: 'number',
  value: 0
}, {
  name: 'italicAngle',
  op: 1202,
  type: 'number',
  value: 0
}, {
  name: 'underlinePosition',
  op: 1203,
  type: 'number',
  value: -100
}, {
  name: 'underlineThickness',
  op: 1204,
  type: 'number',
  value: 50
}, {
  name: 'paintType',
  op: 1205,
  type: 'number',
  value: 0
}, {
  name: 'charstringType',
  op: 1206,
  type: 'number',
  value: 2
}, {
  name: 'fontMatrix',
  op: 1207,
  type: ['real', 'real', 'real', 'real', 'real', 'real'],
  value: [0.001, 0, 0, 0.001, 0, 0]
}, {
  name: 'uniqueId',
  op: 13,
  type: 'number'
}, {
  name: 'fontBBox',
  op: 5,
  type: ['number', 'number', 'number', 'number'],
  value: [0, 0, 0, 0]
}, {
  name: 'strokeWidth',
  op: 1208,
  type: 'number',
  value: 0
}, {
  name: 'xuid',
  op: 14,
  type: [],
  value: null
}, {
  name: 'charset',
  op: 15,
  type: 'offset',
  value: 0
}, {
  name: 'encoding',
  op: 16,
  type: 'offset',
  value: 0
}, {
  name: 'charStrings',
  op: 17,
  type: 'offset',
  value: 0
}, {
  name: 'private',
  op: 18,
  type: ['number', 'offset'],
  value: [0, 0]
}];
var PRIVATE_DICT_META = [{
  name: 'subrs',
  op: 19,
  type: 'offset',
  value: 0
}, {
  name: 'defaultWidthX',
  op: 20,
  type: 'number',
  value: 0
}, {
  name: 'nominalWidthX',
  op: 21,
  type: 'number',
  value: 0
}];
function entriesToObject(entries) {
  var hash = {};
  for (var i = 0, l = entries.length; i < l; i++) {
    var key = entries[i][0];
    if (undefined !== hash[key]) {
      console.warn('dict already has key:' + key);
      continue;
    }
    var values = entries[i][1];
    hash[key] = values.length === 1 ? values[0] : values;
  }
  return hash;
}

/* eslint-disable no-constant-condition */
function parseFloatOperand(reader) {
  var s = '';
  var eof = 15;
  var lookup = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', null, '-'];
  while (true) {
    var b = reader.readUint8();
    var n1 = b >> 4;
    var n2 = b & 15;
    if (n1 === eof) {
      break;
    }
    s += lookup[n1];
    if (n2 === eof) {
      break;
    }
    s += lookup[n2];
  }
  return parseFloat(s);
}
/* eslint-enable no-constant-condition */

/**
 * 解析cff字典数据
 *
 * @param  {Reader} reader 读取器
 * @param  {number} b0     操作码
 * @return {number}        数据
 */
function parseOperand(reader, b0) {
  var b1;
  var b2;
  var b3;
  var b4;
  if (b0 === 28) {
    b1 = reader.readUint8();
    b2 = reader.readUint8();
    return b1 << 8 | b2;
  }
  if (b0 === 29) {
    b1 = reader.readUint8();
    b2 = reader.readUint8();
    b3 = reader.readUint8();
    b4 = reader.readUint8();
    return b1 << 24 | b2 << 16 | b3 << 8 | b4;
  }
  if (b0 === 30) {
    return parseFloatOperand(reader);
  }
  if (b0 >= 32 && b0 <= 246) {
    return b0 - 139;
  }
  if (b0 >= 247 && b0 <= 250) {
    b1 = reader.readUint8();
    return (b0 - 247) * 256 + b1 + 108;
  }
  if (b0 >= 251 && b0 <= 254) {
    b1 = reader.readUint8();
    return -(b0 - 251) * 256 - b1 - 108;
  }
  throw new Error('invalid b0 ' + b0 + ',at:' + reader.offset);
}

/**
 * 解析字典值
 *
 * @param  {Object} dict    字典数据
 * @param  {Array} meta    元数据
 * @param  {Object} strings cff字符串字典
 * @return {Object}         解析后数据
 */
function interpretDict(dict, meta, strings) {
  var newDict = {};

  // Because we also want to include missing values, we start out from the meta list
  // and lookup values in the dict.
  for (var i = 0, l = meta.length; i < l; i++) {
    var m = meta[i];
    var value = dict[m.op];
    if (value === undefined) {
      value = m.value !== undefined ? m.value : null;
    }
    if (m.type === 'SID') {
      value = (0, _getCFFString["default"])(strings, value);
    }
    newDict[m.name] = value;
  }
  return newDict;
}

/**
 * 解析cff dict字典
 *
 * @param  {Reader} reader 读取器
 * @param  {number} offset  起始偏移
 * @param  {number} length   大小
 * @return {Object}        配置
 */
function parseCFFDict(reader, offset, length) {
  if (null != offset) {
    reader.seek(offset);
  }
  var entries = [];
  var operands = [];
  var lastOffset = reader.offset + (null != length ? length : reader.length);
  while (reader.offset < lastOffset) {
    var op = reader.readUint8();

    // The first byte for each dict item distinguishes between operator (key) and operand (value).
    // Values <= 21 are operators.
    if (op <= 21) {
      // Two-byte operators have an initial escape byte of 12.
      if (op === 12) {
        op = 1200 + reader.readUint8();
      }
      entries.push([op, operands]);
      operands = [];
    } else {
      // Since the operands (values) come before the operators (keys), we store all operands in a list
      // until we encounter an operator.
      operands.push(parseOperand(reader, op));
    }
  }
  return entriesToObject(entries);
}

/**
 * 解析cff top字典
 *
 * @param  {Reader} reader  读取器
 * @param  {number} start 开始offset
 * @param  {number} length 大小
 * @param  {Object} strings 字符串集合
 * @return {Object}         字典数据
 */
function parseTopDict(reader, start, length, strings) {
  var dict = parseCFFDict(reader, start || 0, length || reader.length);
  return interpretDict(dict, TOP_DICT_META, strings);
}

/**
 * 解析cff私有字典
 *
 * @param  {Reader} reader  读取器
 * @param  {number} start 开始offset
 * @param  {number} length 大小
 * @param  {Object} strings 字符串集合
 * @return {Object}         字典数据
 */
function parsePrivateDict(reader, start, length, strings) {
  var dict = parseCFFDict(reader, start || 0, length || reader.length);
  return interpretDict(dict, PRIVATE_DICT_META, strings);
}
var _default = {
  parseTopDict: parseTopDict,
  parsePrivateDict: parsePrivateDict
};
exports["default"] = _default;
},{"./getCFFString":63}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = parseCFFEncoding;
/**
 * @file 解析cff编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 解析cff encoding数据
 * See Adobe TN #5176 chapter 12, "Encodings".
 *
 * @param  {Reader} reader 读取器
 * @param  {number=} start  偏移
 * @return {Object}        编码表
 */
function parseCFFEncoding(reader, start) {
  if (null != start) {
    reader.seek(start);
  }
  var i;
  var code;
  var encoding = {};
  var format = reader.readUint8();
  if (format === 0) {
    var nCodes = reader.readUint8();
    for (i = 0; i < nCodes; i += 1) {
      code = reader.readUint8();
      encoding[code] = i;
    }
  } else if (format === 1) {
    var nRanges = reader.readUint8();
    code = 1;
    for (i = 0; i < nRanges; i += 1) {
      var first = reader.readUint8();
      var nLeft = reader.readUint8();
      for (var j = first; j <= first + nLeft; j += 1) {
        encoding[j] = code;
        code += 1;
      }
    }
  } else {
    console.warn('unknown encoding format:' + format);
  }
  return encoding;
}
},{}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = parseCFFCharstring;
/**
 * @file 解析cff字形
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 解析cff字形，返回直线和三次bezier曲线点数组
 *
 * @param  {Array} code  操作码
 * @param  {Object} font  相关联的font对象
 * @param  {number} index glyf索引
 * @return {Object}       glyf对象
 */
function parseCFFCharstring(code, font, index) {
  var c1x;
  var c1y;
  var c2x;
  var c2y;
  var contours = [];
  var contour = [];
  var stack = [];
  var glyfs = [];
  var nStems = 0;
  var haveWidth = false;
  var width = font.defaultWidthX;
  var open = false;
  var x = 0;
  var y = 0;
  function lineTo(x, y) {
    contour.push({
      onCurve: true,
      x: x,
      y: y
    });
  }
  function curveTo(c1x, c1y, c2x, c2y, x, y) {
    contour.push({
      x: c1x,
      y: c1y
    });
    contour.push({
      x: c2x,
      y: c2y
    });
    contour.push({
      onCurve: true,
      x: x,
      y: y
    });
  }
  function newContour(x, y) {
    if (open) {
      contours.push(contour);
    }
    contour = [];
    lineTo(x, y);
    open = true;
  }
  function parseStems() {
    // The number of stem operators on the stack is always even.
    // If the value is uneven, that means a width is specified.
    var hasWidthArg = stack.length % 2 !== 0;
    if (hasWidthArg && !haveWidth) {
      width = stack.shift() + font.nominalWidthX;
    }
    nStems += stack.length >> 1;
    stack.length = 0;
    haveWidth = true;
  }
  function parse(code) {
    var b1;
    var b2;
    var b3;
    var b4;
    var codeIndex;
    var subrCode;
    var jpx;
    var jpy;
    var c3x;
    var c3y;
    var c4x;
    var c4y;
    var i = 0;
    while (i < code.length) {
      var v = code[i];
      i += 1;
      switch (v) {
        case 1:
          // hstem
          parseStems();
          break;
        case 3:
          // vstem
          parseStems();
          break;
        case 4:
          // vmoveto
          if (stack.length > 1 && !haveWidth) {
            width = stack.shift() + font.nominalWidthX;
            haveWidth = true;
          }
          y += stack.pop();
          newContour(x, y);
          break;
        case 5:
          // rlineto
          while (stack.length > 0) {
            x += stack.shift();
            y += stack.shift();
            lineTo(x, y);
          }
          break;
        case 6:
          // hlineto
          while (stack.length > 0) {
            x += stack.shift();
            lineTo(x, y);
            if (stack.length === 0) {
              break;
            }
            y += stack.shift();
            lineTo(x, y);
          }
          break;
        case 7:
          // vlineto
          while (stack.length > 0) {
            y += stack.shift();
            lineTo(x, y);
            if (stack.length === 0) {
              break;
            }
            x += stack.shift();
            lineTo(x, y);
          }
          break;
        case 8:
          // rrcurveto
          while (stack.length > 0) {
            c1x = x + stack.shift();
            c1y = y + stack.shift();
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            x = c2x + stack.shift();
            y = c2y + stack.shift();
            curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 10:
          // callsubr
          codeIndex = stack.pop() + font.subrsBias;
          subrCode = font.subrs[codeIndex];
          if (subrCode) {
            parse(subrCode);
          }
          break;
        case 11:
          // return
          return;
        case 12:
          // flex operators
          v = code[i];
          i += 1;
          switch (v) {
            case 35:
              // flex
              // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 dx6 dy6 fd flex (12 35) |-
              c1x = x + stack.shift(); // dx1
              c1y = y + stack.shift(); // dy1
              c2x = c1x + stack.shift(); // dx2
              c2y = c1y + stack.shift(); // dy2
              jpx = c2x + stack.shift(); // dx3
              jpy = c2y + stack.shift(); // dy3
              c3x = jpx + stack.shift(); // dx4
              c3y = jpy + stack.shift(); // dy4
              c4x = c3x + stack.shift(); // dx5
              c4y = c3y + stack.shift(); // dy5
              x = c4x + stack.shift(); // dx6
              y = c4y + stack.shift(); // dy6
              stack.shift(); // flex depth
              curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            case 34:
              // hflex
              // |- dx1 dx2 dy2 dx3 dx4 dx5 dx6 hflex (12 34) |-
              c1x = x + stack.shift(); // dx1
              c1y = y; // dy1
              c2x = c1x + stack.shift(); // dx2
              c2y = c1y + stack.shift(); // dy2
              jpx = c2x + stack.shift(); // dx3
              jpy = c2y; // dy3
              c3x = jpx + stack.shift(); // dx4
              c3y = c2y; // dy4
              c4x = c3x + stack.shift(); // dx5
              c4y = y; // dy5
              x = c4x + stack.shift(); // dx6
              curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            case 36:
              // hflex1
              // |- dx1 dy1 dx2 dy2 dx3 dx4 dx5 dy5 dx6 hflex1 (12 36) |-
              c1x = x + stack.shift(); // dx1
              c1y = y + stack.shift(); // dy1
              c2x = c1x + stack.shift(); // dx2
              c2y = c1y + stack.shift(); // dy2
              jpx = c2x + stack.shift(); // dx3
              jpy = c2y; // dy3
              c3x = jpx + stack.shift(); // dx4
              c3y = c2y; // dy4
              c4x = c3x + stack.shift(); // dx5
              c4y = c3y + stack.shift(); // dy5
              x = c4x + stack.shift(); // dx6
              curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            case 37:
              // flex1
              // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 d6 flex1 (12 37) |-
              c1x = x + stack.shift(); // dx1
              c1y = y + stack.shift(); // dy1
              c2x = c1x + stack.shift(); // dx2
              c2y = c1y + stack.shift(); // dy2
              jpx = c2x + stack.shift(); // dx3
              jpy = c2y + stack.shift(); // dy3
              c3x = jpx + stack.shift(); // dx4
              c3y = jpy + stack.shift(); // dy4
              c4x = c3x + stack.shift(); // dx5
              c4y = c3y + stack.shift(); // dy5
              if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
                x = c4x + stack.shift();
              } else {
                y = c4y + stack.shift();
              }
              curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
              curveTo(c3x, c3y, c4x, c4y, x, y);
              break;
            default:
              console.warn('Glyph ' + index + ': unknown operator ' + (1200 + v));
              stack.length = 0;
          }
          break;
        case 14:
          // endchar
          if (stack.length === 1 && !haveWidth) {
            width = stack.shift() + font.nominalWidthX;
            haveWidth = true;
          } else if (stack.length === 4) {
            glyfs[1] = {
              glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
              transform: {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: 0,
                f: 0
              }
            };
            glyfs[0] = {
              glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
              transform: {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: 0,
                f: 0
              }
            };
            glyfs[1].transform.f = stack.pop();
            glyfs[1].transform.e = stack.pop();
          } else if (stack.length === 5) {
            if (!haveWidth) {
              width = stack.shift() + font.nominalWidthX;
            }
            haveWidth = true;
            glyfs[1] = {
              glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
              transform: {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: 0,
                f: 0
              }
            };
            glyfs[0] = {
              glyphIndex: font.charset.indexOf(font.encoding[stack.pop()]),
              transform: {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: 0,
                f: 0
              }
            };
            glyfs[1].transform.f = stack.pop();
            glyfs[1].transform.e = stack.pop();
          }
          if (open) {
            contours.push(contour);
            open = false;
          }
          break;
        case 18:
          // hstemhm
          parseStems();
          break;
        case 19: // hintmask
        case 20:
          // cntrmask
          parseStems();
          i += nStems + 7 >> 3;
          break;
        case 21:
          // rmoveto
          if (stack.length > 2 && !haveWidth) {
            width = stack.shift() + font.nominalWidthX;
            haveWidth = true;
          }
          y += stack.pop();
          x += stack.pop();
          newContour(x, y);
          break;
        case 22:
          // hmoveto
          if (stack.length > 1 && !haveWidth) {
            width = stack.shift() + font.nominalWidthX;
            haveWidth = true;
          }
          x += stack.pop();
          newContour(x, y);
          break;
        case 23:
          // vstemhm
          parseStems();
          break;
        case 24:
          // rcurveline
          while (stack.length > 2) {
            c1x = x + stack.shift();
            c1y = y + stack.shift();
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            x = c2x + stack.shift();
            y = c2y + stack.shift();
            curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          x += stack.shift();
          y += stack.shift();
          lineTo(x, y);
          break;
        case 25:
          // rlinecurve
          while (stack.length > 6) {
            x += stack.shift();
            y += stack.shift();
            lineTo(x, y);
          }
          c1x = x + stack.shift();
          c1y = y + stack.shift();
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          x = c2x + stack.shift();
          y = c2y + stack.shift();
          curveTo(c1x, c1y, c2x, c2y, x, y);
          break;
        case 26:
          // vvcurveto
          if (stack.length % 2) {
            x += stack.shift();
          }
          while (stack.length > 0) {
            c1x = x;
            c1y = y + stack.shift();
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            x = c2x;
            y = c2y + stack.shift();
            curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 27:
          // hhcurveto
          if (stack.length % 2) {
            y += stack.shift();
          }
          while (stack.length > 0) {
            c1x = x + stack.shift();
            c1y = y;
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            x = c2x + stack.shift();
            y = c2y;
            curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 28:
          // shortint
          b1 = code[i];
          b2 = code[i + 1];
          stack.push((b1 << 24 | b2 << 16) >> 16);
          i += 2;
          break;
        case 29:
          // callgsubr
          codeIndex = stack.pop() + font.gsubrsBias;
          subrCode = font.gsubrs[codeIndex];
          if (subrCode) {
            parse(subrCode);
          }
          break;
        case 30:
          // vhcurveto
          while (stack.length > 0) {
            c1x = x;
            c1y = y + stack.shift();
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            x = c2x + stack.shift();
            y = c2y + (stack.length === 1 ? stack.shift() : 0);
            curveTo(c1x, c1y, c2x, c2y, x, y);
            if (stack.length === 0) {
              break;
            }
            c1x = x + stack.shift();
            c1y = y;
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            y = c2y + stack.shift();
            x = c2x + (stack.length === 1 ? stack.shift() : 0);
            curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        case 31:
          // hvcurveto
          while (stack.length > 0) {
            c1x = x + stack.shift();
            c1y = y;
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            y = c2y + stack.shift();
            x = c2x + (stack.length === 1 ? stack.shift() : 0);
            curveTo(c1x, c1y, c2x, c2y, x, y);
            if (stack.length === 0) {
              break;
            }
            c1x = x;
            c1y = y + stack.shift();
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            x = c2x + stack.shift();
            y = c2y + (stack.length === 1 ? stack.shift() : 0);
            curveTo(c1x, c1y, c2x, c2y, x, y);
          }
          break;
        default:
          if (v < 32) {
            console.warn('Glyph ' + index + ': unknown operator ' + v);
          } else if (v < 247) {
            stack.push(v - 139);
          } else if (v < 251) {
            b1 = code[i];
            i += 1;
            stack.push((v - 247) * 256 + b1 + 108);
          } else if (v < 255) {
            b1 = code[i];
            i += 1;
            stack.push(-(v - 251) * 256 - b1 - 108);
          } else {
            b1 = code[i];
            b2 = code[i + 1];
            b3 = code[i + 2];
            b4 = code[i + 3];
            i += 4;
            stack.push((b1 << 24 | b2 << 16 | b3 << 8 | b4) / 65536);
          }
      }
    }
  }
  parse(code);
  var glyf = {
    // 移除重复的起点和终点
    contours: contours.map(function (contour) {
      var last = contour.length - 1;
      if (contour[0].x === contour[last].x && contour[0].y === contour[last].y) {
        contour.splice(last, 1);
      }
      return contour;
    }),
    advanceWidth: width
  };
  if (glyfs.length) {
    glyf.compound = true;
    glyf.glyfs = glyfs;
  }
  return glyf;
}
},{}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _parse = _interopRequireDefault(require("./cmap/parse"));
var _write = _interopRequireDefault(require("./cmap/write"));
var _sizeof = _interopRequireDefault(require("./cmap/sizeof"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file cmap 表
 * @author mengke01(kekee000@gmail.com)
 *
 * @see
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cmap.html
 */
var _default = _table["default"].create('cmap', [], {
  write: _write["default"],
  read: _parse["default"],
  size: _sizeof["default"]
});
exports["default"] = _default;
},{"./cmap/parse":69,"./cmap/sizeof":70,"./cmap/write":71,"./table":92}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = parse;
var _readWindowsAllCodes = _interopRequireDefault(require("../../util/readWindowsAllCodes"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 解析cmap表
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 读取cmap子表
 *
 * @param {Reader} reader Reader对象
 * @param {Object} ttf ttf对象
 * @param {Object} subTable 子表对象
 * @param {number} cmapOffset 子表的偏移
 */
function readSubTable(reader, ttf, subTable, cmapOffset) {
  var i;
  var l;
  var glyphIdArray;
  var startOffset = cmapOffset + subTable.offset;
  var glyphCount;
  subTable.format = reader.readUint16(startOffset);

  // 0～256 紧凑排列
  if (subTable.format === 0) {
    var format0 = subTable;
    // 跳过format字段
    format0.length = reader.readUint16();
    format0.language = reader.readUint16();
    glyphIdArray = [];
    for (i = 0, l = format0.length - 6; i < l; i++) {
      glyphIdArray.push(reader.readUint8());
    }
    format0.glyphIdArray = glyphIdArray;
  } else if (subTable.format === 2) {
    var format2 = subTable;
    // 跳过format字段
    format2.length = reader.readUint16();
    format2.language = reader.readUint16();
    var subHeadKeys = [];
    var maxSubHeadKey = 0; // 最大索引
    var maxPos = -1; // 最大位置
    for (var _i = 0, _l = 256; _i < _l; _i++) {
      subHeadKeys[_i] = reader.readUint16() / 8;
      if (subHeadKeys[_i] > maxSubHeadKey) {
        maxSubHeadKey = subHeadKeys[_i];
        maxPos = _i;
      }
    }
    var subHeads = [];
    for (i = 0; i <= maxSubHeadKey; i++) {
      subHeads[i] = {
        firstCode: reader.readUint16(),
        entryCount: reader.readUint16(),
        idDelta: reader.readUint16(),
        idRangeOffset: (reader.readUint16() - (maxSubHeadKey - i) * 8 - 2) / 2
      };
    }
    glyphCount = (startOffset + format2.length - reader.offset) / 2;
    var glyphs = [];
    for (i = 0; i < glyphCount; i++) {
      glyphs[i] = reader.readUint16();
    }
    format2.subHeadKeys = subHeadKeys;
    format2.maxPos = maxPos;
    format2.subHeads = subHeads;
    format2.glyphs = glyphs;
  }
  // 双字节编码，非紧凑排列
  else if (subTable.format === 4) {
    var format4 = subTable;
    // 跳过format字段
    format4.length = reader.readUint16();
    format4.language = reader.readUint16();
    format4.segCountX2 = reader.readUint16();
    format4.searchRange = reader.readUint16();
    format4.entrySelector = reader.readUint16();
    format4.rangeShift = reader.readUint16();
    var segCount = format4.segCountX2 / 2;

    // end code
    var endCode = [];
    for (i = 0; i < segCount; ++i) {
      endCode.push(reader.readUint16());
    }
    format4.endCode = endCode;
    format4.reservedPad = reader.readUint16();

    // start code
    var startCode = [];
    for (i = 0; i < segCount; ++i) {
      startCode.push(reader.readUint16());
    }
    format4.startCode = startCode;

    // idDelta
    var idDelta = [];
    for (i = 0; i < segCount; ++i) {
      idDelta.push(reader.readUint16());
    }
    format4.idDelta = idDelta;
    format4.idRangeOffsetOffset = reader.offset;

    // idRangeOffset
    var idRangeOffset = [];
    for (i = 0; i < segCount; ++i) {
      idRangeOffset.push(reader.readUint16());
    }
    format4.idRangeOffset = idRangeOffset;

    // 总长度 - glyphIdArray起始偏移/2
    glyphCount = (format4.length - (reader.offset - startOffset)) / 2;

    // 记录array offset
    format4.glyphIdArrayOffset = reader.offset;

    // glyphIdArray
    glyphIdArray = [];
    for (i = 0; i < glyphCount; ++i) {
      glyphIdArray.push(reader.readUint16());
    }
    format4.glyphIdArray = glyphIdArray;
  } else if (subTable.format === 6) {
    var format6 = subTable;
    format6.length = reader.readUint16();
    format6.language = reader.readUint16();
    format6.firstCode = reader.readUint16();
    format6.entryCount = reader.readUint16();

    // 记录array offset
    format6.glyphIdArrayOffset = reader.offset;
    var glyphIndexArray = [];
    var entryCount = format6.entryCount;
    // 读取字符分组
    for (i = 0; i < entryCount; ++i) {
      glyphIndexArray.push(reader.readUint16());
    }
    format6.glyphIdArray = glyphIndexArray;
  }
  // defines segments for sparse representation in 4-byte character space
  else if (subTable.format === 12) {
    var format12 = subTable;
    format12.reserved = reader.readUint16();
    format12.length = reader.readUint32();
    format12.language = reader.readUint32();
    format12.nGroups = reader.readUint32();
    var groups = [];
    var nGroups = format12.nGroups;
    // 读取字符分组
    for (i = 0; i < nGroups; ++i) {
      var group = {};
      group.start = reader.readUint32();
      group.end = reader.readUint32();
      group.startId = reader.readUint32();
      groups.push(group);
    }
    format12.groups = groups;
  }
  // format 14
  else if (subTable.format === 14) {
    var format14 = subTable;
    format14.length = reader.readUint32();
    var numVarSelectorRecords = reader.readUint32();
    var _groups = [];
    var offset = reader.offset;
    for (var _i2 = 0; _i2 < numVarSelectorRecords; _i2++) {
      var varSelector = reader.readUint24(offset);
      var defaultUVSOffset = reader.readUint32(offset + 3);
      var nonDefaultUVSOffset = reader.readUint32(offset + 7);
      offset += 11;
      if (defaultUVSOffset) {
        var numUnicodeValueRanges = reader.readUint32(startOffset + defaultUVSOffset);
        for (var j = 0; j < numUnicodeValueRanges; j++) {
          var startUnicode = reader.readUint24();
          var additionalCount = reader.readUint8();
          _groups.push({
            start: startUnicode,
            end: startUnicode + additionalCount,
            varSelector: varSelector
          });
        }
      }
      if (nonDefaultUVSOffset) {
        var numUVSMappings = reader.readUint32(startOffset + nonDefaultUVSOffset);
        for (var _j = 0; _j < numUVSMappings; _j++) {
          var unicode = reader.readUint24();
          var glyphId = reader.readUint16();
          _groups.push({
            unicode: unicode,
            glyphId: glyphId,
            varSelector: varSelector
          });
        }
      }
    }
    format14.groups = _groups;
  } else {
    console.warn('not support cmap format:' + subTable.format);
  }
}
function parse(reader, ttf) {
  var tcmap = {};
  // eslint-disable-next-line no-invalid-this
  var cmapOffset = this.offset;
  reader.seek(cmapOffset);
  tcmap.version = reader.readUint16(); // 编码方式
  var numberSubtables = tcmap.numberSubtables = reader.readUint16(); // 表个数

  var subTables = tcmap.tables = []; // 名字表
  var offset = reader.offset;

  // 使用offset读取，以便于查找
  for (var i = 0, l = numberSubtables; i < l; i++) {
    var subTable = {};
    subTable.platformID = reader.readUint16(offset);
    subTable.encodingID = reader.readUint16(offset + 2);
    subTable.offset = reader.readUint32(offset + 4);
    readSubTable(reader, ttf, subTable, cmapOffset);
    subTables.push(subTable);
    offset += 8;
  }
  var cmap = (0, _readWindowsAllCodes["default"])(subTables, ttf);
  return cmap;
}
},{"../../util/readWindowsAllCodes":112}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = sizeof;
/**
 * @file 获取cmap表的大小
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 获取format4 delta值
 * Delta is saved in signed int in cmap format 4 subtable,
 * but can be in -0xFFFF..0 interval.
 * -0x10000..-0x7FFF values are stored with offset.
 *
 * @param {number} delta delta值
 * @return {number} delta值
 */
function encodeDelta(delta) {
  return delta > 0x7FFF ? delta - 0x10000 : delta < -0x7FFF ? delta + 0x10000 : delta;
}

/**
 * 根据bound获取glyf segment
 *
 * @param {Array} glyfUnicodes glyf编码集合
 * @param {number} bound 编码范围
 * @return {Array} 码表
 */
function getSegments(glyfUnicodes, bound) {
  var prevGlyph = null;
  var result = [];
  var segment = {};
  glyfUnicodes.forEach(function (glyph) {
    if (bound === undefined || glyph.unicode <= bound) {
      // 初始化编码头部，这里unicode和graph id 都必须连续
      if (prevGlyph === null || glyph.unicode !== prevGlyph.unicode + 1 || glyph.id !== prevGlyph.id + 1) {
        if (prevGlyph !== null) {
          segment.end = prevGlyph.unicode;
          result.push(segment);
          segment = {
            start: glyph.unicode,
            startId: glyph.id,
            delta: encodeDelta(glyph.id - glyph.unicode)
          };
        } else {
          segment.start = glyph.unicode;
          segment.startId = glyph.id;
          segment.delta = encodeDelta(glyph.id - glyph.unicode);
        }
      }
      prevGlyph = glyph;
    }
  });

  // need to finish the last segment
  if (prevGlyph !== null) {
    segment.end = prevGlyph.unicode;
    result.push(segment);
  }

  // 返回编码范围
  return result;
}

/**
 * 获取format0编码集合
 *
 * @param {Array} glyfUnicodes glyf编码集合
 * @return {Array} 码表
 */
function getFormat0Segment(glyfUnicodes) {
  var unicodes = [];
  glyfUnicodes.forEach(function (u) {
    if (u.unicode !== undefined && u.unicode < 256) {
      unicodes.push([u.unicode, u.id]);
    }
  });

  // 按编码排序
  unicodes.sort(function (a, b) {
    return a[0] - b[0];
  });
  return unicodes;
}

/**
 * 对cmap数据进行预处理，获取大小
 *
 * @param  {Object} ttf ttf对象
 * @return {number} 大小
 */
function sizeof(ttf) {
  ttf.support.cmap = {};
  var glyfUnicodes = [];
  ttf.glyf.forEach(function (glyph, index) {
    var unicodes = glyph.unicode;
    if (typeof glyph.unicode === 'number') {
      unicodes = [glyph.unicode];
    }
    if (unicodes && unicodes.length) {
      unicodes.forEach(function (unicode) {
        glyfUnicodes.push({
          unicode: unicode,
          id: unicode !== 0xFFFF ? index : 0
        });
      });
    }
  });
  glyfUnicodes = glyfUnicodes.sort(function (a, b) {
    return a.unicode - b.unicode;
  });
  ttf.support.cmap.unicodes = glyfUnicodes;
  var unicodes2Bytes = glyfUnicodes;
  ttf.support.cmap.format4Segments = getSegments(unicodes2Bytes, 0xFFFF);
  ttf.support.cmap.format4Size = 24 + ttf.support.cmap.format4Segments.length * 8;
  ttf.support.cmap.format0Segments = getFormat0Segment(glyfUnicodes);
  ttf.support.cmap.format0Size = 262;

  // we need subtable 12 only if found unicodes with > 2 bytes.
  var hasGLyphsOver2Bytes = unicodes2Bytes.some(function (glyph) {
    return glyph.unicode > 0xFFFF;
  });
  if (hasGLyphsOver2Bytes) {
    ttf.support.cmap.hasGLyphsOver2Bytes = hasGLyphsOver2Bytes;
    var unicodes4Bytes = glyfUnicodes;
    ttf.support.cmap.format12Segments = getSegments(unicodes4Bytes);
    ttf.support.cmap.format12Size = 16 + ttf.support.cmap.format12Segments.length * 12;
  }
  var size = 4 + (hasGLyphsOver2Bytes ? 32 : 24) // cmap header
  + ttf.support.cmap.format0Size // format 0
  + ttf.support.cmap.format4Size // format 4
  + (hasGLyphsOver2Bytes ? ttf.support.cmap.format12Size : 0); // format 12

  return size;
}
},{}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = write;
/**
 * @file 写cmap表
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 创建`子表0`
 *
 * @param {Writer} writer 写对象
 * @param {Array} unicodes unicodes列表
 * @return {Writer}
 */
function writeSubTable0(writer, unicodes) {
  writer.writeUint16(0); // format
  writer.writeUint16(262); // length
  writer.writeUint16(0); // language

  // Array of unicodes 0..255
  var i = -1;
  var unicode;
  while (unicode = unicodes.shift()) {
    while (++i < unicode[0]) {
      writer.writeUint8(0);
    }
    writer.writeUint8(unicode[1]);
    i = unicode[0];
  }
  while (++i < 256) {
    writer.writeUint8(0);
  }
  return writer;
}

/**
 * 创建`子表4`
 *
 * @param {Writer} writer 写对象
 * @param {Array} segments 分块编码列表
 * @return {Writer}
 */
function writeSubTable4(writer, segments) {
  writer.writeUint16(4); // format
  writer.writeUint16(24 + segments.length * 8); // length
  writer.writeUint16(0); // language

  var segCount = segments.length + 1;
  var maxExponent = Math.floor(Math.log(segCount) / Math.LN2);
  var searchRange = 2 * Math.pow(2, maxExponent);
  writer.writeUint16(segCount * 2); // segCountX2
  writer.writeUint16(searchRange); // searchRange
  writer.writeUint16(maxExponent); // entrySelector
  writer.writeUint16(2 * segCount - searchRange); // rangeShift

  // end list
  segments.forEach(function (segment) {
    writer.writeUint16(segment.end);
  });
  writer.writeUint16(0xFFFF); // end code
  writer.writeUint16(0); // reservedPad

  // start list
  segments.forEach(function (segment) {
    writer.writeUint16(segment.start);
  });
  writer.writeUint16(0xFFFF); // start code

  // id delta
  segments.forEach(function (segment) {
    writer.writeUint16(segment.delta);
  });
  writer.writeUint16(1);

  // Array of range offsets, it doesn't matter when deltas present
  for (var i = 0, l = segments.length; i < l; i++) {
    writer.writeUint16(0);
  }
  writer.writeUint16(0); // rangeOffsetArray should be finished with 0

  return writer;
}

/**
 * 创建`子表12`
 *
 * @param {Writer} writer 写对象
 * @param {Array} segments 分块编码列表
 * @return {Writer}
 */
function writeSubTable12(writer, segments) {
  writer.writeUint16(12); // format
  writer.writeUint16(0); // reserved
  writer.writeUint32(16 + segments.length * 12); // length
  writer.writeUint32(0); // language
  writer.writeUint32(segments.length); // nGroups

  segments.forEach(function (segment) {
    writer.writeUint32(segment.start);
    writer.writeUint32(segment.end);
    writer.writeUint32(segment.startId);
  });
  return writer;
}

/**
 * 写subtableheader
 *
 * @param {Writer} writer Writer对象
 * @param {number} platform 平台
 * @param {number} encoding 编码
 * @param {number} offset 偏移
 * @return {Writer}
 */
function writeSubTableHeader(writer, platform, encoding, offset) {
  writer.writeUint16(platform); // platform
  writer.writeUint16(encoding); // encoding
  writer.writeUint32(offset); // offset
  return writer;
}

/**
 * 写cmap表数据
 *
 * @param  {Object} writer 写入器
 * @param  {Object} ttf    ttf对象
 * @return {Object}        写入器
 */
function write(writer, ttf) {
  var hasGLyphsOver2Bytes = ttf.support.cmap.hasGLyphsOver2Bytes;

  // write table header.
  writer.writeUint16(0); // version
  writer.writeUint16(hasGLyphsOver2Bytes ? 4 : 3); // count

  // header size
  var subTableOffset = 4 + (hasGLyphsOver2Bytes ? 32 : 24);
  var format4Size = ttf.support.cmap.format4Size;
  var format0Size = ttf.support.cmap.format0Size;

  // subtable 4, unicode
  writeSubTableHeader(writer, 0, 3, subTableOffset);

  // subtable 0, mac standard
  writeSubTableHeader(writer, 1, 0, subTableOffset + format4Size);

  // subtable 4, windows standard
  writeSubTableHeader(writer, 3, 1, subTableOffset);
  if (hasGLyphsOver2Bytes) {
    writeSubTableHeader(writer, 3, 10, subTableOffset + format4Size + format0Size);
  }

  // write tables, order of table seem to be magic, it is taken from TTX tool
  writeSubTable4(writer, ttf.support.cmap.format4Segments);
  writeSubTable0(writer, ttf.support.cmap.format0Segments);
  if (hasGLyphsOver2Bytes) {
    writeSubTable12(writer, ttf.support.cmap.format12Segments);
  }
  return writer;
}
},{}],72:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file cvt表
 * @author mengke01(kekee000@gmail.com)
 *
 * @reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cvt.html
 */
var _default = _table["default"].create('cvt', [], {
  read: function read(reader, ttf) {
    var length = ttf.tables.cvt.length;
    return reader.readBytes(this.offset, length);
  },
  write: function write(writer, ttf) {
    if (ttf.cvt) {
      writer.writeBytes(ttf.cvt, ttf.cvt.length);
    }
  },
  size: function size(ttf) {
    return ttf.cvt ? ttf.cvt.length : 0;
  }
});
exports["default"] = _default;
},{"./table":92}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file directory 表, 读取和写入ttf表索引
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6.html
 */
var _default = _table["default"].create('directory', [], {
  read: function read(reader, ttf) {
    var tables = {};
    var numTables = ttf.numTables;
    var offset = this.offset;
    for (var i = offset, l = numTables * 16; i < l; i += 16) {
      var name = reader.readString(i, 4).trim();
      tables[name] = {
        name: name,
        checkSum: reader.readUint32(i + 4),
        offset: reader.readUint32(i + 8),
        length: reader.readUint32(i + 12)
      };
    }
    return tables;
  },
  write: function write(writer, ttf) {
    var tables = ttf.support.tables;
    for (var i = 0, l = tables.length; i < l; i++) {
      writer.writeString((tables[i].name + '    ').slice(0, 4));
      writer.writeUint32(tables[i].checkSum);
      writer.writeUint32(tables[i].offset);
      writer.writeUint32(tables[i].length);
    }
    return writer;
  },
  size: function size(ttf) {
    return ttf.numTables * 16;
  }
});
exports["default"] = _default;
},{"./table":92}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file fpgm 表
 * @author mengke01(kekee000@gmail.com)
 *
 * reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6fpgm.html
 */
var _default = _table["default"].create('fpgm', [], {
  read: function read(reader, ttf) {
    var length = ttf.tables.fpgm.length;
    return reader.readBytes(this.offset, length);
  },
  write: function write(writer, ttf) {
    if (ttf.fpgm) {
      writer.writeBytes(ttf.fpgm, ttf.fpgm.length);
    }
  },
  size: function size(ttf) {
    return ttf.fpgm ? ttf.fpgm.length : 0;
  }
});
exports["default"] = _default;
},{"./table":92}],75:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file gasp 表
 * 对于需要hinting的字号需要这个表，否则会导致错误
 * @author mengke01(kekee000@gmail.com)
 * reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6gasp.html
 */
var _default = _table["default"].create('gasp', [], {
  read: function read(reader, ttf) {
    var length = ttf.tables.gasp.length;
    return reader.readBytes(this.offset, length);
  },
  write: function write(writer, ttf) {
    if (ttf.gasp) {
      writer.writeBytes(ttf.gasp, ttf.gasp.length);
    }
  },
  size: function size(ttf) {
    return ttf.gasp ? ttf.gasp.length : 0;
  }
});
exports["default"] = _default;
},{"./table":92}],76:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _parse = _interopRequireDefault(require("./glyf/parse"));
var _write = _interopRequireDefault(require("./glyf/write"));
var _sizeof = _interopRequireDefault(require("./glyf/sizeof"));
var _lang = require("../../common/lang");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file glyf表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html
 */
var _default = _table["default"].create('glyf', [], {
  read: function read(reader, ttf) {
    var startOffset = this.offset;
    var loca = ttf.loca;
    var numGlyphs = ttf.maxp.numGlyphs;
    var glyphs = [];
    reader.seek(startOffset);

    // subset
    var subset = ttf.readOptions.subset;
    if (subset && subset.length > 0) {
      var subsetMap = {
        0: true // 设置.notdef
      };

      subsetMap[0] = true;
      // subset map
      var cmap = ttf.cmap;

      // unicode to index
      Object.keys(cmap).forEach(function (c) {
        if (subset.indexOf(+c) > -1) {
          var _i = cmap[c];
          subsetMap[_i] = true;
        }
      });
      ttf.subsetMap = subsetMap;
      var parsedGlyfMap = {};
      // 循环解析subset相关的glyf，包括复合字形相关的字形
      var travelsParse = function travels(subsetMap) {
        var newSubsetMap = {};
        Object.keys(subsetMap).forEach(function (i) {
          var index = +i;
          parsedGlyfMap[index] = true;
          // 当前的和下一个一样，或者最后一个无轮廓
          if (loca[index] === loca[index + 1]) {
            glyphs[index] = {
              contours: []
            };
          } else {
            glyphs[index] = (0, _parse["default"])(reader, ttf, startOffset + loca[index]);
          }
          if (glyphs[index].compound) {
            glyphs[index].glyfs.forEach(function (g) {
              if (!parsedGlyfMap[g.glyphIndex]) {
                newSubsetMap[g.glyphIndex] = true;
              }
            });
          }
        });
        if (!(0, _lang.isEmptyObject)(newSubsetMap)) {
          travels(newSubsetMap);
        }
      };
      travelsParse(subsetMap);
      return glyphs;
    }

    // 解析字体轮廓, 前n-1个
    var i;
    var l;
    for (i = 0, l = numGlyphs - 1; i < l; i++) {
      // 当前的和下一个一样，或者最后一个无轮廓
      if (loca[i] === loca[i + 1]) {
        glyphs[i] = {
          contours: []
        };
      } else {
        glyphs[i] = (0, _parse["default"])(reader, ttf, startOffset + loca[i]);
      }
    }

    // 最后一个轮廓
    if (ttf.tables.glyf.length - loca[i] < 5) {
      glyphs[i] = {
        contours: []
      };
    } else {
      glyphs[i] = (0, _parse["default"])(reader, ttf, startOffset + loca[i]);
    }
    return glyphs;
  },
  write: _write["default"],
  size: _sizeof["default"]
});
exports["default"] = _default;
},{"../../common/lang":14,"./glyf/parse":77,"./glyf/sizeof":78,"./glyf/write":79,"./table":92}],77:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = parseGlyf;
var _glyFlag = _interopRequireDefault(require("../../enum/glyFlag"));
var _componentFlag = _interopRequireDefault(require("../../enum/componentFlag"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 解析glyf轮廓
 * @author mengke01(kekee000@gmail.com)
 */

var MAX_INSTRUCTION_LENGTH = 5000; // 设置instructions阈值防止读取错误
var MAX_NUMBER_OF_COORDINATES = 20000; // 设置坐标最大个数阈值，防止glyf读取错误

/**
 * 读取简单字形
 *
 * @param {Reader} reader Reader对象
 * @param {Object} glyf 空glyf
 * @return {Object} 解析后的glyf
 */
function parseSimpleGlyf(reader, glyf) {
  var offset = reader.offset;

  // 轮廓点个数
  var numberOfCoordinates = glyf.endPtsOfContours[glyf.endPtsOfContours.length - 1] + 1;

  // 判断坐标是否超过最大个数
  if (numberOfCoordinates > MAX_NUMBER_OF_COORDINATES) {
    console.warn('error read glyf coordinates:' + offset);
    return glyf;
  }

  // 获取flag标志
  var i;
  var length;
  var flags = [];
  var flag;
  i = 0;
  while (i < numberOfCoordinates) {
    flag = reader.readUint8();
    flags.push(flag);
    i++;

    // 标志位3重复flag
    if (flag & _glyFlag["default"].REPEAT && i < numberOfCoordinates) {
      // 重复个数
      var repeat = reader.readUint8();
      for (var j = 0; j < repeat; j++) {
        flags.push(flag);
        i++;
      }
    }
  }

  // 坐标集合
  var coordinates = [];
  var xCoordinates = [];
  var prevX = 0;
  var x;
  for (i = 0, length = flags.length; i < length; ++i) {
    x = 0;
    flag = flags[i];

    // 标志位1
    // If set, the corresponding y-coordinate is 1 byte long, not 2
    if (flag & _glyFlag["default"].XSHORT) {
      x = reader.readUint8();

      // 标志位5
      x = flag & _glyFlag["default"].XSAME ? x : -1 * x;
    }
    // 与上一值一致
    else if (flag & _glyFlag["default"].XSAME) {
      x = 0;
    }
    // 新值
    else {
      x = reader.readInt16();
    }
    prevX += x;
    xCoordinates[i] = prevX;
    coordinates[i] = {
      x: prevX,
      y: 0
    };
    if (flag & _glyFlag["default"].ONCURVE) {
      coordinates[i].onCurve = true;
    }
  }
  var yCoordinates = [];
  var prevY = 0;
  var y;
  for (i = 0, length = flags.length; i < length; i++) {
    y = 0;
    flag = flags[i];
    if (flag & _glyFlag["default"].YSHORT) {
      y = reader.readUint8();
      y = flag & _glyFlag["default"].YSAME ? y : -1 * y;
    } else if (flag & _glyFlag["default"].YSAME) {
      y = 0;
    } else {
      y = reader.readInt16();
    }
    prevY += y;
    yCoordinates[i] = prevY;
    if (coordinates[i]) {
      coordinates[i].y = prevY;
    }
  }

  // 计算轮廓集合
  if (coordinates.length) {
    var endPtsOfContours = glyf.endPtsOfContours;
    var contours = [];
    contours.push(coordinates.slice(0, endPtsOfContours[0] + 1));
    for (i = 1, length = endPtsOfContours.length; i < length; i++) {
      contours.push(coordinates.slice(endPtsOfContours[i - 1] + 1, endPtsOfContours[i] + 1));
    }
    glyf.contours = contours;
  }
  return glyf;
}

/**
 * 读取复合字形
 *
 * @param {Reader} reader Reader对象
 * @param {Object} glyf glyf对象
 * @return {Object} glyf对象
 */
function parseCompoundGlyf(reader, glyf) {
  glyf.compound = true;
  glyf.glyfs = [];
  var flags;
  var g;

  // 读取复杂字形
  do {
    flags = reader.readUint16();
    g = {};
    g.flags = flags;
    g.glyphIndex = reader.readUint16();
    var arg1 = 0;
    var arg2 = 0;
    var scaleX = 16384;
    var scaleY = 16384;
    var scale01 = 0;
    var scale10 = 0;
    if (_componentFlag["default"].ARG_1_AND_2_ARE_WORDS & flags) {
      arg1 = reader.readInt16();
      arg2 = reader.readInt16();
    } else {
      arg1 = reader.readInt8();
      arg2 = reader.readInt8();
    }
    if (_componentFlag["default"].ROUND_XY_TO_GRID & flags) {
      arg1 = Math.round(arg1);
      arg2 = Math.round(arg2);
    }
    if (_componentFlag["default"].WE_HAVE_A_SCALE & flags) {
      scaleX = reader.readInt16();
      scaleY = scaleX;
    } else if (_componentFlag["default"].WE_HAVE_AN_X_AND_Y_SCALE & flags) {
      scaleX = reader.readInt16();
      scaleY = reader.readInt16();
    } else if (_componentFlag["default"].WE_HAVE_A_TWO_BY_TWO & flags) {
      scaleX = reader.readInt16();
      scale01 = reader.readInt16();
      scale10 = reader.readInt16();
      scaleY = reader.readInt16();
    }
    if (_componentFlag["default"].ARGS_ARE_XY_VALUES & flags) {
      g.useMyMetrics = !!flags & _componentFlag["default"].USE_MY_METRICS;
      g.overlapCompound = !!flags & _componentFlag["default"].OVERLAP_COMPOUND;
      g.transform = {
        a: Math.round(10000 * scaleX / 16384) / 10000,
        b: Math.round(10000 * scale01 / 16384) / 10000,
        c: Math.round(10000 * scale10 / 16384) / 10000,
        d: Math.round(10000 * scaleY / 16384) / 10000,
        e: arg1,
        f: arg2
      };
    } else {
      g.points = [arg1, arg2];
      g.transform = {
        a: Math.round(10000 * scaleX / 16384) / 10000,
        b: Math.round(10000 * scale01 / 16384) / 10000,
        c: Math.round(10000 * scale10 / 16384) / 10000,
        d: Math.round(10000 * scaleY / 16384) / 10000,
        e: 0,
        f: 0
      };
    }
    glyf.glyfs.push(g);
  } while (_componentFlag["default"].MORE_COMPONENTS & flags);
  if (_componentFlag["default"].WE_HAVE_INSTRUCTIONS & flags) {
    var length = reader.readUint16();
    if (length < MAX_INSTRUCTION_LENGTH) {
      var instructions = [];
      for (var i = 0; i < length; ++i) {
        instructions.push(reader.readUint8());
      }
      glyf.instructions = instructions;
    } else {
      console.warn(length);
    }
  }
  return glyf;
}

/**
 * 解析glyf轮廓
 *
 * @param  {Reader} reader 读取器
 * @param  {Object} ttf    ttf对象
 * @param  {number=} offset 偏移
 * @return {Object}        glyf对象
 */
function parseGlyf(reader, ttf, offset) {
  if (null != offset) {
    reader.seek(offset);
  }
  var glyf = {};
  var i;
  var length;
  var instructions;

  // 边界值
  var numberOfContours = reader.readInt16();
  glyf.xMin = reader.readInt16();
  glyf.yMin = reader.readInt16();
  glyf.xMax = reader.readInt16();
  glyf.yMax = reader.readInt16();

  // 读取简单字形
  if (numberOfContours >= 0) {
    // endPtsOfConturs
    var endPtsOfContours = [];
    if (numberOfContours >= 0) {
      for (i = 0; i < numberOfContours; i++) {
        endPtsOfContours.push(reader.readUint16());
      }
      glyf.endPtsOfContours = endPtsOfContours;
    }

    // instructions
    length = reader.readUint16();
    if (length) {
      // range错误
      if (length < MAX_INSTRUCTION_LENGTH) {
        instructions = [];
        for (i = 0; i < length; ++i) {
          instructions.push(reader.readUint8());
        }
        glyf.instructions = instructions;
      } else {
        console.warn(length);
      }
    }
    parseSimpleGlyf(reader, glyf);
    delete glyf.endPtsOfContours;
  } else {
    parseCompoundGlyf(reader, glyf);
  }
  return glyf;
}
},{"../../enum/componentFlag":32,"../../enum/glyFlag":34}],78:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = sizeof;
var _glyFlag = _interopRequireDefault(require("../../enum/glyFlag"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 获取glyf的大小，同时对glyf写入进行预处理
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 获取glyf的大小
 *
 * @param {Object} glyf glyf对象
 * @param {Object} glyfSupport glyf相关统计
 * @param {boolean} hinting 是否保留hints
 * @return {number} size大小
 */
function sizeofSimple(glyf, glyfSupport, hinting) {
  // fixed header + endPtsOfContours
  var result = 12 + (glyf.contours || []).length * 2 + (glyfSupport.flags || []).length;
  (glyfSupport.xCoord || []).forEach(function (x) {
    result += 0 <= x && x <= 0xFF ? 1 : 2;
  });
  (glyfSupport.yCoord || []).forEach(function (y) {
    result += 0 <= y && y <= 0xFF ? 1 : 2;
  });
  return result + (hinting && glyf.instructions ? glyf.instructions.length : 0);
}

/**
 * 复合图元size
 *
 * @param {Object} glyf glyf对象
 * @param {boolean} hinting 是否保留hints, compound 图元暂时不做hinting
 * @return {number} size大小
 */
// eslint-disable-next-line no-unused-vars
function sizeofCompound(glyf, hinting) {
  var size = 10;
  var transform;
  glyf.glyfs.forEach(function (g) {
    transform = g.transform;
    // flags + glyfIndex
    size += 4;

    // a, b, c, d, e
    // xy values or points
    if (transform.e < 0 || transform.e > 0x7F || transform.f < 0 || transform.f > 0x7F) {
      size += 4;
    } else {
      size += 2;
    }

    // 01 , 10
    if (transform.b || transform.c) {
      size += 8;
    }
    // scale
    else if (transform.a !== 1 || transform.d !== 1) {
      size += transform.a === transform.d ? 2 : 4;
    }
  });
  return size;
}

/**
 * 获取flags
 *
 * @param {Object} glyf glyf对象
 * @param {Object} glyfSupport glyf相关统计
 * @return {Array}
 */
function getFlags(glyf, glyfSupport) {
  if (!glyf.contours || 0 === glyf.contours.length) {
    return glyfSupport;
  }
  var flags = [];
  var xCoord = [];
  var yCoord = [];
  var contours = glyf.contours;
  var contour;
  var prev;
  var first = true;
  for (var j = 0, cl = contours.length; j < cl; j++) {
    contour = contours[j];
    for (var i = 0, l = contour.length; i < l; i++) {
      var point = contour[i];
      if (first) {
        xCoord.push(point.x);
        yCoord.push(point.y);
        first = false;
      } else {
        xCoord.push(point.x - prev.x);
        yCoord.push(point.y - prev.y);
      }
      flags.push(point.onCurve ? _glyFlag["default"].ONCURVE : 0);
      prev = point;
    }
  }

  // compress
  var flagsC = [];
  var xCoordC = [];
  var yCoordC = [];
  var x;
  var y;
  var prevFlag;
  var repeatPoint = -1;
  flags.forEach(function (flag, index) {
    x = xCoord[index];
    y = yCoord[index];

    // 第一个
    if (index === 0) {
      if (-0xFF <= x && x <= 0xFF) {
        flag += _glyFlag["default"].XSHORT;
        if (x >= 0) {
          flag += _glyFlag["default"].XSAME;
        }
        x = Math.abs(x);
      }
      if (-0xFF <= y && y <= 0xFF) {
        flag += _glyFlag["default"].YSHORT;
        if (y >= 0) {
          flag += _glyFlag["default"].YSAME;
        }
        y = Math.abs(y);
      }
      flagsC.push(prevFlag = flag);
      xCoordC.push(x);
      yCoordC.push(y);
    }
    // 后续
    else {
      if (x === 0) {
        flag += _glyFlag["default"].XSAME;
      } else {
        if (-0xFF <= x && x <= 0xFF) {
          flag += _glyFlag["default"].XSHORT;
          if (x > 0) {
            flag += _glyFlag["default"].XSAME;
          }
          x = Math.abs(x);
        }
        xCoordC.push(x);
      }
      if (y === 0) {
        flag += _glyFlag["default"].YSAME;
      } else {
        if (-0xFF <= y && y <= 0xFF) {
          flag += _glyFlag["default"].YSHORT;
          if (y > 0) {
            flag += _glyFlag["default"].YSAME;
          }
          y = Math.abs(y);
        }
        yCoordC.push(y);
      }

      // repeat
      if (flag === prevFlag) {
        // 记录重复个数
        if (-1 === repeatPoint) {
          repeatPoint = flagsC.length - 1;
          flagsC[repeatPoint] |= _glyFlag["default"].REPEAT;
          flagsC.push(1);
        } else {
          ++flagsC[repeatPoint + 1];
        }
      } else {
        repeatPoint = -1;
        flagsC.push(prevFlag = flag);
      }
    }
  });
  glyfSupport.flags = flagsC;
  glyfSupport.xCoord = xCoordC;
  glyfSupport.yCoord = yCoordC;
  return glyfSupport;
}

/**
 * 对glyf数据进行预处理，获取大小
 *
 * @param  {Object} ttf ttf对象
 * @return {number} 大小
 */
function sizeof(ttf) {
  ttf.support.glyf = [];
  var tableSize = 0;
  var hinting = ttf.writeOptions ? ttf.writeOptions.hinting : false;
  ttf.glyf.forEach(function (glyf) {
    var glyfSupport = {};
    glyfSupport = glyf.compound ? glyfSupport : getFlags(glyf, glyfSupport);
    var glyfSize = glyf.compound ? sizeofCompound(glyf, hinting) : sizeofSimple(glyf, glyfSupport, hinting);
    var size = glyfSize;

    // 4字节对齐
    if (size % 4) {
      size += 4 - size % 4;
    }
    glyfSupport.glyfSize = glyfSize;
    glyfSupport.size = size;
    ttf.support.glyf.push(glyfSupport);
    tableSize += size;
  });
  ttf.support.glyf.tableSize = tableSize;

  // 写header的indexToLocFormat
  ttf.head.indexToLocFormat = tableSize > 65536 ? 1 : 0;
  return ttf.support.glyf.tableSize;
}
},{"../../enum/glyFlag":34}],79:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = write;
var _componentFlag = _interopRequireDefault(require("../../enum/componentFlag"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 写glyf数据
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 写glyf
 *
 * @param  {Object} writer 写入器
 * @param  {Object} ttf    ttf对象
 * @return {Object}        写入器
 */
function write(writer, ttf) {
  var hinting = ttf.writeOptions ? ttf.writeOptions.hinting : false;
  ttf.glyf.forEach(function (glyf, index) {
    // header
    writer.writeInt16(glyf.compound ? -1 : (glyf.contours || []).length);
    writer.writeInt16(glyf.xMin);
    writer.writeInt16(glyf.yMin);
    writer.writeInt16(glyf.xMax);
    writer.writeInt16(glyf.yMax);
    var i;
    var l;
    var flags;

    // 复合图元
    if (glyf.compound) {
      for (i = 0, l = glyf.glyfs.length; i < l; i++) {
        var g = glyf.glyfs[i];
        flags = g.points ? 0 : _componentFlag["default"].ARGS_ARE_XY_VALUES + _componentFlag["default"].ROUND_XY_TO_GRID; // xy values

        // more components
        if (i < l - 1) {
          flags += _componentFlag["default"].MORE_COMPONENTS;
        }

        // use my metrics
        flags += g.useMyMetrics ? _componentFlag["default"].USE_MY_METRICS : 0;
        // overlap compound
        flags += g.overlapCompound ? _componentFlag["default"].OVERLAP_COMPOUND : 0;
        var transform = g.transform;
        var a = transform.a;
        var b = transform.b;
        var c = transform.c;
        var d = transform.d;
        var e = g.points ? g.points[0] : transform.e;
        var f = g.points ? g.points[1] : transform.f;

        // xy values or points
        // int 8 放不下，则用int16放
        if (e < 0 || e > 0x7F || f < 0 || f > 0x7F) {
          flags += _componentFlag["default"].ARG_1_AND_2_ARE_WORDS;
        }
        if (b || c) {
          flags += _componentFlag["default"].WE_HAVE_A_TWO_BY_TWO;
        } else if ((a !== 1 || d !== 1) && a === d) {
          flags += _componentFlag["default"].WE_HAVE_A_SCALE;
        } else if (a !== 1 || d !== 1) {
          flags += _componentFlag["default"].WE_HAVE_AN_X_AND_Y_SCALE;
        }
        writer.writeUint16(flags);
        writer.writeUint16(g.glyphIndex);
        if (_componentFlag["default"].ARG_1_AND_2_ARE_WORDS & flags) {
          writer.writeInt16(e);
          writer.writeInt16(f);
        } else {
          writer.writeUint8(e);
          writer.writeUint8(f);
        }
        if (_componentFlag["default"].WE_HAVE_A_SCALE & flags) {
          writer.writeInt16(Math.round(a * 16384));
        } else if (_componentFlag["default"].WE_HAVE_AN_X_AND_Y_SCALE & flags) {
          writer.writeInt16(Math.round(a * 16384));
          writer.writeInt16(Math.round(d * 16384));
        } else if (_componentFlag["default"].WE_HAVE_A_TWO_BY_TWO & flags) {
          writer.writeInt16(Math.round(a * 16384));
          writer.writeInt16(Math.round(b * 16384));
          writer.writeInt16(Math.round(c * 16384));
          writer.writeInt16(Math.round(d * 16384));
        }
      }
    } else {
      var endPtsOfContours = -1;
      (glyf.contours || []).forEach(function (contour) {
        endPtsOfContours += contour.length;
        writer.writeUint16(endPtsOfContours);
      });

      // instruction
      if (hinting && glyf.instructions) {
        var instructions = glyf.instructions;
        writer.writeUint16(instructions.length);
        for (i = 0, l = instructions.length; i < l; i++) {
          writer.writeUint8(instructions[i]);
        }
      } else {
        writer.writeUint16(0);
      }

      // 获取暂存中的flags
      flags = ttf.support.glyf[index].flags || [];
      for (i = 0, l = flags.length; i < l; i++) {
        writer.writeUint8(flags[i]);
      }
      var xCoord = ttf.support.glyf[index].xCoord || [];
      for (i = 0, l = xCoord.length; i < l; i++) {
        if (0 <= xCoord[i] && xCoord[i] <= 0xFF) {
          writer.writeUint8(xCoord[i]);
        } else {
          writer.writeInt16(xCoord[i]);
        }
      }
      var yCoord = ttf.support.glyf[index].yCoord || [];
      for (i = 0, l = yCoord.length; i < l; i++) {
        if (0 <= yCoord[i] && yCoord[i] <= 0xFF) {
          writer.writeUint8(yCoord[i]);
        } else {
          writer.writeInt16(yCoord[i]);
        }
      }
    }

    // 4字节对齐
    var glyfSize = ttf.support.glyf[index].glyfSize;
    if (glyfSize % 4) {
      writer.writeEmpty(4 - glyfSize % 4);
    }
  });
  return writer;
}
},{"../../enum/componentFlag":32}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _struct = _interopRequireDefault(require("./struct"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file head表
 * @author mengke01(kekee000@gmail.com)
 */
var _default = _table["default"].create('head', [['version', _struct["default"].Fixed], ['fontRevision', _struct["default"].Fixed], ['checkSumAdjustment', _struct["default"].Uint32], ['magickNumber', _struct["default"].Uint32], ['flags', _struct["default"].Uint16], ['unitsPerEm', _struct["default"].Uint16], ['created', _struct["default"].LongDateTime], ['modified', _struct["default"].LongDateTime], ['xMin', _struct["default"].Int16], ['yMin', _struct["default"].Int16], ['xMax', _struct["default"].Int16], ['yMax', _struct["default"].Int16], ['macStyle', _struct["default"].Uint16], ['lowestRecPPEM', _struct["default"].Uint16], ['fontDirectionHint', _struct["default"].Int16], ['indexToLocFormat', _struct["default"].Int16], ['glyphDataFormat', _struct["default"].Int16]]);
exports["default"] = _default;
},{"./struct":89,"./table":92}],81:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _struct = _interopRequireDefault(require("./struct"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file hhea 表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6hhea.html
 */
var _default = _table["default"].create('hhea', [['version', _struct["default"].Fixed], ['ascent', _struct["default"].Int16], ['descent', _struct["default"].Int16], ['lineGap', _struct["default"].Int16], ['advanceWidthMax', _struct["default"].Uint16], ['minLeftSideBearing', _struct["default"].Int16], ['minRightSideBearing', _struct["default"].Int16], ['xMaxExtent', _struct["default"].Int16], ['caretSlopeRise', _struct["default"].Int16], ['caretSlopeRun', _struct["default"].Int16], ['caretOffset', _struct["default"].Int16], ['reserved0', _struct["default"].Int16], ['reserved1', _struct["default"].Int16], ['reserved2', _struct["default"].Int16], ['reserved3', _struct["default"].Int16], ['metricDataFormat', _struct["default"].Int16], ['numOfLongHorMetrics', _struct["default"].Uint16]]);
exports["default"] = _default;
},{"./struct":89,"./table":92}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file hmtx 表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6hmtx.html
 */
var _default = _table["default"].create('hmtx', [], {
  read: function read(reader, ttf) {
    var offset = this.offset;
    reader.seek(offset);
    var numOfLongHorMetrics = ttf.hhea.numOfLongHorMetrics;
    var hMetrics = [];
    var i;
    var hMetric;
    for (i = 0; i < numOfLongHorMetrics; ++i) {
      hMetric = {};
      hMetric.advanceWidth = reader.readUint16();
      hMetric.leftSideBearing = reader.readInt16();
      hMetrics.push(hMetric);
    }

    // 最后一个宽度
    var advanceWidth = hMetrics[numOfLongHorMetrics - 1].advanceWidth;
    var numOfLast = ttf.maxp.numGlyphs - numOfLongHorMetrics;

    // 获取后续的hmetrics
    for (i = 0; i < numOfLast; ++i) {
      hMetric = {};
      hMetric.advanceWidth = advanceWidth;
      hMetric.leftSideBearing = reader.readInt16();
      hMetrics.push(hMetric);
    }
    return hMetrics;
  },
  write: function write(writer, ttf) {
    var i;
    var numOfLongHorMetrics = ttf.hhea.numOfLongHorMetrics;
    for (i = 0; i < numOfLongHorMetrics; ++i) {
      writer.writeUint16(ttf.glyf[i].advanceWidth);
      writer.writeInt16(ttf.glyf[i].leftSideBearing);
    }

    // 最后一个宽度
    var numOfLast = ttf.glyf.length - numOfLongHorMetrics;
    for (i = 0; i < numOfLast; ++i) {
      writer.writeInt16(ttf.glyf[numOfLongHorMetrics + i].leftSideBearing);
    }
    return writer;
  },
  size: function size(ttf) {
    // 计算同最后一个advanceWidth相等的元素个数
    var numOfLast = 0;
    // 最后一个advanceWidth
    var advanceWidth = ttf.glyf[ttf.glyf.length - 1].advanceWidth;
    for (var i = ttf.glyf.length - 2; i >= 0; i--) {
      if (advanceWidth === ttf.glyf[i].advanceWidth) {
        numOfLast++;
      } else {
        break;
      }
    }
    ttf.hhea.numOfLongHorMetrics = ttf.glyf.length - numOfLast;
    return 4 * ttf.hhea.numOfLongHorMetrics + 2 * numOfLast;
  }
});
exports["default"] = _default;
},{"./table":92}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file kern
 * @author fr33z00(https://github.com/fr33z00)
 *
 * @reference: https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cvt.html
 */
var _default = _table["default"].create('kern', [], {
  read: function read(reader, ttf) {
    var length = ttf.tables.kern.length;
    return reader.readBytes(this.offset, length);
  },
  write: function write(writer, ttf) {
    if (ttf.kern) {
      writer.writeBytes(ttf.kern, ttf.kern.length);
    }
  },
  size: function size(ttf) {
    return ttf.kern ? ttf.kern.length : 0;
  }
});
exports["default"] = _default;
},{"./table":92}],84:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _struct = _interopRequireDefault(require("./struct"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file loca表
 * @author mengke01(kekee000@gmail.com)
 */
var _default = _table["default"].create('loca', [], {
  read: function read(reader, ttf) {
    var offset = this.offset;
    var indexToLocFormat = ttf.head.indexToLocFormat;
    // indexToLocFormat有2字节和4字节的区别
    var type = _struct["default"].names[indexToLocFormat === 0 ? _struct["default"].Uint16 : _struct["default"].Uint32];
    var size = indexToLocFormat === 0 ? 2 : 4; // 字节大小
    var sizeRatio = indexToLocFormat === 0 ? 2 : 1; // 真实地址偏移
    var wordOffset = [];
    reader.seek(offset);
    var numGlyphs = ttf.maxp.numGlyphs;
    for (var i = 0; i < numGlyphs; ++i) {
      wordOffset.push(reader.read(type, offset, false) * sizeRatio);
      offset += size;
    }
    return wordOffset;
  },
  write: function write(writer, ttf) {
    var glyfSupport = ttf.support.glyf;
    var offset = ttf.support.glyf.offset || 0;
    var indexToLocFormat = ttf.head.indexToLocFormat;
    var sizeRatio = indexToLocFormat === 0 ? 0.5 : 1;
    var numGlyphs = ttf.glyf.length;
    for (var i = 0; i < numGlyphs; ++i) {
      if (indexToLocFormat) {
        writer.writeUint32(offset);
      } else {
        writer.writeUint16(offset);
      }
      offset += glyfSupport[i].size * sizeRatio;
    }

    // write extra
    if (indexToLocFormat) {
      writer.writeUint32(offset);
    } else {
      writer.writeUint16(offset);
    }
    return writer;
  },
  size: function size(ttf) {
    var locaCount = ttf.glyf.length + 1;
    return ttf.head.indexToLocFormat ? locaCount * 4 : locaCount * 2;
  }
});
exports["default"] = _default;
},{"./struct":89,"./table":92}],85:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _struct = _interopRequireDefault(require("./struct"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file maxp 表
 * @author mengke01(kekee000@gmail.com)
 */
var _default = _table["default"].create('maxp', [['version', _struct["default"].Fixed], ['numGlyphs', _struct["default"].Uint16], ['maxPoints', _struct["default"].Uint16], ['maxContours', _struct["default"].Uint16], ['maxCompositePoints', _struct["default"].Uint16], ['maxCompositeContours', _struct["default"].Uint16], ['maxZones', _struct["default"].Uint16], ['maxTwilightPoints', _struct["default"].Uint16], ['maxStorage', _struct["default"].Uint16], ['maxFunctionDefs', _struct["default"].Uint16], ['maxInstructionDefs', _struct["default"].Uint16], ['maxStackElements', _struct["default"].Uint16], ['maxSizeOfInstructions', _struct["default"].Uint16], ['maxComponentElements', _struct["default"].Uint16], ['maxComponentDepth', _struct["default"].Int16]], {
  write: function write(writer, ttf) {
    _table["default"].write.call(this, writer, ttf.support);
    return writer;
  },
  size: function size() {
    return 32;
  }
});
exports["default"] = _default;
},{"./struct":89,"./table":92}],86:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _nameId = _interopRequireDefault(require("../enum/nameId"));
var _string = _interopRequireDefault(require("../util/string"));
var _platform = _interopRequireDefault(require("../enum/platform"));
var _encoding = require("../enum/encoding");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file name表
 * @author mengke01(kekee000@gmail.com)
 */
var _default = _table["default"].create('name', [], {
  read: function read(reader) {
    var offset = this.offset;
    reader.seek(offset);
    var nameTbl = {};
    nameTbl.format = reader.readUint16();
    nameTbl.count = reader.readUint16();
    nameTbl.stringOffset = reader.readUint16();
    var nameRecordTbl = [];
    var count = nameTbl.count;
    var i;
    var nameRecord;
    for (i = 0; i < count; ++i) {
      nameRecord = {};
      nameRecord.platform = reader.readUint16();
      nameRecord.encoding = reader.readUint16();
      nameRecord.language = reader.readUint16();
      nameRecord.nameId = reader.readUint16();
      nameRecord.length = reader.readUint16();
      nameRecord.offset = reader.readUint16();
      nameRecordTbl.push(nameRecord);
    }
    offset += nameTbl.stringOffset;

    // 读取字符名字
    for (i = 0; i < count; ++i) {
      nameRecord = nameRecordTbl[i];
      nameRecord.name = reader.readBytes(offset + nameRecord.offset, nameRecord.length);
    }
    var names = {};

    // mac 下的english name
    var platform = _platform["default"].Macintosh;
    var encoding = _encoding.mac.Default;
    var language = 0;

    // 如果有windows 下的 english，则用windows下的 name
    if (nameRecordTbl.some(function (record) {
      return record.platform === _platform["default"].Microsoft && record.encoding === _encoding.win.UCS2 && record.language === 1033;
    })) {
      platform = _platform["default"].Microsoft;
      encoding = _encoding.win.UCS2;
      language = 1033;
    }
    for (i = 0; i < count; ++i) {
      nameRecord = nameRecordTbl[i];
      if (nameRecord.platform === platform && nameRecord.encoding === encoding && nameRecord.language === language && _nameId["default"][nameRecord.nameId]) {
        names[_nameId["default"][nameRecord.nameId]] = language === 0 ? _string["default"].getUTF8String(nameRecord.name) : _string["default"].getUCS2String(nameRecord.name);
      }
    }
    return names;
  },
  write: function write(writer, ttf) {
    var nameRecordTbl = ttf.support.name;
    writer.writeUint16(0); // format
    writer.writeUint16(nameRecordTbl.length); // count
    writer.writeUint16(6 + nameRecordTbl.length * 12); // string offset

    // write name tbl header
    var offset = 0;
    nameRecordTbl.forEach(function (nameRecord) {
      writer.writeUint16(nameRecord.platform);
      writer.writeUint16(nameRecord.encoding);
      writer.writeUint16(nameRecord.language);
      writer.writeUint16(nameRecord.nameId);
      writer.writeUint16(nameRecord.name.length);
      writer.writeUint16(offset); // offset
      offset += nameRecord.name.length;
    });

    // write name tbl strings
    nameRecordTbl.forEach(function (nameRecord) {
      writer.writeBytes(nameRecord.name);
    });
    return writer;
  },
  size: function size(ttf) {
    var names = ttf.name;
    var nameRecordTbl = [];

    // 写入name信息
    // 这里为了简化书写，仅支持英文编码字符，
    // 中文编码字符将被转化成url encode
    var size = 6;
    Object.keys(names).forEach(function (name) {
      var id = _nameId["default"].names[name];
      var utf8Bytes = _string["default"].toUTF8Bytes(names[name]);
      var usc2Bytes = _string["default"].toUCS2Bytes(names[name]);
      if (undefined !== id) {
        // mac
        nameRecordTbl.push({
          nameId: id,
          platform: 1,
          encoding: 0,
          language: 0,
          name: utf8Bytes
        });

        // windows
        nameRecordTbl.push({
          nameId: id,
          platform: 3,
          encoding: 1,
          language: 1033,
          name: usc2Bytes
        });

        // 子表大小
        size += 12 * 2 + utf8Bytes.length + usc2Bytes.length;
      }
    });
    var namingOrder = ['platform', 'encoding', 'language', 'nameId'];
    nameRecordTbl = nameRecordTbl.sort(function (a, b) {
      var l = 0;
      namingOrder.some(function (name) {
        var o = a[name] - b[name];
        if (o) {
          l = o;
          return true;
        }
        return false;
      });
      return l;
    });

    // 保存预处理信息
    ttf.support.name = nameRecordTbl;
    return size;
  }
});
exports["default"] = _default;
},{"../enum/encoding":33,"../enum/nameId":35,"../enum/platform":36,"../util/string":114,"./table":92}],87:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
var _struct = _interopRequireDefault(require("./struct"));
var _string = _interopRequireDefault(require("../util/string"));
var _unicodeName = _interopRequireDefault(require("../enum/unicodeName"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file post 表
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6post.html
 */

var Posthead = _table["default"].create('posthead', [['format', _struct["default"].Fixed], ['italicAngle', _struct["default"].Fixed], ['underlinePosition', _struct["default"].Int16], ['underlineThickness', _struct["default"].Int16], ['isFixedPitch', _struct["default"].Uint32], ['minMemType42', _struct["default"].Uint32], ['maxMemType42', _struct["default"].Uint32], ['minMemType1', _struct["default"].Uint32], ['maxMemType1', _struct["default"].Uint32]]);
var _default = _table["default"].create('post', [], {
  read: function read(reader, ttf) {
    var format = reader.readFixed(this.offset);
    // 读取表头
    var tbl = new Posthead(this.offset).read(reader, ttf);

    // format2
    if (format === 2) {
      var numberOfGlyphs = reader.readUint16();
      var glyphNameIndex = [];
      for (var i = 0; i < numberOfGlyphs; ++i) {
        glyphNameIndex.push(reader.readUint16());
      }
      var pascalStringOffset = reader.offset;
      var pascalStringLength = ttf.tables.post.length - (pascalStringOffset - this.offset);
      var pascalStringBytes = reader.readBytes(reader.offset, pascalStringLength);
      tbl.nameIndex = glyphNameIndex; // 设置glyf名字索引
      tbl.names = _string["default"].getPascalString(pascalStringBytes); // glyf名字数组
    }
    // deprecated
    else if (format === 2.5) {
      tbl.format = 3;
    }
    return tbl;
  },
  write: function write(writer, ttf) {
    var post = ttf.post || {
      format: 3
    };

    // write header
    writer.writeFixed(post.format); // format
    writer.writeFixed(post.italicAngle || 0); // italicAngle
    writer.writeInt16(post.underlinePosition || 0); // underlinePosition
    writer.writeInt16(post.underlineThickness || 0); // underlineThickness
    writer.writeUint32(post.isFixedPitch || 0); // isFixedPitch
    writer.writeUint32(post.minMemType42 || 0); // minMemType42
    writer.writeUint32(post.maxMemType42 || 0); // maxMemType42
    writer.writeUint32(post.minMemType1 || 0); // minMemType1
    writer.writeUint32(post.maxMemType1 || 0); // maxMemType1

    // version 3 不设置post信息
    if (post.format === 2) {
      var numberOfGlyphs = ttf.glyf.length;
      writer.writeUint16(numberOfGlyphs); // numberOfGlyphs
      // write glyphNameIndex
      var nameIndex = ttf.support.post.nameIndex;
      for (var i = 0, l = nameIndex.length; i < l; i++) {
        writer.writeUint16(nameIndex[i]);
      }

      // write names
      ttf.support.post.names.forEach(function (name) {
        writer.writeBytes(name);
      });
    }
  },
  size: function size(ttf) {
    var numberOfGlyphs = ttf.glyf.length;
    ttf.post = ttf.post || {};
    ttf.post.format = ttf.post.format || 3;
    ttf.post.maxMemType1 = numberOfGlyphs;

    // version 3 不设置post信息
    if (ttf.post.format === 3 || ttf.post.format === 1) {
      return 32;
    }

    // version 2
    var size = 34 + numberOfGlyphs * 2; // header + numberOfGlyphs + numberOfGlyphs * 2
    var glyphNames = [];
    var nameIndexArr = [];
    var nameIndex = 0;

    // 获取 name的大小
    for (var i = 0; i < numberOfGlyphs; i++) {
      // .notdef
      if (i === 0) {
        nameIndexArr.push(0);
      } else {
        var glyf = ttf.glyf[i];
        var unicode = glyf.unicode ? glyf.unicode[0] : 0;
        var unicodeNameIndex = _unicodeName["default"][unicode];
        if (undefined !== unicodeNameIndex) {
          nameIndexArr.push(unicodeNameIndex);
        } else {
          // 这里需要注意，"" 有可能是"\3" length不为0，但是是空字符串
          var name = glyf.name;
          if (!name || name.charCodeAt(0) < 32) {
            nameIndexArr.push(258 + nameIndex++);
            glyphNames.push([0]);
            size++;
          } else {
            nameIndexArr.push(258 + nameIndex++);
            var bytes = _string["default"].toPascalStringBytes(name); // pascal string bytes
            glyphNames.push(bytes);
            size += bytes.length;
          }
        }
      }
    }
    ttf.support.post = {
      nameIndex: nameIndexArr,
      names: glyphNames
    };
    return size;
  }
});
exports["default"] = _default;
},{"../enum/unicodeName":38,"../util/string":114,"./struct":89,"./table":92}],88:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _table = _interopRequireDefault(require("./table"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file prep表
 * @author mengke01(kekee000@gmail.com)
 *
 * @reference: http://www.microsoft.com/typography/otspec140/prep.htm
 */
var _default = _table["default"].create('prep', [], {
  read: function read(reader, ttf) {
    var length = ttf.tables.prep.length;
    return reader.readBytes(this.offset, length);
  },
  write: function write(writer, ttf) {
    if (ttf.prep) {
      writer.writeBytes(ttf.prep, ttf.prep.length);
    }
  },
  size: function size(ttf) {
    return ttf.prep ? ttf.prep.length : 0;
  }
});
exports["default"] = _default;
},{"./table":92}],89:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
/**
 * @file ttf基本数据结构
 * @author mengke01(kekee000@gmail.com)
 *
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6.html
 */

var struct = {
  Int8: 1,
  Uint8: 2,
  Int16: 3,
  Uint16: 4,
  Int32: 5,
  Uint32: 6,
  Fixed: 7,
  // 32-bit signed fixed-point number (16.16)
  FUnit: 8,
  // Smallest measurable distance in the em space
  // 16-bit signed fixed number with the low 14 bits of fraction
  F2Dot14: 11,
  // The long internal format of a date in seconds since 12:00 midnight,
  // January 1, 1904. It is represented as a signed 64-bit integer.
  LongDateTime: 12,
  // extend data type
  Char: 13,
  String: 14,
  Bytes: 15,
  Uint24: 20
};

// 反转名字查找
var names = {};
Object.keys(struct).forEach(function (key) {
  names[struct[key]] = key;
});
struct.names = names;
var _default = struct;
exports["default"] = _default;
},{}],90:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _head = _interopRequireDefault(require("./head"));
var _maxp = _interopRequireDefault(require("./maxp"));
var _cmap = _interopRequireDefault(require("./cmap"));
var _name = _interopRequireDefault(require("./name"));
var _hhea = _interopRequireDefault(require("./hhea"));
var _hmtx = _interopRequireDefault(require("./hmtx"));
var _post = _interopRequireDefault(require("./post"));
var _OS = _interopRequireDefault(require("./OS2"));
var _CFF = _interopRequireDefault(require("./CFF"));
var _GPOS = _interopRequireDefault(require("./GPOS"));
var _kern = _interopRequireDefault(require("./kern"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file otf字体格式支持的表
 * @author mengke01(kekee000@gmail.com)
 */
var _default = {
  head: _head["default"],
  maxp: _maxp["default"],
  cmap: _cmap["default"],
  name: _name["default"],
  hhea: _hhea["default"],
  hmtx: _hmtx["default"],
  post: _post["default"],
  'OS/2': _OS["default"],
  CFF: _CFF["default"],
  GPOS: _GPOS["default"],
  kern: _kern["default"]
};
exports["default"] = _default;
},{"./CFF":58,"./GPOS":59,"./OS2":60,"./cmap":68,"./head":80,"./hhea":81,"./hmtx":82,"./kern":83,"./maxp":85,"./name":86,"./post":87}],91:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _head = _interopRequireDefault(require("./head"));
var _maxp = _interopRequireDefault(require("./maxp"));
var _loca = _interopRequireDefault(require("./loca"));
var _cmap = _interopRequireDefault(require("./cmap"));
var _glyf = _interopRequireDefault(require("./glyf"));
var _name = _interopRequireDefault(require("./name"));
var _hhea = _interopRequireDefault(require("./hhea"));
var _hmtx = _interopRequireDefault(require("./hmtx"));
var _post = _interopRequireDefault(require("./post"));
var _OS = _interopRequireDefault(require("./OS2"));
var _fpgm = _interopRequireDefault(require("./fpgm"));
var _cvt = _interopRequireDefault(require("./cvt"));
var _prep = _interopRequireDefault(require("./prep"));
var _gasp = _interopRequireDefault(require("./gasp"));
var _GPOS = _interopRequireDefault(require("./GPOS"));
var _kern = _interopRequireDefault(require("./kern"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf读取和写入支持的表
 * @author mengke01(kekee000@gmail.com)
 */
var _default = {
  head: _head["default"],
  maxp: _maxp["default"],
  loca: _loca["default"],
  cmap: _cmap["default"],
  glyf: _glyf["default"],
  name: _name["default"],
  hhea: _hhea["default"],
  hmtx: _hmtx["default"],
  post: _post["default"],
  'OS/2': _OS["default"],
  fpgm: _fpgm["default"],
  cvt: _cvt["default"],
  prep: _prep["default"],
  gasp: _gasp["default"],
  GPOS: _GPOS["default"],
  kern: _kern["default"]
};
exports["default"] = _default;
},{"./GPOS":59,"./OS2":60,"./cmap":68,"./cvt":72,"./fpgm":74,"./gasp":75,"./glyf":76,"./head":80,"./hhea":81,"./hmtx":82,"./kern":83,"./loca":84,"./maxp":85,"./name":86,"./post":87,"./prep":88}],92:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _struct = _interopRequireDefault(require("./struct"));
var _error = _interopRequireDefault(require("../error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
/* eslint-disable no-invalid-this */
/**
 * 读取表结构
 *
 * @param {Reader} reader reader对象
 * @return {Object} 当前对象
 */
function read(reader) {
  var offset = this.offset;
  if (undefined !== offset) {
    reader.seek(offset);
  }
  var me = this;
  this.struct.forEach(function (item) {
    var name = item[0];
    var type = item[1];
    var typeName = null;
    switch (type) {
      case _struct["default"].Int8:
      case _struct["default"].Uint8:
      case _struct["default"].Int16:
      case _struct["default"].Uint16:
      case _struct["default"].Int32:
      case _struct["default"].Uint32:
        typeName = _struct["default"].names[type];
        me[name] = reader.read(typeName);
        break;
      case _struct["default"].Fixed:
        me[name] = reader.readFixed();
        break;
      case _struct["default"].LongDateTime:
        me[name] = reader.readLongDateTime();
        break;
      case _struct["default"].Bytes:
        me[name] = reader.readBytes(reader.offset, item[2] || 0);
        break;
      case _struct["default"].Char:
        me[name] = reader.readChar();
        break;
      case _struct["default"].String:
        me[name] = reader.readString(reader.offset, item[2] || 0);
        break;
      default:
        _error["default"].raise(10003, name, type);
    }
  });
  return this.valueOf();
}

/**
 * 写表结构
 *
 * @param {Object} writer writer对象
 * @param {Object} ttf 已解析的ttf对象
 *
 * @return {Writer} 返回writer对象
 */
function write(writer, ttf) {
  var table = ttf[this.name];
  if (!table) {
    _error["default"].raise(10203, this.name);
  }
  this.struct.forEach(function (item) {
    var name = item[0];
    var type = item[1];
    var typeName = null;
    switch (type) {
      case _struct["default"].Int8:
      case _struct["default"].Uint8:
      case _struct["default"].Int16:
      case _struct["default"].Uint16:
      case _struct["default"].Int32:
      case _struct["default"].Uint32:
        typeName = _struct["default"].names[type];
        writer.write(typeName, table[name]);
        break;
      case _struct["default"].Fixed:
        writer.writeFixed(table[name]);
        break;
      case _struct["default"].LongDateTime:
        writer.writeLongDateTime(table[name]);
        break;
      case _struct["default"].Bytes:
        writer.writeBytes(table[name], item[2] || 0);
        break;
      case _struct["default"].Char:
        writer.writeChar(table[name]);
        break;
      case _struct["default"].String:
        writer.writeString(table[name], item[2] || 0);
        break;
      default:
        _error["default"].raise(10003, name, type);
    }
  });
  return writer;
}

/**
 * 获取ttf表的size大小
 *
 * @param {string} name 表名
 * @return {number} 表大小
 */
function size() {
  var sz = 0;
  this.struct.forEach(function (item) {
    var type = item[1];
    switch (type) {
      case _struct["default"].Int8:
      case _struct["default"].Uint8:
        sz += 1;
        break;
      case _struct["default"].Int16:
      case _struct["default"].Uint16:
        sz += 2;
        break;
      case _struct["default"].Int32:
      case _struct["default"].Uint32:
      case _struct["default"].Fixed:
        sz += 4;
        break;
      case _struct["default"].LongDateTime:
        sz += 8;
        break;
      case _struct["default"].Bytes:
        sz += item[2] || 0;
        break;
      case _struct["default"].Char:
        sz += 1;
        break;
      case _struct["default"].String:
        sz += item[2] || 0;
        break;
      default:
        _error["default"].raise(10003, name, type);
    }
  });
  return sz;
}

/**
 * 获取对象的值
 *
 * @return {*} 当前对象的值
 */
function valueOf() {
  var val = {};
  var me = this;
  this.struct.forEach(function (item) {
    val[item[0]] = me[item[0]];
  });
  return val;
}
var _default = {
  read: read,
  write: write,
  size: size,
  valueOf: valueOf,
  /**
   * 创建一个表结构
   *
   * @param {string} name 表名
   * @param {Object} struct 表结构
   * @param {Object} prototype 原型
   * @return {Function} 表构造函数
   */
  create: function create(name, struct, prototype) {
    var Table = /*#__PURE__*/_createClass(function Table(offset) {
      _classCallCheck(this, Table);
      this.name = name;
      this.struct = struct;
      this.offset = offset;
    });
    Table.prototype.read = read;
    Table.prototype.write = write;
    Table.prototype.size = size;
    Table.prototype.valueOf = valueOf;
    Object.assign(Table.prototype, prototype);
    return Table;
  }
};
exports["default"] = _default;
},{"../error":41,"./struct":89}],93:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _lang = require("../common/lang");
var _string = _interopRequireDefault(require("./util/string"));
var _pathAdjust = _interopRequireDefault(require("../graphics/pathAdjust"));
var _pathCeil = _interopRequireDefault(require("../graphics/pathCeil"));
var _computeBoundingBox = require("../graphics/computeBoundingBox");
var _compound2simpleglyf = _interopRequireDefault(require("./util/compound2simpleglyf"));
var _glyfAdjust = _interopRequireDefault(require("./util/glyfAdjust"));
var _optimizettf = _interopRequireDefault(require("./util/optimizettf"));
var _default = _interopRequireDefault(require("./data/default"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
/**
 * 缩放到EM框
 *
 * @param {Array} glyfList glyf列表
 * @param {number} ascent 上升
 * @param {number} descent 下降
 * @param {number} ajdustToEmPadding  顶部和底部留白
 * @return {Array} glyfList
 */
function adjustToEmBox(glyfList, ascent, descent, ajdustToEmPadding) {
  glyfList.forEach(function (g) {
    if (g.contours && g.contours.length) {
      var rightSideBearing = g.advanceWidth - g.xMax;
      var bound = _computeBoundingBox.computePath.apply(void 0, _toConsumableArray(g.contours));
      var scale = (ascent - descent - ajdustToEmPadding) / bound.height;
      var center = (ascent + descent) / 2;
      var yOffset = center - (bound.y + bound.height / 2) * scale;
      g.contours.forEach(function (contour) {
        if (scale !== 1) {
          (0, _pathAdjust["default"])(contour, scale, scale);
        }
        (0, _pathAdjust["default"])(contour, 1, 1, 0, yOffset);
        (0, _pathCeil["default"])(contour);
      });
      var box = _computeBoundingBox.computePathBox.apply(void 0, _toConsumableArray(g.contours));
      g.xMin = box.x;
      g.xMax = box.x + box.width;
      g.yMin = box.y;
      g.yMax = box.y + box.height;
      g.leftSideBearing = g.xMin;
      g.advanceWidth = g.xMax + rightSideBearing;
    }
  });
  return glyfList;
}

/**
 * 调整字形位置
 *
 * @param {Array} glyfList 字形列表
 * @param {number=} leftSideBearing 左边距
 * @param {number=} rightSideBearing 右边距
 * @param {number=} verticalAlign 垂直对齐
 *
 * @return {Array} 改变的列表
 */
function adjustPos(glyfList, leftSideBearing, rightSideBearing, verticalAlign) {
  var changed = false;

  // 左边轴
  if (null != leftSideBearing) {
    changed = true;
    glyfList.forEach(function (g) {
      if (g.leftSideBearing !== leftSideBearing) {
        (0, _glyfAdjust["default"])(g, 1, 1, leftSideBearing - g.leftSideBearing);
      }
    });
  }

  // 右边轴
  if (null != rightSideBearing) {
    changed = true;
    glyfList.forEach(function (g) {
      g.advanceWidth = g.xMax + rightSideBearing;
    });
  }

  // 基线高度
  if (null != verticalAlign) {
    changed = true;
    glyfList.forEach(function (g) {
      if (g.contours && g.contours.length) {
        var bound = _computeBoundingBox.computePath.apply(void 0, _toConsumableArray(g.contours));
        var offset = verticalAlign - bound.y;
        (0, _glyfAdjust["default"])(g, 1, 1, 0, offset);
      }
    });
  }
  return changed ? glyfList : [];
}

/**
 * 合并两个ttfObject，此处仅合并简单字形
 *
 * @param {Object} ttf ttfObject
 * @param {Object} imported ttfObject
 * @param {Object} options 参数选项
 * @param {boolean} options.scale 是否自动缩放，默认true
 * @param {boolean} options.adjustGlyf 是否调整字形以适应边界
 *                                     (与 options.scale 互斥)
 *
 * @return {Object} 合并后的ttfObject
 */
function merge(ttf, imported) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
    scale: true
  };
  var list = imported.glyf.filter(function (g) {
    return (
      // 简单轮廓
      g.contours && g.contours.length
      // 非预定义字形
      && g.name !== '.notdef' && g.name !== '.null' && g.name !== 'nonmarkingreturn'
    );
  });

  // 调整字形以适应边界
  if (options.adjustGlyf) {
    var ascent = ttf.hhea.ascent;
    var descent = ttf.hhea.descent;
    var ajdustToEmPadding = 16;
    adjustPos(list, 16, 16);
    adjustToEmBox(list, ascent, descent, ajdustToEmPadding);
    list.forEach(function (g) {
      ttf.glyf.push(g);
    });
  }
  // 根据unitsPerEm 进行缩放
  else if (options.scale) {
    var scale = 1;

    // 调整glyf对导入的轮廓进行缩放处理
    if (imported.head.unitsPerEm && imported.head.unitsPerEm !== ttf.head.unitsPerEm) {
      scale = ttf.head.unitsPerEm / imported.head.unitsPerEm;
    }
    list.forEach(function (g) {
      (0, _glyfAdjust["default"])(g, scale, scale);
      ttf.glyf.push(g);
    });
  }
  return list;
}
var TTF = /*#__PURE__*/function () {
  /**
   * ttf读取函数
   *
   * @constructor
   * @param {Object} ttf ttf文件结构
   */
  function TTF(ttf) {
    _classCallCheck(this, TTF);
    this.ttf = ttf;
  }

  /**
   * 获取所有的字符信息
   *
   * @return {Object} 字符信息
   */
  _createClass(TTF, [{
    key: "codes",
    value: function codes() {
      return Object.keys(this.ttf.cmap);
    }

    /**
     * 根据编码获取字形索引
     *
     * @param {string} c 字符或者字符编码
     *
     * @return {?number} 返回glyf索引号
     */
  }, {
    key: "getGlyfIndexByCode",
    value: function getGlyfIndexByCode(c) {
      var charCode = typeof c === 'number' ? c : c.codePointAt(0);
      var glyfIndex = this.ttf.cmap[charCode] || -1;
      return glyfIndex;
    }

    /**
     * 根据索引获取字形
     *
     * @param {number} glyfIndex glyf的索引
     *
     * @return {?Object} 返回glyf对象
     */
  }, {
    key: "getGlyfByIndex",
    value: function getGlyfByIndex(glyfIndex) {
      var glyfList = this.ttf.glyf;
      var glyf = glyfList[glyfIndex];
      return glyf;
    }

    /**
     * 根据编码获取字形
     *
     * @param {string} c 字符或者字符编码
     *
     * @return {?Object} 返回glyf对象
     */
  }, {
    key: "getGlyfByCode",
    value: function getGlyfByCode(c) {
      var glyfIndex = this.getGlyfIndexByCode(c);
      return this.getGlyfByIndex(glyfIndex);
    }

    /**
     * 设置ttf对象
     *
     * @param {Object} ttf ttf对象
     * @return {this}
     */
  }, {
    key: "set",
    value: function set(ttf) {
      this.ttf = ttf;
      return this;
    }

    /**
     * 获取ttf对象
     *
     * @return {ttfObject} ttf ttf对象
     */
  }, {
    key: "get",
    value: function get() {
      return this.ttf;
    }

    /**
     * 添加glyf
     *
     * @param {Object} glyf glyf对象
     *
     * @return {number} 添加的glyf
     */
  }, {
    key: "addGlyf",
    value: function addGlyf(glyf) {
      return this.insertGlyf(glyf);
    }

    /**
     * 插入glyf
     *
     * @param {Object} glyf glyf对象
     * @param {Object} insertIndex 插入的索引
     * @return {number} 添加的glyf
     */
  }, {
    key: "insertGlyf",
    value: function insertGlyf(glyf, insertIndex) {
      if (insertIndex >= 0 && insertIndex < this.ttf.glyf.length) {
        this.ttf.glyf.splice(insertIndex, 0, glyf);
      } else {
        this.ttf.glyf.push(glyf);
      }
      return [glyf];
    }

    /**
     * 合并两个ttfObject，此处仅合并简单字形
     *
     * @param {Object} imported ttfObject
     * @param {Object} options 参数选项
     * @param {boolean} options.scale 是否自动缩放
     * @param {boolean} options.adjustGlyf 是否调整字形以适应边界
     *                                     (和 options.scale 参数互斥)
     *
     * @return {Array} 添加的glyf
     */
  }, {
    key: "mergeGlyf",
    value: function mergeGlyf(imported, options) {
      var list = merge(this.ttf, imported, options);
      return list;
    }

    /**
     * 删除指定字形
     *
     * @param {Array} indexList 索引列表
     * @return {Array} 删除的glyf
     */
  }, {
    key: "removeGlyf",
    value: function removeGlyf(indexList) {
      var glyf = this.ttf.glyf;
      var removed = [];
      for (var i = glyf.length - 1; i >= 0; i--) {
        if (indexList.indexOf(i) >= 0) {
          removed.push(glyf[i]);
          glyf.splice(i, 1);
        }
      }
      return removed;
    }

    /**
     * 设置unicode代码
     *
     * @param {string} unicode unicode代码 $E021, $22
     * @param {Array=} indexList 索引列表
     * @param {boolean} isGenerateName 是否生成name
     * @return {Array} 改变的glyf
     */
  }, {
    key: "setUnicode",
    value: function setUnicode(unicode, indexList, isGenerateName) {
      var glyf = this.ttf.glyf;
      var list = [];
      if (indexList && indexList.length) {
        var first = indexList.indexOf(0);
        if (first >= 0) {
          indexList.splice(first, 1);
        }
        list = indexList.map(function (item) {
          return glyf[item];
        });
      } else {
        list = glyf.slice(1);
      }

      // 需要选出 unicode >32 的glyf
      if (list.length > 1) {
        var less32 = function less32(u) {
          return u < 33;
        };
        list = list.filter(function (g) {
          return !g.unicode || !g.unicode.some(less32);
        });
      }
      if (list.length) {
        unicode = Number('0x' + unicode.slice(1));
        list.forEach(function (g) {
          // 空格有可能会放入 nonmarkingreturn 因此不做编码
          if (unicode === 0xA0 || unicode === 0x3000) {
            unicode++;
          }
          g.unicode = [unicode];
          if (isGenerateName) {
            g.name = _string["default"].getUnicodeName(unicode);
          }
          unicode++;
        });
      }
      return list;
    }

    /**
     * 生成字形名称
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} 改变的glyf
     */
  }, {
    key: "genGlyfName",
    value: function genGlyfName(indexList) {
      var glyf = this.ttf.glyf;
      var list = [];
      if (indexList && indexList.length) {
        list = indexList.map(function (item) {
          return glyf[item];
        });
      } else {
        list = glyf;
      }
      if (list.length) {
        var first = this.ttf.glyf[0];
        list.forEach(function (g) {
          if (g === first) {
            g.name = '.notdef';
          } else if (g.unicode && g.unicode.length) {
            g.name = _string["default"].getUnicodeName(g.unicode[0]);
          } else {
            g.name = '.notdef';
          }
        });
      }
      return list;
    }

    /**
     * 清除字形名称
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} 改变的glyf
     */
  }, {
    key: "clearGlyfName",
    value: function clearGlyfName(indexList) {
      var glyf = this.ttf.glyf;
      var list = [];
      if (indexList && indexList.length) {
        list = indexList.map(function (item) {
          return glyf[item];
        });
      } else {
        list = glyf;
      }
      if (list.length) {
        list.forEach(function (g) {
          delete g.name;
        });
      }
      return list;
    }

    /**
     * 添加并体替换指定的glyf
     *
     * @param {Array} glyfList 添加的列表
     * @param {Array=} indexList 需要替换的索引列表
     * @return {Array} 改变的glyf
     */
  }, {
    key: "appendGlyf",
    value: function appendGlyf(glyfList, indexList) {
      var glyf = this.ttf.glyf;
      var result = glyfList.slice(0);
      if (indexList && indexList.length) {
        var l = Math.min(glyfList.length, indexList.length);
        for (var i = 0; i < l; i++) {
          glyf[indexList[i]] = glyfList[i];
        }
        glyfList = glyfList.slice(l);
      }
      if (glyfList.length) {
        Array.prototype.splice.apply(glyf, [glyf.length, 0].concat(_toConsumableArray(glyfList)));
      }
      return result;
    }

    /**
     * 调整glyf位置
     *
     * @param {Array=} indexList 索引列表
     * @param {Object} setting 选项
     * @param {number=} setting.leftSideBearing 左边距
     * @param {number=} setting.rightSideBearing 右边距
     * @param {number=} setting.verticalAlign 垂直对齐
     * @return {Array} 改变的glyf
     */
  }, {
    key: "adjustGlyfPos",
    value: function adjustGlyfPos(indexList, setting) {
      var glyfList = this.getGlyf(indexList);
      return adjustPos(glyfList, setting.leftSideBearing, setting.rightSideBearing, setting.verticalAlign);
    }

    /**
     * 调整glyf
     *
     * @param {Array=} indexList 索引列表
     * @param {Object} setting 选项
     * @param {boolean=} setting.reverse 字形反转操作
     * @param {boolean=} setting.mirror 字形镜像操作
     * @param {number=} setting.scale 字形缩放
     * @param {boolean=} setting.ajdustToEmBox  是否调整字形到 em 框
     * @param {number=} setting.ajdustToEmPadding 调整到 em 框的留白
     * @return {boolean}
     */
  }, {
    key: "adjustGlyf",
    value: function adjustGlyf(indexList, setting) {
      var glyfList = this.getGlyf(indexList);
      var changed = false;
      if (setting.reverse || setting.mirror) {
        changed = true;
        glyfList.forEach(function (g) {
          if (g.contours && g.contours.length) {
            var offsetX = g.xMax + g.xMin;
            var offsetY = g.yMax + g.yMin;
            g.contours.forEach(function (contour) {
              (0, _pathAdjust["default"])(contour, setting.mirror ? -1 : 1, setting.reverse ? -1 : 1);
              (0, _pathAdjust["default"])(contour, 1, 1, setting.mirror ? offsetX : 0, setting.reverse ? offsetY : 0);
            });
          }
        });
      }
      if (setting.scale && setting.scale !== 1) {
        changed = true;
        var scale = setting.scale;
        glyfList.forEach(function (g) {
          if (g.contours && g.contours.length) {
            (0, _glyfAdjust["default"])(g, scale, scale);
          }
        });
      }
      // 缩放到embox
      else if (setting.ajdustToEmBox) {
        changed = true;
        var ascent = this.ttf.hhea.ascent;
        var descent = this.ttf.hhea.descent;
        var ajdustToEmPadding = 2 * (setting.ajdustToEmPadding || 0);
        adjustToEmBox(glyfList, ascent, descent, ajdustToEmPadding);
      }
      return changed ? glyfList : [];
    }

    /**
     * 获取glyf列表
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} glyflist
     */
  }, {
    key: "getGlyf",
    value: function getGlyf(indexList) {
      var glyf = this.ttf.glyf;
      if (indexList && indexList.length) {
        return indexList.map(function (item) {
          return glyf[item];
        });
      }
      return glyf;
    }

    /**
     * 查找相关字形
     *
     * @param  {Object} condition 查询条件
     * @param  {Array|number} condition.unicode unicode编码列表或者单个unicode编码
     * @param  {string} condition.name glyf名字，例如`uniE001`, `uniE`
     * @param  {Function} condition.filter 自定义过滤器
     * @example
     *     condition.filter = function (glyf) {
     *         return glyf.name === 'logo';
     *     }
     * @return {Array}  glyf字形索引列表
     */
  }, {
    key: "findGlyf",
    value: function findGlyf(condition) {
      if (!condition) {
        return [];
      }
      var filters = [];

      // 按unicode数组查找
      if (condition.unicode) {
        var unicodeList = Array.isArray(condition.unicode) ? condition.unicode : [condition.unicode];
        var unicodeHash = {};
        unicodeList.forEach(function (unicode) {
          if (typeof unicode === 'string') {
            unicode = Number('0x' + unicode.slice(1));
          }
          unicodeHash[unicode] = true;
        });
        filters.push(function (glyf) {
          if (!glyf.unicode || !glyf.unicode.length) {
            return false;
          }
          for (var i = 0, l = glyf.unicode.length; i < l; i++) {
            if (unicodeHash[glyf.unicode[i]]) {
              return true;
            }
          }
        });
      }

      // 按名字查找
      if (condition.name) {
        var name = condition.name;
        filters.push(function (glyf) {
          return glyf.name && glyf.name.indexOf(name) === 0;
        });
      }

      // 按筛选函数查找
      if (typeof condition.filter === 'function') {
        filters.push(condition.filter);
      }
      var indexList = [];
      this.ttf.glyf.forEach(function (glyf, index) {
        for (var filterIndex = 0, filter; filter = filters[filterIndex++];) {
          if (true === filter(glyf)) {
            indexList.push(index);
            break;
          }
        }
      });
      return indexList;
    }

    /**
     * 更新指定的glyf
     *
     * @param {Object} glyf glyfobject
     * @param {string} index 需要替换的索引列表
     * @return {Array} 改变的glyf
     */
  }, {
    key: "replaceGlyf",
    value: function replaceGlyf(glyf, index) {
      if (index >= 0 && index < this.ttf.glyf.length) {
        this.ttf.glyf[index] = glyf;
        return [glyf];
      }
      return [];
    }

    /**
     * 设置glyf
     *
     * @param {Array} glyfList glyf列表
     * @return {Array} 设置的glyf列表
     */
  }, {
    key: "setGlyf",
    value: function setGlyf(glyfList) {
      delete this.glyf;
      this.ttf.glyf = glyfList || [];
      return this.ttf.glyf;
    }

    /**
     * 对字形按照unicode编码排序，此处不对复合字形进行排序，如果存在复合字形, 不进行排序
     *
     * @param {Array} glyfList glyf列表
     * @return {Array} 设置的glyf列表
     */
  }, {
    key: "sortGlyf",
    value: function sortGlyf() {
      var glyf = this.ttf.glyf;
      if (glyf.length > 1) {
        // 如果存在复合字形则退出
        if (glyf.some(function (a) {
          return a.compound;
        })) {
          return -2;
        }
        var notdef = glyf.shift();
        // 按代码点排序, 首先将空字形排到最后，然后按照unicode第一个编码进行排序
        glyf.sort(function (a, b) {
          if ((!a.unicode || !a.unicode.length) && (!b.unicode || !b.unicode.length)) {
            return 0;
          } else if ((!a.unicode || !a.unicode.length) && b.unicode) {
            return 1;
          } else if (a.unicode && (!b.unicode || !b.unicode.length)) {
            return -1;
          }
          return Math.min.apply(null, a.unicode) - Math.min.apply(null, b.unicode);
        });
        glyf.unshift(notdef);
        return glyf;
      }
      return -1;
    }

    /**
     * 设置名字
     *
     * @param {string} name 名字字段
     * @return {Object} 名字对象
     */
  }, {
    key: "setName",
    value: function setName(name) {
      if (name) {
        this.ttf.name.fontFamily = this.ttf.name.fullName = name.fontFamily || _default["default"].name.fontFamily;
        this.ttf.name.fontSubFamily = name.fontSubFamily || _default["default"].name.fontSubFamily;
        this.ttf.name.uniqueSubFamily = name.uniqueSubFamily || '';
        this.ttf.name.postScriptName = name.postScriptName || '';
      }
      return this.ttf.name;
    }

    /**
     * 设置head信息
     *
     * @param {Object} head 头部信息
     * @return {Object} 头对象
     */
  }, {
    key: "setHead",
    value: function setHead(head) {
      if (head) {
        // unitsperem
        if (head.unitsPerEm && head.unitsPerEm >= 64 && head.unitsPerEm <= 16384) {
          this.ttf.head.unitsPerEm = head.unitsPerEm;
        }

        // lowestrecppem
        if (head.lowestRecPPEM && head.lowestRecPPEM >= 8 && head.lowestRecPPEM <= 16384) {
          this.ttf.head.lowestRecPPEM = head.lowestRecPPEM;
        }
        // created
        if (head.created) {
          this.ttf.head.created = head.created;
        }
        if (head.modified) {
          this.ttf.head.modified = head.modified;
        }
      }
      return this.ttf.head;
    }

    /**
     * 设置hhea信息
     *
     * @param {Object} fields 字段值
     * @return {Object} 头对象
     */
  }, {
    key: "setHhea",
    value: function setHhea(fields) {
      (0, _lang.overwrite)(this.ttf.hhea, fields, ['ascent', 'descent', 'lineGap']);
      return this.ttf.hhea;
    }

    /**
     * 设置OS2信息
     *
     * @param {Object} fields 字段值
     * @return {Object} 头对象
     */
  }, {
    key: "setOS2",
    value: function setOS2(fields) {
      (0, _lang.overwrite)(this.ttf['OS/2'], fields, ['usWinAscent', 'usWinDescent', 'sTypoAscender', 'sTypoDescender', 'sTypoLineGap', 'sxHeight', 'bXHeight', 'usWeightClass', 'usWidthClass', 'yStrikeoutPosition', 'yStrikeoutSize', 'achVendID',
      // panose
      'bFamilyType', 'bSerifStyle', 'bWeight', 'bProportion', 'bContrast', 'bStrokeVariation', 'bArmStyle', 'bLetterform', 'bMidline', 'bXHeight']);
      return this.ttf['OS/2'];
    }

    /**
     * 设置post信息
     *
     * @param {Object} fields 字段值
     * @return {Object} 头对象
     */
  }, {
    key: "setPost",
    value: function setPost(fields) {
      (0, _lang.overwrite)(this.ttf.post, fields, ['underlinePosition', 'underlineThickness']);
      return this.ttf.post;
    }

    /**
     * 计算度量信息
     *
     * @return {Object} 度量信息
     */
  }, {
    key: "calcMetrics",
    value: function calcMetrics() {
      var ascent = -16384;
      var descent = 16384;
      var uX = 0x78;
      var uH = 0x48;
      var sxHeight;
      var sCapHeight;
      this.ttf.glyf.forEach(function (g) {
        if (g.yMax > ascent) {
          ascent = g.yMax;
        }
        if (g.yMin < descent) {
          descent = g.yMin;
        }
        if (g.unicode) {
          if (g.unicode.indexOf(uX) >= 0) {
            sxHeight = g.yMax;
          }
          if (g.unicode.indexOf(uH) >= 0) {
            sCapHeight = g.yMax;
          }
        }
      });
      ascent = Math.round(ascent);
      descent = Math.round(descent);
      return {
        // 此处非必须自动设置
        ascent: ascent,
        descent: descent,
        sTypoAscender: ascent,
        sTypoDescender: descent,
        // 自动设置项目
        usWinAscent: ascent,
        usWinDescent: -descent,
        sxHeight: sxHeight || 0,
        sCapHeight: sCapHeight || 0
      };
    }

    /**
     * 优化ttf字形信息
     *
     * @return {Array} 改变的glyf
     */
  }, {
    key: "optimize",
    value: function optimize() {
      return (0, _optimizettf["default"])(this.ttf);
    }

    /**
     * 复合字形转简单字形
     *
     * @param {Array=} indexList 索引列表
     * @return {Array} 改变的glyf
     */
  }, {
    key: "compound2simple",
    value: function compound2simple(indexList) {
      var ttf = this.ttf;
      if (ttf.maxp && !ttf.maxp.maxComponentElements) {
        return [];
      }
      var i;
      var l;
      // 全部的compound glyf
      if (!indexList || !indexList.length) {
        indexList = [];
        for (i = 0, l = ttf.glyf.length; i < l; ++i) {
          if (ttf.glyf[i].compound) {
            indexList.push(i);
          }
        }
      }
      var list = [];
      for (i = 0, l = indexList.length; i < l; ++i) {
        var glyfIndex = indexList[i];
        if (ttf.glyf[glyfIndex] && ttf.glyf[glyfIndex].compound) {
          (0, _compound2simpleglyf["default"])(glyfIndex, ttf, true);
          list.push(ttf.glyf[glyfIndex]);
        }
      }
      return list;
    }
  }]);
  return TTF;
}();
exports["default"] = TTF;
},{"../common/lang":14,"../graphics/computeBoundingBox":16,"../graphics/pathAdjust":19,"../graphics/pathCeil":20,"./data/default":30,"./util/compound2simpleglyf":106,"./util/glyfAdjust":109,"./util/optimizettf":110,"./util/string":114}],94:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ttf2base64;
var _bytes2base = _interopRequireDefault(require("./util/bytes2base64"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * ttf数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function ttf2base64(arrayBuffer) {
  return 'data:font/ttf;charset=utf-8;base64,' + (0, _bytes2base["default"])(arrayBuffer);
}
},{"./util/bytes2base64":103}],95:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ttf2eot;
var _reader = _interopRequireDefault(require("./reader"));
var _writer = _interopRequireDefault(require("./writer"));
var _string = _interopRequireDefault(require("./util/string"));
var _error = _interopRequireDefault(require("./error"));
var _table = _interopRequireDefault(require("./table/table"));
var _struct = _interopRequireDefault(require("./table/struct"));
var _name = _interopRequireDefault(require("./table/name"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf转eot
 * @author mengke01(kekee000@gmail.com)
 *
 * reference:
 * http://www.w3.org/Submission/EOT/
 * https://github.com/fontello/ttf2eot/blob/master/index.js
 */

var EotHead = _table["default"].create('head', [['EOTSize', _struct["default"].Uint32], ['FontDataSize', _struct["default"].Uint32], ['Version', _struct["default"].Uint32], ['Flags', _struct["default"].Uint32], ['PANOSE', _struct["default"].Bytes, 10], ['Charset', _struct["default"].Uint8], ['Italic', _struct["default"].Uint8], ['Weight', _struct["default"].Uint32], ['fsType', _struct["default"].Uint16], ['MagicNumber', _struct["default"].Uint16], ['UnicodeRange', _struct["default"].Bytes, 16], ['CodePageRange', _struct["default"].Bytes, 8], ['CheckSumAdjustment', _struct["default"].Uint32], ['Reserved', _struct["default"].Bytes, 16], ['Padding1', _struct["default"].Uint16]]);

/**
 * ttf格式转换成eot字体格式
 *
 * @param {ArrayBuffer} ttfBuffer ttf缓冲数组
 * @param {Object} options 选项
 * @return {ArrayBuffer} eot格式byte流
 */
// eslint-disable-next-line no-unused-vars
function ttf2eot(ttfBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // 构造eot头部
  var eotHead = new EotHead();
  var eotHeaderSize = eotHead.size();
  var eot = {};
  eot.head = eotHead.read(new _reader["default"](new ArrayBuffer(eotHeaderSize)));

  // set fields
  eot.head.FontDataSize = ttfBuffer.byteLength || ttfBuffer.length;
  eot.head.Version = 0x20001;
  eot.head.Flags = 0;
  eot.head.Charset = 0x1;
  eot.head.MagicNumber = 0x504C;
  eot.head.Padding1 = 0;
  var ttfReader = new _reader["default"](ttfBuffer);
  // 读取ttf表个数
  var numTables = ttfReader.readUint16(4);
  if (numTables <= 0 || numTables > 100) {
    _error["default"].raise(10101);
  }

  // 读取ttf表索引信息
  ttfReader.seek(12);
  // 需要读取3个表内容，设置3个byte
  var tblReaded = 0;
  for (var i = 0; i < numTables && tblReaded !== 0x7; ++i) {
    var tableEntry = {
      tag: ttfReader.readString(ttfReader.offset, 4),
      checkSum: ttfReader.readUint32(),
      offset: ttfReader.readUint32(),
      length: ttfReader.readUint32()
    };
    var entryOffset = ttfReader.offset;
    if (tableEntry.tag === 'head') {
      eot.head.CheckSumAdjustment = ttfReader.readUint32(tableEntry.offset + 8);
      tblReaded += 0x1;
    } else if (tableEntry.tag === 'OS/2') {
      eot.head.PANOSE = ttfReader.readBytes(tableEntry.offset + 32, 10);
      eot.head.Italic = ttfReader.readUint16(tableEntry.offset + 62);
      eot.head.Weight = ttfReader.readUint16(tableEntry.offset + 4);
      eot.head.fsType = ttfReader.readUint16(tableEntry.offset + 8);
      eot.head.UnicodeRange = ttfReader.readBytes(tableEntry.offset + 42, 16);
      eot.head.CodePageRange = ttfReader.readBytes(tableEntry.offset + 78, 8);
      tblReaded += 0x2;
    }

    // 设置名字信息
    else if (tableEntry.tag === 'name') {
      var names = new _name["default"](tableEntry.offset).read(ttfReader);
      eot.FamilyName = _string["default"].toUCS2Bytes(names.fontFamily || '');
      eot.FamilyNameSize = eot.FamilyName.length;
      eot.StyleName = _string["default"].toUCS2Bytes(names.fontStyle || '');
      eot.StyleNameSize = eot.StyleName.length;
      eot.VersionName = _string["default"].toUCS2Bytes(names.version || '');
      eot.VersionNameSize = eot.VersionName.length;
      eot.FullName = _string["default"].toUCS2Bytes(names.fullName || '');
      eot.FullNameSize = eot.FullName.length;
      tblReaded += 0x3;
    }
    ttfReader.seek(entryOffset);
  }

  // 计算size
  eot.head.EOTSize = eotHeaderSize + 4 + eot.FamilyNameSize + 4 + eot.StyleNameSize + 4 + eot.VersionNameSize + 4 + eot.FullNameSize + 2 + eot.head.FontDataSize;

  // 这里用小尾方式写入
  var eotWriter = new _writer["default"](new ArrayBuffer(eot.head.EOTSize), 0, eot.head.EOTSize, true);

  // write head
  eotHead.write(eotWriter, eot);

  // write names
  eotWriter.writeUint16(eot.FamilyNameSize);
  eotWriter.writeBytes(eot.FamilyName, eot.FamilyNameSize);
  eotWriter.writeUint16(0);
  eotWriter.writeUint16(eot.StyleNameSize);
  eotWriter.writeBytes(eot.StyleName, eot.StyleNameSize);
  eotWriter.writeUint16(0);
  eotWriter.writeUint16(eot.VersionNameSize);
  eotWriter.writeBytes(eot.VersionName, eot.VersionNameSize);
  eotWriter.writeUint16(0);
  eotWriter.writeUint16(eot.FullNameSize);
  eotWriter.writeBytes(eot.FullName, eot.FullNameSize);
  eotWriter.writeUint16(0);

  // write rootstring
  eotWriter.writeUint16(0);
  eotWriter.writeBytes(ttfBuffer, eot.head.FontDataSize);
  return eotWriter.getBuffer();
}
},{"./error":41,"./reader":47,"./table/name":86,"./table/struct":89,"./table/table":92,"./util/string":114,"./writer":121}],96:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ttf2icon;
var _ttfreader = _interopRequireDefault(require("./ttfreader"));
var _error = _interopRequireDefault(require("./error"));
var _default = _interopRequireDefault(require("./data/default"));
var _ttf2symbol = require("./ttf2symbol");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf转icon
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * listUnicode
 *
 * @param  {Array} unicode unicode
 * @return {string}         unicode string
 */
function listUnicode(unicode) {
  return unicode.map(function (u) {
    return '\\' + u.toString(16);
  }).join(',');
}

/**
 * ttf数据结构转icon数据结构
 *
 * @param {ttfObject} ttf ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 * @param {Object} options.iconPrefix icon 前缀
 * @return {Object} icon obj
 */
function ttfobject2icon(ttf) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var glyfList = [];

  // glyf 信息
  var filtered = ttf.glyf.filter(function (g) {
    return g.name !== '.notdef' && g.name !== '.null' && g.name !== 'nonmarkingreturn' && g.unicode && g.unicode.length;
  });
  filtered.forEach(function (g, i) {
    glyfList.push({
      code: '&#x' + g.unicode[0].toString(16) + ';',
      codeName: listUnicode(g.unicode),
      name: g.name,
      id: (0, _ttf2symbol.getSymbolId)(g, i)
    });
  });
  return {
    fontFamily: ttf.name.fontFamily || _default["default"].name.fontFamily,
    iconPrefix: options.iconPrefix || 'icon',
    glyfList: glyfList
  };
}

/**
 * ttf格式转换成icon
 *
 * @param {ArrayBuffer|ttfObject} ttfBuffer ttf缓冲数组或者ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 *
 * @return {Object} icon object
 */
function ttf2icon(ttfBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // 读取ttf二进制流
  if (ttfBuffer instanceof ArrayBuffer) {
    var reader = new _ttfreader["default"]();
    var ttfObject = reader.read(ttfBuffer);
    reader.dispose();
    return ttfobject2icon(ttfObject, options);
  }
  // 读取ttfObject
  else if (ttfBuffer.version && ttfBuffer.glyf) {
    return ttfobject2icon(ttfBuffer, options);
  }
  _error["default"].raise(10101);
}
},{"./data/default":30,"./error":41,"./ttf2symbol":98,"./ttfreader":100}],97:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ttf2svg;
var _string = _interopRequireDefault(require("../common/string"));
var _string2 = _interopRequireDefault(require("./util/string"));
var _ttfreader = _interopRequireDefault(require("./ttfreader"));
var _contours2svg = _interopRequireDefault(require("./util/contours2svg"));
var _unicode2xml = _interopRequireDefault(require("./util/unicode2xml"));
var _error = _interopRequireDefault(require("./error"));
var _default = _interopRequireDefault(require("./data/default"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf转svg
 * @author mengke01(kekee000@gmail.com)
 *
 * references:
 * http://www.w3.org/TR/SVG11/fonts.html
 */

// svg font id
var SVG_FONT_ID = _default["default"].fontId;

// xml 模板
/* eslint-disable no-multi-spaces */
var XML_TPL = '' + '<?xml version="1.0" standalone="no"?>' + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >' + '<svg xmlns="http://www.w3.org/2000/svg">' + '<metadata>${metadata}</metadata>' + '<defs><font id="${id}" horiz-adv-x="${advanceWidth}">' + '<font-face font-family="${fontFamily}" font-weight="${fontWeight}" font-stretch="normal"' + ' units-per-em="${unitsPerEm}" panose-1="${panose}" ascent="${ascent}" descent="${descent}"' + ' x-height="${xHeight}" bbox="${bbox}" underline-thickness="${underlineThickness}"' + ' underline-position="${underlinePosition}" unicode-range="${unicodeRange}" />' + '<missing-glyph horiz-adv-x="${missing.advanceWidth}" ${missing.d} />' + '${glyphList}' + '</font></defs>' + '</svg>';
/* eslint-enable no-multi-spaces */
// glyph 模板
var GLYPH_TPL = '<glyph glyph-name="${name}" unicode="${unicode}" d="${d}" />';

/**
 * ttf数据结构转svg
 *
 * @param {ttfObject} ttf ttfObject对象
 * @param {Object} options 选项
 * @param {string} options.metadata 字体相关的信息
 * @return {string} svg字符串
 */
function ttfobject2svg(ttf, options) {
  var OS2 = ttf['OS/2'];

  // 用来填充xml的数据
  var xmlObject = {
    id: ttf.name.uniqueSubFamily || SVG_FONT_ID,
    metadata: _string["default"].encodeHTML(options.metadata || ''),
    advanceWidth: ttf.hhea.advanceWidthMax,
    fontFamily: ttf.name.fontFamily,
    fontWeight: OS2.usWeightClass,
    unitsPerEm: ttf.head.unitsPerEm,
    panose: [OS2.bFamilyType, OS2.bSerifStyle, OS2.bWeight, OS2.bProportion, OS2.bContrast, OS2.bStrokeVariation, OS2.bArmStyle, OS2.bLetterform, OS2.bMidline, OS2.bXHeight].join(' '),
    ascent: ttf.hhea.ascent,
    descent: ttf.hhea.descent,
    xHeight: OS2.bXHeight,
    bbox: [ttf.head.xMin, ttf.head.yMin, ttf.head.xMax, ttf.head.yMax].join(' '),
    underlineThickness: ttf.post.underlineThickness,
    underlinePosition: ttf.post.underlinePosition,
    unicodeRange: 'U+' + _string["default"].pad(OS2.usFirstCharIndex.toString(16), 4) + '-' + _string["default"].pad(OS2.usLastCharIndex.toString(16), 4)
  };

  // glyf 第一个为missing glyph
  xmlObject.missing = {};
  xmlObject.missing.advanceWidth = ttf.glyf[0].advanceWidth || 0;
  xmlObject.missing.d = ttf.glyf[0].contours && ttf.glyf[0].contours.length ? 'd="' + (0, _contours2svg["default"])(ttf.glyf[0].contours) + '"' : '';

  // glyf 信息
  var glyphList = '';
  for (var i = 1, l = ttf.glyf.length; i < l; i++) {
    var glyf = ttf.glyf[i];

    // 筛选简单字形，并且有轮廓，有编码
    if (!glyf.compound && glyf.contours && glyf.unicode && glyf.unicode.length) {
      var glyfObject = {
        name: _string2["default"].escape(glyf.name),
        unicode: (0, _unicode2xml["default"])(glyf.unicode),
        d: (0, _contours2svg["default"])(glyf.contours)
      };
      glyphList += _string["default"].format(GLYPH_TPL, glyfObject);
    }
  }
  xmlObject.glyphList = glyphList;
  return _string["default"].format(XML_TPL, xmlObject);
}

/**
 * ttf格式转换成svg字体格式
 *
 * @param {ArrayBuffer|ttfObject} ttfBuffer ttf缓冲数组或者ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 *
 * @return {string} svg字符串
 */
function ttf2svg(ttfBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // 读取ttf二进制流
  if (ttfBuffer instanceof ArrayBuffer) {
    var reader = new _ttfreader["default"]();
    var ttfObject = reader.read(ttfBuffer);
    reader.dispose();
    return ttfobject2svg(ttfObject, options);
  }
  // 读取ttfObject
  else if (ttfBuffer.version && ttfBuffer.glyf) {
    return ttfobject2svg(ttfBuffer, options);
  }
  _error["default"].raise(10109);
}
},{"../common/string":15,"./data/default":30,"./error":41,"./ttfreader":100,"./util/contours2svg":108,"./util/string":114,"./util/unicode2xml":116}],98:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ttf2symbol;
exports.getSymbolId = getSymbolId;
var _string = _interopRequireDefault(require("../common/string"));
var _ttfreader = _interopRequireDefault(require("./ttfreader"));
var _contours2svg = _interopRequireDefault(require("./util/contours2svg"));
var _pathsUtil = _interopRequireDefault(require("../graphics/pathsUtil"));
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf 转 svg symbol
 * @author mengke01(kekee000@gmail.com)
 */

// xml 模板
var XML_TPL = '' + '<svg style="position: absolute; width: 0; height: 0;" width="0" height="0" version="1.1"' + ' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' + '<defs>${symbolList}</defs>' + '</svg>';

// symbol 模板
var SYMBOL_TPL = '' + '<symbol id="${id}" viewBox="0 ${descent} ${unitsPerEm} ${unitsPerEm}">' + '<path d="${d}"></path>' + '</symbol>';

/**
 * 根据 glyf 获取 symbo 名称
 * 1. 有 `name` 属性则使用 name 属性
 * 2. 有 `unicode` 属性则取 unicode 第一个: 'uni' + unicode
 * 3. 使用索引号作为 id: 'symbol' + index
 *
 * @param  {Object} glyf  glyf 对象
 * @param  {number} index glyf 索引
 * @return {string}
 */
function getSymbolId(glyf, index) {
  if (glyf.name) {
    return glyf.name;
  }
  if (glyf.unicode && glyf.unicode.length) {
    return 'uni-' + glyf.unicode[0];
  }
  return 'symbol-' + index;
}

/**
 * ttf数据结构转svg
 *
 * @param {ttfObject} ttf ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 * @return {string} svg字符串
 */
// eslint-disable-next-line no-unused-vars
function ttfobject2symbol(ttf) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var xmlObject = {};
  var unitsPerEm = ttf.head.unitsPerEm;
  var descent = ttf.hhea.descent;
  // glyf 信息
  var symbolList = '';
  for (var i = 1, l = ttf.glyf.length; i < l; i++) {
    var glyf = ttf.glyf[i];
    // 筛选简单字形，并且有轮廓，有编码
    if (!glyf.compound && glyf.contours) {
      var contours = _pathsUtil["default"].flip(glyf.contours);
      var glyfObject = {
        descent: descent,
        unitsPerEm: unitsPerEm,
        id: getSymbolId(glyf, i),
        d: (0, _contours2svg["default"])(contours)
      };
      symbolList += _string["default"].format(SYMBOL_TPL, glyfObject);
    }
  }
  xmlObject.symbolList = symbolList;
  return _string["default"].format(XML_TPL, xmlObject);
}

/**
 * ttf格式转换成svg字体格式
 *
 * @param {ArrayBuffer|ttfObject} ttfBuffer ttf缓冲数组或者ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 *
 * @return {string} svg字符串
 */
function ttf2symbol(ttfBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // 读取ttf二进制流
  if (ttfBuffer instanceof ArrayBuffer) {
    var reader = new _ttfreader["default"]();
    var ttfObject = reader.read(ttfBuffer);
    reader.dispose();
    return ttfobject2symbol(ttfObject, options);
  }
  // 读取ttfObject
  else if (ttfBuffer.version && ttfBuffer.glyf) {
    return ttfobject2symbol(ttfBuffer, options);
  }
  _error["default"].raise(10112);
}
},{"../common/string":15,"../graphics/pathsUtil":25,"./error":41,"./ttfreader":100,"./util/contours2svg":108}],99:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ttf2woff;
var _reader = _interopRequireDefault(require("./reader"));
var _writer = _interopRequireDefault(require("./writer"));
var _string = _interopRequireDefault(require("../common/string"));
var _string2 = _interopRequireDefault(require("./util/string"));
var _error = _interopRequireDefault(require("./error"));
var _default = _interopRequireDefault(require("./data/default"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf转换为woff
 * @author mengke01(kekee000@gmail.com)
 *
 * woff format:
 * http://www.w3.org/TR/2012/REC-WOFF-20121213/
 *
 * references:
 * https://github.com/fontello/ttf2woff
 * https://github.com/nodeca/pako
 */
/* eslint-disable no-multi-spaces */

/**
 * metadata 转换成XML
 *
 * @param {Object} metadata metadata
 *
 * @example
 * metadata json:
 *
 *    {
 *        "uniqueid": "",
 *        "vendor": {
 *            "name": "",
 *            "url": ""
 *        },
 *        "credit": [
 *            {
 *                "name": "",
 *                "url": "",
 *                "role": ""
 *            }
 *        ],
 *        "description": "",
 *        "license": {
 *            "id": "",
 *            "url": "",
 *            "text": ""
 *        },
 *        "copyright": "",
 *        "trademark": "",
 *        "licensee": ""
 *    }
 *
 * @return {string} xml字符串
 */
function metadata2xml(metadata) {
  var xml = '' + '<?xml version="1.0" encoding="UTF-8"?>' + '<metadata version="1.0">';
  metadata.uniqueid = metadata.uniqueid || _default["default"].fontId + '.' + Date.now();
  xml += '<uniqueid id="' + _string["default"].encodeHTML(metadata.uniqueid) + '" />';
  if (metadata.vendor) {
    xml += '<vendor name="' + _string["default"].encodeHTML(metadata.vendor.name) + '"' + ' url="' + _string["default"].encodeHTML(metadata.vendor.url) + '" />';
  }
  if (metadata.credit) {
    xml += '<credits>';
    var credits = metadata.credit instanceof Array ? metadata.credit : [metadata.credit];
    credits.forEach(function (credit) {
      xml += '<credit name="' + _string["default"].encodeHTML(credit.name) + '"' + ' url="' + _string["default"].encodeHTML(credit.url) + '"' + ' role="' + _string["default"].encodeHTML(credit.role || 'Contributor') + '" />';
    });
    xml += '</credits>';
  }
  if (metadata.description) {
    xml += '<description><text xml:lang="en">' + _string["default"].encodeHTML(metadata.description) + '</text></description>';
  }
  if (metadata.license) {
    xml += '<license url="' + _string["default"].encodeHTML(metadata.license.url) + '"' + ' id="' + _string["default"].encodeHTML(metadata.license.id) + '"><text xml:lang="en">';
    xml += _string["default"].encodeHTML(metadata.license.text);
    xml += '</text></license>';
  }
  if (metadata.copyright) {
    xml += '<copyright><text xml:lang="en">';
    xml += _string["default"].encodeHTML(metadata.copyright);
    xml += '</text></copyright>';
  }
  if (metadata.trademark) {
    xml += '<trademark><text xml:lang="en">' + _string["default"].encodeHTML(metadata.trademark) + '</text></trademark>';
  }
  if (metadata.licensee) {
    xml += '<licensee name="' + _string["default"].encodeHTML(metadata.licensee) + '"/>';
  }
  xml += '</metadata>';
  return xml;
}

/**
 * ttf格式转换成woff字体格式
 *
 * @param {ArrayBuffer} ttfBuffer ttf缓冲数组
 * @param {Object} options 选项
 * @param {Object} options.metadata 字体相关的信息
 * @param {Object} options.deflate 压缩相关函数
 *
 * @return {ArrayBuffer} woff格式byte流
 */
function ttf2woff(ttfBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // woff 头部结构
  var woffHeader = {
    signature: 0x774F4646,
    // for woff
    flavor: 0x10000,
    // for ttf
    length: 0,
    numTables: 0,
    reserved: 0,
    totalSfntSize: 0,
    majorVersion: 0,
    minorVersion: 0,
    metaOffset: 0,
    metaLength: 0,
    metaOrigLength: 0,
    privOffset: 0,
    privLength: 0
  };
  var ttfReader = new _reader["default"](ttfBuffer);
  var tableEntries = [];
  var numTables = ttfReader.readUint16(4); // 读取ttf表个数
  var tableEntry;
  var deflatedData;
  var i;
  var l;
  if (numTables <= 0 || numTables > 100) {
    _error["default"].raise(10101);
  }

  // 读取ttf表索引信息
  ttfReader.seek(12);
  for (i = 0; i < numTables; ++i) {
    tableEntry = {
      tag: ttfReader.readString(ttfReader.offset, 4),
      checkSum: ttfReader.readUint32(),
      offset: ttfReader.readUint32(),
      length: ttfReader.readUint32()
    };
    var entryOffset = ttfReader.offset;
    if (tableEntry.tag === 'head') {
      // 读取font revision
      woffHeader.majorVersion = ttfReader.readUint16(tableEntry.offset + 4);
      woffHeader.minorVersion = ttfReader.readUint16(tableEntry.offset + 6);
    }

    // ttf 表数据
    var sfntData = ttfReader.readBytes(tableEntry.offset, tableEntry.length);

    // 对数据进行压缩
    if (options.deflate) {
      deflatedData = options.deflate(sfntData);

      // 这里需要判断是否压缩后数据小于原始数据
      if (deflatedData.length < sfntData.length) {
        tableEntry.data = deflatedData;
        tableEntry.deflated = true;
      } else {
        tableEntry.data = sfntData;
      }
    } else {
      tableEntry.data = sfntData;
    }
    tableEntry.compLength = tableEntry.data.length;
    tableEntries.push(tableEntry);
    ttfReader.seek(entryOffset);
  }
  if (!tableEntries.length) {
    _error["default"].raise(10204);
  }

  // 对table进行排序
  tableEntries = tableEntries.sort(function (a, b) {
    return a.tag === b.tag ? 0 : a.tag < b.tag ? -1 : 1;
  });

  // 计算offset和 woff size
  var woffSize = 44 + 20 * numTables; // header size + table entries
  var ttfSize = 12 + 16 * numTables;
  for (i = 0, l = tableEntries.length; i < l; ++i) {
    tableEntry = tableEntries[i];
    tableEntry.offset = woffSize;
    // 4字节对齐
    woffSize += tableEntry.compLength + (tableEntry.compLength % 4 ? 4 - tableEntry.compLength % 4 : 0);
    ttfSize += tableEntry.length + (tableEntry.length % 4 ? 4 - tableEntry.length % 4 : 0);
  }

  // 计算metaData
  var metadata = null;
  if (options.metadata) {
    var xml = _string2["default"].toUTF8Bytes(metadata2xml(options.metadata));
    if (options.deflate) {
      deflatedData = options.deflate(xml);
      if (deflatedData.length < xml.length) {
        metadata = deflatedData;
      } else {
        metadata = xml;
      }
    } else {
      metadata = xml;
    }
    woffHeader.metaLength = metadata.length;
    woffHeader.metaOrigLength = xml.length;
    woffHeader.metaOffset = woffSize;
    // metadata header + length
    woffSize += woffHeader.metaLength + (woffHeader.metaLength % 4 ? 4 - woffHeader.metaLength % 4 : 0);
  }
  woffHeader.numTables = tableEntries.length;
  woffHeader.length = woffSize;
  woffHeader.totalSfntSize = ttfSize;

  // 写woff数据
  var woffWriter = new _writer["default"](new ArrayBuffer(woffSize));

  // 写woff头部
  woffWriter.writeUint32(woffHeader.signature);
  woffWriter.writeUint32(woffHeader.flavor);
  woffWriter.writeUint32(woffHeader.length);
  woffWriter.writeUint16(woffHeader.numTables);
  woffWriter.writeUint16(woffHeader.reserved);
  woffWriter.writeUint32(woffHeader.totalSfntSize);
  woffWriter.writeUint16(woffHeader.majorVersion);
  woffWriter.writeUint16(woffHeader.minorVersion);
  woffWriter.writeUint32(woffHeader.metaOffset);
  woffWriter.writeUint32(woffHeader.metaLength);
  woffWriter.writeUint32(woffHeader.metaOrigLength);
  woffWriter.writeUint32(woffHeader.privOffset);
  woffWriter.writeUint32(woffHeader.privLength);

  // 写woff表索引
  for (i = 0, l = tableEntries.length; i < l; ++i) {
    tableEntry = tableEntries[i];
    woffWriter.writeString(tableEntry.tag);
    woffWriter.writeUint32(tableEntry.offset);
    woffWriter.writeUint32(tableEntry.compLength);
    woffWriter.writeUint32(tableEntry.length);
    woffWriter.writeUint32(tableEntry.checkSum);
  }

  // 写表数据
  for (i = 0, l = tableEntries.length; i < l; ++i) {
    tableEntry = tableEntries[i];
    woffWriter.writeBytes(tableEntry.data);
    if (tableEntry.compLength % 4) {
      woffWriter.writeEmpty(4 - tableEntry.compLength % 4);
    }
  }

  // 写metadata
  if (metadata) {
    woffWriter.writeBytes(metadata);
    if (woffHeader.metaLength % 4) {
      woffWriter.writeEmpty(4 - woffHeader.metaLength % 4);
    }
  }
  return woffWriter.getBuffer();
}
},{"../common/string":15,"./data/default":30,"./error":41,"./reader":47,"./util/string":114,"./writer":121}],100:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _directory = _interopRequireDefault(require("./table/directory"));
var _support = _interopRequireDefault(require("./table/support"));
var _reader = _interopRequireDefault(require("./reader"));
var _postName = _interopRequireDefault(require("./enum/postName"));
var _error = _interopRequireDefault(require("./error"));
var _compound2simpleglyf = _interopRequireDefault(require("./util/compound2simpleglyf"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var TTFReader = /*#__PURE__*/function () {
  /**
   * ttf读取器的构造函数
   *
   * @param {Object} options 写入参数
   * @param {boolean} options.hinting 保留hinting信息
   * @param {boolean} options.compound2simple 复合字形转简单字形
   * @constructor
   */
  function TTFReader() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, TTFReader);
    options.subset = options.subset || []; // 子集
    options.hinting = options.hinting || false; // 不保留hints信息
    options.compound2simple = options.compound2simple || false; // 复合字形转简单字形
    this.options = options;
  }

  /**
   * 初始化读取
   *
   * @param {ArrayBuffer} buffer buffer对象
   * @return {Object} ttf对象
   */
  _createClass(TTFReader, [{
    key: "readBuffer",
    value: function readBuffer(buffer) {
      var reader = new _reader["default"](buffer, 0, buffer.byteLength, false);
      var ttf = {};

      // version
      ttf.version = reader.readFixed(0);
      if (ttf.version !== 0x1) {
        _error["default"].raise(10101);
      }

      // num tables
      ttf.numTables = reader.readUint16();
      if (ttf.numTables <= 0 || ttf.numTables > 100) {
        _error["default"].raise(10101);
      }

      // searchRange
      ttf.searchRange = reader.readUint16();

      // entrySelector
      ttf.entrySelector = reader.readUint16();

      // rangeShift
      ttf.rangeShift = reader.readUint16();
      ttf.tables = new _directory["default"](reader.offset).read(reader, ttf);
      if (!ttf.tables.glyf || !ttf.tables.head || !ttf.tables.cmap || !ttf.tables.hmtx) {
        _error["default"].raise(10204);
      }
      ttf.readOptions = this.options;

      // 读取支持的表数据
      Object.keys(_support["default"]).forEach(function (tableName) {
        if (ttf.tables[tableName]) {
          var offset = ttf.tables[tableName].offset;
          ttf[tableName] = new _support["default"][tableName](offset).read(reader, ttf);
        }
      });
      if (!ttf.glyf) {
        _error["default"].raise(10201);
      }
      reader.dispose();
      return ttf;
    }

    /**
     * 关联glyf相关的信息
     *
     * @param {Object} ttf ttf对象
     */
  }, {
    key: "resolveGlyf",
    value: function resolveGlyf(ttf) {
      var codes = ttf.cmap;
      var glyf = ttf.glyf;
      var subsetMap = ttf.readOptions.subset ? ttf.subsetMap : null; // 当前ttf的子集列表

      // unicode
      Object.keys(codes).forEach(function (c) {
        var i = codes[c];
        if (subsetMap && !subsetMap[i]) {
          return;
        }
        if (!glyf[i].unicode) {
          glyf[i].unicode = [];
        }
        glyf[i].unicode.push(+c);
      });

      // advanceWidth
      ttf.hmtx.forEach(function (item, i) {
        if (subsetMap && !subsetMap[i]) {
          return;
        }
        glyf[i].advanceWidth = item.advanceWidth;
        glyf[i].leftSideBearing = item.leftSideBearing;
      });

      // format = 2 的post表会携带glyf name信息
      if (ttf.post && 2 === ttf.post.format) {
        var nameIndex = ttf.post.nameIndex;
        var names = ttf.post.names;
        nameIndex.forEach(function (nameIndex, i) {
          if (subsetMap && !subsetMap[i]) {
            return;
          }
          if (nameIndex <= 257) {
            glyf[i].name = _postName["default"][nameIndex];
          } else {
            glyf[i].name = names[nameIndex - 258] || '';
          }
        });
      }

      // 设置了subsetMap之后需要选取subset中的字形
      // 并且对复合字形转换成简单字形
      if (subsetMap) {
        var subGlyf = [];
        Object.keys(subsetMap).forEach(function (i) {
          i = +i;
          if (glyf[i].compound) {
            (0, _compound2simpleglyf["default"])(i, ttf, true);
          }
          subGlyf.push(glyf[i]);
        });
        ttf.glyf = subGlyf;
        // 转换之后不存在复合字形了
        ttf.maxp.maxComponentElements = 0;
        ttf.maxp.maxComponentDepth = 0;
      }
    }

    /**
     * 清除非必须的表
     *
     * @param {Object} ttf ttf对象
     */
  }, {
    key: "cleanTables",
    value: function cleanTables(ttf) {
      delete ttf.readOptions;
      delete ttf.tables;
      delete ttf.hmtx;
      delete ttf.loca;
      if (ttf.post) {
        delete ttf.post.nameIndex;
        delete ttf.post.names;
      }
      delete ttf.subsetMap;

      // 不携带hinting信息则删除hint相关表
      if (!this.options.hinting) {
        delete ttf.fpgm;
        delete ttf.cvt;
        delete ttf.prep;
        delete ttf.GPOS;
        delete ttf.kern;
        ttf.glyf.forEach(function (glyf) {
          delete glyf.instructions;
        });
      }

      // 复合字形转简单字形
      if (this.options.compound2simple && ttf.maxp.maxComponentElements) {
        ttf.glyf.forEach(function (glyf, index) {
          if (glyf.compound) {
            (0, _compound2simpleglyf["default"])(index, ttf, true);
          }
        });
        ttf.maxp.maxComponentElements = 0;
        ttf.maxp.maxComponentDepth = 0;
      }
    }

    /**
     * 获取解析后的ttf文档
     *
     * @param {ArrayBuffer} buffer buffer对象
     * @return {Object} ttf文档
     */
  }, {
    key: "read",
    value: function read(buffer) {
      this.ttf = this.readBuffer(buffer);
      this.resolveGlyf(this.ttf);
      this.cleanTables(this.ttf);
      return this.ttf;
    }

    /**
     * 注销
     */
  }, {
    key: "dispose",
    value: function dispose() {
      delete this.ttf;
      delete this.options;
    }
  }]);
  return TTFReader;
}();
exports["default"] = TTFReader;
},{"./enum/postName":37,"./error":41,"./reader":47,"./table/directory":73,"./table/support":91,"./util/compound2simpleglyf":106}],101:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = ttftowoff2;
exports.ttftowoff2async = ttftowoff2async;
var _index = _interopRequireDefault(require("../../woff2/index"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf to woff2
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * ttf格式转换成woff2字体格式
 *
 * @param {ArrayBuffer} ttfBuffer ttf缓冲数组
 * @param {Object} options 选项
 *
 * @return {Promise.<ArrayBuffer>} woff格式byte流
 */
// eslint-disable-next-line no-unused-vars
function ttftowoff2(ttfBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!_index["default"].isInited()) {
    throw new Error('use woff2.init() to init woff2 module!');
  }
  var result = _index["default"].encode(ttfBuffer);
  return result.buffer;
}

/**
 * ttf格式转换成woff2字体格式
 *
 * @param {ArrayBuffer} ttfBuffer ttf缓冲数组
 * @param {Object} options 选项
 *
 * @return {Promise.<ArrayBuffer>} woff格式byte流
 */
function ttftowoff2async(ttfBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return _index["default"].init(options.wasmUrl).then(function () {
    var result = _index["default"].encode(ttfBuffer);
    return result.buffer;
  });
}
},{"../../woff2/index":122}],102:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _writer = _interopRequireDefault(require("./writer"));
var _directory = _interopRequireDefault(require("./table/directory"));
var _support = _interopRequireDefault(require("./table/support"));
var _checkSum = _interopRequireDefault(require("./util/checkSum"));
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
// 支持写的表, 注意表顺序
var SUPPORT_TABLES = ['OS/2', 'cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post'];
var TTFWriter = /*#__PURE__*/function () {
  function TTFWriter() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, TTFWriter);
    this.options = {
      hinting: options.hinting || false,
      // 不保留hints信息
      support: options.support // 自定义的导出表结构，可以自己修改某些表项目
    };
  }

  /**
   * 处理ttf结构，以便于写
   *
   * @param {ttfObject} ttf ttf数据结构
   */
  _createClass(TTFWriter, [{
    key: "resolveTTF",
    value: function resolveTTF(ttf) {
      // 头部信息
      ttf.version = ttf.version || 0x1;
      ttf.numTables = ttf.writeOptions.tables.length;
      ttf.entrySelector = Math.floor(Math.log(ttf.numTables) / Math.LN2);
      ttf.searchRange = Math.pow(2, ttf.entrySelector) * 16;
      ttf.rangeShift = ttf.numTables * 16 - ttf.searchRange;

      // 重置校验码
      ttf.head.checkSumAdjustment = 0;
      ttf.head.magickNumber = 0x5F0F3CF5;
      if (typeof ttf.head.created === 'string') {
        ttf.head.created = /^\d+$/.test(ttf.head.created) ? +ttf.head.created : Date.parse(ttf.head.created);
      }
      if (typeof ttf.head.modified === 'string') {
        ttf.head.modified = /^\d+$/.test(ttf.head.modified) ? +ttf.head.modified : Date.parse(ttf.head.modified);
      }
      // 重置日期
      if (!ttf.head.created) {
        ttf.head.created = Date.now();
      }
      if (!ttf.head.modified) {
        ttf.head.modified = ttf.head.created;
      }
      var checkUnicodeRepeat = {}; // 检查是否有重复代码点

      // 将glyf的代码点按小到大排序
      ttf.glyf.forEach(function (glyf, index) {
        if (glyf.unicode) {
          glyf.unicode = glyf.unicode.sort();
          glyf.unicode.forEach(function (u) {
            if (checkUnicodeRepeat[u]) {
              _error["default"].raise({
                number: 10200,
                data: index
              }, index);
            } else {
              checkUnicodeRepeat[u] = true;
            }
          });
        }
      });
    }

    /**
     * 写ttf文件
     *
     * @param {ttfObject} ttf ttf数据结构
     * @return {ArrayBuffer} 字节流
     */
  }, {
    key: "dump",
    value: function dump(ttf) {
      // 用来做写入缓存的对象，用完后删掉
      ttf.support = Object.assign({}, this.options.support);

      // head + directory
      var ttfSize = 12 + ttf.numTables * 16;
      var ttfHeadOffset = 0; // 记录head的偏移

      // 构造tables
      ttf.support.tables = [];
      ttf.writeOptions.tables.forEach(function (tableName) {
        var offset = ttfSize;
        var TableClass = _support["default"][tableName];
        var tableSize = new TableClass().size(ttf); // 原始的表大小
        var size = tableSize; // 对齐后的表大小

        if (tableName === 'head') {
          ttfHeadOffset = offset;
        }

        // 4字节对齐
        if (size % 4) {
          size += 4 - size % 4;
        }
        ttf.support.tables.push({
          name: tableName,
          checkSum: 0,
          offset: offset,
          length: tableSize,
          size: size
        });
        ttfSize += size;
      });
      var writer = new _writer["default"](new ArrayBuffer(ttfSize));

      // 写头部
      writer.writeFixed(ttf.version);
      writer.writeUint16(ttf.numTables);
      writer.writeUint16(ttf.searchRange);
      writer.writeUint16(ttf.entrySelector);
      writer.writeUint16(ttf.rangeShift);

      // 写表偏移
      new _directory["default"]().write(writer, ttf);

      // 写支持的表数据
      ttf.support.tables.forEach(function (table) {
        var tableStart = writer.offset;
        var TableClass = _support["default"][table.name];
        new TableClass().write(writer, ttf);
        if (table.length % 4) {
          // 对齐字节
          writer.writeEmpty(4 - table.length % 4);
        }

        // 计算校验和
        table.checkSum = (0, _checkSum["default"])(writer.getBuffer(), tableStart, table.size);
      });

      // 重新写入每个表校验和
      ttf.support.tables.forEach(function (table, index) {
        var offset = 12 + index * 16 + 4;
        writer.writeUint32(table.checkSum, offset);
      });

      // 写入总校验和
      var ttfCheckSum = (0xB1B0AFBA - (0, _checkSum["default"])(writer.getBuffer()) + 0x100000000) % 0x100000000;
      writer.writeUint32(ttfCheckSum, ttfHeadOffset + 8);
      delete ttf.writeOptions;
      delete ttf.support;
      var buffer = writer.getBuffer();
      writer.dispose();
      return buffer;
    }

    /**
     * 对ttf的表进行评估，标记需要处理的表
     *
     * @param  {Object} ttf ttf对象
     */
  }, {
    key: "prepareDump",
    value: function prepareDump(ttf) {
      if (!ttf.glyf || ttf.glyf.length === 0) {
        _error["default"].raise(10201);
      }
      if (!ttf['OS/2'] || !ttf.head || !ttf.name) {
        _error["default"].raise(10204);
      }
      var tables = SUPPORT_TABLES.slice(0);
      ttf.writeOptions = {};
      // hinting tables direct copy
      if (this.options.hinting) {
        ['cvt', 'fpgm', 'prep', 'gasp', 'GPOS', 'kern'].forEach(function (table) {
          if (ttf[table]) {
            tables.push(table);
          }
        });
      }
      ttf.writeOptions.hinting = !!this.options.hinting;
      ttf.writeOptions.tables = tables.sort();
    }

    /**
     * 写一个ttf字体结构
     *
     * @param {Object} ttf ttf数据结构
     * @return {ArrayBuffer} 缓冲数组
     */
  }, {
    key: "write",
    value: function write(ttf) {
      this.prepareDump(ttf);
      this.resolveTTF(ttf);
      var buffer = this.dump(ttf);
      return buffer;
    }

    /**
     * 注销
     */
  }, {
    key: "dispose",
    value: function dispose() {
      delete this.options;
    }
  }]);
  return TTFWriter;
}();
exports["default"] = TTFWriter;
},{"./error":41,"./table/directory":73,"./table/support":91,"./util/checkSum":104,"./writer":121}],103:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = bytes2base64;
/**
 * @file 二进制byte流转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 二进制byte流转base64编码
 *
 * @param {ArrayBuffer|Array} buffer ArrayBuffer对象
 * @return {string} base64编码
 */
function bytes2base64(buffer) {
  var str = '';
  var length;
  var i;
  // ArrayBuffer
  if (buffer instanceof ArrayBuffer) {
    length = buffer.byteLength;
    var view = new DataView(buffer, 0, length);
    for (i = 0; i < length; i++) {
      str += String.fromCharCode(view.getUint8(i, false));
    }
  }
  // Array
  else if (buffer.length) {
    length = buffer.length;
    for (i = 0; i < length; i++) {
      str += String.fromCharCode(buffer[i]);
    }
  }
  if (!str) {
    return '';
  }
  return typeof btoa !== 'undefined' ? btoa(str) : Buffer.from(str, 'binary').toString('base64');
}
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2}],104:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = checkSum;
/**
 * @file ttf table校验函数
 * @author mengke01(kekee000@gmail.com)
 */

function checkSumArrayBuffer(buffer) {
  var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var length = arguments.length > 2 ? arguments[2] : undefined;
  length = length == null ? buffer.byteLength : length;
  if (offset + length > buffer.byteLength) {
    throw new Error('check sum out of bound');
  }
  var nLongs = Math.floor(length / 4);
  var view = new DataView(buffer, offset, length);
  var sum = 0;
  var i = 0;
  while (i < nLongs) {
    sum += view.getUint32(4 * i++, false);
  }
  var leftBytes = length - nLongs * 4;
  if (leftBytes) {
    offset = nLongs * 4;
    while (leftBytes > 0) {
      sum += view.getUint8(offset, false) << leftBytes * 8;
      offset++;
      leftBytes--;
    }
  }
  return sum % 0x100000000;
}
function checkSumArray(buffer) {
  var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var length = arguments.length > 2 ? arguments[2] : undefined;
  length = length || buffer.length;
  if (offset + length > buffer.length) {
    throw new Error('check sum out of bound');
  }
  var nLongs = Math.floor(length / 4);
  var sum = 0;
  var i = 0;
  while (i < nLongs) {
    sum += (buffer[i++] << 24) + (buffer[i++] << 16) + (buffer[i++] << 8) + buffer[i++];
  }
  var leftBytes = length - nLongs * 4;
  if (leftBytes) {
    offset = nLongs * 4;
    while (leftBytes > 0) {
      sum += buffer[offset] << leftBytes * 8;
      offset++;
      leftBytes--;
    }
  }
  return sum % 0x100000000;
}

/**
 * table校验
 *
 * @param {ArrayBuffer|Array} buffer 表数据
 * @param {number=} offset 偏移量
 * @param {number=} length 长度
 *
 * @return {number} 校验和
 */
function checkSum(buffer, offset, length) {
  if (buffer instanceof ArrayBuffer) {
    return checkSumArrayBuffer(buffer, offset, length);
  } else if (buffer instanceof Array) {
    return checkSumArray(buffer, offset, length);
  }
  throw new Error('not support checksum buffer type');
}
},{}],105:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = compound2simple;
/**
 * @file 复合字形设置轮廓，转化为简单字形
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 复合字形转简单字形
 *
 * @param  {Object} glyf glyf对象
 * @param  {Array} contours 轮廓数组
 * @return {Object} 转换后对象
 */
function compound2simple(glyf, contours) {
  glyf.contours = contours;
  delete glyf.compound;
  delete glyf.glyfs;
  // 这里hinting信息会失效，删除hinting信息
  delete glyf.instructions;
  return glyf;
}
},{}],106:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = compound2simpleglyf;
var _transformGlyfContours = _interopRequireDefault(require("./transformGlyfContours"));
var _compound2simple = _interopRequireDefault(require("./compound2simple"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf复合字形转简单字形
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * ttf复合字形转简单字形
 *
 * @param  {Object|number} glyf glyf对象或者glyf索引
 * @param  {Object} ttf ttfObject对象
 * @param  {boolean} recrusive 是否递归的进行转换，如果复合字形为嵌套字形，则转换每一个复合字形
 * @return {Object} 转换后的对象
 */
function compound2simpleglyf(glyf, ttf, recrusive) {
  var glyfIndex;
  // 兼容索引和对象传入
  if (typeof glyf === 'number') {
    glyfIndex = glyf;
    glyf = ttf.glyf[glyfIndex];
  } else {
    glyfIndex = ttf.glyf.indexOf(glyf);
    if (-1 === glyfIndex) {
      return glyf;
    }
  }
  if (!glyf.compound || !glyf.glyfs) {
    return glyf;
  }
  var contoursList = {};
  (0, _transformGlyfContours["default"])(glyf, ttf, contoursList, glyfIndex);
  if (recrusive) {
    Object.keys(contoursList).forEach(function (index) {
      (0, _compound2simple["default"])(ttf.glyf[index], contoursList[index]);
    });
  } else {
    (0, _compound2simple["default"])(glyf, contoursList[glyfIndex]);
  }
  return glyf;
}
},{"./compound2simple":105,"./transformGlyfContours":115}],107:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = contour2svg;
/**
 * @file 将ttf路径转换为svg路径`d`
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 将路径转换为svg路径
 *
 * @param {Array} contour 轮廓序列
 * @param {number} precision 精确度
 * @return {string} 路径
 */
function contour2svg(contour) {
  var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
  if (!contour.length) {
    return '';
  }
  var ceil = function ceil(number) {
    return +number.toFixed(precision);
  };
  var pathArr = [];
  var curPoint;
  var prevPoint;
  var nextPoint;
  var x; // x相对坐标
  var y; // y相对坐标
  for (var i = 0, l = contour.length; i < l; i++) {
    curPoint = contour[i];
    prevPoint = i === 0 ? contour[l - 1] : contour[i - 1];
    nextPoint = i === l - 1 ? contour[0] : contour[i + 1];

    // 起始坐标
    if (i === 0) {
      if (curPoint.onCurve) {
        x = curPoint.x;
        y = curPoint.y;
        pathArr.push('M' + ceil(x) + ' ' + ceil(y));
      } else if (prevPoint.onCurve) {
        x = prevPoint.x;
        y = prevPoint.y;
        pathArr.push('M' + ceil(x) + ' ' + ceil(y));
      } else {
        x = (prevPoint.x + curPoint.x) / 2;
        y = (prevPoint.y + curPoint.y) / 2;
        pathArr.push('M' + ceil(x) + ' ' + ceil(y));
      }
    }

    // 直线
    if (curPoint.onCurve && nextPoint.onCurve) {
      pathArr.push('l' + ceil(nextPoint.x - x) + ' ' + ceil(nextPoint.y - y));
      x = nextPoint.x;
      y = nextPoint.y;
    } else if (!curPoint.onCurve) {
      if (nextPoint.onCurve) {
        pathArr.push('q' + ceil(curPoint.x - x) + ' ' + ceil(curPoint.y - y) + ' ' + ceil(nextPoint.x - x) + ' ' + ceil(nextPoint.y - y));
        x = nextPoint.x;
        y = nextPoint.y;
      } else {
        var x1 = (curPoint.x + nextPoint.x) / 2;
        var y1 = (curPoint.y + nextPoint.y) / 2;
        pathArr.push('q' + ceil(curPoint.x - x) + ' ' + ceil(curPoint.y - y) + ' ' + ceil(x1 - x) + ' ' + ceil(y1 - y));
        x = x1;
        y = y1;
      }
    }
  }
  pathArr.push('Z');
  return pathArr.join(' ');
}
},{}],108:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = contours2svg;
var _contour2svg = _interopRequireDefault(require("./contour2svg"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 将ttf字形转换为svg路径`d`
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * contours轮廓转svgpath
 *
 * @param {Array} contours 轮廓list
 * @param {number} precision 精确度
 * @return {string} path字符串
 */
function contours2svg(contours, precision) {
  if (!contours.length) {
    return '';
  }
  return contours.map(function (contour) {
    return (0, _contour2svg["default"])(contour, precision);
  }).join('');
}
},{"./contour2svg":107}],109:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = glyfAdjust;
var _pathAdjust = _interopRequireDefault(require("../../graphics/pathAdjust"));
var _pathCeil = _interopRequireDefault(require("../../graphics/pathCeil"));
var _computeBoundingBox = require("../../graphics/computeBoundingBox");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file glyf的缩放和平移调整
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 简单字形的缩放和平移调整
 *
 * @param {Object} g glyf对象
 * @param {number} scaleX x缩放比例
 * @param {number} scaleY y缩放比例
 * @param {number} offsetX x偏移
 * @param {number} offsetY y偏移
 * @param {boolan} useCeil 是否对字形设置取整，默认取整
 *
 * @return {Object} 调整后的glyf对象
 */
function glyfAdjust(g) {
  var scaleX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var scaleY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
  var offsetX = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var offsetY = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
  var useCeil = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;
  if (g.contours && g.contours.length) {
    if (scaleX !== 1 || scaleY !== 1) {
      g.contours.forEach(function (contour) {
        (0, _pathAdjust["default"])(contour, scaleX, scaleY);
      });
    }
    if (offsetX !== 0 || offsetY !== 0) {
      g.contours.forEach(function (contour) {
        (0, _pathAdjust["default"])(contour, 1, 1, offsetX, offsetY);
      });
    }
    if (false !== useCeil) {
      g.contours.forEach(function (contour) {
        (0, _pathCeil["default"])(contour);
      });
    }
  }

  // 重新计算xmin，xmax，ymin，ymax
  var advanceWidth = g.advanceWidth;
  if (undefined === g.xMin || undefined === g.yMax || undefined === g.leftSideBearing || undefined === g.advanceWidth) {
    // 有的字形没有形状，需要特殊处理一下
    var bound;
    if (g.contours && g.contours.length) {
      // eslint-disable-next-line no-invalid-this
      bound = _computeBoundingBox.computePathBox.apply(this, g.contours);
    } else {
      bound = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }
    g.xMin = bound.x;
    g.xMax = bound.x + bound.width;
    g.yMin = bound.y;
    g.yMax = bound.y + bound.height;
    g.leftSideBearing = g.xMin;

    // 如果设置了advanceWidth就是用默认的，否则为xMax + abs(xMin)
    if (undefined !== advanceWidth) {
      g.advanceWidth = Math.round(advanceWidth * scaleX + offsetX);
    } else {
      g.advanceWidth = g.xMax + Math.abs(g.xMin);
    }
  } else {
    g.xMin = Math.round(g.xMin * scaleX + offsetX);
    g.xMax = Math.round(g.xMax * scaleX + offsetX);
    g.yMin = Math.round(g.yMin * scaleY + offsetY);
    g.yMax = Math.round(g.yMax * scaleY + offsetY);
    g.leftSideBearing = Math.round(g.leftSideBearing * scaleX + offsetX);
    g.advanceWidth = Math.round(advanceWidth * scaleX + offsetX);
  }
  return g;
}
},{"../../graphics/computeBoundingBox":16,"../../graphics/pathAdjust":19,"../../graphics/pathCeil":20}],110:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = optimizettf;
var _reduceGlyf = _interopRequireDefault(require("./reduceGlyf"));
var _pathCeil = _interopRequireDefault(require("../../graphics/pathCeil"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 对ttf对象进行优化，查找错误，去除冗余点
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 对ttf对象进行优化
 *
 * @param  {Object} ttf ttf对象
 * @return {true|Object} 错误信息
 */
function optimizettf(ttf) {
  var checkUnicodeRepeat = {}; // 检查是否有重复代码点
  var repeatList = [];
  ttf.glyf.forEach(function (glyf, index) {
    if (glyf.unicode) {
      glyf.unicode = glyf.unicode.sort();

      // 将glyf的代码点按小到大排序
      glyf.unicode.sort(function (a, b) {
        return a - b;
      }).forEach(function (u) {
        if (checkUnicodeRepeat[u]) {
          repeatList.push(index);
        } else {
          checkUnicodeRepeat[u] = true;
        }
      });
    }
    if (!glyf.compound && glyf.contours) {
      // 整数化
      glyf.contours.forEach(function (contour) {
        (0, _pathCeil["default"])(contour);
      });
      // 缩减glyf
      (0, _reduceGlyf["default"])(glyf);
    }

    // 整数化
    glyf.xMin = Math.round(glyf.xMin || 0);
    glyf.xMax = Math.round(glyf.xMax || 0);
    glyf.yMin = Math.round(glyf.yMin || 0);
    glyf.yMax = Math.round(glyf.yMax || 0);
    glyf.leftSideBearing = Math.round(glyf.leftSideBearing || 0);
    glyf.advanceWidth = Math.round(glyf.advanceWidth || 0);
  });

  // 过滤无轮廓字体，如果存在复合字形不进行过滤
  if (!ttf.glyf.some(function (a) {
    return a.compound;
  })) {
    ttf.glyf = ttf.glyf.filter(function (glyf, index) {
      return index === 0 || glyf.contours && glyf.contours.length;
    });
  }
  if (!repeatList.length) {
    return true;
  }
  return {
    repeat: repeatList
  };
}
},{"../../graphics/pathCeil":20,"./reduceGlyf":113}],111:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = otfContours2ttfContours;
var _bezierCubic2Q = _interopRequireDefault(require("../../math/bezierCubic2Q2"));
var _pathCeil = _interopRequireDefault(require("../../graphics/pathCeil"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file otf轮廓转ttf轮廓
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 转换轮廓
 *
 * @param  {Array} otfContour otf轮廓
 * @return {Array}            ttf轮廓
 */
function transformContour(otfContour) {
  var contour = [];
  var prevPoint;
  var curPoint;
  var nextPoint;
  var nextNextPoint;
  contour.push(prevPoint = otfContour[0]);
  for (var i = 1, l = otfContour.length; i < l; i++) {
    curPoint = otfContour[i];
    if (curPoint.onCurve) {
      contour.push(curPoint);
      prevPoint = curPoint;
    }
    // 三次bezier曲线
    else {
      nextPoint = otfContour[i + 1];
      nextNextPoint = i === l - 2 ? otfContour[0] : otfContour[i + 2];
      var bezierArray = (0, _bezierCubic2Q["default"])(prevPoint, curPoint, nextPoint, nextNextPoint);
      bezierArray[0][2].onCurve = true;
      contour.push(bezierArray[0][1]);
      contour.push(bezierArray[0][2]);

      // 第二个曲线
      if (bezierArray[1]) {
        bezierArray[1][2].onCurve = true;
        contour.push(bezierArray[1][1]);
        contour.push(bezierArray[1][2]);
      }
      prevPoint = nextNextPoint;
      i += 2;
    }
  }
  return (0, _pathCeil["default"])(contour);
}

/**
 * otf轮廓转ttf轮廓
 *
 * @param  {Array} otfContours otf轮廓数组
 * @return {Array} ttf轮廓
 */
function otfContours2ttfContours(otfContours) {
  if (!otfContours || !otfContours.length) {
    return otfContours;
  }
  var contours = [];
  for (var i = 0, l = otfContours.length; i < l; i++) {
    // 这里可能由于转换错误导致空轮廓，需要去除
    if (otfContours[i][0]) {
      contours.push(transformContour(otfContours[i]));
    }
  }
  return contours;
}
},{"../../graphics/pathCeil":20,"../../math/bezierCubic2Q2":28}],112:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = readWindowsAllCodes;
/* eslint-disable */

/**
 * @file 读取windows支持的字符集
 * @author mengke01(kekee000@gmail.com)
 *
 * @see
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cmap.html
 */

/**
 * 读取ttf中windows字符表的字符
 *
 * @param {Array} tables cmap表结构
 * @param {Object} ttf ttf对象
 * @return {Object} 字符字典索引，unicode => glyf index
 */
function readWindowsAllCodes(tables, ttf) {
  var codes = {};

  // 读取windows unicode 编码段
  var format0 = tables.find(function (item) {
    return item.format === 0;
  });

  // 读取windows unicode 编码段
  var format12 = tables.find(function (item) {
    return item.platformID === 3 && item.encodingID === 10 && item.format === 12;
  });
  var format4 = tables.find(function (item) {
    return item.platformID === 3 && item.encodingID === 1 && item.format === 4;
  });
  var format2 = tables.find(function (item) {
    return item.platformID === 3 && item.encodingID === 3 && item.format === 2;
  });
  var format14 = tables.find(function (item) {
    return item.platformID === 0 && item.encodingID === 5 && item.format === 14;
  });
  if (format0) {
    for (var i = 0, l = format0.glyphIdArray.length; i < l; i++) {
      if (format0.glyphIdArray[i]) {
        codes[i] = format0.glyphIdArray[i];
      }
    }
  }

  // format 14 support
  if (format14) {
    for (var _i = 0, _l = format14.groups.length; _i < _l; _i++) {
      var _format14$groups$_i = format14.groups[_i],
        unicode = _format14$groups$_i.unicode,
        glyphId = _format14$groups$_i.glyphId;
      if (unicode) {
        codes[unicode] = glyphId;
      }
    }
  }

  // 读取format12表
  if (format12) {
    for (var _i2 = 0, _l2 = format12.nGroups; _i2 < _l2; _i2++) {
      var group = format12.groups[_i2];
      var startId = group.startId;
      var start = group.start;
      var end = group.end;
      for (; start <= end;) {
        codes[start++] = startId++;
      }
    }
  }
  // 读取format4表
  else if (format4) {
    var segCount = format4.segCountX2 / 2;
    // graphIdArray 和idRangeOffset的偏移量
    var graphIdArrayIndexOffset = (format4.glyphIdArrayOffset - format4.idRangeOffsetOffset) / 2;
    for (var _i3 = 0; _i3 < segCount; ++_i3) {
      // 读取单个字符
      for (var _start = format4.startCode[_i3], _end = format4.endCode[_i3]; _start <= _end; ++_start) {
        // range offset = 0
        if (format4.idRangeOffset[_i3] === 0) {
          codes[_start] = (_start + format4.idDelta[_i3]) % 0x10000;
        }
        // rely on to glyphIndexArray
        else {
          var index = _i3 + format4.idRangeOffset[_i3] / 2 + (_start - format4.startCode[_i3]) - graphIdArrayIndexOffset;
          var graphId = format4.glyphIdArray[index];
          if (graphId !== 0) {
            codes[_start] = (graphId + format4.idDelta[_i3]) % 0x10000;
          } else {
            codes[_start] = 0;
          }
        }
      }
    }
    delete codes[65535];
  }
  // 读取format2表
  // see https://github.com/fontforge/fontforge/blob/master/fontforge/parsettf.c
  else if (format2) {
    var subHeadKeys = format2.subHeadKeys;
    var subHeads = format2.subHeads;
    var glyphs = format2.glyphs;
    var numGlyphs = ttf.maxp.numGlyphs;
    var _index = 0;
    for (var _i4 = 0; _i4 < 256; _i4++) {
      // 单字节编码
      if (subHeadKeys[_i4] === 0) {
        if (_i4 >= format2.maxPos) {
          _index = 0;
        } else if (_i4 < subHeads[0].firstCode || _i4 >= subHeads[0].firstCode + subHeads[0].entryCount || subHeads[0].idRangeOffset + (_i4 - subHeads[0].firstCode) >= glyphs.length) {
          _index = 0;
        } else if ((_index = glyphs[subHeads[0].idRangeOffset + (_i4 - subHeads[0].firstCode)]) !== 0) {
          _index = _index + subHeads[0].idDelta;
        }

        // 单字节解码
        if (_index !== 0 && _index < numGlyphs) {
          codes[_i4] = _index;
        }
      } else {
        var k = subHeadKeys[_i4];
        for (var j = 0, entryCount = subHeads[k].entryCount; j < entryCount; j++) {
          if (subHeads[k].idRangeOffset + j >= glyphs.length) {
            _index = 0;
          } else if ((_index = glyphs[subHeads[k].idRangeOffset + j]) !== 0) {
            _index = _index + subHeads[k].idDelta;
          }
          if (_index !== 0 && _index < numGlyphs) {
            var _unicode = (_i4 << 8 | j + subHeads[k].firstCode) % 0xffff;
            codes[_unicode] = _index;
          }
        }
      }
    }
  }
  return codes;
}
},{}],113:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = reduceGlyf;
var _reducePath = _interopRequireDefault(require("../../graphics/reducePath"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 缩减glyf大小，去除冗余节点
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 缩减glyf，去除冗余节点
 *
 * @param {Object} glyf glyf对象
 * @return {Object} glyf对象
 */
function reduceGlyf(glyf) {
  var contours = glyf.contours;
  var contour;
  for (var j = contours.length - 1; j >= 0; j--) {
    contour = (0, _reducePath["default"])(contours[j]);

    // 空轮廓
    if (contour.length <= 2) {
      contours.splice(j, 1);
      continue;
    }
  }
  if (0 === glyf.contours.length) {
    delete glyf.contours;
  }
  return glyf;
}
},{"../../graphics/reducePath":26}],114:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _unicodeName = _interopRequireDefault(require("../enum/unicodeName"));
var _postName = _interopRequireDefault(require("../enum/postName"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file ttf字符串相关函数
 * @author mengke01(kekee000@gmail.com)
 *
 * references:
 * 1. svg2ttf @ github
 */

/**
 * 将unicode编码转换成js内部编码，
 * 有时候单子节的字符会编码成类似`\u0020`, 这里还原单字节
 *
 * @param {string} str str字符串
 * @return {string} 转换后字符串
 */
function stringify(str) {
  if (!str) {
    return str;
  }
  var newStr = '';
  for (var i = 0, l = str.length, ch; i < l; i++) {
    ch = str.charCodeAt(i);
    if (ch === 0) {
      continue;
    }
    newStr += String.fromCharCode(ch);
  }
  return newStr;
}
var _default = {
  stringify: stringify,
  /**
   * 将双字节编码字符转换成`\uxxxx`形式
   *
   * @param {string} str str字符串
   * @return {string} 转换后字符串
   */
  escape: function (_escape) {
    function escape(_x) {
      return _escape.apply(this, arguments);
    }
    escape.toString = function () {
      return _escape.toString();
    };
    return escape;
  }(function (str) {
    if (!str) {
      return str;
    }
    return String(str).replace(/[\uff-\uffff]/g, function (c) {
      return escape(c).replace('%', '\\');
    });
  }),
  /**
   * bytes to string
   *
   * @param  {Array} bytes 字节数组
   * @return {string}       string
   */
  getString: function getString(bytes) {
    var s = '';
    for (var i = 0, l = bytes.length; i < l; i++) {
      s += String.fromCharCode(bytes[i]);
    }
    return s;
  },
  /**
   * 获取unicode的名字值
   *
   * @param {number} unicode unicode
   * @return {string} 名字
   */
  getUnicodeName: function getUnicodeName(unicode) {
    var unicodeNameIndex = _unicodeName["default"][unicode];
    if (undefined !== unicodeNameIndex) {
      return _postName["default"][unicodeNameIndex];
    }
    return 'uni' + unicode.toString(16).toUpperCase();
  },
  /**
   * 转换成utf8的字节数组
   *
   * @param {string} str 字符串
   * @return {Array.<byte>} 字节数组
   */
  toUTF8Bytes: function toUTF8Bytes(str) {
    str = stringify(str);
    var byteArray = [];
    for (var i = 0, l = str.length; i < l; i++) {
      if (str.charCodeAt(i) <= 0x7F) {
        byteArray.push(str.charCodeAt(i));
      } else {
        var codePoint = str.codePointAt(i);
        if (codePoint > 0xffff) {
          i++;
        }
        var h = encodeURIComponent(String.fromCodePoint(codePoint)).slice(1).split('%');
        for (var j = 0; j < h.length; j++) {
          byteArray.push(parseInt(h[j], 16));
        }
      }
    }
    return byteArray;
  },
  /**
   * 转换成usc2的字节数组
   *
   * @param {string} str 字符串
   * @return {Array.<byte>} 字节数组
   */
  toUCS2Bytes: function toUCS2Bytes(str) {
    str = stringify(str);
    var byteArray = [];
    for (var i = 0, l = str.length, ch; i < l; i++) {
      ch = str.charCodeAt(i);
      byteArray.push(ch >> 8);
      byteArray.push(ch & 0xFF);
    }
    return byteArray;
  },
  /**
   * 获取pascal string 字节数组
   *
   * @param {string} str 字符串
   * @return {Array.<byte>} byteArray byte数组
   */
  toPascalStringBytes: function toPascalStringBytes(str) {
    var bytes = [];
    var length = str ? str.length < 256 ? str.length : 255 : 0;
    bytes.push(length);
    for (var i = 0, l = str.length; i < l; i++) {
      var c = str.charCodeAt(i);
      // non-ASCII characters are substituted with '*'
      bytes.push(c < 128 ? c : 42);
    }
    return bytes;
  },
  /**
   * utf8字节转字符串
   *
   * @param {Array} bytes 字节
   * @return {string} 字符串
   */
  getUTF8String: function getUTF8String(bytes) {
    var str = '';
    for (var i = 0, l = bytes.length; i < l; i++) {
      if (bytes[i] < 0x7F) {
        str += String.fromCharCode(bytes[i]);
      } else {
        str += '%' + (256 + bytes[i]).toString(16).slice(1);
      }
    }
    return unescape(str);
  },
  /**
   * ucs2字节转字符串
   *
   * @param {Array} bytes 字节
   * @return {string} 字符串
   */
  getUCS2String: function getUCS2String(bytes) {
    var str = '';
    for (var i = 0, l = bytes.length; i < l; i += 2) {
      str += String.fromCharCode((bytes[i] << 8) + bytes[i + 1]);
    }
    return str;
  },
  /**
   * 读取 pascal string
   *
   * @param {Array.<byte>} byteArray byte数组
   * @return {Array.<string>} 读取后的字符串数组
   */
  getPascalString: function getPascalString(byteArray) {
    var strArray = [];
    var i = 0;
    var l = byteArray.length;
    while (i < l) {
      var strLength = byteArray[i++];
      var str = '';
      while (strLength-- > 0 && i < l) {
        str += String.fromCharCode(byteArray[i++]);
      }
      // 这里需要将unicode转换成js编码
      str = stringify(str);
      strArray.push(str);
    }
    return strArray;
  }
};
exports["default"] = _default;
},{"../enum/postName":37,"../enum/unicodeName":38}],115:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = transformGlyfContours;
var _pathCeil = _interopRequireDefault(require("../../graphics/pathCeil"));
var _pathTransform = _interopRequireDefault(require("../../graphics/pathTransform"));
var _lang = require("../../common/lang");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file 转换复合字形的contours，以便于显示
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * 转换复合字形轮廓，结果保存在contoursList中，并返回当前glyf的轮廓
 *
 * @param  {Object} glyf glyf对象
 * @param  {Object} ttf ttfObject对象
 * @param  {Object=} contoursList 保存转换中间生成的contours
 * @param  {number} glyfIndex glyf对象当前的index
 * @return {Array} 转换后的轮廓
 */
function transformGlyfContours(glyf, ttf) {
  var contoursList = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var glyfIndex = arguments.length > 3 ? arguments[3] : undefined;
  if (!glyf.glyfs) {
    return glyf;
  }
  var compoundContours = [];
  glyf.glyfs.forEach(function (g) {
    var glyph = ttf.glyf[g.glyphIndex];
    if (!glyph || glyph === glyf) {
      return;
    }

    // 递归转换contours
    if (glyph.compound && !contoursList[g.glyphIndex]) {
      transformGlyfContours(glyph, ttf, contoursList, g.glyphIndex);
    }

    // 这里需要进行matrix变换，需要复制一份
    var contours = (0, _lang.clone)(glyph.compound ? contoursList[g.glyphIndex] || [] : glyph.contours);
    var transform = g.transform;
    for (var i = 0, l = contours.length; i < l; i++) {
      (0, _pathTransform["default"])(contours[i], transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
      compoundContours.push((0, _pathCeil["default"])(contours[i]));
    }
  });

  // eslint-disable-next-line eqeqeq
  if (null != glyfIndex) {
    contoursList[glyfIndex] = compoundContours;
  }
  return compoundContours;
}
},{"../../common/lang":14,"../../graphics/pathCeil":20,"../../graphics/pathTransform":23}],116:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = unicode2xml;
var _string = _interopRequireDefault(require("../../common/string"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file unicode字符转xml字符编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * unicode 转xml编码格式
 *
 * @param {Array.<number>} unicodeList unicode字符列表
 * @return {string} xml编码格式
 */
function unicode2xml(unicodeList) {
  if (typeof unicodeList === 'number') {
    unicodeList = [unicodeList];
  }
  return unicodeList.map(function (u) {
    if (u < 0x20) {
      return '';
    }
    return u >= 0x20 && u <= 255 ? _string["default"].encodeHTML(String.fromCharCode(u)) : '&#x' + u.toString(16) + ';';
  }).join('');
}
},{"../../common/string":15}],117:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = woff2base64;
var _bytes2base = _interopRequireDefault(require("./util/bytes2base64"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file woff数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * woff数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function woff2base64(arrayBuffer) {
  return 'data:font/woff;charset=utf-8;base64,' + (0, _bytes2base["default"])(arrayBuffer);
}
},{"./util/bytes2base64":103}],118:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = woff2tobase64;
var _bytes2base = _interopRequireDefault(require("./util/bytes2base64"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file woff2数组转base64编码
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * woff数组转base64编码
 *
 * @param {Array} arrayBuffer ArrayBuffer对象
 * @return {string} base64编码
 */
function woff2tobase64(arrayBuffer) {
  return 'data:font/woff2;charset=utf-8;base64,' + (0, _bytes2base["default"])(arrayBuffer);
}
},{"./util/bytes2base64":103}],119:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = woff2tottf;
exports.woff2tottfasync = woff2tottfasync;
var _index = _interopRequireDefault(require("../../woff2/index"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file woff2 to ttf
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * ttf格式转换成woff2字体格式
 *
 * @param {ArrayBuffer} woff2Buffer ttf缓冲数组
 * @param {Object} options 选项
 *
 * @return {ArrayBuffer} woff格式byte流
 */
// eslint-disable-next-line no-unused-vars
function woff2tottf(woff2Buffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!_index["default"].isInited()) {
    throw new Error('use woff2.init() to init woff2 module!');
  }
  var result = _index["default"].decode(woff2Buffer);
  return result.buffer;
}

/**
 * ttf格式转换成woff2字体格式
 *
 * @param {ArrayBuffer} woff2Buffer ttf缓冲数组
 * @param {Object} options 选项
 *
 * @return {Promise.<ArrayBuffer>} woff格式byte流
 */
function woff2tottfasync(woff2Buffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return _index["default"].init(options.wasmUrl).then(function () {
    var result = _index["default"].decode(woff2Buffer);
    return result.buffer;
  });
}
},{"../../woff2/index":122}],120:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = woff2ttf;
var _reader = _interopRequireDefault(require("./reader"));
var _writer = _interopRequireDefault(require("./writer"));
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * @file woff转换ttf
 * @author mengke01(kekee000@gmail.com)
 */

/**
 * woff格式转换成ttf字体格式
 *
 * @param {ArrayBuffer} woffBuffer woff缓冲数组
 * @param {Object} options 选项
 * @param {Object} options.inflate 解压相关函数
 *
 * @return {ArrayBuffer} ttf格式byte流
 */
function woff2ttf(woffBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var reader = new _reader["default"](woffBuffer);
  var signature = reader.readUint32(0);
  var flavor = reader.readUint32(4);
  if (signature !== 0x774F4646 || flavor !== 0x10000 && flavor !== 0x4f54544f) {
    reader.dispose();
    _error["default"].raise(10102);
  }
  var numTables = reader.readUint16(12);
  var ttfSize = reader.readUint32(16);
  var tableEntries = [];
  var tableEntry;
  var i;
  var l;

  // 读取woff表索引信息
  for (i = 0; i < numTables; ++i) {
    reader.seek(44 + i * 20);
    tableEntry = {
      tag: reader.readString(reader.offset, 4),
      offset: reader.readUint32(),
      compLength: reader.readUint32(),
      length: reader.readUint32(),
      checkSum: reader.readUint32()
    };

    // ttf 表数据
    var deflateData = reader.readBytes(tableEntry.offset, tableEntry.compLength);
    // 需要解压
    if (deflateData.length < tableEntry.length) {
      if (!options.inflate) {
        reader.dispose();
        _error["default"].raise(10105);
      }
      tableEntry.data = options.inflate(deflateData);
    } else {
      tableEntry.data = deflateData;
    }
    tableEntry.length = tableEntry.data.length;
    tableEntries.push(tableEntry);
  }
  var writer = new _writer["default"](new ArrayBuffer(ttfSize));
  // 写头部
  var entrySelector = Math.floor(Math.log(numTables) / Math.LN2);
  var searchRange = Math.pow(2, entrySelector) * 16;
  var rangeShift = numTables * 16 - searchRange;
  writer.writeUint32(flavor);
  writer.writeUint16(numTables);
  writer.writeUint16(searchRange);
  writer.writeUint16(entrySelector);
  writer.writeUint16(rangeShift);

  // 写ttf表索引
  var tblOffset = 12 + 16 * tableEntries.length;
  for (i = 0, l = tableEntries.length; i < l; ++i) {
    tableEntry = tableEntries[i];
    writer.writeString(tableEntry.tag);
    writer.writeUint32(tableEntry.checkSum);
    writer.writeUint32(tblOffset);
    writer.writeUint32(tableEntry.length);
    tblOffset += tableEntry.length + (tableEntry.length % 4 ? 4 - tableEntry.length % 4 : 0);
  }

  // 写ttf表数据
  for (i = 0, l = tableEntries.length; i < l; ++i) {
    tableEntry = tableEntries[i];
    writer.writeBytes(tableEntry.data);
    if (tableEntry.length % 4) {
      writer.writeEmpty(4 - tableEntry.length % 4);
    }
  }
  return writer.getBuffer();
}
},{"./error":41,"./reader":47,"./writer":121}],121:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _lang = require("../common/lang");
var _error = _interopRequireDefault(require("./error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
// 检查数组支持情况
if (typeof ArrayBuffer === 'undefined' || typeof DataView === 'undefined') {
  throw new Error('not support ArrayBuffer and DataView');
}

// 数据类型
var dataType = {
  Int8: 1,
  Int16: 2,
  Int32: 4,
  Uint8: 1,
  Uint16: 2,
  Uint32: 4,
  Float32: 4,
  Float64: 8
};

/**
 * 读取器
 *
 * @constructor
 * @param {Array.<byte>} buffer 缓冲数组
 * @param {number} offset 起始偏移
 * @param {number=} length 数组长度
 * @param {boolean=} littleEndian 是否小尾
 */
var Writer = /*#__PURE__*/function () {
  function Writer(buffer, offset, length, littleEndian) {
    _classCallCheck(this, Writer);
    var bufferLength = buffer.byteLength || buffer.length;
    this.offset = offset || 0;
    this.length = length || bufferLength - this.offset;
    this.littleEndian = littleEndian || false;
    this.view = new DataView(buffer, this.offset, this.length);
  }

  /**
   * 读取指定的数据类型
   *
   * @param {string} type 数据类型
   * @param {number} value value值
   * @param {number=} offset 位移
   * @param {boolean=} littleEndian 是否小尾
   *
   * @return {this}
   */
  _createClass(Writer, [{
    key: "write",
    value: function write(type, value, offset, littleEndian) {
      // 使用当前位移
      if (undefined === offset) {
        offset = this.offset;
      }

      // 使用小尾
      if (undefined === littleEndian) {
        littleEndian = this.littleEndian;
      }

      // 扩展方法
      if (undefined === dataType[type]) {
        return this['write' + type](value, offset, littleEndian);
      }
      var size = dataType[type];
      this.offset = offset + size;
      this.view['set' + type](offset, value, littleEndian);
      return this;
    }

    /**
     * 写入指定的字节数组
     *
     * @param {ArrayBuffer} value 写入值
     * @param {number=} length 数组长度
     * @param {number=} offset 起始偏移
     * @return {this}
     */
  }, {
    key: "writeBytes",
    value: function writeBytes(value, length, offset) {
      length = length || value.byteLength || value.length;
      var i;
      if (!length) {
        return this;
      }
      if (undefined === offset) {
        offset = this.offset;
      }
      if (length < 0 || offset + length > this.length) {
        _error["default"].raise(10002, this.length, offset + length);
      }
      var littleEndian = this.littleEndian;
      if (value instanceof ArrayBuffer) {
        var view = new DataView(value, 0, length);
        for (i = 0; i < length; ++i) {
          this.view.setUint8(offset + i, view.getUint8(i, littleEndian), littleEndian);
        }
      } else {
        for (i = 0; i < length; ++i) {
          this.view.setUint8(offset + i, value[i], littleEndian);
        }
      }
      this.offset = offset + length;
      return this;
    }

    /**
     * 写空数据
     *
     * @param {number} length 长度
     * @param {number=} offset 起始偏移
     * @return {this}
     */
  }, {
    key: "writeEmpty",
    value: function writeEmpty(length, offset) {
      if (length < 0) {
        _error["default"].raise(10002, this.length, length);
      }
      if (undefined === offset) {
        offset = this.offset;
      }
      var littleEndian = this.littleEndian;
      for (var i = 0; i < length; ++i) {
        this.view.setUint8(offset + i, 0, littleEndian);
      }
      this.offset = offset + length;
      return this;
    }

    /**
     * 写入一个string
     *
     * @param {string} str 字符串
     * @param {number=} length 长度
     * @param {number=} offset 偏移
     *
     * @return {this}
     */
  }, {
    key: "writeString",
    value: function writeString() {
      var str = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var length = arguments.length > 1 ? arguments[1] : undefined;
      var offset = arguments.length > 2 ? arguments[2] : undefined;
      if (undefined === offset) {
        offset = this.offset;
      }

      // eslint-disable-next-line no-control-regex
      length = length || str.replace(/[^\x00-\xff]/g, '11').length;
      if (length < 0 || offset + length > this.length) {
        _error["default"].raise(10002, this.length, offset + length);
      }
      this.seek(offset);
      for (var i = 0, l = str.length, charCode; i < l; ++i) {
        charCode = str.charCodeAt(i) || 0;
        if (charCode > 127) {
          // unicode编码可能会超出2字节,
          // 写入与编码有关系，此处不做处理
          this.writeUint16(charCode);
        } else {
          this.writeUint8(charCode);
        }
      }
      this.offset = offset + length;
      return this;
    }

    /**
     * 写入一个字符
     *
     * @param {string} value 字符
     * @param {number=} offset 偏移
     * @return {this}
     */
  }, {
    key: "writeChar",
    value: function writeChar(value, offset) {
      return this.writeString(value, offset);
    }

    /**
     * 写入fixed类型
     *
     * @param {number} value 写入值
     * @param {number=} offset 偏移
     * @return {number} float
     */
  }, {
    key: "writeFixed",
    value: function writeFixed(value, offset) {
      if (undefined === offset) {
        offset = this.offset;
      }
      this.writeInt32(Math.round(value * 65536), offset);
      return this;
    }

    /**
     * 写入长日期
     *
     * @param {Date} value 日期对象
     * @param {number=} offset 偏移
     *
     * @return {Date} Date对象
     */
  }, {
    key: "writeLongDateTime",
    value: function writeLongDateTime(value, offset) {
      if (undefined === offset) {
        offset = this.offset;
      }

      // new Date(1970, 1, 1).getTime() - new Date(1904, 1, 1).getTime();
      var delta = -2077545600000;
      if (typeof value === 'undefined') {
        value = delta;
      } else if (typeof value.getTime === 'function') {
        value = value.getTime();
      } else if (/^\d+$/.test(value)) {
        value = +value;
      } else {
        value = Date.parse(value);
      }
      var time = Math.round((value - delta) / 1000);
      this.writeUint32(0, offset);
      this.writeUint32(time, offset + 4);
      return this;
    }

    /**
     * 跳转到指定偏移
     *
     * @param {number=} offset 偏移
     * @return {this}
     */
  }, {
    key: "seek",
    value: function seek(offset) {
      if (undefined === offset) {
        this.offset = 0;
      }
      if (offset < 0 || offset > this.length) {
        _error["default"].raise(10002, this.length, offset);
      }
      this._offset = this.offset;
      this.offset = offset;
      return this;
    }

    /**
     * 跳转到写入头部位置
     *
     * @return {this}
     */
  }, {
    key: "head",
    value: function head() {
      this.offset = this._offset || 0;
      return this;
    }

    /**
     * 获取缓存的byte数组
     *
     * @return {ArrayBuffer}
     */
  }, {
    key: "getBuffer",
    value: function getBuffer() {
      return this.view.buffer;
    }

    /**
     * 注销
     */
  }, {
    key: "dispose",
    value: function dispose() {
      delete this.view;
    }
  }]);
  return Writer;
}(); // 直接支持的数据类型
Object.keys(dataType).forEach(function (type) {
  Writer.prototype['write' + type] = (0, _lang.curry)(Writer.prototype.write, type);
});
var _default = Writer;
exports["default"] = _default;
},{"../common/lang":14,"./error":41}],122:[function(require,module,exports){
(function (__dirname){(function (){
/**
 * @file woff2 wasm build of google woff2
 * thanks to woff2-asm
 * https://github.com/alimilhim/woff2-wasm
 * @author mengke01(kekee000@gmail.com)
 */

function convertFromVecToUint8Array(vector) {
    const arr = [];
    for (let i = 0, l = vector.size(); i < l; i++) {
        arr.push(vector.get(i));
    }
    return new Uint8Array(arr);
}


// eslint-disable-next-line import/no-commonjs
module.exports = {

    woff2Module: null,

    /**
     * 是否已经加载完毕
     *
     * @return {boolean}
     */
    isInited() {
        return this.woff2Module
            && this.woff2Module.woff2Enc
            && this.woff2Module.woff2Dec;
    },

    /**
     * 初始化 woff 模块
     *
     * @param {string|ArrayBuffer} wasmUrl woff2.wasm file url
     * @return {Promise}
     */
    init(wasmUrl) {
        return new Promise(resolve => {
            if (this.woff2Module) {
                resolve(this);
                return;
            }

            // for browser
            const moduleLoader = require('./woff2');
            let moduleLoaderConfig = null;
            if (typeof window !== 'undefined') {
                moduleLoaderConfig = {
                    locateFile(path) {
                        if (path.endsWith('.wasm')) {
                            return wasmUrl;
                        }
                        return path;
                    }
                };
            }
            // for nodejs
            else {
                moduleLoaderConfig = {
                    wasmBinaryFile: __dirname + '/woff2.wasm'
                };
            }
            const woff2Module = moduleLoader(moduleLoaderConfig);
            woff2Module.onRuntimeInitialized = () => {
                this.woff2Module = woff2Module;
                resolve(this);
            };
        });
    },

    /**
     * 将ttf buffer 转换成 woff2 buffer
     *
     * @param {ArrayBuffer|Buffer|Array} ttfBuffer ttf buffer
     * @return {Uint8Array} uint8 array
     */
    encode(ttfBuffer) {
        const buffer = new Uint8Array(ttfBuffer);
        const woffbuff = this.woff2Module.woff2Enc(buffer, buffer.byteLength);
        return convertFromVecToUint8Array(woffbuff);
    },

    /**
     * 将woff2 buffer 转换成 ttf buffer
     *
     * @param {ArrayBuffer|Buffer|Array} woff2Buffer woff2 buffer
     * @return {Uint8Array} uint8 array
     */
    decode(woff2Buffer) {
        const buffer = new Uint8Array(woff2Buffer);
        const ttfbuff = this.woff2Module.woff2Dec(buffer, buffer.byteLength);
        return convertFromVecToUint8Array(ttfbuff);
    }
};

}).call(this)}).call(this,"/node_modules/fonteditor-core/woff2")
},{"./woff2":123}],123:[function(require,module,exports){
(function (process,__dirname){(function (){

var Module = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  return (
function(Module) {
  Module = Module || {};

"use strict";var Module=typeof Module!=="undefined"?Module:{};var moduleOverrides={};var key;for(key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key]}}var arguments_=[];var thisProgram="./this.program";var quit_=function(status,toThrow){throw toThrow};var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=false;var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_HAS_NODE=false;var ENVIRONMENT_IS_SHELL=false;ENVIRONMENT_IS_WEB=typeof window==="object";ENVIRONMENT_IS_WORKER=typeof importScripts==="function";ENVIRONMENT_HAS_NODE=typeof process==="object"&&typeof process.versions==="object"&&typeof process.versions.node==="string";ENVIRONMENT_IS_NODE=ENVIRONMENT_HAS_NODE&&!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER;ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER;if(Module["ENVIRONMENT"]){throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)")}var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var read_,readAsync,readBinary,setWindowTitle;if(ENVIRONMENT_IS_NODE){scriptDirectory=__dirname+"/";var nodeFS;var nodePath;read_=function shell_read(filename,binary){var ret;if(!nodeFS)nodeFS=require(["fs"].join());if(!nodePath)nodePath=require(["path"].join());filename=nodePath["normalize"](filename);ret=nodeFS["readFileSync"](filename);return binary?ret:ret.toString()};readBinary=function readBinary(filename){var ret=read_(filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}assert(ret.buffer);return ret};if(process["argv"].length>1){thisProgram=process["argv"][1].replace(/\\/g,"/")}arguments_=process["argv"].slice(2);process["on"]("uncaughtException",function(ex){if(!(ex instanceof ExitStatus)){throw ex}});process["on"]("unhandledRejection",abort);quit_=function(status){process["exit"](status)};Module["inspect"]=function(){return"[Emscripten Module object]"}}else if(ENVIRONMENT_IS_SHELL){if(typeof read!="undefined"){read_=function shell_read(f){return read(f)}}readBinary=function readBinary(f){var data;if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){arguments_=scriptArgs}else if(typeof arguments!="undefined"){arguments_=arguments}if(typeof quit==="function"){quit_=function(status){quit(status)}}if(typeof print!=="undefined"){if(typeof console==="undefined")console={};console.log=print;console.warn=console.error=typeof printErr!=="undefined"?printErr:print}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}else if(document.currentScript){scriptDirectory=document.currentScript.src}if(_scriptDir){scriptDirectory=_scriptDir}if(scriptDirectory.indexOf("blob:")!==0){scriptDirectory=scriptDirectory.substr(0,scriptDirectory.lastIndexOf("/")+1)}else{scriptDirectory=""}read_=function shell_read(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText};if(ENVIRONMENT_IS_WORKER){readBinary=function readBinary(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=function readAsync(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function xhr_onload(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}onerror()};xhr.onerror=onerror;xhr.send(null)};setWindowTitle=function(title){document.title=title}}else{throw new Error("environment detection error")}var out=Module["print"]||function(){};var err=Module["printErr"]||function(){};for(key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key]}}moduleOverrides=null;if(Module["arguments"])arguments_=Module["arguments"];if(!Object.getOwnPropertyDescriptor(Module,"arguments"))Object.defineProperty(Module,"arguments",{configurable:true,get:function(){abort("Module.arguments has been replaced with plain arguments_")}});if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(!Object.getOwnPropertyDescriptor(Module,"thisProgram"))Object.defineProperty(Module,"thisProgram",{configurable:true,get:function(){abort("Module.thisProgram has been replaced with plain thisProgram")}});if(Module["quit"])quit_=Module["quit"];if(!Object.getOwnPropertyDescriptor(Module,"quit"))Object.defineProperty(Module,"quit",{configurable:true,get:function(){abort("Module.quit has been replaced with plain quit_")}});assert(typeof Module["memoryInitializerPrefixURL"]==="undefined","Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["pthreadMainPrefixURL"]==="undefined","Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["cdInitializerPrefixURL"]==="undefined","Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["filePackagePrefixURL"]==="undefined","Module.filePackagePrefixURL option was removed, use Module.locateFile instead");assert(typeof Module["read"]==="undefined","Module.read option was removed (modify read_ in JS)");assert(typeof Module["readAsync"]==="undefined","Module.readAsync option was removed (modify readAsync in JS)");assert(typeof Module["readBinary"]==="undefined","Module.readBinary option was removed (modify readBinary in JS)");assert(typeof Module["setWindowTitle"]==="undefined","Module.setWindowTitle option was removed (modify setWindowTitle in JS)");if(!Object.getOwnPropertyDescriptor(Module,"read"))Object.defineProperty(Module,"read",{configurable:true,get:function(){abort("Module.read has been replaced with plain read_")}});if(!Object.getOwnPropertyDescriptor(Module,"readAsync"))Object.defineProperty(Module,"readAsync",{configurable:true,get:function(){abort("Module.readAsync has been replaced with plain readAsync")}});if(!Object.getOwnPropertyDescriptor(Module,"readBinary"))Object.defineProperty(Module,"readBinary",{configurable:true,get:function(){abort("Module.readBinary has been replaced with plain readBinary")}});stackSave=stackRestore=stackAlloc=function(){abort("cannot use the stack before compiled code is ready to run, and has provided stack access")};function warnOnce(text){if(!warnOnce.shown)warnOnce.shown={};if(!warnOnce.shown[text]){warnOnce.shown[text]=1;err(text)}}var asm2wasmImports={"f64-rem":function(x,y){return x%y},"debugger":function(){debugger}};var functionPointers=new Array(0);var tempRet0=0;var setTempRet0=function(value){tempRet0=value};var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(!Object.getOwnPropertyDescriptor(Module,"wasmBinary"))Object.defineProperty(Module,"wasmBinary",{configurable:true,get:function(){abort("Module.wasmBinary has been replaced with plain wasmBinary")}});var noExitRuntime;if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(!Object.getOwnPropertyDescriptor(Module,"noExitRuntime"))Object.defineProperty(Module,"noExitRuntime",{configurable:true,get:function(){abort("Module.noExitRuntime has been replaced with plain noExitRuntime")}});if(typeof WebAssembly!=="object"){abort("No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.")}var wasmMemory;var wasmTable=new WebAssembly.Table({"initial":352,"maximum":352,"element":"anyfunc"});var ABORT=false;var EXITSTATUS=0;function assert(condition,text){if(!condition){abort("Assertion failed: "+text)}}function getCFunc(ident){var func=Module["_"+ident];assert(func,"Cannot call unknown function "+ident+", make sure it is exported");return func}function ccall(ident,returnType,argTypes,args,opts){var toC={"string":function(str){var ret=0;if(str!==null&&str!==undefined&&str!==0){var len=(str.length<<2)+1;ret=stackAlloc(len);stringToUTF8(str,ret,len)}return ret},"array":function(arr){var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string")return UTF8ToString(ret);if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;assert(returnType!=="array",'Return type should not be "array".');if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func.apply(null,cArgs);ret=convertReturnValue(ret);if(stack!==0)stackRestore(stack);return ret}function cwrap(ident,returnType,argTypes,opts){return function(){return ccall(ident,returnType,argTypes,arguments,opts)}}var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(u8Array,idx,maxBytesToRead){var endIdx=idx+maxBytesToRead;var endPtr=idx;while(u8Array[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&u8Array.subarray&&UTF8Decoder){return UTF8Decoder.decode(u8Array.subarray(idx,endPtr))}else{var str="";while(idx<endPtr){var u0=u8Array[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=u8Array[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=u8Array[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{if((u0&248)!=240)warnOnce("Invalid UTF-8 leading byte 0x"+u0.toString(16)+" encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!");u0=(u0&7)<<18|u1<<12|u2<<6|u8Array[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}}return str}function UTF8ToString(ptr,maxBytesToRead){return ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):""}function stringToUTF8Array(str,outU8Array,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023}if(u<=127){if(outIdx>=endIdx)break;outU8Array[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;outU8Array[outIdx++]=192|u>>6;outU8Array[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;outU8Array[outIdx++]=224|u>>12;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;if(u>=2097152)warnOnce("Invalid Unicode code point 0x"+u.toString(16)+" encountered when serializing a JS string to an UTF-8 string on the asm.js/wasm heap! (Valid unicode code points should be in range 0-0x1FFFFF).");outU8Array[outIdx++]=240|u>>18;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}}outU8Array[outIdx]=0;return outIdx-startIdx}function stringToUTF8(str,outPtr,maxBytesToWrite){assert(typeof maxBytesToWrite=="number","stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127)++len;else if(u<=2047)len+=2;else if(u<=65535)len+=3;else len+=4}return len}var UTF16Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf-16le"):undefined;function writeArrayToMemory(array,buffer){assert(array.length>=0,"writeArrayToMemory array must have a length (should be an array or typed array)");HEAP8.set(array,buffer)}var WASM_PAGE_SIZE=65536;function alignUp(x,multiple){if(x%multiple>0){x+=multiple-x%multiple}return x}var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBufferAndViews(buf){buffer=buf;Module["HEAP8"]=HEAP8=new Int8Array(buf);Module["HEAP16"]=HEAP16=new Int16Array(buf);Module["HEAP32"]=HEAP32=new Int32Array(buf);Module["HEAPU8"]=HEAPU8=new Uint8Array(buf);Module["HEAPU16"]=HEAPU16=new Uint16Array(buf);Module["HEAPU32"]=HEAPU32=new Uint32Array(buf);Module["HEAPF32"]=HEAPF32=new Float32Array(buf);Module["HEAPF64"]=HEAPF64=new Float64Array(buf)}var STACK_BASE=434112,STACK_MAX=5676992,DYNAMIC_BASE=5676992,DYNAMICTOP_PTR=433920;assert(STACK_BASE%16===0,"stack must start aligned");assert(DYNAMIC_BASE%16===0,"heap must start aligned");var TOTAL_STACK=5242880;if(Module["TOTAL_STACK"])assert(TOTAL_STACK===Module["TOTAL_STACK"],"the stack size can no longer be determined at runtime");var INITIAL_TOTAL_MEMORY=Module["TOTAL_MEMORY"]||16777216;if(!Object.getOwnPropertyDescriptor(Module,"TOTAL_MEMORY"))Object.defineProperty(Module,"TOTAL_MEMORY",{configurable:true,get:function(){abort("Module.TOTAL_MEMORY has been replaced with plain INITIAL_TOTAL_MEMORY")}});assert(INITIAL_TOTAL_MEMORY>=TOTAL_STACK,"TOTAL_MEMORY should be larger than TOTAL_STACK, was "+INITIAL_TOTAL_MEMORY+"! (TOTAL_STACK="+TOTAL_STACK+")");assert(typeof Int32Array!=="undefined"&&typeof Float64Array!=="undefined"&&Int32Array.prototype.subarray!==undefined&&Int32Array.prototype.set!==undefined,"JS engine does not provide full typed array support");if(Module["wasmMemory"]){wasmMemory=Module["wasmMemory"]}else{wasmMemory=new WebAssembly.Memory({"initial":INITIAL_TOTAL_MEMORY/WASM_PAGE_SIZE})}if(wasmMemory){buffer=wasmMemory.buffer}INITIAL_TOTAL_MEMORY=buffer.byteLength;assert(INITIAL_TOTAL_MEMORY%WASM_PAGE_SIZE===0);updateGlobalBufferAndViews(buffer);HEAP32[DYNAMICTOP_PTR>>2]=DYNAMIC_BASE;function writeStackCookie(){assert((STACK_MAX&3)==0);HEAPU32[(STACK_MAX>>2)-1]=34821223;HEAPU32[(STACK_MAX>>2)-2]=2310721022;HEAP32[0]=1668509029}function checkStackCookie(){var cookie1=HEAPU32[(STACK_MAX>>2)-1];var cookie2=HEAPU32[(STACK_MAX>>2)-2];if(cookie1!=34821223||cookie2!=2310721022){abort("Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x"+cookie2.toString(16)+" "+cookie1.toString(16))}if(HEAP32[0]!==1668509029)abort("Runtime error: The application has corrupted its heap memory area (address zero)!")}function abortStackOverflow(allocSize){abort("Stack overflow! Attempted to allocate "+allocSize+" bytes on the stack, but stack has only "+(STACK_MAX-stackSave()+allocSize)+" bytes available!")}(function(){var h16=new Int16Array(1);var h8=new Int8Array(h16.buffer);h16[0]=25459;if(h8[0]!==115||h8[1]!==99)throw"Runtime error: expected the system to be little-endian!"})();function abortFnPtrError(ptr,sig){abort("Invalid function pointer "+ptr+" called with signature '"+sig+"'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this). Build with ASSERTIONS=2 for more info.")}function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback();continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){Module["dynCall_v"](func)}else{Module["dynCall_vi"](func,callback.arg)}}else{func(callback.arg===undefined?null:callback.arg)}}}var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function initRuntime(){checkStackCookie();assert(!runtimeInitialized);runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function preMain(){checkStackCookie();callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){checkStackCookie();runtimeExited=true}function postRun(){checkStackCookie();if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}assert(Math.imul,"This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");assert(Math.fround,"This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");assert(Math.clz32,"This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");assert(Math.trunc,"This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;var runDependencyTracking={};function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(id){assert(!runDependencyTracking[id]);runDependencyTracking[id]=1;if(runDependencyWatcher===null&&typeof setInterval!=="undefined"){runDependencyWatcher=setInterval(function(){if(ABORT){clearInterval(runDependencyWatcher);runDependencyWatcher=null;return}var shown=false;for(var dep in runDependencyTracking){if(!shown){shown=true;err("still waiting on run dependencies:")}err("dependency: "+dep)}if(shown){err("(end of list)")}},1e4)}}else{err("warning: run dependency added without ID")}}function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(id){assert(runDependencyTracking[id]);delete runDependencyTracking[id]}else{err("warning: run dependency removed without ID")}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}Module["preloadedImages"]={};Module["preloadedAudios"]={};function abort(what){if(Module["onAbort"]){Module["onAbort"](what)}what+="";out(what);err(what);ABORT=true;EXITSTATUS=1;var extra="";var output="abort("+what+") at "+stackTrace()+extra;throw output}var FS={error:function(){abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1")},init:function(){FS.error()},createDataFile:function(){FS.error()},createPreloadedFile:function(){FS.error()},createLazyFile:function(){FS.error()},open:function(){FS.error()},mkdev:function(){FS.error()},registerDevice:function(){FS.error()},analyzePath:function(){FS.error()},loadFilesFromDB:function(){FS.error()},ErrnoError:function ErrnoError(){FS.error()}};Module["FS_createDataFile"]=FS.createDataFile;Module["FS_createPreloadedFile"]=FS.createPreloadedFile;var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(filename){return String.prototype.startsWith?filename.startsWith(dataURIPrefix):filename.indexOf(dataURIPrefix)===0}var wasmBinaryFile="woff2.wasm";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile)}function getBinary(){try{if(wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(wasmBinaryFile)}else{throw"both async and sync fetching of the wasm failed"}}catch(err){abort(err)}}function getBinaryPromise(){if(!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)&&typeof fetch==="function"){return fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){if(!response["ok"]){throw"failed to load wasm binary file at '"+wasmBinaryFile+"'"}return response["arrayBuffer"]()}).catch(function(){return getBinary()})}return new Promise(function(resolve,reject){resolve(getBinary())})}function createWasm(){var info={"env":asmLibraryArg,"wasi_unstable":asmLibraryArg,"global":{"NaN":NaN,Infinity:Infinity},"global.Math":Math,"asm2wasm":asm2wasmImports};function receiveInstance(instance,module){var exports=instance.exports;Module["asm"]=exports;removeRunDependency("wasm-instantiate")}addRunDependency("wasm-instantiate");var trueModule=Module;function receiveInstantiatedSource(output){assert(Module===trueModule,"the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");trueModule=null;receiveInstance(output["instance"])}function instantiateArrayBuffer(receiver){return getBinaryPromise().then(function(binary){return WebAssembly.instantiate(binary,info)}).then(receiver,function(reason){err("failed to asynchronously prepare wasm: "+reason);abort(reason)})}function instantiateAsync(){if(!wasmBinary&&typeof WebAssembly.instantiateStreaming==="function"&&!isDataURI(wasmBinaryFile)&&typeof fetch==="function"){fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){var result=WebAssembly.instantiateStreaming(response,info);return result.then(receiveInstantiatedSource,function(reason){err("wasm streaming compile failed: "+reason);err("falling back to ArrayBuffer instantiation");instantiateArrayBuffer(receiveInstantiatedSource)})})}else{return instantiateArrayBuffer(receiveInstantiatedSource)}}if(Module["instantiateWasm"]){try{var exports=Module["instantiateWasm"](info,receiveInstance);return exports}catch(e){err("Module.instantiateWasm callback failed with error: "+e);return false}}instantiateAsync();return{}}Module["asm"]=createWasm;__ATINIT__.push({func:function(){globalCtors()}});var tempDoublePtr=434096;assert(tempDoublePtr%8==0);function demangle(func){var __cxa_demangle_func=Module["___cxa_demangle"]||Module["__cxa_demangle"];assert(__cxa_demangle_func);try{var s=func;if(s.startsWith("__Z"))s=s.substr(1);var len=lengthBytesUTF8(s)+1;var buf=_malloc(len);stringToUTF8(s,buf,len);var status=_malloc(4);var ret=__cxa_demangle_func(buf,0,0,status);if(HEAP32[status>>2]===0&&ret){return UTF8ToString(ret)}}catch(e){}finally{if(buf)_free(buf);if(status)_free(status);if(ret)_free(ret)}return func}function demangleAll(text){var regex=/\b__Z[\w\d_]+/g;return text.replace(regex,function(x){var y=demangle(x);return x===y?x:y+" ["+x+"]"})}function jsStackTrace(){var err=new Error;if(!err.stack){try{throw new Error(0)}catch(e){err=e}if(!err.stack){return"(no stack trace available)"}}return err.stack.toString()}function stackTrace(){var js=jsStackTrace();if(Module["extraStackTrace"])js+="\n"+Module["extraStackTrace"]();return demangleAll(js)}function ___assert_fail(condition,filename,line,func){abort("Assertion failed: "+UTF8ToString(condition)+", at: "+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"])}function ___cxa_allocate_exception(size){return _malloc(size)}var ___exception_infos={};var ___exception_last=0;function ___cxa_throw(ptr,type,destructor){___exception_infos[ptr]={ptr:ptr,adjusted:[ptr],type:type,destructor:destructor,refcount:0,caught:false,rethrown:false};___exception_last=ptr;if(!("uncaught_exception"in __ZSt18uncaught_exceptionv)){__ZSt18uncaught_exceptionv.uncaught_exceptions=1}else{__ZSt18uncaught_exceptionv.uncaught_exceptions++}throw ptr+" - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch."}function ___lock(){}function ___unlock(){}var PATH={splitPath:function(filename){var splitPathRe=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:function(parts,allowAboveRoot){var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},normalize:function(path){var isAbsolute=path.charAt(0)==="/",trailingSlash=path.substr(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(function(p){return!!p}),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:function(path){var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.substr(0,dir.length-1)}return root+dir},basename:function(path){if(path==="/")return"/";var lastSlash=path.lastIndexOf("/");if(lastSlash===-1)return path;return path.substr(lastSlash+1)},extname:function(path){return PATH.splitPath(path)[3]},join:function(){var paths=Array.prototype.slice.call(arguments,0);return PATH.normalize(paths.join("/"))},join2:function(l,r){return PATH.normalize(l+"/"+r)}};var SYSCALLS={buffers:[null,[],[]],printChar:function(stream,curr){var buffer=SYSCALLS.buffers[stream];assert(buffer);if(curr===0||curr===10){(stream===1?out:err)(UTF8ArrayToString(buffer,0));buffer.length=0}else{buffer.push(curr)}},varargs:0,get:function(varargs){SYSCALLS.varargs+=4;var ret=HEAP32[SYSCALLS.varargs-4>>2];return ret},getStr:function(){var ret=UTF8ToString(SYSCALLS.get());return ret},get64:function(){var low=SYSCALLS.get(),high=SYSCALLS.get();if(low>=0)assert(high===0);else assert(high===-1);return low},getZero:function(){assert(SYSCALLS.get()===0)}};function _fd_close(fd){try{abort("it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM");return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return e.errno}}function ___wasi_fd_close(){return _fd_close.apply(null,arguments)}function _fd_seek(fd,offset_low,offset_high,whence,newOffset){try{abort("it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM");return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return e.errno}}function ___wasi_fd_seek(){return _fd_seek.apply(null,arguments)}function flush_NO_FILESYSTEM(){var fflush=Module["_fflush"];if(fflush)fflush(0);var buffers=SYSCALLS.buffers;if(buffers[1].length)SYSCALLS.printChar(1,10);if(buffers[2].length)SYSCALLS.printChar(2,10)}function _fd_write(fd,iov,iovcnt,pnum){try{var num=0;for(var i=0;i<iovcnt;i++){var ptr=HEAP32[iov+i*8>>2];var len=HEAP32[iov+(i*8+4)>>2];for(var j=0;j<len;j++){SYSCALLS.printChar(fd,HEAPU8[ptr+j])}num+=len}HEAP32[pnum>>2]=num;return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return e.errno}}function ___wasi_fd_write(){return _fd_write.apply(null,arguments)}function getShiftFromSize(size){switch(size){case 1:return 0;case 2:return 1;case 4:return 2;case 8:return 3;default:throw new TypeError("Unknown type size: "+size)}}function embind_init_charCodes(){var codes=new Array(256);for(var i=0;i<256;++i){codes[i]=String.fromCharCode(i)}embind_charCodes=codes}var embind_charCodes=undefined;function readLatin1String(ptr){var ret="";var c=ptr;while(HEAPU8[c]){ret+=embind_charCodes[HEAPU8[c++]]}return ret}var awaitingDependencies={};var registeredTypes={};var typeDependencies={};var char_0=48;var char_9=57;function makeLegalFunctionName(name){if(undefined===name){return"_unknown"}name=name.replace(/[^a-zA-Z0-9_]/g,"$");var f=name.charCodeAt(0);if(f>=char_0&&f<=char_9){return"_"+name}else{return name}}function createNamedFunction(name,body){name=makeLegalFunctionName(name);return new Function("body","return function "+name+"() {\n"+'    "use strict";'+"    return body.apply(this, arguments);\n"+"};\n")(body)}function extendError(baseErrorType,errorName){var errorClass=createNamedFunction(errorName,function(message){this.name=errorName;this.message=message;var stack=new Error(message).stack;if(stack!==undefined){this.stack=this.toString()+"\n"+stack.replace(/^Error(:[^\n]*)?\n/,"")}});errorClass.prototype=Object.create(baseErrorType.prototype);errorClass.prototype.constructor=errorClass;errorClass.prototype.toString=function(){if(this.message===undefined){return this.name}else{return this.name+": "+this.message}};return errorClass}var BindingError=undefined;function throwBindingError(message){throw new BindingError(message)}var InternalError=undefined;function throwInternalError(message){throw new InternalError(message)}function whenDependentTypesAreResolved(myTypes,dependentTypes,getTypeConverters){myTypes.forEach(function(type){typeDependencies[type]=dependentTypes});function onComplete(typeConverters){var myTypeConverters=getTypeConverters(typeConverters);if(myTypeConverters.length!==myTypes.length){throwInternalError("Mismatched type converter count")}for(var i=0;i<myTypes.length;++i){registerType(myTypes[i],myTypeConverters[i])}}var typeConverters=new Array(dependentTypes.length);var unregisteredTypes=[];var registered=0;dependentTypes.forEach(function(dt,i){if(registeredTypes.hasOwnProperty(dt)){typeConverters[i]=registeredTypes[dt]}else{unregisteredTypes.push(dt);if(!awaitingDependencies.hasOwnProperty(dt)){awaitingDependencies[dt]=[]}awaitingDependencies[dt].push(function(){typeConverters[i]=registeredTypes[dt];++registered;if(registered===unregisteredTypes.length){onComplete(typeConverters)}})}});if(0===unregisteredTypes.length){onComplete(typeConverters)}}function registerType(rawType,registeredInstance,options){options=options||{};if(!("argPackAdvance"in registeredInstance)){throw new TypeError("registerType registeredInstance requires argPackAdvance")}var name=registeredInstance.name;if(!rawType){throwBindingError('type "'+name+'" must have a positive integer typeid pointer')}if(registeredTypes.hasOwnProperty(rawType)){if(options.ignoreDuplicateRegistrations){return}else{throwBindingError("Cannot register type '"+name+"' twice")}}registeredTypes[rawType]=registeredInstance;delete typeDependencies[rawType];if(awaitingDependencies.hasOwnProperty(rawType)){var callbacks=awaitingDependencies[rawType];delete awaitingDependencies[rawType];callbacks.forEach(function(cb){cb()})}}function __embind_register_bool(rawType,name,size,trueValue,falseValue){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(wt){return!!wt},"toWireType":function(destructors,o){return o?trueValue:falseValue},"argPackAdvance":8,"readValueFromPointer":function(pointer){var heap;if(size===1){heap=HEAP8}else if(size===2){heap=HEAP16}else if(size===4){heap=HEAP32}else{throw new TypeError("Unknown boolean type size: "+name)}return this["fromWireType"](heap[pointer>>shift])},destructorFunction:null})}function ClassHandle_isAliasOf(other){if(!(this instanceof ClassHandle)){return false}if(!(other instanceof ClassHandle)){return false}var leftClass=this.$$.ptrType.registeredClass;var left=this.$$.ptr;var rightClass=other.$$.ptrType.registeredClass;var right=other.$$.ptr;while(leftClass.baseClass){left=leftClass.upcast(left);leftClass=leftClass.baseClass}while(rightClass.baseClass){right=rightClass.upcast(right);rightClass=rightClass.baseClass}return leftClass===rightClass&&left===right}function shallowCopyInternalPointer(o){return{count:o.count,deleteScheduled:o.deleteScheduled,preservePointerOnDelete:o.preservePointerOnDelete,ptr:o.ptr,ptrType:o.ptrType,smartPtr:o.smartPtr,smartPtrType:o.smartPtrType}}function throwInstanceAlreadyDeleted(obj){function getInstanceTypeName(handle){return handle.$$.ptrType.registeredClass.name}throwBindingError(getInstanceTypeName(obj)+" instance already deleted")}var finalizationGroup=false;function detachFinalizer(handle){}function runDestructor($$){if($$.smartPtr){$$.smartPtrType.rawDestructor($$.smartPtr)}else{$$.ptrType.registeredClass.rawDestructor($$.ptr)}}function releaseClassHandle($$){$$.count.value-=1;var toDelete=0===$$.count.value;if(toDelete){runDestructor($$)}}function attachFinalizer(handle){if("undefined"===typeof FinalizationGroup){attachFinalizer=function(handle){return handle};return handle}finalizationGroup=new FinalizationGroup(function(iter){for(var result=iter.next();!result.done;result=iter.next()){var $$=result.value;if(!$$.ptr){console.warn("object already deleted: "+$$.ptr)}else{releaseClassHandle($$)}}});attachFinalizer=function(handle){finalizationGroup.register(handle,handle.$$,handle.$$);return handle};detachFinalizer=function(handle){finalizationGroup.unregister(handle.$$)};return attachFinalizer(handle)}function ClassHandle_clone(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this)}if(this.$$.preservePointerOnDelete){this.$$.count.value+=1;return this}else{var clone=attachFinalizer(Object.create(Object.getPrototypeOf(this),{$$:{value:shallowCopyInternalPointer(this.$$)}}));clone.$$.count.value+=1;clone.$$.deleteScheduled=false;return clone}}function ClassHandle_delete(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this)}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion")}detachFinalizer(this);releaseClassHandle(this.$$);if(!this.$$.preservePointerOnDelete){this.$$.smartPtr=undefined;this.$$.ptr=undefined}}function ClassHandle_isDeleted(){return!this.$$.ptr}var delayFunction=undefined;var deletionQueue=[];function flushPendingDeletes(){while(deletionQueue.length){var obj=deletionQueue.pop();obj.$$.deleteScheduled=false;obj["delete"]()}}function ClassHandle_deleteLater(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this)}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion")}deletionQueue.push(this);if(deletionQueue.length===1&&delayFunction){delayFunction(flushPendingDeletes)}this.$$.deleteScheduled=true;return this}function init_ClassHandle(){ClassHandle.prototype["isAliasOf"]=ClassHandle_isAliasOf;ClassHandle.prototype["clone"]=ClassHandle_clone;ClassHandle.prototype["delete"]=ClassHandle_delete;ClassHandle.prototype["isDeleted"]=ClassHandle_isDeleted;ClassHandle.prototype["deleteLater"]=ClassHandle_deleteLater}function ClassHandle(){}var registeredPointers={};function ensureOverloadTable(proto,methodName,humanName){if(undefined===proto[methodName].overloadTable){var prevFunc=proto[methodName];proto[methodName]=function(){if(!proto[methodName].overloadTable.hasOwnProperty(arguments.length)){throwBindingError("Function '"+humanName+"' called with an invalid number of arguments ("+arguments.length+") - expects one of ("+proto[methodName].overloadTable+")!")}return proto[methodName].overloadTable[arguments.length].apply(this,arguments)};proto[methodName].overloadTable=[];proto[methodName].overloadTable[prevFunc.argCount]=prevFunc}}function exposePublicSymbol(name,value,numArguments){if(Module.hasOwnProperty(name)){if(undefined===numArguments||undefined!==Module[name].overloadTable&&undefined!==Module[name].overloadTable[numArguments]){throwBindingError("Cannot register public name '"+name+"' twice")}ensureOverloadTable(Module,name,name);if(Module.hasOwnProperty(numArguments)){throwBindingError("Cannot register multiple overloads of a function with the same number of arguments ("+numArguments+")!")}Module[name].overloadTable[numArguments]=value}else{Module[name]=value;if(undefined!==numArguments){Module[name].numArguments=numArguments}}}function RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast){this.name=name;this.constructor=constructor;this.instancePrototype=instancePrototype;this.rawDestructor=rawDestructor;this.baseClass=baseClass;this.getActualType=getActualType;this.upcast=upcast;this.downcast=downcast;this.pureVirtualFunctions=[]}function upcastPointer(ptr,ptrClass,desiredClass){while(ptrClass!==desiredClass){if(!ptrClass.upcast){throwBindingError("Expected null or instance of "+desiredClass.name+", got an instance of "+ptrClass.name)}ptr=ptrClass.upcast(ptr);ptrClass=ptrClass.baseClass}return ptr}function constNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name)}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name)}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name)}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function genericPointerToWireType(destructors,handle){var ptr;if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name)}if(this.isSmartPointer){ptr=this.rawConstructor();if(destructors!==null){destructors.push(this.rawDestructor,ptr)}return ptr}else{return 0}}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name)}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name)}if(!this.isConst&&handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name)}var handleClass=handle.$$.ptrType.registeredClass;ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);if(this.isSmartPointer){if(undefined===handle.$$.smartPtr){throwBindingError("Passing raw pointer to smart pointer is illegal")}switch(this.sharingPolicy){case 0:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr}else{throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name)}break;case 1:ptr=handle.$$.smartPtr;break;case 2:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr}else{var clonedHandle=handle["clone"]();ptr=this.rawShare(ptr,__emval_register(function(){clonedHandle["delete"]()}));if(destructors!==null){destructors.push(this.rawDestructor,ptr)}}break;default:throwBindingError("Unsupporting sharing policy")}}return ptr}function nonConstNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name)}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name)}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name)}if(handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+handle.$$.ptrType.name+" to parameter type "+this.name)}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function simpleReadValueFromPointer(pointer){return this["fromWireType"](HEAPU32[pointer>>2])}function RegisteredPointer_getPointee(ptr){if(this.rawGetPointee){ptr=this.rawGetPointee(ptr)}return ptr}function RegisteredPointer_destructor(ptr){if(this.rawDestructor){this.rawDestructor(ptr)}}function RegisteredPointer_deleteObject(handle){if(handle!==null){handle["delete"]()}}function downcastPointer(ptr,ptrClass,desiredClass){if(ptrClass===desiredClass){return ptr}if(undefined===desiredClass.baseClass){return null}var rv=downcastPointer(ptr,ptrClass,desiredClass.baseClass);if(rv===null){return null}return desiredClass.downcast(rv)}function getInheritedInstanceCount(){return Object.keys(registeredInstances).length}function getLiveInheritedInstances(){var rv=[];for(var k in registeredInstances){if(registeredInstances.hasOwnProperty(k)){rv.push(registeredInstances[k])}}return rv}function setDelayFunction(fn){delayFunction=fn;if(deletionQueue.length&&delayFunction){delayFunction(flushPendingDeletes)}}function init_embind(){Module["getInheritedInstanceCount"]=getInheritedInstanceCount;Module["getLiveInheritedInstances"]=getLiveInheritedInstances;Module["flushPendingDeletes"]=flushPendingDeletes;Module["setDelayFunction"]=setDelayFunction}var registeredInstances={};function getBasestPointer(class_,ptr){if(ptr===undefined){throwBindingError("ptr should not be undefined")}while(class_.baseClass){ptr=class_.upcast(ptr);class_=class_.baseClass}return ptr}function getInheritedInstance(class_,ptr){ptr=getBasestPointer(class_,ptr);return registeredInstances[ptr]}function makeClassHandle(prototype,record){if(!record.ptrType||!record.ptr){throwInternalError("makeClassHandle requires ptr and ptrType")}var hasSmartPtrType=!!record.smartPtrType;var hasSmartPtr=!!record.smartPtr;if(hasSmartPtrType!==hasSmartPtr){throwInternalError("Both smartPtrType and smartPtr must be specified")}record.count={value:1};return attachFinalizer(Object.create(prototype,{$$:{value:record}}))}function RegisteredPointer_fromWireType(ptr){var rawPointer=this.getPointee(ptr);if(!rawPointer){this.destructor(ptr);return null}var registeredInstance=getInheritedInstance(this.registeredClass,rawPointer);if(undefined!==registeredInstance){if(0===registeredInstance.$$.count.value){registeredInstance.$$.ptr=rawPointer;registeredInstance.$$.smartPtr=ptr;return registeredInstance["clone"]()}else{var rv=registeredInstance["clone"]();this.destructor(ptr);return rv}}function makeDefaultHandle(){if(this.isSmartPointer){return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this.pointeeType,ptr:rawPointer,smartPtrType:this,smartPtr:ptr})}else{return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this,ptr:ptr})}}var actualType=this.registeredClass.getActualType(rawPointer);var registeredPointerRecord=registeredPointers[actualType];if(!registeredPointerRecord){return makeDefaultHandle.call(this)}var toType;if(this.isConst){toType=registeredPointerRecord.constPointerType}else{toType=registeredPointerRecord.pointerType}var dp=downcastPointer(rawPointer,this.registeredClass,toType.registeredClass);if(dp===null){return makeDefaultHandle.call(this)}if(this.isSmartPointer){return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp,smartPtrType:this,smartPtr:ptr})}else{return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp})}}function init_RegisteredPointer(){RegisteredPointer.prototype.getPointee=RegisteredPointer_getPointee;RegisteredPointer.prototype.destructor=RegisteredPointer_destructor;RegisteredPointer.prototype["argPackAdvance"]=8;RegisteredPointer.prototype["readValueFromPointer"]=simpleReadValueFromPointer;RegisteredPointer.prototype["deleteObject"]=RegisteredPointer_deleteObject;RegisteredPointer.prototype["fromWireType"]=RegisteredPointer_fromWireType}function RegisteredPointer(name,registeredClass,isReference,isConst,isSmartPointer,pointeeType,sharingPolicy,rawGetPointee,rawConstructor,rawShare,rawDestructor){this.name=name;this.registeredClass=registeredClass;this.isReference=isReference;this.isConst=isConst;this.isSmartPointer=isSmartPointer;this.pointeeType=pointeeType;this.sharingPolicy=sharingPolicy;this.rawGetPointee=rawGetPointee;this.rawConstructor=rawConstructor;this.rawShare=rawShare;this.rawDestructor=rawDestructor;if(!isSmartPointer&&registeredClass.baseClass===undefined){if(isConst){this["toWireType"]=constNoSmartPtrRawPointerToWireType;this.destructorFunction=null}else{this["toWireType"]=nonConstNoSmartPtrRawPointerToWireType;this.destructorFunction=null}}else{this["toWireType"]=genericPointerToWireType}}function replacePublicSymbol(name,value,numArguments){if(!Module.hasOwnProperty(name)){throwInternalError("Replacing nonexistant public symbol")}if(undefined!==Module[name].overloadTable&&undefined!==numArguments){Module[name].overloadTable[numArguments]=value}else{Module[name]=value;Module[name].argCount=numArguments}}function embind__requireFunction(signature,rawFunction){signature=readLatin1String(signature);function makeDynCaller(dynCall){var args=[];for(var i=1;i<signature.length;++i){args.push("a"+i)}var name="dynCall_"+signature+"_"+rawFunction;var body="return function "+name+"("+args.join(", ")+") {\n";body+="    return dynCall(rawFunction"+(args.length?", ":"")+args.join(", ")+");\n";body+="};\n";return new Function("dynCall","rawFunction",body)(dynCall,rawFunction)}var fp;if(Module["FUNCTION_TABLE_"+signature]!==undefined){fp=Module["FUNCTION_TABLE_"+signature][rawFunction]}else if(typeof FUNCTION_TABLE!=="undefined"){fp=FUNCTION_TABLE[rawFunction]}else{var dc=Module["dynCall_"+signature];if(dc===undefined){dc=Module["dynCall_"+signature.replace(/f/g,"d")];if(dc===undefined){throwBindingError("No dynCall invoker for signature: "+signature)}}fp=makeDynCaller(dc)}if(typeof fp!=="function"){throwBindingError("unknown function pointer with signature "+signature+": "+rawFunction)}return fp}var UnboundTypeError=undefined;function getTypeName(type){var ptr=___getTypeName(type);var rv=readLatin1String(ptr);_free(ptr);return rv}function throwUnboundTypeError(message,types){var unboundTypes=[];var seen={};function visit(type){if(seen[type]){return}if(registeredTypes[type]){return}if(typeDependencies[type]){typeDependencies[type].forEach(visit);return}unboundTypes.push(type);seen[type]=true}types.forEach(visit);throw new UnboundTypeError(message+": "+unboundTypes.map(getTypeName).join([", "]))}function __embind_register_class(rawType,rawPointerType,rawConstPointerType,baseClassRawType,getActualTypeSignature,getActualType,upcastSignature,upcast,downcastSignature,downcast,name,destructorSignature,rawDestructor){name=readLatin1String(name);getActualType=embind__requireFunction(getActualTypeSignature,getActualType);if(upcast){upcast=embind__requireFunction(upcastSignature,upcast)}if(downcast){downcast=embind__requireFunction(downcastSignature,downcast)}rawDestructor=embind__requireFunction(destructorSignature,rawDestructor);var legalFunctionName=makeLegalFunctionName(name);exposePublicSymbol(legalFunctionName,function(){throwUnboundTypeError("Cannot construct "+name+" due to unbound types",[baseClassRawType])});whenDependentTypesAreResolved([rawType,rawPointerType,rawConstPointerType],baseClassRawType?[baseClassRawType]:[],function(base){base=base[0];var baseClass;var basePrototype;if(baseClassRawType){baseClass=base.registeredClass;basePrototype=baseClass.instancePrototype}else{basePrototype=ClassHandle.prototype}var constructor=createNamedFunction(legalFunctionName,function(){if(Object.getPrototypeOf(this)!==instancePrototype){throw new BindingError("Use 'new' to construct "+name)}if(undefined===registeredClass.constructor_body){throw new BindingError(name+" has no accessible constructor")}var body=registeredClass.constructor_body[arguments.length];if(undefined===body){throw new BindingError("Tried to invoke ctor of "+name+" with invalid number of parameters ("+arguments.length+") - expected ("+Object.keys(registeredClass.constructor_body).toString()+") parameters instead!")}return body.apply(this,arguments)});var instancePrototype=Object.create(basePrototype,{constructor:{value:constructor}});constructor.prototype=instancePrototype;var registeredClass=new RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast);var referenceConverter=new RegisteredPointer(name,registeredClass,true,false,false);var pointerConverter=new RegisteredPointer(name+"*",registeredClass,false,false,false);var constPointerConverter=new RegisteredPointer(name+" const*",registeredClass,false,true,false);registeredPointers[rawType]={pointerType:pointerConverter,constPointerType:constPointerConverter};replacePublicSymbol(legalFunctionName,constructor);return[referenceConverter,pointerConverter,constPointerConverter]})}function heap32VectorToArray(count,firstElement){var array=[];for(var i=0;i<count;i++){array.push(HEAP32[(firstElement>>2)+i])}return array}function runDestructors(destructors){while(destructors.length){var ptr=destructors.pop();var del=destructors.pop();del(ptr)}}function __embind_register_class_constructor(rawClassType,argCount,rawArgTypesAddr,invokerSignature,invoker,rawConstructor){var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);invoker=embind__requireFunction(invokerSignature,invoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName="constructor "+classType.name;if(undefined===classType.registeredClass.constructor_body){classType.registeredClass.constructor_body=[]}if(undefined!==classType.registeredClass.constructor_body[argCount-1]){throw new BindingError("Cannot register multiple constructors with identical number of parameters ("+(argCount-1)+") for class '"+classType.name+"'! Overload resolution is currently only performed using the parameter count, not actual type info!")}classType.registeredClass.constructor_body[argCount-1]=function unboundTypeHandler(){throwUnboundTypeError("Cannot construct "+classType.name+" due to unbound types",rawArgTypes)};whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){classType.registeredClass.constructor_body[argCount-1]=function constructor_body(){if(arguments.length!==argCount-1){throwBindingError(humanName+" called with "+arguments.length+" arguments, expected "+(argCount-1))}var destructors=[];var args=new Array(argCount);args[0]=rawConstructor;for(var i=1;i<argCount;++i){args[i]=argTypes[i]["toWireType"](destructors,arguments[i-1])}var ptr=invoker.apply(null,args);runDestructors(destructors);return argTypes[0]["fromWireType"](ptr)};return[]});return[]})}function new_(constructor,argumentList){if(!(constructor instanceof Function)){throw new TypeError("new_ called with constructor type "+typeof constructor+" which is not a function")}var dummy=createNamedFunction(constructor.name||"unknownFunctionName",function(){});dummy.prototype=constructor.prototype;var obj=new dummy;var r=constructor.apply(obj,argumentList);return r instanceof Object?r:obj}function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){var argCount=argTypes.length;if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!")}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=false;for(var i=1;i<argTypes.length;++i){if(argTypes[i]!==null&&argTypes[i].destructorFunction===undefined){needsDestructorStack=true;break}}var returns=argTypes[0].name!=="void";var argsList="";var argsListWired="";for(var i=0;i<argCount-2;++i){argsList+=(i!==0?", ":"")+"arg"+i;argsListWired+=(i!==0?", ":"")+"arg"+i+"Wired"}var invokerFnBody="return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n"+"if (arguments.length !== "+(argCount-2)+") {\n"+"throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount-2)+" args!');\n"+"}\n";if(needsDestructorStack){invokerFnBody+="var destructors = [];\n"}var dtorStack=needsDestructorStack?"destructors":"null";var args1=["throwBindingError","invoker","fn","runDestructors","retType","classParam"];var args2=[throwBindingError,cppInvokerFunc,cppTargetFunc,runDestructors,argTypes[0],argTypes[1]];if(isClassMethodFunc){invokerFnBody+="var thisWired = classParam.toWireType("+dtorStack+", this);\n"}for(var i=0;i<argCount-2;++i){invokerFnBody+="var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";args1.push("argType"+i);args2.push(argTypes[i+2])}if(isClassMethodFunc){argsListWired="thisWired"+(argsListWired.length>0?", ":"")+argsListWired}invokerFnBody+=(returns?"var rv = ":"")+"invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";if(needsDestructorStack){invokerFnBody+="runDestructors(destructors);\n"}else{for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){var paramName=i===1?"thisWired":"arg"+(i-2)+"Wired";if(argTypes[i].destructorFunction!==null){invokerFnBody+=paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";args1.push(paramName+"_dtor");args2.push(argTypes[i].destructorFunction)}}}if(returns){invokerFnBody+="var ret = retType.fromWireType(rv);\n"+"return ret;\n"}else{}invokerFnBody+="}\n";args1.push(invokerFnBody);var invokerFunction=new_(Function,args1).apply(null,args2);return invokerFunction}function __embind_register_class_function(rawClassType,methodName,argCount,rawArgTypesAddr,invokerSignature,rawInvoker,context,isPureVirtual){var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);methodName=readLatin1String(methodName);rawInvoker=embind__requireFunction(invokerSignature,rawInvoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName=classType.name+"."+methodName;if(isPureVirtual){classType.registeredClass.pureVirtualFunctions.push(methodName)}function unboundTypesHandler(){throwUnboundTypeError("Cannot call "+humanName+" due to unbound types",rawArgTypes)}var proto=classType.registeredClass.instancePrototype;var method=proto[methodName];if(undefined===method||undefined===method.overloadTable&&method.className!==classType.name&&method.argCount===argCount-2){unboundTypesHandler.argCount=argCount-2;unboundTypesHandler.className=classType.name;proto[methodName]=unboundTypesHandler}else{ensureOverloadTable(proto,methodName,humanName);proto[methodName].overloadTable[argCount-2]=unboundTypesHandler}whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){var memberFunction=craftInvokerFunction(humanName,argTypes,classType,rawInvoker,context);if(undefined===proto[methodName].overloadTable){memberFunction.argCount=argCount-2;proto[methodName]=memberFunction}else{proto[methodName].overloadTable[argCount-2]=memberFunction}return[]});return[]})}var emval_free_list=[];var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle){if(handle>4&&0===--emval_handle_array[handle].refcount){emval_handle_array[handle]=undefined;emval_free_list.push(handle)}}function count_emval_handles(){var count=0;for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){++count}}return count}function get_first_emval(){for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){return emval_handle_array[i]}}return null}function init_emval(){Module["count_emval_handles"]=count_emval_handles;Module["get_first_emval"]=get_first_emval}function __emval_register(value){switch(value){case undefined:{return 1}case null:{return 2}case true:{return 3}case false:{return 4}default:{var handle=emval_free_list.length?emval_free_list.pop():emval_handle_array.length;emval_handle_array[handle]={refcount:1,value:value};return handle}}}function __embind_register_emval(rawType,name){name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(handle){var rv=emval_handle_array[handle].value;__emval_decref(handle);return rv},"toWireType":function(destructors,value){return __emval_register(value)},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:null})}function _embind_repr(v){if(v===null){return"null"}var t=typeof v;if(t==="object"||t==="array"||t==="function"){return v.toString()}else{return""+v}}function floatReadValueFromPointer(name,shift){switch(shift){case 2:return function(pointer){return this["fromWireType"](HEAPF32[pointer>>2])};case 3:return function(pointer){return this["fromWireType"](HEAPF64[pointer>>3])};default:throw new TypeError("Unknown float type: "+name)}}function __embind_register_float(rawType,name,size){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(value){return value},"toWireType":function(destructors,value){if(typeof value!=="number"&&typeof value!=="boolean"){throw new TypeError('Cannot convert "'+_embind_repr(value)+'" to '+this.name)}return value},"argPackAdvance":8,"readValueFromPointer":floatReadValueFromPointer(name,shift),destructorFunction:null})}function __embind_register_function(name,argCount,rawArgTypesAddr,signature,rawInvoker,fn){var argTypes=heap32VectorToArray(argCount,rawArgTypesAddr);name=readLatin1String(name);rawInvoker=embind__requireFunction(signature,rawInvoker);exposePublicSymbol(name,function(){throwUnboundTypeError("Cannot call "+name+" due to unbound types",argTypes)},argCount-1);whenDependentTypesAreResolved([],argTypes,function(argTypes){var invokerArgsArray=[argTypes[0],null].concat(argTypes.slice(1));replacePublicSymbol(name,craftInvokerFunction(name,invokerArgsArray,null,rawInvoker,fn),argCount-1);return[]})}function integerReadValueFromPointer(name,shift,signed){switch(shift){case 0:return signed?function readS8FromPointer(pointer){return HEAP8[pointer]}:function readU8FromPointer(pointer){return HEAPU8[pointer]};case 1:return signed?function readS16FromPointer(pointer){return HEAP16[pointer>>1]}:function readU16FromPointer(pointer){return HEAPU16[pointer>>1]};case 2:return signed?function readS32FromPointer(pointer){return HEAP32[pointer>>2]}:function readU32FromPointer(pointer){return HEAPU32[pointer>>2]};default:throw new TypeError("Unknown integer type: "+name)}}function __embind_register_integer(primitiveType,name,size,minRange,maxRange){name=readLatin1String(name);if(maxRange===-1){maxRange=4294967295}var shift=getShiftFromSize(size);var fromWireType=function(value){return value};if(minRange===0){var bitshift=32-8*size;fromWireType=function(value){return value<<bitshift>>>bitshift}}var isUnsignedType=name.indexOf("unsigned")!=-1;registerType(primitiveType,{name:name,"fromWireType":fromWireType,"toWireType":function(destructors,value){if(typeof value!=="number"&&typeof value!=="boolean"){throw new TypeError('Cannot convert "'+_embind_repr(value)+'" to '+this.name)}if(value<minRange||value>maxRange){throw new TypeError('Passing a number "'+_embind_repr(value)+'" from JS side to C/C++ side to an argument of type "'+name+'", which is outside the valid range ['+minRange+", "+maxRange+"]!")}return isUnsignedType?value>>>0:value|0},"argPackAdvance":8,"readValueFromPointer":integerReadValueFromPointer(name,shift,minRange!==0),destructorFunction:null})}function __embind_register_memory_view(rawType,dataTypeIndex,name){var typeMapping=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array];var TA=typeMapping[dataTypeIndex];function decodeMemoryView(handle){handle=handle>>2;var heap=HEAPU32;var size=heap[handle];var data=heap[handle+1];return new TA(heap["buffer"],data,size)}name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":decodeMemoryView,"argPackAdvance":8,"readValueFromPointer":decodeMemoryView},{ignoreDuplicateRegistrations:true})}function __embind_register_std_string(rawType,name){name=readLatin1String(name);var stdStringIsUTF8=name==="std::string";registerType(rawType,{name:name,"fromWireType":function(value){var length=HEAPU32[value>>2];var str;if(stdStringIsUTF8){var endChar=HEAPU8[value+4+length];var endCharSwap=0;if(endChar!=0){endCharSwap=endChar;HEAPU8[value+4+length]=0}var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i;if(HEAPU8[currentBytePtr]==0){var stringSegment=UTF8ToString(decodeStartPtr);if(str===undefined)str=stringSegment;else{str+=String.fromCharCode(0);str+=stringSegment}decodeStartPtr=currentBytePtr+1}}if(endCharSwap!=0)HEAPU8[value+4+length]=endCharSwap}else{var a=new Array(length);for(var i=0;i<length;++i){a[i]=String.fromCharCode(HEAPU8[value+4+i])}str=a.join("")}_free(value);return str},"toWireType":function(destructors,value){if(value instanceof ArrayBuffer){value=new Uint8Array(value)}var getLength;var valueIsOfTypeString=typeof value==="string";if(!(valueIsOfTypeString||value instanceof Uint8Array||value instanceof Uint8ClampedArray||value instanceof Int8Array)){throwBindingError("Cannot pass non-string to std::string")}if(stdStringIsUTF8&&valueIsOfTypeString){getLength=function(){return lengthBytesUTF8(value)}}else{getLength=function(){return value.length}}var length=getLength();var ptr=_malloc(4+length+1);HEAPU32[ptr>>2]=length;if(stdStringIsUTF8&&valueIsOfTypeString){stringToUTF8(value,ptr+4,length+1)}else{if(valueIsOfTypeString){for(var i=0;i<length;++i){var charCode=value.charCodeAt(i);if(charCode>255){_free(ptr);throwBindingError("String has UTF-16 code units that do not fit in 8 bits")}HEAPU8[ptr+4+i]=charCode}}else{for(var i=0;i<length;++i){HEAPU8[ptr+4+i]=value[i]}}}if(destructors!==null){destructors.push(_free,ptr)}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr)}})}function __embind_register_std_wstring(rawType,charSize,name){name=readLatin1String(name);var getHeap,shift;if(charSize===2){getHeap=function(){return HEAPU16};shift=1}else if(charSize===4){getHeap=function(){return HEAPU32};shift=2}registerType(rawType,{name:name,"fromWireType":function(value){var HEAP=getHeap();var length=HEAPU32[value>>2];var a=new Array(length);var start=value+4>>shift;for(var i=0;i<length;++i){a[i]=String.fromCharCode(HEAP[start+i])}_free(value);return a.join("")},"toWireType":function(destructors,value){var length=value.length;var ptr=_malloc(4+length*charSize);var HEAP=getHeap();HEAPU32[ptr>>2]=length;var start=ptr+4>>shift;for(var i=0;i<length;++i){HEAP[start+i]=value.charCodeAt(i)}if(destructors!==null){destructors.push(_free,ptr)}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr)}})}function __embind_register_void(rawType,name){name=readLatin1String(name);registerType(rawType,{isVoid:true,name:name,"argPackAdvance":0,"fromWireType":function(){return undefined},"toWireType":function(destructors,o){return undefined}})}function __emval_incref(handle){if(handle>4){emval_handle_array[handle].refcount+=1}}function requireRegisteredType(rawType,humanName){var impl=registeredTypes[rawType];if(undefined===impl){throwBindingError(humanName+" has unknown type "+getTypeName(rawType))}return impl}function __emval_take_value(type,argv){type=requireRegisteredType(type,"_emval_take_value");var v=type["readValueFromPointer"](argv);return __emval_register(v)}function _abort(){abort()}function _emscripten_get_heap_size(){return HEAP8.length}function emscripten_realloc_buffer(size){try{wasmMemory.grow(size-buffer.byteLength+65535>>16);updateGlobalBufferAndViews(wasmMemory.buffer);return 1}catch(e){console.error("emscripten_realloc_buffer: Attempted to grow heap from "+buffer.byteLength+" bytes to "+size+" bytes, but got error: "+e)}}function _emscripten_resize_heap(requestedSize){var oldSize=_emscripten_get_heap_size();assert(requestedSize>oldSize);var PAGE_MULTIPLE=65536;var LIMIT=2147483648-PAGE_MULTIPLE;if(requestedSize>LIMIT){err("Cannot enlarge memory, asked to go up to "+requestedSize+" bytes, but the limit is "+LIMIT+" bytes!");return false}var MIN_TOTAL_MEMORY=16777216;var newSize=Math.max(oldSize,MIN_TOTAL_MEMORY);while(newSize<requestedSize){if(newSize<=536870912){newSize=alignUp(2*newSize,PAGE_MULTIPLE)}else{newSize=Math.min(alignUp((3*newSize+2147483648)/4,PAGE_MULTIPLE),LIMIT)}if(newSize===oldSize){warnOnce("Cannot ask for more memory since we reached the practical limit in browsers (which is just below 2GB), so the request would have failed. Requesting only "+HEAP8.length)}}var replacement=emscripten_realloc_buffer(newSize);if(!replacement){err("Failed to grow the heap from "+oldSize+" bytes to "+newSize+" bytes, not enough memory!");return false}return true}function _exit(status){exit(status)}function _llvm_log2_f32(x){return Math.log(x)/Math.LN2}function _llvm_log2_f64(a0){return _llvm_log2_f32(a0)}function _llvm_trap(){abort("trap!")}function _emscripten_memcpy_big(dest,src,num){HEAPU8.set(HEAPU8.subarray(src,src+num),dest)}embind_init_charCodes();BindingError=Module["BindingError"]=extendError(Error,"BindingError");InternalError=Module["InternalError"]=extendError(Error,"InternalError");init_ClassHandle();init_RegisteredPointer();init_embind();UnboundTypeError=Module["UnboundTypeError"]=extendError(Error,"UnboundTypeError");init_emval();function nullFunc_i(x){abortFnPtrError(x,"i")}function nullFunc_ii(x){abortFnPtrError(x,"ii")}function nullFunc_iidiiii(x){abortFnPtrError(x,"iidiiii")}function nullFunc_iii(x){abortFnPtrError(x,"iii")}function nullFunc_iiii(x){abortFnPtrError(x,"iiii")}function nullFunc_iiiii(x){abortFnPtrError(x,"iiiii")}function nullFunc_jiji(x){abortFnPtrError(x,"jiji")}function nullFunc_v(x){abortFnPtrError(x,"v")}function nullFunc_vi(x){abortFnPtrError(x,"vi")}function nullFunc_vii(x){abortFnPtrError(x,"vii")}function nullFunc_viii(x){abortFnPtrError(x,"viii")}function nullFunc_viiii(x){abortFnPtrError(x,"viiii")}function nullFunc_viiiii(x){abortFnPtrError(x,"viiiii")}function nullFunc_viiiiii(x){abortFnPtrError(x,"viiiiii")}var asmGlobalArg={};var asmLibraryArg={"___assert_fail":___assert_fail,"___cxa_allocate_exception":___cxa_allocate_exception,"___cxa_throw":___cxa_throw,"___lock":___lock,"___unlock":___unlock,"___wasi_fd_close":___wasi_fd_close,"___wasi_fd_seek":___wasi_fd_seek,"___wasi_fd_write":___wasi_fd_write,"__embind_register_bool":__embind_register_bool,"__embind_register_class":__embind_register_class,"__embind_register_class_constructor":__embind_register_class_constructor,"__embind_register_class_function":__embind_register_class_function,"__embind_register_emval":__embind_register_emval,"__embind_register_float":__embind_register_float,"__embind_register_function":__embind_register_function,"__embind_register_integer":__embind_register_integer,"__embind_register_memory_view":__embind_register_memory_view,"__embind_register_std_string":__embind_register_std_string,"__embind_register_std_wstring":__embind_register_std_wstring,"__embind_register_void":__embind_register_void,"__emval_decref":__emval_decref,"__emval_incref":__emval_incref,"__emval_take_value":__emval_take_value,"__memory_base":1024,"__table_base":0,"_abort":_abort,"_emscripten_get_heap_size":_emscripten_get_heap_size,"_emscripten_memcpy_big":_emscripten_memcpy_big,"_emscripten_resize_heap":_emscripten_resize_heap,"_exit":_exit,"_llvm_log2_f64":_llvm_log2_f64,"_llvm_trap":_llvm_trap,"abortStackOverflow":abortStackOverflow,"memory":wasmMemory,"nullFunc_i":nullFunc_i,"nullFunc_ii":nullFunc_ii,"nullFunc_iidiiii":nullFunc_iidiiii,"nullFunc_iii":nullFunc_iii,"nullFunc_iiii":nullFunc_iiii,"nullFunc_iiiii":nullFunc_iiiii,"nullFunc_jiji":nullFunc_jiji,"nullFunc_v":nullFunc_v,"nullFunc_vi":nullFunc_vi,"nullFunc_vii":nullFunc_vii,"nullFunc_viii":nullFunc_viii,"nullFunc_viiii":nullFunc_viiii,"nullFunc_viiiii":nullFunc_viiiii,"nullFunc_viiiiii":nullFunc_viiiiii,"setTempRet0":setTempRet0,"table":wasmTable};var asm=Module["asm"](asmGlobalArg,asmLibraryArg,buffer);Module["asm"]=asm;var __ZSt18uncaught_exceptionv=Module["__ZSt18uncaught_exceptionv"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["__ZSt18uncaught_exceptionv"].apply(null,arguments)};var ___cxa_demangle=Module["___cxa_demangle"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["___cxa_demangle"].apply(null,arguments)};var ___embind_register_native_and_builtin_types=Module["___embind_register_native_and_builtin_types"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["___embind_register_native_and_builtin_types"].apply(null,arguments)};var ___getTypeName=Module["___getTypeName"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["___getTypeName"].apply(null,arguments)};var _fflush=Module["_fflush"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["_fflush"].apply(null,arguments)};var _free=Module["_free"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["_free"].apply(null,arguments)};var _malloc=Module["_malloc"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["_malloc"].apply(null,arguments)};var establishStackSpace=Module["establishStackSpace"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["establishStackSpace"].apply(null,arguments)};var globalCtors=Module["globalCtors"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["globalCtors"].apply(null,arguments)};var stackAlloc=Module["stackAlloc"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["stackAlloc"].apply(null,arguments)};var stackRestore=Module["stackRestore"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["stackRestore"].apply(null,arguments)};var stackSave=Module["stackSave"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["stackSave"].apply(null,arguments)};var dynCall_i=Module["dynCall_i"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_i"].apply(null,arguments)};var dynCall_ii=Module["dynCall_ii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_ii"].apply(null,arguments)};var dynCall_iidiiii=Module["dynCall_iidiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iidiiii"].apply(null,arguments)};var dynCall_iii=Module["dynCall_iii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iii"].apply(null,arguments)};var dynCall_iiii=Module["dynCall_iiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iiii"].apply(null,arguments)};var dynCall_iiiii=Module["dynCall_iiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_iiiii"].apply(null,arguments)};var dynCall_jiji=Module["dynCall_jiji"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_jiji"].apply(null,arguments)};var dynCall_v=Module["dynCall_v"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_v"].apply(null,arguments)};var dynCall_vi=Module["dynCall_vi"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_vi"].apply(null,arguments)};var dynCall_vii=Module["dynCall_vii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_vii"].apply(null,arguments)};var dynCall_viii=Module["dynCall_viii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viii"].apply(null,arguments)};var dynCall_viiii=Module["dynCall_viiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viiii"].apply(null,arguments)};var dynCall_viiiii=Module["dynCall_viiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viiiii"].apply(null,arguments)};var dynCall_viiiiii=Module["dynCall_viiiiii"]=function(){assert(runtimeInitialized,"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");assert(!runtimeExited,"the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");return Module["asm"]["dynCall_viiiiii"].apply(null,arguments)};Module["asm"]=asm;if(!Object.getOwnPropertyDescriptor(Module,"intArrayFromString"))Module["intArrayFromString"]=function(){abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"intArrayToString"))Module["intArrayToString"]=function(){abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};Module["ccall"]=ccall;Module["cwrap"]=cwrap;if(!Object.getOwnPropertyDescriptor(Module,"setValue"))Module["setValue"]=function(){abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"getValue"))Module["getValue"]=function(){abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"allocate"))Module["allocate"]=function(){abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"getMemory"))Module["getMemory"]=function(){abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"AsciiToString"))Module["AsciiToString"]=function(){abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stringToAscii"))Module["stringToAscii"]=function(){abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"UTF8ArrayToString"))Module["UTF8ArrayToString"]=function(){abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"UTF8ToString"))Module["UTF8ToString"]=function(){abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stringToUTF8Array"))Module["stringToUTF8Array"]=function(){abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};Module["stringToUTF8"]=stringToUTF8;if(!Object.getOwnPropertyDescriptor(Module,"lengthBytesUTF8"))Module["lengthBytesUTF8"]=function(){abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"UTF16ToString"))Module["UTF16ToString"]=function(){abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stringToUTF16"))Module["stringToUTF16"]=function(){abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"lengthBytesUTF16"))Module["lengthBytesUTF16"]=function(){abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"UTF32ToString"))Module["UTF32ToString"]=function(){abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stringToUTF32"))Module["stringToUTF32"]=function(){abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"lengthBytesUTF32"))Module["lengthBytesUTF32"]=function(){abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"allocateUTF8"))Module["allocateUTF8"]=function(){abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stackTrace"))Module["stackTrace"]=function(){abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"addOnPreRun"))Module["addOnPreRun"]=function(){abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"addOnInit"))Module["addOnInit"]=function(){abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"addOnPreMain"))Module["addOnPreMain"]=function(){abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"addOnExit"))Module["addOnExit"]=function(){abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"addOnPostRun"))Module["addOnPostRun"]=function(){abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"writeStringToMemory"))Module["writeStringToMemory"]=function(){abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"writeArrayToMemory"))Module["writeArrayToMemory"]=function(){abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"writeAsciiToMemory"))Module["writeAsciiToMemory"]=function(){abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"addRunDependency"))Module["addRunDependency"]=function(){abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"removeRunDependency"))Module["removeRunDependency"]=function(){abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"ENV"))Module["ENV"]=function(){abort("'ENV' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"FS"))Module["FS"]=function(){abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"FS_createFolder"))Module["FS_createFolder"]=function(){abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"FS_createPath"))Module["FS_createPath"]=function(){abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"FS_createDataFile"))Module["FS_createDataFile"]=function(){abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"FS_createPreloadedFile"))Module["FS_createPreloadedFile"]=function(){abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"FS_createLazyFile"))Module["FS_createLazyFile"]=function(){abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"FS_createLink"))Module["FS_createLink"]=function(){abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"FS_createDevice"))Module["FS_createDevice"]=function(){abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"FS_unlink"))Module["FS_unlink"]=function(){abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")};if(!Object.getOwnPropertyDescriptor(Module,"GL"))Module["GL"]=function(){abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"dynamicAlloc"))Module["dynamicAlloc"]=function(){abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"loadDynamicLibrary"))Module["loadDynamicLibrary"]=function(){abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"loadWebAssemblyModule"))Module["loadWebAssemblyModule"]=function(){abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"getLEB"))Module["getLEB"]=function(){abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"getFunctionTables"))Module["getFunctionTables"]=function(){abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"alignFunctionTables"))Module["alignFunctionTables"]=function(){abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"registerFunctions"))Module["registerFunctions"]=function(){abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"addFunction"))Module["addFunction"]=function(){abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"removeFunction"))Module["removeFunction"]=function(){abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"getFuncWrapper"))Module["getFuncWrapper"]=function(){abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"prettyPrint"))Module["prettyPrint"]=function(){abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"makeBigInt"))Module["makeBigInt"]=function(){abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"dynCall"))Module["dynCall"]=function(){abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"getCompilerSetting"))Module["getCompilerSetting"]=function(){abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stackSave"))Module["stackSave"]=function(){abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stackRestore"))Module["stackRestore"]=function(){abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"stackAlloc"))Module["stackAlloc"]=function(){abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"establishStackSpace"))Module["establishStackSpace"]=function(){abort("'establishStackSpace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"print"))Module["print"]=function(){abort("'print' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"printErr"))Module["printErr"]=function(){abort("'printErr' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"getTempRet0"))Module["getTempRet0"]=function(){abort("'getTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"setTempRet0"))Module["setTempRet0"]=function(){abort("'setTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"callMain"))Module["callMain"]=function(){abort("'callMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"abort"))Module["abort"]=function(){abort("'abort' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"Pointer_stringify"))Module["Pointer_stringify"]=function(){abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};if(!Object.getOwnPropertyDescriptor(Module,"warnOnce"))Module["warnOnce"]=function(){abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")};Module["writeStackCookie"]=writeStackCookie;Module["checkStackCookie"]=checkStackCookie;Module["abortStackOverflow"]=abortStackOverflow;if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_NORMAL"))Object.defineProperty(Module,"ALLOC_NORMAL",{configurable:true,get:function(){abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")}});if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_STACK"))Object.defineProperty(Module,"ALLOC_STACK",{configurable:true,get:function(){abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")}});if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_DYNAMIC"))Object.defineProperty(Module,"ALLOC_DYNAMIC",{configurable:true,get:function(){abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")}});if(!Object.getOwnPropertyDescriptor(Module,"ALLOC_NONE"))Object.defineProperty(Module,"ALLOC_NONE",{configurable:true,get:function(){abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")}});if(!Object.getOwnPropertyDescriptor(Module,"calledRun"))Object.defineProperty(Module,"calledRun",{configurable:true,get:function(){abort("'calledRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you")}});var calledRun;Module["then"]=function(func){if(calledRun){func(Module)}else{var old=Module["onRuntimeInitialized"];Module["onRuntimeInitialized"]=function(){if(old)old();func(Module)}}return Module};function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status}dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller};function run(args){args=args||arguments_;if(runDependencies>0){return}writeStackCookie();preRun();if(runDependencies>0)return;function doRun(){if(calledRun)return;calledRun=true;if(ABORT)return;initRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();assert(!Module["_main"],'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("")},1);doRun()},1)}else{doRun()}checkStackCookie()}Module["run"]=run;function checkUnflushedContent(){var print=out;var printErr=err;var has=false;out=err=function(x){has=true};try{var flush=flush_NO_FILESYSTEM;if(flush)flush(0)}catch(e){}out=print;err=printErr;if(has){warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.");warnOnce("(this may also be due to not including full filesystem support - try building with -s FORCE_FILESYSTEM=1)")}}function exit(status,implicit){checkUnflushedContent();if(implicit&&noExitRuntime&&status===0){return}if(noExitRuntime){if(!implicit){err("program exited (with status: "+status+"), but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)")}}else{ABORT=true;EXITSTATUS=status;exitRuntime();if(Module["onExit"])Module["onExit"](status)}quit_(status,new ExitStatus(status))}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}noExitRuntime=true;run();


  return Module
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = Module;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return Module; });
    else if (typeof exports === 'object')
      exports["Module"] = Module;
    

}).call(this)}).call(this,require('_process'),"/node_modules/fonteditor-core/woff2")
},{"_process":4}]},{},[5]);
