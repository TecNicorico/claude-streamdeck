import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls2 = __require("tls");
    var { randomBytes: randomBytes2, createHash: createHash2 } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes2(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash2("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls2.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws2, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws2.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws2.pause();
      });
      ws2.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws2.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws2.readyState === ws2.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws2.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws2.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws2.terminate();
      };
      duplex._final = function(callback) {
        if (ws2.readyState === ws2.CONNECTING) {
          ws2.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws2._socket === null) return;
        if (ws2._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws2._socket.once("finish", function finish() {
            callback();
          });
          ws2.close();
        }
      };
      duplex._read = function() {
        if (ws2.isPaused) ws2.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws2.readyState === ws2.CONNECTING) {
          ws2.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws2.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash: createHash2 } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash2("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws2 = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws2._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws2._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws2.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws2);
          ws2.on("close", () => {
            this.clients.delete(ws2);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws2, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// src/plugin.js
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path3 from "node:path";
import { spawn, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

// src/osa.js
function escapeAppleScript(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
var HK_MODIFIERS = {
  cmd: "command down",
  command: "command down",
  "\u2318": "command down",
  opt: "option down",
  option: "option down",
  alt: "option down",
  "\u2325": "option down",
  ctrl: "control down",
  control: "control down",
  "\u2303": "control down",
  shift: "shift down",
  "\u21E7": "shift down"
};
var HK_KEY_CODES = {
  space: 49,
  return: 36,
  enter: 36,
  tab: 48,
  escape: 53,
  esc: 53,
  up: 126,
  down: 125,
  left: 123,
  right: 124,
  f1: 122,
  f2: 120,
  f3: 99,
  f4: 118,
  f5: 96,
  f6: 97,
  f7: 98,
  f8: 100,
  f9: 101,
  f10: 109,
  f11: 103,
  f12: 111
};
function parseHotkey(str) {
  if (str == null) return null;
  const tokens = String(str).split("+").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length) return null;
  const keyTok = tokens.pop();
  const modifiers = [];
  for (const t of tokens) {
    const m = HK_MODIFIERS[t];
    if (!m) return null;
    if (!modifiers.includes(m)) modifiers.push(m);
  }
  if (Object.prototype.hasOwnProperty.call(HK_KEY_CODES, keyTok)) {
    return { modifiers, key: { kind: "code", code: HK_KEY_CODES[keyTok] } };
  }
  if (keyTok.length === 1) return { modifiers, key: { kind: "char", char: keyTok } };
  return null;
}
function hotkeyClause(parsed) {
  if (!parsed) return null;
  const using = parsed.modifiers.length ? ` using {${parsed.modifiers.join(", ")}}` : "";
  if (parsed.key.kind === "code") return `key code ${parsed.key.code}${using}`;
  return `keystroke "${escapeAppleScript(parsed.key.char)}"${using}`;
}
function classifyCustomCommand(cmd, { home = "", exists = () => false } = {}) {
  const raw = String(cmd ?? "").trim();
  if (!raw) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return { mode: "open", arg: raw };
  let path4 = raw;
  if (raw === "~") path4 = home;
  else if (raw.startsWith("~/")) path4 = home + raw.slice(1);
  if (exists(path4)) return { mode: "open", arg: path4 };
  return { mode: "app", arg: raw };
}
function parseKeychainToken(raw) {
  try {
    const j = JSON.parse(raw);
    return j?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}
function outermostAppBundle(execPath) {
  const m = /^(.*?\.app)\//.exec(String(execPath ?? ""));
  return m ? m[1] : null;
}
function parsePsTree(out) {
  const tree = /* @__PURE__ */ new Map();
  for (const line2 of String(out ?? "").split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*\S)\s*$/.exec(line2);
    if (m) tree.set(m[1], { ppid: m[2], comm: m[3] });
  }
  return tree;
}
function parseElapsed(str) {
  const s = String(str ?? "").trim();
  if (/^\d+$/.test(s)) return Number(s);
  const m = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/.exec(s);
  if (!m) return null;
  const [, dd, hh, mm, ss] = m;
  return Number(dd ?? 0) * 86400 + Number(hh ?? 0) * 3600 + Number(mm) * 60 + Number(ss);
}
function parseProcStarts(out, nowMs) {
  const starts = /* @__PURE__ */ new Map();
  for (const line2 of String(out ?? "").split("\n")) {
    const m = /^\s*(\d+)\s+(\S+)\s*$/.exec(line2);
    if (!m) continue;
    const secs = parseElapsed(m[2]);
    if (secs != null) starts.set(Number(m[1]), nowMs - secs * 1e3);
  }
  return starts;
}
function hostAppForPid(tree, pid, maxDepth = 16) {
  let cur = String(pid);
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < maxDepth && cur && !seen.has(cur); i++) {
    seen.add(cur);
    const node = tree.get(cur);
    if (!node) break;
    const bundle = outermostAppBundle(node.comm);
    if (bundle) return bundle;
    cur = node.ppid;
  }
  return null;
}
function terminalFocusScript(tty) {
  const esc2 = escapeAppleScript(String(tty));
  return [
    "with timeout of 7 seconds",
    'tell application "Terminal"',
    "  activate",
    "  repeat with w in windows",
    "    repeat with t in tabs of w",
    `      if (tty of t) ends with "${esc2}" then`,
    "        set selected of t to true",
    "        set frontmost of w to true",
    "        return",
    "      end if",
    "    end repeat",
    "  end repeat",
    "end tell",
    'error "not found"',
    "end timeout"
  ];
}
function focusStrategyForBundle(bundle) {
  if (!bundle) return null;
  const base2 = String(bundle).replace(/\/+$/, "").split("/").pop();
  if (base2 === "Terminal.app") return "terminal";
  if (base2 === "Visual Studio Code.app") return "vscode";
  return "app";
}

// src/consumi.js
function pickBucket(o) {
  if (!o || typeof o !== "object") return null;
  let pct = null;
  if (typeof o.utilization === "number") pct = o.utilization;
  const resetsAt = o.resets_at ?? o.resetsAt ?? null;
  return pct == null && !resetsAt ? null : { pct, resetsAt };
}
function usageDaRisposta(j) {
  const limits = Array.isArray(j?.limits) ? j.limits : [];
  const fromLimit = (kind) => {
    const l = limits.find((x) => x.kind === kind);
    return l ? { pct: l.percent, resetsAt: l.resets_at } : null;
  };
  const scoped = limits.find((x) => x.kind === "weekly_scoped");
  const models = [];
  for (const l of limits) {
    if (l.kind !== "weekly_scoped") continue;
    const name = l.scope?.model?.display_name;
    if (name && typeof l.percent === "number") models.push({ name, pct: l.percent, resetsAt: l.resets_at ?? null });
  }
  for (const [key, name] of [["seven_day_opus", "Opus"], ["seven_day_sonnet", "Sonnet"]]) {
    const b = pickBucket(j?.[key]);
    if (b?.pct != null && !models.some((m) => m.name === name)) models.push({ name, pct: b.pct, resetsAt: b.resetsAt });
  }
  return {
    fiveHour: pickBucket(j?.five_hour) ?? fromLimit("session"),
    weekly: pickBucket(j?.seven_day) ?? fromLimit("weekly_all"),
    weeklyOpus: pickBucket(j?.seven_day_opus),
    scopedPct: scoped?.percent ?? null,
    scopedName: scoped?.scope?.model?.display_name ?? null,
    models
  };
}
var FILE_DESKTOP = "plan-usage-history.json";
function percorsiDesktop({ platform: platform2, env = {}, home, listDir = () => [] }) {
  const out = [];
  if (platform2 === "darwin") {
    out.push(`${home}/Library/Application Support/Claude/${FILE_DESKTOP}`);
    return out;
  }
  if (platform2 === "win32") {
    const sep = "\\";
    const roaming = env.APPDATA || `${home}${sep}AppData${sep}Roaming`;
    const local = env.LOCALAPPDATA || `${home}${sep}AppData${sep}Local`;
    const dati = `${local}${sep}Claude-Data`;
    for (const nome of listDir(dati)) out.push(`${dati}${sep}${nome}${sep}${FILE_DESKTOP}`);
    out.push(`${roaming}${sep}Claude${sep}${FILE_DESKTOP}`);
    const pacchetti = `${local}${sep}Packages`;
    for (const nome of listDir(pacchetti)) {
      if (/^Claude_/i.test(nome)) out.push(`${pacchetti}${sep}${nome}${sep}LocalCache${sep}Roaming${sep}Claude${sep}${FILE_DESKTOP}`);
    }
    return out;
  }
  out.push(`${env.XDG_CONFIG_HOME || `${home}/.config`}/Claude/${FILE_DESKTOP}`);
  return out;
}
var percento = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e3 ? v : null;
var bucket = (v) => percento(v) == null ? null : { pct: v, resetsAt: null };
function letturaDesktop(raw) {
  let j;
  try {
    j = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  const samples = Array.isArray(j?.samples) ? j.samples : Array.isArray(j) ? j : [];
  let best = null;
  for (const s of samples) {
    const t = typeof s?.t === "number" ? s.t : Date.parse(s?.t);
    if (!Number.isFinite(t) || !s?.u || typeof s.u !== "object") continue;
    if (percento(s.u.fh) == null && percento(s.u.sd) == null) continue;
    if (!best || t > best.t) best = { t, u: s.u };
  }
  if (!best) return null;
  const { u } = best;
  const models = [];
  if (percento(u.so) != null) models.push({ name: "Opus", pct: u.so, resetsAt: null });
  if (percento(u.sn) != null) models.push({ name: "Sonnet", pct: u.sn, resetsAt: null });
  return {
    at: best.t,
    usage: {
      fiveHour: bucket(u.fh),
      weekly: bucket(u.sd),
      weeklyOpus: bucket(u.so),
      scopedPct: null,
      scopedName: null,
      models
    }
  };
}
function formaDesktop(raw) {
  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    return "not JSON";
  }
  const chiavi = (o) => o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o).join(",") : typeof o;
  const samples = Array.isArray(j?.samples) ? j.samples : Array.isArray(j) ? j : null;
  if (!samples) return `top {${chiavi(j)}}`;
  const ultimo = samples[samples.length - 1];
  return `${samples.length} samples, last {${chiavi(ultimo)}}, u {${chiavi(ultimo?.u)}}`;
}
var istante = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n < 1e12 ? n * 1e3 : n).toISOString();
};
function letturaStatusline(payload, now) {
  const rl = payload?.rate_limits;
  if (!rl || typeof rl !== "object") return null;
  const fin = (w) => percento(w?.used_percentage) == null ? null : { pct: w.used_percentage, resetsAt: istante(w.resets_at) };
  const fiveHour = fin(rl.five_hour), weekly = fin(rl.seven_day);
  if (!fiveHour && !weekly) return null;
  return { at: now, usage: { fiveHour, weekly, weeklyOpus: null, scopedPct: null, scopedName: null, models: [] } };
}
function rigaStatusline(payload) {
  const parti2 = [];
  const modello = payload?.model?.display_name;
  if (typeof modello === "string" && modello) parti2.push(modello);
  const dir = payload?.workspace?.current_dir ?? payload?.cwd;
  if (typeof dir === "string" && dir) parti2.push(dir.split(/[\\/]/).filter(Boolean).pop() ?? dir);
  const rl = payload?.rate_limits;
  const p = (w) => percento(w?.used_percentage) == null ? null : Math.round(w.used_percentage);
  if (p(rl?.five_hour) != null) parti2.push(`5h ${p(rl.five_hour)}%`);
  if (p(rl?.seven_day) != null) parti2.push(`7d ${p(rl.seven_day)}%`);
  return parti2.join(" \xB7 ");
}
function statuslineFragment(url, { windows = false } = {}) {
  const command = `${windows ? "curl.exe" : "curl"} -s -m 2 --data-binary "@-" ${url}`;
  return ['"statusLine": {', '  "type": "command",', `  "command": ${JSON.stringify(command)}`, "}"].join("\n");
}
var CINQUE_ORE_MS = 5 * 36e5;
var SETTE_GIORNI_MS = 7 * 24 * 36e5;
var daEndpoint = (src) => !src || src === "api";
function finestraValida(b, src, at, now, durataMs) {
  if (!b || daEndpoint(src)) return b ?? null;
  if (b.resetsAt) return new Date(b.resetsAt).getTime() > now ? b : null;
  return now - (at ?? 0) < durataMs ? b : null;
}
var cinqueOre = (usage, src, at, now) => finestraValida(usage?.fiveHour ?? null, src, at, now, CINQUE_ORE_MS);
var FRESCA_MS = 30 * 6e4;
var futuro = (iso, now) => !!iso && new Date(iso).getTime() > now;
function completa(nuova, vecchia2, vecchiaAt, now) {
  if (!vecchia2) return nuova;
  const fresca = now - (vecchiaAt ?? 0) < FRESCA_MS;
  const unisci = (b, old) => {
    if (!b) return fresca && old && (!old.resetsAt || futuro(old.resetsAt, now)) ? old : null;
    return b.resetsAt == null && futuro(old?.resetsAt, now) ? { ...b, resetsAt: old.resetsAt } : b;
  };
  const models = nuova.models.map((m) => unisci(m, (vecchia2.models ?? []).find((o) => o.name === m.name)));
  if (fresca) {
    for (const o of vecchia2.models ?? []) if (!models.some((m) => m.name === o.name)) models.push(o);
  }
  return {
    ...nuova,
    fiveHour: unisci(nuova.fiveHour, vecchia2.fiveHour),
    weekly: unisci(nuova.weekly, vecchia2.weekly),
    weeklyOpus: unisci(nuova.weeklyOpus, vecchia2.weeklyOpus),
    scopedPct: nuova.scopedPct ?? (fresca ? vecchia2.scopedPct ?? null : null),
    scopedName: nuova.scopedName ?? (fresca ? vecchia2.scopedName ?? null : null),
    models
  };
}
var API_BASE_MS = 5 * 6e4;
var API_MAX_MS = 30 * 6e4;
var DESKTOP_BASTA_MS = 10 * 6e4;
var API_CON_DESKTOP_MS = 30 * 6e4;
function serveEndpoint({ now, usageAt, src, apiOkAt }) {
  const localeFresca = !daEndpoint(src) && now - (usageAt ?? 0) < DESKTOP_BASTA_MS;
  if (!localeFresca) return true;
  return now - (apiOkAt ?? 0) >= API_CON_DESKTOP_MS;
}
function ritardoDopo429(attuale, retryAfter) {
  const ra = Number(retryAfter);
  const dalServer = Number.isFinite(ra) && ra > 0 ? ra * 1e3 : 0;
  return Math.min(Math.max(attuale * 2, dalServer, API_BASE_MS), API_MAX_MS);
}

// src/usage.js
function windowStartMs(kind, now) {
  if (kind === "5h") return now - 5 * 3600 * 1e3;
  if (kind === "7day") return now - 7 * 24 * 3600 * 1e3;
  const d = new Date(now);
  if (kind === "month") d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
var RATES = { opus: [5, 25], sonnet: [2, 10], haiku: [1, 5], fable: [10, 50] };
var MODEL_RATES = { "opus-5-5": [4, 20] };
var CACHE_READ_MULTS = { "fable-5-1": 0.025, "mythos-5-1": 0.025, "opus-5-5": 0.05 };
var CACHE_READ_MULT_DEFAULT = 0.1;
function modelEntry(table, model) {
  const m = String(model ?? "").toLowerCase();
  for (const [key, v] of Object.entries(table)) if (m.includes(key)) return v;
  return void 0;
}
function validNum(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : void 0;
}
function familyOf(model) {
  const m = String(model ?? "").toLowerCase();
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("haiku")) return "haiku";
  if (m.includes("fable") || m.includes("mythos")) return "fable";
  return null;
}
function rateFor(model, overrides) {
  const fam = familyOf(model);
  if (!fam) return null;
  const [dIn, dOut] = modelEntry(MODEL_RATES, model) ?? RATES[fam];
  const o = overrides?.[fam];
  return [validNum(o?.in) ?? dIn, validNum(o?.out) ?? dOut];
}
var CACHE_WRITE_5M_MULT = 1.25;
var CACHE_WRITE_1H_MULT = 2;
function estimateCost(model, tok, overrides) {
  const r = rateFor(model, overrides);
  if (!r) return 0;
  const [inR, outR] = r;
  const t = tok || {};
  const write = t.cacheCreate || 0;
  const write1h = Math.min(t.cacheCreate1h || 0, write);
  return ((t.in || 0) * inR + (t.out || 0) * outR + (t.cacheRead || 0) * (modelEntry(CACHE_READ_MULTS, model) ?? CACHE_READ_MULT_DEFAULT) * inR + (write - write1h) * CACHE_WRITE_5M_MULT * inR + write1h * CACHE_WRITE_1H_MULT * inR) / 1e6;
}
function totalOf(tok) {
  return tok.in + tok.out + tok.cacheRead + tok.cacheCreate;
}
function parseRequests(text) {
  const byId = /* @__PURE__ */ new Map();
  const noId = [];
  for (const line2 of String(text ?? "").split("\n")) {
    if (!line2) continue;
    let j;
    try {
      j = JSON.parse(line2);
    } catch {
      continue;
    }
    if (j.type !== "assistant") continue;
    const u = j.message?.usage;
    if (!u || !j.timestamp) continue;
    const tok = {
      in: u.input_tokens || 0,
      out: u.output_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
      // Grand total of the cache write, plus the 1-hour-TTL slice of it. The
      // breakdown lives in a nested object that older transcripts lack, hence the
      // 0 default — see estimateCost for why that default is the right one.
      cacheCreate: u.cache_creation_input_tokens || 0,
      cacheCreate1h: u.cache_creation?.ephemeral_1h_input_tokens || 0
    };
    const rec = { id: j.message?.id ?? j.requestId ?? null, t: new Date(j.timestamp).getTime(), model: j.message?.model ?? "", tok };
    if (rec.id == null) {
      noId.push(rec);
      continue;
    }
    const prev = byId.get(rec.id);
    if (!prev || totalOf(tok) > totalOf(prev.tok)) byId.set(rec.id, rec);
  }
  return [...byId.values(), ...noId];
}
function localDay(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function newDayCounts(day) {
  return { day, msgs: 0, looseTokens: 0, reqTok: /* @__PURE__ */ new Map(), seenMsg: /* @__PURE__ */ new Set() };
}
function foldDayChunk(counts, text) {
  for (const line2 of String(text ?? "").split("\n")) {
    if (!line2) continue;
    let j;
    try {
      j = JSON.parse(line2);
    } catch {
      continue;
    }
    if (!j.timestamp || localDay(j.timestamp) !== counts.day) continue;
    const mid = j.message?.id ?? j.requestId;
    if (j.type === "user") counts.msgs++;
    else if (j.type === "assistant" && (!mid || !counts.seenMsg.has(mid))) {
      if (mid) counts.seenMsg.add(mid);
      counts.msgs++;
    }
    const u = j.message?.usage;
    if (!u) continue;
    const tok = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    if (mid) counts.reqTok.set(mid, Math.max(counts.reqTok.get(mid) ?? 0, tok));
    else counts.looseTokens += tok;
  }
  return counts;
}
function dayCountsTotals(counts) {
  let tokens = counts.looseTokens;
  for (const t of counts.reqTok.values()) tokens += t;
  return { msgs: counts.msgs, tokens };
}
function mergeById(lists) {
  const byId = /* @__PURE__ */ new Map();
  const noId = [];
  for (const list of lists) {
    for (const r of list) {
      if (r.id == null) {
        noId.push(r);
        continue;
      }
      const prev = byId.get(r.id);
      if (!prev || totalOf(r.tok) > totalOf(prev.tok)) byId.set(r.id, r);
    }
  }
  return [...byId.values(), ...noId];
}
function aggregate(requests, startMs, overrides) {
  let tokens = 0, cost = 0, inTok = 0, outTok = 0;
  for (const r of requests) {
    if (r.t < startMs) continue;
    tokens += totalOf(r.tok);
    inTok += r.tok?.in ?? 0;
    outTok += r.tok?.out ?? 0;
    cost += estimateCost(r.model, r.tok, overrides);
  }
  return { tokens, cost, in: inTok, out: outTok };
}
function aggregateByModel(requests, startMs, overrides) {
  const by = /* @__PURE__ */ new Map();
  for (const r of requests ?? []) {
    if (r.t < startMs) continue;
    const fam = familyOf(r.model) ?? "other";
    const cur = by.get(fam) ?? { model: fam, tokens: 0, cost: 0 };
    cur.tokens += (r.tok?.in ?? 0) + (r.tok?.out ?? 0) + (r.tok?.cacheRead ?? 0) + (r.tok?.cacheCreate ?? 0);
    cur.cost += estimateCost(r.model, r.tok, overrides);
    by.set(fam, cur);
  }
  return [...by.values()].filter((e) => e.tokens > 0 || e.cost > 0).sort((a, b) => b.cost - a.cost || b.tokens - a.tokens);
}
function budgetPct(spend, budget) {
  const b = Number(budget);
  if (!Number.isFinite(b) || b <= 0) return null;
  const s = Number(spend);
  if (!Number.isFinite(s) || s < 0) return null;
  return s / b * 100;
}
var USAGE_FRESH_MS = 30 * 6e4;
var DESKTOP_FRESH_MS = 6 * 36e5;
function hasSubscriptionData(usage) {
  if (!usage) return false;
  return !!(usage.fiveHour || usage.weekly || usage.weeklyOpus || usage.scopedPct != null || (usage.models ?? []).length);
}
function gaugeSource({ usage, usageErr, usageAt, usageSrc = null, now }, hasLocal = false) {
  if (usage == null && !usageErr) return "pending";
  const validit\u00E0 = usageSrc === "desktop" || usageSrc === "statusline" ? DESKTOP_FRESH_MS : USAGE_FRESH_MS;
  const fresh = hasSubscriptionData(usage) && now - (usageAt ?? 0) < validit\u00E0;
  if (fresh) return "subscription";
  if (usageErr && String(usageErr).includes("429")) return "throttled";
  if (usageErr && String(usageErr).includes("no OAuth token")) return "local";
  if (usageErr) return "error";
  return hasLocal ? "local" : "pending";
}

// src/status.js
import path from "node:path";
var QUESTION_WAITS = /* @__PURE__ */ new Set(["input needed", "dialog open"]);
var FINISHED_MS = 6e4;
var ACTIVITY_MS = 6e4;
function sessionWhere(s) {
  const e = String(s?.entrypoint ?? "");
  if (e === "cli") return "cli";
  if (e === "cloud") return "cloud";
  if (e.includes("vscode")) return "code";
  return "";
}
function titoloSessione(s) {
  if (s?.titolo) return String(s.titolo);
  if (s?.name && s.nameSource && s.nameSource !== "derived") return String(s.name);
  return "";
}
function transcriptPathFor(projectsDir, s) {
  if (!s?.cwd || !s?.sessionId) return null;
  return joinPath(projectsDir, slugifyCwd(s.cwd), `${s.sessionId}.jsonl`);
}
function slugifyCwd(cwd) {
  return String(cwd).replace(/[/\\_:]/g, "-");
}
function joinPath(...parts) {
  return parts.filter(Boolean).join("/");
}
function sessionState(s, now = Date.now(), activityAt = null, pendingKind = null) {
  const st = s?.status;
  if (st === "waiting") {
    const w = String(s.waitingFor ?? "").toLowerCase();
    return QUESTION_WAITS.has(w) ? "input-needed" : "needs-approval";
  }
  if (pendingKind) return pendingKind;
  if (st === "busy" || st === "shell") return "working";
  if (!st) {
    if (!activityAt) return "unknown";
    return Math.max(0, now - activityAt) < ACTIVITY_MS ? "working" : "idle";
  }
  if (st === "idle") {
    const at = s.statusUpdatedAt;
    if (!at) return "idle";
    return Math.max(0, now - at) < FINISHED_MS ? "finished" : "idle";
  }
  return "idle";
}
var PID_START_SLACK_MS = 6e4;
function pidLooksRecycled(session, procStartMs, slackMs = PID_START_SLACK_MS) {
  const startedAt = session?.startedAt;
  if (!startedAt || procStartMs == null) return false;
  return procStartMs > startedAt + slackMs;
}
function sessionSig(sessions, now = Date.now(), activity = null, pending = null) {
  return JSON.stringify((sessions ?? []).map((s) => [s.pid ?? s.sessionId, s.status ?? "", s.waitingFor ?? "", sessionState(s, now, actOf(s, activity), pendKind(s, pending)), titoloSessione(s)]));
}
var URGENCY = { "needs-approval": 0, "input-needed": 1, working: 2, finished: 3, idle: 4, unknown: 5 };
var actOf = (s, activity) => activity && s?.sessionId ? activity.get(s.sessionId) ?? null : null;
var pendOf = (s, pending) => pending && s?.sessionId ? pending.get(s.sessionId) ?? null : null;
var pendKind = (s, pending) => pendOf(s, pending)?.kind ?? null;
var rank = (s, now, activity, pending) => URGENCY[sessionState(s, now, actOf(s, activity), pendKind(s, pending))] ?? 5;
function blockedSessions(sessions, now = Date.now(), activity = null, pending = null) {
  return (sessions ?? []).filter((s) => rank(s, now, activity, pending) <= URGENCY["input-needed"]).sort((a, b) => rank(a, now, activity, pending) - rank(b, now, activity, pending) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || (a.pid ?? 0) - (b.pid ?? 0));
}
function fmtShort(ms) {
  if (ms == null || !isFinite(ms)) return "";
  const t = Math.max(0, ms);
  if (t < 6e4) return Math.floor(t / 1e3) + "s";
  const m = Math.floor(t / 6e4);
  if (m < 60) return m + "m";
  return Math.floor(m / 60) + "h " + m % 60 + "m";
}
var WAIT_SHORT = {
  "permission prompt": "permission",
  "sandbox request": "sandbox",
  "worker request": "worker",
  "input needed": "input",
  "dialog open": "dialog"
};
function shortWait(reason) {
  const r = String(reason ?? "").toLowerCase();
  if (!r) return "";
  return WAIT_SHORT[r] ?? String(reason);
}
function autoSlot(keys, context) {
  const me = (keys ?? []).find((k) => k.context === context);
  const sorted = (keys ?? []).filter((k) => (k.device ?? null) === (me?.device ?? null)).sort((a, b) => {
    const ar = a.row ?? Infinity, br = b.row ?? Infinity;
    if (ar !== br) return ar - br;
    const ac = a.col ?? Infinity, bc = b.col ?? Infinity;
    if (ac !== bc) return ac - bc;
    return String(a.context).localeCompare(String(b.context));
  });
  return Math.max(0, sorted.findIndex((k) => k.context === context));
}
function sessionProject(s) {
  return path.basename(s.cwd ?? "").toLowerCase();
}
function byDisplayOrder(a, b, now, activity, pending) {
  const ra = rank(a, now, activity, pending), rb = rank(b, now, activity, pending);
  if (ra !== rb) return ra - rb;
  if ((b.updatedAt ?? 0) !== (a.updatedAt ?? 0)) return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  return (a.pid ?? 0) - (b.pid ?? 0);
}
function resolveStatusKey(sessions, project, autoIdx = 0, now = Date.now(), activity = null, pending = null) {
  const explicit = !!(project && String(project).trim());
  const want = explicit ? String(project).trim().toLowerCase() : null;
  const list = (sessions ?? []).filter((s) => explicit ? sessionProject(s) === want : true).sort((a, b) => byDisplayOrder(a, b, now, activity, pending)).map((s) => {
    const p = pendOf(s, pending);
    return {
      name: path.basename(s.cwd ?? "") || "claude",
      state: sessionState(s, now, actOf(s, activity), p?.kind ?? null),
      waitingFor: s.status === "waiting" ? String(s.waitingFor ?? "permission prompt") : p?.reason ?? "",
      // null when the session reports no timestamp at all (VS Code) — otherwise
      // `now - 0` renders as an absurd age like "495817h idle".
      statusAge: s.statusUpdatedAt ?? s.updatedAt ? Math.max(0, now - (s.statusUpdatedAt ?? s.updatedAt)) : null,
      // When the wait began. statusUpdatedAt ONLY — never the updatedAt fallback,
      // so every key measures the same wait from the same anchor.
      waitingSince: s.status === "waiting" && s.statusUpdatedAt ? s.statusUpdatedAt : p?.since ?? null,
      cwd: s.cwd ?? "",
      sessionId: s.sessionId ?? null,
      pid: s.pid ?? null,
      // Il link su claude.ai di una sessione cloud: la pressione apre quello.
      url: s.url ?? null,
      titolo: titoloSessione(s),
      where: sessionWhere(s)
    };
  });
  return { list, index: explicit ? 0 : autoIdx, count: list.length };
}
function statusEntry(resolved, cycleIdx = null) {
  const i = cycleIdx != null ? cycleIdx : resolved.index;
  return resolved.list[i] ?? { name: "", state: "none", waitingFor: "", statusAge: 0, waitingSince: null, cwd: "", sessionId: null, pid: null, url: null, titolo: "", where: "" };
}

// src/plugin.js
import { randomBytes, createHash } from "node:crypto";

// src/imap.js
import tls from "node:tls";
var HOST_GMAIL = "imap.gmail.com";
var PORTA_IMAPS = 993;
var MODI = ["principale", "tutta"];
var MAX_FILI = 999;
var ImapErrore = class extends Error {
  // tipo: "credenziali" | "rifiutato" | "timeout" | "rete" | "protocollo"
  constructor(tipo, messaggio) {
    super(messaggio);
    this.name = "ImapErrore";
    this.tipo = tipo;
  }
};
function quoted(s) {
  const t = String(s ?? "");
  if (/[\r\n\0]/.test(t)) throw new ImapErrore("protocollo", "un a capo non pu\xF2 stare in una stringa IMAP");
  return '"' + t.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function passwordPulita(p) {
  return String(p ?? "").replace(/\s+/g, "");
}
function idDaSearch(righe) {
  const out = [];
  for (const r of righe) {
    const m = /^\* SEARCH(?: (.*))?$/i.exec(r);
    if (!m) continue;
    for (const x of (m[1] ?? "").trim().split(/\s+/)) if (/^\d+$/.test(x)) out.push(Number(x));
  }
  return out;
}
function unseenDaStatus(righe) {
  for (const r of righe) {
    const m = /^\* STATUS .*\(.*\bUNSEEN (\d+).*\)\s*$/i.exec(r);
    if (m) return Number(m[1]);
  }
  return null;
}
function filiDaFetch(righe) {
  const fili = /* @__PURE__ */ new Set();
  for (const r of righe) {
    const m = /^\* \d+ FETCH \(.*\bX-GM-THRID (\d+)/i.exec(r);
    if (m) fili.add(m[1]);
  }
  return fili;
}
function insieme(ids) {
  const s = [...new Set(ids)].sort((a, b) => a - b);
  const parti2 = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parti2.push(j > i ? `${s[i]}:${s[j]}` : String(s[i]));
    i = j;
  }
  return parti2.join(",");
}
function tipoRifiuto(testo) {
  if (/\[(AUTHENTICATIONFAILED|AUTHORIZATIONFAILED)\]/i.test(testo) || /invalid credentials/i.test(testo)) return "credenziali";
  return "rifiutato";
}
function sessione(sock, timeoutMs) {
  let buf = "";
  let attesa = null;
  let fine = null;
  let seq = 0;
  const chiudi = (err) => {
    if (fine) return;
    fine = err ?? new ImapErrore("rete", "connessione chiusa");
    clearTimeout(timer);
    if (attesa) {
      attesa.reject(fine);
      attesa = null;
    }
    sock.destroy();
  };
  const timer = setTimeout(() => chiudi(new ImapErrore("timeout", `nessuna risposta in ${Math.round(timeoutMs / 1e3)} s`)), timeoutMs);
  const riga = (l) => {
    if (!attesa) return;
    if (attesa.saluto) {
      if (/^\* (OK|PREAUTH)\b/i.test(l)) {
        const a = attesa;
        attesa = null;
        a.resolve();
      } else if (/^\* BYE\b/i.test(l)) chiudi(new ImapErrore("rifiutato", l.slice(2)));
      return;
    }
    if (l.startsWith(attesa.tag + " ")) {
      const resto = l.slice(attesa.tag.length + 1);
      const a = attesa;
      attesa = null;
      if (/^OK\b/i.test(resto)) a.resolve(a.righe);
      else a.reject(new ImapErrore(tipoRifiuto(resto), resto.replace(/^(NO|BAD)\s*/i, "")));
      return;
    }
    attesa.righe.push(l);
  };
  sock.setEncoding?.("utf8");
  sock.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const l = buf.slice(0, i);
      buf = buf.slice(i + 2);
      riga(l);
    }
  });
  sock.on("error", (e) => chiudi(new ImapErrore("rete", String(e?.code ?? e?.message ?? e))));
  sock.on("close", () => chiudi());
  return {
    saluto() {
      if (fine) return Promise.reject(fine);
      return new Promise((resolve2, reject) => {
        attesa = { saluto: true, resolve: resolve2, reject };
      });
    },
    comando(testo) {
      if (fine) return Promise.reject(fine);
      const tag = "a" + ++seq;
      return new Promise((resolve2, reject) => {
        attesa = { tag, righe: [], resolve: resolve2, reject };
        sock.write(`${tag} ${testo}\r
`);
      });
    },
    // LOGOUT di cortesia: se il server chiude prima di rispondere, va bene lo stesso.
    async esci() {
      try {
        await this.comando("LOGOUT");
      } catch {
      }
      chiudi(new ImapErrore("rete", "chiusa"));
    },
    chiudi
  };
}
function connettiTls({ host, port }) {
  return tls.connect({ host, port, servername: host });
}
async function contaNonLette({ user, pass, modo = "principale", host = HOST_GMAIL, port = PORTA_IMAPS, timeoutMs = 2e4 }, { connect = connettiTls } = {}) {
  if (!user || !pass) throw new ImapErrore("credenziali", "mancano indirizzo o password");
  const m = MODI.includes(modo) ? modo : "principale";
  const s = sessione(connect({ host, port }), timeoutMs);
  try {
    await s.saluto();
    await s.comando(`LOGIN ${quoted(user)} ${quoted(passwordPulita(pass))}`);
    if (m === "tutta") {
      const n = unseenDaStatus(await s.comando('STATUS "INBOX" (UNSEEN)'));
      if (n == null) throw new ImapErrore("protocollo", "STATUS senza UNSEEN");
      return { n, messaggi: n, modo: m };
    }
    await s.comando('EXAMINE "INBOX"');
    const ids = idDaSearch(await s.comando(`SEARCH X-GM-RAW ${quoted("category:primary is:unread")}`));
    if (!ids.length) return { n: 0, messaggi: 0, modo: m };
    if (ids.length > MAX_FILI) return { n: ids.length, messaggi: ids.length, modo: m };
    const fili = filiDaFetch(await s.comando(`FETCH ${insieme(ids)} (X-GM-THRID)`));
    return { n: fili.size || ids.length, messaggi: ids.length, modo: m };
  } finally {
    await s.esci();
  }
}

// src/posta.js
var INTERVALLO_POSTA_MS = 12e4;
var RITARDO_ERRORE_MS = 3e5;
function normEmail(s) {
  const e = String(s ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}
function modoDi(settings) {
  return settings?.modo === "tutta" ? "tutta" : "principale";
}
function urlGmail(email) {
  const e = normEmail(email);
  return e ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(e)}` : "https://mail.google.com/mail/";
}
function passwordDi(globalSettings, email) {
  const e = normEmail(email);
  const p = e ? globalSettings?.posta?.[e]?.password : "";
  return typeof p === "string" ? p : "";
}
function chiaveLettura(email, modo) {
  return `${normEmail(email)}|${modo}`;
}
function caselleDaLeggere(views2, globalSettings) {
  const out = /* @__PURE__ */ new Map();
  for (const v of views2) {
    if (v?.kind !== "posta") continue;
    const email = normEmail(v.settings?.email);
    const pass = passwordDi(globalSettings, email);
    if (!email || !pass) continue;
    const modo = modoDi(v.settings);
    out.set(chiaveLettura(email, modo), { email, modo, pass });
  }
  return [...out.entries()].map(([chiave, c]) => ({ chiave, ...c }));
}
function prossimaLettura(rec, now, impronta2) {
  if (!rec) return now;
  if (rec.err === "credenziali" && rec.impronta === impronta2) return Infinity;
  if (rec.err && rec.impronta === impronta2) return rec.at + RITARDO_ERRORE_MS;
  if (rec.impronta !== impronta2) return now;
  return rec.at + INTERVALLO_POSTA_MS;
}
var ora = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
function numeroBreve(n) {
  return n > 999 ? "999+" : String(n);
}
function vistaPosta({ settings, rec, haPassword }) {
  const email = normEmail(settings?.email);
  const etichetta2 = String(settings?.label ?? "").trim() || (email ? email.split("@")[0] : "posta");
  const modo = modoDi(settings);
  const out = (valore2, sub, tono = null) => ({ titolo: etichetta2, valore: valore2, sub, tono, email });
  if (!email) return out("\u2014", "imposta l'indirizzo");
  if (!haPassword) return out("\u2014", "manca la password", "attenzione");
  if (!rec) return out("\u2026", "lettura\u2026");
  if (rec.err === "credenziali") return out("!", "password rifiutata", "attenzione");
  if (rec.err === "rifiutato" && rec.n == null) return out("!", "IMAP rifiutato", "attenzione");
  if (rec.n == null) return out("--", rec.err === "timeout" ? "non risponde" : "non raggiungibile");
  const valore = numeroBreve(rec.n);
  if (rec.err) return out(valore, `offline \xB7 ${ora(rec.okAt ?? rec.at)}`);
  if (rec.n === 0) return out(valore, "tutto letto");
  return out(valore, modo === "tutta" ? "in arrivo" : "da leggere");
}
function facciaPosta(v) {
  const conto2 = /^\d+\+?$/.test(v.valore);
  const offline = String(v.sub).startsWith("offline");
  const etichetta2 = String(v.titolo);
  return {
    etichetta: etichetta2.charAt(0).toUpperCase() + etichetta2.slice(1),
    badge: conto2 && v.valore !== "0" ? { testo: v.valore, tono: offline ? "spento" : "nuovo" } : v.valore === "!" ? { testo: "!", tono: "attenzione" } : null,
    riga: v.sub,
    rigaTono: v.tono === "attenzione" ? "attenzione" : "normale",
    spenta: !conto2 && v.valore !== "!"
  };
}
function statoPosta({ settings, rec, haPassword }) {
  const email = normEmail(settings?.email);
  if (!email) return "Scrivi l'indirizzo della casella.";
  if (!haPassword) return "Manca la password per le app di questo indirizzo.";
  if (!rec) return "In lettura\u2026";
  if (rec.err === "credenziali") return "Google ha rifiutato la password: generane una nuova e incollala qui. Il tasto non riprova da solo.";
  if (rec.err === "rifiutato") return "Google ha rifiutato l'accesso IMAP: per un account di lavoro, l'amministratore pu\xF2 averlo spento.";
  if (rec.err) return `Non raggiungibile (${rec.err})${rec.n != null ? `: l'ultimo numero \xE8 delle ${ora(rec.okAt ?? rec.at)}` : ""}.`;
  return `Collegato \xB7 ${rec.n} ${modoDi(settings) === "tutta" ? "messaggi" : "conversazioni"} da leggere \xB7 ${ora(rec.at)}`;
}

// src/thecore.js
var INTERVALLO_THECORE_MS = 3e5;
var RITARDO_ERRORE_THECORE_MS = 12e4;
var VERSIONE = 1;
function stagioneBreve(codice) {
  const m = /^(\d{4})-(\d{4})$/.exec(String(codice ?? ""));
  return m ? `${m[1].slice(2)}/${m[2].slice(2)}` : String(codice ?? "");
}
var migliaia = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
var decimale = (n, cifre) => n.toFixed(cifre).replace(".", ",");
function euroBreve(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "--";
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a < 1e4) return `\u20AC ${s}${migliaia(a)}`;
  if (a < 1e5) return `\u20AC ${s}${decimale(a / 1e3, 1)}k`;
  if (a < 1e6) return `\u20AC ${s}${Math.round(a / 1e3)}k`;
  return `\u20AC ${s}${decimale(a / 1e6, 2)}M`;
}
function numero(n) {
  return typeof n === "number" && Number.isFinite(n) ? migliaia(n) : "--";
}
function variazione(adesso, prima) {
  if (typeof adesso !== "number" || typeof prima !== "number" || !(prima > 0)) return null;
  const p = Math.round((adesso - prima) / prima * 100);
  return p > 0 ? `\u25B2 ${p}%` : p < 0 ? `\u25BC ${-p}%` : "= 0%";
}
var conto = (n, uno, molti) => `${numero(n)} ${n === 1 ? uno : molti}`;
var METRICHE = {
  // --------------------------------------------------------------- vendite
  fatturato: {
    gruppo: "Vendite",
    nome: "Fatturato della stagione",
    titolo: "Fatturato",
    glifo: "euro",
    pagina: "/economics/pl",
    vista: (d) => {
      const v = d.vendite.fatturato, p = d.vendite.fatturatoAnnoScorso;
      const varia = variazione(v, p);
      return { valore: euroBreve(v), sub: varia ? `${varia} vs ${stagioneBreve(d.stagione.precedente)}` : `oggi ${euroBreve(d.vendite.fatturatoOggi)}` };
    }
  },
  ordini_oggi: {
    gruppo: "Vendite",
    nome: "Ordini di oggi",
    titolo: "Ordini",
    glifo: "carrello",
    pagina: "/economics/dashboard-ordini",
    vista: (d) => ({ valore: numero(d.vendite.ordiniOggi), sub: `${euroBreve(d.vendite.fatturatoOggi)} \xB7 ieri ${numero(d.vendite.ordiniIeri)}` })
  },
  ufficializzate: {
    gruppo: "Vendite",
    nome: "Scuole ufficializzate",
    titolo: "Firmate",
    glifo: "sigillo",
    pagina: "/directory",
    vista: (d) => ({ valore: numero(d.vendite.ufficializzate), sub: `su ${numero(d.directory.raggiunte)} raggiunte` })
  },
  // Le ufficializzate linea per linea (TheCore 0157): una scuola col merch firmato
  // e l'annuario no conta in una sola delle due.
  ufficializzate_merch: {
    gruppo: "Vendite",
    nome: "Merch ufficializzati",
    titolo: "Merch",
    glifo: "maglietta",
    pagina: "/l/merch",
    vista: (d) => ({ valore: numero(d.vendite.ufficializzateMerch), sub: `firmati su ${numero(d.vendite.lineeMerch)}` })
  },
  ufficializzate_annuari: {
    gruppo: "Vendite",
    nome: "Annuari ufficializzati",
    titolo: "Annuari",
    glifo: "libro",
    pagina: "/l/annuari",
    vista: (d) => ({ valore: numero(d.vendite.ufficializzateAnnuari), sub: `firmati su ${numero(d.vendite.lineeAnnuari)}` })
  },
  // ------------------------------------------------------------- directory
  raggiunte: {
    gruppo: "Directory",
    nome: "Scuole raggiunte",
    titolo: "Raggiunte",
    glifo: "scuola",
    pagina: "/metriche",
    vista: (d) => {
      const v = d.directory.raggiunte, p = d.directory.raggiunteAnnoScorso;
      const varia = variazione(v, p);
      return { valore: numero(v), sub: varia ? `${varia} vs ${stagioneBreve(d.stagione.precedente)}` : "in Directory" };
    }
  },
  da_assegnare: {
    gruppo: "Directory",
    nome: "Scuole senza sales",
    titolo: "Senza sales",
    glifo: "utentePiu",
    pagina: "/directory",
    vista: (d) => {
      const c = d.directory.competitor;
      return c > 0 ? { valore: numero(d.directory.daAssegnare), sub: conto(c, "competitor", "competitor"), tono: "attenzione" } : { valore: numero(d.directory.daAssegnare), sub: "da assegnare" };
    }
  },
  richieste: {
    gruppo: "Directory",
    nome: "Richieste dal form da assegnare",
    titolo: "Richieste",
    glifo: "vassoio",
    pagina: "/contatti-senza-scuola",
    vista: (d) => ({ valore: numero(d.directory.richieste), sub: "dal form", tono: d.directory.richieste > 0 ? "attenzione" : null })
  },
  // ---------------------------------------------------------------- hiring
  ris_da_scrutinare: {
    gruppo: "Hiring",
    nome: "Candidature da scrutinare",
    titolo: "Candidature",
    glifo: "persone",
    pagina: "/ris/lavora",
    vista: (d) => ({
      valore: numero(d.hiring.daScrutinare),
      sub: d.hiring.arrivateOggi > 0 ? `da scrutinare \xB7 +${numero(d.hiring.arrivateOggi)}` : "da scrutinare",
      tono: d.hiring.daScrutinare > 0 ? "attenzione" : null
    })
  },
  candidati_accettati: {
    // Accettati e non ancora eletti (TheCore 0157): i candidati RIS degli inviti.
    gruppo: "Hiring",
    nome: "Candidati RIS accettati",
    titolo: "Accettati",
    glifo: "utenteSpunta",
    pagina: "/ris/candidature",
    vista: (d) => ({ valore: numero(d.hiring.candidatiAccettati), sub: "non ancora eletti" })
  },
  ris_documenti: {
    gruppo: "Hiring",
    nome: "Documenti da verificare",
    titolo: "Documenti",
    glifo: "documento",
    pagina: "/ris/candidature",
    vista: (d) => ({ valore: numero(d.hiring.documentiDaVerificare), sub: "da verificare", tono: d.hiring.documentiDaVerificare > 0 ? "attenzione" : null })
  },
  eletti_senza_documento: {
    gruppo: "Hiring",
    nome: "Eletti senza documento",
    titolo: "Senza doc.",
    glifo: "documentoManca",
    pagina: "/ris/candidature",
    vista: (d) => ({ valore: numero(d.hiring.elettiSenzaDocumento), sub: "da contattare", tono: d.hiring.elettiSenzaDocumento > 0 ? "attenzione" : null })
  },
  ris_eletti: {
    gruppo: "Hiring",
    nome: "RIS eletti",
    titolo: "RIS",
    glifo: "stella",
    pagina: "/ris/metriche",
    vista: (d) => ({ valore: numero(d.hiring.risEletti), sub: "eletti col documento" })
  },
  // ------------------------------------------------------------- operativo
  notifiche: {
    // Le TUE notifiche non lette (TheCore 0157): la chiave è personale, e la
    // campanella è di chi la guarda. La cronologia sta nella Dashboard.
    gruppo: "Operativo",
    nome: "Le mie notifiche",
    titolo: "Notifiche",
    glifo: "campana",
    pagina: "/dashboard",
    vista: (d) => {
      const n = d.personale?.notificheNonLette, m = d.personale?.menzioniNonLette ?? 0;
      if (typeof n !== "number") return { valore: "--", sub: "TheCore da aggiornare" };
      return { valore: numero(n), sub: m > 0 ? conto(m, "menzione", "menzioni") : "non lette", tono: n > 0 ? "attenzione" : null };
    }
  },
  job: {
    // Nessuna pagina mostra l'outbox: premuto rilegge.
    gruppo: "Operativo",
    nome: "Job dell'outbox",
    titolo: "Outbox",
    glifo: "battito",
    pagina: null,
    vista: (d) => {
      const f = d.operativo.jobFalliti, r = d.operativo.jobInRitardo;
      if (f === 0 && r === 0) return { valore: "ok", sub: "nessun job fermo" };
      return { valore: numero(f + r), sub: `${conto(f, "fallito", "falliti")} \xB7 ${conto(r, "fermo", "fermi")}`, tono: "guasto" };
    }
  },
  plao: {
    gruppo: "Operativo",
    nome: "PLAO da controllare",
    titolo: "PLAO",
    glifo: "penna",
    pagina: "/economics/paghe",
    vista: (d) => ({
      // Il numero sono le firmate, che il coordinatore controlla prima dell'ultimo
      // lunedì; quelle ancora da firmare aspettano un'altra persona.
      valore: numero(d.operativo.plaoFirmate),
      sub: d.operativo.plaoFirmate > 0 ? "da controllare" : `${numero(d.operativo.plaoDaFirmare)} da firmare`,
      tono: d.operativo.plaoFirmate > 0 ? "attenzione" : null
    })
  },
  fornitori: {
    gruppo: "Operativo",
    nome: "Ordini fornitori con un problema",
    titolo: "Fornitori",
    glifo: "camion",
    pagina: "/ordini-fornitori",
    vista: (d) => ({ valore: numero(d.operativo.fornitoriProblema), sub: "con un problema", tono: d.operativo.fornitoriProblema > 0 ? "guasto" : null })
  }
};
var METRICA_DEFAULT = "fatturato";
var METRICHE_RINOMINATE = { avvisi: "notifiche" };
function metricaDi(settings) {
  const m = METRICHE_RINOMINATE[settings?.metrica] ?? settings?.metrica;
  return Object.hasOwn(METRICHE, m) ? m : METRICA_DEFAULT;
}
function urlPagina(app, pagina2) {
  const base2 = String(app ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(base2) || !pagina2) return null;
  return base2 + pagina2;
}
function confTheCore(globalSettings) {
  const url = String(globalSettings?.thecoreUrl ?? "").trim().replace(/\/+$/, "");
  const chiave = String(globalSettings?.thecoreKey ?? "").trim();
  const app = String(globalSettings?.thecoreApp ?? "").trim();
  return { url, chiave, app, completa: /^https:\/\//.test(url) && chiave !== "" };
}
function riassuntoValido(d) {
  return !!d && d.versione === VERSIONE && ["vendite", "directory", "hiring", "operativo"].every((g) => d[g] && typeof d[g] === "object") && !!d.stagione;
}
var TheCoreErrore = class extends Error {
  // tipo: "chiave" | "server" | "rete" | "formato" | "stagione"
  constructor(tipo, messaggio) {
    super(messaggio);
    this.name = "TheCoreErrore";
    this.tipo = tipo;
  }
};
async function leggiTheCore({ url, chiave }, { fetchFn = fetch, timeoutMs = 2e4 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let r;
  try {
    r = await fetchFn(url, { headers: { "x-api-key": chiave, accept: "application/json" }, signal: ac.signal });
  } catch (e) {
    throw new TheCoreErrore("rete", String(e?.cause?.code ?? e?.message ?? e));
  } finally {
    clearTimeout(t);
  }
  if (r.status === 401) throw new TheCoreErrore("chiave", "chiave non valida o revocata");
  if (!r.ok) throw new TheCoreErrore("server", `HTTP ${r.status}`);
  let d;
  try {
    d = await r.json();
  } catch {
    throw new TheCoreErrore("formato", "risposta non JSON");
  }
  if (d && d.versione === VERSIONE && d.stagione === null) throw new TheCoreErrore("stagione", "nessuna stagione attiva");
  if (!riassuntoValido(d)) throw new TheCoreErrore("formato", `risposta inattesa (versione ${d?.versione ?? "?"})`);
  return d;
}
var ora2 = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
var MESSAGGIO_ERRORE = { chiave: "chiave?", server: "TheCore in errore", rete: "non raggiungibile", formato: "risposta strana", stagione: "nessuna stagione" };
function vistaTheCore({ settings, tc, conf }) {
  const id = metricaDi(settings);
  const m = METRICHE[id];
  const base2 = { titolo: m.titolo, glifo: m.glifo, gruppo: m.gruppo, pagina: m.pagina, metrica: id, attenuato: false };
  if (!conf?.completa) return { ...base2, valore: "\u2014", sub: "imposta TheCore", tono: null, attenuato: true };
  if (tc?.err === "chiave") return { ...base2, valore: "!", sub: "chiave rifiutata", tono: "attenzione" };
  if (!tc?.dati) {
    if (tc?.err) return { ...base2, valore: "--", sub: MESSAGGIO_ERRORE[tc.err] ?? tc.err, tono: tc.err === "stagione" ? null : "attenzione" };
    return { ...base2, valore: "\u2026", sub: "lettura\u2026", tono: null, attenuato: true };
  }
  const v = m.vista(tc.dati);
  if (tc.err) return { ...base2, valore: v.valore, sub: `offline \xB7 ${ora2(tc.okAt ?? tc.at)}`, tono: null, attenuato: true };
  return { ...base2, valore: v.valore, sub: v.sub, tono: v.tono ?? null };
}
function statoTheCore({ tc, conf }) {
  if (!conf?.completa) return "Incolla l'indirizzo della funzione e la chiave generata in TheCore (Impostazioni \u2192 Preferenze \u2192 Stream Deck).";
  if (!tc) return "In lettura\u2026";
  if (tc.err === "chiave") return "TheCore ha rifiutato la chiave: \xE8 stata rigenerata o revocata, o il tuo ruolo non la pu\xF2 pi\xF9 usare.";
  if (tc.err === "stagione") return "Collegato, ma in TheCore non c'\xE8 una stagione attiva.";
  if (tc.err) return `Non raggiungibile (${MESSAGGIO_ERRORE[tc.err] ?? tc.err})${tc.dati ? `: i numeri sono delle ${ora2(tc.okAt ?? tc.at)}` : ""}.`;
  if (!tc.dati) return "In lettura\u2026";
  return `Collegato \xB7 stagione ${tc.dati.stagione.nome ?? stagioneBreve(tc.dati.stagione.codice)} \xB7 ${ora2(tc.at)}`;
}

// src/domande.js
var SLOT = { "approve-deny": 0, "approve-always": 1, "approve-allow": 2 };
var MAX_OPZIONI = 4;
var MAX_DOMANDE = 4;
function domandaRispondibile(req) {
  if (String(req?.toolName ?? "") !== "AskUserQuestion") return false;
  const qs = req?.toolInput?.questions;
  if (!Array.isArray(qs) || !qs.length || qs.length > MAX_DOMANDE) return false;
  return qs.every((q) => q && typeof q.question === "string" && q.question && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= MAX_OPZIONI && q.options.every((o) => o && typeof o.label === "string" && o.label));
}
var statoIniziale = () => ({ passo: 0, pagina: 0, risposte: {}, scelte: [] });
var pagina = (verso, testo, sub, avanti = true) => ({ tipo: "pagina", verso, testo, sub, avanti });
var VUOTO = { tipo: "vuoto" };
function facce(req, stato = statoIniziale()) {
  const qs = req?.toolInput?.questions ?? [];
  const q = qs[stato.passo];
  if (!q) return [null, null, null];
  if (q.multiSelect) {
    const scelte = stato.scelte ?? [];
    const s = q.options.map((o, indice) => ({ tipo: "scelta", indice, label: o.label, scelta: scelte.includes(indice) }));
    const conferma = { tipo: "conferma", n: scelte.length };
    if (s.length === 2) return [s[0], conferma, s[1]];
    if (stato.pagina === 0) return [s[0], pagina(1, "altre", s.length === 3 ? "opzione 3" : "opzioni 3-4"), s[1]];
    if (stato.pagina === 1) return [s[2], pagina(2, "avanti", "per confermare"), s[3] ?? VUOTO];
    return [pagina(0, "indietro", "opzioni 1-2", false), conferma, VUOTO];
  }
  const opz = q.options.map((o, indice) => ({ tipo: "opzione", indice, label: o.label }));
  if (opz.length === 2) return [opz[0], { tipo: "domanda" }, opz[1]];
  if (opz.length === 3) return [opz[0], opz[1], opz[2]];
  return stato.pagina === 0 ? [opz[0], pagina(1, "altre 2", "opzioni 3-4"), opz[1]] : [opz[2], pagina(0, "altre 2", "opzioni 1-2", false), opz[3]];
}
function chiaveFaccia(stato, f) {
  if (!f) return null;
  const extra = f.tipo === "scelta" ? `:${f.scelta ? 1 : 0}` : f.tipo === "conferma" ? `:${f.n}` : "";
  return `${stato.passo}:${stato.pagina}:${f.tipo}:${f.indice ?? f.verso ?? ""}${extra}`;
}
function premi(req, stato, slot) {
  const qs = req?.toolInput?.questions ?? [];
  const faccia = facce(req, stato)[slot];
  const nulla = { stato, risposte: null, nulla: true };
  if (!faccia || faccia.tipo === "domanda" || faccia.tipo === "vuoto") return nulla;
  if (faccia.tipo === "pagina") return { stato: { ...stato, pagina: faccia.verso }, risposte: null };
  if (faccia.tipo === "scelta") {
    const scelte = stato.scelte ?? [];
    const nuove = scelte.includes(faccia.indice) ? scelte.filter((i) => i !== faccia.indice) : [...scelte, faccia.indice];
    return { stato: { ...stato, scelte: nuove }, risposte: null };
  }
  const q = qs[stato.passo];
  let risposta;
  if (faccia.tipo === "conferma") {
    if (!faccia.n) return nulla;
    risposta = [...stato.scelte].sort((a, b) => a - b).map((i) => q.options[i].label);
  } else {
    risposta = faccia.label;
  }
  const risposte = { ...stato.risposte, [q.question]: risposta };
  if (stato.passo + 1 < qs.length) {
    return { stato: { passo: stato.passo + 1, pagina: 0, risposte, scelte: [] }, risposte: null };
  }
  return { stato: { ...stato, risposte }, risposte };
}
var testoDomanda = (req, stato = statoIniziale()) => String(req?.toolInput?.questions?.[stato.passo]?.question ?? "");

// src/approve.js
var DENY_MESSAGE = "Denied from Stream Deck";
var PORT_DEFAULT = 45623;
function sanitizeSuggestions(suggestions, toolName, sessionOnly = false) {
  if (!Array.isArray(suggestions)) return [];
  if (String(toolName ?? "").startsWith("mcp__")) return [];
  const out = [];
  for (const e of suggestions) {
    if (!e || typeof e !== "object") continue;
    if (e.type !== "addRules" || e.behavior !== "allow") continue;
    if (!Array.isArray(e.rules)) continue;
    const rules = e.rules.filter(
      (r) => r && typeof r.toolName === "string" && r.toolName && typeof r.ruleContent === "string" && r.ruleContent
    ).map((r) => ({ toolName: r.toolName, ruleContent: r.ruleContent }));
    if (!rules.length) continue;
    const destination = sessionOnly || e.destination === "session" ? "session" : "localSettings";
    out.push({ type: "addRules", behavior: "allow", destination, rules });
  }
  return out;
}
var wrap = (decision) => ({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision } });
function oneSafeRule(req, sessionOnly = false) {
  const safe = sanitizeSuggestions(req?.suggestions, req?.toolName, sessionOnly);
  if (safe.length !== 1 || safe[0].rules.length !== 1) return null;
  return safe[0];
}
function decisionBody(kind, req, opts = {}) {
  if (kind === "allow") return wrap({ behavior: "allow" });
  if (kind === "deny") return wrap({ behavior: "deny", message: DENY_MESSAGE });
  if (kind !== "always") return null;
  const entry = oneSafeRule(req, !!opts.sessionOnly);
  if (!entry) return null;
  return wrap({ behavior: "allow", updatedPermissions: [entry] });
}
var RISPOSTE_GREZZE = Symbol("risposteGrezze");
function answerBody(req, answers) {
  const input = req?.toolInput && typeof req.toolInput === "object" ? req.toolInput : {};
  const unite = Object.fromEntries(Object.entries(answers ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v]));
  const body = wrap({ behavior: "allow", updatedInput: { ...input, answers: unite } });
  body[RISPOSTE_GREZZE] = answers;
  return body;
}
var NAME_MAX = 11;
var TARGET_MAX = 14;
var RULE_FIT = 36;
var clean = (v) => String(v ?? "").replace(/[\s\p{Cc}]+/gu, " ").trim();
var cut = (s, max) => s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
var base = (p) => clean(p).split(/[\\/]/).filter(Boolean).pop() ?? "";
function targetOf(req) {
  const t = req?.toolName ?? "";
  const i = req?.toolInput;
  const has = i && typeof i === "object";
  if (t === "Bash" && has && i.command) return clean(i.command);
  if (["Edit", "Write", "NotebookEdit", "Read"].includes(t) && has && i.file_path) return base(i.file_path);
  if (t === "WebFetch" && has && i.url) {
    try {
      return clean(new URL(String(i.url)).hostname);
    } catch {
      return clean(t);
    }
  }
  if (t === "WebSearch" && has && i.query) return clean(i.query);
  if (t === "Task" && has && i.subagent_type) return clean(i.subagent_type);
  if (t.startsWith("mcp__")) {
    const [, server, ...rest] = t.split("__");
    if (server && rest.length) return clean(`${server}\xB7${rest.join("__")}`);
  }
  return clean(t);
}
function describeRequest(req) {
  return {
    name: cut(base(req?.cwd), NAME_MAX),
    target: cut(targetOf(req), TARGET_MAX)
  };
}
function alwaysRule(req, sessionOnly = false) {
  const entry = oneSafeRule(req, sessionOnly);
  if (!entry) return null;
  const { toolName, ruleContent } = entry.rules[0];
  const text = clean(`${toolName}(${ruleContent})`);
  return text.length > RULE_FIT ? null : text;
}
var DENY_WINDOW_MS = 3e4;
var pruneDenies = (denies, now) => (denies ?? []).filter((d) => now - d.at < DENY_WINDOW_MS);
function rememberDeny(denies, req, now) {
  const rule = alwaysRule(req);
  const kept = pruneDenies(denies, now).filter((d) => d.rule !== rule);
  return rule ? [...kept, { rule, at: now }] : kept;
}
var QUESTION_TOOLS = /* @__PURE__ */ new Set(["AskUserQuestion"]);
var isQuestion = (req) => QUESTION_TOOLS.has(String(req?.toolName ?? ""));
var answerable = (r) => !isQuestion(r) || domandaRispondibile(r);
var approvable = (queue) => (queue ?? []).find(answerable) ?? null;
var approvableDepth = (queue) => (queue ?? []).filter(answerable).length;
function richiestaCorrente(queue, scelta = null) {
  if (scelta) {
    const r = (queue ?? []).find((x) => answerable(x) && x.sessionId === scelta);
    if (r) return r;
  }
  return approvable(queue);
}
function sessioniInAttesa(queue) {
  const out = [];
  for (const r of queue ?? []) if (answerable(r) && r.sessionId && !out.includes(r.sessionId)) out.push(r.sessionId);
  return out;
}
function prossimaScelta(queue, scelta) {
  const s = sessioniInAttesa(queue);
  if (!s.length) return null;
  const i = s.indexOf(richiestaCorrente(queue, scelta)?.sessionId);
  return s[(i + 1) % s.length];
}
var PEND_RANK = { "needs-approval": 0, "input-needed": 1 };
function pendingBySession(queue) {
  const out = /* @__PURE__ */ new Map();
  for (const r of queue ?? []) {
    if (!r?.sessionId) continue;
    const rec = isQuestion(r) ? { kind: "input-needed", reason: "input needed", since: r.receivedAt } : { kind: "needs-approval", reason: "permission prompt", since: r.receivedAt };
    const prev = out.get(r.sessionId);
    if (prev && !(PEND_RANK[rec.kind] < PEND_RANK[prev.kind] || rec.kind === prev.kind && rec.since < prev.since)) continue;
    out.set(r.sessionId, rec);
  }
  return out;
}
var QUEUE_MAX = 8;
var HOLD_S_DEFAULT = 60;
var YOUNG_MS = 1e4;
function enqueue(queue, req) {
  const next = [...queue, req];
  if (next.length <= QUEUE_MAX) return { queue: next, evicted: null };
  const [evicted, ...rest] = next;
  return { queue: rest, evicted };
}
function hookFragment(url, timeoutS) {
  return [
    '"PermissionRequest": [',
    "  {",
    '    "matcher": "",',
    '    "hooks": [',
    "      {",
    '        "type": "http",',
    `        "url": ${JSON.stringify(url)},`,
    `        "timeout": ${Number(timeoutS)}`,
    "      }",
    "    ]",
    "  }",
    "]"
  ].join("\n");
}
function resolve(queue, id) {
  const req = queue.find((r) => r.id === id) ?? null;
  return { queue: req ? queue.filter((r) => r.id !== id) : queue, req };
}
var expiredIds = (queue, now, holdMs) => queue.filter((r) => now - r.receivedAt > (r.holdMs ?? holdMs)).map((r) => r.id);
function seedBaselines(queue, sessions, activity) {
  if (!queue.some((r) => !r.baselined)) return queue;
  return queue.map((r) => {
    if (r.baselined) return r;
    const matches = (sessions ?? []).filter((s2) => s2.sessionId === r.sessionId);
    const s = matches.slice().sort((a, b) => (b.statusUpdatedAt ?? 0) - (a.statusUpdatedAt ?? 0))[0] ?? null;
    return {
      ...r,
      statusSnapshot: s?.statusUpdatedAt ?? null,
      activitySnapshot: activity?.get?.(r.sessionId) ?? null,
      baselined: true
    };
  });
}
function staleIds(queue, sessions, activity, now) {
  const out = [];
  for (const r of queue) {
    if (r.cloud) continue;
    if (!r.baselined) continue;
    if (now - r.receivedAt < YOUNG_MS) continue;
    const matches = (sessions ?? []).filter((s2) => s2.sessionId === r.sessionId);
    if (!matches.length) continue;
    const s = matches.slice().sort((a, b) => (b.statusUpdatedAt ?? 0) - (a.statusUpdatedAt ?? 0))[0];
    if (s.statusUpdatedAt != null && r.statusSnapshot != null && s.statusUpdatedAt > r.statusSnapshot) {
      out.push(r.id);
      continue;
    }
    const mt = activity?.get?.(r.sessionId) ?? null;
    if (mt != null && r.activitySnapshot != null && mt > r.activitySnapshot) out.push(r.id);
  }
  return out;
}
var SETTLE_MS = 500;
function pressDecision({ queue, shownId, lastHeadChangeAt, now, settleMs = SETTLE_MS, scelta = null }) {
  const h = richiestaCorrente(queue, scelta);
  if (!h) return { action: "none", reason: "empty" };
  if (now - lastHeadChangeAt < settleMs) return { action: "none", reason: "settling" };
  if (h.id !== shownId) return { action: "alert", reason: "stale-paint" };
  return { action: "resolve", id: h.id, reason: "ok" };
}

// src/hookserver.js
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
var BODY_MAX = 1024 * 1024;
var BADPATH_WINDOW_MS = 5 * 6e4;
var BADPATH_MIN_HITS = 3;
var sameSecret = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
};
function startHookServer({ port, secret, onRequest, onDrop, onStatusline: onStatusline2 = null, log: log2 = () => {
}, retries = 3, retryMs = 500 }) {
  if (!secret || String(secret).length < 32) {
    return Promise.reject(new Error("hook secret too short"));
  }
  const wantPath = `/permission/${secret}`;
  const statusPath = `/statusline/${secret}`;
  const stats = { badPathHits: [] };
  let boundPort = null;
  const server = createServer((req, res) => {
    const deny = (code) => {
      res.writeHead(code).end();
    };
    const statusline = !!onStatusline2 && sameSecret(req.url ?? "", statusPath);
    if (!statusline && !sameSecret(req.url ?? "", wantPath)) {
      const now = Date.now();
      stats.badPathHits.push(now);
      stats.badPathHits = stats.badPathHits.filter((t) => now - t < BADPATH_WINDOW_MS);
      return deny(404);
    }
    if (stats.badPathHits.length) stats.badPathHits = [];
    const host = String(req.headers.host ?? "");
    if (host !== `127.0.0.1:${boundPort}` && host !== `localhost:${boundPort}`) return deny(403);
    if (req.method !== "POST") return deny(405);
    req.setEncoding("utf8");
    let body = "", over = false;
    req.on("data", (c) => {
      if (over) return;
      body += c;
      if (body.length > BODY_MAX) {
        over = true;
        res.writeHead(413);
        res.end();
        res.on("finish", () => req.destroy());
      }
    });
    req.on("end", () => {
      if (over) return;
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch {
        return deny(400);
      }
      if (statusline) {
        let riga = "";
        try {
          riga = String(onStatusline2(payload) ?? "");
        } catch (e) {
          log2("statusline threw:", String(e));
        }
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        return res.end(riga);
      }
      const ticket = {
        id: null,
        closed: false,
        respond(out) {
          if (ticket.closed || res.writableEnded) return false;
          ticket.closed = true;
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(out ?? {}));
          return true;
        }
      };
      res.on("close", () => {
        if (res.writableEnded || ticket.closed) return;
        ticket.closed = true;
        onDrop?.(ticket);
      });
      try {
        onRequest(payload, ticket);
      } catch (e) {
        log2("hook onRequest threw:", String(e));
        ticket.respond(null);
      }
    });
    req.on("error", () => {
    });
  });
  return new Promise((resolve2, reject) => {
    let left = retries;
    const attempt = () => {
      server.once("error", (e) => {
        if (e.code === "EADDRINUSE" && left-- > 0) {
          log2(`hook port ${port} busy, retrying (${left} left)`);
          setTimeout(attempt, retryMs);
          return;
        }
        reject(e);
      });
      server.listen(port, "127.0.0.1", () => {
        boundPort = server.address().port;
        server.removeAllListeners("error");
        server.on("error", (err) => log2("hook server error:", String(err)));
        log2(`hook server on http://127.0.0.1:${boundPort}/permission/<secret>`);
        resolve2({
          boundPort,
          // The secret this server actually bound to, so a caller can tell a genuine
          // secret CHANGE (which needs a rebind) apart from a same-secret re-assert
          // (which doesn't) instead of comparing boundPort alone.
          secret,
          stats,
          close: () => new Promise((done) => {
            let settled = false;
            const finish = () => {
              if (!settled) {
                settled = true;
                done();
              }
            };
            server.close(finish);
            server.closeIdleConnections();
            setTimeout(() => {
              server.closeAllConnections?.();
              finish();
            }, 250).unref();
          })
        });
      });
    };
    attempt();
  });
}

// src/relay.js
var PREFISSO = "cloud:";
function sessioniCloud(snap, adesso) {
  if (!snap || !Array.isArray(snap.sessioni)) return [];
  const delta = Number.isFinite(snap.ora) ? adesso - snap.ora : 0;
  const t = (v) => Number.isFinite(v) ? v + delta : void 0;
  return snap.sessioni.map((s) => ({
    sessionId: PREFISSO + s.id,
    pid: null,
    cwd: s.cwd || `/${s.nome ?? "cloud"}`,
    name: s.nome ?? "cloud",
    status: s.status ?? "idle",
    waitingFor: s.waitingFor ?? void 0,
    statusUpdatedAt: t(s.statusUpdatedAt),
    updatedAt: t(s.updatedAt),
    startedAt: t(s.startedAt),
    entrypoint: "cloud",
    url: typeof s.url === "string" && s.url.startsWith("https://claude.ai/code/session_") ? s.url : null,
    titolo: typeof s.titolo === "string" ? s.titolo.slice(0, 60) : "",
    cloud: true
  }));
}
function richiesteNuove(queue, snap, decise = /* @__PURE__ */ new Set()) {
  if (!snap || !Array.isArray(snap.richieste)) return [];
  const presenti = new Set((queue ?? []).filter((r) => r.cloud).map((r) => r.cloudId));
  return snap.richieste.filter((r) => r?.id && !presenti.has(r.id) && !decise.has(r.id));
}
function richiesteSparite(queue, snap) {
  if (!snap || !Array.isArray(snap.richieste)) return [];
  const vive = new Set(snap.richieste.map((r) => r?.id));
  return (queue ?? []).filter((r) => r.cloud && !vive.has(r.cloudId)).map((r) => r.id);
}
function voceDa(r, sessioni, adesso, snapOra) {
  const delta = Number.isFinite(snapOra) ? adesso - snapOra : 0;
  const s = (sessioni ?? []).find((x) => x.sessionId === PREFISSO + r.sessione);
  const ricevuta = Number.isFinite(r.ricevuta) ? r.ricevuta + delta : adesso;
  const scade = Number.isFinite(r.scade) ? r.scade + delta : adesso + 6e4;
  return {
    cloud: true,
    cloudId: r.id,
    receivedAt: ricevuta,
    holdMs: Math.max(1e3, scade - ricevuta),
    sessionId: PREFISSO + r.sessione,
    cwd: s?.cwd ?? "",
    toolName: String(r.tool ?? ""),
    toolInput: r.input ?? {},
    troncato: !!r.troncato,
    suggestions: [],
    statusSnapshot: null,
    activitySnapshot: null,
    baselined: true
  };
}
function decisioneDa(body) {
  const d = body?.hookSpecificOutput?.decision;
  if (!d) return null;
  if (d.behavior === "deny") return { tipo: "rifiuta" };
  if (d.behavior !== "allow") return null;
  if (Array.isArray(d.updatedPermissions) && d.updatedPermissions.length) return null;
  const answers = body?.[RISPOSTE_GREZZE] ?? d.updatedInput?.answers;
  if (answers && typeof answers === "object") return { tipo: "rispondi", risposte: answers };
  return { tipo: "approva" };
}
function intervallo({ errori = 0, snap = null } = {}) {
  if (errori > 0) return Math.min(6e4, 3e3 * 2 ** Math.min(errori, 5));
  const vivo = snap && ((snap.richieste ?? []).length || (snap.sessioni ?? []).some((s) => s.status === "busy" || s.status === "waiting"));
  return vivo ? 1500 : 4e3;
}
var urlValido = (u) => {
  const v = String(u ?? "").trim();
  return /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(v) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/[^\s]*)?$/.test(v);
};

// src/view.js
import path2 from "node:path";

// src/keyart.js
var D = {
  bg: "#313338",
  // Discord, il fondo della chat
  testo: "#f2f3f5",
  tenue: "#b5bac1",
  spento: "#80848e",
  rosso: "#ed4245",
  // badge delle menzioni, «si è rotto»
  giallo: "#f0b232",
  // «c'è da fare»
  tessera: { Vendite: "#23a55a", Directory: "#5865f2", Hiring: "#eb459e", Operativo: "#6d6f78" }
};
var C = {
  bg: D.bg,
  panel: "#2b2d31",
  text: D.testo,
  dim: D.tenue,
  spento: D.spento,
  track: "#1e1f22",
  // il fondo di una barra, scavato come i campi di Discord
  rail: D.spento,
  // un segno neutro: lo usa la scheda di tools/gen-og.mjs
  // Tinte d'identità a bassa crominanza: le usa SOLO iconSvg (l'arte di riserva dei tasti
  // nel manifest, tools/gen-icons.mjs). Sui tasti l'identità è TESSERA, qui sotto.
  ident: {
    code: "#96b99e",
    launch: "#cbab8f",
    chat: "#b8abce",
    web: "#cda5bd",
    focus: "#7fbbbf",
    project: "#bbb08c",
    prompt: "#d7a4a6",
    custom: "#94b4d4",
    // La terza pagina (fork TecNicorico): stessa luminosità e croma delle altre
    // (OKLCH L 0.76, C 0.055), nei due buchi più larghi della ruota — 275° fra custom
    // (249°) e chat (302°), 122° fra project (93°) e code (152°). 8.4:1 e 8.6:1 sul fondo.
    posta: "#a6afd5",
    thecore: "#abb790"
  },
  ok: D.tessera.Vendite,
  // #23a55a, «online»
  warn: D.giallo,
  bad: D.rosso,
  info: "#3498db",
  // al lavoro
  ask: "#a970ff"
  // una domanda, un input
};
var TESSERA = {
  code: "#11806a",
  launch: "#c15f3c",
  chat: "#5865f2",
  web: "#206694",
  focus: "#546e7a",
  project: "#c27c0e",
  prompt: "#ad1457",
  custom: "#71368a"
};
var TESSERA_SPENTA = "#4e5058";
var pctColor = (p) => p == null ? C.spento : p >= 85 ? C.bad : p >= 60 ? C.warn : C.ok;
var esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var FONT = "-apple-system, Segoe UI, system-ui, sans-serif";
var ADVANCE = 0.6;
var fit = (s, maxW, ideal, min = 11) => Math.max(min, Math.min(ideal, Math.floor(maxW / (ADVANCE * Math.max(1, String(s).length)))));
var fits = (s, maxW, size) => String(s).length * ADVANCE * size <= maxW;
var capacity = (maxW, size) => Math.max(1, Math.floor(maxW / (ADVANCE * size)));
function fitClip(s, maxW, ideal, min = 11) {
  const str = String(s);
  const size = fit(str, maxW, ideal, min);
  if (fits(str, maxW, size)) return [str, size];
  return [str.slice(0, Math.max(1, capacity(maxW, size) - 1)) + "\u2026", size];
}
var txt = (x, y, size, weight, fill, s, anchor = "middle", extra = "") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${esc(s)}</text>`;
var line = (x, y, maxW, ideal, weight, fill, s, anchor = "middle", extra = "", min = 11) => {
  const [t, size] = fitClip(s, maxW, ideal, min);
  return txt(x, y, size, weight, fill, t, anchor, extra);
};
var svgWrap = (inner) => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="${C.bg}"/>${inner}</svg>`
);
function tintFrame(col, strong = false, phase = null) {
  if (!col) return "";
  const p = phase == null ? 1 : [0.3, 0.65, 1][phase % 3];
  const velo = (strong ? 0.13 : 0.06) * (phase == null ? 1 : 0.55 + 0.45 * p);
  const op = phase == null ? strong ? 1 : 0.75 : 0.25 + 0.75 * p;
  return `<rect width="144" height="144" rx="18" fill="${col}" opacity="${velo.toFixed(3)}"/><rect x="3.5" y="3.5" width="137" height="137" rx="15" fill="none" stroke="${col}" stroke-width="${strong ? 5 : 3}" opacity="${op.toFixed(3)}"/>`;
}
var stellaD = (punte, rFuori, rDentro, cx, cy, ruota = -90) => {
  const p = [];
  for (let i = 0; i < punte * 2; i++) {
    const r = i % 2 ? rDentro : rFuori;
    const a = (ruota + i * 180 / punte) * Math.PI / 180;
    p.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return "M" + p.join(" L") + " Z";
};
var cerchio = (cx, cy, r) => `M${cx} ${cy} m-${r} 0 a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 -${2 * r} 0`;
var foglio = "M6.3 2.8 H13.8 L18.8 7.8 V19.6 A1.6 1.6 0 0 1 17.2 21.2 H6.3 A1.6 1.6 0 0 1 4.7 19.6 V4.4 A1.6 1.6 0 0 1 6.3 2.8 Z";
var fumetto = "M5 3.8 H19 A2.5 2.5 0 0 1 21.5 6.3 V14.6 A2.5 2.5 0 0 1 19 17.1 H11.4 L6.6 20.9 V17.1 H5 A2.5 2.5 0 0 1 2.5 14.6 V6.3 A2.5 2.5 0 0 1 5 3.8 Z";
var ICONE = {
  posta: [
    ["p", "M4.8 5 H19.2 A2.3 2.3 0 0 1 21.5 7.3 V16.7 A2.3 2.3 0 0 1 19.2 19 H4.8 A2.3 2.3 0 0 1 2.5 16.7 V7.3 A2.3 2.3 0 0 1 4.8 5 Z"],
    ["t", "M4.4 7.5 L12 12.8 L19.6 7.5"]
  ],
  euro: [["l", "M17.6 6.9 A6.4 6.4 0 1 0 17.6 17.1"], ["l", "M4.6 10.3 H13.2"], ["l", "M4.6 13.7 H12.4"]],
  carrello: [["l", "M2.8 4.5 H5.4 L7.7 14.6 H18.1 L20.6 7.6 H6.3"], ["p", cerchio(9.2, 19, 1.8)], ["p", cerchio(16.8, 19, 1.8)]],
  sigillo: [["p", stellaD(12, 9.6, 8.1, 12, 12)], ["t", "M8.2 12.2 L10.9 14.9 L15.9 9.6"]],
  scuola: [
    ["p", "M12 2.9 L21.3 8.4 H2.7 Z"],
    ["l", "M5.6 10.6 V17.4"],
    ["l", "M9.9 10.6 V17.4"],
    ["l", "M14.1 10.6 V17.4"],
    ["l", "M18.4 10.6 V17.4"],
    ["l", "M3 20.2 H21"]
  ],
  utentePiu: [
    ["p", cerchio(9.5, 7.9, 3.9)],
    ["p", "M2.3 20.5 C2.3 16.3 5.5 13.6 9.5 13.6 C13.5 13.6 16.7 16.3 16.7 20.5 Z"],
    ["l", "M19.6 7.2 V13.2"],
    ["l", "M16.6 10.2 H22.6"]
  ],
  vassoio: [
    ["l", "M3 13.4 L5.5 5.9 A1.6 1.6 0 0 1 7 4.8 H17 A1.6 1.6 0 0 1 18.5 5.9 L21 13.4 V17.9 A1.6 1.6 0 0 1 19.4 19.5 H4.6 A1.6 1.6 0 0 1 3 17.9 Z"],
    ["l", "M3 13.4 H8 L9.6 16 H14.4 L16 13.4 H21"]
  ],
  persone: [
    ["p", cerchio(16.7, 7.6, 3)],
    ["p", "M15 13.2 C18.9 12.9 22 15.3 22 19.6 H17.6 C17.4 16.8 16.6 14.7 15 13.2 Z"],
    ["b", cerchio(8.6, 8.1, 3.7)],
    ["b", "M1.8 20.4 C1.8 16.4 4.8 13.8 8.6 13.8 C12.4 13.8 15.4 16.4 15.4 20.4 Z"]
  ],
  documento: [["p", foglio], ["t", "M13.8 2.8 V7.8 H18.8"], ["t", "M8.4 14 L10.7 16.3 L15.1 11.8"]],
  documentoManca: [["p", foglio], ["t", "M13.8 2.8 V7.8 H18.8"], ["t", "M11.75 10 V14.2"], ["t", "M11.75 17.3 V17.4"]],
  stella: [["p", stellaD(5, 9.8, 4.3, 12, 12.8)]],
  maglietta: [["p", "M8.6 3.6 L4 5.6 L2.4 10 L5.6 11.4 V20.4 H18.4 V11.4 L21.6 10 L20 5.6 L15.4 3.6 C14.8 5 13.6 5.8 12 5.8 C10.4 5.8 9.2 5 8.6 3.6 Z"]],
  libro: [
    ["p", "M6.2 2.8 H19.4 V18 H6.2 A1.6 1.6 0 0 1 4.6 16.4 V4.4 A1.6 1.6 0 0 1 6.2 2.8 Z"],
    ["l", "M4.8 18.8 A2.2 2.2 0 0 0 6.6 21.2 H19.4"],
    ["t", "M8.2 7 H15.8"],
    ["t", "M8.2 10.2 H13.4"]
  ],
  utenteSpunta: [
    ["p", cerchio(9.5, 7.9, 3.9)],
    ["p", "M2.3 20.5 C2.3 16.3 5.5 13.6 9.5 13.6 C13.5 13.6 16.7 16.3 16.7 20.5 Z"],
    ["l", "M15.6 10.3 L17.9 12.6 L22.4 8"]
  ],
  campana: [
    ["p", "M12 2.8 C8.5 2.8 6.2 5.4 6.2 9.1 V12.9 L4.4 16 V17.4 H19.6 V16 L17.8 12.9 V9.1 C17.8 5.4 15.5 2.8 12 2.8 Z"],
    ["p", "M9.6 18.9 A2.4 2.4 0 0 0 14.4 18.9 Z"]
  ],
  battito: [["l", "M2.4 12.4 H6.6 L9 6.2 L13.6 18.6 L16.2 12.4 H21.6"]],
  penna: [["p", "M16.1 3.6 L20.4 7.9 L9.8 18.5 L4.4 19.6 L5.5 14.2 Z"], ["t", "M14.2 5.5 L18.5 9.8"], ["l", "M12.6 21 H21"]],
  camion: [
    ["p", "M3.6 6.2 H14.6 V16.4 H2.4 V7.4 A1.2 1.2 0 0 1 3.6 6.2 Z"],
    ["p", "M15.6 9.2 H18.7 L21.6 12.6 V16.4 H15.6 Z"],
    ["b", cerchio(7, 17.4, 2.3)],
    ["b", cerchio(17.6, 17.4, 2.3)]
  ],
  // ---- le pagine di Claude ----
  // La riga in basso: i tre segni che separano le decisioni anche senza colore.
  allow: [["L", "M5 12.8 L10 17.6 L19.4 7.2"]],
  always: [["L", "M2.4 12.8 L7.1 17.4 L16.3 7.4"], ["L", "M11.6 17.4 L21.4 7.4"]],
  deny: [["L", "M7 7 L17 17"], ["L", "M17 7 L7 17"]],
  arrowR: [["L", "M4.5 12 H19"], ["L", "M13.4 6.3 L19.1 12 L13.4 17.7"]],
  arrowL: [["L", "M19.5 12 H5"], ["L", "M10.6 6.3 L4.9 12 L10.6 17.7"]],
  // Gli stati di una sessione.
  alert: [
    ["p", "M10.27 4 A2 2 0 0 1 13.73 4 L21.6 17.7 A2 2 0 0 1 19.87 20.7 H4.13 A2 2 0 0 1 2.4 17.7 Z"],
    ["t", "M12 9.2 V13.6"],
    ["t", "M12 16.9 V17"]
  ],
  question: [["p", cerchio(12, 12, 10)], ["t", "M9.3 9.6 A2.75 2.75 0 1 1 13.3 12 C12.4 12.45 12 13 12 14"], ["t", "M12 17.1 V17.2"]],
  spark: [["p", "M12 2.4 C12.9 8.1 15.9 11.1 21.6 12 C15.9 12.9 12.9 15.9 12 21.6 C11.1 15.9 8.1 12.9 2.4 12 C8.1 11.1 11.1 8.1 12 2.4 Z"]],
  moon: [["p", "M20.2 14.9 A8.7 8.7 0 1 1 9.1 3.8 A6.9 6.9 0 0 0 20.2 14.9 Z"]],
  puntini: [["p", cerchio(5, 12, 2.3)], ["p", cerchio(12, 12, 2.3)], ["p", cerchio(19, 12, 2.3)]],
  // Lo stesso tracciato del glifo: una richiesta del cloud la nuvola la porta in alto.
  cloud: [["p", "M7.2 18.5 h10 a4 4 0 0 0 0.4 -7.98 a5.6 5.6 0 0 0 -10.9 1.5 a3.3 3.3 0 0 0 0.5 6.48 z"]],
  // Le scorciatoie, e gli strumenti che chiedono un permesso.
  code: [
    ["p", "M4.6 3.8 H19.4 A2.1 2.1 0 0 1 21.5 5.9 V18.1 A2.1 2.1 0 0 1 19.4 20.2 H4.6 A2.1 2.1 0 0 1 2.5 18.1 V5.9 A2.1 2.1 0 0 1 4.6 3.8 Z"],
    ["t", "M6.8 8.8 L10.1 12 L6.8 15.2"],
    ["t", "M12.3 15.4 H17.2"]
  ],
  launch: [
    ["l", "M13.6 3.4 H20.6 V10.4"],
    ["l", "M20.4 3.6 L11.6 12.4"],
    ["l", "M18 13.8 V19 A1.6 1.6 0 0 1 16.4 20.6 H5 A1.6 1.6 0 0 1 3.4 19 V7.6 A1.6 1.6 0 0 1 5 6 H10.2"]
  ],
  chat: [["p", fumetto]],
  web: [["p", cerchio(12, 12, 9.8)], ["t", "M2.6 12 H21.4"], ["t", "M12 2.4 C8.3 6.2 8.3 17.8 12 21.6 C15.7 17.8 15.7 6.2 12 2.4 Z"]],
  project: [
    ["p", "M3.9 4.4 H9.4 L11.6 6.8 H20.1 A1.5 1.5 0 0 1 21.6 8.3 V18.1 A1.5 1.5 0 0 1 20.1 19.6 H3.9 A1.5 1.5 0 0 1 2.4 18.1 V5.9 A1.5 1.5 0 0 1 3.9 4.4 Z"],
    ["t", "M2.4 9.4 H21.6"]
  ],
  focus: [
    ["l", cerchio(12, 12, 6.6)],
    ["p", cerchio(12, 12, 2.5)],
    ["l", "M12 1.8 V5"],
    ["l", "M12 19 V22.2"],
    ["l", "M1.8 12 H5"],
    ["l", "M19 12 H22.2"]
  ],
  // Quick prompt: il fulmine, perché è un prompt già scritto che parte con un tocco.
  prompt: [["p", "M13.6 2 L4.6 13.6 H11.1 L10.1 22 L19.4 10 H12.9 Z"]],
  custom: [["l", "M3.2 7.4 H20.8"], ["l", "M3.2 16.6 H20.8"], ["b", cerchio(9, 7.4, 2.9)], ["b", cerchio(15, 16.6, 2.9)]],
  file: [["p", foglio], ["t", "M13.8 2.8 V7.8 H18.8"], ["t", "M8.3 12.6 H15.2"], ["t", "M8.3 16.4 H13"]],
  layers: [["p", "M12 2.8 L21.4 8.2 L12 13.6 L2.6 8.2 Z"], ["l", "M2.9 12.4 L12 17.6 L21.1 12.4"], ["l", "M2.9 16.5 L12 21.7 L21.1 16.5"]],
  plug: [["l", "M9 2.6 V7"], ["l", "M15 2.6 V7"], ["p", "M5.8 7 H18.2 V10.4 A6.2 6.2 0 0 1 5.8 10.4 Z"], ["l", "M12 16.4 V21.6"]],
  database: [["p", "M5 6 A7 2.9 0 0 1 19 6 V18 A7 2.9 0 0 1 5 18 Z"], ["t", "M5 6 A7 2.9 0 0 0 19 6"], ["t", "M5 12 A7 2.9 0 0 0 19 12"]],
  dot: [["p", cerchio(12, 12, 4.6)]],
  // I tasti che mostrano e basta.
  gauge: [["l", "M3.6 17.6 A8.8 8.8 0 1 1 20.4 17.6"], ["L", "M12 15.4 L16.2 9.8"], ["p", cerchio(12, 15.4, 2.3)]],
  moneta: [
    ["p", cerchio(12, 12, 10)],
    ["t", "M15.1 8.7 C14.4 7.8 13.4 7.4 12.1 7.4 C10.4 7.4 9.3 8.3 9.3 9.6 C9.3 12.6 15 11.4 15 14.5 C15 15.8 13.8 16.7 12 16.7 C10.6 16.7 9.5 16.2 8.8 15.3"],
    ["t", "M12 5.4 V18.6"]
  ],
  fiamma: [["p", "M12 2.3 C13.1 6.2 18.2 8.4 18.2 14.1 A6.2 6.2 0 0 1 5.8 14.1 C5.8 11.2 7.3 9.3 8.8 8.1 C8.9 10.4 9.9 11.7 11.2 12.1 C10.7 8.5 11.1 5.2 12 2.3 Z"]],
  list: [
    ["p", cerchio(4.6, 6.5, 1.9)],
    ["p", cerchio(4.6, 12, 1.9)],
    ["p", cerchio(4.6, 17.5, 1.9)],
    ["l", "M9.4 6.5 H20.6"],
    ["l", "M9.4 12 H20.6"],
    ["l", "M9.4 17.5 H17.4"]
  ]
};
function icona(nome, x, y, size, colore, fondo) {
  const s = size / 24;
  const linea = 2.2;
  const pezzi = (ICONE[nome] ?? ICONE.battito).map(([m, d]) => {
    if (m === "p") return `<path d="${d}" fill="${colore}"/>`;
    if (m === "b") return `<path d="${d}" fill="${colore}" stroke="${fondo}" stroke-width="1.7" paint-order="stroke"/>`;
    const col = m === "t" ? fondo : colore;
    const w = m === "t" ? 1.9 : m === "L" ? 3 : linea;
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<g transform="translate(${x},${y}) scale(${s.toFixed(4)})">${pezzi}</g>`;
}
var pallino = (cx, cy, col) => `<circle cx="${cx}" cy="${cy}" r="9" fill="${D.bg}"/><circle cx="${cx}" cy="${cy}" r="6" fill="${col}"/>`;
var luce = (hex) => {
  const n = parseInt(String(hex).slice(1), 16);
  const c = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(n >> 16) + 0.7152 * c(n >> 8 & 255) + 0.0722 * c(n & 255);
};
var inchiostro = (fondo) => luce(fondo) > 0.4 ? "#1e1f22" : "#ffffff";
function comeTitolo(s) {
  const t = String(s ?? "");
  const su = (t.match(/[A-Z]/g) ?? []).length, giu = (t.match(/[a-z]/g) ?? []).length;
  const base2 = su > giu ? t.toLowerCase() : t;
  if (/^[a-z0-9-]+\.[a-z]{2,}$/.test(base2)) return base2;
  return (base2.charAt(0).toUpperCase() + base2.slice(1)).replace(/\bclaude\b/g, "Claude").replace(/^Claude code\b/, "Claude Code");
}
function sagoma(tipo, cx, cy, r, fill, extra = "") {
  if (tipo === "tondo") return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
  if (tipo === "ottagono") {
    const R = r * 1.07;
    const p = [];
    for (let i = 0; i < 8; i++) {
      const a = (22.5 + 45 * i) * Math.PI / 180;
      p.push(`${(cx + R * Math.cos(a)).toFixed(2)} ${(cy + R * Math.sin(a)).toFixed(2)}`);
    }
    return `<path d="M${p.join(" L")} Z" fill="${fill}" stroke="${fill}" stroke-width="${(r * 0.16).toFixed(1)}" stroke-linejoin="round"${extra}/>`;
  }
  return `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${(r * 0.62).toFixed(1)}" fill="${fill}"${extra}/>`;
}
var testata = (nomeIcona, titolo, fondo, o = {}) => sagoma(o.forma ?? "tessera", 28, 27, 16, fondo) + icona(nomeIcona, 16, 15, 24, o.ink ?? inchiostro(fondo), fondo) + line(52, 33, o.largo ?? 86, 16, 700, o.colTitolo ?? C.text, comeTitolo(titolo), "start", "", 13);
var testataReport = (nomeIcona, titolo) => icona(nomeIcona, 11, 14, 19, C.dim, C.bg) + line(35, 31, 102, 16, 700, C.dim, comeTitolo(titolo), "start", "", 13);
var SOTTO_W = 134;
function sotto(s, col = C.dim, due = false) {
  if (!s) return "";
  const str = String(s);
  if (due && !fits(str, SOTTO_W, 13)) {
    const i = str.indexOf(" \xB7 ");
    const righe = i > 0 && [str.slice(0, i), str.slice(i + 3)].every((t) => fits(t, SOTTO_W, 13)) ? [str.slice(0, i), str.slice(i + 3)] : aCapo(str, capacity(SOTTO_W, 13), 2);
    return righe.map((t, k) => line(72, 113 + k * 15, SOTTO_W, 13, 500, col, t, "middle", "", 13)).join("");
  }
  return line(72, 126, SOTTO_W, 15, 500, col, str, "middle", "", 13);
}
var corner = (tag, col = C.dim) => tag ? txt(132, 25, 12, 600, col, String(tag).slice(0, 8), "end") : "";
function numerino(cx, cy, testo, fondo = C.text) {
  const [t, size] = fitClip(String(testo), 30, 14, 13);
  const w = Math.max(22, Math.ceil(t.length * ADVANCE * size) + 10);
  return `<rect x="${(cx - w / 2 - 3).toFixed(1)}" y="${cy - 14}" width="${w + 6}" height="28" rx="14" fill="${C.bg}"/><rect x="${(cx - w / 2).toFixed(1)}" y="${cy - 11}" width="${w}" height="22" rx="11" fill="${fondo}"/>` + txt(cx, cy + 5, size, 800, inchiostro(fondo), t);
}
function usageMeterKey(head, big, sub, isCost) {
  const none = String(big) === "--";
  const stima = isCost && !none && sub !== "est" ? sub ? `${sub} \xB7 est` : "est" : sub;
  return svgWrap(`
    ${testataReport(isCost ? "moneta" : "layers", head)}
    ${line(72, 88, 128, 42, 800, none ? C.spento : C.text, big, "middle", "", 20)}
    ${sotto(stima, C.dim, true)}`);
}
function gaugeKey(label, pct, sub, pulsePhase = null) {
  const has = typeof pct === "number" && isFinite(pct);
  const p = has ? Math.max(0, Math.min(100, pct)) : 0;
  const col = has ? pctColor(p) : C.spento;
  return svgWrap(`
    ${pulsePhase == null ? "" : tintFrame(C.bad, true, pulsePhase)}
    ${testataReport("gauge", label)}
    ${line(72, 82, 128, has ? 44 : 32, 800, col, has ? Math.round(p) + "%" : "--", "middle", "", 20)}
    <rect x="14" y="94" width="116" height="9" rx="4.5" fill="${C.track}"/>
    ${has ? `<rect x="14" y="94" width="${Math.max(9, 116 * p / 100).toFixed(1)}" height="9" rx="4.5" fill="${col}"/>` : ""}
    ${sotto(sub)}`);
}
function burnKey(tokensHour, sub) {
  const has = tokensHour != null;
  return svgWrap(`
    ${testataReport("fiamma", "burn rate")}
    ${line(72, 82, 128, has ? 42 : 32, 800, has ? C.text : C.spento, has ? fmtNum(tokensHour) : "--", "middle", "", 20)}
    ${txt(72, 104, 15, 500, C.dim, "tok/hr")}
    ${sotto(sub)}`);
}
function linesKey(title, rows) {
  const rowSvg = rows.map((r, i) => line(14, 68 + i * 26, 120, 20, r.big ? 800 : 700, r.color ?? C.text, r.text, "start", "", 13)).join("");
  return svgWrap(`${testataReport("list", title)}${rowSvg}`);
}
function bigCountKey(title, count, sub, subColor, animPhase2 = null, tint = null, strong = false) {
  const dots = animPhase2 == null ? "" : [0, 1, 2].map((i) => `<circle cx="${60 + i * 12}" cy="105" r="${i === animPhase2 ? 4.5 : 3.2}" fill="${i === animPhase2 ? tint ?? C.info : C.spento}"/>`).join("");
  return svgWrap(`
    ${tintFrame(tint, strong)}
    ${testataReport("code", title)}
    ${line(72, 90, 118, 52, 800, count > 0 ? C.text : C.spento, count, "middle", "", 20)}
    ${dots}
    ${sotto(sub, subColor ?? C.dim)}`);
}
var STATUS_LOOK = {
  "needs-approval": { label: "Needs approval", col: C.warn, strong: true, anello: true },
  "input-needed": { label: "Input needed", col: C.ask, strong: true, anello: true },
  working: { label: "Working", col: C.info, anello: true },
  finished: { label: "Finished", col: C.ok, anello: true },
  idle: { label: "Idle", col: C.dim, tessera: C.spento },
  none: { label: "no session", col: C.spento, tessera: null },
  quiet: { label: "all clear", col: C.dim, tessera: TESSERA_SPENTA },
  // Waiting key, nothing pending
  // A session that reports no status (VS Code extension) and whose transcript we
  // couldn't stat. Saying "no status" beats inventing "Idle".
  unknown: { label: "no status", col: C.dim, tessera: TESSERA_SPENTA }
};
var STATUS_ICON = {
  "needs-approval": "alert",
  "input-needed": "question",
  working: "spark",
  finished: "allow",
  idle: "moon",
  quiet: "campana",
  unknown: "puntini",
  none: "puntini"
};
function statusKey(name, st, count, detail = "", tag = "", phase = null, sottotitolo = "", inRisposta = false) {
  const look = STATUS_LOOK[st] ?? STATUS_LOOK.none;
  const shown = String(name || "CLAUDE").slice(0, 11);
  const fondo = look.tessera === void 0 ? look.col : look.tessera;
  const tessera = fondo ? sagoma("tessera", 28, 27, 16, fondo) + icona(STATUS_ICON[st] ?? "puntini", 16, 15, 24, fondo === TESSERA_SPENTA ? C.dim : inchiostro(fondo), fondo) : sagoma("tessera", 28, 27, 14.75, "none", ` stroke="${C.spento}" stroke-width="2.5"`) + icona("puntini", 18, 17, 20, C.spento, C.bg);
  const angolo = count > 1 ? numerino(120, 25, count) : tag === "cloud" ? icona("cloud", 107, 9, 27, C.info, C.bg) : corner(tag);
  const pill = inRisposta ? `<rect x="47" y="16" width="62" height="21" rx="10.5" fill="${look.col}"/>` + txt(78, 30.3, 10.5, 800, inchiostro(look.col), "RISPONDI") : "";
  return svgWrap(`
    ${look.anello ? tintFrame(look.col, !!look.strong, phase) : ""}
    ${tessera}
    ${angolo}
    ${pill}
    ${sottotitolo ? conTitolo(shown, sottotitolo, look.col) : `
    ${line(72, 80, 128, 25, 800, st === "none" ? C.spento : C.text, shown, "middle", "", 13)}
    ${line(72, 105, 130, 18, 700, look.col, look.label, "middle", "", 13)}`}
    ${sotto(detail)}`);
}
function selettoreKey(nome, titolo, indice, totale, col = C.warn) {
  const righe = titolo ? aCapo(titolo, 16, 2) : [];
  return svgWrap(`
    ${tintFrame(col, true)}
    ${testata("focus", "rispondi a", TESSERA.focus)}
    ${line(72, righe.length ? 70 : 86, 128, 22, 800, C.text, String(nome || "claude"), "middle", "", 13)}
    ${righe.map((t, i) => line(72, 91 + i * 17, 130, 15, 700, col, t, "middle", "", 13)).join("")}
    ${sotto(totale > 1 ? `${indice}/${totale} \xB7 cambia` : "l'unica in attesa", C.dim, !righe.length)}`);
}
function conTitolo(nome, titolo, col) {
  const righe = aCapo(titolo, 16, 2);
  return line(72, righe.length > 1 ? 70 : 78, 128, 22, 800, C.text, nome, "middle", "", 13) + righe.map((t, i) => line(72, (righe.length > 1 ? 92 : 102) + i * 17, 130, 15, 700, col, t, "middle", "", 13)).join("");
}
function fmtNum(n) {
  if (n == null) return "--";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}
function actionKey(glyphName, title, label, sub) {
  return svgWrap(`
    ${testata(glyphName, title, TESSERA[glyphName] ?? TESSERA_SPENTA)}
    ${line(72, 86, 128, 26, 800, C.text, label, "middle", "", 13)}
    ${sotto(sub, C.dim, true)}`);
}
var GLYPH_FOR = { PROJECT: "project", FOCUS: "focus", PROMPT: "prompt", CLAUDE: "custom" };
function labelKey(title, label, sub, tint = null, strong = false) {
  const text = String(label ?? "").trim() || "\u2014";
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= 11) cur = (cur + " " + w).trim();
    else {
      lines.push(cur);
      cur = w;
      if (lines.length === 2) break;
    }
  }
  if (cur && lines.length < 2) lines.push(cur);
  const use = lines.slice(0, 2).filter(Boolean);
  const body = use.map((l, i) => line(72, use.length > 1 ? 76 + i * 24 : 86, 128, use.length > 1 ? 21 : 24, 800, C.text, l, "middle", "", 13)).join("");
  const g = GLYPH_FOR[String(title).toUpperCase()] ?? "custom";
  return svgWrap(`
    ${tintFrame(tint, strong)}
    ${testata(g, title, TESSERA[g])}
    ${body}
    ${sotto(sub, C.dim, use.length < 2)}`);
}
var TONO_D = { attenzione: D.giallo, guasto: D.rosso };
var svgDiscord = (inner) => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="${D.bg}"/>${inner}</svg>`
);
var VUOTI = /* @__PURE__ */ new Set(["0", "\u2014", "\u2026", "--", "ok"]);
function postaKey(f) {
  const busta = f.spenta ? D.spento : D.testo;
  let badge = "";
  if (f.badge) {
    const testo = String(f.badge.testo);
    const [t, size] = fitClip(testo, 52, 20, 13);
    const w = Math.max(30, Math.ceil(t.length * ADVANCE * size) + 16);
    const cx = Math.min(144 - 6 - w / 2, 96);
    const fondo = f.badge.tono === "attenzione" ? D.giallo : f.badge.tono === "spento" ? D.spento : D.rosso;
    const scritta = f.badge.tono === "attenzione" ? "#1e1f22" : "#ffffff";
    badge = `<rect x="${(cx - w / 2 - 4).toFixed(1)}" y="7" width="${w + 8}" height="38" rx="19" fill="${D.bg}"/><rect x="${(cx - w / 2).toFixed(1)}" y="11" width="${w}" height="30" rx="15" fill="${fondo}"/>` + txt(cx, 33, size, 800, scritta, t);
  }
  const rigaCol = f.rigaTono === "attenzione" ? D.giallo : D.tenue;
  return svgDiscord(`
    ${icona("posta", 40, 14, 64, busta, D.bg)}
    ${badge}
    ${line(72, 100, 128, 20, 700, D.testo, f.etichetta)}
    ${line(72, 126, 130, 15, 500, rigaCol, f.riga)}`);
}
function thecoreKey(v) {
  const tessera = D.tessera[v.gruppo] ?? D.tessera.Operativo;
  const tono = TONO_D[v.tono] ?? null;
  const valore = String(v.valore);
  const numCol = v.attenuato || VUOTI.has(valore) ? D.spento : D.testo;
  return svgDiscord(`
    <rect x="12" y="11" width="32" height="32" rx="10" fill="${tessera}"/>
    ${icona(v.glifo, 16, 15, 24, "#ffffff", tessera)}
    ${tono ? pallino(42, 13, tono) : ""}
    ${line(52, 33, 86, 16, 700, D.testo, v.titolo, "start")}
    ${line(72, 92, 126, 46, 800, numCol, valore, "middle", "", 20)}
    ${line(72, 126, 130, 15, 500, tono ?? (v.attenuato ? D.spento : D.tenue), v.sub)}`);
}
var APPROVE_LOOK = {
  "approve-allow": { word: "ALLOW", col: C.ok, icona: "allow", forma: "tondo" },
  "approve-always": { word: "ALWAYS", col: C.info, icona: "always", forma: "tessera" },
  "approve-deny": { word: "DENY", col: C.bad, icona: "deny", forma: "ottagono" }
};
function aCapo(testo, max, righe) {
  const pezzi = [];
  for (const p of String(testo ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean)) {
    let resto = p;
    while (resto.length > max) {
      let k = max;
      for (let i2 = max - 1; i2 >= 1; i2--) if (/[:/\\\-._=,]/.test(resto[i2])) {
        k = i2 + 1;
        break;
      }
      pezzi.push(resto.slice(0, k));
      resto = resto.slice(k);
    }
    if (resto) pezzi.push(resto);
  }
  const out = [];
  let cur = "", i = 0;
  for (; i < pezzi.length; i++) {
    const prova = cur ? cur + " " + pezzi[i] : pezzi[i];
    if (prova.length <= max) {
      cur = prova;
      continue;
    }
    out.push(cur);
    cur = pezzi[i];
    if (out.length === righe) {
      cur = "";
      break;
    }
  }
  if (cur && out.length < righe) {
    out.push(cur);
    i = pezzi.length;
  }
  if (i < pezzi.length && out.length) {
    const u = out[out.length - 1];
    out[out.length - 1] = (u.length >= max ? u.slice(0, max - 1) : u) + "\u2026";
  }
  return out.length ? out : ["\u2014"];
}
var CY = 35;
function grandeKey(o = {}) {
  const colIcona = o.colIcona ?? C.text;
  let figura = "";
  if (o.casella != null) {
    figura = o.casella ? sagoma("tessera", 72, CY, 21, colIcona) + icona("allow", 57, CY - 15, 30, inchiostro(colIcona), colIcona) : sagoma("tessera", 72, CY, 19.5, "none", ` stroke="${colIcona}" stroke-width="3"`) + txt(72, CY + 8.5, 24, 800, colIcona, String(o.numero ?? ""));
  } else if (o.numero != null) {
    figura = sagoma("tondo", 72, CY, 22, colIcona) + txt(72, CY + 9.5, 27, 800, inchiostro(colIcona), String(o.numero));
  } else if (o.icona) {
    figura = o.forma ? sagoma(o.forma, 72, CY, 22, o.fondo) + icona(o.icona, 57, CY - 15, 30, o.ink ?? inchiostro(o.fondo), o.fondo) : icona(o.icona, 54, CY - 18, 36, colIcona, C.bg);
  }
  const arco = o.arco ? `<path d="M72 ${CY - 27} A27 27 0 1 1 45 ${CY}" fill="none" stroke="${o.arco}" stroke-width="3.5" stroke-linecap="round"/>` : "";
  const righe = (o.testo ?? []).filter((t) => t != null && t !== "");
  let corpoSvg = "";
  const LARGO = 120;
  if (o.testo2) {
    corpoSvg = (righe[0] != null ? line(72, 86, LARGO, o.ideale ?? 20, 800, o.col ?? C.text, righe[0], "middle", "", 13) : "") + line(72, 106, SOTTO_W, 15, 700, o.col2 ?? C.dim, o.testo2, "middle", "", 13);
  } else if (righe.length) {
    const n = Math.min(3, righe.length);
    const [ys, size] = [[[90], o.ideale ?? 20], [[83, 103], Math.min(o.ideale ?? 20, 18)], [[75, 91, 107], 14]][n - 1];
    corpoSvg = righe.slice(0, n).map((t, i) => line(72, ys[i], LARGO, size, n > 2 ? 700 : 800, o.col ?? C.text, t, "middle", "", 13)).join("");
  }
  const altre = (o.angolo?.badge ?? 0) - 1;
  const angolo = altre > 0 ? numerino(96, CY - 17, `+${altre}`) : o.angolo?.testo ? txt(132, 28, 16, 800, o.arco ?? colIcona, o.angolo.testo, "end") : "";
  const piede = o.piede ? line(72, 128, SOTTO_W, 14, 500, o.colPiede ?? C.dim, o.piede, "middle", "", 13) : "";
  return svgWrap(`
    ${tintFrame(o.tinta ?? null, !!o.forte, o.phase ?? null)}
    ${o.cloud ? icona("cloud", 9, 8, 26, C.info, C.bg) : ""}
    ${arco}
    ${figura}
    ${angolo}
    ${corpoSvg}
    ${piede}`);
}
var SPENTO = "#4a4658";
function decisioneKey(kind, req, o = {}) {
  const allow = kind === "approve-allow";
  const forma = allow ? "tondo" : "ottagono";
  const segno = allow ? "allow" : "deny";
  if (o.err) return grandeKey({ forma, fondo: C.bad, icona: "alert", tinta: C.bad, piede: o.err });
  if (!req) return grandeKey({ forma, fondo: TESSERA_SPENTA, ink: C.spento, icona: segno, piede: "all clear" });
  const d = describeRequest(req);
  const testo = o.target ? [o.target] : aCapo(targetIntero(req), 14, 3);
  const comune = { cloud: !!req.cloud, piede: o.label || d.name, phase: o.phase ?? null, angolo: { badge: o.depth } };
  if (allow && o.lungo) {
    return grandeKey({
      ...comune,
      forma: "tondo",
      fondo: C.warn,
      icona: "allow",
      arco: C.warn,
      tinta: C.warn,
      forte: true,
      testo: testo.slice(0, 1),
      testo2: "tieni premuto 2 s",
      col2: C.warn,
      angolo: o.depth > 1 ? { badge: o.depth } : { testo: "2 s" }
    });
  }
  const col = allow ? C.ok : C.bad;
  return grandeKey({ ...comune, forma, fondo: col, icona: segno, tinta: col, forte: true, testo });
}
function targetIntero(req) {
  const t = String(req?.toolName ?? "");
  const i = req?.toolInput ?? {};
  if (t === "Bash" && i.command) return String(i.command).replace(/\s+/g, " ").trim();
  return describeRequest(req).target;
}
function opzioneKey(numero2, intestazione, label, sub, phase = null, cloud = false) {
  return grandeKey({
    numero: numero2,
    colIcona: C.ask,
    tinta: C.ask,
    forte: true,
    phase,
    cloud,
    testo: aCapo(label, 12, 3),
    piede: String(intestazione || "domanda").toUpperCase() + (sub ? ` ${sub}` : "")
  });
}
function sceltaKey(numero2, label, scelta, intestazione, cloud = false, phase = null) {
  return grandeKey({
    casella: !!scelta,
    numero: numero2,
    colIcona: C.ask,
    tinta: C.ask,
    forte: !!scelta,
    phase: scelta ? null : phase,
    cloud,
    testo: aCapo(label, 12, 3),
    piede: scelta ? "scelta" : String(intestazione || "domanda").toUpperCase(),
    colPiede: scelta ? C.ask : C.dim
  });
}
function confermaKey(n, intestazione, cloud = false) {
  return grandeKey({
    forma: "tessera",
    fondo: n ? C.ask : TESSERA_SPENTA,
    ink: n ? void 0 : C.spento,
    icona: "allow",
    tinta: n ? C.ask : null,
    forte: !!n,
    cloud,
    testo: ["CONFERMA"],
    testo2: n ? `${n} ${n === 1 ? "scelta" : "scelte"}` : "nessuna scelta",
    col2: n ? C.ask : C.dim,
    piede: String(intestazione || "domanda").toUpperCase()
  });
}
function vuotoKey() {
  return grandeKey({ tinta: null, piede: "" });
}
function paginaKey(testo, sub, avanti = true, cloud = false) {
  return grandeKey({ forma: "tessera", fondo: C.ask, icona: avanti ? "arrowR" : "arrowL", tinta: C.ask, cloud, testo: [testo], piede: sub });
}
function domandaKey(intestazione, testo, sub, cloud = false) {
  return grandeKey({
    forma: "tessera",
    fondo: C.ask,
    icona: "question",
    tinta: C.ask,
    cloud,
    // In fondo, di quale sessione è la domanda: l'intestazione la portano già le opzioni.
    testo: aCapo(testo, 15, 3),
    ideale: 16,
    piede: sub || String(intestazione || "domanda").toUpperCase()
  });
}
var INFO_TINTA = { prod: C.bad, staging: C.warn, legge: C.info };
function infoKey(icona_, righe, sub, tinta = null, opz = {}) {
  const col = tinta ? INFO_TINTA[tinta] ?? null : null;
  const spento = !col && opz.colIcona === SPENTO;
  const fondo = col ?? (spento ? TESSERA_SPENTA : opz.colIcona ?? TESSERA.focus);
  const base2 = { forma: "tessera", fondo, ink: spento ? C.spento : void 0, icona: icona_, cloud: opz.cloud, piede: sub, tinta: col };
  if (opz.testo2) {
    return grandeKey({ ...base2, forte: tinta === "prod", testo: righe.slice(0, 1), testo2: opz.testo2, col2: col ?? C.dim });
  }
  return grandeKey({ ...base2, testo: righe, ideale: opz.ideale });
}
function iconaStrumento(toolName) {
  const t = String(toolName ?? "");
  if (t === "Bash") return ["code", TESSERA.code];
  if (t === "WebFetch" || t === "WebSearch") return ["web", TESSERA.web];
  if (["Edit", "Write", "Read", "NotebookEdit", "MultiEdit"].includes(t)) return ["file", TESSERA.project];
  if (t === "Task" || t === "Agent") return ["layers", TESSERA.chat];
  if (t.startsWith("mcp__")) return ["plug", TESSERA.custom];
  return ["custom", TESSERA.custom];
}

// src/supabase.js
var SOLO_LETTURA = /* @__PURE__ */ new Set([
  "list_projects",
  "get_project",
  "list_organizations",
  "get_organization",
  "list_tables",
  "list_extensions",
  "list_migrations",
  "get_logs",
  "query_logs",
  "get_advisors",
  "get_project_url",
  "get_anon_key",
  "get_publishable_keys",
  "list_edge_functions",
  "get_edge_function",
  "list_branches",
  "search_docs",
  "generate_typescript_types",
  "get_cost",
  "confirm_cost",
  "list_storage_buckets",
  "get_storage_config"
]);
var SQL_SCRIVE = /\b(insert|update|delete|merge|truncate|drop|alter|create|grant|revoke|copy|call|into|vacuum|refresh|lock|notify|execute|prepare)\b/i;
var SQL_EFFETTI = /\b(set_config|pg_terminate_backend|pg_cancel_backend|nextval|setval|pg_advisory\w*|lo_\w+|dblink\w*|pg_reload_conf|pg_switch_wal|pg_promote|pg_file_\w+|pg_read_\w+|pg_ls_\w+|pg_sleep\w*)\s*\(|\b[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\s*\(/i;
function sqlNudo(sql) {
  return String(sql ?? "").replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, " '' ").replace(/'(?:[^']|'')*'/g, " '' ").replace(/"(?:[^"]|"")*"/g, " x ");
}
function sqlLegge(sql, troncato = false) {
  if (troncato) return false;
  const nudo = sqlNudo(sql).trim().replace(/;\s*$/, "");
  if (!nudo) return false;
  if (nudo.includes(";")) return false;
  if (!/^(select|with|explain|show|values|table)\b/i.test(nudo)) return false;
  if (/^explain\b/i.test(nudo) && /\banalyze\b/i.test(nudo)) return false;
  return !SQL_SCRIVE.test(nudo) && !SQL_EFFETTI.test(nudo);
}
var parti = (toolName) => String(toolName ?? "").split("__");
function strumentoSupabase(toolName) {
  const [pre, server, ...resto] = parti(toolName);
  if (pre !== "mcp" || !server || !resto.length) return null;
  return /supabase/i.test(server) ? resto.join("__") : null;
}
var CLI_SCRIVE = /\b(db\s+(push|reset|dump\s+--data-only)|migration\s+(repair|squash|up|down)|functions\s+(deploy|delete)|secrets\s+(set|unset)|projects\s+(create|delete)|branches\s+(create|delete|update)|link|storage\s+(rm|mv|cp)|config\s+push|sso|domains)\b/i;
var refs = (s) => String(s ?? "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
function progettoDi(ref, conf) {
  const r = String(ref ?? "").toLowerCase();
  if (r && refs(conf?.prod).includes(r)) return "PROD";
  if (r && refs(conf?.staging).includes(r)) return "STAGING";
  return "?";
}
function classifica(req, conf = {}) {
  const tool = String(req?.toolName ?? "");
  const input = req?.toolInput && typeof req.toolInput === "object" ? req.toolInput : {};
  const s = strumentoSupabase(tool);
  if (s) {
    const progetto = progettoDi(input.project_id ?? input.projectId ?? input.project_ref, conf);
    let scrive;
    if (s === "execute_sql") scrive = !sqlLegge(input.query, !!req?.troncato);
    else scrive = !SOLO_LETTURA.has(s);
    return { strumento: s, progetto, scrive, lungo: scrive && progetto !== "STAGING" };
  }
  if (tool === "Bash") {
    const cmd = String(input.command ?? "");
    if (!/\bsupabase\b/i.test(cmd)) return null;
    const scrive = CLI_SCRIVE.test(cmd);
    const nominato = refs(conf.prod).find((r) => cmd.toLowerCase().includes(r)) ? "PROD" : refs(conf.staging).find((r) => cmd.toLowerCase().includes(r)) ? "STAGING" : "?";
    return { strumento: "supabase CLI", progetto: nominato, scrive, lungo: scrive && nominato !== "STAGING" };
  }
  return null;
}
var etichetta = (c) => c ? `${c.progetto === "?" ? "PROD?" : c.progetto} \xB7 ${c.scrive ? "scrive" : "legge"}` : "";
function bersaglio(req, c) {
  if (!c) return null;
  const input = req?.toolInput ?? {};
  if (c.strumento === "execute_sql") {
    const primo = sqlNudo(input.query).trim().split(/\s+/)[0] ?? "";
    return `SQL ${primo.toUpperCase()}`.trim();
  }
  if (c.strumento === "apply_migration" && input.name) return String(input.name);
  if (c.strumento === "deploy_edge_function" && (input.name || input.slug)) return String(input.name || input.slug);
  if (c.strumento === "supabase CLI") {
    const m = /\bsupabase\s+([a-z-]+(?:\s+[a-z-]+)?)/i.exec(String(input.command ?? ""));
    return m ? m[1] : "supabase";
  }
  return c.strumento;
}
var confDa = (gs) => ({ prod: gs?.supabaseProd ?? "", staging: gs?.supabaseStaging ?? "" });

// src/view.js
var pendKindOf = (state2, s) => state2.pending?.get(s?.sessionId)?.kind ?? null;
var PULSE_MS = 12e4;
function fmtReset(iso, now = Date.now()) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - now;
  if (!isFinite(ms) || ms <= 0) return "resetting\u2026";
  const h = Math.floor(ms / 36e5), m = Math.round(ms % 36e5 / 6e4);
  if (h >= 48) return `${Math.round(h / 24)}d left`;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}
function fmtAgo(ms) {
  const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtEta(ms) {
  return ms < 6e4 ? "just now" : `${fmtAgo(ms)} ago`;
}
var ETA_PRIMA_MS = 10 * 6e4;
function vecchia(state2, now) {
  return !daEndpoint(state2.usageSrc) && now - (state2.usageAt ?? now) >= ETA_PRIMA_MS;
}
function sottoGauge(b, state2, now) {
  if (!b) return "no data";
  const eta = now - (state2.usageAt ?? now);
  if (vecchia(state2, now)) return fmtEta(eta);
  return b.resetsAt ? fmtReset(b.resetsAt, now) : fmtEta(eta);
}
var GAUGE_WINDOW = { "usage-session": "5h", "usage-weekly": "7day", "usage-model": "7day" };
function gaugeMode(state2, kind, now) {
  const win = GAUGE_WINDOW[kind];
  const hasLocal = !!(win && state2.usageMeter?.[win]);
  return gaugeSource({ usage: state2.usage, usageErr: state2.usageErr, usageAt: state2.usageAt, usageSrc: state2.usageSrc ?? null, now }, hasLocal);
}
function localGauge(header, agg, budget, view = "cost", animPhase2 = null) {
  if (!agg) return usageMeterKey(header, "--", "no data yet", true);
  if (view === "tokens") {
    return usageMeterKey(header, fmtNum(agg.tokens), `${fmtNum(agg.in)} in \xB7 ${fmtNum(agg.out)} out`, false);
  }
  const pct = budgetPct(agg.cost, budget);
  if (pct == null) return usageMeterKey(header, "$" + agg.cost.toFixed(2), "est", true);
  const over = pct > 100 ? " \xB7 " + Math.round(pct) + "%" : "";
  return gaugeKey(header, pct, `$${Math.round(agg.cost)} / $${Math.round(Number(budget))}${over}`, pct >= 90 ? animPhase2 : null);
}
function modelList(state2, mode) {
  if (mode === "local") return state2.usageMeterModels ?? [];
  return state2.usage?.models ?? [];
}
function modelListIndex(pressed, list, want) {
  if (pressed != null && list.length) return pressed % list.length;
  if (!want || !list.length) return 0;
  const w = String(want).toLowerCase();
  const byName = list.findIndex((e) => String(e.name ?? e.model).toLowerCase() === w);
  if (byName >= 0) return byName;
  const fam = familyOf(w) ?? w;
  const byFam = list.findIndex((e) => String(e.model ?? e.name).toLowerCase() === fam);
  return byFam >= 0 ? byFam : 0;
}
function sessionEta(state2, now) {
  if (gaugeMode(state2, "usage-session", now) !== "subscription") {
    const b5 = state2.usageMeter?.["5h"];
    return b5 ? "$" + b5.cost.toFixed(2) + " last 5h" : "no cap";
  }
  const h = state2.pctHistory ?? [];
  if (h.length < 2) return "measuring\u2026";
  const latest = h[h.length - 1];
  const past = h.find((s) => latest.t - s.t >= 10 * 6e4) ?? h[0];
  const dt = latest.t - past.t;
  if (dt < 4 * 6e4) return "measuring\u2026";
  const slope = (latest.pct - past.pct) / dt;
  if (slope <= 5e-8) return "steady";
  const msLeft = (100 - latest.pct) / slope;
  const resetMs = state2.usage?.fiveHour?.resetsAt ? new Date(state2.usage.fiveHour.resetsAt).getTime() - latest.t : Infinity;
  if (msLeft >= resetMs) return "resets first";
  const hh = Math.floor(msLeft / 36e5), mm = Math.round(msLeft % 36e5 / 6e4);
  return hh > 0 ? `cap in ~${hh}h ${mm}m` : `cap in ~${mm}m`;
}
var TASTI_CON_SLOT = /* @__PURE__ */ new Set(["usage-session", "usage-weekly", "usage-model", "burn-rate", "today", "usage-meter", "sessions", "thecore"]);
var SLOT_VALIDI = /* @__PURE__ */ new Set(["approve-deny", "approve-always", "approve-allow"]);
function slotDi(kind, settings) {
  const s = settings?.slot;
  return TASTI_CON_SLOT.has(kind) && SLOT_VALIDI.has(s) ? s : null;
}
function tipoDaMostrare(kind, settings, queue) {
  const slot = slotDi(kind, settings);
  return slot && approvable(queue) ? slot : kind;
}
function viewFor(kind, env) {
  const {
    state: state2,
    settings = {},
    now,
    animPhase: animPhase2 = null,
    usageViewMode = "cost",
    pressedModelIdx = null,
    cycleIdx = -1,
    focus = null,
    autoSlot: autoSlot2 = 0,
    defaultCodeDir = ""
  } = env;
  const img = (image) => ({ image });
  switch (kind) {
    case "usage-session": {
      const mode = gaugeMode(state2, "usage-session", now);
      if (mode === "local") return img(localGauge("LAST 5H", state2.usageMeter?.["5h"], settings.budget, usageViewMode, animPhase2));
      if (mode !== "subscription") return img(gaugeKey("SESSION 5H", null, mode === "throttled" ? "throttled" : mode === "error" ? "sign in?" : "no data"));
      const b = cinqueOre(state2.usage, state2.usageSrc, state2.usageAt, now);
      return img(gaugeKey("SESSION 5H", b?.pct ?? null, sottoGauge(b, state2, now), b?.pct >= 90 ? animPhase2 : null));
    }
    case "usage-weekly": {
      const mode = gaugeMode(state2, "usage-weekly", now);
      if (mode === "local") return img(localGauge("LAST 7D", state2.usageMeter?.["7day"], settings.budget, usageViewMode, animPhase2));
      if (mode !== "subscription") return img(gaugeKey("WEEKLY", null, mode === "throttled" ? "throttled" : mode === "error" ? "sign in?" : "no data"));
      const b = finestraValida(state2.usage?.weekly ?? null, state2.usageSrc, state2.usageAt, now, SETTE_GIORNI_MS);
      const u = state2.usage;
      const sub = !b || vecchia(state2, now) ? sottoGauge(b, state2, now) : u?.scopedPct != null && u.scopedName ? `${u.scopedName} ${Math.round(u.scopedPct)}%` : u?.weeklyOpus?.pct != null ? `opus ${Math.round(u.weeklyOpus.pct)}%` : sottoGauge(b, state2, now);
      return img(gaugeKey("WEEKLY", b?.pct ?? null, sub, b?.pct >= 90 ? animPhase2 : null));
    }
    case "usage-model": {
      const mmode = gaugeMode(state2, "usage-model", now);
      if (mmode !== "subscription" && mmode !== "local") {
        return img(gaugeKey("MODEL 7D", null, mmode === "throttled" ? "throttled" : mmode === "error" ? "sign in?" : "no data"));
      }
      const list = modelList(state2, mmode);
      const want = settings.model;
      const i = modelListIndex(pressedModelIdx, list, want);
      const pick = list[i];
      const head_ = ((pick?.name ?? pick?.model ?? want ?? "MODEL") + "").toUpperCase().slice(0, 8) + " 7D";
      const more = list.length > 1 ? ` ${i + 1}/${list.length}` : "";
      if (!pick) return img(usageMeterKey(head_, "--", mmode === "local" ? "no data yet" : "no data", true));
      if (mmode === "local") {
        return img(localGauge(head_ + more, pick, settings.budget, usageViewMode, animPhase2));
      }
      const valido = finestraValida(pick, state2.usageSrc, state2.usageAt, now, SETTE_GIORNI_MS);
      return img(gaugeKey(head_ + more, valido?.pct ?? null, sottoGauge(valido, state2, now), valido?.pct >= 90 ? animPhase2 : null));
    }
    case "burn-rate":
      return img(burnKey(state2.burn?.tokensHour ?? null, sessionEta(state2, now)));
    case "project": {
      const label = settings.label || (settings.path ? path2.basename(settings.path) : "");
      return img(labelKey("PROJECT", label || "configure", settings.path ? "" : "set folder in settings"));
    }
    case "focus-session": {
      const inAttesa = sessioniInAttesa(state2.approveQueue);
      if (inAttesa.length) {
        const r = richiestaCorrente(state2.approveQueue, state2.scelta);
        const s2 = (state2.sessions ?? []).find((x) => x.sessionId === r.sessionId);
        const nome = path2.basename(s2?.cwd ?? r.cwd ?? "") || "claude";
        return img(selettoreKey(nome, s2 ? titoloSessione(s2) : "", inAttesa.indexOf(r.sessionId) + 1, inAttesa.length, isQuestion(r) ? C.ask : C.warn));
      }
      const blocked = blockedSessions(state2.sessions, now, state2.activity, state2.pending);
      const pool = blocked.length ? blocked : state2.sessions;
      const poolSig = pool.map((x) => x.pid ?? x.sessionId).join(",");
      const s = pool.length ? focus && focus.sig === poolSig ? pool[focus.i % pool.length] : pool[0] : null;
      if (blocked.length) {
        const b = s ?? blocked[0];
        return img(labelKey("FOCUS", b.name ?? "session", String(b.waitingFor ?? "needs you"), C.warn, true));
      }
      const anyWorking = state2.sessions.some((x) => sessionState(x, now, state2.activity.get(x.sessionId) ?? null, pendKindOf(state2, x)) === "working");
      return img(labelKey("FOCUS", s ? s.name : `${state2.sessions.length} sessions`, s ? sessionState(s, now, state2.activity.get(s.sessionId) ?? null, pendKindOf(state2, s)) : "press to cycle", anyWorking ? C.info : null));
    }
    case "quick-prompt":
      return img(labelKey("PROMPT", settings.label || "configure", settings.prompt ? "" : "set prompt in settings"));
    case "custom":
      return img(labelKey("CLAUDE", settings.label || "custom", settings.command ? "" : "set command in settings"));
    // These four used to have no case at all, so they never called setImage and kept
    // their manifest icon forever — three flat pieces of icon art next to seventeen
    // data panels, which is what ran two visual languages on one deck. Rendering them
    // costs the ability to set a custom image on these keys from the Stream Deck app.
    case "launch":
      return img(actionKey("launch", "launch", "Desktop", "claude app"));
    case "quick-chat":
      return img(actionKey("chat", "chat", "New chat", "claude desktop"));
    case "open-web":
      return img(actionKey("web", "claude.ai", "Open", "in browser"));
    case "claude-code":
      return img(actionKey("code", "code", "Terminal", "~/" + path2.basename(defaultCodeDir)));
    case "sessions": {
      const n = state2.sessions.length;
      if (cycleIdx >= 0 && state2.sessions[cycleIdx]) {
        const s = state2.sessions[cycleIdx];
        const st = sessionState(s, now, state2.activity.get(s.sessionId) ?? null, pendKindOf(state2, s));
        const stLabel = { "needs-approval": "needs you", "input-needed": "input needed", working: "working", finished: "done", idle: "idle" }[st] ?? st;
        const stColor = st === "needs-approval" ? C.warn : st === "input-needed" ? C.ask : st === "working" ? C.info : C.dim;
        return img(linesKey(`${cycleIdx + 1}/${n}`, [
          { text: (s.name ?? "session").slice(0, 11), big: false, color: C.text },
          { text: stLabel, color: stColor },
          { text: fmtAgo(now - (s.startedAt ?? now)) + " old", color: C.dim }
        ]));
      }
      const blocked = blockedSessions(state2.sessions, now, state2.activity, state2.pending).length;
      const busy = state2.sessions.filter((s) => sessionState(s, now, state2.activity.get(s.sessionId) ?? null, pendKindOf(state2, s)) === "working").length;
      const sub = blocked > 0 ? `${blocked} needs you` : busy > 0 ? `${busy} working` : n > 0 ? "all idle" : "none running";
      const subCol = blocked > 0 ? C.warn : busy > 0 ? C.info : C.dim;
      return img(bigCountKey("CLAUDE CODE", n, sub, subCol, busy > 0 ? animPhase2 : null, blocked > 0 ? C.warn : busy > 0 ? C.info : null, blocked > 0));
    }
    case "today": {
      const t = state2.today;
      return img(linesKey("TODAY", [
        { text: `${t?.chats ?? "--"} chats`, color: C.text },
        { text: `${fmtNum(t?.msgs)} msgs`, color: C.text },
        { text: `${fmtNum(t?.tokens)} tok`, color: C.text }
      ]));
    }
    case "usage-meter": {
      const win = settings.window ?? "today";
      const header = { today: "TODAY", month: "THIS MONTH", "7day": "7-DAY" }[win] ?? "TODAY";
      const agg = state2.usageMeter?.[win];
      const suffix = settings.label ? " \xB7 " + settings.label : "";
      if (!agg) return img(usageMeterKey(header, "--", "no data", usageViewMode === "cost"));
      if (usageViewMode === "cost") return img(usageMeterKey(header, "$" + agg.cost.toFixed(2), "cost" + suffix, true));
      return img(usageMeterKey(header, fmtNum(agg.tokens), agg.in != null ? `${fmtNum(agg.in)} in \xB7 ${fmtNum(agg.out)} out` : "tokens" + suffix, false));
    }
    case "approver-status": {
      const resolved = resolveStatusKey(state2.sessions, settings.project ?? "", autoSlot2, now, state2.activity, state2.pending);
      const cycling = !!settings.cycle && cycleIdx >= 0;
      const entry = statusEntry(resolved, cycling ? cycleIdx : null);
      const explicit = !!(settings.project && settings.project.trim());
      const name = settings.label || entry.name || (settings.project ?? "");
      let detail = "";
      if (cycling && resolved.count > 1) {
        const parent = entry.cwd ? path2.basename(path2.dirname(entry.cwd)) : "";
        detail = `${cycleIdx + 1}/${resolved.count}${parent ? " \xB7 " + parent : ""}`;
      } else if (entry.waitingFor) {
        const waited = entry.waitingSince ? fmtShort(now - entry.waitingSince) : "";
        detail = shortWait(entry.waitingFor) + (waited ? " \xB7 " + waited : "");
      } else if (entry.state === "finished") {
        detail = "just now";
      } else if (entry.state === "idle" && entry.statusAge != null) {
        detail = fmtAgo(entry.statusAge) + " idle";
      }
      const blockedNow = entry.state === "needs-approval" || entry.state === "input-needed";
      const fresh = blockedNow && (!entry.waitingSince || now - entry.waitingSince < PULSE_MS);
      const corrente2 = richiestaCorrente(state2.approveQueue, state2.scelta);
      const inRisposta = !!corrente2 && !!entry.sessionId && entry.sessionId === corrente2.sessionId;
      return img(statusKey(name, entry.state, explicit ? resolved.count : 1, detail, entry.where, fresh ? animPhase2 : null, entry.titolo, inRisposta));
    }
    case "approver-waiting": {
      const blocked = blockedSessions(state2.sessions, now, state2.activity, state2.pending);
      if (!blocked.length) {
        const n = state2.sessions.length;
        return img(statusKey("WAITING", "quiet", 1, n ? `${n} session${n > 1 ? "s" : ""} ok` : "no sessions"));
      }
      const i = cycleIdx >= 0 ? cycleIdx % blocked.length : 0;
      const b = blocked[i];
      const p = state2.pending?.get(b.sessionId) ?? null;
      const st = sessionState(b, now, state2.activity.get(b.sessionId) ?? null, p?.kind ?? null);
      const since = b.status === "waiting" && b.statusUpdatedAt ? b.statusUpdatedAt : p?.since ?? null;
      const waited = since ? fmtShort(now - since) : "";
      const why = shortWait(b.waitingFor ?? p?.reason ?? "") || "needs you";
      const fresh = !since || now - since < PULSE_MS;
      const corrente2 = richiestaCorrente(state2.approveQueue, state2.scelta);
      return img(statusKey(path2.basename(b.cwd ?? "") || "claude", st, blocked.length, why + (waited ? " \xB7 " + waited : ""), sessionWhere(b), fresh ? animPhase2 : null, titoloSessione(b), !!corrente2 && corrente2.sessionId === b.sessionId));
    }
    case "posta": {
      const email = normEmail(settings.email);
      const v = vistaPosta({
        settings,
        rec: email ? state2.posta?.get(chiaveLettura(email, modoDi(settings))) : null,
        haPassword: !!passwordDi(state2.globalSettings, email)
      });
      return img(postaKey(facciaPosta(v)));
    }
    case "thecore": {
      const v = vistaTheCore({ settings, tc: state2.thecore, conf: confTheCore(state2.globalSettings) });
      return img(thecoreKey(v));
    }
    case "approve-allow":
    case "approve-always":
    case "approve-deny":
      return rigaInBasso(kind, env);
  }
  return {};
}
function rigaInBasso(kind, env) {
  const { state: state2, settings = {}, now, animPhase: animPhase2 = null, authFlagged: authFlagged2 = false } = env;
  const req = richiestaCorrente(state2.approveQueue, state2.scelta);
  const fresh = req && now - req.receivedAt < PULSE_MS;
  const phase = fresh ? animPhase2 : null;
  const err = req?.cloud ? null : state2.hookErr ?? (!state2.approveQueue.length && authFlagged2 ? "auth?" : null);
  const depth = approvableDepth(state2.approveQueue);
  const sess = req ? (state2.sessions ?? []).find((x) => x.sessionId === req.sessionId) : null;
  const nome = req ? sess && titoloSessione(sess) || describeRequest(req).name : "";
  const cloud = !!req?.cloud;
  if (!err && req && isQuestion(req)) {
    const st = state2.risposte?.get(req.id) ?? statoIniziale();
    const f = facce(req, st)[SLOT[kind]];
    const qs = req.toolInput?.questions ?? [];
    const passo = qs.length > 1 ? `${st.passo + 1}/${qs.length}` : "";
    const head = String(qs[st.passo]?.header || "domanda");
    const painted = { reqId: req.id, rule: null, faccia: chiaveFaccia(st, f), lungo: false };
    if (!f) return { image: infoKey("question", ["\u2014"], nome, null, { cloud }), painted };
    if (f.tipo === "opzione") return { image: opzioneKey(f.indice + 1, head, f.label, passo, phase, cloud), painted };
    if (f.tipo === "scelta") return { image: sceltaKey(f.indice + 1, f.label, f.scelta, [head, passo].filter(Boolean).join(" "), cloud, phase), painted };
    if (f.tipo === "conferma") return { image: confermaKey(f.n, [head, passo].filter(Boolean).join(" "), cloud), painted };
    if (f.tipo === "pagina") return { image: paginaKey(f.testo, f.sub, f.avanti, cloud), painted };
    if (f.tipo === "vuoto") return { image: vuotoKey(), painted };
    return { image: domandaKey(head, testoDomanda(req, st), [passo, nome].filter(Boolean).join(" \xB7 "), cloud), painted };
  }
  const c = req ? classifica(req, confDa(state2.globalSettings)) : null;
  if (kind === "approve-always") {
    const painted = { reqId: req?.id ?? null, rule: null, faccia: null, lungo: false };
    if (err) return { image: infoKey("alert", ["\u2014"], err, "prod"), painted };
    if (!req) return { image: infoKey("dot", [], "all clear", null, { colIcona: "#4a4658" }), painted };
    if (c) {
      const tinta = !c.scrive ? "legge" : c.progetto === "STAGING" ? "staging" : "prod";
      return { image: infoKey("database", [c.strumento], nome, tinta, { cloud, testo2: etichetta(c) }), painted };
    }
    const [icona2, colIcona] = iconaStrumento(req.toolName);
    const bersaglioPieno = req.toolName === "Bash" ? String(req.toolInput?.command ?? "") : describeRequest({ ...req, cwd: "" }).target;
    return { image: infoKey(icona2, aCapo(bersaglioPieno, 15, 3), nome, null, { cloud, colIcona, ideale: 18 }), painted };
  }
  const lungo = kind === "approve-allow" && !!c?.lungo;
  return {
    image: decisioneKey(kind, req, { err, depth, phase, lungo, target: c ? bersaglio(req, c) : "", label: settings.label || nome }),
    painted: { reqId: req?.id ?? null, rule: null, faccia: null, lungo }
  };
}

// src/plugin.js
var IS_MAC = process.platform === "darwin";
var PLUGIN_DIR = path3.dirname(path3.dirname(fileURLToPath(import.meta.url)));
var CLAUDE_DIR = path3.join(os.homedir(), ".claude");
var CREDS_FILE = path3.join(CLAUDE_DIR, ".credentials.json");
var SESSIONS_DIR = path3.join(CLAUDE_DIR, "sessions");
var PROJECTS_DIR = path3.join(CLAUDE_DIR, "projects");
var USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
var githubDir = path3.join(os.homedir(), "Documents", "GitHub");
var DEFAULT_CODE_DIR = fs.existsSync(githubDir) ? githubDir : os.homedir();
var desktopAppId = "shell:AppsFolder\\Claude_pzs8sxrjxfjjc!Claude";
if (!IS_MAC) {
  execFile(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Get-StartApps | Where-Object {$_.Name -eq 'Claude'} | Select-Object -First 1 -ExpandProperty AppID"
    ],
    (err, out) => {
      const id = out?.trim();
      if (!err && id) desktopAppId = "shell:AppsFolder\\" + id;
    }
  );
}
var LOG_FILE = path3.join(process.cwd(), "agent-vitals.log");
var LOG_OLD_FILE = LOG_FILE + ".old";
var LOG_MAX_BYTES = 1e6;
var logBytes = 0;
try {
  logBytes = fs.statSync(LOG_FILE).size;
} catch {
}
function log(...args) {
  const line2 = `${(/* @__PURE__ */ new Date()).toISOString()} ${args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}`;
  console.log(line2);
  const bytes = Buffer.byteLength(line2) + 1;
  try {
    if (logBytes + bytes > LOG_MAX_BYTES) {
      try {
        fs.renameSync(LOG_FILE, LOG_OLD_FILE);
      } catch {
      }
      logBytes = 0;
    }
    fs.appendFileSync(LOG_FILE, line2 + "\n");
    logBytes += bytes;
  } catch {
  }
}
var state = {
  activity: /* @__PURE__ */ new Map(),
  // sessionId -> transcript mtimeMs (status-less sessions only)
  usage: null,
  // { fiveHour, weekly, weeklyOpus } each { pct, resetsAt }
  usageErr: null,
  usageMeter: null,
  // { [window]: {tokens, cost, in, out} } from pollUsageMeter
  usageMeterModels: null,
  // [{model,tokens,cost}] over 7d, for the model key in local mode
  usageAt: 0,
  usageSrc: null,
  // "desktop" | "api": da dove viene state.usage (src/consumi.js)
  apiOkAt: 0,
  // l'ultima risposta buona dell'endpoint
  sessions: [],
  today: null,
  burn: null,
  pctHistory: [],
  loggedRaw: false,
  rates: {},
  approveQueue: [],
  // Derived from approveQueue on every mutation (queueChanged): sessionId ->
  // {kind, reason, since}. The Status/WAITING keys read it, because for a VS Code
  // session it is the ONLY evidence that the session is blocked on the human.
  pending: /* @__PURE__ */ new Map(),
  denies: [],
  // {rule, at} for ~30s after a DENY, so the retry cannot be ALWAYS'd
  hookSecret: null,
  hookPort: PORT_DEFAULT,
  hookErr: null,
  // Sessioni: quelle di questo computer (pollSessions) e quelle nel cloud (pollRelay).
  // state.sessions è sempre la loro unione, rifatta da pubblicaSessioni().
  localSessions: [],
  cloudSessions: [],
  // id richiesta -> a che punto è la risposta a una domanda (domande.js)
  risposte: /* @__PURE__ */ new Map(),
  // La sessione a cui la persona ha scelto di rispondere (tasto Focus o tasto Status);
  // null = la richiesta più vecchia. Vedi richiestaCorrente in approve.js.
  scelta: null,
  relay: { ok: false, err: null, at: 0, errori: 0, sessioni: 0 },
  // La terza pagina. posta: "<email>|<modo>" -> { n, messaggi, at, okAt, err, impronta }
  // (src/posta.js); thecore: { dati, at, okAt, err } (src/thecore.js).
  posta: /* @__PURE__ */ new Map(),
  thecore: null,
  lastHeadChangeAt: 0,
  globalSettings: {},
  pluginUUID: null
};
var USAGE_DELAY_BASE = API_BASE_MS;
var usageDelay = USAGE_DELAY_BASE;
var lastUsageAttempt = 0;
var apiFermaFino = 0;
var CACHE_FILE = path3.join(os.tmpdir(), "agent-vitals-usage-cache.json");
try {
  const c = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  if (Date.now() - c.at < 30 * 6e4) {
    state.usage = c.usage;
    state.usageAt = c.at;
    state.usageSrc = c.src ?? "api";
    if (state.usageSrc === "api") state.apiOkAt = c.at;
  }
} catch {
}
function adottaConsumi(usage, at, src) {
  if (src !== "api" && at <= state.usageAt) return false;
  if (src !== state.usageSrc) log(`usage source: ${src} (sample ${Math.round((Date.now() - at) / 6e4)}m old)`);
  state.usage = src !== "api" ? completa(usage, state.usage, state.usageAt, Date.now()) : usage;
  state.usageAt = at;
  state.usageSrc = src;
  const fp5 = state.usage.fiveHour?.pct;
  if (typeof fp5 === "number") {
    state.pctHistory.push({ t: at, pct: fp5 });
    state.pctHistory = state.pctHistory.filter((h) => at - h.t < 36e5);
  }
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ usage: state.usage, at, src }));
  } catch {
  }
  scheduleResetPoll();
  renderAll(["usage-session", "usage-weekly", "usage-model", "burn-rate"]);
  return true;
}
var desktopSeen = /* @__PURE__ */ new Map();
var desktopTrovato = null;
async function pollDesktopUsage() {
  const candidati = percorsiDesktop({
    platform: process.platform,
    env: process.env,
    home: os.homedir(),
    listDir: (d) => {
      try {
        return fs.readdirSync(d);
      } catch {
        return [];
      }
    }
  });
  let best = null, bestPath = null;
  for (const fp of candidati) {
    try {
      const { mtimeMs } = await fsp.stat(fp);
      if (desktopSeen.get(fp) === mtimeMs) continue;
      desktopSeen.set(fp, mtimeMs);
      const raw = await fsp.readFile(fp, "utf8");
      const l = letturaDesktop(raw);
      if (!l) log("usage: Claude Desktop history at", fp, "has no readable sample:", formaDesktop(raw));
      if (l && (!best || l.at > best.at)) {
        best = l;
        bestPath = fp;
      }
    } catch {
    }
  }
  if (!best) return;
  if (bestPath !== desktopTrovato) {
    desktopTrovato = bestPath;
    log("usage: Claude Desktop history at", bestPath);
  }
  adottaConsumi(best.usage, best.at, "desktop");
}
var statuslineAt = 0;
function onStatusline(payload) {
  const now = Date.now();
  const l = letturaStatusline(payload, now);
  if (l) {
    const u = state.usage;
    const uguale = state.usageSrc === "statusline" && u?.fiveHour?.pct === l.usage.fiveHour?.pct && u?.weekly?.pct === l.usage.weekly?.pct;
    if (!uguale || now - statuslineAt >= 6e4) {
      statuslineAt = now;
      adottaConsumi(l.usage, l.at, "statusline");
    }
  }
  return rigaStatusline(payload);
}
async function pollUsage({ forza = false } = {}) {
  if (Date.now() < apiFermaFino) return;
  if (!forza && !serveEndpoint({ now: Date.now(), usageAt: state.usageAt, src: state.usageSrc, apiOkAt: state.apiOkAt })) return;
  lastUsageAttempt = Date.now();
  try {
    const token = await platform.readToken();
    if (!token) throw new Error("no OAuth token in credentials file");
    const res = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json"
      }
    });
    if (res.status === 429) {
      usageDelay = ritardoDopo429(usageDelay, res.headers.get("retry-after"));
      apiFermaFino = Date.now() + usageDelay;
      throw new Error(`usage endpoint HTTP 429 (backing off to ${usageDelay / 1e3}s)`);
    }
    if (!res.ok) throw new Error(`usage endpoint HTTP ${res.status}`);
    usageDelay = USAGE_DELAY_BASE;
    apiFermaFino = 0;
    const j = await res.json();
    if (!state.loggedRaw) {
      state.loggedRaw = true;
      log("usage raw shape:", JSON.stringify(j).slice(0, 1200));
    }
    state.usageErr = null;
    state.apiOkAt = Date.now();
    adottaConsumi(usageDaRisposta(j), state.apiOkAt, "api");
  } catch (e) {
    state.usageErr = String(e.message ?? e);
    log("usage poll failed:", state.usageErr);
    pollUsageMeter();
  }
  renderAll(["usage-session", "usage-weekly", "usage-model", "burn-rate"]);
}
var resetTimer = null;
function scheduleResetPoll() {
  const deltas = [state.usage?.fiveHour?.resetsAt, state.usage?.weekly?.resetsAt].filter(Boolean).map((iso) => new Date(iso).getTime() - Date.now()).filter((d) => d > 0 && d < 6 * 36e5);
  if (!deltas.length) return;
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => pollUsage({ forza: true }), Math.min(...deltas) + 8e3);
}
var transcriptDirFor = /* @__PURE__ */ new Map();
async function transcriptMtime(s) {
  if (!s?.sessionId) return null;
  const file = `${s.sessionId}.jsonl`;
  const known = transcriptDirFor.get(s.sessionId);
  const tryPath = async (p) => {
    try {
      return (await fsp.stat(p)).mtimeMs;
    } catch {
      return null;
    }
  };
  if (known) {
    const mt = await tryPath(path3.join(known, file));
    if (mt != null) return mt;
    transcriptDirFor.delete(s.sessionId);
  }
  const hint = transcriptPathFor(PROJECTS_DIR, s);
  if (hint) {
    const mt = await tryPath(hint);
    if (mt != null) {
      transcriptDirFor.set(s.sessionId, path3.dirname(hint));
      return mt;
    }
  }
  let dirs;
  try {
    dirs = await fsp.readdir(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dir = path3.join(PROJECTS_DIR, d.name);
    const mt = await tryPath(path3.join(dir, file));
    if (mt != null) {
      transcriptDirFor.set(s.sessionId, dir);
      return mt;
    }
  }
  return null;
}
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
var pidVerdict = /* @__PURE__ */ new Map();
var verdictKey = (s) => `${s.pid}:${s.startedAt ?? 0}`;
async function dropRecycledPids(sessions) {
  const unknown = sessions.filter((s) => !pidVerdict.has(verdictKey(s)));
  if (unknown.length) {
    let starts = null;
    try {
      starts = parseProcStarts(await platform.listProcStarts(), Date.now());
    } catch (e) {
      log("sessions: process-start listing failed, keeping all sessions:", String(e?.message ?? e));
    }
    if (starts) {
      for (const s of unknown) {
        const recycled = pidLooksRecycled(s, starts.get(s.pid) ?? null);
        pidVerdict.set(verdictKey(s), !recycled);
        if (recycled) {
          log(`sessions: ignoring ${path3.basename(s.cwd ?? "")} \u2014 pid ${s.pid} belongs to a process younger than the session (stale session file)`);
        }
      }
    }
  }
  const live = new Set(sessions.map(verdictKey));
  for (const k of pidVerdict.keys()) if (!live.has(k)) pidVerdict.delete(k);
  return sessions.filter((s) => pidVerdict.get(verdictKey(s)) !== false);
}
async function pollSessions() {
  try {
    const files = await fsp.readdir(SESSIONS_DIR).catch(() => []);
    let out = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const s = JSON.parse(await fsp.readFile(path3.join(SESSIONS_DIR, f), "utf8"));
        if (s.pid && pidAlive(s.pid)) out.push(s);
      } catch {
      }
    }
    out = await dropRecycledPids(out);
    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    for (const s of out) {
      if (s.status) continue;
      const mt = await transcriptMtime(s);
      if (mt != null) state.activity.set(s.sessionId, mt);
    }
    for (const id of [...state.activity.keys()]) {
      if (!out.some((s) => s.sessionId === id)) state.activity.delete(id);
    }
    if (state.approveQueue.length) {
      const now = Date.now();
      const gone = /* @__PURE__ */ new Set([
        ...staleIds(state.approveQueue, out, state.activity, now),
        ...expiredIds(state.approveQueue, now, HOLD_MS())
      ]);
      state.approveQueue = seedBaselines(state.approveQueue, out, state.activity);
      if (gone.size) answerAndDrop([...gone], "session moved on or hold expired");
      const kept = pruneDenies(state.denies, now);
      if (kept.length !== state.denies.length) {
        state.denies = kept;
        if (!gone.size) renderApproveAll();
      }
    }
    state.localSessions = out;
    pubblicaSessioni();
  } catch (e) {
    log("sessions poll failed:", String(e));
  }
}
function pubblicaSessioni() {
  const tutte = [...state.localSessions, ...state.cloudSessions];
  const nextSig = sessionSig(tutte, Date.now(), state.activity, state.pending);
  const changed = nextSig !== lastSessionSig;
  lastSessionSig = nextSig;
  state.sessions = tutte;
  if (changed) renderAll(["sessions", "focus-session", "approver-status", "approver-waiting"]);
}
var APPROVE_KINDS = ["approve-allow", "approve-always", "approve-deny"];
var HOLD_MS = () => (Number(state.globalSettings.hookHoldS) || HOLD_S_DEFAULT) * 1e3;
var TIMEOUT_PAD_S = 3;
var approveSeq = 0;
var hookServer = null;
var renderApproveAll = () => renderAll(APPROVE_KINDS);
var corrente = () => richiestaCorrente(state.approveQueue, state.scelta);
var faDaApprovazione = (v) => APPROVE_KINDS.includes(v?.kind) || !!slotDi(v?.kind, v?.settings);
var hasApproveKey = () => [...views.values()].some(faDaApprovazione);
var tipoAdesso = (context, kind) => {
  const v = views.get(context);
  return v ? tipoDaMostrare(v.kind, v.settings, state.approveQueue) : kind;
};
function queueChanged() {
  state.pending = pendingBySession(state.approveQueue);
  if (state.scelta && !sessioniInAttesa(state.approveQueue).includes(state.scelta)) state.scelta = null;
  for (const id of [...state.risposte.keys()]) if (!state.approveQueue.some((r) => r.id === id)) state.risposte.delete(id);
  renderAll([...APPROVE_KINDS, "approver-status", "approver-waiting", "focus-session"]);
}
function scegliSessione(sessionId) {
  const prev = corrente()?.id ?? null;
  state.scelta = sessionId;
  noteHeadChange(prev);
  state.lastHeadChangeAt = Date.now();
  log(`approve: risposta alla sessione ${path3.basename(corrente()?.cwd ?? "") || sessionId}`);
  renderAll([...APPROVE_KINDS, "approver-status", "approver-waiting", "focus-session"]);
}
function authFlagged() {
  const hits = hookServer?.stats.badPathHits;
  if (!hits || hits.length < BADPATH_MIN_HITS) return false;
  const now = Date.now();
  return hits.filter((t) => now - t < BADPATH_WINDOW_MS).length >= BADPATH_MIN_HITS;
}
function noteHeadChange(prevId) {
  const now = corrente()?.id ?? null;
  if (now !== prevId) state.lastHeadChangeAt = Date.now();
}
function answerAndDrop(ids, why) {
  if (!ids.length) return;
  const prev = corrente()?.id ?? null;
  for (const id of ids) {
    const { queue, req } = resolve(state.approveQueue, id);
    state.approveQueue = queue;
    if (req) {
      req.ticket.respond(null);
      log(`approve: dropped ${req.toolName} (${why})`);
    }
  }
  noteHeadChange(prev);
  queueChanged();
}
function onHookRequest(payload, ticket) {
  const toolName = String(payload?.tool_name ?? "");
  log(`approve: ${toolName} from ${path3.basename(String(payload?.cwd ?? ""))}`);
  if (payload?.hook_event_name !== "PermissionRequest" || !toolName) return void ticket.respond(null);
  if (!hasApproveKey()) return void ticket.respond(null);
  const req = {
    id: ++approveSeq,
    receivedAt: Date.now(),
    sessionId: payload.session_id ?? null,
    cwd: payload.cwd ?? "",
    toolName,
    toolInput: payload.tool_input ?? null,
    suggestions: payload.permission_suggestions ?? [],
    // Baselines are seeded by the first pollSessions tick that OBSERVES this request,
    // never here: state.sessions is up to 5s stale and would predate the status flip
    // that caused this very prompt, making the request look stale forever.
    statusSnapshot: null,
    activitySnapshot: null,
    baselined: false,
    ticket
  };
  ticket.id = req.id;
  const prev = corrente()?.id ?? null;
  const { queue, evicted } = enqueue(state.approveQueue, req);
  state.approveQueue = queue;
  if (evicted) {
    evicted.ticket.respond(null);
    log(`approve: evicted ${evicted.toolName} (queue full at ${QUEUE_MAX})`);
  }
  noteHeadChange(prev);
  queueChanged();
}
var onHookDrop = (ticket) => {
  if (ticket.id == null) return;
  const prev = corrente()?.id ?? null;
  const { queue, req } = resolve(state.approveQueue, ticket.id);
  if (!req) return;
  state.approveQueue = queue;
  log(`approve: socket closed for ${req.toolName}`);
  noteHeadChange(prev);
  queueChanged();
};
var ensuring = null;
var ensureAgain = false;
function ensureHookServer() {
  if (ensuring) {
    ensureAgain = true;
    return ensuring;
  }
  ensuring = ensureHookServerOnce().finally(() => {
    ensuring = null;
    if (ensureAgain) {
      ensureAgain = false;
      ensureHookServer();
    }
  });
  return ensuring;
}
async function ensureHookServerOnce() {
  const gs = state.globalSettings;
  let secret = typeof gs.hookSecret === "string" && gs.hookSecret.length >= 32 ? gs.hookSecret : state.hookSecret;
  const port = Number(gs.hookPort) > 0 ? Number(gs.hookPort) : PORT_DEFAULT;
  if (!secret) {
    secret = randomBytes(24).toString("base64url");
    state.globalSettings = { ...gs, hookSecret: secret, hookPort: port };
    send({ event: "setGlobalSettings", context: state.pluginUUID, payload: state.globalSettings });
    log("approve: generated a new hook secret");
  } else if (gs.hookSecret !== secret) {
    state.globalSettings = { ...gs, hookSecret: secret, hookPort: port };
    send({ event: "setGlobalSettings", context: state.pluginUUID, payload: state.globalSettings });
    log("approve: re-asserted the hook secret after a foreign global-settings write");
  }
  state.hookSecret = secret;
  if (hookServer && hookServer.boundPort === port && hookServer.secret === secret) {
    if (state.hookErr) {
      state.hookErr = null;
      renderApproveAll();
    }
    return;
  }
  const previous = hookServer;
  try {
    const next = await startHookServer({
      port,
      secret,
      onRequest: onHookRequest,
      onDrop: onHookDrop,
      onStatusline,
      log
    });
    if (previous && state.approveQueue.length) {
      answerAndDrop(state.approveQueue.map((r) => r.id), "hook server rebinding");
    }
    hookServer = next;
    state.hookPort = next.boundPort;
    state.hookErr = null;
    if (previous) await previous.close();
  } catch (e) {
    state.hookErr = e.code === "EADDRINUSE" ? "port busy" : String(e.message ?? e);
    log("approve: hook server failed:", state.hookErr);
  }
  renderApproveAll();
}
function installSnippet() {
  const url = `http://127.0.0.1:${state.hookPort}/permission/${state.hookSecret ?? "<secret>"}`;
  return hookFragment(url, HOLD_MS() / 1e3 + TIMEOUT_PAD_S);
}
function statuslineSnippet() {
  const url = `http://127.0.0.1:${state.hookPort}/statusline/${state.hookSecret ?? "<secret>"}`;
  return statuslineFragment(url, { windows: !IS_MAC });
}
async function walkTranscripts(dir, cutoffMs) {
  const out = [];
  async function rec(d) {
    let entries;
    try {
      entries = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path3.join(d, e.name);
      if (e.isDirectory()) {
        await rec(p);
        continue;
      }
      if (!e.name.endsWith(".jsonl")) continue;
      let st;
      try {
        st = await fsp.stat(p);
      } catch {
        continue;
      }
      if (st.mtimeMs < cutoffMs) continue;
      out.push({ path: p, size: st.size, mtimeMs: st.mtimeMs });
    }
  }
  await rec(dir);
  return out;
}
var SCAN_TTL_MS = 5e3;
var transcriptScan = { at: 0, cutoff: Infinity, files: [] };
async function scanTranscripts(cutoffMs) {
  const now = Date.now();
  const fresh = now - transcriptScan.at < SCAN_TTL_MS;
  if (fresh && transcriptScan.cutoff <= cutoffMs) {
    return transcriptScan.files.filter((f) => f.mtimeMs >= cutoffMs);
  }
  const cutoff = fresh ? Math.min(transcriptScan.cutoff, cutoffMs) : cutoffMs;
  const files = await walkTranscripts(PROJECTS_DIR, cutoff);
  transcriptScan = { at: now, cutoff, files };
  return files.filter((f) => f.mtimeMs >= cutoffMs);
}
var todayTracker = /* @__PURE__ */ new Map();
async function pollToday() {
  try {
    const day = localDay(Date.now());
    const dayStart = /* @__PURE__ */ new Date();
    dayStart.setHours(0, 0, 0, 0);
    let msgs = 0, tokens = 0;
    const chats = /* @__PURE__ */ new Set();
    const files = await scanTranscripts(dayStart.getTime());
    const seen = /* @__PURE__ */ new Set();
    for (const st of files) {
      const fp = st.path;
      seen.add(fp);
      if (!fp.split(path3.sep).includes("subagents")) chats.add(fp);
      let rec = todayTracker.get(fp);
      if (!rec || rec.counts.day !== day || st.size < rec.offset) {
        rec = { offset: 0, rest: "", counts: newDayCounts(day) };
      }
      if (st.size > rec.offset) {
        try {
          const fh = await fsp.open(fp, "r");
          try {
            const len = st.size - rec.offset;
            const buf = Buffer.alloc(len);
            const { bytesRead } = await fh.read(buf, 0, len, rec.offset);
            rec.offset += bytesRead;
            const chunk = rec.rest + buf.subarray(0, bytesRead).toString("utf8");
            const cut2 = chunk.lastIndexOf("\n");
            rec.rest = cut2 < 0 ? chunk : chunk.slice(cut2 + 1);
            foldDayChunk(rec.counts, cut2 < 0 ? "" : chunk.slice(0, cut2));
          } finally {
            await fh.close();
          }
        } catch {
          continue;
        }
      }
      todayTracker.set(fp, rec);
      const t = dayCountsTotals(rec.counts);
      msgs += t.msgs;
      tokens += t.tokens;
    }
    for (const fp of todayTracker.keys()) if (!seen.has(fp)) todayTracker.delete(fp);
    state.today = { chats: chats.size, msgs, tokens };
    renderAll(["today"]);
  } catch (e) {
    log("today poll failed:", String(e));
  }
}
var hourTracker = /* @__PURE__ */ new Map();
async function pollBurn() {
  try {
    const now = Date.now();
    const scanCutoff = now - 90 * 6e4;
    const files = await scanTranscripts(scanCutoff);
    const seen = /* @__PURE__ */ new Set();
    for (const st of files) {
      const fp = st.path;
      seen.add(fp);
      let rec = hourTracker.get(fp);
      if (!rec || st.size < rec.offset || !rec.seen) rec = { offset: 0, rest: "", events: [], seen: /* @__PURE__ */ new Map() };
      if (st.size > rec.offset) {
        const fh = await fsp.open(fp, "r");
        try {
          const len = st.size - rec.offset;
          const buf = Buffer.alloc(len);
          const { bytesRead } = await fh.read(buf, 0, len, rec.offset);
          rec.offset += bytesRead;
          const lines = (rec.rest + buf.subarray(0, bytesRead).toString("utf8")).split("\n");
          rec.rest = lines.pop() ?? "";
          for (const line2 of lines) {
            if (!line2) continue;
            let j;
            try {
              j = JSON.parse(line2);
            } catch {
              continue;
            }
            const u = j.message?.usage;
            if (!u || !j.timestamp) continue;
            const tok = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
            if (!tok) continue;
            const mid = j.message?.id ?? j.requestId;
            const ev = mid && rec.seen.get(mid);
            if (ev) {
              ev.tok = Math.max(ev.tok, tok);
              continue;
            }
            const e = { t: new Date(j.timestamp).getTime(), tok };
            if (mid) rec.seen.set(mid, e);
            rec.events.push(e);
          }
        } finally {
          await fh.close();
        }
      }
      rec.events = rec.events.filter((e) => now - e.t < 65 * 6e4);
      for (const [mid, ev] of rec.seen) if (now - ev.t >= 65 * 6e4) rec.seen.delete(mid);
      hourTracker.set(fp, rec);
    }
    for (const fp of hourTracker.keys()) if (!seen.has(fp)) hourTracker.delete(fp);
    let tokensHour = 0;
    for (const rec of hourTracker.values()) for (const e of rec.events) if (now - e.t < 36e5) tokensHour += e.tok;
    state.burn = { tokensHour, at: now };
    renderAll(["burn-rate"]);
  } catch (e) {
    log("burn poll failed:", String(e));
  }
}
var usageFileCache = /* @__PURE__ */ new Map();
async function pollUsageMeter(forceWins) {
  const wins = /* @__PURE__ */ new Set();
  if (forceWins) for (const w of forceWins) wins.add(w);
  else for (const v of views.values()) {
    if (v.kind === "usage-meter") wins.add(v.settings?.window ?? "today");
    else if (GAUGE_WINDOW[v.kind] && gaugeMode(state, v.kind, Date.now()) === "local") wins.add(GAUGE_WINDOW[v.kind]);
    else if (v.kind === "burn-rate" && gaugeMode(state, "usage-session", Date.now()) === "local") wins.add("5h");
  }
  if (!wins.size) return;
  const now = Date.now();
  const cutoff = Math.min(...[...wins].map((w) => windowStartMs(w, now)));
  try {
    const files = await scanTranscripts(cutoff);
    const seen = /* @__PURE__ */ new Set();
    const lists = [];
    for (const { path: fp, size, mtimeMs } of files) {
      seen.add(fp);
      const c = usageFileCache.get(fp);
      if (c && c.size === size && c.mtimeMs === mtimeMs) {
        lists.push(c.requests);
        continue;
      }
      let text;
      try {
        text = await fsp.readFile(fp, "utf8");
      } catch {
        continue;
      }
      const requests = parseRequests(text);
      usageFileCache.set(fp, { size, mtimeMs, requests });
      lists.push(requests);
    }
    for (const fp of usageFileCache.keys()) if (!seen.has(fp)) usageFileCache.delete(fp);
    const merged = mergeById(lists);
    const out = {};
    for (const w of wins) out[w] = aggregate(merged, windowStartMs(w, now), state.rates);
    state.usageMeter = out;
    if (wins.has("7day")) state.usageMeterModels = aggregateByModel(merged, windowStartMs("7day", now), state.rates);
    renderAll(["usage-meter", "usage-session", "usage-weekly", "usage-model", "burn-rate"]);
  } catch (e) {
    log("usage-meter poll failed:", String(e));
  }
}
function argOf(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : void 0;
}
var views = /* @__PURE__ */ new Map();
var cycle = /* @__PURE__ */ new Map();
var focusIdx = /* @__PURE__ */ new Map();
var usageView = /* @__PURE__ */ new Map();
var modelIdx = /* @__PURE__ */ new Map();
var shownReq = /* @__PURE__ */ new Map();
var shownFaccia = /* @__PURE__ */ new Map();
var shownLungo = /* @__PURE__ */ new Map();
var shownKind = /* @__PURE__ */ new Map();
var flipAt = /* @__PURE__ */ new Map();
var ws = null;
var animPhase = 0;
var lastSessionSig = "";
function send(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}
var setImage = (context, image) => send({ event: "setImage", context, payload: { image, target: 0 } });
var setTitle = (context) => send({ event: "setTitle", context, payload: { title: "", target: 0 } });
var showAlert = (context) => send({ event: "showAlert", context });
var kindOf = (action) => action.replace("dev.tapparello.agent-vitals.", "");
function render(context, kindProprio) {
  const v = views.get(context);
  const cy = cycle.get(context);
  const kind = tipoAdesso(context, kindProprio);
  if (shownKind.get(context) !== kind) {
    shownKind.set(context, kind);
    if (kind !== kindProprio) flipAt.set(context, Date.now());
  }
  const { image, painted } = viewFor(kind, {
    state,
    // Un tasto di consumi che fa da Allow non ha le impostazioni di un Allow.
    settings: kind === kindProprio ? v?.settings ?? {} : {},
    now: Date.now(),
    animPhase,
    usageViewMode: usageView.get(context) ?? "cost",
    pressedModelIdx: modelIdx.get(context) ?? null,
    cycleIdx: cy && cy.idx >= 0 ? cy.idx : -1,
    focus: focusIdx.get(context) ?? null,
    autoSlot: kind === "approver-status" ? autoSlotFor(context) : 0,
    authFlagged: authFlagged(),
    defaultCodeDir: DEFAULT_CODE_DIR
  });
  if (painted) {
    shownReq.set(context, painted.reqId);
    shownFaccia.set(context, painted.faccia ?? null);
    shownLungo.set(context, !!painted.lungo);
  }
  if (image != null) setImage(context, image);
}
function renderAll(kinds) {
  for (const [context, v] of views) {
    const slot = slotDi(v.kind, v.settings);
    if (kinds.includes(v.kind) || slot && kinds.includes(slot)) render(context, v.kind);
  }
}
function autoSlotFor(context) {
  const keys = [...views.entries()].filter(([, v]) => v.kind === "approver-status" && !(v.settings?.project && v.settings.project.trim())).map(([ctx, v]) => ({ context: ctx, device: v.device, row: v.row, col: v.col }));
  return autoSlot(keys, context);
}
function sessionByPid(pid) {
  return state.sessions.find((s) => s.pid === pid) ?? null;
}
var OSA_TIMEOUT_MS = 8e3;
function spawnDetached(cmd, args) {
  return new Promise((resolve2, reject) => {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve2();
    });
  });
}
function openMac(args) {
  return new Promise((resolve2, reject) => {
    execFile("open", args, (err) => err ? reject(err) : resolve2());
  });
}
function runOsa(lines) {
  return new Promise((resolve2, reject) => {
    const args = [];
    for (const l of lines) {
      args.push("-e", l);
    }
    execFile("osascript", args, { timeout: OSA_TIMEOUT_MS }, (err) => err ? reject(err) : resolve2());
  });
}
function pbcopy(text) {
  return new Promise((resolve2, reject) => {
    const child = spawn("pbcopy");
    child.once("error", reject);
    child.stdin.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve2() : reject(new Error("pbcopy exit " + code)));
    child.stdin.end(String(text ?? ""));
  });
}
function focusTarget(s) {
  const name = String(s.name ?? "").replace(/["'‘’“”]/g, "").slice(0, 40);
  return (name || path3.basename(s.cwd ?? "")).toLowerCase();
}
var winPlatform = {
  launchDesktop() {
    return spawnDetached("explorer.exe", [desktopAppId]);
  },
  openUrl(url) {
    return spawnDetached("cmd.exe", ["/c", "start", "", url]);
  },
  runCustom(command) {
    return spawnDetached("cmd.exe", ["/c", "start", "", command]);
  },
  // Global quick-chat hotkey Ctrl+Alt+Space via keybd_event (verbatim from the
  // original quickChat). The `hotkey` arg is ignored on Windows.
  fireHotkey(_hotkey) {
    const ps = `
Add-Type -Namespace K -Name W -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);';
[K.W]::keybd_event(0x11,0,0,[UIntPtr]::Zero); [K.W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [K.W]::keybd_event(0x20,0,0,[UIntPtr]::Zero);
Start-Sleep -Milliseconds 60;
[K.W]::keybd_event(0x20,0,2,[UIntPtr]::Zero); [K.W]::keybd_event(0x12,0,2,[UIntPtr]::Zero); [K.W]::keybd_event(0x11,0,2,[UIntPtr]::Zero);`;
    return spawnDetached("powershell.exe", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps]);
  },
  // Set-Clipboard + keybd_event chord + Ctrl+V + optional Enter (verbatim from
  // the original sendPrompt). `hotkey` ignored on Windows.
  pasteInto(_hotkey, text, enter) {
    const ps = `
Set-Clipboard -Value '${String(text).replace(/'/g, "''")}';
Add-Type -Namespace K -Name W -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);';
function P([byte]$k){[K.W]::keybd_event($k,0,0,[UIntPtr]::Zero)}; function R([byte]$k){[K.W]::keybd_event($k,0,2,[UIntPtr]::Zero)};
P 0x11; P 0x12; P 0x20; Start-Sleep -Milliseconds 60; R 0x20; R 0x12; R 0x11;
Start-Sleep -Milliseconds 800;
P 0x11; P 0x56; Start-Sleep -Milliseconds 60; R 0x56; R 0x11;
${enter ? "Start-Sleep -Milliseconds 200; P 0x0D; R 0x0D;" : ""}`;
    return spawnDetached("powershell.exe", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps]);
  },
  // Bring the session's terminal window to front by title substring (verbatim
  // EnumWindows/SetForegroundWindow). execFile gives a real exit code.
  focusWindow(s) {
    const target = focusTarget(s);
    if (!target) return Promise.reject(new Error("no focus target"));
    const ps = `
$target = '${target.replace(/'/g, "''")}';
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class W { public delegate bool EP(IntPtr h, IntPtr l); [DllImport("user32.dll")] public static extern bool EnumWindows(EP cb, IntPtr l); [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); }';
$found = [IntPtr]::Zero;
[void][W]::EnumWindows({ param($h, $l) $sb = New-Object System.Text.StringBuilder 512; [void][W]::GetWindowText($h, $sb, 512); if ([W]::IsWindowVisible($h) -and $sb.ToString().ToLower().Contains($target)) { $script:found = $h; return $false }; return $true }, [IntPtr]::Zero);
if ($found -eq [IntPtr]::Zero) { exit 1 };
[void][W]::ShowWindow($found, 9); [void][W]::SetForegroundWindow($found); exit 0`;
    return new Promise((resolve2, reject) => {
      execFile("powershell.exe", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps], (err) => err ? reject(err) : resolve2());
    });
  },
  // Windows Terminal (new foreground window) with a PowerShell fallback. The
  // whole fallback chain stays internal and settles the Promise once (spec §5.8).
  openTerminal(dir) {
    return new Promise((resolve2, reject) => {
      const psFallback = () => {
        const fb = spawn("cmd.exe", ["/c", "start", "", "powershell", "-NoExit", "-Command", `cd '${dir}'; claude`], { detached: true, stdio: "ignore" });
        fb.once("error", reject);
        fb.once("spawn", () => {
          fb.unref();
          resolve2();
        });
      };
      const wt = spawn("cmd.exe", ["/c", "start", "", "wt", "-w", "new", "-d", dir, "powershell", "-NoExit", "-Command", "claude"], { detached: true, stdio: "ignore" });
      wt.once("error", psFallback);
      wt.once("exit", (code) => {
        if (code === 0) resolve2();
        else psFallback();
      });
      wt.unref();
    });
  },
  // "<pid> <elapsed-seconds>" per line, for the recycled-pid check. Shaped to
  // match macOS `ps -axo pid=,etimes=` so one parser serves both platforms.
  // StartTime throws on some protected system processes — skip those rather than
  // failing the whole listing, since a pid we cannot read is simply left
  // unverified (and therefore kept).
  listProcStarts() {
    const ps = 'Get-Process | ForEach-Object { try { "$($_.Id) $([int]((Get-Date) - $_.StartTime).TotalSeconds)" } catch {} }';
    return new Promise((resolve2, reject) => {
      execFile(
        "powershell.exe",
        ["-NoProfile", "-Command", ps],
        { timeout: OSA_TIMEOUT_MS, maxBuffer: 4 << 20 },
        (err, out) => err ? reject(err) : resolve2(String(out))
      );
    });
  },
  // OAuth token from the credentials file (Windows/Linux location).
  async readToken() {
    try {
      const raw = await fsp.readFile(CREDS_FILE, "utf8");
      return parseKeychainToken(raw);
    } catch {
      return null;
    }
  }
};
var macPlatform = {
  launchDesktop() {
    return openMac(["-b", "com.anthropic.claudefordesktop"]).catch(() => openMac(["-a", "Claude"]));
  },
  openUrl(url) {
    return openMac([url]);
  },
  runCustom(command) {
    const c = classifyCustomCommand(command, { home: os.homedir(), exists: fs.existsSync });
    if (!c) return Promise.reject(new Error("empty command"));
    return c.mode === "open" ? openMac([c.arg]) : openMac(["-a", c.arg]);
  },
  openTerminal(dir) {
    const d = escapeAppleScript(dir);
    return runOsa([
      "with timeout of 7 seconds",
      'tell application "Terminal"',
      `do script "cd " & quoted form of "${d}" & " && claude"`,
      "activate",
      "end tell",
      "end timeout"
    ]);
  },
  fireHotkey(hotkey) {
    const clause = hotkeyClause(parseHotkey(hotkey));
    if (!clause) return Promise.reject(new Error("no hotkey configured"));
    return runOsa([
      "with timeout of 7 seconds",
      `tell application "System Events" to ${clause}`,
      "end timeout"
    ]);
  },
  pasteInto(hotkey, text, enter) {
    const clause = hotkeyClause(parseHotkey(hotkey));
    if (!clause) return Promise.reject(new Error("no hotkey configured"));
    const lines = [
      "with timeout of 7 seconds",
      'tell application "System Events"',
      `  ${clause}`,
      "  delay 0.8",
      '  keystroke "v" using {command down}'
    ];
    if (enter) {
      lines.push("  delay 0.2", "  key code 36");
    }
    lines.push("end tell", "end timeout");
    return pbcopy(text).then(() => runOsa(lines));
  },
  // Bring the exact window hosting this session to the front. The GUI app is
  // resolved from the session PID's ancestry; then, best-effort per app:
  //   Terminal -> raise the window whose tab tty matches the session tty
  //   VS Code  -> raise the window whose title contains the session's folder
  //   otherwise -> just activate the app.
  // Falls back to activating the app if the window match/permission fails, so
  // it degrades to "app to front" rather than nothing. Terminal needs
  // Automation->Terminal; VS Code needs Accessibility.
  focusWindow(s) {
    const pid = s?.pid;
    if (!pid) return Promise.reject(new Error("no pid for session"));
    const ps = (args) => new Promise((resolve2, reject) => execFile("ps", args, { timeout: OSA_TIMEOUT_MS }, (e, out) => e ? reject(e) : resolve2(String(out))));
    return ps(["-axo", "pid=,ppid=,comm="]).then((out) => {
      const bundle = hostAppForPid(parsePsTree(out), pid);
      if (!bundle) throw new Error("no host app for pid " + pid);
      const activateApp = () => openMac([bundle]);
      const strat = focusStrategyForBundle(bundle);
      const fallback = (why) => (e) => {
        log(`focusWindow: ${why} for pid ${pid} (${bundle}) -> activating app instead:`, String(e?.message ?? e));
        return activateApp();
      };
      if (strat === "terminal") {
        return ps(["-o", "tty=", "-p", String(pid)]).then((t) => {
          const tty = t.trim();
          if (!tty || tty === "??") {
            log(`focusWindow: no tty for pid ${pid} -> activating app instead`);
            return activateApp();
          }
          log(`focusWindow: terminal strategy, pid ${pid}, tty ${tty}`);
          return runOsa(terminalFocusScript(tty)).catch(fallback("terminal tty match failed"));
        }).catch(fallback("tty lookup failed"));
      }
      if (strat === "vscode") {
        const base2 = path3.basename(s.cwd ?? "");
        if (!base2) return activateApp();
        const esc2 = escapeAppleScript(base2);
        return runOsa([
          "with timeout of 7 seconds",
          'tell application "System Events"',
          '  tell process "Code"',
          "    set matched to false",
          "    repeat with w in windows",
          `      if (name of w) contains "${esc2}" then`,
          '        perform action "AXRaise" of w',
          "        set frontmost to true",
          "        set matched to true",
          "        exit repeat",
          "      end if",
          "    end repeat",
          '    if not matched then error "not found"',
          "  end tell",
          "end tell",
          "end timeout"
        ]).catch(fallback("vscode window match failed"));
      }
      return activateApp();
    });
  },
  // "<pid> <elapsed>" per line, for the recycled-pid check. `etime`, not `etimes`:
  // the seconds-valued `etimes` keyword is a GNU procps extension and BSD ps exits
  // with "keyword not found" (measured). parseElapsed handles etime's
  // "[[dd-]hh:]mm:ss" shape, which is numeric and so locale-independent.
  listProcStarts() {
    return new Promise((resolve2, reject) => {
      execFile(
        "ps",
        ["-axo", "pid=,etime="],
        { timeout: OSA_TIMEOUT_MS, maxBuffer: 4 << 20 },
        (err, out) => err ? reject(err) : resolve2(String(out))
      );
    });
  },
  // OAuth token from the login Keychain (service "Claude Code-credentials"),
  // falling back to the credentials file if a user exported it.
  readToken() {
    return new Promise((resolve2) => {
      execFile(
        "security",
        ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
        { timeout: OSA_TIMEOUT_MS },
        async (err, out) => {
          const tok = err ? null : parseKeychainToken(out);
          if (tok) return resolve2(tok);
          try {
            const raw = await fsp.readFile(CREDS_FILE, "utf8");
            resolve2(parseKeychainToken(raw));
          } catch {
            resolve2(null);
          }
        }
      );
    });
  }
};
var platform = IS_MAC ? macPlatform : winPlatform;
function act(context, p) {
  p.catch(() => showAlert(context));
}
function onKeyDown(context, kind) {
  switch (kind) {
    case "usage-session":
    case "usage-weekly":
      if (gaugeMode(state, kind, Date.now()) === "local") {
        usageView.set(context, (usageView.get(context) ?? "cost") === "cost" ? "tokens" : "cost");
        pollUsageMeter();
        return render(context, kind);
      }
      pollDesktopUsage();
      if (Date.now() - lastUsageAttempt > 3e4) pollUsage();
      return;
    case "today":
      pollToday();
      return;
    case "sessions": {
      const n = state.sessions.length;
      if (n === 0) return showAlert(context);
      const cy = cycle.get(context) ?? { idx: -1, timer: null };
      cy.idx = (cy.idx + 1) % n;
      if (cy.timer) clearTimeout(cy.timer);
      cy.timer = setTimeout(() => {
        cycle.set(context, { idx: -1, timer: null });
        render(context, "sessions");
      }, 4e3);
      cycle.set(context, cy);
      return render(context, "sessions");
    }
    case "usage-model": {
      const mode = gaugeMode(state, "usage-model", Date.now());
      const list = modelList(state, mode);
      if (list.length > 1) {
        const cur = modelListIndex(modelIdx.get(context) ?? null, list, views.get(context)?.settings?.model);
        modelIdx.set(context, (cur + 1) % list.length);
      } else if (mode === "local") pollUsageMeter();
      else if (Date.now() - lastUsageAttempt > 3e4) pollUsage();
      return render(context, "usage-model");
    }
    case "burn-rate":
      pollBurn();
      return;
    case "project": {
      const s = views.get(context)?.settings ?? {};
      if (!s.path) return showAlert(context);
      return act(context, platform.openTerminal(s.path));
    }
    case "focus-session": {
      if (sessioniInAttesa(state.approveQueue).length) return scegliSessione(prossimaScelta(state.approveQueue, state.scelta));
      const blocked = blockedSessions(state.sessions, Date.now(), state.activity, state.pending);
      const pool = blocked.length ? blocked : state.sessions;
      const n = pool.length;
      if (!n) return showAlert(context);
      const poolSig = pool.map((s) => s.pid ?? s.sessionId).join(",");
      const prev = focusIdx.get(context);
      const i = prev?.sig === poolSig ? (prev.i + 1) % n : 0;
      focusIdx.set(context, { i, sig: poolSig });
      apriRecord(context, pool[i]);
      return render(context, "focus-session");
    }
    case "quick-prompt": {
      const s = views.get(context)?.settings ?? {};
      if (!s.prompt) return showAlert(context);
      return act(context, platform.pasteInto(s.hotkey, s.prompt, !!s.enter));
    }
    case "custom": {
      const s = views.get(context)?.settings ?? {};
      if (!s.command) return showAlert(context);
      return act(context, platform.runCustom(s.command));
    }
    case "posta": {
      const v = views.get(context);
      const email = normEmail(v?.settings?.email);
      if (!email) return showAlert(context);
      const chiave = chiaveLettura(email, modoDi(v.settings));
      setTimeout(() => pollPosta({ subito: chiave }), 45e3);
      return act(context, platform.openUrl(urlGmail(email)));
    }
    case "thecore": {
      const m = METRICHE[metricaDi(views.get(context)?.settings)];
      if (!m.pagina) {
        pollTheCore(true);
        return;
      }
      const url = urlPagina(confTheCore(state.globalSettings).app, m.pagina);
      if (!url) return showAlert(context);
      return act(context, platform.openUrl(url));
    }
    case "launch":
      return act(context, platform.launchDesktop());
    case "quick-chat": {
      const s = views.get(context)?.settings ?? {};
      return act(context, platform.fireHotkey(s.hotkey));
    }
    case "open-web":
      return act(context, platform.openUrl("https://claude.ai/new"));
    case "claude-code":
      return act(context, platform.openTerminal(DEFAULT_CODE_DIR));
    case "usage-meter": {
      usageView.set(context, (usageView.get(context) ?? "cost") === "cost" ? "tokens" : "cost");
      pollUsageMeter();
      return render(context, "usage-meter");
    }
    case "approver-status": {
      const s = views.get(context)?.settings ?? {};
      const resolved = resolveStatusKey(state.sessions, s.project ?? "", autoSlotFor(context), Date.now(), state.activity, state.pending);
      if (!resolved.count) return showAlert(context);
      const cycling = !!s.cycle && resolved.count > 1;
      let idx = resolved.index;
      if (cycling) {
        const cy = cycle.get(context) ?? { idx: resolved.index - 1, timer: null };
        cy.idx = (cy.idx + 1) % resolved.count;
        if (cy.timer) clearTimeout(cy.timer);
        cy.timer = setTimeout(() => {
          cycle.set(context, { idx: -1, timer: null });
          render(context, "approver-status");
        }, 4e3);
        cycle.set(context, cy);
        idx = cy.idx;
      }
      const entry = statusEntry(resolved, cycling ? idx : null);
      if (entry.sessionId && sessioniInAttesa(state.approveQueue).includes(entry.sessionId) && corrente()?.sessionId !== entry.sessionId) {
        return scegliSessione(entry.sessionId);
      }
      render(context, "approver-status");
      return apriRecord(context, entry.url ? { url: entry.url } : sessionByPid(entry.pid));
    }
    case "approver-waiting": {
      const blocked = blockedSessions(state.sessions, Date.now(), state.activity, state.pending);
      if (!blocked.length) return showAlert(context);
      const cy = cycle.get(context) ?? { idx: -1, timer: null };
      cy.idx = (cy.idx + 1) % blocked.length;
      if (cy.timer) clearTimeout(cy.timer);
      cy.timer = setTimeout(() => {
        cycle.set(context, { idx: -1, timer: null });
        render(context, "approver-waiting");
      }, 4e3);
      cycle.set(context, cy);
      render(context, "approver-waiting");
      return apriRecord(context, blocked[cy.idx]);
    }
    case "approve-allow":
    case "approve-always":
    case "approve-deny": {
      try {
        if (!APPROVE_KINDS.includes(views.get(context)?.kind) && Date.now() - (flipAt.get(context) ?? 0) < 1e3) {
          return showAlert(context);
        }
        const d = pressDecision({
          queue: state.approveQueue,
          shownId: shownReq.get(context) ?? null,
          scelta: state.scelta,
          lastHeadChangeAt: state.lastHeadChangeAt,
          now: Date.now()
        });
        if (d.action === "none") {
          if (d.reason === "settling") showAlert(context);
          return;
        }
        if (d.action === "alert") {
          renderApproveAll();
          return showAlert(context);
        }
        const target = corrente();
        if (state.hookErr && !target?.cloud) return showAlert(context);
        if (isQuestion(target)) return premiDomanda(context, kind, target);
        if (kind === "approve-always") return apriRecord(context, sessioneDi(target));
        if (kind === "approve-allow" && shownLungo.get(context)) return iniziaPressioneLunga(context, target);
        rispondi(target.id, decisionBody(kind === "approve-allow" ? "allow" : "deny", target), kind === "approve-allow" ? "allow" : "deny");
      } catch (e) {
        log("approve press failed:", e?.stack ?? String(e));
        showAlert(context);
      }
      return;
    }
  }
}
function rispondi(id, body, perche) {
  const prev = corrente()?.id ?? null;
  const { queue, req } = resolve(state.approveQueue, id);
  if (!req) return false;
  state.approveQueue = queue;
  state.risposte.delete(id);
  req.ticket.respond(body);
  if (perche === "deny") state.denies = rememberDeny(state.denies, req, Date.now());
  log(`approve: ${perche} ${req.toolName}${req.cloud ? " (cloud)" : ""}`);
  noteHeadChange(prev);
  state.lastHeadChangeAt = Date.now();
  queueChanged();
  return true;
}
function premiDomanda(context, kind, req) {
  const st = state.risposte.get(req.id) ?? statoIniziale();
  const f = facce(req, st)[SLOT[kind]];
  if (chiaveFaccia(st, f) !== (shownFaccia.get(context) ?? null)) {
    renderApproveAll();
    return showAlert(context);
  }
  if (f.tipo === "domanda") return apriRecord(context, sessioneDi(req));
  if (f.tipo === "vuoto") return;
  const esito = premi(req, st, SLOT[kind]);
  if (esito.nulla) return showAlert(context);
  if (esito.risposte) return void rispondi(req.id, answerBody(req, esito.risposte), "answer");
  state.risposte.set(req.id, esito.stato);
  if (esito.stato.passo !== st.passo || esito.stato.pagina !== st.pagina) state.lastHeadChangeAt = Date.now();
  renderApproveAll();
}
var LUNGO_MS = 2e3;
var pressioni = /* @__PURE__ */ new Map();
function iniziaPressioneLunga(context, req) {
  annullaPressione(context);
  const timer = setTimeout(() => {
    pressioni.delete(context);
    const ora3 = corrente();
    if (!ora3 || ora3.id !== req.id) return showAlert(context);
    rispondi(req.id, decisionBody("allow", req), "allow (pressione lunga)");
  }, LUNGO_MS);
  pressioni.set(context, { timer, reqId: req.id });
}
function annullaPressione(context) {
  const p = pressioni.get(context);
  if (p) {
    clearTimeout(p.timer);
    pressioni.delete(context);
  }
  return !!p;
}
function onKeyUp(context) {
  if (annullaPressione(context)) showAlert(context);
}
function sessioneDi(req) {
  return state.sessions.filter((s) => s.sessionId === req?.sessionId).sort((a, b) => (b.statusUpdatedAt ?? 0) - (a.statusUpdatedAt ?? 0))[0] ?? null;
}
function apriRecord(context, rec) {
  if (rec?.url) return act(context, platform.openUrl(rec.url));
  if (rec?.pid) return act(context, platform.focusWindow(rec));
  return showAlert(context);
}
var gestiteCloud = /* @__PURE__ */ new Map();
var relayTimer = null;
function relayConf() {
  const gs = state.globalSettings ?? {};
  return { url: String(gs.relayUrl ?? "").trim().replace(/\/+$/, ""), token: String(gs.relayToken ?? "").trim() };
}
function programmaRelay(ms) {
  clearTimeout(relayTimer);
  relayTimer = setTimeout(pollRelay, ms);
  relayTimer.unref?.();
}
function togliCloud() {
  const prima = state.approveQueue.length;
  state.approveQueue = state.approveQueue.filter((r) => !r.cloud);
  const cambiata = state.approveQueue.length !== prima;
  if (cambiata) queueChanged();
  if (state.cloudSessions.length) {
    state.cloudSessions = [];
    pubblicaSessioni();
  }
}
async function pollRelay() {
  const { url, token } = relayConf();
  if (!urlValido(url) || token.length < 32) {
    togliCloud();
    state.relay = { ok: false, err: url || token ? "relay da configurare" : null, at: 0, errori: 0, sessioni: 0 };
    return programmaRelay(1e4);
  }
  let snap;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8e3);
    const r = await fetch(url + "/v1/deck", { headers: { authorization: `Bearer ${token}` }, signal: ac.signal }).finally(() => clearTimeout(t));
    if (r.status === 401) throw new Error("chiave deck errata");
    if (!r.ok) throw new Error(`relay HTTP ${r.status}`);
    snap = await r.json();
  } catch (e) {
    const msg = String(e?.message ?? e);
    const errori = (state.relay.errori ?? 0) + 1;
    if (state.relay.err !== msg) log("relay:", msg);
    state.relay = { ...state.relay, ok: false, err: msg, errori };
    if (errori >= 3) togliCloud();
    return programmaRelay(intervallo({ errori }));
  }
  if (!state.relay.ok) log("relay: collegato");
  state.relay = { ok: true, err: null, at: Date.now(), errori: 0, sessioni: snap?.sessioni?.length ?? 0 };
  applicaRelay(snap);
  programmaRelay(intervallo({ snap }));
}
function applicaRelay(snap) {
  const adesso = Date.now();
  for (const [id, t] of gestiteCloud) if (adesso - t > 12e4) gestiteCloud.delete(id);
  state.cloudSessions = sessioniCloud(snap, adesso);
  let cambiata = false;
  const sparite = richiesteSparite(state.approveQueue, snap);
  if (sparite.length) {
    const prev = corrente()?.id ?? null;
    state.approveQueue = state.approveQueue.filter((r) => !sparite.includes(r.id));
    noteHeadChange(prev);
    cambiata = true;
  }
  if (hasApproveKey()) {
    for (const r of richiesteNuove(state.approveQueue, snap, new Set(gestiteCloud.keys()))) {
      const req = { id: ++approveSeq, ...voceDa(r, state.cloudSessions, adesso, snap.ora) };
      req.ticket = ticketCloud(req);
      const prev = corrente()?.id ?? null;
      const { queue, evicted } = enqueue(state.approveQueue, req);
      state.approveQueue = queue;
      if (evicted) evicted.ticket.respond(null);
      noteHeadChange(prev);
      cambiata = true;
      log(`approve: ${req.toolName} dal cloud (${path3.basename(req.cwd)})`);
    }
  }
  if (cambiata) queueChanged();
  pubblicaSessioni();
}
function ticketCloud(req) {
  const ticket = {
    id: req.id,
    closed: false,
    respond(out) {
      if (ticket.closed) return false;
      ticket.closed = true;
      gestiteCloud.set(req.cloudId, Date.now());
      const decisione = decisioneDa(out);
      if (decisione) inviaDecisione(req.cloudId, decisione);
      return true;
    }
  };
  return ticket;
}
async function inviaDecisione(id, decisione) {
  const { url, token } = relayConf();
  try {
    const r = await fetch(url + "/v1/deck/decisione", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ id, decisione })
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      log(`relay: decisione non accettata (${j.errore ?? r.status})`);
      if (j.errore !== "GIA_DECISA") gestiteCloud.delete(id);
    }
  } catch (e) {
    log("relay: decisione non inviata:", String(e?.message ?? e));
    gestiteCloud.delete(id);
  }
  programmaRelay(300);
}
var postaInCorso = /* @__PURE__ */ new Set();
var impronta = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
async function pollPosta({ subito = null } = {}) {
  const now = Date.now();
  const lavori = caselleDaLeggere(views.values(), state.globalSettings).filter((c) => {
    if (postaInCorso.has(c.chiave)) return false;
    const rec = state.posta.get(c.chiave);
    if (subito === c.chiave && rec?.err !== "credenziali") return true;
    return now >= prossimaLettura(rec, now, impronta(c.pass));
  });
  if (!lavori.length) return;
  await Promise.all(lavori.map(async (c) => {
    postaInCorso.add(c.chiave);
    const imp = impronta(c.pass);
    const prima = state.posta.get(c.chiave);
    try {
      const r = await contaNonLette({ user: c.email, pass: c.pass, modo: c.modo });
      const t = Date.now();
      state.posta.set(c.chiave, { n: r.n, messaggi: r.messaggi, at: t, okAt: t, err: null, impronta: imp });
    } catch (e) {
      const tipo = e?.tipo ?? "rete";
      if (prima?.err !== tipo) log(`posta: ${c.email} (${c.modo}) non letta: ${tipo} ${String(e?.message ?? "")}`);
      const tieni = tipo !== "credenziali" && prima?.impronta === imp && prima?.n != null;
      state.posta.set(c.chiave, {
        n: tieni ? prima.n : null,
        messaggi: tieni ? prima.messaggi : null,
        at: Date.now(),
        okAt: tieni ? prima.okAt : null,
        err: tipo,
        impronta: imp
      });
    } finally {
      postaInCorso.delete(c.chiave);
    }
  }));
  renderAll(["posta"]);
}
var thecoreInCorso = false;
var thecoreFirma = "";
async function pollTheCore(forza = false) {
  if (!forza && ![...views.values()].some((v) => v.kind === "thecore")) return;
  const conf = confTheCore(state.globalSettings);
  if (!conf.completa) {
    if (state.thecore) {
      state.thecore = null;
      thecoreFirma = "";
      renderAll(["thecore"]);
    }
    return;
  }
  const firma = conf.url + "|" + impronta(conf.chiave);
  if (firma !== thecoreFirma) {
    thecoreFirma = firma;
    state.thecore = null;
    forza = true;
  }
  const tc = state.thecore;
  if (!forza && tc && Date.now() - tc.at < (tc.err ? RITARDO_ERRORE_THECORE_MS : INTERVALLO_THECORE_MS)) return;
  if (thecoreInCorso) return;
  thecoreInCorso = true;
  try {
    const dati = await leggiTheCore(conf);
    const t = Date.now();
    state.thecore = { dati, at: t, okAt: t, err: null };
  } catch (e) {
    const tipo = e?.tipo ?? "rete";
    if (state.thecore?.err !== tipo) log(`thecore: lettura non riuscita: ${tipo} ${String(e?.message ?? "")}`);
    const tieni = tipo !== "chiave" && tipo !== "stagione" && state.thecore?.dati ? state.thecore : null;
    state.thecore = { dati: tieni?.dati ?? null, at: Date.now(), okAt: tieni?.okAt ?? null, err: tipo };
  } finally {
    thecoreInCorso = false;
  }
  renderAll(["thecore"]);
}
if (process.argv.includes("--selftest")) {
  (async () => {
    log("selftest: reading Claude Desktop usage history\u2026");
    await pollDesktopUsage();
    log("selftest desktop:", desktopTrovato ? `${desktopTrovato} (sample ${Math.round((Date.now() - state.usageAt) / 6e4)}m old)` : "not found");
    log("selftest: polling usage endpoint\u2026");
    await pollUsage({ forza: true });
    log("selftest usage:", state.usage ? `${state.usageSrc} ${JSON.stringify(state.usage)}` : `ERROR: ${state.usageErr}`);
    if (state.usageErr) log("selftest endpoint:", state.usageErr);
    await pollSessions();
    log("selftest sessions:", state.sessions.map((s) => `${s.name}[${s.status}]`).join(", ") || "(none)");
    log("selftest states:", state.sessions.map((s) => `${s.name}=${sessionState(s, Date.now(), state.activity.get(s.sessionId) ?? null)}${s.waitingFor ? "(" + s.waitingFor + ")" : ""}`).join(", ") || "(none)");
    log("selftest blocked:", blockedSessions(state.sessions, Date.now(), state.activity).map((s) => s.name).join(", ") || "(none)");
    log("selftest status (auto k0):", JSON.stringify(statusEntry(resolveStatusKey(state.sessions, "", 0, Date.now(), state.activity))));
    const demo0 = state.sessions[0];
    if (demo0) {
      const proj = path3.basename(demo0.cwd ?? "");
      const r = resolveStatusKey(state.sessions, proj, 0, Date.now(), state.activity);
      log(`selftest status (explicit ${proj}) count=${r.count}:`, JSON.stringify(statusEntry(r)));
    }
    await pollToday();
    log("selftest today:", JSON.stringify(state.today));
    await pollUsageMeter(["5h"]);
    await pollBurn();
    log("selftest burn:", JSON.stringify(state.burn), "eta:", sessionEta(state, Date.now()));
    await pollUsageMeter(["5h", "today", "month", "7day"]);
    log("selftest usage-meter:", JSON.stringify(state.usageMeter));
    log("selftest per-model 7d:", JSON.stringify(state.usageMeterModels));
    const secret = randomBytes(24).toString("base64url");
    let got = null;
    const srv = await startHookServer({
      port: 0,
      secret,
      log,
      onRequest: (payload, ticket) => {
        got = payload;
        ticket.respond(decisionBody("allow", {}));
      }
    });
    const res = await fetch(`http://127.0.0.1:${srv.boundPort}/permission/${secret}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: { command: "npm test" } })
    });
    const body = await res.json();
    log(
      "selftest hook:",
      res.status,
      "payload tool:",
      got?.tool_name,
      "decision:",
      body?.hookSpecificOutput?.decision?.behavior
    );
    log("selftest approver config: holdS=", HOLD_S_DEFAULT, "portDefault=", PORT_DEFAULT, "queueMax=", QUEUE_MAX);
    await srv.close();
    if (res.status !== 200 || got?.tool_name !== "Bash" || body?.hookSpecificOutput?.decision?.behavior !== "allow") {
      log("selftest hook FAILED");
      process.exit(1);
    }
    process.exit(0);
  })().catch((e) => {
    log("selftest crashed:", e?.stack ?? String(e));
    process.exit(1);
  });
} else {
  process.on("uncaughtException", (e) => log("uncaughtException:", e?.stack ?? String(e)));
  process.on("unhandledRejection", (e) => log("unhandledRejection:", e?.stack ?? String(e)));
  const port = argOf("-port");
  const pluginUUID = argOf("-pluginUUID");
  const registerEvent = argOf("-registerEvent");
  log(`starting: port=${port} uuid=${pluginUUID}`);
  ws = new import_websocket.default(`ws://127.0.0.1:${port}`);
  ws.on("open", () => {
    state.pluginUUID = pluginUUID;
    send({ event: registerEvent, uuid: pluginUUID });
    log("registered with Stream Deck");
    send({ event: "getGlobalSettings", context: pluginUUID });
    pollDesktopUsage().finally(() => {
      if (Date.now() - state.usageAt > 9e4) pollUsage();
    });
    pollSessions();
    pollToday();
  });
  ws.on("close", () => {
    log("socket closed, exiting");
    process.exit(0);
  });
  ws.on("error", (e) => {
    log("socket error:", String(e));
  });
  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    const { event, context, action } = msg;
    if (event === "willAppear" && action) {
      views.set(context, {
        kind: kindOf(action),
        settings: msg.payload?.settings ?? {},
        // Device + physical position: used to give several auto Status keys a
        // stable slot, numbered per device (two Stream Decks are live at once).
        device: msg.device ?? null,
        row: msg.payload?.coordinates?.row ?? null,
        col: msg.payload?.coordinates?.column ?? null
      });
      setTitle(context);
      render(context, kindOf(action));
      if (kindOf(action) === "usage-meter" || GAUGE_WINDOW[kindOf(action)]) pollUsageMeter();
      if (kindOf(action) === "posta") pollPosta();
      if (kindOf(action) === "thecore") pollTheCore();
    } else if (event === "willDisappear") {
      const wasApproveKey = faDaApprovazione(views.get(context));
      views.delete(context);
      shownKind.delete(context);
      flipAt.delete(context);
      cycle.delete(context);
      focusIdx.delete(context);
      usageView.delete(context);
      modelIdx.delete(context);
      if (wasApproveKey) {
        setTimeout(() => {
          if (!hasApproveKey() && state.approveQueue.length) {
            answerAndDrop(state.approveQueue.map((r) => r.id), "no Approve key visible");
          }
        }, 1e3);
      }
    } else if (event === "didReceiveSettings" && action) {
      const v = views.get(context);
      if (v) {
        v.settings = msg.payload?.settings ?? {};
        render(context, v.kind);
        if (v.kind === "usage-meter" || GAUGE_WINDOW[v.kind]) pollUsageMeter();
        if (v.kind === "posta") pollPosta();
      }
    } else if (event === "didReceiveGlobalSettings") {
      state.globalSettings = msg.payload?.settings ?? {};
      state.rates = state.globalSettings.rates ?? {};
      pollUsageMeter();
      ensureHookServer();
      programmaRelay(200);
      renderApproveAll();
      renderAll(["posta", "thecore"]);
      pollPosta();
      pollTheCore();
    } else if (event === "sendToPlugin" && action) {
      if (msg.payload?.cmd === "getModels") {
        send({ event: "sendToPropertyInspector", context, payload: { models: (state.usage?.models ?? []).map((m) => m.name) } });
      }
      if (msg.payload?.cmd === "getPosta") {
        const settings = views.get(context)?.settings ?? {};
        const email = normEmail(settings.email);
        const rec = email ? state.posta.get(chiaveLettura(email, modoDi(settings))) : null;
        send({ event: "sendToPropertyInspector", context, payload: {
          posta: statoPosta({ settings, rec, haPassword: !!passwordDi(state.globalSettings, email) })
        } });
      }
      if (msg.payload?.cmd === "getTheCore") {
        send({ event: "sendToPropertyInspector", context, payload: {
          thecore: statoTheCore({ tc: state.thecore, conf: confTheCore(state.globalSettings) })
        } });
      }
      if (msg.payload?.cmd === "getRelay") {
        const { ok, err, sessioni } = state.relay;
        send({ event: "sendToPropertyInspector", context, payload: { relay: { ok, err, sessioni } } });
      }
      if (msg.payload?.cmd === "getInstall") {
        send({ event: "sendToPropertyInspector", context, payload: {
          install: { port: state.hookPort, holdS: HOLD_MS() / 1e3, snippet: installSnippet(), statusline: statuslineSnippet(), error: state.hookErr }
        } });
      }
    } else if (event === "keyDown" && action) {
      onKeyDown(context, tipoAdesso(context, kindOf(action)));
    } else if (event === "keyUp" && action) {
      onKeyUp(context);
    }
  });
  (function usageLoop() {
    setTimeout(async () => {
      await pollUsage();
      usageLoop();
    }, usageDelay);
  })();
  setInterval(pollDesktopUsage, 6e4);
  setInterval(pollSessions, 5e3);
  setInterval(pollToday, 3e5);
  pollBurn();
  setInterval(pollBurn, 6e4);
  setInterval(pollUsageMeter, 6e4);
  setInterval(pollPosta, 15e3);
  setInterval(pollTheCore, 3e4);
  setInterval(() => {
    animPhase = (animPhase + 1) % 3;
    const kinds = [];
    if (state.sessions.some((s) => sessionState(s, Date.now(), state.activity.get(s.sessionId) ?? null, state.pending.get(s.sessionId)?.kind ?? null) === "working")) kinds.push("sessions");
    if (state.usage?.fiveHour?.pct >= 90) kinds.push("usage-session");
    if (state.usage?.weekly?.pct >= 90) kinds.push("usage-weekly");
    if ((state.usage?.models ?? []).some((m) => m.pct >= 90)) kinds.push("usage-model");
    for (const [k, win] of Object.entries(GAUGE_WINDOW)) {
      if (gaugeMode(state, k, Date.now()) !== "local") continue;
      const agg = k === "usage-model" ? (state.usageMeterModels ?? [])[0] : state.usageMeter?.[win];
      const bud = [...views.values()].find((v) => v.kind === k)?.settings?.budget;
      if (agg && (budgetPct(agg.cost, bud) ?? 0) >= 90) kinds.push(k);
    }
    const freshBlocked = blockedSessions(state.sessions, Date.now(), state.activity, state.pending).some((b) => {
      const since = b.statusUpdatedAt ?? state.pending.get(b.sessionId)?.since ?? null;
      return !since || Date.now() - since < PULSE_MS;
    });
    if (freshBlocked) kinds.push("approver-status", "approver-waiting");
    if (state.approveQueue.length) {
      const dead = expiredIds(state.approveQueue, Date.now(), HOLD_MS());
      if (dead.length) answerAndDrop(dead, "hold expired");
      if (approvableDepth(state.approveQueue)) kinds.push(...APPROVE_KINDS);
    }
    if (kinds.length && [...views.values()].some((v) => kinds.includes(v.kind))) renderAll(kinds);
    const expired = [state.usage?.fiveHour, state.usage?.weekly].some((b) => b?.resetsAt && Date.now() - new Date(b.resetsAt).getTime() > 5e3);
    if (expired && !state.usageErr && Date.now() - lastUsageAttempt > 3e4) pollUsage();
  }, 600);
  setInterval(() => {
    renderAll(["usage-session", "usage-weekly", "usage-model", "burn-rate", "approver-status", "approver-waiting", "focus-session", ...APPROVE_KINDS]);
    if (state.hookErr) ensureHookServer();
  }, 3e4);
}
