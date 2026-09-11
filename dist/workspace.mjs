import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);
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
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
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

// node_modules/events-universal/default.js
var require_default = __commonJS({
  "node_modules/events-universal/default.js"(exports, module) {
    module.exports = __require("events");
  }
});

// node_modules/fast-fifo/fixed-size.js
var require_fixed_size = __commonJS({
  "node_modules/fast-fifo/fixed-size.js"(exports, module) {
    module.exports = class FixedFIFO {
      constructor(hwm) {
        if (!(hwm > 0) || (hwm - 1 & hwm) !== 0) throw new Error("Max size for a FixedFIFO should be a power of two");
        this.buffer = new Array(hwm);
        this.mask = hwm - 1;
        this.top = 0;
        this.btm = 0;
        this.next = null;
      }
      clear() {
        this.top = this.btm = 0;
        this.next = null;
        this.buffer.fill(void 0);
      }
      push(data) {
        if (this.buffer[this.top] !== void 0) return false;
        this.buffer[this.top] = data;
        this.top = this.top + 1 & this.mask;
        return true;
      }
      shift() {
        const last = this.buffer[this.btm];
        if (last === void 0) return void 0;
        this.buffer[this.btm] = void 0;
        this.btm = this.btm + 1 & this.mask;
        return last;
      }
      peek() {
        return this.buffer[this.btm];
      }
      isEmpty() {
        return this.buffer[this.btm] === void 0;
      }
    };
  }
});

// node_modules/fast-fifo/index.js
var require_fast_fifo = __commonJS({
  "node_modules/fast-fifo/index.js"(exports, module) {
    var FixedFIFO = require_fixed_size();
    module.exports = class FastFIFO {
      constructor(hwm) {
        this.hwm = hwm || 16;
        this.head = new FixedFIFO(this.hwm);
        this.tail = this.head;
        this.length = 0;
      }
      clear() {
        this.head = this.tail;
        this.head.clear();
        this.length = 0;
      }
      push(val) {
        this.length++;
        if (!this.head.push(val)) {
          const prev = this.head;
          this.head = prev.next = new FixedFIFO(2 * this.head.buffer.length);
          this.head.push(val);
        }
      }
      shift() {
        if (this.length !== 0) this.length--;
        const val = this.tail.shift();
        if (val === void 0 && this.tail.next) {
          const next = this.tail.next;
          this.tail.next = null;
          this.tail = next;
          return this.tail.shift();
        }
        return val;
      }
      peek() {
        const val = this.tail.peek();
        if (val === void 0 && this.tail.next) return this.tail.next.peek();
        return val;
      }
      isEmpty() {
        return this.length === 0;
      }
    };
  }
});

// node_modules/b4a/index.js
var require_b4a = __commonJS({
  "node_modules/b4a/index.js"(exports, module) {
    function isBuffer(value) {
      return Buffer.isBuffer(value) || value instanceof Uint8Array;
    }
    function isEncoding(encoding) {
      return Buffer.isEncoding(encoding);
    }
    function alloc(size, fill2, encoding) {
      return Buffer.alloc(size, fill2, encoding);
    }
    function allocUnsafe(size) {
      return Buffer.allocUnsafe(size);
    }
    function allocUnsafeSlow(size) {
      return Buffer.allocUnsafeSlow(size);
    }
    function byteLength(string, encoding) {
      return Buffer.byteLength(string, encoding);
    }
    function compare(a, b) {
      return Buffer.compare(a, b);
    }
    function concat(buffers, totalLength) {
      return Buffer.concat(buffers, totalLength);
    }
    function copy(source, target, targetStart, start, end) {
      return toBuffer(source).copy(target, targetStart, start, end);
    }
    function equals(a, b) {
      return toBuffer(a).equals(b);
    }
    function fill(buffer, value, offset, end, encoding) {
      return toBuffer(buffer).fill(value, offset, end, encoding);
    }
    function from(value, encodingOrOffset, length) {
      return Buffer.from(value, encodingOrOffset, length);
    }
    function includes(buffer, value, byteOffset, encoding) {
      return toBuffer(buffer).includes(value, byteOffset, encoding);
    }
    function indexOf(buffer, value, byfeOffset, encoding) {
      return toBuffer(buffer).indexOf(value, byfeOffset, encoding);
    }
    function lastIndexOf(buffer, value, byteOffset, encoding) {
      return toBuffer(buffer).lastIndexOf(value, byteOffset, encoding);
    }
    function swap16(buffer) {
      return toBuffer(buffer).swap16();
    }
    function swap32(buffer) {
      return toBuffer(buffer).swap32();
    }
    function swap64(buffer) {
      return toBuffer(buffer).swap64();
    }
    function toBuffer(buffer) {
      if (Buffer.isBuffer(buffer)) return buffer;
      return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    function toString(buffer, encoding, start, end) {
      return toBuffer(buffer).toString(encoding, start, end);
    }
    function write(buffer, string, offset, length, encoding) {
      return toBuffer(buffer).write(string, offset, length, encoding);
    }
    function readDoubleBE(buffer, offset) {
      return toBuffer(buffer).readDoubleBE(offset);
    }
    function readDoubleLE(buffer, offset) {
      return toBuffer(buffer).readDoubleLE(offset);
    }
    function readFloatBE(buffer, offset) {
      return toBuffer(buffer).readFloatBE(offset);
    }
    function readFloatLE(buffer, offset) {
      return toBuffer(buffer).readFloatLE(offset);
    }
    function readInt32BE(buffer, offset) {
      return toBuffer(buffer).readInt32BE(offset);
    }
    function readInt32LE(buffer, offset) {
      return toBuffer(buffer).readInt32LE(offset);
    }
    function readUInt32BE(buffer, offset) {
      return toBuffer(buffer).readUInt32BE(offset);
    }
    function readUInt32LE(buffer, offset) {
      return toBuffer(buffer).readUInt32LE(offset);
    }
    function writeDoubleBE(buffer, value, offset) {
      return toBuffer(buffer).writeDoubleBE(value, offset);
    }
    function writeDoubleLE(buffer, value, offset) {
      return toBuffer(buffer).writeDoubleLE(value, offset);
    }
    function writeFloatBE(buffer, value, offset) {
      return toBuffer(buffer).writeFloatBE(value, offset);
    }
    function writeFloatLE(buffer, value, offset) {
      return toBuffer(buffer).writeFloatLE(value, offset);
    }
    function writeInt32BE(buffer, value, offset) {
      return toBuffer(buffer).writeInt32BE(value, offset);
    }
    function writeInt32LE(buffer, value, offset) {
      return toBuffer(buffer).writeInt32LE(value, offset);
    }
    function writeUInt32BE(buffer, value, offset) {
      return toBuffer(buffer).writeUInt32BE(value, offset);
    }
    function writeUInt32LE(buffer, value, offset) {
      return toBuffer(buffer).writeUInt32LE(value, offset);
    }
    module.exports = {
      isBuffer,
      isEncoding,
      alloc,
      allocUnsafe,
      allocUnsafeSlow,
      byteLength,
      compare,
      concat,
      copy,
      equals,
      fill,
      from,
      includes,
      indexOf,
      lastIndexOf,
      swap16,
      swap32,
      swap64,
      toBuffer,
      toString,
      write,
      readDoubleBE,
      readDoubleLE,
      readFloatBE,
      readFloatLE,
      readInt32BE,
      readInt32LE,
      readUInt32BE,
      readUInt32LE,
      writeDoubleBE,
      writeDoubleLE,
      writeFloatBE,
      writeFloatLE,
      writeInt32BE,
      writeInt32LE,
      writeUInt32BE,
      writeUInt32LE
    };
  }
});

// node_modules/text-decoder/lib/pass-through-decoder.js
var require_pass_through_decoder = __commonJS({
  "node_modules/text-decoder/lib/pass-through-decoder.js"(exports, module) {
    var b4a = require_b4a();
    module.exports = class PassThroughDecoder {
      constructor(encoding) {
        this.encoding = encoding;
      }
      get remaining() {
        return 0;
      }
      decode(data) {
        return b4a.toString(data, this.encoding);
      }
      flush() {
        return "";
      }
    };
  }
});

// node_modules/text-decoder/lib/utf8-decoder.js
var require_utf8_decoder = __commonJS({
  "node_modules/text-decoder/lib/utf8-decoder.js"(exports, module) {
    var b4a = require_b4a();
    module.exports = class UTF8Decoder {
      constructor() {
        this._reset();
      }
      get remaining() {
        return this.bytesSeen;
      }
      decode(data) {
        if (data.byteLength === 0) return "";
        if (this.bytesNeeded === 0 && trailingIncomplete(data, 0) === 0) {
          this.bytesSeen = trailingBytesSeen(data);
          return b4a.toString(data, "utf8");
        }
        let result = "";
        let start = 0;
        if (this.bytesNeeded > 0) {
          while (start < data.byteLength) {
            const byte = data[start];
            if (byte < this.lowerBoundary || byte > this.upperBoundary) {
              result += "\uFFFD";
              this._reset();
              break;
            }
            this.lowerBoundary = 128;
            this.upperBoundary = 191;
            this.codePoint = this.codePoint << 6 | byte & 63;
            this.bytesSeen++;
            start++;
            if (this.bytesSeen === this.bytesNeeded) {
              result += String.fromCodePoint(this.codePoint);
              this._reset();
              break;
            }
          }
          if (this.bytesNeeded > 0) return result;
        }
        const trailing = trailingIncomplete(data, start);
        const end = data.byteLength - trailing;
        if (end > start) result += b4a.toString(data, "utf8", start, end);
        for (let i = end; i < data.byteLength; i++) {
          const byte = data[i];
          if (this.bytesNeeded === 0) {
            if (byte <= 127) {
              this.bytesSeen = 0;
              result += String.fromCharCode(byte);
            } else if (byte >= 194 && byte <= 223) {
              this.bytesNeeded = 2;
              this.bytesSeen = 1;
              this.codePoint = byte & 31;
            } else if (byte >= 224 && byte <= 239) {
              if (byte === 224) this.lowerBoundary = 160;
              else if (byte === 237) this.upperBoundary = 159;
              this.bytesNeeded = 3;
              this.bytesSeen = 1;
              this.codePoint = byte & 15;
            } else if (byte >= 240 && byte <= 244) {
              if (byte === 240) this.lowerBoundary = 144;
              else if (byte === 244) this.upperBoundary = 143;
              this.bytesNeeded = 4;
              this.bytesSeen = 1;
              this.codePoint = byte & 7;
            } else {
              this.bytesSeen = 1;
              result += "\uFFFD";
            }
            continue;
          }
          if (byte < this.lowerBoundary || byte > this.upperBoundary) {
            result += "\uFFFD";
            i--;
            this._reset();
            continue;
          }
          this.lowerBoundary = 128;
          this.upperBoundary = 191;
          this.codePoint = this.codePoint << 6 | byte & 63;
          this.bytesSeen++;
          if (this.bytesSeen === this.bytesNeeded) {
            result += String.fromCodePoint(this.codePoint);
            this._reset();
          }
        }
        return result;
      }
      flush() {
        const result = this.bytesNeeded > 0 ? "\uFFFD" : "";
        this._reset();
        return result;
      }
      _reset() {
        this.codePoint = 0;
        this.bytesNeeded = 0;
        this.bytesSeen = 0;
        this.lowerBoundary = 128;
        this.upperBoundary = 191;
      }
    };
    function trailingIncomplete(data, start) {
      const len = data.byteLength;
      if (len <= start) return 0;
      const limit = Math.max(start, len - 4);
      let i = len - 1;
      while (i > limit && (data[i] & 192) === 128) i--;
      if (i < start) return 0;
      const byte = data[i];
      let needed;
      if (byte <= 127) return 0;
      if (byte >= 194 && byte <= 223) needed = 2;
      else if (byte >= 224 && byte <= 239) needed = 3;
      else if (byte >= 240 && byte <= 244) needed = 4;
      else return 0;
      const available = len - i;
      return available < needed ? available : 0;
    }
    function trailingBytesSeen(data) {
      const len = data.byteLength;
      if (len === 0) return 0;
      const last = data[len - 1];
      if (last <= 127) return 0;
      if ((last & 192) !== 128) return 1;
      const limit = Math.max(0, len - 4);
      let i = len - 2;
      while (i >= limit && (data[i] & 192) === 128) i--;
      if (i < 0) return 1;
      const first = data[i];
      let needed;
      if (first >= 194 && first <= 223) needed = 2;
      else if (first >= 224 && first <= 239) needed = 3;
      else if (first >= 240 && first <= 244) needed = 4;
      else return 1;
      if (len - i !== needed) return 1;
      if (needed >= 3) {
        const second = data[i + 1];
        if (first === 224 && second < 160) return 1;
        if (first === 237 && second > 159) return 1;
        if (first === 240 && second < 144) return 1;
        if (first === 244 && second > 143) return 1;
      }
      return 0;
    }
  }
});

// node_modules/text-decoder/index.js
var require_text_decoder = __commonJS({
  "node_modules/text-decoder/index.js"(exports, module) {
    var PassThroughDecoder = require_pass_through_decoder();
    var UTF8Decoder = require_utf8_decoder();
    module.exports = class TextDecoder {
      constructor(encoding = "utf8") {
        this.encoding = normalizeEncoding(encoding);
        switch (this.encoding) {
          case "utf8":
            this.decoder = new UTF8Decoder();
            break;
          case "utf16le":
          case "base64":
            throw new Error("Unsupported encoding: " + this.encoding);
          default:
            this.decoder = new PassThroughDecoder(this.encoding);
        }
      }
      get remaining() {
        return this.decoder.remaining;
      }
      push(data) {
        if (typeof data === "string") return data;
        return this.decoder.decode(data);
      }
      // For Node.js compatibility
      write(data) {
        return this.push(data);
      }
      end(data) {
        let result = "";
        if (data) result = this.push(data);
        result += this.decoder.flush();
        return result;
      }
    };
    function normalizeEncoding(encoding) {
      encoding = encoding.toLowerCase();
      switch (encoding) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return encoding;
        default:
          throw new Error("Unknown encoding: " + encoding);
      }
    }
  }
});

// node_modules/streamx/lib/errors.js
var require_errors = __commonJS({
  "node_modules/streamx/lib/errors.js"(exports, module) {
    module.exports = class StreamError extends Error {
      constructor(msg, code, fn = StreamError) {
        super(msg);
        this.code = code;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, fn);
        }
      }
      static isStreamDestroyed(err) {
        return err && err.code === "STREAM_DESTROYED";
      }
      static isPrematureClose(err) {
        return err && err.code === "PREMATURE_CLOSE";
      }
      static isAborted(err) {
        return err && err.code === "ABORTED";
      }
      static isBadArgument(err) {
        return err && err.code === "BAD_ARGUMENT";
      }
      get name() {
        return "StreamError";
      }
      static STREAM_DESTROYED() {
        return new StreamError("Stream was destroyed", "STREAM_DESTROYED", StreamError.STREAM_DESTROYED);
      }
      static PREMATURE_CLOSE(msg = "Premature close") {
        return new StreamError(msg, "PREMATURE_CLOSE", StreamError.PREMATURE_CLOSE);
      }
      static ABORTED() {
        return new StreamError("Stream aborted", "ABORTED", StreamError.ABORTED);
      }
      static BAD_ARGUMENT(msg = "Bad argument") {
        return new StreamError(msg, "BAD_ARGUMENT", StreamError.BAD_ARGUMENT);
      }
    };
  }
});

// node_modules/streamx/index.js
var require_streamx = __commonJS({
  "node_modules/streamx/index.js"(exports, module) {
    var { EventEmitter } = require_default();
    var FIFO = require_fast_fifo();
    var TextDecoder2 = require_text_decoder();
    var StreamError = require_errors();
    var qmt = typeof queueMicrotask === "undefined" ? (fn) => global.process.nextTick(fn) : queueMicrotask;
    var MAX = (1 << 29) - 1;
    var OPENING = 1;
    var PREDESTROYING = 2;
    var DESTROYING = 4;
    var DESTROYED = 8;
    var NOT_OPENING = MAX ^ OPENING;
    var NOT_PREDESTROYING = MAX ^ PREDESTROYING;
    var READ_ACTIVE = 1 << 4;
    var READ_UPDATING = 2 << 4;
    var READ_PRIMARY = 4 << 4;
    var READ_QUEUED = 8 << 4;
    var READ_RESUMED = 16 << 4;
    var READ_PIPE_DRAINED = 32 << 4;
    var READ_ENDING = 64 << 4;
    var READ_EMIT_DATA = 128 << 4;
    var READ_EMIT_READABLE = 256 << 4;
    var READ_EMITTED_READABLE = 512 << 4;
    var READ_DONE = 1024 << 4;
    var READ_NEXT_TICK = 2048 << 4;
    var READ_NEEDS_PUSH = 4096 << 4;
    var READ_READ_AHEAD = 8192 << 4;
    var READ_FLOWING = READ_RESUMED | READ_PIPE_DRAINED;
    var READ_ACTIVE_AND_NEEDS_PUSH = READ_ACTIVE | READ_NEEDS_PUSH;
    var READ_PRIMARY_AND_ACTIVE = READ_PRIMARY | READ_ACTIVE;
    var READ_EMIT_READABLE_AND_QUEUED = READ_EMIT_READABLE | READ_QUEUED;
    var READ_RESUMED_READ_AHEAD = READ_RESUMED | READ_READ_AHEAD;
    var READ_NOT_ACTIVE = MAX ^ READ_ACTIVE;
    var READ_NON_PRIMARY = MAX ^ READ_PRIMARY;
    var READ_NON_PRIMARY_AND_PUSHED = MAX ^ (READ_PRIMARY | READ_NEEDS_PUSH);
    var READ_PUSHED = MAX ^ READ_NEEDS_PUSH;
    var READ_PAUSED = MAX ^ READ_RESUMED;
    var READ_NOT_QUEUED = MAX ^ (READ_QUEUED | READ_EMITTED_READABLE);
    var READ_NOT_ENDING = MAX ^ READ_ENDING;
    var READ_PIPE_NOT_DRAINED = MAX ^ READ_FLOWING;
    var READ_NOT_NEXT_TICK = MAX ^ READ_NEXT_TICK;
    var READ_NOT_UPDATING = MAX ^ READ_UPDATING;
    var READ_NO_READ_AHEAD = MAX ^ READ_READ_AHEAD;
    var READ_PAUSED_NO_READ_AHEAD = MAX ^ READ_RESUMED_READ_AHEAD;
    var WRITE_ACTIVE = 1 << 18;
    var WRITE_UPDATING = 2 << 18;
    var WRITE_PRIMARY = 4 << 18;
    var WRITE_QUEUED = 8 << 18;
    var WRITE_UNDRAINED = 16 << 18;
    var WRITE_DONE = 32 << 18;
    var WRITE_EMIT_DRAIN = 64 << 18;
    var WRITE_NEXT_TICK = 128 << 18;
    var WRITE_WRITING = 256 << 18;
    var WRITE_FINISHING = 512 << 18;
    var WRITE_CORKED = 1024 << 18;
    var WRITE_NOT_ACTIVE = MAX ^ (WRITE_ACTIVE | WRITE_WRITING);
    var WRITE_NON_PRIMARY = MAX ^ WRITE_PRIMARY;
    var WRITE_NOT_FINISHING = MAX ^ (WRITE_ACTIVE | WRITE_FINISHING);
    var WRITE_DRAINED = MAX ^ WRITE_UNDRAINED;
    var WRITE_NOT_QUEUED = MAX ^ WRITE_QUEUED;
    var WRITE_NOT_NEXT_TICK = MAX ^ WRITE_NEXT_TICK;
    var WRITE_NOT_UPDATING = MAX ^ WRITE_UPDATING;
    var WRITE_NOT_CORKED = MAX ^ WRITE_CORKED;
    var ACTIVE = READ_ACTIVE | WRITE_ACTIVE;
    var NOT_ACTIVE = MAX ^ ACTIVE;
    var DONE = READ_DONE | WRITE_DONE;
    var DESTROY_STATUS = DESTROYING | DESTROYED | PREDESTROYING;
    var OPEN_STATUS = DESTROY_STATUS | OPENING;
    var AUTO_DESTROY = DESTROY_STATUS | DONE;
    var NON_PRIMARY = WRITE_NON_PRIMARY & READ_NON_PRIMARY;
    var ACTIVE_OR_TICKING = WRITE_NEXT_TICK | READ_NEXT_TICK;
    var TICKING = ACTIVE_OR_TICKING & NOT_ACTIVE;
    var IS_OPENING = OPEN_STATUS | TICKING;
    var READ_PRIMARY_STATUS = OPEN_STATUS | READ_ENDING | READ_DONE;
    var READ_STATUS = OPEN_STATUS | READ_DONE | READ_QUEUED;
    var READ_ENDING_STATUS = OPEN_STATUS | READ_ENDING | READ_QUEUED;
    var READ_READABLE_STATUS = OPEN_STATUS | READ_EMIT_READABLE | READ_QUEUED | READ_EMITTED_READABLE;
    var SHOULD_NOT_READ = OPEN_STATUS | READ_ACTIVE | READ_ENDING | READ_DONE | READ_NEEDS_PUSH | READ_READ_AHEAD;
    var READ_BACKPRESSURE_STATUS = DESTROY_STATUS | READ_ENDING | READ_DONE;
    var READ_UPDATE_SYNC_STATUS = READ_UPDATING | OPEN_STATUS | READ_NEXT_TICK | READ_PRIMARY;
    var READ_NEXT_TICK_OR_OPENING = READ_NEXT_TICK | OPENING;
    var WRITE_PRIMARY_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_DONE;
    var WRITE_QUEUED_AND_UNDRAINED = WRITE_QUEUED | WRITE_UNDRAINED;
    var WRITE_QUEUED_AND_ACTIVE = WRITE_QUEUED | WRITE_ACTIVE;
    var WRITE_DRAIN_STATUS = WRITE_QUEUED | WRITE_UNDRAINED | OPEN_STATUS | WRITE_ACTIVE;
    var WRITE_STATUS = OPEN_STATUS | WRITE_ACTIVE | WRITE_QUEUED | WRITE_CORKED;
    var WRITE_PRIMARY_AND_ACTIVE = WRITE_PRIMARY | WRITE_ACTIVE;
    var WRITE_ACTIVE_AND_WRITING = WRITE_ACTIVE | WRITE_WRITING;
    var WRITE_FINISHING_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_QUEUED_AND_ACTIVE | WRITE_DONE;
    var WRITE_BACKPRESSURE_STATUS = WRITE_UNDRAINED | DESTROY_STATUS | WRITE_FINISHING | WRITE_DONE;
    var WRITE_UPDATE_SYNC_STATUS = WRITE_UPDATING | OPEN_STATUS | WRITE_NEXT_TICK | WRITE_PRIMARY;
    var WRITE_DROP_DATA = WRITE_FINISHING | WRITE_DONE | DESTROY_STATUS;
    var asyncIterator = Symbol.asyncIterator || /* @__PURE__ */ Symbol("asyncIterator");
    var WritableState = class {
      constructor(stream, { highWaterMark = 16384, map = null, mapWritable, byteLength, byteLengthWritable } = {}) {
        this.stream = stream;
        this.queue = new FIFO();
        this.highWaterMark = highWaterMark;
        this.buffered = 0;
        this.error = null;
        this.pipeline = null;
        this.drains = null;
        this.byteLength = byteLengthWritable || byteLength || defaultByteLength;
        this.map = mapWritable || map;
        this.afterWrite = afterWrite.bind(this);
        this.afterUpdateNextTick = updateWriteNT.bind(this);
      }
      get ending() {
        return (this.stream._duplexState & WRITE_FINISHING) !== 0;
      }
      get ended() {
        return (this.stream._duplexState & WRITE_DONE) !== 0;
      }
      push(data) {
        if ((this.stream._duplexState & WRITE_DROP_DATA) !== 0) return false;
        if (this.map !== null) data = this.map(data);
        this.buffered += this.byteLength(data);
        this.queue.push(data);
        if (this.buffered < this.highWaterMark) {
          this.stream._duplexState |= WRITE_QUEUED;
          return true;
        }
        this.stream._duplexState |= WRITE_QUEUED_AND_UNDRAINED;
        return false;
      }
      shift() {
        const data = this.queue.shift();
        this.buffered -= this.byteLength(data);
        if (this.buffered === 0) this.stream._duplexState &= WRITE_NOT_QUEUED;
        return data;
      }
      end(data) {
        if (typeof data === "function") {
          this.stream.once("finish", data);
        } else if (data !== void 0 && data !== null) {
          this.push(data);
        }
        this.stream._duplexState = (this.stream._duplexState | WRITE_FINISHING) & WRITE_NON_PRIMARY;
      }
      autoBatch(data, cb) {
        const buffer = [];
        const stream = this.stream;
        buffer.push(data);
        while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED_AND_ACTIVE) {
          buffer.push(stream._writableState.shift());
        }
        if ((stream._duplexState & OPEN_STATUS) !== 0) return cb(null);
        stream._writev(buffer, cb);
      }
      update() {
        const stream = this.stream;
        stream._duplexState |= WRITE_UPDATING;
        do {
          while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED) {
            const data = this.shift();
            stream._duplexState |= WRITE_ACTIVE_AND_WRITING;
            stream._write(data, this.afterWrite);
          }
          if ((stream._duplexState & WRITE_PRIMARY_AND_ACTIVE) === 0) this.updateNonPrimary();
        } while (this.continueUpdate() === true);
        stream._duplexState &= WRITE_NOT_UPDATING;
      }
      updateNonPrimary() {
        const stream = this.stream;
        if ((stream._duplexState & WRITE_FINISHING_STATUS) === WRITE_FINISHING) {
          stream._duplexState = stream._duplexState | WRITE_ACTIVE;
          stream._final(afterFinal.bind(this));
          return;
        }
        if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
          if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
            stream._duplexState |= ACTIVE;
            stream._destroy(afterDestroy.bind(this));
          }
          return;
        }
        if ((stream._duplexState & IS_OPENING) === OPENING) {
          stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
          stream._open(afterOpen.bind(this));
        }
      }
      continueUpdate() {
        if ((this.stream._duplexState & WRITE_NEXT_TICK) === 0) return false;
        this.stream._duplexState &= WRITE_NOT_NEXT_TICK;
        return true;
      }
      updateCallback() {
        if ((this.stream._duplexState & WRITE_UPDATE_SYNC_STATUS) === WRITE_PRIMARY) {
          this.update();
        } else {
          this.updateNextTick();
        }
      }
      updateNextTick() {
        if ((this.stream._duplexState & WRITE_NEXT_TICK) !== 0) return;
        this.stream._duplexState |= WRITE_NEXT_TICK;
        if ((this.stream._duplexState & WRITE_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
    };
    var ReadableState = class {
      constructor(stream, { highWaterMark = 16384, map = null, mapReadable, byteLength, byteLengthReadable } = {}) {
        this.stream = stream;
        this.queue = new FIFO();
        this.highWaterMark = highWaterMark === 0 ? 1 : highWaterMark;
        this.buffered = 0;
        this.readAhead = highWaterMark > 0;
        this.error = null;
        this.pipeline = null;
        this.byteLength = byteLengthReadable || byteLength || defaultByteLength;
        this.map = mapReadable || map;
        this.pipeTo = null;
        this.afterRead = afterRead.bind(this);
        this.afterUpdateNextTick = updateReadNT.bind(this);
      }
      get ending() {
        return (this.stream._duplexState & READ_ENDING) !== 0;
      }
      get ended() {
        return (this.stream._duplexState & READ_DONE) !== 0;
      }
      pipe(pipeTo, cb) {
        if (this.pipeTo !== null) throw StreamError.BAD_ARGUMENT("Can only pipe to one destination");
        if (typeof cb !== "function") cb = null;
        this.stream._duplexState |= READ_PIPE_DRAINED;
        this.pipeTo = pipeTo;
        this.pipeline = new Pipeline(this.stream, pipeTo, cb);
        if (cb) this.stream.on("error", noop);
        if (isStreamx(pipeTo)) {
          pipeTo._writableState.pipeline = this.pipeline;
          if (cb) pipeTo.on("error", noop);
          pipeTo.on("finish", this.pipeline.finished.bind(this.pipeline));
        } else {
          const onerror = this.pipeline.done.bind(this.pipeline, pipeTo);
          const onclose = this.pipeline.done.bind(this.pipeline, pipeTo, null);
          pipeTo.on("error", onerror);
          pipeTo.on("close", onclose);
          pipeTo.on("finish", this.pipeline.finished.bind(this.pipeline));
        }
        pipeTo.on("drain", afterDrain.bind(this));
        this.stream.emit("piping", pipeTo);
        pipeTo.emit("pipe", this.stream);
      }
      push(data) {
        const stream = this.stream;
        if (data === null) {
          this.highWaterMark = 0;
          stream._duplexState = (stream._duplexState | READ_ENDING) & READ_NON_PRIMARY_AND_PUSHED;
          return false;
        }
        if (this.map !== null) {
          data = this.map(data);
          if (data === null) {
            stream._duplexState &= READ_PUSHED;
            return this.buffered < this.highWaterMark;
          }
        }
        this.buffered += this.byteLength(data);
        this.queue.push(data);
        stream._duplexState = (stream._duplexState | READ_QUEUED) & READ_PUSHED;
        return this.buffered < this.highWaterMark;
      }
      shift() {
        const data = this.queue.shift();
        this.buffered -= this.byteLength(data);
        if (this.buffered === 0) {
          this.stream._duplexState &= READ_NOT_QUEUED;
        }
        return data;
      }
      unshift(data) {
        const pending = [this.map !== null ? this.map(data) : data];
        while (this.buffered > 0) pending.push(this.shift());
        for (let i = 0; i < pending.length - 1; i++) {
          const data2 = pending[i];
          this.buffered += this.byteLength(data2);
          this.queue.push(data2);
        }
        this.push(pending[pending.length - 1]);
      }
      read() {
        const stream = this.stream;
        if ((stream._duplexState & READ_STATUS) === READ_QUEUED) {
          const data = this.shift();
          if (this.pipeTo !== null && this.pipeTo.write(data) === false) {
            stream._duplexState &= READ_PIPE_NOT_DRAINED;
          }
          if ((stream._duplexState & READ_EMIT_DATA) !== 0) {
            stream.emit("data", data);
          }
          return data;
        }
        if (this.readAhead === false) {
          stream._duplexState |= READ_READ_AHEAD;
          this.updateNextTick();
        }
        return null;
      }
      drain() {
        const stream = this.stream;
        while ((stream._duplexState & READ_STATUS) === READ_QUEUED && (stream._duplexState & READ_FLOWING) !== 0) {
          const data = this.shift();
          if (this.pipeTo !== null && this.pipeTo.write(data) === false) {
            stream._duplexState &= READ_PIPE_NOT_DRAINED;
          }
          if ((stream._duplexState & READ_EMIT_DATA) !== 0) {
            stream.emit("data", data);
          }
        }
      }
      update() {
        const stream = this.stream;
        stream._duplexState |= READ_UPDATING;
        do {
          this.drain();
          while (this.buffered < this.highWaterMark && (stream._duplexState & SHOULD_NOT_READ) === READ_READ_AHEAD) {
            stream._duplexState |= READ_ACTIVE_AND_NEEDS_PUSH;
            stream._read(this.afterRead);
            this.drain();
          }
          if ((stream._duplexState & READ_READABLE_STATUS) === READ_EMIT_READABLE_AND_QUEUED) {
            stream._duplexState |= READ_EMITTED_READABLE;
            stream.emit("readable");
          }
          if ((stream._duplexState & READ_PRIMARY_AND_ACTIVE) === 0) {
            this.updateNonPrimary();
          }
        } while (this.continueUpdate() === true);
        stream._duplexState &= READ_NOT_UPDATING;
      }
      updateNonPrimary() {
        const stream = this.stream;
        if ((stream._duplexState & READ_ENDING_STATUS) === READ_ENDING) {
          stream._duplexState = (stream._duplexState | READ_DONE) & READ_NOT_ENDING;
          stream.emit("end");
          if ((stream._duplexState & AUTO_DESTROY) === DONE) {
            stream._duplexState |= DESTROYING;
          }
          if (this.pipeTo !== null) {
            this.pipeTo.end();
          }
        }
        if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
          if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
            stream._duplexState |= ACTIVE;
            stream._destroy(afterDestroy.bind(this));
          }
          return;
        }
        if ((stream._duplexState & IS_OPENING) === OPENING) {
          stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
          stream._open(afterOpen.bind(this));
        }
      }
      continueUpdate() {
        if ((this.stream._duplexState & READ_NEXT_TICK) === 0) return false;
        this.stream._duplexState &= READ_NOT_NEXT_TICK;
        return true;
      }
      updateCallback() {
        if ((this.stream._duplexState & READ_UPDATE_SYNC_STATUS) === READ_PRIMARY) {
          this.update();
        } else {
          this.updateNextTick();
        }
      }
      updateNextTickIfOpen() {
        if ((this.stream._duplexState & READ_NEXT_TICK_OR_OPENING) !== 0) return;
        this.stream._duplexState |= READ_NEXT_TICK;
        if ((this.stream._duplexState & READ_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
      updateNextTick() {
        if ((this.stream._duplexState & READ_NEXT_TICK) !== 0) return;
        this.stream._duplexState |= READ_NEXT_TICK;
        if ((this.stream._duplexState & READ_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
    };
    var TransformState = class {
      constructor(stream) {
        this.data = null;
        this.afterTransform = afterTransform.bind(stream);
        this.afterFinal = null;
      }
    };
    var Pipeline = class {
      constructor(src, dst, cb) {
        this.from = src;
        this.to = dst;
        this.afterPipe = cb;
        this.error = null;
        this.pipeToFinished = false;
      }
      finished() {
        this.pipeToFinished = true;
      }
      done(stream, err) {
        if (err) this.error = err;
        if (stream === this.to) {
          this.to = null;
          if (this.from !== null) {
            if ((this.from._duplexState & READ_DONE) === 0 || !this.pipeToFinished) {
              this.from.destroy(this.error || StreamError.PREMATURE_CLOSE("Writable stream closed"));
            }
            return;
          }
        }
        if (stream === this.from) {
          this.from = null;
          if (this.to !== null) {
            if ((stream._duplexState & READ_DONE) === 0) {
              this.to.destroy(this.error || StreamError.PREMATURE_CLOSE("Readable stream closed"));
            }
            return;
          }
        }
        if (this.afterPipe !== null) this.afterPipe(this.error);
        this.to = this.from = this.afterPipe = null;
      }
    };
    function afterDrain() {
      this.stream._duplexState |= READ_PIPE_DRAINED;
      this.updateCallback();
    }
    function afterFinal(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      if ((stream._duplexState & DESTROY_STATUS) === 0) {
        stream._duplexState |= WRITE_DONE;
        stream.emit("finish");
      }
      if ((stream._duplexState & AUTO_DESTROY) === DONE) {
        stream._duplexState |= DESTROYING;
      }
      stream._duplexState &= WRITE_NOT_FINISHING;
      if ((stream._duplexState & WRITE_UPDATING) === 0) {
        this.update();
      } else {
        this.updateNextTick();
      }
    }
    function afterDestroy(err) {
      const stream = this.stream;
      if (!err && !StreamError.isStreamDestroyed(this.error)) err = this.error;
      if (err) stream.emit("error", err);
      stream._duplexState |= DESTROYED;
      stream.emit("close");
      const rs = stream._readableState;
      const ws = stream._writableState;
      if (rs !== null && rs.pipeline !== null) {
        rs.pipeline.done(stream, err);
      }
      if (ws !== null) {
        while (ws.drains !== null && ws.drains.length > 0) {
          ws.drains.shift().resolve(false);
        }
        if (ws.pipeline !== null) {
          ws.pipeline.done(stream, err);
        }
      }
    }
    function afterWrite(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      stream._duplexState &= WRITE_NOT_ACTIVE;
      if (this.drains !== null) tickDrains(this.drains);
      if ((stream._duplexState & WRITE_DRAIN_STATUS) === WRITE_UNDRAINED) {
        stream._duplexState &= WRITE_DRAINED;
        if ((stream._duplexState & WRITE_EMIT_DRAIN) === WRITE_EMIT_DRAIN) {
          stream.emit("drain");
        }
      }
      this.updateCallback();
    }
    function afterRead(err) {
      if (err) this.stream.destroy(err);
      this.stream._duplexState &= READ_NOT_ACTIVE;
      if (this.readAhead === false && (this.stream._duplexState & READ_RESUMED) === 0) {
        this.stream._duplexState &= READ_NO_READ_AHEAD;
      }
      this.updateCallback();
    }
    function updateReadNT() {
      if ((this.stream._duplexState & READ_UPDATING) === 0) {
        this.stream._duplexState &= READ_NOT_NEXT_TICK;
        this.update();
      }
    }
    function updateWriteNT() {
      if ((this.stream._duplexState & WRITE_UPDATING) === 0) {
        this.stream._duplexState &= WRITE_NOT_NEXT_TICK;
        this.update();
      }
    }
    function tickDrains(drains) {
      for (let i = 0; i < drains.length; i++) {
        if (--drains[i].writes === 0) {
          drains.shift().resolve(true);
          i--;
        }
      }
    }
    function afterOpen(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      if ((stream._duplexState & DESTROYING) === 0) {
        if ((stream._duplexState & READ_PRIMARY_STATUS) === 0) {
          stream._duplexState |= READ_PRIMARY;
        }
        if ((stream._duplexState & WRITE_PRIMARY_STATUS) === 0) {
          stream._duplexState |= WRITE_PRIMARY;
        }
        stream.emit("open");
      }
      stream._duplexState &= NOT_ACTIVE;
      if (stream._writableState !== null) {
        stream._writableState.updateCallback();
      }
      if (stream._readableState !== null) {
        stream._readableState.updateCallback();
      }
    }
    function afterTransform(err, data) {
      if (data !== void 0 && data !== null) this.push(data);
      this._writableState.afterWrite(err);
    }
    function newListener(name) {
      if (this._readableState !== null) {
        if (name === "data") {
          this._duplexState |= READ_EMIT_DATA | READ_RESUMED_READ_AHEAD;
          this._readableState.updateNextTick();
        }
        if (name === "readable") {
          this._duplexState |= READ_EMIT_READABLE;
          this._readableState.updateNextTick();
        }
      }
      if (this._writableState !== null) {
        if (name === "drain") {
          this._duplexState |= WRITE_EMIT_DRAIN;
          this._writableState.updateNextTick();
        }
      }
    }
    var Stream = class extends EventEmitter {
      constructor(opts) {
        super();
        this._duplexState = 0;
        this._readableState = null;
        this._writableState = null;
        if (opts) {
          if (opts.open) this._open = opts.open;
          if (opts.destroy) this._destroy = opts.destroy;
          if (opts.predestroy) this._predestroy = opts.predestroy;
          if (opts.signal) opts.signal.addEventListener("abort", abort.bind(this));
        }
        this.on("newListener", newListener);
      }
      _open(cb) {
        cb(null);
      }
      _destroy(cb) {
        cb(null);
      }
      _predestroy() {
      }
      get readable() {
        return this._readableState !== null ? true : void 0;
      }
      get writable() {
        return this._writableState !== null ? true : void 0;
      }
      get destroyed() {
        return (this._duplexState & DESTROYED) !== 0;
      }
      get destroying() {
        return (this._duplexState & DESTROY_STATUS) !== 0;
      }
      destroy(err) {
        if ((this._duplexState & DESTROY_STATUS) === 0) {
          if (!err) err = StreamError.STREAM_DESTROYED();
          this._duplexState = (this._duplexState | DESTROYING) & NON_PRIMARY;
          if (this._readableState !== null) {
            this._readableState.highWaterMark = 0;
            this._readableState.error = err;
          }
          if (this._writableState !== null) {
            this._writableState.highWaterMark = 0;
            this._writableState.error = err;
          }
          this._duplexState |= PREDESTROYING;
          this._predestroy();
          this._duplexState &= NOT_PREDESTROYING;
          if (this._readableState !== null) {
            this._readableState.updateNextTick();
          }
          if (this._writableState !== null) {
            this._writableState.updateNextTick();
          }
        }
      }
    };
    var Readable = class _Readable extends Stream {
      constructor(opts) {
        super(opts);
        this._duplexState |= OPENING | WRITE_DONE | READ_READ_AHEAD;
        this._readableState = new ReadableState(this, opts);
        if (opts) {
          if (this._readableState.readAhead === false) this._duplexState &= READ_NO_READ_AHEAD;
          if (opts.read) this._read = opts.read;
          if (opts.eagerOpen) this._readableState.updateNextTick();
          if (opts.encoding) this.setEncoding(opts.encoding);
        }
      }
      static deferred(fn, opts) {
        const out = new PassThrough(opts);
        fn().then((src) => {
          if (src === null) return out.end();
          if (out.destroying) return;
          pipeline(src, out, noop);
        }).catch((err) => out.destroy(err));
        return out;
      }
      setEncoding(encoding) {
        const dec = new TextDecoder2(encoding);
        const map = this._readableState.map || echo;
        this._readableState.map = mapOrSkip;
        return this;
        function mapOrSkip(data) {
          const next = dec.push(data);
          return next === "" && (data.byteLength !== 0 || dec.remaining > 0) ? null : map(next);
        }
      }
      _read(cb) {
        cb(null);
      }
      pipe(dest, cb) {
        this._readableState.updateNextTick();
        this._readableState.pipe(dest, cb);
        return dest;
      }
      read() {
        this._readableState.updateNextTick();
        return this._readableState.read();
      }
      push(data) {
        this._readableState.updateNextTickIfOpen();
        return this._readableState.push(data);
      }
      unshift(data) {
        this._readableState.updateNextTickIfOpen();
        return this._readableState.unshift(data);
      }
      resume() {
        this._duplexState |= READ_RESUMED_READ_AHEAD;
        this._readableState.updateNextTick();
        return this;
      }
      pause() {
        this._duplexState &= this._readableState.readAhead === false ? READ_PAUSED_NO_READ_AHEAD : READ_PAUSED;
        return this;
      }
      static _fromAsyncIterator(ite, opts) {
        let destroy;
        const rs = new _Readable({
          ...opts,
          read(cb) {
            ite.next().then(push).then(cb.bind(null, null)).catch(cb);
          },
          predestroy() {
            destroy = ite.return();
          },
          destroy(cb) {
            if (!destroy) return cb(null);
            destroy.then(cb.bind(null, null)).catch(cb);
          }
        });
        return rs;
        function push(data) {
          if (data.done) rs.push(null);
          else rs.push(data.value);
        }
      }
      static from(data, opts) {
        if (isReadStreamx(data)) return data;
        if (data[asyncIterator]) return this._fromAsyncIterator(data[asyncIterator](), opts);
        if (!Array.isArray(data)) data = data === void 0 ? [] : [data];
        let i = 0;
        return new _Readable({
          ...opts,
          read(cb) {
            this.push(i === data.length ? null : data[i++]);
            cb(null);
          }
        });
      }
      static isBackpressured(rs) {
        return (rs._duplexState & READ_BACKPRESSURE_STATUS) !== 0 || rs._readableState.buffered >= rs._readableState.highWaterMark;
      }
      static isPaused(rs) {
        return (rs._duplexState & READ_RESUMED) === 0;
      }
      [asyncIterator]() {
        const stream = this;
        let error = null;
        let promiseResolve = null;
        let promiseReject = null;
        this.on("error", (err) => {
          error = err;
        });
        this.on("readable", onreadable);
        this.on("close", onclose);
        return {
          [asyncIterator]() {
            return this;
          },
          next() {
            return new Promise(function(resolve5, reject) {
              promiseResolve = resolve5;
              promiseReject = reject;
              const data = stream.read();
              if (data !== null) ondata(data);
              else if ((stream._duplexState & DESTROYED) !== 0) ondata(null);
            });
          },
          return() {
            return destroy(null);
          },
          throw(err) {
            return destroy(err);
          }
        };
        function onreadable() {
          if (promiseResolve !== null) ondata(stream.read());
        }
        function onclose() {
          if (promiseResolve !== null) ondata(null);
        }
        function ondata(data) {
          if (promiseReject === null) return;
          if (error) {
            promiseReject(error);
          } else if (data === null && (stream._duplexState & READ_DONE) === 0) {
            promiseReject(StreamError.STREAM_DESTROYED());
          } else {
            promiseResolve({ value: data, done: data === null });
          }
          promiseReject = promiseResolve = null;
        }
        function destroy(err) {
          stream.destroy(err);
          return new Promise((resolve5, reject) => {
            if (stream._duplexState & DESTROYED) return resolve5({ value: void 0, done: true });
            stream.once("close", function() {
              if (err) reject(err);
              else resolve5({ value: void 0, done: true });
            });
          });
        }
      }
    };
    var Writable = class extends Stream {
      constructor(opts) {
        super(opts);
        this._duplexState |= OPENING | READ_DONE;
        this._writableState = new WritableState(this, opts);
        if (opts) {
          if (opts.writev) this._writev = opts.writev;
          if (opts.write) this._write = opts.write;
          if (opts.final) this._final = opts.final;
          if (opts.eagerOpen) this._writableState.updateNextTick();
        }
      }
      cork() {
        this._duplexState |= WRITE_CORKED;
      }
      uncork() {
        this._duplexState &= WRITE_NOT_CORKED;
        this._writableState.updateNextTick();
      }
      _writev(batch, cb) {
        cb(null);
      }
      _write(data, cb) {
        this._writableState.autoBatch(data, cb);
      }
      _final(cb) {
        cb(null);
      }
      static isBackpressured(ws) {
        return (ws._duplexState & WRITE_BACKPRESSURE_STATUS) !== 0;
      }
      static drained(ws) {
        if (ws.destroyed) return Promise.resolve(false);
        const state = ws._writableState;
        const pending = isWritev(ws) ? Math.min(1, state.queue.length) : state.queue.length;
        const writes = pending + (ws._duplexState & WRITE_WRITING ? 1 : 0);
        if (writes === 0) return Promise.resolve(true);
        if (state.drains === null) state.drains = [];
        return new Promise((resolve5) => {
          state.drains.push({ writes, resolve: resolve5 });
        });
      }
      write(data) {
        this._writableState.updateNextTick();
        return this._writableState.push(data);
      }
      end(data) {
        this._writableState.updateNextTick();
        this._writableState.end(data);
        return this;
      }
    };
    var Duplex = class extends Readable {
      // and Writable
      constructor(opts) {
        super(opts);
        this._duplexState = OPENING | this._duplexState & READ_READ_AHEAD;
        this._writableState = new WritableState(this, opts);
        if (opts) {
          if (opts.writev) this._writev = opts.writev;
          if (opts.write) this._write = opts.write;
          if (opts.final) this._final = opts.final;
        }
      }
      cork() {
        this._duplexState |= WRITE_CORKED;
      }
      uncork() {
        this._duplexState &= WRITE_NOT_CORKED;
        this._writableState.updateNextTick();
      }
      _writev(batch, cb) {
        cb(null);
      }
      _write(data, cb) {
        this._writableState.autoBatch(data, cb);
      }
      _final(cb) {
        cb(null);
      }
      write(data) {
        this._writableState.updateNextTick();
        return this._writableState.push(data);
      }
      end(data) {
        this._writableState.updateNextTick();
        this._writableState.end(data);
        return this;
      }
    };
    var Transform = class extends Duplex {
      constructor(opts) {
        super(opts);
        this._transformState = new TransformState(this);
        if (opts) {
          if (opts.transform) this._transform = opts.transform;
          if (opts.flush) this._flush = opts.flush;
        }
      }
      _write(data, cb) {
        if (this._readableState.buffered >= this._readableState.highWaterMark) {
          this._transformState.data = data;
        } else {
          this._transform(data, this._transformState.afterTransform);
        }
      }
      _read(cb) {
        if (this._transformState.data !== null) {
          const data = this._transformState.data;
          this._transformState.data = null;
          cb(null);
          this._transform(data, this._transformState.afterTransform);
        } else {
          cb(null);
        }
      }
      destroy(err) {
        super.destroy(err);
        if (this._transformState.data !== null) {
          this._transformState.data = null;
          this._transformState.afterTransform();
        }
      }
      _transform(data, cb) {
        cb(null, data);
      }
      _flush(cb) {
        cb(null);
      }
      _final(cb) {
        this._transformState.afterFinal = cb;
        this._flush(transformAfterFlush.bind(this));
      }
    };
    var PassThrough = class extends Transform {
    };
    function transformAfterFlush(err, data) {
      const cb = this._transformState.afterFinal;
      if (err) return cb(err);
      if (data !== null && data !== void 0) this.push(data);
      this.push(null);
      cb(null);
    }
    function pipelinePromise(...streams) {
      return new Promise((resolve5, reject) => {
        return pipeline(...streams, (err) => {
          if (err) return reject(err);
          resolve5();
        });
      });
    }
    function pipeline(stream, ...streams) {
      const all = Array.isArray(stream) ? [...stream, ...streams] : [stream, ...streams];
      const done = all.length && typeof all[all.length - 1] === "function" ? all.pop() : null;
      if (all.length < 2) throw StreamError.BAD_ARGUMENT("Pipeline requires at least 2 streams");
      let src = all[0];
      let dest = null;
      let error = null;
      for (let i = 1; i < all.length; i++) {
        dest = all[i];
        if (isStreamx(src)) {
          src.pipe(dest, onerror);
        } else {
          errorHandle(src, true, i > 1, onerror);
          src.pipe(dest);
        }
        src = dest;
      }
      if (done) {
        let fin = false;
        const autoDestroy = isStreamx(dest) || !!(dest._writableState && dest._writableState.autoDestroy);
        dest.on("error", (err) => {
          if (error === null) error = err;
        });
        dest.on("finish", () => {
          fin = true;
          if (!autoDestroy) done(error);
        });
        if (autoDestroy) {
          dest.on("close", () => done(error || (fin ? null : StreamError.PREMATURE_CLOSE())));
        }
      }
      return dest;
      function errorHandle(s, rd, wr, onerror2) {
        s.on("error", onerror2);
        s.on("close", onclose);
        function onclose() {
          if (rd && s._readableState && !s._readableState.ended) {
            return onerror2(StreamError.PREMATURE_CLOSE());
          }
          if (wr && s._writableState && !s._writableState.ended) {
            return onerror2(StreamError.PREMATURE_CLOSE());
          }
        }
      }
      function onerror(err) {
        if (!err || error) return;
        error = err;
        for (const s of all) {
          s.destroy(err);
        }
      }
    }
    function echo(s) {
      return s;
    }
    function isStream(stream) {
      return !!stream._readableState || !!stream._writableState;
    }
    function isStreamx(stream) {
      return typeof stream._duplexState === "number" && isStream(stream);
    }
    function isEnding(stream) {
      return !!stream._readableState && stream._readableState.ending;
    }
    function isEnded(stream) {
      return !!stream._readableState && stream._readableState.ended;
    }
    function isFinishing(stream) {
      return !!stream._writableState && stream._writableState.ending;
    }
    function isFinished(stream) {
      return !!stream._writableState && stream._writableState.ended;
    }
    function getStreamError(stream, opts = {}) {
      const err = stream._readableState && stream._readableState.error || stream._writableState && stream._writableState.error;
      return !opts.all && StreamError.isStreamDestroyed(err) ? null : err;
    }
    function isReadStreamx(stream) {
      return isStreamx(stream) && stream.readable;
    }
    function isDisturbed(stream) {
      return (stream._duplexState & OPENING) !== OPENING || (stream._duplexState & DESTROYING) === DESTROYING || (stream._duplexState & ACTIVE_OR_TICKING) !== 0;
    }
    function isTypedArray(data) {
      return typeof data === "object" && data !== null && typeof data.byteLength === "number";
    }
    function defaultByteLength(data) {
      return isTypedArray(data) ? data.byteLength : 1024;
    }
    function noop() {
    }
    function abort() {
      this.destroy(StreamError.ABORTED());
    }
    function isWritev(s) {
      return s._writev !== Writable.prototype._writev && s._writev !== Duplex.prototype._writev;
    }
    module.exports = {
      pipeline,
      pipelinePromise,
      isStream,
      isStreamx,
      isEnding,
      isEnded,
      isFinishing,
      isFinished,
      isDisturbed,
      getStreamError,
      Stream,
      Writable,
      Readable,
      Duplex,
      Transform,
      // Export PassThrough for compatibility with Node.js core's stream module
      PassThrough
    };
  }
});

// node_modules/tar-stream/headers.js
var require_headers = __commonJS({
  "node_modules/tar-stream/headers.js"(exports) {
    var b4a = require_b4a();
    var ZEROS = "0000000000000000000";
    var SEVENS = "7777777777777777777";
    var ZERO_OFFSET = "0".charCodeAt(0);
    var USTAR_MAGIC = b4a.from([117, 115, 116, 97, 114, 0]);
    var USTAR_VER = b4a.from([ZERO_OFFSET, ZERO_OFFSET]);
    var GNU_MAGIC = b4a.from([117, 115, 116, 97, 114, 32]);
    var GNU_VER = b4a.from([32, 0]);
    var MASK = 4095;
    var MAGIC_OFFSET = 257;
    var VERSION_OFFSET = 263;
    exports.decodeLongPath = function decodeLongPath(buf, encoding) {
      return decodeStr(buf, 0, buf.length, encoding);
    };
    exports.encodePax = function encodePax(opts) {
      let result = "";
      if (opts.name) result += addLength(" path=" + opts.name + "\n");
      if (opts.linkname) result += addLength(" linkpath=" + opts.linkname + "\n");
      const pax = opts.pax;
      if (pax) {
        for (const key in pax) {
          result += addLength(" " + key + "=" + pax[key] + "\n");
        }
      }
      return b4a.from(result);
    };
    exports.decodePax = function decodePax(buf) {
      const result = {};
      while (buf.length) {
        let i = 0;
        while (i < buf.length && buf[i] !== 32) i++;
        const len = parseInt(b4a.toString(buf.subarray(0, i)), 10);
        if (!len) return result;
        const b = b4a.toString(buf.subarray(i + 1, len - 1));
        const keyIndex = b.indexOf("=");
        if (keyIndex === -1) return result;
        result[b.slice(0, keyIndex)] = b.slice(keyIndex + 1);
        buf = buf.subarray(len);
      }
      return result;
    };
    exports.encode = function encode(opts) {
      const buf = b4a.alloc(512);
      let name = opts.name;
      let prefix = "";
      if (opts.typeflag === 5 && name[name.length - 1] !== "/") name += "/";
      if (b4a.byteLength(name) !== name.length) return null;
      while (b4a.byteLength(name) > 100) {
        const i = name.indexOf("/");
        if (i === -1) return null;
        prefix += prefix ? "/" + name.slice(0, i) : name.slice(0, i);
        name = name.slice(i + 1);
      }
      if (b4a.byteLength(name) > 100 || b4a.byteLength(prefix) > 155) return null;
      if (opts.linkname && b4a.byteLength(opts.linkname) > 100) return null;
      b4a.write(buf, name);
      b4a.write(buf, encodeOct(opts.mode & MASK, 6), 100);
      b4a.write(buf, encodeOct(opts.uid, 6), 108);
      b4a.write(buf, encodeOct(opts.gid, 6), 116);
      encodeSize(opts.size, buf, 124);
      b4a.write(buf, encodeOct(opts.mtime.getTime() / 1e3 | 0, 11), 136);
      buf[156] = ZERO_OFFSET + toTypeflag(opts.type);
      if (opts.linkname) b4a.write(buf, opts.linkname, 157);
      b4a.copy(USTAR_MAGIC, buf, MAGIC_OFFSET);
      b4a.copy(USTAR_VER, buf, VERSION_OFFSET);
      if (opts.uname) b4a.write(buf, opts.uname, 265);
      if (opts.gname) b4a.write(buf, opts.gname, 297);
      b4a.write(buf, encodeOct(opts.devmajor || 0, 6), 329);
      b4a.write(buf, encodeOct(opts.devminor || 0, 6), 337);
      if (prefix) b4a.write(buf, prefix, 345);
      b4a.write(buf, encodeOct(cksum(buf), 6), 148);
      return buf;
    };
    exports.decode = function decode(buf, filenameEncoding, allowUnknownFormat) {
      let typeflag = buf[156] === 0 ? 0 : buf[156] - ZERO_OFFSET;
      let name = decodeStr(buf, 0, 100, filenameEncoding);
      const mode = decodeOct(buf, 100, 8);
      const uid = decodeOct(buf, 108, 8);
      const gid = decodeOct(buf, 116, 8);
      const size = decodeOct(buf, 124, 12);
      const mtime = decodeOct(buf, 136, 12);
      const type = toType(typeflag);
      const linkname = buf[157] === 0 ? null : decodeStr(buf, 157, 100, filenameEncoding);
      const uname = decodeStr(buf, 265, 32);
      const gname = decodeStr(buf, 297, 32);
      const devmajor = decodeOct(buf, 329, 8);
      const devminor = decodeOct(buf, 337, 8);
      const c = cksum(buf);
      if (c === 8 * 32) return null;
      if (c !== decodeOct(buf, 148, 8)) throw new Error("Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?");
      if (isUSTAR(buf)) {
        if (buf[345]) name = decodeStr(buf, 345, 155, filenameEncoding) + "/" + name;
      } else if (isGNU(buf)) {
      } else {
        if (!allowUnknownFormat) {
          throw new Error("Invalid tar header: unknown format.");
        }
      }
      if (typeflag === 0 && name && name[name.length - 1] === "/") typeflag = 5;
      return {
        name,
        mode,
        uid,
        gid,
        size,
        byteOffset: 0,
        mtime: new Date(1e3 * mtime),
        type,
        linkname,
        uname,
        gname,
        devmajor,
        devminor,
        pax: null
      };
    };
    function isUSTAR(buf) {
      return b4a.equals(USTAR_MAGIC, buf.subarray(MAGIC_OFFSET, MAGIC_OFFSET + 6));
    }
    function isGNU(buf) {
      return b4a.equals(GNU_MAGIC, buf.subarray(MAGIC_OFFSET, MAGIC_OFFSET + 6)) && b4a.equals(GNU_VER, buf.subarray(VERSION_OFFSET, VERSION_OFFSET + 2));
    }
    function clamp(index, len, defaultValue) {
      if (typeof index !== "number") return defaultValue;
      index = ~~index;
      if (index >= len) return len;
      if (index >= 0) return index;
      index += len;
      if (index >= 0) return index;
      return 0;
    }
    function toType(flag) {
      switch (flag) {
        case 0:
          return "file";
        case 1:
          return "link";
        case 2:
          return "symlink";
        case 3:
          return "character-device";
        case 4:
          return "block-device";
        case 5:
          return "directory";
        case 6:
          return "fifo";
        case 7:
          return "contiguous-file";
        case 72:
          return "pax-header";
        case 55:
          return "pax-global-header";
        case 27:
          return "gnu-long-link-path";
        case 28:
        case 30:
          return "gnu-long-path";
      }
      return null;
    }
    function toTypeflag(flag) {
      switch (flag) {
        case "file":
          return 0;
        case "link":
          return 1;
        case "symlink":
          return 2;
        case "character-device":
          return 3;
        case "block-device":
          return 4;
        case "directory":
          return 5;
        case "fifo":
          return 6;
        case "contiguous-file":
          return 7;
        case "pax-header":
          return 72;
      }
      return 0;
    }
    function indexOf(block, num, offset, end) {
      for (; offset < end; offset++) {
        if (block[offset] === num) return offset;
      }
      return end;
    }
    function cksum(block) {
      let sum = 8 * 32;
      for (let i = 0; i < 148; i++) sum += block[i];
      for (let j = 156; j < 512; j++) sum += block[j];
      return sum;
    }
    function encodeOct(val, n) {
      val = val.toString(8);
      if (val.length > n) return SEVENS.slice(0, n) + " ";
      return ZEROS.slice(0, n - val.length) + val + " ";
    }
    function encodeSizeBin(num, buf, off) {
      buf[off] = 128;
      for (let i = 11; i > 0; i--) {
        buf[off + i] = num & 255;
        num = Math.floor(num / 256);
      }
    }
    function encodeSize(num, buf, off) {
      if (num.toString(8).length > 11) {
        encodeSizeBin(num, buf, off);
      } else {
        b4a.write(buf, encodeOct(num, 11), off);
      }
    }
    function parse256(buf) {
      let positive;
      if (buf[0] === 128) positive = true;
      else if (buf[0] === 255) positive = false;
      else return null;
      const tuple = [];
      let i;
      for (i = buf.length - 1; i > 0; i--) {
        const byte = buf[i];
        if (positive) tuple.push(byte);
        else tuple.push(255 - byte);
      }
      let sum = 0;
      const l = tuple.length;
      for (i = 0; i < l; i++) {
        sum += tuple[i] * Math.pow(256, i);
      }
      return positive ? sum : -1 * sum;
    }
    function decodeOct(val, offset, length) {
      val = val.subarray(offset, offset + length);
      offset = 0;
      if (val[offset] & 128) {
        return parse256(val);
      } else {
        while (offset < val.length && val[offset] === 32) offset++;
        const end = clamp(indexOf(val, 32, offset, val.length), val.length, val.length);
        while (offset < end && val[offset] === 0) offset++;
        if (end === offset) return 0;
        return parseInt(b4a.toString(val.subarray(offset, end)), 8);
      }
    }
    function decodeStr(val, offset, length, encoding) {
      return b4a.toString(val.subarray(offset, indexOf(val, 0, offset, offset + length)), encoding);
    }
    function addLength(str) {
      const len = b4a.byteLength(str);
      let digits = Math.floor(Math.log(len) / Math.log(10)) + 1;
      if (len + digits >= Math.pow(10, digits)) digits++;
      return len + digits + str;
    }
  }
});

// node_modules/tar-stream/extract.js
var require_extract = __commonJS({
  "node_modules/tar-stream/extract.js"(exports, module) {
    var { Writable, Readable, getStreamError } = require_streamx();
    var FIFO = require_fast_fifo();
    var b4a = require_b4a();
    var headers = require_headers();
    var EMPTY = b4a.alloc(0);
    var MAX_HEADER_SIZE = 4 * 1024 * 1024;
    var BufferList = class {
      constructor() {
        this.buffered = 0;
        this.shifted = 0;
        this.queue = new FIFO();
        this._offset = 0;
      }
      push(buffer) {
        this.buffered += buffer.byteLength;
        this.queue.push(buffer);
      }
      shiftFirst(size) {
        return this.buffered === 0 ? null : this._next(size);
      }
      shift(size) {
        if (size > this.buffered) return null;
        if (size === 0) return EMPTY;
        let chunk = this._next(size);
        if (size === chunk.byteLength) return chunk;
        const chunks = [chunk];
        while ((size -= chunk.byteLength) > 0) {
          chunk = this._next(size);
          chunks.push(chunk);
        }
        return b4a.concat(chunks);
      }
      _next(size) {
        const buf = this.queue.peek();
        const rem = buf.byteLength - this._offset;
        if (size >= rem) {
          const sub = this._offset ? buf.subarray(this._offset, buf.byteLength) : buf;
          this.queue.shift();
          this._offset = 0;
          this.buffered -= rem;
          this.shifted += rem;
          return sub;
        }
        this.buffered -= size;
        this.shifted += size;
        return buf.subarray(this._offset, this._offset += size);
      }
    };
    var Source = class extends Readable {
      constructor(self, header, offset) {
        super();
        this.header = header;
        this.offset = offset;
        this._parent = self;
      }
      _read(cb) {
        if (this.header.size === 0) {
          this.push(null);
        }
        if (this._parent._stream === this) {
          this._parent._update();
        }
        cb(null);
      }
      _predestroy() {
        this._parent.destroy(getStreamError(this));
      }
      _detach() {
        if (this._parent._stream === this) {
          this._parent._stream = null;
          this._parent._missing = overflow(this.header.size);
          this._parent._update();
        }
      }
      _destroy(cb) {
        this._detach();
        cb(null);
      }
    };
    var Extract = class extends Writable {
      constructor(opts) {
        super(opts);
        if (!opts) opts = {};
        this._buffer = new BufferList();
        this._offset = 0;
        this._header = null;
        this._stream = null;
        this._missing = 0;
        this._longHeader = false;
        this._callback = noop;
        this._locked = false;
        this._finished = false;
        this._pax = null;
        this._paxGlobal = null;
        this._gnuLongPath = null;
        this._gnuLongLinkPath = null;
        this._filenameEncoding = opts.filenameEncoding || "utf-8";
        this._allowUnknownFormat = !!opts.allowUnknownFormat;
        this._unlockBound = this._unlock.bind(this);
      }
      _unlock(err) {
        this._locked = false;
        if (err) {
          this.destroy(err);
          this._continueWrite(err);
          return;
        }
        this._update();
      }
      _consumeHeader() {
        if (this._locked) return false;
        this._offset = this._buffer.shifted;
        try {
          this._header = headers.decode(this._buffer.shift(512), this._filenameEncoding, this._allowUnknownFormat);
        } catch (err) {
          this._continueWrite(err);
          return false;
        }
        if (!this._header) return true;
        this._header.byteOffset = this._buffer.shifted;
        switch (this._header.type) {
          case "gnu-long-path":
          case "gnu-long-link-path":
          case "pax-global-header":
          case "pax-header":
            this._longHeader = true;
            this._missing = this._header.size;
            if (this._missing > MAX_HEADER_SIZE) {
              this._continueWrite(new Error("Header exceeds max size"));
              return false;
            }
            return true;
        }
        this._locked = true;
        this._applyLongHeaders();
        if (!(this._header.size >= 0)) {
          this._continueWrite(new Error("Invalid header"));
          return false;
        }
        if (this._header.size === 0 || this._header.type === "directory") {
          this.emit("entry", this._header, this._createStream(), this._unlockBound);
          return true;
        }
        this._stream = this._createStream();
        this._missing = this._header.size;
        this.emit("entry", this._header, this._stream, this._unlockBound);
        return true;
      }
      _applyLongHeaders() {
        if (this._gnuLongPath) {
          this._header.name = this._gnuLongPath;
          this._gnuLongPath = null;
        }
        if (this._gnuLongLinkPath) {
          this._header.linkname = this._gnuLongLinkPath;
          this._gnuLongLinkPath = null;
        }
        if (this._pax) {
          if (this._pax.path) this._header.name = this._pax.path;
          if (this._pax.linkpath) this._header.linkname = this._pax.linkpath;
          if (this._pax.size) this._header.size = parseInt(this._pax.size, 10);
          this._header.pax = this._pax;
          this._pax = null;
        }
      }
      _decodeLongHeader(buf) {
        switch (this._header.type) {
          case "gnu-long-path":
            this._gnuLongPath = headers.decodeLongPath(buf, this._filenameEncoding);
            break;
          case "gnu-long-link-path":
            this._gnuLongLinkPath = headers.decodeLongPath(buf, this._filenameEncoding);
            break;
          case "pax-global-header":
            this._paxGlobal = headers.decodePax(buf);
            break;
          case "pax-header":
            this._pax = this._paxGlobal === null ? headers.decodePax(buf) : Object.assign({}, this._paxGlobal, headers.decodePax(buf));
            break;
        }
      }
      _consumeLongHeader() {
        this._longHeader = false;
        this._missing = overflow(this._header.size);
        const buf = this._buffer.shift(this._header.size);
        try {
          this._decodeLongHeader(buf);
        } catch (err) {
          this._continueWrite(err);
          return false;
        }
        return true;
      }
      _consumeStream() {
        const buf = this._buffer.shiftFirst(this._missing);
        if (buf === null) return false;
        this._missing -= buf.byteLength;
        const drained = this._stream.push(buf);
        if (this._missing === 0) {
          this._stream.push(null);
          if (drained) this._stream._detach();
          return drained && this._locked === false;
        }
        return drained;
      }
      _createStream() {
        return new Source(this, this._header, this._offset);
      }
      _update() {
        while (this._buffer.buffered > 0 && !this.destroying) {
          if (this._missing > 0) {
            if (this._stream !== null) {
              if (this._consumeStream() === false) return;
              continue;
            }
            if (this._longHeader === true) {
              if (this._missing > this._buffer.buffered) break;
              if (this._consumeLongHeader() === false) return false;
              continue;
            }
            const ignore = this._buffer.shiftFirst(this._missing);
            if (ignore !== null) this._missing -= ignore.byteLength;
            continue;
          }
          if (this._buffer.buffered < 512) break;
          if (this._stream !== null || this._consumeHeader() === false) return;
        }
        this._continueWrite(null);
      }
      _continueWrite(err) {
        const cb = this._callback;
        this._callback = noop;
        cb(err);
      }
      _write(data, cb) {
        this._callback = cb;
        this._buffer.push(data);
        this._update();
      }
      _final(cb) {
        this._finished = this._missing === 0 && this._buffer.buffered === 0;
        cb(this._finished ? null : new Error("Unexpected end of data"));
      }
      _predestroy() {
        this._continueWrite(null);
      }
      _destroy(cb) {
        if (this._stream) this._stream.destroy(getStreamError(this));
        cb(null);
      }
      [Symbol.asyncIterator]() {
        let error = null;
        let promiseResolve = null;
        let promiseReject = null;
        let entryStream = null;
        let entryCallback = null;
        const extract2 = this;
        this.on("entry", onentry);
        this.on("error", (err) => {
          error = err;
        });
        this.on("close", onclose);
        return {
          [Symbol.asyncIterator]() {
            return this;
          },
          next() {
            return new Promise(onnext);
          },
          return() {
            return destroy(null);
          },
          throw(err) {
            return destroy(err);
          }
        };
        function consumeCallback(err) {
          if (!entryCallback) return;
          const cb = entryCallback;
          entryCallback = null;
          cb(err);
        }
        function onnext(resolve5, reject) {
          if (error) {
            return reject(error);
          }
          if (entryStream) {
            resolve5({ value: entryStream, done: false });
            entryStream = null;
            return;
          }
          promiseResolve = resolve5;
          promiseReject = reject;
          consumeCallback(null);
          if (extract2._finished && promiseResolve) {
            promiseResolve({ value: void 0, done: true });
            promiseResolve = promiseReject = null;
          }
        }
        function onentry(header, stream, callback) {
          entryCallback = callback;
          stream.on("error", noop);
          if (promiseResolve) {
            promiseResolve({ value: stream, done: false });
            promiseResolve = promiseReject = null;
          } else {
            entryStream = stream;
          }
        }
        function onclose() {
          consumeCallback(error);
          if (!promiseResolve) return;
          if (error) promiseReject(error);
          else promiseResolve({ value: void 0, done: true });
          promiseResolve = promiseReject = null;
        }
        function destroy(err) {
          extract2.destroy(err);
          consumeCallback(err);
          return new Promise((resolve5, reject) => {
            if (extract2.destroyed) return resolve5({ value: void 0, done: true });
            extract2.once("close", function() {
              if (err) reject(err);
              else resolve5({ value: void 0, done: true });
            });
          });
        }
      }
    };
    module.exports = function extract2(opts) {
      return new Extract(opts);
    };
    function noop() {
    }
    function overflow(size) {
      size &= 511;
      return size && 512 - size;
    }
  }
});

// node_modules/tar-stream/constants.js
var require_constants = __commonJS({
  "node_modules/tar-stream/constants.js"(exports, module) {
    var constants2 = {
      // just for envs without fs
      S_IFMT: 61440,
      S_IFDIR: 16384,
      S_IFCHR: 8192,
      S_IFBLK: 24576,
      S_IFIFO: 4096,
      S_IFLNK: 40960
    };
    try {
      module.exports = __require("fs").constants || constants2;
    } catch {
      module.exports = constants2;
    }
  }
});

// node_modules/tar-stream/pack.js
var require_pack = __commonJS({
  "node_modules/tar-stream/pack.js"(exports, module) {
    var { Readable, Writable, getStreamError } = require_streamx();
    var b4a = require_b4a();
    var constants2 = require_constants();
    var headers = require_headers();
    var DMODE = 493;
    var FMODE = 420;
    var END_OF_TAR = b4a.alloc(1024);
    var Sink = class extends Writable {
      constructor(pack, header, callback) {
        super({ mapWritable, eagerOpen: true });
        this.written = 0;
        this.header = header;
        this._callback = callback;
        this._linkname = null;
        this._isLinkname = header.type === "symlink" && !header.linkname;
        this._isVoid = header.type !== "file" && header.type !== "contiguous-file";
        this._finished = false;
        this._pack = pack;
        this._openCallback = null;
        if (this._pack._stream === null) this._pack._stream = this;
        else this._pack._pending.push(this);
      }
      _open(cb) {
        this._openCallback = cb;
        if (this._pack._stream === this) this._continueOpen();
      }
      _continuePack(err) {
        if (this._callback === null) return;
        const callback = this._callback;
        this._callback = null;
        callback(err);
      }
      _continueOpen() {
        if (this._pack._stream === null) this._pack._stream = this;
        const cb = this._openCallback;
        this._openCallback = null;
        if (cb === null) return;
        if (this._pack.destroying) return cb(new Error("pack stream destroyed"));
        if (this._pack._finalized) return cb(new Error("pack stream is already finalized"));
        this._pack._stream = this;
        if (!this._isLinkname) {
          this._pack._encode(this.header);
        }
        if (this._isVoid) {
          this._finish();
          this._continuePack(null);
        }
        cb(null);
      }
      _write(data, cb) {
        if (this._isLinkname) {
          this._linkname = this._linkname ? b4a.concat([this._linkname, data]) : data;
          return cb(null);
        }
        if (this._isVoid) {
          if (data.byteLength > 0) {
            return cb(new Error("No body allowed for this entry"));
          }
          return cb();
        }
        this.written += data.byteLength;
        if (this._pack.push(data)) return cb();
        this._pack._drain = cb;
      }
      _finish() {
        if (this._finished) return;
        this._finished = true;
        if (this._isLinkname) {
          this.header.linkname = this._linkname ? b4a.toString(this._linkname, "utf-8") : "";
          this._pack._encode(this.header);
        }
        overflow(this._pack, this.header.size);
        this._pack._done(this);
      }
      _final(cb) {
        if (this.written !== this.header.size) {
          return cb(new Error("Size mismatch"));
        }
        this._finish();
        cb(null);
      }
      _getError() {
        return getStreamError(this) || new Error("tar entry destroyed");
      }
      _predestroy() {
        this._pack.destroy(this._getError());
      }
      _destroy(cb) {
        this._pack._done(this);
        this._continuePack(this._finished ? null : this._getError());
        cb();
      }
    };
    var Pack = class extends Readable {
      constructor(opts) {
        super(opts);
        this._drain = noop;
        this._finalized = false;
        this._finalizing = false;
        this._pending = [];
        this._stream = null;
      }
      entry(header, buffer, callback) {
        if (this._finalized || this.destroying) throw new Error("already finalized or destroyed");
        if (typeof buffer === "function") {
          callback = buffer;
          buffer = null;
        }
        if (!callback) callback = noop;
        if (!header.size || header.type === "symlink") header.size = 0;
        if (!header.type) header.type = modeToType(header.mode);
        if (!header.mode) header.mode = header.type === "directory" ? DMODE : FMODE;
        if (!header.uid) header.uid = 0;
        if (!header.gid) header.gid = 0;
        if (!header.mtime) header.mtime = /* @__PURE__ */ new Date();
        if (typeof buffer === "string") buffer = b4a.from(buffer);
        const sink = new Sink(this, header, callback);
        if (b4a.isBuffer(buffer)) {
          header.size = buffer.byteLength;
          sink.write(buffer);
          sink.end();
          return sink;
        }
        if (sink._isVoid) {
          return sink;
        }
        return sink;
      }
      finalize() {
        if (this._stream || this._pending.length > 0) {
          this._finalizing = true;
          return;
        }
        if (this._finalized) return;
        this._finalized = true;
        this.push(END_OF_TAR);
        this.push(null);
      }
      _done(stream) {
        if (stream !== this._stream) return;
        this._stream = null;
        if (this._finalizing) this.finalize();
        if (this._pending.length) this._pending.shift()._continueOpen();
      }
      _encode(header) {
        if (!header.pax) {
          const buf = headers.encode(header);
          if (buf) {
            this.push(buf);
            return;
          }
        }
        this._encodePax(header);
      }
      _encodePax(header) {
        const paxHeader = headers.encodePax({
          name: header.name,
          linkname: header.linkname,
          pax: header.pax
        });
        const newHeader = {
          name: "PaxHeader",
          mode: header.mode,
          uid: header.uid,
          gid: header.gid,
          size: paxHeader.byteLength,
          mtime: header.mtime,
          type: "pax-header",
          linkname: header.linkname && "PaxHeader",
          uname: header.uname,
          gname: header.gname,
          devmajor: header.devmajor,
          devminor: header.devminor
        };
        this.push(headers.encode(newHeader));
        this.push(paxHeader);
        overflow(this, paxHeader.byteLength);
        newHeader.size = header.size;
        newHeader.type = header.type;
        this.push(headers.encode(newHeader));
      }
      _doDrain() {
        const drain = this._drain;
        this._drain = noop;
        drain();
      }
      _predestroy() {
        const err = getStreamError(this);
        if (this._stream) this._stream.destroy(err);
        while (this._pending.length) {
          const stream = this._pending.shift();
          stream.destroy(err);
          stream._continueOpen();
        }
        this._doDrain();
      }
      _read(cb) {
        this._doDrain();
        cb();
      }
    };
    module.exports = function pack(opts) {
      return new Pack(opts);
    };
    function modeToType(mode) {
      switch (mode & constants2.S_IFMT) {
        case constants2.S_IFBLK:
          return "block-device";
        case constants2.S_IFCHR:
          return "character-device";
        case constants2.S_IFDIR:
          return "directory";
        case constants2.S_IFIFO:
          return "fifo";
        case constants2.S_IFLNK:
          return "symlink";
      }
      return "file";
    }
    function noop() {
    }
    function overflow(self, size) {
      size &= 511;
      if (size) self.push(END_OF_TAR.subarray(0, 512 - size));
    }
    function mapWritable(buf) {
      return b4a.isBuffer(buf) ? buf : b4a.from(buf);
    }
  }
});

// node_modules/tar-stream/index.js
var require_tar_stream = __commonJS({
  "node_modules/tar-stream/index.js"(exports) {
    exports.extract = require_extract();
    exports.pack = require_pack();
  }
});

// src/workspace-cli.ts
import { resolve as resolve4 } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// src/common.ts
import { createHash } from "node:crypto";
import { appendFileSync, constants, closeSync, fstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative as pathRelative, resolve, sep } from "node:path";
var ReleaseError = class extends Error {
};
var SHA = /^[0-9a-f]{40}$/;
var DIGEST = /^[0-9a-f]{64}$/;
var NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
var VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
var REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
var TOOLCHAIN = /^[0-9]+\.[0-9]+\.[0-9]+$/;
function requireThat(condition, message) {
  if (!condition) throw new ReleaseError(message);
}
function record(value, what = "object") {
  requireThat(value !== null && typeof value === "object" && !Array.isArray(value), `invalid ${what}`);
  return value;
}
function strings(value, what) {
  requireThat(Array.isArray(value) && value.every((x) => typeof x === "string"), `invalid ${what}`);
  return value;
}
function valid(pattern, value, what) {
  requireThat(typeof value === "string" && pattern.exec(value)?.[0] === value, `invalid ${what}: ${JSON.stringify(value)}`);
  return value;
}
function version(value) {
  const result = valid(VERSION, value, "version (build metadata is intentionally unsupported)");
  const prerelease = VERSION.exec(result)?.[4];
  requireThat(!prerelease?.split(".").some((x) => /^0[0-9]+$/.test(x)), "numeric prerelease identifiers cannot have leading zeroes");
  return result;
}
function compareKeys(a, b) {
  const left = Array.from(a, (c) => c.codePointAt(0));
  const right = Array.from(b, (c) => c.codePointAt(0));
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}
function canonical(value) {
  function encode(item) {
    if (item === null || typeof item === "boolean" || typeof item === "string") return JSON.stringify(item);
    if (typeof item === "number") {
      requireThat(Number.isFinite(item), "non-finite JSON number");
      return JSON.stringify(item);
    }
    if (Array.isArray(item)) return `[${item.map(encode).join(",")}]`;
    const object = record(item, "JSON value");
    return `{${Object.keys(object).sort(compareKeys).map((key) => `${JSON.stringify(key)}:${encode(object[key])}`).join(",")}}`;
  }
  return Buffer.from(encode(value) + "\n");
}
var digest = (data) => createHash("sha256").update(data).digest("hex");
var utcNow = () => (/* @__PURE__ */ new Date()).toISOString();
function utf8(data) {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(data);
  } catch {
    throw new ReleaseError("invalid UTF-8");
  }
}
function readRegular(path, limit) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    requireThat(stat.isFile(), `missing or linked regular file: ${path}`);
    requireThat(stat.size <= limit, `file too large: ${path}`);
    const bytes = readFileSync(fd);
    requireThat(bytes.length <= limit, `file too large: ${path}`);
    return bytes;
  } finally {
    if (fd !== void 0) closeSync(fd);
  }
}
function readJson(path) {
  return JSON.parse(utf8(readRegular(path, 4 * 1024 * 1024)));
}
function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path + ".tmp", canonical(value));
  renameSync(path + ".tmp", path);
}
function relative(value) {
  requireThat(typeof value === "string" && value && !/[\\\0]/.test(value), "invalid relative path");
  const parts = value.split("/").filter((p) => p && p !== ".");
  requireThat(!value.startsWith("/") && parts.length && !parts.some((p) => p === ".." || p.includes(":")), `unsafe path: ${JSON.stringify(value)}`);
  return parts.join("/");
}
function inside(root, path) {
  const rel = pathRelative(resolve(root), resolve(path));
  return !isAbsolute(rel) && rel !== ".." && !rel.startsWith(".." + sep);
}
function within(root, value) {
  const path = realpathSync(resolve(root, relative(value)));
  requireThat(inside(realpathSync(root), path), `path escapes root: ${JSON.stringify(value)}`);
  return path;
}
function output(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  for (const [key, value] of Object.entries(values)) {
    requireThat(!/[\n\r]/.test(`${key}${String(value)}`), "multiline workflow output rejected");
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value)}
`);
  }
}

// src/workspace.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync7, readFileSync as readFileSync5 } from "node:fs";
import { join as join8, resolve as resolve3 } from "node:path";

// src/capsule.ts
import { join as join2 } from "node:path";

// src/archive.ts
var import_tar_stream = __toESM(require_tar_stream(), 1);
import { mkdirSync as mkdirSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2, join } from "node:path";
import { gunzipSync } from "node:zlib";
var MAX_CRATE = 32 * 1024 * 1024;
var MAX_EXPANDED = 128 * 1024 * 1024;
var MAX_FILES = 2e4;
async function archiveFiles(data, name, vers) {
  requireThat(data.length > 0 && data.length <= MAX_CRATE, "crate exceeds the 32 MiB pipeline limit");
  const root = `${valid(NAME, name, "package")}-${version(vers)}`;
  const files = /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  let total = 0;
  let count = 0;
  try {
    const tar = gunzipSync(data, { maxOutputLength: MAX_EXPANDED });
    await new Promise((resolve5, reject) => {
      const archive = (0, import_tar_stream.extract)();
      archive.on("error", reject);
      archive.on("finish", resolve5);
      archive.on("entry", (header, stream, next) => {
        stream.on("error", reject);
        try {
          requireThat(++count <= MAX_FILES, "archive has too many entries");
          const path = relative(header.name);
          const [first, ...parts] = path.split("/");
          requireThat(first === root, "archive has an unexpected root directory");
          requireThat(!seen.has(path), `duplicate archive entry: ${path}`);
          seen.add(path);
          requireThat(header.type === "directory" || header.type === "file" || header.type === "contiguous-file", "archive links and special files are forbidden");
          const size = header.size ?? 0;
          total += size;
          requireThat(Number.isSafeInteger(size) && size >= 0 && total <= MAX_EXPANDED, "expanded archive is too large");
          if (header.type === "directory") {
            requireThat(size === 0, "archive directory contains data");
            stream.on("end", next);
            stream.resume();
            return;
          }
          requireThat(parts.length > 0, "archive root cannot be a file");
          const chunks = [];
          let length = 0;
          stream.on("data", (chunk) => {
            const bytes = chunk;
            length += bytes.length;
            chunks.push(bytes);
          });
          stream.on("end", () => {
            if (length !== size) {
              archive.destroy(new ReleaseError("truncated archive member"));
              return;
            }
            files.set(parts.join("/"), Buffer.concat(chunks));
            next();
          });
        } catch (error) {
          archive.destroy(error);
        }
      });
      archive.end(tar);
    });
  } catch (error) {
    if (error instanceof ReleaseError) throw error;
    throw new ReleaseError("invalid gzip/tar crate archive");
  }
  requireThat(files.has("Cargo.toml"), "crate does not contain Cargo.toml");
  for (const name2 of files.keys()) {
    const parts = name2.split("/");
    while (parts.pop() && parts.length) requireThat(!files.has(parts.join("/")), "archive file shadows a directory");
  }
  return files;
}
function extractFiles(files, destination) {
  mkdirSync2(dirname2(destination), { recursive: true });
  mkdirSync2(destination);
  for (const [name, content] of files) {
    const path = join(destination, relative(name));
    mkdirSync2(dirname2(path), { recursive: true });
    writeFileSync2(path, content, { flag: "wx", mode: 420 });
  }
}

// node_modules/smol-toml/dist/date.js
var DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;
var TomlDate = class _TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    if (typeof date === "string") {
      let match = date.match(DATE_TIME_RE);
      if (match) {
        if (!match[1]) {
          hasDate = false;
          date = `0000-01-01T${date}`;
        }
        hasTime = !!match[2];
        hasTime && date[10] === " " && (date = date.replace(" ", "T"));
        if (match[2] && +match[2] > 23) {
          date = "";
        } else {
          offset = match[3] || null;
          date = date.toUpperCase();
          if (!offset && hasTime)
            date += "Z";
        }
      } else {
        date = "";
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 6e4);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new _TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
};

// node_modules/smol-toml/dist/error.js
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r\n|\n|\r/g);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r\n|\n|\r/g);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
var TomlError = class extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
};

// node_modules/smol-toml/dist/util.js
function indexOfNewline(str, start = 0) {
  let idx = str.indexOf("\n", start);
  if (str.charCodeAt(idx - 1) === 13)
    idx--;
  return idx;
}
function skipComment(ctx) {
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 10)
      break;
    if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10) {
      ctx.p++;
      break;
    }
    if (c < 32 && c !== 9 || c === 127) {
      throw new TomlError("control characters are not allowed in comments", {
        toml: ctx.s,
        ptr: ctx.p
      });
    }
  }
}
function skipVoid(ctx, banNewLines, banComments) {
  let c;
  while (1) {
    while ((c = ctx.s.charCodeAt(ctx.p)) === 32 || c === 9 || !banNewLines && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10))
      ctx.p++;
    if (banComments || c !== 35)
      break;
    skipComment(ctx);
  }
}
function skipUntil(ctx, sep2, end) {
  let ptr = ctx.p;
  if (!end) {
    ptr = indexOfNewline(ctx.s, ptr);
    ctx.p = ptr < 0 ? ctx.s.length : ptr;
    return;
  }
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 35) {
      skipComment(ctx);
    } else if (c === end || c === sep2) {
      return;
    }
  }
  throw new TomlError("cannot find end of structure", {
    toml: ctx.s,
    ptr
  });
}

// node_modules/smol-toml/dist/primitive.js
var INT_REGEX = /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/;
var FLOAT_REGEX = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/;
var LEADING_ZERO = /^[+-]?0[0-9_]/;
function parseString(ctx) {
  let start = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p++);
  let first = c;
  let isLiteral = c === 39;
  let isMultiline = c === ctx.s.charCodeAt(ctx.p) && c === ctx.s.charCodeAt(ctx.p + 1);
  if (isMultiline) {
    if ((c = ctx.s.charCodeAt(ctx.p += 2)) === 10)
      ctx.p++;
    else if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)
      ctx.p += 2;
  }
  let parsed = "";
  let sliceStart = ctx.p;
  let state = 0;
  for (; ctx.p < ctx.s.length; ctx.p++) {
    c = ctx.s.charCodeAt(ctx.p);
    if (isMultiline && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)) {
      state = state && 3;
    } else if (c < 32 && c !== 9 || c === 127) {
      throw new TomlError("control characters are not allowed in strings", {
        toml: ctx.s,
        ptr: ctx.p
      });
    } else if ((!state || state === 3) && c === first && (!isMultiline || ctx.s.charCodeAt(ctx.p + 1) === first && ctx.s.charCodeAt(ctx.p + 2) === first)) {
      if (isMultiline) {
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
      }
      if (!state)
        parsed += ctx.s.slice(sliceStart, ctx.p);
      ctx.p += isMultiline ? 3 : 1;
      return parsed;
    } else if (!state) {
      if (!isLiteral && c === 92) {
        parsed += ctx.s.slice(sliceStart, sliceStart = ctx.p);
        state = 1;
      }
    } else if (state === 1) {
      if (c === 120 || c === 117 || c === 85) {
        let value = 0;
        let len = c === 120 ? 2 : c === 117 ? 4 : 8;
        for (let j = 0; j < len; j++, ctx.p++) {
          let hex = ctx.s.charCodeAt(ctx.p + 1);
          let digit = (
            /* 0-9 */
            hex >= 48 && hex <= 57 ? hex - 48 : (
              /* A-F */
              hex >= 65 && hex <= 70 ? hex - 65 + 10 : (
                /* a-f */
                hex >= 97 && hex <= 102 ? hex - 97 + 10 : -1
              )
            )
          );
          if (digit < 0)
            throw new TomlError("invalid non-hex character in unicode escape", { toml: ctx.s, ptr: ctx.p + 1 });
          value = value << 4 | digit;
        }
        if (value < 0 || value > 1114111 || value >= 55296 && value <= 57343) {
          throw new TomlError("invalid unicode escape", { toml: ctx.s, ptr: ctx.p });
        }
        parsed += String.fromCodePoint(value);
        sliceStart = ctx.p + 1;
        state = 0;
      } else if (c === 32 || c === 9) {
        state = 2;
      } else {
        if (c === 98)
          parsed += "\b";
        else if (c === 116)
          parsed += "	";
        else if (c === 110)
          parsed += "\n";
        else if (c === 102)
          parsed += "\f";
        else if (c === 114)
          parsed += "\r";
        else if (c === 101)
          parsed += "\x1B";
        else if (c === 34)
          parsed += '"';
        else if (c === 92)
          parsed += "\\";
        else
          throw new TomlError("unrecognized escape sequence", { toml: ctx.s, ptr: ctx.p });
        sliceStart = ctx.p + 1;
        state = 0;
      }
    } else if (c !== 32 && c !== 9) {
      if (state === 2) {
        throw new TomlError("invalid escape: only line-ending whitespace may be escaped", {
          toml: ctx.s,
          ptr: sliceStart
        });
      }
      state = !isLiteral && c === 92 ? 1 : 0;
      sliceStart = ctx.p;
    }
  }
  throw new TomlError("unfinished string", { toml: ctx.s, ptr: start });
}
function sliceAndTrimEndOf(ctx, start, end) {
  let value = ctx.s.slice(start, end);
  let commentIdx = value.indexOf("#");
  if (commentIdx > 0) {
    skipComment({ s: value, p: commentIdx, d: 0 });
    value = value.slice(0, commentIdx);
  }
  return value.trimEnd();
}
function parseValue(ctx, integersAsBigInt, end) {
  let ptr = ctx.p;
  let err = { toml: ctx.s, ptr };
  skipUntil(ctx, 44, end);
  let value = sliceAndTrimEndOf(ctx, ptr, ctx.p);
  if (!value)
    throw new TomlError("incomplete declaration: value expected", err);
  if (value === "-inf")
    return -Infinity;
  if (value === "inf" || value === "+inf")
    return Infinity;
  if (value === "nan" || value === "+nan" || value === "-nan")
    return NaN;
  if (value === "-0")
    return integersAsBigInt ? 0n : 0;
  let isInt = INT_REGEX.test(value);
  if (isInt || FLOAT_REGEX.test(value)) {
    if (LEADING_ZERO.test(value)) {
      throw new TomlError("leading zeroes are not allowed", err);
    }
    value = value.replace(/_/g, "");
    let numeric = +value;
    if (isNaN(numeric)) {
      throw new TomlError("invalid number", err);
    }
    if (isInt) {
      if ((isInt = !Number.isSafeInteger(numeric)) && !integersAsBigInt) {
        throw new TomlError("integer value cannot be represented losslessly", err);
      }
      if (isInt || integersAsBigInt === true)
        numeric = BigInt(value);
    }
    return numeric;
  }
  const date = new TomlDate(value);
  if (!date.isValid())
    throw new TomlError("invalid value", err);
  return date;
}

// node_modules/smol-toml/dist/extract.js
function extractValue(ctx, end, integersAsBigInt) {
  let ptr = ctx.p;
  let c = ctx.s.charCodeAt(ptr);
  if (c === 91 || c === 123) {
    if (!ctx.d--) {
      throw new TomlError("document contains excessively nested structures. aborting.", {
        toml: ctx.s,
        ptr
      });
    }
    let value = c === 91 ? parseArray(ctx, integersAsBigInt) : parseInlineTable(ctx, integersAsBigInt);
    ctx.d++;
    return value;
  }
  if (c === 34 || c === 39) {
    return parseString(ctx);
  }
  if (c === 116) {
    if (ctx.s.charCodeAt(++ctx.p) !== 114 || ctx.s.charCodeAt(++ctx.p) !== 117 || ctx.s.charCodeAt(++ctx.p) !== 101)
      throw new TomlError("invalid value", { toml: ctx.s, ptr });
    ctx.p++;
    return true;
  }
  if (c === 102) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 108 || ctx.s.charCodeAt(++ctx.p) !== 115 || ctx.s.charCodeAt(++ctx.p) !== 101)
      throw new TomlError("invalid value", { toml: ctx.s, ptr });
    ctx.p++;
    return false;
  }
  return parseValue(ctx, integersAsBigInt, end);
}

// node_modules/smol-toml/dist/struct.js
var KEY_PART_RE = /^[a-zA-Z0-9-_]+[ \t]*$/;
function parseKey(ctx, end = "=") {
  let start = ctx.p;
  let dot = start - 1;
  let parsed = [];
  let endPtr = ctx.s.indexOf(end, start);
  if (endPtr < 0) {
    throw new TomlError("incomplete key-value: cannot find end of key", {
      toml: ctx.s,
      ptr: start
    });
  }
  do {
    let c = ctx.s.charCodeAt(ctx.p = ++dot);
    if (c !== 32 && c !== 9) {
      if (c === 34 || c === 39) {
        if (c === ctx.s.charCodeAt(ctx.p + 1) && c === ctx.s.charCodeAt(ctx.p + 2)) {
          throw new TomlError("multiline strings are not allowed in keys", {
            toml: ctx.s,
            ptr: ctx.p
          });
        }
        let part = parseString(ctx);
        dot = ctx.s.indexOf(".", ctx.p);
        let strEnd = ctx.s.slice(ctx.p, dot < 0 || dot > endPtr ? endPtr : dot);
        let newLine = indexOfNewline(strEnd);
        if (newLine > -1) {
          throw new TomlError("newlines are not allowed in keys", {
            toml: ctx.s,
            ptr: newLine
          });
        }
        if (strEnd.trimStart()) {
          throw new TomlError("found extra tokens after the string part", {
            toml: ctx.s,
            ptr: ctx.p
          });
        }
        if (endPtr < ctx.p) {
          endPtr = ctx.s.indexOf(end, ctx.p);
          if (endPtr < 0) {
            throw new TomlError("incomplete key-value: cannot find end of key", {
              toml: ctx.s,
              ptr: start
            });
          }
        }
        parsed.push(part);
      } else {
        dot = ctx.s.indexOf(".", ctx.p);
        let part = ctx.s.slice(ctx.p, dot < 0 || dot > endPtr ? endPtr : dot);
        if (!KEY_PART_RE.test(part)) {
          throw new TomlError("only letter, numbers, dashes and underscores are allowed in keys", {
            toml: ctx.s,
            ptr: ctx.p
          });
        }
        parsed.push(part.trimEnd());
      }
    }
  } while (dot + 1 && dot < endPtr);
  ctx.p = endPtr + 1;
  skipVoid(ctx, true, true);
  return parsed;
}
function parseInlineTable(ctx, integersAsBigInt) {
  let res = {};
  let seen = /* @__PURE__ */ new Set();
  let c;
  ctx.p++;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 125) {
      ctx.p++;
      return res;
    }
    let k;
    let t = res;
    let hasOwn = false;
    let p = ctx.p;
    let key = parseKey(ctx);
    for (let i = 0; i < key.length; i++) {
      if (i)
        t = hasOwn ? t[k] : t[k] = {};
      k = key[i];
      if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
        throw new TomlError("trying to redefine an already defined value", {
          toml: ctx.s,
          ptr: p
        });
      }
      if (!hasOwn && k === "__proto__") {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
      }
    }
    if (hasOwn) {
      throw new TomlError("trying to redefine an already defined value", {
        toml: ctx.s,
        ptr: ctx.p
      });
    }
    let value = extractValue(ctx, 125, integersAsBigInt);
    seen.add(t[k] = value);
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 125) {
      return res;
    }
    if (c !== 44) {
      throw new TomlError("expected comma or end of structure", { toml: ctx.s, ptr: ctx.p - 1 });
    }
  }
  throw new TomlError("unfinished table encountered", {
    toml: ctx.s,
    ptr: ctx.p
  });
}
function parseArray(ctx, integersAsBigInt) {
  let res = [];
  let c;
  ctx.p++;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 93) {
      ctx.p++;
      return res;
    }
    res.push(extractValue(ctx, 93, integersAsBigInt));
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 93) {
      return res;
    }
    if (c !== 44) {
      throw new TomlError("expected comma or end of structure", { toml: ctx.s, ptr: ctx.p - 1 });
    }
  }
  throw new TomlError("unfinished array encountered", {
    toml: ctx.s,
    ptr: ctx.p
  });
}

// node_modules/smol-toml/dist/parse.js
function peekTable(key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = {};
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      if (k === "__proto__") {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: {}
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = {});
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: {} };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = {};
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function parse(toml, { maxDepth = 1e3, integersAsBigInt } = {}) {
  let ctx = { s: toml, p: 0, d: maxDepth };
  let res = {};
  let meta = {};
  let tmp;
  let tbl = res;
  let m = meta;
  skipVoid(ctx);
  while (ctx.p < toml.length) {
    if (toml.charCodeAt(ctx.p) === 91) {
      let isTableArray = toml.charCodeAt(++ctx.p) === 91;
      tmp = ctx.p += +isTableArray;
      let k = parseKey(ctx, "]");
      if (isTableArray) {
        if (toml.charCodeAt(ctx.p - 1) !== 93) {
          throw new TomlError("expected end of table declaration", {
            toml,
            ptr: ctx.p - 1
          });
        }
        ctx.p++;
      }
      let p = peekTable(
        k,
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr: tmp
        });
      }
      m = p[2];
      tbl = p[1];
    } else {
      tmp = ctx.p;
      let k = parseKey(ctx);
      let p = peekTable(
        k,
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr: tmp
        });
      }
      p[1][p[0]] = extractValue(ctx, void 0, integersAsBigInt);
    }
    skipVoid(ctx, true);
    if (ctx.p < toml.length && (tmp = toml.charCodeAt(ctx.p)) !== 10 && tmp !== 13) {
      throw new TomlError("each key-value declaration must be followed by an end-of-line", {
        toml,
        ptr: ctx.p
      });
    }
    skipVoid(ctx);
  }
  return res;
}

// src/metadata.ts
function normalizedMetadata(files, name, vers) {
  let manifest;
  try {
    manifest = record(parse(utf8(files.get("Cargo.toml"))));
  } catch {
    throw new ReleaseError("invalid packaged Cargo.toml");
  }
  const pkg = record(manifest.package, "package");
  requireThat(pkg.name === name && pkg.version === vers, "manifest identity disagrees with the release candidate");
  requireThat(pkg.publish === void 0 || Array.isArray(pkg.publish) && pkg.publish.length === 1 && pkg.publish[0] === "crates-io", "package must permit publishing to crates.io only (or omit publish)");
  requireThat(!["workspace", "patch", "replace"].some((k) => Object.hasOwn(manifest, k)), "manifest was not normalized by Cargo");
  requireThat(typeof pkg.description === "string" && pkg.description.trim(), "package description is required");
  requireThat(pkg.license || pkg["license-file"], "license or license-file is required");
  const deps = [];
  const optional = /* @__PURE__ */ new Set();
  const sections = [[manifest, null]];
  for (const [target, values] of Object.entries(record(manifest.target ?? {}, "target dependencies"))) {
    sections.push([record(values, "target dependency table"), target]);
  }
  const allowed = /* @__PURE__ */ new Set(["version", "features", "optional", "default-features", "package"]);
  const headings = [["dependencies", "normal"], ["dev-dependencies", "dev"], ["build-dependencies", "build"]];
  for (const [table, target] of sections) {
    for (const [heading, kind] of headings) {
      for (const [alias, value] of Object.entries(record(table[heading] ?? {}, heading))) {
        const spec = typeof value === "string" ? { version: value } : record(value, `dependency ${alias}`);
        requireThat(Object.keys(spec).every((key) => allowed.has(key)), `unsupported dependency fields for ${alias}; only crates.io dependencies are supported`);
        requireThat(typeof spec.version === "string" && spec.version, `dependency ${alias} lacks a registry version`);
        const flags = strings(spec.features ?? [], "dependency features");
        const isOptional = spec.optional ?? false;
        const defaults = spec["default-features"] ?? true;
        requireThat(typeof isOptional === "boolean" && typeof defaults === "boolean", "dependency flags must be booleans");
        const original = valid(NAME, spec.package ?? alias, "dependency package");
        if (isOptional) optional.add(alias);
        deps.push({
          name: original,
          version_req: spec.version,
          features: flags,
          optional: isOptional,
          default_features: defaults,
          target,
          kind,
          registry: null,
          explicit_name_in_toml: Object.hasOwn(spec, "package") ? alias : null
        });
      }
    }
  }
  const features = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(record(manifest.features ?? {}, "package features"))) {
    features[key] = strings(value, "package features");
  }
  const explicit = new Set(Object.values(features).flat().filter((x) => x.startsWith("dep:")).map((x) => x.slice(4)));
  for (const alias of [...optional].sort()) {
    if (!explicit.has(alias) && !Object.hasOwn(features, alias)) features[alias] = [`dep:${alias}`];
  }
  const metadata = { name, vers, deps, features };
  for (const field of ["authors", "keywords", "categories"]) metadata[field] = strings(pkg[field] ?? [], field);
  for (const field of ["description", "documentation", "homepage", "license", "repository", "links", "license-file", "rust-version"]) {
    const value = pkg[field] ?? null;
    requireThat(value === null || typeof value === "string", `unresolved or invalid package.${field}`);
    metadata[field.replaceAll("-", "_")] = value;
  }
  metadata.badges = manifest.badges ?? {};
  const readme = pkg.readme;
  requireThat(readme === void 0 || readme === false || typeof readme === "string", "packaged readme must be a path or false");
  metadata.readme_file = typeof readme === "string" ? readme : null;
  metadata.readme = null;
  if (typeof readme === "string") {
    const content = files.get(relative(readme));
    requireThat(content, "packaged README is missing");
    metadata.readme = utf8(content);
  }
  if (pkg["license-file"]) requireThat(files.has(relative(pkg["license-file"])), "packaged license file is missing");
  return metadata;
}

// src/capsule.ts
var SCHEMA = "zrelease.candidate/v1";
async function load(directory, expected, bindings = {}) {
  valid(DIGEST, expected, "candidate SHA-256");
  const bytes = readRegular(join2(directory, "candidate.json"), 4 * 1024 * 1024);
  requireThat(digest(bytes) === expected, "candidate digest mismatch");
  const candidate = record(JSON.parse(utf8(bytes)), "candidate");
  requireThat(candidate.schema === SCHEMA, "unsupported candidate schema");
  const ident = record(candidate.package, "package");
  const name = valid(NAME, ident.name, "package");
  const vers = version(ident.version);
  const source = record(candidate.source, "source");
  valid(REPO, source.repository, "source repository");
  valid(SHA, source.commit, "source commit");
  requireThat(typeof source.ref === "string", "missing source ref");
  const pipeline = record(candidate.pipeline, "pipeline");
  valid(SHA, pipeline.revision, "pipeline revision");
  requireThat(pipeline.repository === "zsumz/zrelease", "unexpected pipeline repository");
  for (const [want, actual, field] of [
    [bindings.repository, source.repository, "source repository"],
    [bindings.commit, source.commit, "source commit"],
    [bindings.package, name, "package"],
    [bindings.pipelineRef, pipeline.revision, "pipeline revision"]
  ]) requireThat(want === void 0 || want === actual, `${field} binding mismatch`);
  const toolchain = record(candidate.toolchain, "toolchain");
  valid(TOOLCHAIN, toolchain.requested, "pinned Rust toolchain");
  requireThat(typeof toolchain.rustc === "string" && typeof toolchain.cargo === "string", "invalid recorded toolchain");
  const consumer = record(candidate.consumer, "consumer");
  strings(consumer.features, "consumer features");
  requireThat(typeof consumer.default_features === "boolean", "invalid consumer default-features");
  const qualification = record(candidate.qualification, "qualification");
  requireThat(Array.isArray(qualification.checks), "invalid qualification checks");
  for (const check of qualification.checks) {
    const item = record(check, "qualification check");
    strings(item.argv, "qualification argv");
    requireThat(item.exit_code === 0, "unsuccessful qualification check");
  }
  const manifest = record(candidate.files, "capsule file manifest");
  requireThat(Object.keys(manifest).sort().join(",") === "package.crate,publish.json,smoke.rs", "unexpected capsule file manifest");
  const payloads = {};
  for (const filename of ["package.crate", "publish.json", "smoke.rs"]) {
    const entry = record(manifest[filename], "file identity");
    const data = readRegular(join2(directory, filename), MAX_CRATE);
    requireThat(entry.size === data.length && entry.sha256 === digest(data), `digest mismatch: ${filename}`);
    payloads[filename] = data;
  }
  const files = await archiveFiles(payloads["package.crate"], name, vers);
  requireThat(canonical(normalizedMetadata(files, name, vers)).equals(payloads["publish.json"]), "publish metadata does not match the packaged manifest");
  return { candidate, crate: payloads["package.crate"], metadata: payloads["publish.json"], smoke: payloads["smoke.rs"] };
}

// src/plan.ts
import { appendFileSync as appendFileSync2, readFileSync as readFileSync2, realpathSync as realpathSync2 } from "node:fs";
import { basename, join as join4, relative as pathRelative2 } from "node:path";

// src/process.ts
import { spawn } from "node:child_process";
import { mkdirSync as mkdirSync3, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as join3 } from "node:path";
async function run(args, options) {
  const [command, ...rest] = args;
  requireThat(command, "missing command");
  console.log("+ " + args.join(" "));
  return new Promise((resolve5, reject) => {
    const child = spawn(command, rest, { cwd: options.cwd, env: options.env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let total = 0;
    let failure;
    const timer = setTimeout(() => {
      failure = new ReleaseError(`command timed out: ${command}`);
      child.kill("SIGKILL");
    }, options.timeout ?? 12e5);
    child.stdout.on("data", (chunk) => {
      total += chunk.length;
      if (total > 64 * 1024 * 1024) {
        failure = new ReleaseError("command output exceeded 64 MiB");
        child.kill("SIGKILL");
      } else chunks.push(chunk);
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", (error) => {
      failure = new ReleaseError(`cannot complete ${command}: ${error.message}`);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0) reject(new ReleaseError(`command failed (${code}): ${args.join(" ")}`));
      else resolve5(Buffer.concat(chunks).toString("utf8").trim());
    });
  });
}
function cargoEnvironment(home, target) {
  const keep = /* @__PURE__ */ new Set(["PATH", "HOME", "USER", "TMPDIR", "TEMP", "TMP", "SYSTEMROOT", "RUSTUP_HOME", "SSL_CERT_FILE", "SSL_CERT_DIR"]);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => keep.has(key)));
  Object.assign(env, { CARGO_HOME: home, CARGO_TARGET_DIR: target, CARGO_TERM_COLOR: "never", CARGO_REGISTRIES_CRATES_IO_PROTOCOL: "sparse" });
  mkdirSync3(home, { recursive: true });
  return env;
}
async function temporary(prefix, action) {
  const root = mkdtempSync(join3(tmpdir(), prefix));
  try {
    return await action(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// src/plan.ts
function graph(value, selected) {
  const metadata = record(value, "Cargo metadata");
  const ids = new Set(strings(metadata.workspace_members, "workspace members"));
  requireThat(Array.isArray(metadata.packages), "invalid Cargo packages");
  const members = metadata.packages.map((p) => record(p)).filter((p) => ids.has(String(p.id)));
  const publishable = (p) => p.publish === null || Array.isArray(p.publish) && p.publish.length === 1 && p.publish[0] === "crates-io";
  const names = selected ?? members.filter(publishable).map((p) => String(p.name));
  requireThat(names.length > 0 && names.length <= 200 && new Set(names).size === names.length, "select 1\u2013200 distinct crates");
  const packages = names.map((name) => {
    valid(NAME, name, "crate name");
    const pkg = members.find((p) => p.name === name);
    requireThat(pkg && publishable(pkg), `${name} is not a publishable workspace member`);
    requireThat(Array.isArray(pkg.targets) && pkg.targets.some((t) => {
      const kinds = record(t).kind;
      return Array.isArray(kinds) && kinds.some((k) => ["lib", "rlib", "proc-macro"].includes(k));
    }), `${name}: only library crates are supported`);
    requireThat(Array.isArray(pkg.dependencies), "invalid package dependencies");
    const needs = /* @__PURE__ */ new Set();
    for (const raw of pkg.dependencies) {
      const dep = record(raw);
      const sibling = members.find((p) => p.name === dep.name && (dep.path ? pathRelative2(String(dep.path), String(p.manifest_path)) === "Cargo.toml" : !dep.registry && (!dep.source || dep.source === "registry+https://github.com/rust-lang/crates.io-index")));
      if (sibling && names.includes(String(sibling.name))) needs.add(String(sibling.name));
    }
    return { name, version: version(pkg.version), needs: [...needs].sort() };
  });
  const sorted = [], active = /* @__PURE__ */ new Set(), done = /* @__PURE__ */ new Set();
  function visit(name) {
    requireThat(!active.has(name), `workspace dependency cycle involving ${name}`);
    if (done.has(name)) return;
    active.add(name);
    const pkg = packages.find((p) => p.name === name);
    for (const dep of pkg.needs) visit(dep);
    active.delete(name);
    done.add(name);
    sorted.push(pkg);
  }
  for (const name of [...names].sort()) visit(name);
  return sorted;
}
function readPlan(path, expected, bindings = {}) {
  valid(DIGEST, expected, "release plan digest");
  const bytes = readRegular(path, 4 * 1024 * 1024);
  requireThat(digest(bytes) === expected, "release plan digest mismatch");
  const plan = record(JSON.parse(utf8(bytes)));
  requireThat(plan.schema === "zrelease.plan/v1", "unsupported release plan");
  const source = record(plan.source);
  valid(REPO, source.repository, "source repository");
  valid(SHA, source.commit, "source commit");
  requireThat(typeof source.ref === "string" && typeof plan.publishing === "boolean", "invalid release context");
  valid(SHA, plan.pipeline_ref, "pipeline revision");
  valid(TOOLCHAIN, plan.toolchain, "toolchain");
  for (const [want, actual] of [[bindings.repository, source.repository], [bindings.commit, source.commit], [bindings.pipelineRef, plan.pipeline_ref]]) {
    requireThat(want === void 0 || want === actual, "release plan context mismatch");
  }
  requireThat(Array.isArray(plan.packages) && plan.packages.length > 0, "empty release plan");
  const seen = /* @__PURE__ */ new Set();
  for (const raw of plan.packages) {
    const pkg = record(raw);
    valid(NAME, pkg.name, "crate");
    version(pkg.version);
    requireThat(!seen.has(String(pkg.name)), "duplicate release crate");
    requireThat(strings(pkg.needs, "crate dependencies").every((dep) => seen.has(dep)), "release plan is not dependency ordered");
    seen.add(String(pkg.name));
  }
  return plan;
}
function bindCandidate(plan, candidate) {
  const pkg = plan.packages.find((p) => p.name === candidate.package.name);
  requireThat(
    pkg?.version === candidate.package.version && canonical(plan.source).equals(canonical(candidate.source)) && plan.pipeline_ref === candidate.pipeline.revision && plan.toolchain === candidate.toolchain.requested,
    "candidate differs from the approved release plan"
  );
}
function dependencyNames(plan, name) {
  const names = /* @__PURE__ */ new Set();
  function visit(name2) {
    const pkg = plan.packages.find((p) => p.name === name2);
    requireThat(pkg, "package is absent from the release plan");
    for (const dep of pkg.needs) if (!names.has(dep)) {
      names.add(dep);
      visit(dep);
    }
  }
  visit(name);
  return [...names].sort();
}
async function planRelease(options) {
  const source = realpathSync2(options.source);
  valid(REPO, options.repository, "repository");
  valid(SHA, options.commit, "commit");
  valid(SHA, options.pipelineRef, "pipeline revision");
  valid(TOOLCHAIN, options.toolchain, "toolchain");
  const manifest = within(source, options.manifest);
  requireThat(basename(manifest) === "Cargo.toml", "manifest must end in Cargo.toml");
  requireThat(await run(["git", "rev-parse", "HEAD"], { cwd: source }) === options.commit, "checkout differs from release commit");
  requireThat(!await run(["git", "status", "--porcelain", "--untracked-files=all"], { cwd: source }), "source checkout is dirty");
  if (options.baseBranch) {
    await run(["git", "check-ref-format", `refs/heads/${options.baseBranch}`], { cwd: source });
    await run(["git", "merge-base", "--is-ancestor", options.commit, `refs/remotes/origin/${options.baseBranch}`], { cwd: source });
  }
  const packages = await temporary("zrelease-plan-", async (work) => {
    const env = cargoEnvironment(join4(work, "cargo-home"), join4(work, "target"));
    const raw = await run(["cargo", `+${options.toolchain}`, "metadata", "--no-deps", "--locked", "--format-version", "1", "--manifest-path", manifest], { cwd: source, env });
    return graph(JSON.parse(raw), options.workspace ? void 0 : options.members.map((p) => p.name));
  });
  const expected = options.members.map((p) => ({ name: p.name, needs: [...p.needs].sort() })).sort((a, b) => a.name.localeCompare(b.name));
  const actual = packages.map(({ name, needs }) => ({ name, needs })).sort((a, b) => a.name.localeCompare(b.name));
  requireThat(canonical(expected).equals(canonical(actual)), "workspace dependencies changed; regenerate the release workflow");
  if (options.publishing) {
    requireThat(options.ref.startsWith(`refs/tags/${options.tagPrefix}`), "publication requires a release tag");
    if (packages.length === 1) requireThat(options.ref === `refs/tags/${options.tagPrefix}${packages[0].version}`, "single-crate release requires an exact version tag");
    await run(["git", "check-ref-format", options.ref], { cwd: source });
    requireThat(await run(["git", "rev-parse", `${options.ref}^{commit}`], { cwd: source }) === options.commit, "release tag differs from source commit");
  }
  const plan = {
    schema: "zrelease.plan/v1",
    source: { repository: options.repository, commit: options.commit, ref: options.ref },
    pipeline_ref: options.pipelineRef,
    toolchain: options.toolchain,
    manifest: options.manifest,
    publishing: options.publishing,
    packages
  };
  writeJson(options.out, plan);
  const sha = digest(readFileSync2(options.out));
  output({ plan_sha256: sha });
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync2(
    process.env.GITHUB_STEP_SUMMARY,
    `## Release

Commit: \`${options.commit}\`

Plan: \`${sha}\`

| Crate | Version | After |
| --- | --- | --- |
` + packages.map((p) => `| ${p.name} | ${p.version} | ${p.needs.join(", ") || "\u2014"} |`).join("\n") + "\n\n" + (options.publishing ? "Approve this release once in the release environment. Crates publish and verify in dependency order.\n" : "Rehearsal only; nothing will be published.\n")
  );
  return plan;
}

// src/prepare.ts
import { existsSync, mkdirSync as mkdirSync6, readFileSync as readFileSync4, realpathSync as realpathSync3, writeFileSync as writeFileSync5 } from "node:fs";
import { basename as basename2, join as join7, resolve as resolve2 } from "node:path";

// src/staging.ts
import { createServer } from "node:http";
import { mkdirSync as mkdirSync4, readdirSync, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join5 } from "node:path";

// src/http.ts
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
var HttpError = class extends ReleaseError {
  status;
  constructor(status, method, url) {
    super(`${method} ${url}: HTTP ${status}`);
    this.status = status;
  }
};
var TransportError = class extends ReleaseError {
};
var Http = class {
  localTest;
  constructor(localTest = false) {
    this.localTest = localTest;
  }
  async request(method, url, options = {}) {
    const parsed = new URL(url);
    if (this.localTest) requireThat(parsed.protocol === "http:" && parsed.hostname === "127.0.0.1", "test transport only allows IPv4 loopback");
    else {
      requireThat(parsed.protocol === "https:" && ["crates.io", "index.crates.io", "static.crates.io", "api.github.com"].includes(parsed.hostname), "unapproved HTTP destination");
      requireThat(parsed.port === "" || parsed.port === "443", "unapproved HTTPS port");
    }
    requireThat(!parsed.username && !parsed.password && !parsed.hash, "invalid HTTP URL");
    const { body, token, github = false, limit = MAX_CRATE + 1 } = options;
    if (token) {
      requireThat(["PUT", "POST"].includes(method) && (this.localTest || ["crates.io", "api.github.com"].includes(parsed.hostname)), "refusing to send credentials to this endpoint");
      requireThat(!/[\r\n]/.test(token), "invalid credential");
    }
    const headers = {
      "User-Agent": "zrelease/0.1 (https://github.com/zsumz/zrelease)",
      Accept: "application/json"
    };
    if (body) {
      headers["Content-Type"] = github ? "application/json" : "application/octet-stream";
      headers["Content-Length"] = body.length;
    }
    if (token) headers.Authorization = (github ? "Bearer " : "") + token;
    if (github) {
      headers.Accept = "application/vnd.github+json";
      headers["X-GitHub-Api-Version"] = "2022-11-28";
    }
    return new Promise((resolve5, reject) => {
      const send = parsed.protocol === "https:" ? httpsRequest : httpRequest;
      const request = send(parsed, { method, headers }, (response) => {
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          reject(new HttpError(status, method, url));
          response.destroy();
          return;
        }
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > limit) {
            reject(new ReleaseError("HTTP response exceeds the configured size limit"));
            response.destroy();
          } else chunks.push(chunk);
        });
        response.on("end", () => resolve5(Buffer.concat(chunks)));
        response.on("error", () => reject(new TransportError(`${method} ${url}: transport failure; remote outcome may be unknown`)));
      });
      const timer = setTimeout(() => request.destroy(new Error("request deadline exceeded")), 3e4);
      request.on("close", () => clearTimeout(timer));
      request.on("error", () => reject(new TransportError(`${method} ${url}: transport failure; remote outcome may be unknown`)));
      request.end(body);
    });
  }
};

// src/registry.ts
import { setTimeout as sleep } from "node:timers/promises";
function indexPath(input) {
  const name = input.toLowerCase();
  if (name.length <= 2) return `${name.length}/${name}`;
  if (name.length === 3) return `3/${name[0]}/${name}`;
  return `${name.slice(0, 2)}/${name.slice(2, 4)}/${name}`;
}
function publishBody(metadata, crate) {
  requireThat(metadata.length < 2 ** 32 && crate.length < 2 ** 32, "registry framing overflow");
  const lengths = [Buffer.alloc(4), Buffer.alloc(4)];
  lengths[0].writeUInt32LE(metadata.length);
  lengths[1].writeUInt32LE(crate.length);
  return Buffer.concat([lengths[0], metadata, lengths[1], crate]);
}
var Registry = class {
  http;
  api;
  index;
  download;
  timeout;
  interval;
  constructor(http = new Http(), options = {}) {
    this.http = http;
    this.api = options.api ?? "https://crates.io";
    this.index = options.index ?? "https://index.crates.io";
    this.download = options.download ?? "https://static.crates.io/crates";
    this.timeout = options.timeout ?? 18e4;
    this.interval = options.interval ?? 5e3;
  }
  async lookup(name, version2) {
    let body;
    try {
      body = await this.http.request("GET", `${this.index}/${indexPath(name)}`, { limit: 16 * 1024 * 1024 });
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
    let records;
    try {
      records = utf8(body).split(/\r?\n/).filter((x) => x.trim()).map((line) => record(JSON.parse(line)));
    } catch {
      throw new ReleaseError("registry returned an invalid sparse-index entry");
    }
    const matches = records.filter((r) => r.vers === version2);
    requireThat(matches.length <= 1, "registry index contains duplicate versions");
    return matches[0] ?? null;
  }
  checkRecord(record2, expected) {
    requireThat(record2.cksum === expected, "immutable version conflict: registry checksum differs; choose a NEW version");
    requireThat(record2.yanked === false, "version is yanked; refusing to publish or mark it healthy");
  }
  async observe(name, version2, expected) {
    const deadline = performance.now() + this.timeout;
    let last = "version is not visible";
    for (; ; ) {
      try {
        const entry = await this.lookup(name, version2);
        if (entry) {
          this.checkRecord(entry, expected);
          const data = await this.http.request("GET", `${this.download}/${name}/${name}-${version2}.crate`, { limit: MAX_CRATE });
          requireThat(digest(data) === expected, "downloaded registry bytes differ from the qualified crate");
          return {
            state: "registry-verified",
            sha256: expected,
            bytes: data.length,
            version_url: `https://crates.io/crates/${name}/${version2}`,
            observed_at: utcNow()
          };
        }
      } catch (error) {
        if (error instanceof HttpError && [404, 408, 429, 500, 502, 503, 504].includes(error.status)) last = error.message;
        else if (error instanceof TransportError) last = error.message;
        else throw error;
      }
      if (performance.now() >= deadline) throw new ReleaseError(`registry observation timed out (${last}); this does NOT prove the upload failed; rerun the SAME capsule`);
      await sleep(Math.min(this.interval, Math.max(0, deadline - performance.now())));
    }
  }
  async publish(candidate, crate, metadata, token) {
    requireThat(token, "missing crates.io credential");
    const { name, version: version2 } = candidate.package;
    const expected = digest(crate);
    const previous = await this.lookup(name, version2);
    if (previous) {
      this.checkRecord(previous, expected);
      return { ...await this.observe(name, version2, expected), upload: "already-present-identical" };
    }
    let outcome = "submitted";
    try {
      const raw = await this.http.request("PUT", `${this.api}/api/v1/crates/new`, {
        body: publishBody(metadata, crate),
        token,
        limit: 1024 * 1024
      });
      try {
        const response = record(JSON.parse(utf8(raw)));
        if (response.errors && (!Array.isArray(response.errors) || response.errors.length > 0)) outcome = "ambiguous-response-reconciled";
      } catch {
        outcome = "ambiguous-response-reconciled";
      }
    } catch (error) {
      if (error instanceof HttpError) {
        if ([401, 403].includes(error.status) || error.status >= 400 && error.status < 500 && ![400, 408, 409, 422, 429].includes(error.status)) throw error;
      } else if (!(error instanceof TransportError)) throw error;
      outcome = "ambiguous-response-reconciled";
    }
    return { ...await this.observe(name, version2, expected), upload: outcome };
  }
};

// src/staging.ts
function indexEntry(metadata, crate) {
  return canonical({
    name: metadata.name,
    vers: metadata.vers,
    cksum: digest(crate),
    yanked: false,
    v: 2,
    features: {},
    features2: metadata.features,
    links: metadata.links ?? null,
    rust_version: metadata.rust_version ?? null,
    deps: metadata.deps.map((dep) => ({
      name: dep.explicit_name_in_toml ?? dep.name,
      package: dep.explicit_name_in_toml ? dep.name : null,
      req: dep.version_req,
      features: dep.features,
      optional: dep.optional,
      default_features: dep.default_features,
      target: dep.target,
      kind: dep.kind,
      registry: null
    }))
  });
}
function configureStaging(home, index) {
  mkdirSync4(home, { recursive: true });
  writeFileSync3(join5(home, "config.toml"), `[source.crates-io]
replace-with = "zrelease-staging"
[source.zrelease-staging]
registry = "${index}"
`);
}
async function stagingRegistry(initial = [], upstream = new Http()) {
  const capsules = [...initial];
  let base = "";
  const server = createServer(async (request, response) => {
    const send = (status, data) => {
      response.writeHead(status, { "Content-Length": data.length });
      response.end(data);
    };
    try {
      requireThat(request.method === "GET" && !request.headers.authorization, "staging registry is read-only and anonymous");
      const path = request.url ?? "";
      if (path === "/index/config.json") {
        send(200, canonical({ dl: `${base}/crates/{crate}/{crate}-{version}.crate` }));
        return;
      }
      const archive = /^\/crates\/([A-Za-z0-9_-]+)\/\1-([0-9A-Za-z.-]+)\.crate$/.exec(path);
      if (archive) {
        const local = capsules.find((c) => c.candidate.package.name === archive[1] && c.candidate.package.version === archive[2]);
        send(200, local?.crate ?? await upstream.request("GET", "https://static.crates.io" + path, { limit: 100 * 1024 * 1024 }));
        return;
      }
      requireThat(/^\/index\/(?:[a-z0-9_-]+\/){1,2}[a-z0-9_-]+$/.test(path), "invalid index path");
      const locals = capsules.filter((c) => path === "/index/" + indexPath(c.candidate.package.name));
      let bytes = Buffer.alloc(0);
      try {
        bytes = await upstream.request("GET", "https://index.crates.io" + path.slice(6), { limit: 16 * 1024 * 1024 });
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 404 && locals.length)) throw error;
      }
      const versions = new Set(locals.map((c) => c.candidate.package.version));
      const entries = utf8(bytes).split(/\r?\n/).filter(Boolean).filter((line) => !versions.has(String(record(JSON.parse(line)).vers)));
      send(200, Buffer.concat([
        Buffer.from(entries.length ? entries.join("\n") + "\n" : ""),
        ...locals.map((c) => indexEntry(JSON.parse(utf8(c.metadata)), c.crate))
      ]));
    } catch (error) {
      send(error instanceof HttpError ? error.status : 400, Buffer.from("{}"));
    }
  });
  await new Promise((resolve5, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve5);
  });
  const address = server.address();
  requireThat(address && typeof address !== "string", "missing staging registry address");
  base = `http://127.0.0.1:${address.port}`;
  return {
    add: (capsule) => capsules.push(capsule),
    configure: (home) => configureStaging(home, `sparse+${base}/index/`),
    registry: new Registry(new Http(true), { index: base + "/index", download: base + "/crates", timeout: 2e3, interval: 10 }),
    close: () => new Promise((resolve5, reject) => {
      server.close((error) => error ? reject(error) : resolve5());
      server.closeAllConnections();
    })
  };
}

// src/consumer.ts
import { mkdirSync as mkdirSync5, readFileSync as readFileSync3, writeFileSync as writeFileSync4 } from "node:fs";
import { join as join6 } from "node:path";
function checkResolution(value, name, version2) {
  const metadata = record(value), resolution = record(metadata.resolve);
  requireThat(Array.isArray(resolution.nodes) && Array.isArray(metadata.packages), "invalid Cargo resolution");
  const node = resolution.nodes.map((n) => record(n)).find((n) => n.id === resolution.root);
  requireThat(node && Array.isArray(node.deps), "consumer resolution has no root");
  const matches = node.deps.map((d) => record(d)).filter((d) => d.name === "subject");
  requireThat(matches.length === 1, "consumer did not resolve the subject dependency exactly once");
  const selected = metadata.packages.map((p) => record(p)).find((p) => p.id === matches[0].pkg);
  requireThat(selected?.name === name && selected.version === version2, "consumer resolved a different package/version");
  requireThat(selected.source === "registry+https://github.com/rust-lang/crates.io-index", "consumer used a path, Git, or alternate-registry dependency");
}
async function runConsumer(candidate, capsule, configure) {
  const { name, version: version2 } = candidate.package;
  return temporary("zrelease-consumer-", async (work) => {
    const project = join6(work, "consumer");
    mkdirSync5(join6(project, "src"), { recursive: true });
    const config = candidate.consumer;
    const manifest = `[package]
name = "zrelease-consumer"
version = "0.0.0"
edition = "2021"
publish = false

[dependencies]
subject = { package = ${JSON.stringify(name)}, version = ${JSON.stringify("=" + version2)}, default-features = ${config.default_features}, features = ${JSON.stringify(config.features)} }
`;
    writeFileSync4(join6(project, "Cargo.toml"), manifest);
    writeFileSync4(join6(project, "src", "main.rs"), readFileSync3(join6(capsule, "smoke.rs")));
    const env = cargoEnvironment(join6(work, "cargo-home"), join6(work, "target"));
    configure?.(env.CARGO_HOME);
    const cargo = ["cargo", "+" + candidate.toolchain.requested];
    await run([...cargo, "generate-lockfile"], { cwd: project, env });
    const metadata = JSON.parse(await run([...cargo, "metadata", "--locked", "--format-version", "1"], { cwd: project, env }));
    checkResolution(metadata, name, version2);
    for (const command of ["build", "test", "run"]) await run([...cargo, command, "--locked"], { cwd: project, env });
    return readFileSync3(join6(project, "Cargo.lock"));
  });
}

// src/prepare.ts
async function prepare(options) {
  const source = realpathSync3(options.source), outputDir = resolve2(options.outputDir);
  const { package: name, toolchain, repository, commit, ref, pipelineRef } = options;
  const { manifest = "Cargo.toml", publishing = false, tagPrefix = "v", baseBranch = "main", smoke = "", features = [], defaultFeatures = true } = options;
  valid(NAME, name, "package");
  valid(TOOLCHAIN, toolchain, "pinned Rust toolchain");
  valid(REPO, repository, "repository");
  valid(SHA, commit, "commit");
  valid(SHA, pipelineRef, "pipeline revision");
  requireThat(!existsSync(outputDir), "capsule output directory already exists");
  requireThat(!inside(source, outputDir), "capsule output must be outside the source checkout");
  const path = within(source, manifest);
  requireThat(basename2(path) === "Cargo.toml", "manifest path must end in Cargo.toml");
  requireThat(await run(["git", "rev-parse", "HEAD"], { cwd: source }) === commit, "checkout does not match the triggering commit");
  requireThat(!await run(["git", "status", "--porcelain", "--untracked-files=all"], { cwd: source }), "source checkout is dirty");
  if (baseBranch) {
    await run(["git", "check-ref-format", `refs/heads/${baseBranch}`], { cwd: source });
    await run(["git", "merge-base", "--is-ancestor", commit, `refs/remotes/origin/${baseBranch}`], { cwd: source });
  }
  requireThat(Array.isArray(features) && features.every((f) => typeof f === "string" && f && !/[\n\r, ]/.test(f)), "features must be an array of nonempty individual feature names");
  const staging = await stagingRegistry(publishing ? [] : options.dependencies);
  try {
    const candidate = await temporary("zrelease-prepare-", async (work) => {
      const env = cargoEnvironment(join7(work, "cargo-home"), join7(work, "target"));
      if (!publishing && options.dependencies?.length) staging.configure(env.CARGO_HOME);
      const cargo = ["cargo", `+${toolchain}`];
      const rustc = await run(["rustc", `+${toolchain}`, "--version", "--verbose"], { cwd: work, env });
      const cargoVersion = await run([...cargo, "--version"], { cwd: work, env });
      const raw = await run([...cargo, "metadata", "--no-deps", "--locked", "--format-version", "1", "--manifest-path", path], { cwd: source, env });
      const metadata = record(JSON.parse(raw));
      requireThat(Array.isArray(metadata.workspace_members) && Array.isArray(metadata.packages), "invalid Cargo workspace metadata");
      const members = new Set(metadata.workspace_members);
      const selected = metadata.packages.map((p) => record(p)).filter((p) => p.name === name && members.has(p.id));
      requireThat(selected.length === 1, "package must select exactly one workspace member");
      const pkg = selected[0];
      const vers = version(pkg.version);
      requireThat(Array.isArray(pkg.targets) && pkg.targets.some((t) => {
        const target = record(t);
        return Array.isArray(target.kind) && target.kind.some((k) => ["lib", "rlib", "proc-macro"].includes(k));
      }), "this pipeline supports library crates, not binary-only packages");
      requireThat(pkg.publish === null || Array.isArray(pkg.publish) && pkg.publish.length === 1 && pkg.publish[0] === "crates-io", "selected package forbids publication to crates.io");
      if (publishing && !options.plan) {
        requireThat(ref === `refs/tags/${tagPrefix}${vers}`, "live publication requires a tag that exactly matches the package version");
        requireThat(await run(["git", "rev-parse", `${ref}^{commit}`], { cwd: source }) === commit, "release tag does not resolve to the triggering commit");
      }
      const flags = defaultFeatures ? [] : ["--no-default-features"];
      if (features.length) flags.push("--features", features.join(","));
      const checks = [];
      for (const command of ["test", "package"]) {
        const argv2 = [...cargo, command, "--locked", "--manifest-path", path, "--package", name, ...flags];
        await run(argv2, { cwd: source, env });
        checks.push({ argv: argv2, exit_code: 0 });
      }
      const crate = readFileSync4(join7(work, "target", "package", `${name}-${vers}.crate`));
      const files = await archiveFiles(crate, name, vers);
      const publishMetadata = normalizedMetadata(files, name, vers);
      const vcsBytes = files.get(".cargo_vcs_info.json");
      if (vcsBytes) {
        const git = record(record(JSON.parse(utf8(vcsBytes))).git);
        requireThat(git.sha1 === commit, "archive VCS revision does not match candidate source");
        requireThat(!git.dirty, "archive records a dirty source checkout");
      }
      requireThat(canonical(publishMetadata.features).equals(canonical(pkg.features)), "feature translation disagrees with cargo metadata; stop rather than publish");
      const unpacked = join7(work, "unpacked");
      extractFiles(files, unpacked);
      const archiveEnv = cargoEnvironment(join7(work, "archive-cargo-home"), join7(work, "archive-target"));
      if (!publishing && options.dependencies?.length) staging.configure(archiveEnv.CARGO_HOME);
      const argv = [...cargo, "test", "--locked", ...flags];
      await run(argv, { cwd: unpacked, env: archiveEnv });
      checks.push({ argv, scope: "exact packaged archive", exit_code: 0 });
      requireThat(!await run(["git", "status", "--porcelain", "--untracked-files=all"], { cwd: source }), "qualification modified the source checkout");
      requireThat(await run(["git", "rev-parse", "HEAD"], { cwd: source }) === commit, "qualification changed the checked-out revision");
      const smokeBytes = smoke ? readFileSync4(within(source, smoke)) : Buffer.from("extern crate subject;\nfn main() {}\n");
      requireThat(smokeBytes.length <= 256 * 1024, "consumer smoke source is too large");
      utf8(smokeBytes);
      mkdirSync6(outputDir, { recursive: true });
      const payloads = { "package.crate": crate, "publish.json": canonical(publishMetadata), "smoke.rs": smokeBytes };
      for (const [filename, data] of Object.entries(payloads)) writeFileSync5(join7(outputDir, filename), data);
      const result = {
        schema: SCHEMA,
        created_at: utcNow(),
        package: { name, version: vers },
        source: { repository, commit, ref },
        ...options.plan ? { release_plan_sha256: digest(canonical(options.plan)) } : {},
        pipeline: { repository: "zsumz/zrelease", revision: pipelineRef },
        toolchain: { requested: toolchain, rustc, cargo: cargoVersion },
        consumer: { features, default_features: defaultFeatures },
        qualification: { checks, note: "The caller must additionally gate its domain-specific canonical CI." },
        files: Object.fromEntries(Object.entries(payloads).map(([k, v]) => [k, { sha256: digest(v), size: v.length }]))
      };
      if (options.plan) {
        bindCandidate(options.plan, result);
        requireThat(options.plan.publishing === publishing, "release plan publish mode mismatch");
      }
      staging.add({ candidate: result, crate, metadata: payloads["publish.json"], smoke: smokeBytes });
      await runConsumer(result, outputDir, staging.configure);
      requireThat(!await run(["git", "status", "--porcelain", "--untracked-files=all"], { cwd: source }), "consumer modified the source checkout");
      requireThat(await run(["git", "rev-parse", "HEAD"], { cwd: source }) === commit, "consumer changed the checked-out revision");
      for (const [filename, data] of Object.entries(payloads)) requireThat(readFileSync4(join7(outputDir, filename)).equals(data), "consumer modified a sealed payload");
      for (const command of ["build", "test", "run"]) checks.push({ argv: [...cargo, command, "--locked"], scope: "fresh consumer against exact staged archives", exit_code: 0 });
      writeJson(join7(outputDir, "candidate.json"), result);
      return result;
    });
    const sha = digest(readFileSync4(join7(outputDir, "candidate.json")));
    output({ candidate_sha256: sha, crate_sha256: candidate.files["package.crate"].sha256, version: candidate.package.version, package: name });
    console.log(`Candidate SHA-256: ${sha}`);
    return candidate;
  } finally {
    await staging.close();
  }
}

// src/workspace.ts
async function prepareWorkspace(options) {
  const root = resolve3(options.out);
  requireThat(!existsSync2(root), "workspace output already exists");
  requireThat(!inside(resolve3(options.source), root), "workspace output must be outside the source checkout");
  mkdirSync7(root, { recursive: true });
  const plan = await planRelease({ ...options, publishing: false, out: join8(root, "release-plan.json") });
  requireThat(Object.keys(options.smokes).every((name) => plan.packages.some((p) => p.name === name)), "smoke source names an unselected crate");
  const index = { schema: "zrelease.workspace/v1", plan_sha256: digest(canonical(plan)), packages: [] };
  const capsules = /* @__PURE__ */ new Map();
  for (const pkg of plan.packages) {
    console.log(`::group::Package ${pkg.name} ${pkg.version}`);
    try {
      const directory = join8(root, "candidates", pkg.name);
      await prepare({
        ...options,
        package: pkg.name,
        plan,
        publishing: false,
        outputDir: directory,
        smoke: options.smokes[pkg.name] ?? "",
        dependencies: dependencyNames(plan, pkg.name).map((name) => capsules.get(name))
      });
      const sha256 = digest(readFileSync5(join8(directory, "candidate.json")));
      capsules.set(pkg.name, await load(directory, sha256));
      index.packages.push({ name: pkg.name, sha256 });
    } finally {
      console.log("::endgroup::");
    }
  }
  writeJson(join8(root, "workspace.json"), index);
  output({ workspace_sha256: digest(canonical(index)) });
  return index;
}
async function loadWorkspace(root, expected, bindings = {}) {
  const bytes = readRegular(join8(root, "workspace.json"), 4 * 1024 * 1024);
  requireThat(digest(bytes) === expected, "workspace digest mismatch");
  const raw = record(JSON.parse(utf8(bytes)));
  requireThat(raw.schema === "zrelease.workspace/v1" && typeof raw.plan_sha256 === "string", "invalid workspace bundle");
  const plan = readPlan(join8(root, "release-plan.json"), raw.plan_sha256, bindings);
  requireThat(plan.publishing === false, "workspace rehearsal cannot use a publishing plan");
  requireThat(Array.isArray(raw.packages) && raw.packages.length === plan.packages.length, "workspace release set differs from plan");
  const capsules = [];
  for (let i = 0; i < plan.packages.length; i++) {
    const pkg = record(raw.packages[i]);
    const name = plan.packages[i].name;
    requireThat(pkg.name === name && typeof pkg.sha256 === "string", "workspace order differs from plan");
    const capsule = await load(join8(root, "candidates", name), pkg.sha256, { ...bindings, package: name });
    bindCandidate(plan, capsule.candidate);
    requireThat(capsule.candidate.release_plan_sha256 === raw.plan_sha256, "candidate belongs to another release plan");
    capsules.push(capsule);
  }
  return { index: raw, plan, capsules };
}

// src/workspace-rehearsal.ts
import { appendFileSync as appendFileSync4, mkdirSync as mkdirSync8 } from "node:fs";
import { join as join10 } from "node:path";

// src/deployment.ts
var Deployments = class {
  base;
  token;
  http;
  constructor(repository, token, http = new Http()) {
    valid(REPO, repository, "GitHub repository");
    requireThat(token, "GITHUB_TOKEN is required for deployment tracking");
    this.base = `https://api.github.com/repos/${repository}`;
    this.token = token;
    this.http = http;
  }
  async post(path, payload) {
    return JSON.parse(utf8(await this.http.request("POST", this.base + path, { body: canonical(payload), token: this.token, github: true, limit: 4 * 1024 * 1024 })));
  }
  async begin(candidate, sha, runUrl, production) {
    valid(DIGEST, sha, "candidate digest");
    const { name, version: version2 } = candidate.package;
    const response = await this.post("/deployments", {
      ref: candidate.source.commit,
      task: "deploy:crate",
      auto_merge: false,
      required_contexts: [],
      environment: `${production ? "crates.io" : "rehearsal"}/${name}`,
      description: `${name} ${version2}` + (production ? "" : " (no-publish rehearsal)"),
      transient_environment: false,
      production_environment: production,
      payload: {
        schema: "zrelease.deployment/v1",
        package: candidate.package,
        candidate_sha256: sha,
        release_plan_sha256: candidate.release_plan_sha256 ?? null,
        run_url: runUrl,
        production
      }
    });
    const id = response.id;
    requireThat(typeof id === "number" && Number.isSafeInteger(id) && id > 0, "GitHub did not return a deployment ID");
    output({ deployment_id: id });
    await this.status(id, "in_progress", runUrl, runUrl, "Qualified; waiting for publishing or rehearsal");
    return id;
  }
  async status(id, state, runUrl, environmentUrl, description) {
    requireThat(Number.isSafeInteger(id) && id > 0 && ["in_progress", "success", "failure", "error"].includes(state), "invalid deployment status");
    requireThat(runUrl.startsWith("https://github.com/") && environmentUrl.startsWith("https://"), "deployment URLs must use HTTPS");
    return this.post(`/deployments/${id}/statuses`, {
      state,
      auto_inactive: false,
      log_url: runUrl,
      environment_url: environmentUrl,
      description: description.slice(0, 140)
    });
  }
};
function terminalState(results, production) {
  const keys = production ? ["publish", "verify"] : ["rehearse"];
  const relevant = keys.map((k) => results[k] ?? "skipped");
  if (relevant.every((r) => r === "success")) return ["success", production ? "consumer-verified" : "rehearsed"];
  if (relevant.includes("cancelled")) return ["error", "interrupted"];
  if (production && results.publish === "success") return ["failure", "published-but-unverified"];
  return ["failure", production ? "delivery-unconfirmed" : "rehearsal-failed"];
}

// src/finish.ts
import { appendFileSync as appendFileSync3, existsSync as existsSync3 } from "node:fs";
import { join as join9 } from "node:path";
function verifiedEvidence(candidate, candidateSha, observations, production) {
  try {
    const matchesIdentity = (report) => canonical(report.package).equals(canonical(candidate.package)) && canonical(report.source).equals(canonical(candidate.source));
    const matchesRegistry = (value) => {
      const report = record(value);
      return report.state === "registry-verified" && report.sha256 === candidate.files["package.crate"].sha256 && report.bytes === candidate.files["package.crate"].size && report.version_url === `https://crates.io/crates/${candidate.package.name}/${candidate.package.version}`;
    };
    if (production) {
      const consumer = record(observations["consumer.json"]);
      const checks = consumer.checks;
      return record(observations["registry.json"]).candidate_sha256 === candidateSha && matchesRegistry(observations["registry.json"]) && consumer.candidate_sha256 === candidateSha && consumer.schema === "zrelease.consumer/v1" && consumer.state === "consumer-verified" && matchesIdentity(consumer) && matchesRegistry(consumer.registry) && typeof consumer.cargo_lock_sha256 === "string" && DIGEST.test(consumer.cargo_lock_sha256) && Array.isArray(checks) && ["exact registry resolution", "build --locked", "test --locked", "run --locked"].every((check) => checks.includes(check));
    }
    const rehearsal = record(observations["rehearsal.json"]);
    return rehearsal.candidate_sha256 === candidateSha && rehearsal.schema === "zrelease.rehearsal/v1" && rehearsal.state === "rehearsed" && rehearsal.published === false && matchesIdentity(rehearsal) && rehearsal.crate_sha256 === candidate.files["package.crate"].sha256 && rehearsal.upload_count === 1 && rehearsal.first_upload === "ambiguous-response-reconciled" && rehearsal.retry === "already-present-identical";
  } catch {
    return false;
  }
}
async function finish(candidate, options, api) {
  const { candidateSha, production, deploymentId, runUrl, resultsJson, reports, out } = options;
  requireThat(Number.isSafeInteger(deploymentId) && deploymentId > 0, "invalid deployment ID");
  const results = {};
  for (const [key, value] of Object.entries(record(JSON.parse(resultsJson), "job results"))) {
    const result = typeof value === "string" ? value : record(value).result;
    requireThat(typeof result === "string" && ["success", "failure", "cancelled", "skipped"].includes(result), "invalid job result");
    results[key] = result;
  }
  let [status, phase] = terminalState(results, production);
  const observations = {};
  if (reports) {
    for (const filename of ["registry.json", "consumer.json", "rehearsal.json"]) {
      const path = join9(reports, filename);
      if (existsSync3(path)) {
        try {
          observations[filename] = readJson(path);
        } catch {
          observations[filename] = { error: "Invalid report" };
        }
      }
    }
  }
  const needed = production ? ["registry.json", "consumer.json"] : ["rehearsal.json"];
  if (status === "success" && !needed.every((k) => Object.hasOwn(observations, k))) {
    status = "failure";
    phase = "missing-verification-evidence";
  } else if (status === "success" && !verifiedEvidence(candidate, candidateSha, observations, production)) {
    status = "failure";
    phase = "invalid-verification-evidence";
  }
  const receipt = {
    schema: "zrelease.receipt/v1",
    candidate_sha256: candidateSha,
    package: candidate.package,
    release_plan_sha256: candidate.release_plan_sha256 ?? null,
    source: candidate.source,
    pipeline: candidate.pipeline,
    crate_sha256: candidate.files["package.crate"].sha256,
    phase,
    deployment_status: status,
    deployment_id: deploymentId,
    production,
    run_url: runUrl,
    finished_at: utcNow(),
    jobs: results,
    observations,
    recovery: status === "success" ? null : "Do not assume rollback. Inspect crates.io, retain this capsule, and rerun failed jobs with the same candidate."
  };
  writeJson(out, receipt);
  const { name, version: version2 } = candidate.package;
  const url = production ? `https://crates.io/crates/${name}/${version2}` : runUrl;
  await api().status(deploymentId, status, runUrl, url, `${name} ${version2}: ${phase}` + (production ? "" : "; nothing published"));
  output({ deployment_status: status, phase });
  if (process.env.GITHUB_STEP_SUMMARY && options.summary !== false) {
    const message = status === "success" && production ? "Registry delivery and consumer checks completed.\n" : !production ? "This was a rehearsal; no package was published.\n" : "Delivery needs investigation. A failed workflow does not undo a registry write.\n";
    appendFileSync3(process.env.GITHUB_STEP_SUMMARY, `## ${name} ${version2}

**${phase}**

Candidate: \`${candidateSha}\`

Crate: \`${receipt.crate_sha256}\`

${message}`);
  }
}

// src/mock.ts
import { createServer as createServer2 } from "node:http";
var State = class {
  versions = /* @__PURE__ */ new Map();
  puts = 0;
  failAfterAccept = false;
  hideReads = 0;
  yanked = false;
  tamperDownload = false;
  requests = [];
};
function decodeUpload(body) {
  requireThat(body.length >= 8, "truncated upload");
  const length = body.readUInt32LE(0);
  requireThat(4 + length + 4 <= body.length, "truncated publish metadata");
  const metadata = record(JSON.parse(utf8(body.subarray(4, 4 + length))));
  const size = body.readUInt32LE(4 + length);
  const crate = body.subarray(8 + length);
  requireThat(crate.length === size, "invalid crate framing");
  return { metadata, crate };
}
async function registryServer() {
  const state = new State();
  let base = "";
  const send = (response, code, body = Buffer.from("{}")) => {
    response.writeHead(code, { "Content-Length": body.length });
    response.end(body);
  };
  const server = createServer2(async (request, response) => {
    const path = request.url ?? "";
    state.requests.push([request.method ?? "", path, Boolean(request.headers.authorization)]);
    try {
      if (request.method === "PUT") {
        if (path !== "/api/v1/crates/new" || request.headers.authorization !== "rehearsal-only") {
          send(response, 403);
          return;
        }
        const length = Number(request.headers["content-length"]);
        if (!(length > 0 && length <= MAX_CRATE + 4 * 1024 * 1024)) {
          send(response, 413);
          return;
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          requireThat(size <= length, "oversized mock upload");
          chunks.push(chunk);
        }
        const { metadata, crate } = decodeUpload(Buffer.concat(chunks));
        requireThat(typeof metadata.name === "string" && typeof metadata.vers === "string", "invalid upload identity");
        state.puts++;
        const key = `${metadata.name}@${metadata.vers}`;
        if (state.versions.has(key)) {
          send(response, 409);
          return;
        }
        state.versions.set(key, { metadata, crate });
        send(response, state.failAfterAccept ? 500 : 200, Buffer.from('{"warnings":{}}'));
        return;
      }
      if (request.method === "GET") {
        if (state.hideReads > 0) {
          state.hideReads--;
          send(response, 404);
          return;
        }
        if (path === "/index/config.json") {
          send(response, 200, canonical({ dl: `${base}/crates/{crate}/{crate}-{version}.crate` }));
          return;
        }
        for (const { metadata, crate } of state.versions.values()) {
          const name = String(metadata.name), vers = String(metadata.vers);
          if (path === `/index/${indexPath(name)}`) {
            const entries = [...state.versions.values()].filter((v) => v.metadata.name === name).map((v) => {
              const entry = JSON.parse(utf8(indexEntry(v.metadata, v.crate)));
              return canonical({ ...entry, yanked: state.yanked });
            });
            send(response, 200, Buffer.concat(entries));
            return;
          }
          if (path === `/crates/${name}/${name}-${vers}.crate`) {
            send(response, 200, state.tamperDownload ? Buffer.concat([crate, Buffer.from("tampered")]) : crate);
            return;
          }
        }
      }
      send(response, 404);
    } catch {
      if (!response.headersSent) send(response, 400);
      else response.destroy();
    }
  });
  await new Promise((resolve5, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve5);
  });
  const address = server.address();
  requireThat(address && typeof address !== "string", "missing mock address");
  base = `http://127.0.0.1:${address.port}`;
  return {
    state,
    registry: new Registry(new Http(true), { api: base, index: base + "/index", download: base + "/crates", timeout: 2e3, interval: 10 }),
    configure: (home) => configureStaging(home, `sparse+${base}/index/`),
    close: () => new Promise((resolve5, reject) => {
      server.close((error) => error ? reject(error) : resolve5());
      server.closeAllConnections();
    })
  };
}
async function rehearse(candidate, crate, metadata) {
  const { registry, state, close } = await registryServer();
  try {
    state.failAfterAccept = true;
    const first = await registry.publish(candidate, crate, metadata, "rehearsal-only");
    const second = await registry.publish(candidate, crate, metadata, "rehearsal-only");
    requireThat(state.puts === 1, "rehearsal unexpectedly repeated an upload");
    requireThat(!state.requests.some(([method, , authorized]) => method === "GET" && authorized), "credential leaked to a read endpoint");
    return {
      schema: "zrelease.rehearsal/v1",
      state: "rehearsed",
      published: false,
      candidate_sha256: digest(canonical(candidate)),
      package: candidate.package,
      source: candidate.source,
      crate_sha256: candidate.files["package.crate"].sha256,
      first_upload: first.upload,
      retry: second.upload,
      upload_count: state.puts,
      checks: ["exact payload upload", "ambiguous response reconciliation", "idempotent retry", "anonymous registry reads"],
      note: "Loopback protocol rehearsal; NOT crates.io, OIDC, or an end-to-end production qualification."
    };
  } finally {
    await close();
  }
}

// src/workspace-rehearsal.ts
async function rehearseWorkspace(bundle, out, track, protocol = rehearse) {
  mkdirSync8(out, { recursive: true });
  const completed = [];
  const api = () => new Deployments(bundle.plan.source.repository, process.env.GITHUB_TOKEN ?? "");
  const runUrl = `https://github.com/${bundle.plan.source.repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync4(
    process.env.GITHUB_STEP_SUMMARY,
    "## Workspace rehearsal\n\nNothing is published to crates.io.\n\n| Crate | Version | Outcome |\n| --- | --- | --- |\n"
  );
  for (let i = 0; i < bundle.capsules.length; i++) {
    const capsule = bundle.capsules[i];
    const { candidate, crate, metadata } = capsule;
    const candidateSha = bundle.index.packages[i].sha256;
    const name = candidate.package.name;
    const reports = join10(out, name);
    mkdirSync8(reports, { recursive: true });
    console.log(`::group::Rehearse ${name} ${candidate.package.version}`);
    let deploymentId;
    try {
      if (track) deploymentId = await api().begin(candidate, candidateSha, runUrl, false);
      writeJson(join10(reports, "rehearsal.json"), { ...await protocol(candidate, crate, metadata), candidate_sha256: candidateSha });
      if (deploymentId) await finish(candidate, {
        candidateSha,
        production: false,
        deploymentId,
        runUrl,
        reports,
        summary: false,
        resultsJson: JSON.stringify({ qualify: "success", track: "success", rehearse: "success" }),
        out: join10(reports, "release.json")
      }, api);
      completed.push(name);
      writeJson(join10(out, "workspace-rehearsal.json"), {
        schema: "zrelease.workspace-rehearsal/v1",
        published: false,
        source: bundle.plan.source,
        completed,
        state: completed.length === bundle.capsules.length ? "rehearsed" : "in-progress"
      });
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync4(
        process.env.GITHUB_STEP_SUMMARY,
        `| ${name} | ${candidate.package.version} | Rehearsed |
`
      );
    } catch (error) {
      writeJson(join10(out, "workspace-rehearsal.json"), {
        schema: "zrelease.workspace-rehearsal/v1",
        published: false,
        source: bundle.plan.source,
        completed,
        failed: name,
        state: "failed"
      });
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync4(
        process.env.GITHUB_STEP_SUMMARY,
        `| ${name} | ${candidate.package.version} | Failed; later crates stopped |
`
      );
      if (deploymentId) await finish(candidate, {
        candidateSha,
        production: false,
        deploymentId,
        runUrl,
        reports,
        summary: false,
        resultsJson: JSON.stringify({ qualify: "success", track: "success", rehearse: "failure" }),
        out: join10(reports, "release.json")
      }, api);
      throw error;
    } finally {
      console.log("::endgroup::");
    }
  }
}

// src/workspace-cli.ts
async function main(args = process.argv.slice(2)) {
  try {
    const [command, ...rest] = args;
    requireThat(["prepare", "check", "rehearse"].includes(command ?? ""), "workspace supports prepare, check and rehearse only");
    const { values } = parseArgs({ args: rest, options: {
      source: { type: "string" },
      out: { type: "string" },
      bundle: { type: "string" },
      sha: { type: "string" },
      toolchain: { type: "string" },
      repository: { type: "string", default: process.env.GITHUB_REPOSITORY },
      commit: { type: "string", default: process.env.GITHUB_SHA },
      ref: { type: "string", default: process.env.GITHUB_REF },
      "pipeline-ref": { type: "string", default: process.env.PIPELINE_REF },
      "base-branch": { type: "string", default: "main" },
      manifest: { type: "string", default: "Cargo.toml" },
      "tag-prefix": { type: "string", default: "v" },
      "members-json": { type: "string" },
      workspace: { type: "boolean" },
      "smokes-json": { type: "string", default: "{}" },
      track: { type: "boolean", default: false }
    } });
    const text = (key) => {
      const value = values[key];
      requireThat(typeof value === "string" && value !== "", `--${key} is required`);
      return value;
    };
    if (command === "prepare") {
      const members = JSON.parse(text("members-json"));
      requireThat(Array.isArray(members), "members-json must be an array");
      const rawSmokes = record(JSON.parse(text("smokes-json")));
      const smokes = Object.fromEntries(Object.entries(rawSmokes).map(([name, value]) => {
        requireThat(typeof value === "string", "smoke sources must be paths");
        return [name, value];
      }));
      await prepareWorkspace({
        source: text("source"),
        out: text("out"),
        toolchain: text("toolchain"),
        repository: text("repository"),
        commit: text("commit"),
        ref: text("ref"),
        pipelineRef: text("pipeline-ref"),
        baseBranch: values["base-branch"] ?? "main",
        manifest: text("manifest"),
        tagPrefix: text("tag-prefix"),
        workspace: values.workspace,
        smokes,
        members: members.map((value) => {
          const pkg = record(value);
          requireThat(typeof pkg.name === "string", "member name required");
          return { name: pkg.name, needs: strings(pkg.needs, "dependencies") };
        })
      });
    } else {
      const bundle = await loadWorkspace(text("bundle"), text("sha"), {
        repository: values.repository,
        commit: values.commit,
        pipelineRef: values["pipeline-ref"]
      });
      if (command === "rehearse") await rehearseWorkspace(bundle, text("out"), values.track === true);
      else console.log(`Verified ${bundle.capsules.length} workspace candidates.`);
    }
    return 0;
  } catch (error) {
    console.error(`workspace: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
if (process.argv[1] && resolve4(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
export {
  main
};
/*! Bundled license information:

smol-toml/dist/date.js:
smol-toml/dist/error.js:
smol-toml/dist/util.js:
smol-toml/dist/primitive.js:
smol-toml/dist/extract.js:
smol-toml/dist/struct.js:
smol-toml/dist/parse.js:
smol-toml/dist/stringify.js:
smol-toml/dist/index.js:
  (*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *)
*/
