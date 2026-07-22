var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/stripe/cjs/crypto/CryptoProvider.js
var require_CryptoProvider = __commonJS({
  "node_modules/stripe/cjs/crypto/CryptoProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CryptoProviderOnlySupportsAsyncError = exports2.CryptoProvider = void 0;
    var CryptoProvider = class {
      /**
       * Computes a SHA-256 HMAC given a secret and a payload (encoded in UTF-8).
       * The output HMAC should be encoded in hexadecimal.
       *
       * Sample values for implementations:
       * - computeHMACSignature('', 'test_secret') => 'f7f9bd47fb987337b5796fdc1fdb9ba221d0d5396814bfcaf9521f43fd8927fd'
       * - computeHMACSignature('\ud83d\ude00', 'test_secret') => '837da296d05c4fe31f61d5d7ead035099d9585a5bcde87de952012a78f0b0c43
       */
      computeHMACSignature(payload, secret) {
        throw new Error("computeHMACSignature not implemented.");
      }
      /**
       * Asynchronous version of `computeHMACSignature`. Some implementations may
       * only allow support async signature computation.
       *
       * Computes a SHA-256 HMAC given a secret and a payload (encoded in UTF-8).
       * The output HMAC should be encoded in hexadecimal.
       *
       * Sample values for implementations:
       * - computeHMACSignature('', 'test_secret') => 'f7f9bd47fb987337b5796fdc1fdb9ba221d0d5396814bfcaf9521f43fd8927fd'
       * - computeHMACSignature('\ud83d\ude00', 'test_secret') => '837da296d05c4fe31f61d5d7ead035099d9585a5bcde87de952012a78f0b0c43
       */
      computeHMACSignatureAsync(payload, secret) {
        throw new Error("computeHMACSignatureAsync not implemented.");
      }
      /**
       * Computes a SHA-256 hash of the data.
       */
      computeSHA256Async(data) {
        throw new Error("computeSHA256 not implemented.");
      }
    };
    exports2.CryptoProvider = CryptoProvider;
    var CryptoProviderOnlySupportsAsyncError = class extends Error {
    };
    exports2.CryptoProviderOnlySupportsAsyncError = CryptoProviderOnlySupportsAsyncError;
  }
});

// node_modules/stripe/cjs/crypto/NodeCryptoProvider.js
var require_NodeCryptoProvider = __commonJS({
  "node_modules/stripe/cjs/crypto/NodeCryptoProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NodeCryptoProvider = void 0;
    var crypto2 = require("crypto");
    var CryptoProvider_js_1 = require_CryptoProvider();
    var NodeCryptoProvider = class extends CryptoProvider_js_1.CryptoProvider {
      /** @override */
      computeHMACSignature(payload, secret) {
        return crypto2.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
      }
      /** @override */
      async computeHMACSignatureAsync(payload, secret) {
        const signature = await this.computeHMACSignature(payload, secret);
        return signature;
      }
      /** @override */
      async computeSHA256Async(data) {
        return new Uint8Array(await crypto2.createHash("sha256").update(data).digest());
      }
    };
    exports2.NodeCryptoProvider = NodeCryptoProvider;
  }
});

// node_modules/stripe/cjs/net/HttpClient.js
var require_HttpClient = __commonJS({
  "node_modules/stripe/cjs/net/HttpClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.HttpClientResponse = exports2.HttpClient = void 0;
    var HttpClient = class _HttpClient {
      /** The client name used for diagnostics. */
      getClientName() {
        throw new Error("getClientName not implemented.");
      }
      makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
        throw new Error("makeRequest not implemented.");
      }
      /** Helper to make a consistent timeout error across implementations. */
      static makeTimeoutError() {
        const timeoutErr = new TypeError(_HttpClient.TIMEOUT_ERROR_CODE);
        timeoutErr.code = _HttpClient.TIMEOUT_ERROR_CODE;
        return timeoutErr;
      }
    };
    exports2.HttpClient = HttpClient;
    HttpClient.CONNECTION_CLOSED_ERROR_CODES = ["ECONNRESET", "EPIPE"];
    HttpClient.TIMEOUT_ERROR_CODE = "ETIMEDOUT";
    var HttpClientResponse = class {
      constructor(statusCode, headers) {
        this._statusCode = statusCode;
        this._headers = headers;
      }
      getStatusCode() {
        return this._statusCode;
      }
      getHeaders() {
        return this._headers;
      }
      getRawResponse() {
        throw new Error("getRawResponse not implemented.");
      }
      toStream(streamCompleteCallback) {
        throw new Error("toStream not implemented.");
      }
      toJSON() {
        throw new Error("toJSON not implemented.");
      }
    };
    exports2.HttpClientResponse = HttpClientResponse;
  }
});

// node_modules/stripe/cjs/net/NodeHttpClient.js
var require_NodeHttpClient = __commonJS({
  "node_modules/stripe/cjs/net/NodeHttpClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NodeHttpClientResponse = exports2.NodeHttpClient = void 0;
    var http_ = require("http");
    var https_ = require("https");
    var HttpClient_js_1 = require_HttpClient();
    var http = http_.default || http_;
    var https = https_.default || https_;
    var defaultHttpAgent = new http.Agent({ keepAlive: true });
    var defaultHttpsAgent = new https.Agent({ keepAlive: true });
    var NodeHttpClient = class extends HttpClient_js_1.HttpClient {
      constructor(agent) {
        super();
        this._agent = agent;
      }
      /** @override. */
      getClientName() {
        return "node";
      }
      makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
        const isInsecureConnection = protocol === "http";
        let agent = this._agent;
        if (!agent) {
          agent = isInsecureConnection ? defaultHttpAgent : defaultHttpsAgent;
        }
        const requestPromise = new Promise((resolve, reject) => {
          const req = (isInsecureConnection ? http : https).request({
            host,
            port,
            path,
            method,
            agent,
            headers,
            ciphers: "DEFAULT:!aNULL:!eNULL:!LOW:!EXPORT:!SSLv2:!MD5"
          });
          req.setTimeout(timeout, () => {
            req.destroy(HttpClient_js_1.HttpClient.makeTimeoutError());
          });
          req.on("response", (res) => {
            resolve(new NodeHttpClientResponse(res));
          });
          req.on("error", (error) => {
            reject(error);
          });
          req.once("socket", (socket) => {
            if (socket.connecting) {
              socket.once(isInsecureConnection ? "connect" : "secureConnect", () => {
                req.write(requestData);
                req.end();
              });
            } else {
              req.write(requestData);
              req.end();
            }
          });
        });
        return requestPromise;
      }
    };
    exports2.NodeHttpClient = NodeHttpClient;
    var NodeHttpClientResponse = class extends HttpClient_js_1.HttpClientResponse {
      constructor(res) {
        super(res.statusCode, res.headers || {});
        this._res = res;
      }
      getRawResponse() {
        return this._res;
      }
      toStream(streamCompleteCallback) {
        this._res.once("end", () => streamCompleteCallback());
        return this._res;
      }
      toJSON() {
        return new Promise((resolve, reject) => {
          let response = "";
          this._res.setEncoding("utf8");
          this._res.on("data", (chunk) => {
            response += chunk;
          });
          this._res.once("end", () => {
            try {
              resolve(JSON.parse(response));
            } catch (e) {
              if (e instanceof Error) {
                e.rawBody = response;
              }
              reject(e);
            }
          });
        });
      }
    };
    exports2.NodeHttpClientResponse = NodeHttpClientResponse;
  }
});

// node_modules/stripe/cjs/Types.js
var require_Types = __commonJS({
  "node_modules/stripe/cjs/Types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DEFAULT_BASE_ADDRESSES = void 0;
    exports2.DEFAULT_BASE_ADDRESSES = {
      api: "api.stripe.com",
      files: "files.stripe.com",
      connect: "connect.stripe.com",
      meter_events: "meter-events.stripe.com"
    };
  }
});

// node_modules/stripe/cjs/utils.js
var require_utils = __commonJS({
  "node_modules/stripe/cjs/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.attachCallSiteToError = exports2.parseHeadersForFetch = exports2.parseHttpHeaderAsString = exports2.getAPIMode = exports2.jsonStringifyRequestData = exports2.concat = exports2.createApiKeyAuthenticator = exports2.detectAIAgent = exports2.AI_AGENTS = exports2.validateInteger = exports2.flattenAndStringify = exports2.isObject = exports2.pascalToCamelCase = exports2.normalizeHeader = exports2.normalizeHeaders = exports2.removeNullish = exports2.processOptions = exports2.validateApiBase = exports2.extractUrlParams = exports2.makeURLInterpolator = exports2.queryStringifyRequestData = exports2.isOptionsHash = void 0;
    var Types_js_1 = require_Types();
    var OPTIONS_KEYS = [
      "apiKey",
      "idempotencyKey",
      "stripeAccount",
      "apiVersion",
      "maxNetworkRetries",
      "timeout",
      "apiBase",
      "authenticator",
      "stripeContext",
      "headers",
      "additionalHeaders",
      "streaming"
    ];
    function isOptionsHash(o) {
      return o && typeof o === "object" && OPTIONS_KEYS.some((prop) => Object.prototype.hasOwnProperty.call(o, prop));
    }
    exports2.isOptionsHash = isOptionsHash;
    function queryStringifyRequestData(data) {
      return stringifyRequestData(data);
    }
    exports2.queryStringifyRequestData = queryStringifyRequestData;
    function encodeQueryValue(value) {
      return encodeURIComponent(value).replace(/!/g, "%21").replace(/\*/g, "%2A").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/'/g, "%27").replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    function valueToString(value) {
      if (value instanceof Date) {
        return Math.floor(value.getTime() / 1e3).toString();
      }
      if (value === null) {
        return "";
      }
      return String(value);
    }
    function stringifyRequestData(data) {
      const pairs = [];
      function encode(key, value) {
        if (value === void 0) {
          return;
        }
        if (value === null || typeof value !== "object" || value instanceof Date) {
          pairs.push(encodeQueryValue(key) + "=" + encodeQueryValue(valueToString(value)));
          return;
        }
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            if (value[i] !== void 0) {
              encode(key + "[" + i + "]", value[i]);
            }
          }
          return;
        }
        for (const k of Object.keys(value)) {
          encode(key + "[" + k + "]", value[k]);
        }
      }
      if (typeof data === "object" && data !== null) {
        for (const key of Object.keys(data)) {
          encode(key, data[key]);
        }
      }
      return pairs.join("&");
    }
    exports2.makeURLInterpolator = /* @__PURE__ */ (() => {
      const rc = {
        "\n": "\\n",
        '"': '\\"',
        "\u2028": "\\u2028",
        "\u2029": "\\u2029"
      };
      return (str) => {
        const cleanString = str.replace(/["\n\r\u2028\u2029]/g, ($0) => rc[$0]);
        return (outputs) => {
          return cleanString.replace(/\{([\s\S]+?)\}/g, ($0, $1) => {
            const output = outputs[$1];
            if (isValidEncodeUriComponentType(output))
              return encodeURIComponent(output);
            return "";
          });
        };
      };
    })();
    function isValidEncodeUriComponentType(value) {
      return ["number", "string", "boolean"].includes(typeof value);
    }
    function extractUrlParams(path) {
      const params = path.match(/\{\w+\}/g);
      if (!params) {
        return [];
      }
      return params.map((param) => param.replace(/[{}]/g, ""));
    }
    exports2.extractUrlParams = extractUrlParams;
    var validateApiBase = (apiBase) => {
      if (typeof apiBase !== "string") {
        throw new Error(`API base must be a string, got: ${typeof apiBase}`);
      }
      return apiBase in Types_js_1.DEFAULT_BASE_ADDRESSES;
    };
    exports2.validateApiBase = validateApiBase;
    function processOptions(options) {
      const result = {
        authenticator: null,
        headers: {},
        settings: {},
        streaming: false,
        apiBase: null
      };
      if (!options) {
        return result;
      }
      if (options.apiKey) {
        result.authenticator = createApiKeyAuthenticator(options.apiKey);
      }
      if (options.idempotencyKey) {
        result.headers["Idempotency-Key"] = options.idempotencyKey;
      }
      if (options.stripeAccount) {
        result.headers["Stripe-Account"] = options.stripeAccount;
      }
      if (options.stripeContext) {
        if (result.headers["Stripe-Account"]) {
          throw new Error("Can't specify both stripeAccount and stripeContext.");
        }
        result.headers["Stripe-Context"] = options.stripeContext;
      }
      if (options.apiVersion) {
        result.headers["Stripe-Version"] = options.apiVersion;
      }
      if (Number.isInteger(options.maxNetworkRetries)) {
        result.settings.maxNetworkRetries = options.maxNetworkRetries;
      }
      if (Number.isInteger(options.timeout)) {
        result.settings.timeout = options.timeout;
      }
      if (options.authenticator) {
        if (options.apiKey) {
          throw new Error("Can't specify both apiKey and authenticator.");
        }
        if (typeof options.authenticator !== "function") {
          throw new Error("The authenticator must be a function receiving a request as the first parameter.");
        }
        result.authenticator = options.authenticator;
      }
      if (options.headers) {
        Object.assign(result.headers, options.headers);
      }
      if (options.streaming) {
        result.streaming = true;
      }
      return result;
    }
    exports2.processOptions = processOptions;
    function removeNullish(obj) {
      if (typeof obj !== "object") {
        throw new Error("Argument must be an object");
      }
      return Object.keys(obj).reduce((result, key) => {
        if (obj[key] != null) {
          result[key] = obj[key];
        }
        return result;
      }, {});
    }
    exports2.removeNullish = removeNullish;
    function normalizeHeaders(obj) {
      if (!(obj && typeof obj === "object")) {
        return obj;
      }
      return Object.keys(obj).reduce((result, header) => {
        result[normalizeHeader(header)] = obj[header];
        return result;
      }, {});
    }
    exports2.normalizeHeaders = normalizeHeaders;
    function normalizeHeader(header) {
      return header.split("-").map((text) => text.charAt(0).toUpperCase() + text.substr(1).toLowerCase()).join("-");
    }
    exports2.normalizeHeader = normalizeHeader;
    function pascalToCamelCase(name) {
      if (name === "OAuth") {
        return "oauth";
      } else {
        return name[0].toLowerCase() + name.substring(1);
      }
    }
    exports2.pascalToCamelCase = pascalToCamelCase;
    function isObject(obj) {
      const type = typeof obj;
      return (type === "function" || type === "object") && !!obj;
    }
    exports2.isObject = isObject;
    function flattenAndStringify(data) {
      const result = {};
      const step = (obj, prevKey) => {
        Object.entries(obj).forEach(([key, value]) => {
          const newKey = prevKey ? `${prevKey}[${key}]` : key;
          if (isObject(value)) {
            if (!(value instanceof Uint8Array) && !Object.prototype.hasOwnProperty.call(value, "data")) {
              return step(value, newKey);
            } else {
              result[newKey] = value;
            }
          } else {
            result[newKey] = String(value);
          }
        });
      };
      step(data, null);
      return result;
    }
    exports2.flattenAndStringify = flattenAndStringify;
    function validateInteger(name, n, defaultVal) {
      if (!Number.isInteger(n)) {
        if (defaultVal !== void 0) {
          return defaultVal;
        } else {
          throw new Error(`${name} must be an integer`);
        }
      }
      return n;
    }
    exports2.validateInteger = validateInteger;
    exports2.AI_AGENTS = [
      // The beginning of the section generated from our OpenAPI spec
      ["ANTIGRAVITY_CLI_ALIAS", "antigravity"],
      ["CLAUDECODE", "claude_code"],
      ["CLINE_ACTIVE", "cline"],
      ["CODEX_SANDBOX", "codex_cli"],
      ["CODEX_THREAD_ID", "codex_cli"],
      ["CODEX_SANDBOX_NETWORK_DISABLED", "codex_cli"],
      ["CODEX_CI", "codex_cli"],
      ["CURSOR_AGENT", "cursor"],
      ["GEMINI_CLI", "gemini_cli"],
      ["OPENCLAW_SHELL", "openclaw"],
      ["OPENCODE", "open_code"]
      // The end of the section generated from our OpenAPI spec
    ];
    function detectAIAgent(env) {
      for (const [envVar, agentName] of exports2.AI_AGENTS) {
        if (env[envVar]) {
          return agentName;
        }
      }
      return "";
    }
    exports2.detectAIAgent = detectAIAgent;
    function createApiKeyAuthenticator(apiKey) {
      const authenticator = (request) => {
        request.headers.Authorization = "Bearer " + apiKey;
        return Promise.resolve();
      };
      authenticator._apiKey = apiKey;
      return authenticator;
    }
    exports2.createApiKeyAuthenticator = createApiKeyAuthenticator;
    function concat(arrays) {
      const totalLength = arrays.reduce((len, array) => len + array.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      arrays.forEach((array) => {
        merged.set(array, offset);
        offset += array.length;
      });
      return merged;
    }
    exports2.concat = concat;
    function dateTimeReplacer(key, value) {
      if (this[key] instanceof Date) {
        return Math.floor(this[key].getTime() / 1e3).toString();
      }
      return value;
    }
    function jsonStringifyRequestData(data) {
      return JSON.stringify(data, dateTimeReplacer);
    }
    exports2.jsonStringifyRequestData = jsonStringifyRequestData;
    function getAPIMode(path) {
      if (!path) {
        return "v1";
      }
      return path.startsWith("/v2") ? "v2" : "v1";
    }
    exports2.getAPIMode = getAPIMode;
    function parseHttpHeaderAsString(header) {
      if (Array.isArray(header)) {
        return header.join(", ");
      }
      return String(header);
    }
    exports2.parseHttpHeaderAsString = parseHttpHeaderAsString;
    function parseHeadersForFetch(headers) {
      return Object.entries(headers).map(([key, value]) => {
        return [key, parseHttpHeaderAsString(value)];
      });
    }
    exports2.parseHeadersForFetch = parseHeadersForFetch;
    var CALL_SITE_MARKER = "\nOriginating from:";
    function attachCallSiteToError(err, callSiteStack) {
      if (!err || !err.stack || !callSiteStack) {
        return;
      }
      const callerFrames = callSiteStack.substring(callSiteStack.indexOf("\n") + 1);
      const existingMarkerIdx = err.stack.indexOf(CALL_SITE_MARKER);
      const baseStack = existingMarkerIdx >= 0 ? err.stack.substring(0, existingMarkerIdx) : err.stack;
      err.stack = `${baseStack}${CALL_SITE_MARKER}
${callerFrames}`;
    }
    exports2.attachCallSiteToError = attachCallSiteToError;
  }
});

// node_modules/stripe/cjs/net/FetchHttpClient.js
var require_FetchHttpClient = __commonJS({
  "node_modules/stripe/cjs/net/FetchHttpClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FetchHttpClientResponse = exports2.FetchHttpClient = void 0;
    var utils_js_1 = require_utils();
    var HttpClient_js_1 = require_HttpClient();
    var FetchHttpClient = class _FetchHttpClient extends HttpClient_js_1.HttpClient {
      constructor(fetchFn) {
        super();
        if (!fetchFn) {
          if (!globalThis.fetch) {
            throw new Error("fetch() function not provided and is not defined in the global scope. You must provide a fetch implementation.");
          }
          fetchFn = globalThis.fetch;
        }
        if (globalThis.AbortController) {
          this._fetchFn = _FetchHttpClient.makeFetchWithAbortTimeout(fetchFn);
        } else {
          this._fetchFn = _FetchHttpClient.makeFetchWithRaceTimeout(fetchFn);
        }
      }
      static makeFetchWithRaceTimeout(fetchFn) {
        return (url, init, timeout) => {
          let pendingTimeoutId;
          const timeoutPromise = new Promise((_, reject) => {
            pendingTimeoutId = setTimeout(() => {
              pendingTimeoutId = null;
              reject(HttpClient_js_1.HttpClient.makeTimeoutError());
            }, timeout);
          });
          const fetchPromise = fetchFn(url, init);
          return Promise.race([fetchPromise, timeoutPromise]).finally(() => {
            if (pendingTimeoutId) {
              clearTimeout(pendingTimeoutId);
            }
          });
        };
      }
      static makeFetchWithAbortTimeout(fetchFn) {
        return async (url, init, timeout) => {
          const abort = new AbortController();
          let timeoutId = setTimeout(() => {
            timeoutId = null;
            abort.abort(HttpClient_js_1.HttpClient.makeTimeoutError());
          }, timeout);
          try {
            return await fetchFn(url, {
              ...init,
              signal: abort.signal
            });
          } catch (err) {
            if (err.name === "AbortError") {
              throw HttpClient_js_1.HttpClient.makeTimeoutError();
            } else {
              throw err;
            }
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        };
      }
      /** @override. */
      getClientName() {
        return "fetch";
      }
      async makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
        const isInsecureConnection = protocol === "http";
        if (!path.startsWith("/")) {
          throw new Error(`Only relative paths are supported, got: "${path}"`);
        }
        const url = new URL(`${isInsecureConnection ? "http" : "https"}://${host}${path}`);
        url.port = port;
        const methodHasPayload = method == "POST" || method == "PUT" || method == "PATCH";
        const body = requestData || (methodHasPayload ? "" : void 0);
        const res = await this._fetchFn(url.toString(), {
          method,
          headers: (0, utils_js_1.parseHeadersForFetch)(headers),
          body
        }, timeout);
        return new FetchHttpClientResponse(res);
      }
    };
    exports2.FetchHttpClient = FetchHttpClient;
    var FetchHttpClientResponse = class _FetchHttpClientResponse extends HttpClient_js_1.HttpClientResponse {
      constructor(res) {
        super(res.status, _FetchHttpClientResponse._transformHeadersToObject(res.headers));
        this._res = res;
      }
      getRawResponse() {
        return this._res;
      }
      toStream(streamCompleteCallback) {
        streamCompleteCallback();
        return this._res.body;
      }
      toJSON() {
        return this._res.text().then((text) => {
          try {
            return JSON.parse(text);
          } catch (e) {
            if (e instanceof Error) {
              e.rawBody = text;
            }
            throw e;
          }
        });
      }
      static _transformHeadersToObject(headers) {
        const headersObj = {};
        for (const entry of headers) {
          if (!Array.isArray(entry) || entry.length != 2) {
            throw new Error("Response objects produced by the fetch function given to FetchHttpClient do not have an iterable headers map. Response#headers should be an iterable object.");
          }
          headersObj[entry[0]] = entry[1];
        }
        return headersObj;
      }
    };
    exports2.FetchHttpClientResponse = FetchHttpClientResponse;
  }
});

// node_modules/stripe/cjs/crypto/SubtleCryptoProvider.js
var require_SubtleCryptoProvider = __commonJS({
  "node_modules/stripe/cjs/crypto/SubtleCryptoProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubtleCryptoProvider = void 0;
    var CryptoProvider_js_1 = require_CryptoProvider();
    var SubtleCryptoProvider = class extends CryptoProvider_js_1.CryptoProvider {
      constructor(subtleCrypto) {
        super();
        this.subtleCrypto = subtleCrypto || crypto.subtle;
      }
      /** @override */
      computeHMACSignature(payload, secret) {
        throw new CryptoProvider_js_1.CryptoProviderOnlySupportsAsyncError("SubtleCryptoProvider cannot be used in a synchronous context.");
      }
      /** @override */
      async computeHMACSignatureAsync(payload, secret) {
        const encoder = new TextEncoder();
        const key = await this.subtleCrypto.importKey("raw", encoder.encode(secret), {
          name: "HMAC",
          hash: { name: "SHA-256" }
        }, false, ["sign"]);
        const signatureBuffer = await this.subtleCrypto.sign("hmac", key, encoder.encode(payload));
        const signatureBytes = new Uint8Array(signatureBuffer);
        const signatureHexCodes = new Array(signatureBytes.length);
        for (let i = 0; i < signatureBytes.length; i++) {
          signatureHexCodes[i] = byteHexMapping[signatureBytes[i]];
        }
        return signatureHexCodes.join("");
      }
      /** @override */
      async computeSHA256Async(data) {
        return new Uint8Array(await this.subtleCrypto.digest("SHA-256", data));
      }
    };
    exports2.SubtleCryptoProvider = SubtleCryptoProvider;
    var byteHexMapping = new Array(256);
    for (let i = 0; i < byteHexMapping.length; i++) {
      byteHexMapping[i] = i.toString(16).padStart(2, "0");
    }
  }
});

// node_modules/stripe/cjs/platform/PlatformFunctions.js
var require_PlatformFunctions = __commonJS({
  "node_modules/stripe/cjs/platform/PlatformFunctions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PlatformFunctions = void 0;
    var FetchHttpClient_js_1 = require_FetchHttpClient();
    var SubtleCryptoProvider_js_1 = require_SubtleCryptoProvider();
    var PlatformFunctions = class {
      constructor() {
        this._fetchFn = null;
        this._agent = null;
      }
      /**
       * Returns platform info string for telemetry, or null if unavailable.
       */
      getPlatformInfo() {
        return null;
      }
      getSourceHash() {
        return null;
      }
      /**
       * Emits a warning. Node.js uses process.emitWarning; other runtimes
       * fall back to console.warn.
       */
      emitWarning(warning) {
        console.warn(`Stripe: ${warning}`);
      }
      /**
       * Returns environment variables, or null if unavailable.
       */
      getEnv() {
        return null;
      }
      /**
       * Returns the runtime version string, or null if unavailable.
       */
      getRuntimeVersion() {
        return null;
      }
      /**
       * Generates a v4 UUID. See https://stackoverflow.com/a/2117523
       */
      uuid4() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === "x" ? r : r & 3 | 8;
          return v.toString(16);
        });
      }
      /**
       * Compares strings in constant time.
       */
      secureCompare(a, b) {
        if (a.length !== b.length) {
          return false;
        }
        const len = a.length;
        let result = 0;
        for (let i = 0; i < len; ++i) {
          result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
      }
      /**
       * Creates an event emitter.
       */
      createEmitter() {
        throw new Error("createEmitter not implemented.");
      }
      /**
       * Checks if the request data is a stream. If so, read the entire stream
       * to a buffer and return the buffer.
       */
      tryBufferData(data) {
        throw new Error("tryBufferData not implemented.");
      }
      /**
       * Creates an HTTP client which uses the Node `http` and `https` packages
       * to issue requests.
       */
      createNodeHttpClient(agent) {
        throw new Error("createNodeHttpClient not implemented.");
      }
      /**
       * Creates an HTTP client for issuing Stripe API requests which uses the Web
       * Fetch API.
       *
       * A fetch function can optionally be passed in as a parameter. If none is
       * passed, will default to the default `fetch` function in the global scope.
       */
      createFetchHttpClient(fetchFn) {
        return new FetchHttpClient_js_1.FetchHttpClient(fetchFn);
      }
      /**
       * Creates an HTTP client using runtime-specific APIs.
       */
      createDefaultHttpClient() {
        throw new Error("createDefaultHttpClient not implemented.");
      }
      /**
       * Creates a CryptoProvider which uses the Node `crypto` package for its computations.
       */
      createNodeCryptoProvider() {
        throw new Error("createNodeCryptoProvider not implemented.");
      }
      /**
       * Creates a CryptoProvider which uses the SubtleCrypto interface of the Web Crypto API.
       */
      createSubtleCryptoProvider(subtleCrypto) {
        return new SubtleCryptoProvider_js_1.SubtleCryptoProvider(subtleCrypto);
      }
      createDefaultCryptoProvider() {
        throw new Error("createDefaultCryptoProvider not implemented.");
      }
    };
    exports2.PlatformFunctions = PlatformFunctions;
  }
});

// node_modules/stripe/cjs/Error.js
var require_Error = __commonJS({
  "node_modules/stripe/cjs/Error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TemporarySessionExpiredError = exports2.RateLimitError = exports2.StripeUnsupportedResponseTypeError = exports2.StripeUnsupportedGrantTypeError = exports2.StripeInvalidScopeError = exports2.StripeOAuthInvalidRequestError = exports2.StripeInvalidClientError = exports2.StripeInvalidGrantError = exports2.StripeOAuthError = exports2.StripeIdempotencyError = exports2.StripeSignatureVerificationError = exports2.StripeConnectionError = exports2.StripeRateLimitError = exports2.StripePermissionError = exports2.StripeAuthenticationError = exports2.StripeAPIError = exports2.StripeInvalidRequestError = exports2.StripeCardError = exports2.StripeError = exports2.generateV2Error = exports2.generateOAuthError = exports2.generateV1Error = void 0;
    var generateV1Error = (rawStripeError) => {
      const statusCode = rawStripeError.statusCode;
      if (statusCode === 429 || statusCode === 400 && rawStripeError.code === "rate_limit") {
        return new StripeRateLimitError(rawStripeError);
      }
      if (statusCode === 400 || statusCode === 404) {
        if (rawStripeError.type === "idempotency_error") {
          return new StripeIdempotencyError(rawStripeError);
        }
        return new StripeInvalidRequestError(rawStripeError);
      }
      if (statusCode === 401) {
        return new StripeAuthenticationError(rawStripeError);
      }
      if (statusCode === 402) {
        return new StripeCardError(rawStripeError);
      }
      if (statusCode === 403) {
        return new StripePermissionError(rawStripeError);
      }
      return new StripeAPIError(rawStripeError);
    };
    exports2.generateV1Error = generateV1Error;
    var generateOAuthError = (rawStripeError) => {
      const oauthType = rawStripeError.type;
      switch (oauthType) {
        case "invalid_grant":
          return new StripeInvalidGrantError(rawStripeError);
        case "invalid_client":
          return new StripeInvalidClientError(rawStripeError);
        case "invalid_request":
          return new StripeOAuthInvalidRequestError(rawStripeError);
        case "invalid_scope":
          return new StripeInvalidScopeError(rawStripeError);
        case "unsupported_grant_type":
          return new StripeUnsupportedGrantTypeError(rawStripeError);
        case "unsupported_response_type":
          return new StripeUnsupportedResponseTypeError(rawStripeError);
        default:
          return new StripeOAuthError(rawStripeError);
      }
    };
    exports2.generateOAuthError = generateOAuthError;
    var generateV2Error = (rawStripeError) => {
      switch (rawStripeError.type) {
        case "idempotency_error":
          return new StripeIdempotencyError(rawStripeError);
        // switchCases: The beginning of the section generated from our OpenAPI spec
        case "rate_limit":
          return new RateLimitError(rawStripeError);
        case "temporary_session_expired":
          return new TemporarySessionExpiredError(rawStripeError);
      }
      switch (rawStripeError.code) {
        case "invalid_fields":
          return new StripeInvalidRequestError(rawStripeError);
      }
      return (0, exports2.generateV1Error)(rawStripeError);
    };
    exports2.generateV2Error = generateV2Error;
    var StripeError = class extends Error {
      constructor(raw = {}, type = null) {
        super(raw.message);
        this.type = type || this.constructor.name;
        this.raw = raw;
        this.rawType = raw.type;
        this.code = raw.code;
        this.doc_url = raw.doc_url;
        this.param = raw.param;
        this.detail = raw.detail;
        this.headers = raw.headers;
        this.requestId = raw.requestId;
        this.statusCode = raw.statusCode;
        this.message = raw.message ?? "";
        this.userMessage = raw.user_message;
        this.charge = raw.charge;
        this.decline_code = raw.decline_code;
        this.payment_intent = raw.payment_intent;
        this.payment_method = raw.payment_method;
        this.payment_method_type = raw.payment_method_type;
        this.setup_intent = raw.setup_intent;
        this.source = raw.source;
      }
    };
    exports2.StripeError = StripeError;
    StripeError.generate = exports2.generateV1Error;
    var StripeCardError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeCardError");
        this.decline_code = raw.decline_code ?? "";
      }
    };
    exports2.StripeCardError = StripeCardError;
    var StripeInvalidRequestError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeInvalidRequestError");
      }
    };
    exports2.StripeInvalidRequestError = StripeInvalidRequestError;
    var StripeAPIError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeAPIError");
      }
    };
    exports2.StripeAPIError = StripeAPIError;
    var StripeAuthenticationError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeAuthenticationError");
      }
    };
    exports2.StripeAuthenticationError = StripeAuthenticationError;
    var StripePermissionError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripePermissionError");
      }
    };
    exports2.StripePermissionError = StripePermissionError;
    var StripeRateLimitError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeRateLimitError");
      }
    };
    exports2.StripeRateLimitError = StripeRateLimitError;
    var StripeConnectionError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeConnectionError");
      }
    };
    exports2.StripeConnectionError = StripeConnectionError;
    var StripeSignatureVerificationError = class extends StripeError {
      constructor(header, payload, raw = {}) {
        super(raw, "StripeSignatureVerificationError");
        this.header = header;
        this.payload = payload;
      }
    };
    exports2.StripeSignatureVerificationError = StripeSignatureVerificationError;
    var StripeIdempotencyError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeIdempotencyError");
      }
    };
    exports2.StripeIdempotencyError = StripeIdempotencyError;
    var StripeOAuthError = class extends StripeError {
      constructor(raw = {}, type = "StripeOAuthError") {
        super(raw, type);
      }
    };
    exports2.StripeOAuthError = StripeOAuthError;
    var StripeInvalidGrantError = class extends StripeOAuthError {
      constructor(raw = {}) {
        super(raw, "StripeInvalidGrantError");
      }
    };
    exports2.StripeInvalidGrantError = StripeInvalidGrantError;
    var StripeInvalidClientError = class extends StripeOAuthError {
      constructor(raw = {}) {
        super(raw, "StripeInvalidClientError");
      }
    };
    exports2.StripeInvalidClientError = StripeInvalidClientError;
    var StripeOAuthInvalidRequestError = class extends StripeOAuthError {
      constructor(raw = {}) {
        super(raw, "StripeOAuthInvalidRequestError");
      }
    };
    exports2.StripeOAuthInvalidRequestError = StripeOAuthInvalidRequestError;
    var StripeInvalidScopeError = class extends StripeOAuthError {
      constructor(raw = {}) {
        super(raw, "StripeInvalidScopeError");
      }
    };
    exports2.StripeInvalidScopeError = StripeInvalidScopeError;
    var StripeUnsupportedGrantTypeError = class extends StripeOAuthError {
      constructor(raw = {}) {
        super(raw, "StripeUnsupportedGrantTypeError");
      }
    };
    exports2.StripeUnsupportedGrantTypeError = StripeUnsupportedGrantTypeError;
    var StripeUnsupportedResponseTypeError = class extends StripeOAuthError {
      constructor(raw = {}) {
        super(raw, "StripeUnsupportedResponseTypeError");
      }
    };
    exports2.StripeUnsupportedResponseTypeError = StripeUnsupportedResponseTypeError;
    var RateLimitError = class extends StripeError {
      constructor(rawStripeError = {}) {
        super(rawStripeError, "RateLimitError");
      }
    };
    exports2.RateLimitError = RateLimitError;
    var TemporarySessionExpiredError = class extends StripeError {
      constructor(rawStripeError = {}) {
        super(rawStripeError, "TemporarySessionExpiredError");
      }
    };
    exports2.TemporarySessionExpiredError = TemporarySessionExpiredError;
  }
});

// node_modules/stripe/cjs/platform/NodePlatformFunctions.js
var require_NodePlatformFunctions = __commonJS({
  "node_modules/stripe/cjs/platform/NodePlatformFunctions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NodePlatformFunctions = void 0;
    var crypto2 = require("crypto");
    var os = require("os");
    var events_1 = require("events");
    var NodeCryptoProvider_js_1 = require_NodeCryptoProvider();
    var NodeHttpClient_js_1 = require_NodeHttpClient();
    var PlatformFunctions_js_1 = require_PlatformFunctions();
    var Error_js_1 = require_Error();
    var utils_js_1 = require_utils();
    var StreamProcessingError = class extends Error_js_1.StripeError {
    };
    var NodePlatformFunctions = class extends PlatformFunctions_js_1.PlatformFunctions {
      /** @override */
      uuid4() {
        if (crypto2.randomUUID) {
          return crypto2.randomUUID();
        }
        return super.uuid4();
      }
      /** @override */
      getPlatformInfo() {
        return `${process.platform} ${os.release()} ${os.arch()}`;
      }
      /** @override */
      emitWarning(warning) {
        if (typeof process.emitWarning === "function") {
          process.emitWarning(warning, "Stripe");
        } else {
          super.emitWarning(warning);
        }
      }
      /** @override */
      getEnv() {
        return process.env;
      }
      /** @override */
      getRuntimeVersion() {
        return process.version;
      }
      getUname() {
        try {
          const parts = [os.type(), os.release(), os.arch()];
          const version = os.version?.();
          if (version)
            parts.push(version);
          try {
            parts.push(os.hostname());
          } catch (_e) {
          }
          return parts.join(" ");
        } catch {
          return null;
        }
      }
      /** @override */
      getSourceHash() {
        try {
          const uname = this.getUname();
          return uname ? crypto2.createHash("md5").update(uname).digest("hex") : null;
        } catch {
          return null;
        }
      }
      /**
       * @override
       * Secure compare, from https://github.com/freewil/scmp
       */
      secureCompare(a, b) {
        if (!a || !b) {
          throw new Error("secureCompare must receive two arguments");
        }
        if (a.length !== b.length) {
          return false;
        }
        if (crypto2.timingSafeEqual) {
          const textEncoder = new TextEncoder();
          const aEncoded = textEncoder.encode(a);
          const bEncoded = textEncoder.encode(b);
          return crypto2.timingSafeEqual(aEncoded, bEncoded);
        }
        return super.secureCompare(a, b);
      }
      createEmitter() {
        return new events_1.EventEmitter();
      }
      /** @override */
      tryBufferData(data) {
        if (!(data.file.data instanceof events_1.EventEmitter)) {
          return Promise.resolve(data);
        }
        const bufferArray = [];
        return new Promise((resolve, reject) => {
          data.file.data.on("data", (line) => {
            bufferArray.push(line);
          }).once("end", () => {
            const bufferData = Object.assign({}, data);
            bufferData.file.data = (0, utils_js_1.concat)(bufferArray);
            resolve(bufferData);
          }).on("error", (err) => {
            reject(new StreamProcessingError({
              message: "An error occurred while attempting to process the file for upload.",
              detail: err
            }));
          });
        });
      }
      /** @override */
      createNodeHttpClient(agent) {
        return new NodeHttpClient_js_1.NodeHttpClient(agent);
      }
      /** @override */
      createDefaultHttpClient() {
        return new NodeHttpClient_js_1.NodeHttpClient();
      }
      /** @override */
      createNodeCryptoProvider() {
        return new NodeCryptoProvider_js_1.NodeCryptoProvider();
      }
      /** @override */
      createDefaultCryptoProvider() {
        return this.createNodeCryptoProvider();
      }
    };
    exports2.NodePlatformFunctions = NodePlatformFunctions;
  }
});

// node_modules/stripe/cjs/RequestSender.js
var require_RequestSender = __commonJS({
  "node_modules/stripe/cjs/RequestSender.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RequestSender = void 0;
    var Error_js_1 = require_Error();
    var HttpClient_js_1 = require_HttpClient();
    var utils_js_1 = require_utils();
    var RequestSender = class _RequestSender {
      constructor(stripe, maxBufferedRequestMetric) {
        this._stripe = stripe;
        this._maxBufferedRequestMetric = maxBufferedRequestMetric;
      }
      _normalizeStripeContext(optsContext, clientContext) {
        if (optsContext) {
          return optsContext.toString() || null;
        }
        return clientContext?.toString() || null;
      }
      _addHeadersDirectlyToObject(obj, headers) {
        obj.requestId = headers["request-id"];
        obj.stripeAccount = obj.stripeAccount || headers["stripe-account"];
        obj.apiVersion = obj.apiVersion || headers["stripe-version"];
        obj.idempotencyKey = obj.idempotencyKey || headers["idempotency-key"];
      }
      _makeResponseEvent(requestEvent, statusCode, headers) {
        const requestEndTime = Date.now();
        const requestDurationMs = requestEndTime - requestEvent.request_start_time;
        return (0, utils_js_1.removeNullish)({
          api_version: headers["stripe-version"],
          account: headers["stripe-account"],
          idempotency_key: headers["idempotency-key"],
          method: requestEvent.method,
          path: requestEvent.path,
          status: statusCode,
          request_id: this._getRequestId(headers),
          elapsed: requestDurationMs,
          request_start_time: requestEvent.request_start_time,
          request_end_time: requestEndTime
        });
      }
      _getRequestId(headers) {
        return headers["request-id"];
      }
      _emitStripeNotice(headers) {
        const notice = headers["stripe-notice"];
        if (notice) {
          this._stripe._platformFunctions.emitWarning(typeof notice === "string" ? notice : notice[0]);
        }
      }
      /**
       * Used by methods with spec.streaming === true. For these methods, we do not
       * buffer successful responses into memory or do parse them into stripe
       * objects, we delegate that all of that to the user and pass back the raw
       * http.Response object to the callback.
       *
       * (Unsuccessful responses shouldn't make it here, they should
       * still be buffered/parsed and handled by _jsonResponseHandler -- see
       * makeRequest)
       */
      _streamingResponseHandler(requestEvent, usage, callback) {
        return (res) => {
          const headers = res.getHeaders();
          this._emitStripeNotice(headers);
          const streamCompleteCallback = () => {
            const responseEvent = this._makeResponseEvent(requestEvent, res.getStatusCode(), headers);
            this._stripe._emitter.emit("response", responseEvent);
            this._recordRequestMetrics(this._getRequestId(headers), responseEvent.elapsed, usage);
          };
          const stream = res.toStream(streamCompleteCallback);
          this._addHeadersDirectlyToObject(stream, headers);
          return callback(null, stream);
        };
      }
      /**
       * Default handler for Stripe responses. Buffers the response into memory,
       * parses the JSON and returns it (i.e. passes it to the callback) if there
       * is no "error" field. Otherwise constructs/passes an appropriate Error.
       */
      _jsonResponseHandler(requestEvent, apiMode, usage, callback) {
        return (res) => {
          const headers = res.getHeaders();
          this._emitStripeNotice(headers);
          const requestId = this._getRequestId(headers);
          const statusCode = res.getStatusCode();
          const responseEvent = this._makeResponseEvent(requestEvent, statusCode, headers);
          res.toJSON().then((jsonResponse) => {
            if (this._stripe.getEmitEventBodiesEnabled()) {
              responseEvent.body = jsonResponse;
            }
            if (jsonResponse.error) {
              const isOAuth = typeof jsonResponse.error === "string";
              if (isOAuth) {
                jsonResponse.error = {
                  type: jsonResponse.error,
                  message: jsonResponse.error_description
                };
              }
              jsonResponse.error.headers = headers;
              jsonResponse.error.statusCode = statusCode;
              jsonResponse.error.requestId = requestId;
              let err;
              if (isOAuth) {
                err = (0, Error_js_1.generateOAuthError)(jsonResponse.error);
              } else if (apiMode === "v2") {
                err = (0, Error_js_1.generateV2Error)(jsonResponse.error);
              } else {
                err = (0, Error_js_1.generateV1Error)(jsonResponse.error);
              }
              throw err;
            }
            return jsonResponse;
          }, (e) => {
            if (this._stripe.getEmitEventBodiesEnabled() && e.rawBody) {
              responseEvent.body = e.rawBody;
            }
            throw new Error_js_1.StripeAPIError({
              message: "Invalid JSON received from the Stripe API",
              exception: e,
              requestId: headers["request-id"]
            });
          }).then((jsonResponse) => {
            this._stripe._emitter.emit("response", responseEvent);
            this._recordRequestMetrics(requestId, responseEvent.elapsed, usage);
            const rawResponse = res.getRawResponse();
            this._addHeadersDirectlyToObject(rawResponse, headers);
            Object.defineProperty(jsonResponse, "lastResponse", {
              enumerable: false,
              writable: false,
              value: rawResponse
            });
            callback(null, jsonResponse);
          }, (e) => {
            this._stripe._emitter.emit("response", responseEvent);
            callback(e, null);
          });
        };
      }
      static _generateConnectionErrorMessage(requestRetries) {
        return `An error occurred with our connection to Stripe.${requestRetries > 0 ? ` Request was retried ${requestRetries} times.` : ""}`;
      }
      // For more on when and how to retry API requests, see https://stripe.com/docs/error-handling#safely-retrying-requests-with-idempotency
      static _shouldRetry(res, numRetries, maxRetries, error) {
        if (error && numRetries === 0 && HttpClient_js_1.HttpClient.CONNECTION_CLOSED_ERROR_CODES.includes(error.code)) {
          return true;
        }
        if (numRetries >= maxRetries) {
          return false;
        }
        if (!res) {
          return true;
        }
        if (res.getHeaders()["stripe-should-retry"] === "false") {
          return false;
        }
        if (res.getHeaders()["stripe-should-retry"] === "true") {
          return true;
        }
        if (res.getStatusCode() === 409) {
          return true;
        }
        if (res.getStatusCode() >= 500) {
          return true;
        }
        return false;
      }
      _getSleepTimeInMS(numRetries) {
        const initialNetworkRetryDelay = this._stripe.getInitialNetworkRetryDelay();
        const maxNetworkRetryDelay = this._stripe.getMaxNetworkRetryDelay();
        let sleepSeconds = Math.min(initialNetworkRetryDelay * Math.pow(2, numRetries - 1), maxNetworkRetryDelay);
        sleepSeconds *= 0.5 * (1 + Math.random());
        sleepSeconds = Math.max(initialNetworkRetryDelay, sleepSeconds);
        return sleepSeconds * 1e3;
      }
      // Max retries can be set on a per request basis. Favor those over the global setting
      _getMaxNetworkRetries(settings = {}) {
        return settings.maxNetworkRetries !== void 0 && Number.isInteger(settings.maxNetworkRetries) ? settings.maxNetworkRetries : this._stripe.getMaxNetworkRetries();
      }
      _defaultIdempotencyKey(method, settings, apiMode) {
        const maxRetries = this._getMaxNetworkRetries(settings);
        const genKey = () => `stripe-node-retry-${this._stripe._platformFunctions.uuid4()}`;
        if (apiMode === "v2") {
          if (method === "POST" || method === "DELETE") {
            return genKey();
          }
        } else if (apiMode === "v1") {
          if (method === "POST" && maxRetries > 0) {
            return genKey();
          }
        }
        return null;
      }
      _makeHeaders({ contentType, contentLength, apiVersion, clientUserAgent, method, userSuppliedHeaders, userSuppliedSettings, stripeAccount, stripeContext, apiMode }) {
        const defaultHeaders = {
          Accept: "application/json",
          "Content-Type": contentType,
          "User-Agent": this._getUserAgentString(apiMode),
          "X-Stripe-Client-User-Agent": clientUserAgent,
          "X-Stripe-Client-Telemetry": this._getTelemetryHeader(),
          "Stripe-Version": apiVersion,
          "Stripe-Account": stripeAccount,
          "Stripe-Context": stripeContext,
          "Idempotency-Key": this._defaultIdempotencyKey(method, userSuppliedSettings, apiMode)
        };
        const methodHasPayload = method == "POST" || method == "PUT" || method == "PATCH";
        if (methodHasPayload || contentLength) {
          if (!methodHasPayload) {
            this._stripe._platformFunctions.emitWarning(`${method} method had non-zero contentLength but no payload is expected for this verb`);
          }
          defaultHeaders["Content-Length"] = contentLength;
        }
        return Object.assign(
          (0, utils_js_1.removeNullish)(defaultHeaders),
          // If the user supplied, say 'idempotency-key', override instead of appending by ensuring caps are the same.
          (0, utils_js_1.normalizeHeaders)(userSuppliedHeaders)
        );
      }
      _getUserAgentString(apiMode) {
        const packageVersion = this._stripe.getConstant("PACKAGE_VERSION");
        const appInfo = this._stripe._appInfo ? this._stripe.getAppInfoAsString() : "";
        const aiAgent = this._stripe.getConstant("AI_AGENT");
        let uaString = `Stripe/${apiMode} NodeBindings/${packageVersion}`;
        if (appInfo) {
          uaString += ` ${appInfo}`;
        }
        if (aiAgent) {
          uaString += ` AIAgent/${aiAgent}`;
        }
        return uaString;
      }
      _getTelemetryHeader() {
        if (this._stripe.getTelemetryEnabled() && this._stripe._prevRequestMetrics.length > 0) {
          const metrics = this._stripe._prevRequestMetrics.shift();
          return JSON.stringify({
            last_request_metrics: metrics
          });
        }
      }
      _recordRequestMetrics(requestId, requestDurationMs, usage) {
        if (this._stripe.getTelemetryEnabled() && requestId) {
          if (this._stripe._prevRequestMetrics.length > this._maxBufferedRequestMetric) {
            this._stripe._platformFunctions.emitWarning("Request metrics buffer is full, dropping telemetry message.");
          } else {
            const m = {
              request_id: requestId,
              request_duration_ms: requestDurationMs
            };
            if (usage && usage.length > 0) {
              m.usage = usage;
            }
            this._stripe._prevRequestMetrics.push(m);
          }
        }
      }
      _rawRequest(method, path, params, options, usage) {
        return new Promise((resolve, reject) => {
          try {
            const requestMethod = method.toUpperCase();
            if (requestMethod !== "POST" && params && Object.keys(params).length !== 0) {
              throw new Error("rawRequest only supports params on POST requests. Please pass null and add your parameters to path.");
            }
            const data = requestMethod === "POST" ? Object.assign({}, params) : null;
            const processed = (0, utils_js_1.processOptions)(options);
            if (options?.additionalHeaders) {
              Object.assign(processed.headers, options.additionalHeaders);
            }
            const apiBase = processed.apiBase || (options?.apiBase ?? null);
            const host = apiBase ? this._stripe.resolveBaseAddress(apiBase) : null;
            this._request(requestMethod, host, path, data, processed.authenticator, {
              headers: processed.headers,
              settings: processed.settings,
              streaming: processed.streaming
            }, usage || ["raw_request"], (err, response) => {
              if (err) {
                reject(err);
              } else {
                resolve(response);
              }
            });
          } catch (err) {
            reject(err);
          }
        });
      }
      _getContentLength(data) {
        return typeof data === "string" ? new TextEncoder().encode(data).length : data.length;
      }
      /**
       * This is the main HTTP method that all resources eventually call
       */
      _request(method, host, path, data, authenticator, options, usage = [], callback, requestDataProcessor = null) {
        let requestData;
        authenticator = authenticator ?? this._stripe._authenticator;
        const apiMode = (0, utils_js_1.getAPIMode)(path);
        const retryRequest = (requestFn, apiVersion, headers, requestRetries) => {
          return setTimeout(requestFn, this._getSleepTimeInMS(requestRetries), apiVersion, headers, requestRetries + 1);
        };
        const makeRequest = (apiVersion, headers, numRetries) => {
          const timeout = options.settings && options.settings.timeout && Number.isInteger(options.settings.timeout) && options.settings.timeout >= 0 ? options.settings.timeout : this._stripe.getApiField("timeout");
          const request = {
            host: host || this._stripe.getApiField("host"),
            port: this._stripe.getApiField("port"),
            path,
            method,
            headers: Object.assign({}, headers),
            body: requestData,
            protocol: this._stripe.getApiField("protocol")
          };
          if (!authenticator) {
            throw Error("Authenticator was't initialized. Please pass an API Key or an Authenticator when initializing StripeClient.");
          }
          authenticator(request).then(() => {
            const req = this._stripe.getApiField("httpClient").makeRequest(request.host, request.port, request.path, request.method, request.headers, request.body, request.protocol, timeout);
            const requestStartTime = Date.now();
            const requestEvent = (0, utils_js_1.removeNullish)({
              api_version: apiVersion,
              account: (0, utils_js_1.parseHttpHeaderAsString)(headers["Stripe-Account"]),
              idempotency_key: (0, utils_js_1.parseHttpHeaderAsString)(headers["Idempotency-Key"]),
              method,
              path,
              body: this._stripe.getEmitEventBodiesEnabled() ? data ?? void 0 : void 0,
              request_start_time: requestStartTime
            });
            const requestRetries = numRetries || 0;
            const maxRetries = this._getMaxNetworkRetries(options.settings || {});
            this._stripe._emitter.emit("request", requestEvent);
            req.then((res) => {
              if (_RequestSender._shouldRetry(res, requestRetries, maxRetries)) {
                return retryRequest(makeRequest, apiVersion, headers, requestRetries);
              } else if (options.streaming && res.getStatusCode() < 400) {
                return this._streamingResponseHandler(requestEvent, usage, callback)(res);
              } else {
                return this._jsonResponseHandler(requestEvent, apiMode, usage, callback)(res);
              }
            }).catch((error) => {
              if (_RequestSender._shouldRetry(null, requestRetries, maxRetries, error)) {
                return retryRequest(makeRequest, apiVersion, headers, requestRetries);
              } else {
                const isTimeoutError = error.code && error.code === HttpClient_js_1.HttpClient.TIMEOUT_ERROR_CODE;
                return callback(new Error_js_1.StripeConnectionError({
                  message: isTimeoutError ? `Request aborted due to timeout being reached (${timeout}ms)` : _RequestSender._generateConnectionErrorMessage(requestRetries),
                  detail: error
                }));
              }
            });
          }).catch((e) => {
            throw new Error_js_1.StripeError({
              message: "Unable to authenticate the request",
              exception: e
            });
          });
        };
        const prepareAndMakeRequest = (error, data2) => {
          if (error) {
            return callback(error);
          }
          requestData = data2;
          this._stripe.getClientUserAgent((clientUserAgent) => {
            const apiVersion = this._stripe.getApiField("version");
            const headers = this._makeHeaders({
              contentType: apiMode == "v2" ? "application/json" : "application/x-www-form-urlencoded",
              contentLength: this._getContentLength(data2),
              apiVersion,
              clientUserAgent,
              method,
              // other callers expect null, but .headers being optional means it's undefined if not supplied. So we normalize to null.
              userSuppliedHeaders: options.headers ?? null,
              userSuppliedSettings: options.settings ?? {},
              stripeAccount: options.stripeAccount ?? this._stripe.getApiField("stripeAccount"),
              stripeContext: this._normalizeStripeContext(options.stripeContext, this._stripe.getApiField("stripeContext")),
              apiMode
            });
            makeRequest(apiVersion, headers, 0);
          });
        };
        if (requestDataProcessor) {
          requestDataProcessor(method, data, options.headers, prepareAndMakeRequest);
        } else {
          let stringifiedData;
          if (apiMode == "v2") {
            stringifiedData = data ? (0, utils_js_1.jsonStringifyRequestData)(data) : "";
          } else {
            stringifiedData = (0, utils_js_1.queryStringifyRequestData)(data || {});
          }
          prepareAndMakeRequest(null, stringifiedData);
        }
      }
    };
    exports2.RequestSender = RequestSender;
  }
});

// node_modules/stripe/cjs/Decimal.js
var require_Decimal = __commonJS({
  "node_modules/stripe/cjs/Decimal.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Decimal = exports2.isDecimal = exports2.DEFAULT_DIV_PRECISION = void 0;
    var ROUNDING_PRESETS = {
      "ubb-usage-count": { mode: "significant-figures", value: 15 },
      "v1-api": { mode: "decimal-places", value: 12 }
    };
    exports2.DEFAULT_DIV_PRECISION = 34;
    var PLAIN_NOTATION_DIGIT_LIMIT = 30;
    var MAX_EXPONENT = 1e6;
    var DecimalImpl = class _DecimalImpl {
      /**
       * Construct and normalise a decimal value.
       *
       * @param coefficient - The unscaled integer value.
       * @param exponent - The power-of-ten scale factor.
       *
       * @internal
       */
      constructor(coefficient, exponent) {
        const [normalizedCoef, normalizedExp] = _DecimalImpl.normalize(coefficient, exponent);
        this._coefficient = normalizedCoef;
        this._exponent = normalizedExp;
        Object.freeze(this);
      }
      /**
       * Strip trailing zeros from `coefficient`, incrementing `exponent`
       * for each zero removed. Zero always normalises to `(0n, 0)`.
       *
       * @param coefficient - Raw coefficient before normalisation.
       * @param exponent - Raw exponent before normalisation.
       * @returns A `[coefficient, exponent]` tuple with trailing zeros removed.
       *
       * @internal
       */
      static normalize(coefficient, exponent) {
        if (coefficient === 0n) {
          return [0n, 0];
        }
        let coef = coefficient;
        let exp = exponent;
        while (coef !== 0n && coef % 10n === 0n) {
          coef /= 10n;
          exp += 1;
        }
        return [coef, exp];
      }
      /**
       * Apply rounding to the result of an integer division.
       *
       * @remarks
       * BigInt division truncates toward zero. This helper inspects the
       * `remainder` to decide whether to adjust the truncated `quotient`
       * by ±1 according to the chosen {@link RoundDirection}.
       *
       * The rounding direction is derived from the signs of `remainder`
       * and `divisor`: when they agree the exact fractional part is
       * positive (the truncation point is below the true value, so +1
       * rounds to nearest); when they disagree the fractional part is
       * negative (−1 rounds to nearest).
       *
       * @param quotient - Truncated integer quotient (`dividend / divisor`).
       * @param remainder - Division remainder (`dividend % divisor`).
       * @param divisor - The divisor used in the division.
       * @param direction - The rounding strategy to apply.
       * @returns The rounded quotient.
       *
       * @internal
       */
      static roundDivision(quotient, remainder, divisor, direction) {
        if (remainder === 0n) {
          return quotient;
        }
        if (direction === "round-down") {
          return quotient;
        }
        const roundDir = remainder > 0n === divisor > 0n ? 1n : -1n;
        if (direction === "round-up") {
          return quotient + roundDir;
        }
        if (direction === "ceil") {
          return roundDir === 1n ? quotient + 1n : quotient;
        }
        if (direction === "floor") {
          return roundDir === -1n ? quotient - 1n : quotient;
        }
        const absRemainder = remainder < 0n ? -remainder : remainder;
        const absDivisor = divisor < 0n ? -divisor : divisor;
        const doubled = absRemainder * 2n;
        let cmp;
        if (doubled === absDivisor) {
          cmp = 0;
        } else if (doubled < absDivisor) {
          cmp = -1;
        } else {
          cmp = 1;
        }
        if (cmp < 0) {
          return quotient;
        }
        if (cmp > 0) {
          return quotient + roundDir;
        }
        if (direction === "half-up") {
          return quotient + roundDir;
        }
        if (direction === "half-down") {
          return quotient;
        }
        if (quotient % 2n === 0n) {
          return quotient;
        } else {
          return quotient + roundDir;
        }
      }
      // -------------------------------------------------------------------
      // Arithmetic
      // -------------------------------------------------------------------
      /**
       * Return the sum of this value and `other`.
       *
       * @param other - The addend.
       * @returns A new {@link Decimal} equal to `this + other`.
       *
       * @public
       */
      add(other) {
        const otherImpl = other;
        if (this._exponent === otherImpl._exponent) {
          return new _DecimalImpl(this._coefficient + otherImpl._coefficient, this._exponent);
        }
        if (this._exponent < otherImpl._exponent) {
          const scale = 10n ** BigInt(otherImpl._exponent - this._exponent);
          return new _DecimalImpl(this._coefficient + otherImpl._coefficient * scale, this._exponent);
        } else {
          const scale = 10n ** BigInt(this._exponent - otherImpl._exponent);
          return new _DecimalImpl(this._coefficient * scale + otherImpl._coefficient, otherImpl._exponent);
        }
      }
      /**
       * Return the difference of this value and `other`.
       *
       * @param other - The subtrahend.
       * @returns A new {@link Decimal} equal to `this - other`.
       *
       * @public
       */
      sub(other) {
        const otherImpl = other;
        if (this._exponent === otherImpl._exponent) {
          return new _DecimalImpl(this._coefficient - otherImpl._coefficient, this._exponent);
        }
        if (this._exponent < otherImpl._exponent) {
          const scale = 10n ** BigInt(otherImpl._exponent - this._exponent);
          return new _DecimalImpl(this._coefficient - otherImpl._coefficient * scale, this._exponent);
        } else {
          const scale = 10n ** BigInt(this._exponent - otherImpl._exponent);
          return new _DecimalImpl(this._coefficient * scale - otherImpl._coefficient, otherImpl._exponent);
        }
      }
      /**
       * Return the product of this value and `other`.
       *
       * @param other - The multiplicand.
       * @returns A new {@link Decimal} equal to `this × other`.
       *
       * @public
       */
      mul(other) {
        const otherImpl = other;
        return new _DecimalImpl(this._coefficient * otherImpl._coefficient, this._exponent + otherImpl._exponent);
      }
      /**
       * Return the quotient of this value divided by `other`.
       *
       * @remarks
       * Division scales the dividend to produce `precision` decimal digits
       * in the result, then applies integer division and rounds the
       * remainder according to `direction`.
       *
       * Division requires explicit rounding control — no invisible defaults
       * in financial code. For full precision use {@link DEFAULT_DIV_PRECISION}
       * (34, matching the IEEE 754 decimal128 coefficient size).
       *
       * @example
       * ```ts
       * Decimal.from('1').div(Decimal.from('3'), 5, 'half-up');   // "0.33333"
       * Decimal.from('5').div(Decimal.from('2'), 0, 'half-up');   // "3"
       * Decimal.from('5').div(Decimal.from('2'), 0, 'half-even'); // "2"
       * ```
       *
       * @param other - The divisor. Must not be zero.
       * @param precision - Maximum number of decimal digits in the result.
       * @param direction - How to round when the exact quotient cannot
       *   be represented at the requested precision.
       * @returns A new {@link Decimal} equal to `this ÷ other`, rounded to
       *   `precision` decimal places.
       * @throws {@link Error} if `other` is zero.
       * @throws {@link Error} if `precision` is negative or non-integer.
       *
       * @public
       */
      div(other, precision, direction) {
        if (precision < 0 || !Number.isInteger(precision)) {
          throw new Error("precision must be a non-negative integer");
        }
        const otherImpl = other;
        if (otherImpl._coefficient === 0n) {
          throw new Error("Division by zero");
        }
        const scale = this._exponent - otherImpl._exponent + precision;
        let quotient;
        let remainder;
        let roundingDivisor;
        if (scale >= 0) {
          const scaledDividend = this._coefficient * 10n ** BigInt(scale);
          quotient = scaledDividend / otherImpl._coefficient;
          remainder = scaledDividend % otherImpl._coefficient;
          roundingDivisor = otherImpl._coefficient;
        } else {
          const scaledDivisor = otherImpl._coefficient * 10n ** BigInt(-scale);
          quotient = this._coefficient / scaledDivisor;
          remainder = this._coefficient % scaledDivisor;
          roundingDivisor = scaledDivisor;
        }
        const roundedQuotient = _DecimalImpl.roundDivision(quotient, remainder, roundingDivisor, direction);
        return new _DecimalImpl(roundedQuotient, -precision);
      }
      // -------------------------------------------------------------------
      // Comparison
      // -------------------------------------------------------------------
      /**
       * Three-way comparison of this value with `other`.
       *
       * @example
       * ```ts
       * const a = Decimal.from('1.5');
       * const b = Decimal.from('2');
       * a.cmp(b); // -1
       * b.cmp(a); //  1
       * a.cmp(a); //  0
       * ```
       *
       * @param other - The value to compare against.
       * @returns `-1` if `this \< other`, `0` if equal, `1` if `this \> other`.
       *
       * @public
       */
      cmp(other) {
        const otherImpl = other;
        if (this._exponent === otherImpl._exponent) {
          if (this._coefficient < otherImpl._coefficient)
            return -1;
          if (this._coefficient > otherImpl._coefficient)
            return 1;
          return 0;
        }
        if (this._exponent < otherImpl._exponent) {
          const scale = 10n ** BigInt(otherImpl._exponent - this._exponent);
          const scaledOther = otherImpl._coefficient * scale;
          if (this._coefficient < scaledOther)
            return -1;
          if (this._coefficient > scaledOther)
            return 1;
          return 0;
        } else {
          const scale = 10n ** BigInt(this._exponent - otherImpl._exponent);
          const scaledThis = this._coefficient * scale;
          if (scaledThis < otherImpl._coefficient)
            return -1;
          if (scaledThis > otherImpl._coefficient)
            return 1;
          return 0;
        }
      }
      /**
       * Return `true` if this value is numerically equal to `other`.
       *
       * @param other - The value to compare against.
       * @returns `true` if `this === other` in value, `false` otherwise.
       *
       * @public
       */
      eq(other) {
        return this.cmp(other) === 0;
      }
      /**
       * Return `true` if this value is strictly less than `other`.
       *
       * @param other - The value to compare against.
       * @returns `true` if `this \< other`, `false` otherwise.
       *
       * @public
       */
      lt(other) {
        return this.cmp(other) === -1;
      }
      /**
       * Return `true` if this value is less than or equal to `other`.
       *
       * @param other - The value to compare against.
       * @returns `true` if `this ≤ other`, `false` otherwise.
       *
       * @public
       */
      lte(other) {
        return this.cmp(other) <= 0;
      }
      /**
       * Return `true` if this value is strictly greater than `other`.
       *
       * @param other - The value to compare against.
       * @returns `true` if `this \> other`, `false` otherwise.
       *
       * @public
       */
      gt(other) {
        return this.cmp(other) === 1;
      }
      /**
       * Return `true` if this value is greater than or equal to `other`.
       *
       * @param other - The value to compare against.
       * @returns `true` if `this ≥ other`, `false` otherwise.
       *
       * @public
       */
      gte(other) {
        return this.cmp(other) >= 0;
      }
      // -------------------------------------------------------------------
      // Predicates
      // -------------------------------------------------------------------
      /**
       * Return `true` if this value is exactly zero.
       *
       * @returns `true` if the value is zero, `false` otherwise.
       *
       * @public
       */
      isZero() {
        return this._coefficient === 0n;
      }
      /**
       * Return `true` if this value is strictly less than zero.
       *
       * @returns `true` if negative, `false` if zero or positive.
       *
       * @public
       */
      isNegative() {
        return this._coefficient < 0n;
      }
      /**
       * Return `true` if this value is strictly greater than zero.
       *
       * @returns `true` if positive, `false` if zero or negative.
       *
       * @public
       */
      isPositive() {
        return this._coefficient > 0n;
      }
      // -------------------------------------------------------------------
      // Unary operations
      // -------------------------------------------------------------------
      /**
       * Return the additive inverse of this value.
       *
       * @returns A new {@link Decimal} equal to `-this`.
       *
       * @public
       */
      neg() {
        return new _DecimalImpl(-this._coefficient, this._exponent);
      }
      /**
       * Return the absolute value.
       *
       * @returns A new {@link Decimal} equal to `|this|`. If this value is
       *   already non-negative, returns `this` (no allocation).
       *
       * @public
       */
      abs() {
        if (this._coefficient < 0n) {
          return new _DecimalImpl(-this._coefficient, this._exponent);
        }
        return this;
      }
      // -------------------------------------------------------------------
      // Rounding
      // -------------------------------------------------------------------
      /**
       * Round this value to a specified precision.
       *
       * @remarks
       * **Rounding directions** (IEEE 754-2019 §4.3):
       *
       * | Direction      | Behavior                                       |
       * | -------------- | ---------------------------------------------- |
       * | `'ceil'`       |  1.1→2, -1.1→-1, 1.0→1 (toward +∞)             |
       * | `'floor'`      |  1.9→1, -1.1→-2, 1.0→1 (toward -∞)             |
       * | `'round-down'` |  1.9→1, -1.9→-1 (toward zero / truncate)       |
       * | `'round-up'`   |  1.1→2, -1.1→-2 (away from zero)               |
       * | `'half-up'`    |  0.5→1, 1.5→2, -0.5→-1 (ties away from zero)   |
       * | `'half-down'`  |  0.5→0, 1.5→1, -0.5→0 (ties toward zero)       |
       * | `'half-even'`  |  0.5→0, 1.5→2, 2.5→2, 3.5→4 (ties to even)     |
       *
       * **Precision** is specified as a {@link DecimalRoundingOptions} object
       * or a preset name from {@link DecimalRoundingPresets}:
       *
       * @example
       * ```ts
       * // Using a preset
       * amount.round('half-even', 'v1-api');
       *
       * // Using explicit options
       * amount.round('half-even', { mode: 'decimal-places', value: 2 });
       * amount.round('half-up', { mode: 'significant-figures', value: 4 });
       * ```
       *
       * @param direction - How to round.
       * @param options - A {@link DecimalRoundingOptions} object or key of {@link DecimalRoundingPresets}.
       * @returns A new {@link Decimal} rounded to the specified precision.
       * @throws {@link Error} if `options.value` is negative or non-integer.
       * @throws {@link Error} if the preset name is not recognized.
       *
       * @public
       */
      round(direction, options) {
        const resolved = typeof options === "string" ? (
          // Declaration merging allows consumers to add keys at compile time, but
          // ROUNDING_PRESETS only knows about built-in keys at runtime.  The double
          // cast through `unknown` is intentional: we want an undefined-safe lookup
          // so the runtime guard below can produce a clear error for unrecognised
          // (e.g. declaration-merged) preset names that were not also added to
          // ROUNDING_PRESETS.
          ROUNDING_PRESETS[options]
        ) : options;
        if (resolved === void 0) {
          throw new Error(`Unknown rounding preset: "${options}"`);
        }
        if (resolved.value < 0 || !Number.isInteger(resolved.value)) {
          throw new Error("DecimalRoundingOptions.value must be a non-negative integer");
        }
        if (resolved.mode === "decimal-places") {
          const fixed = this.toFixed(resolved.value, direction);
          return exports2.Decimal.from(fixed);
        }
        if (this._coefficient === 0n) {
          return this;
        }
        const coeffStr = this._coefficient < 0n ? (-this._coefficient).toString() : this._coefficient.toString();
        const currentSigFigs = coeffStr.length;
        if (resolved.value === 0) {
          return exports2.Decimal.zero;
        }
        if (currentSigFigs <= resolved.value) {
          return this;
        }
        const digitsToTrim = currentSigFigs - resolved.value;
        const divisor = 10n ** BigInt(digitsToTrim);
        const quotient = this._coefficient / divisor;
        const remainder = this._coefficient % divisor;
        const rounded = _DecimalImpl.roundDivision(quotient, remainder, divisor, direction);
        return new _DecimalImpl(rounded, this._exponent + digitsToTrim);
      }
      // -------------------------------------------------------------------
      // Conversion / serialisation
      // -------------------------------------------------------------------
      /**
       * Return a human-readable string representation.
       *
       * @remarks
       * Plain notation for values whose digit count is at most 30, and
       * scientific notation (`1.23E+40`) for larger values. Trailing zeros
       * are never present because the internal representation is normalised.
       *
       * @public
       */
      toString() {
        if (this._coefficient === 0n) {
          return "0";
        }
        const coeffStr = this._coefficient.toString();
        const isNeg = coeffStr.startsWith("-");
        const absCoeffStr = isNeg ? coeffStr.slice(1) : coeffStr;
        if (this._exponent < 0) {
          const decimalPlaces = -this._exponent;
          const leadingZeroCount = decimalPlaces >= absCoeffStr.length ? decimalPlaces - absCoeffStr.length : 0;
          if (leadingZeroCount > PLAIN_NOTATION_DIGIT_LIMIT) {
            if (absCoeffStr.length === 1) {
              return `${coeffStr}E${String(this._exponent)}`;
            }
            const intPart = absCoeffStr[0] ?? "";
            const fracPart = absCoeffStr.slice(1);
            const adjustedExp = this._exponent + absCoeffStr.length - 1;
            return `${isNeg ? "-" : ""}${intPart}.${fracPart}E${String(adjustedExp)}`;
          }
          if (decimalPlaces >= absCoeffStr.length) {
            const leadingZeros = "0".repeat(decimalPlaces - absCoeffStr.length);
            return `${isNeg ? "-" : ""}0.${leadingZeros}${absCoeffStr}`;
          } else {
            const integerPart = absCoeffStr.slice(0, absCoeffStr.length - decimalPlaces);
            const fractionalPart = absCoeffStr.slice(absCoeffStr.length - decimalPlaces);
            return `${isNeg ? "-" : ""}${integerPart}.${fractionalPart}`;
          }
        }
        const plainLength = absCoeffStr.length + this._exponent;
        if (plainLength <= PLAIN_NOTATION_DIGIT_LIMIT) {
          if (this._exponent === 0) {
            return coeffStr;
          }
          const trailingZeros = "0".repeat(this._exponent);
          return `${isNeg ? "-" : ""}${absCoeffStr}${trailingZeros}`;
        } else {
          if (absCoeffStr.length === 1) {
            return `${coeffStr}E+${String(this._exponent)}`;
          }
          const integerPart = absCoeffStr[0] ?? "";
          const fractionalPart = absCoeffStr.slice(1);
          const adjustedExponent = this._exponent + absCoeffStr.length - 1;
          return `${isNeg ? "-" : ""}${integerPart}.${fractionalPart}E+${String(adjustedExponent)}`;
        }
      }
      /**
       * Return the JSON-serialisable representation.
       *
       * @remarks
       * Returns a plain string matching the Stripe API convention where
       * decimal values are serialised as strings in JSON. Called
       * automatically by `JSON.stringify`.
       *
       * @public
       */
      toJSON() {
        return this.toString();
      }
      /**
       * Convert to a JavaScript `number`.
       *
       * @remarks
       * This is an explicit, intentionally lossy conversion. Use it only
       * when you need a numeric value for display or interop with APIs
       * that require `number`. Prefer {@link Decimal.toString | toString}
       * or {@link Decimal.toFixed | toFixed} for lossless output.
       *
       * @public
       */
      toNumber() {
        return Number(this.toString());
      }
      /**
       * Format this value as a fixed-point string with exactly
       * `decimalPlaces` digits after the decimal point.
       *
       * @remarks
       * Values are rounded according to `direction` when the internal
       * precision exceeds the requested number of decimal places.
       * The rounding direction is always required — no invisible defaults
       * in financial code.
       *
       * @example
       * ```ts
       * Decimal.from('1.235').toFixed(2, 'half-up');   // "1.24"
       * Decimal.from('1.225').toFixed(2, 'half-even'); // "1.22"
       * Decimal.from('42').toFixed(3, 'half-up');      // "42.000"
       * ```
       *
       * @param decimalPlaces - Number of digits after the decimal point.
       *   Must be a non-negative integer.
       * @param direction - How to round when truncating excess digits.
       * @returns A string with exactly `decimalPlaces` fractional digits.
       * @throws {@link Error} if `decimalPlaces` is negative or non-integer.
       *
       * @public
       */
      toFixed(decimalPlaces, direction) {
        if (decimalPlaces < 0 || !Number.isInteger(decimalPlaces)) {
          throw new Error("decimalPlaces must be a non-negative integer");
        }
        const formatFixed = (coef) => {
          const coeffStr = coef.toString();
          const isNeg = coeffStr.startsWith("-");
          const absCoeffStr = isNeg ? coeffStr.slice(1) : coeffStr;
          if (decimalPlaces === 0) {
            return coeffStr;
          }
          if (decimalPlaces >= absCoeffStr.length) {
            const leadingZeros = "0".repeat(decimalPlaces - absCoeffStr.length);
            return `${isNeg ? "-" : ""}0.${leadingZeros}${absCoeffStr}`;
          } else {
            const integerPart = absCoeffStr.slice(0, absCoeffStr.length - decimalPlaces);
            const fractionalPart = absCoeffStr.slice(absCoeffStr.length - decimalPlaces);
            return `${isNeg ? "-" : ""}${integerPart}.${fractionalPart}`;
          }
        };
        const targetExponent = -decimalPlaces;
        if (this._exponent === targetExponent) {
          return formatFixed(this._coefficient);
        }
        if (this._exponent < targetExponent) {
          const scaleDiff = targetExponent - this._exponent;
          const divisor = 10n ** BigInt(scaleDiff);
          const quotient = this._coefficient / divisor;
          const remainder = this._coefficient % divisor;
          const rounded = _DecimalImpl.roundDivision(quotient, remainder, divisor, direction);
          return formatFixed(rounded);
        } else {
          const scaleDiff = this._exponent - targetExponent;
          const scaled = this._coefficient * 10n ** BigInt(scaleDiff);
          return formatFixed(scaled);
        }
      }
      /**
       * Return a string primitive when the runtime coerces the value.
       *
       * @remarks
       * Deliberately returns a `string` (not a `number`) to discourage
       * silent precision loss through implicit arithmetic coercion.
       * When used in a numeric context (for example, `+myDecimal`), the
       * JavaScript runtime will first call this method and then coerce
       * the resulting string to a `number`, which may lose precision.
       * Callers should prefer the explicit
       * {@link Decimal.toNumber | toNumber} method when an IEEE 754
       * `number` is required.
       *
       * @public
       */
      valueOf() {
        return this.toString();
      }
    };
    function isDecimal(value) {
      return value instanceof DecimalImpl;
    }
    exports2.isDecimal = isDecimal;
    exports2.Decimal = {
      /**
       * Create a {@link Decimal} from a string, number, or bigint.
       *
       * @remarks
       * - **string**: Parsed as a decimal literal. Accepts an optional sign,
       *   integer digits, an optional fractional part, and an optional `e`/`E`
       *   exponent. Leading/trailing whitespace is trimmed.
       * - **number**: Must be finite. Converted via `Number.prototype.toString()`
       *   then parsed, so `Decimal.from(0.1)` produces `"0.1"` (not the
       *   53-bit binary approximation).
       * - **bigint**: Treated as an integer with exponent 0.
       *
       * @example
       * ```ts
       * Decimal.from('1.23');   // string
       * Decimal.from(42);       // number
       * Decimal.from(100n);     // bigint
       * Decimal.from('1.5e3');  // scientific notation → 1500
       * ```
       *
       * @param value - The value to convert.
       * @returns A new frozen {@link Decimal} instance.
       * @throws {@link Error} if `value` is a non-finite number, an empty
       *   string, or a string that does not match the decimal literal grammar.
       *
       * @public
       */
      from(value) {
        if (typeof value === "bigint") {
          return new DecimalImpl(value, 0);
        }
        if (typeof value === "number") {
          if (!Number.isFinite(value)) {
            throw new Error("Number must be finite");
          }
          return exports2.Decimal.from(value.toString());
        }
        const trimmed = value.trim();
        if (trimmed === "") {
          throw new Error("Cannot parse empty string as Decimal");
        }
        const match = /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(trimmed);
        if (!match) {
          throw new Error(`Invalid decimal string: ${value}`);
        }
        const sign = match[1] === "-" ? -1n : 1n;
        const integerPart = match[2] ?? "";
        const fractionalPart = match[3] ?? "";
        const exponentPart = match[4] ? Number(match[4]) : 0;
        if (!Number.isSafeInteger(exponentPart) || exponentPart > MAX_EXPONENT || exponentPart < -MAX_EXPONENT) {
          throw new Error(`Exponent out of range: ${String(match[4])} exceeds safe integer bounds`);
        }
        const coefficientStr = integerPart + fractionalPart;
        const coefficient = sign * BigInt(coefficientStr);
        const exponent = exponentPart - fractionalPart.length;
        if (!Number.isSafeInteger(exponent) || exponent > MAX_EXPONENT || exponent < -MAX_EXPONENT) {
          throw new Error(`Computed exponent out of range: ${String(exponent)} exceeds safe integer bounds`);
        }
        return new DecimalImpl(coefficient, exponent);
      },
      /**
       * The {@link Decimal} value representing zero.
       *
       * @remarks
       * Pre-allocated singleton — prefer `Decimal.zero` over
       * `Decimal.from(0)` to avoid an unnecessary allocation.
       *
       * @public
       */
      zero: new DecimalImpl(0n, 0)
    };
  }
});

// node_modules/stripe/cjs/V2Coercion.js
var require_V2Coercion = __commonJS({
  "node_modules/stripe/cjs/V2Coercion.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.coerceV2ResponseData = exports2.coerceV2RequestData = void 0;
    var Decimal_js_1 = require_Decimal();
    var coerceV2RequestData = (data, schema) => {
      if (data == null) {
        return data;
      }
      switch (schema.kind) {
        case "int64_string":
          return typeof data === "bigint" || typeof data === "number" ? String(data) : data;
        case "decimal_string":
          return typeof data.toFixed === "function" && typeof data.isZero === "function" ? data.toString() : data;
        case "object": {
          if (typeof data !== "object" || Array.isArray(data)) {
            return data;
          }
          const obj = data;
          const result = {};
          for (const key of Object.keys(obj)) {
            const fieldSchema = schema.fields[key];
            result[key] = fieldSchema ? (0, exports2.coerceV2RequestData)(obj[key], fieldSchema) : obj[key];
          }
          return result;
        }
        case "array": {
          if (!Array.isArray(data)) {
            return data;
          }
          return data.map((element) => (0, exports2.coerceV2RequestData)(element, schema.element));
        }
        case "nullable":
          return (0, exports2.coerceV2RequestData)(data, schema.inner);
      }
    };
    exports2.coerceV2RequestData = coerceV2RequestData;
    var coerceV2ResponseData = (data, schema) => {
      if (data == null) {
        return data;
      }
      switch (schema.kind) {
        case "int64_string":
          if (typeof data === "string") {
            try {
              return BigInt(data);
            } catch {
              throw new Error(`Failed to coerce int64_string value: expected an integer string, got '${data}'`);
            }
          }
          return data;
        case "decimal_string":
          if (typeof data === "string") {
            try {
              return Decimal_js_1.Decimal.from(data);
            } catch {
              throw new Error(`Failed to coerce decimal_string value: expected a decimal string, got '${data}'`);
            }
          }
          return data;
        case "object": {
          if (typeof data !== "object" || Array.isArray(data)) {
            return data;
          }
          const obj = data;
          for (const key of Object.keys(schema.fields)) {
            if (key in obj) {
              obj[key] = (0, exports2.coerceV2ResponseData)(obj[key], schema.fields[key]);
            }
          }
          return obj;
        }
        case "array": {
          if (!Array.isArray(data)) {
            return data;
          }
          for (let i = 0; i < data.length; i++) {
            data[i] = (0, exports2.coerceV2ResponseData)(data[i], schema.element);
          }
          return data;
        }
        case "nullable":
          return (0, exports2.coerceV2ResponseData)(data, schema.inner);
      }
    };
    exports2.coerceV2ResponseData = coerceV2ResponseData;
  }
});

// node_modules/stripe/cjs/autoPagination.js
var require_autoPagination = __commonJS({
  "node_modules/stripe/cjs/autoPagination.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeAutoPaginationMethods = void 0;
    var utils_js_1 = require_utils();
    var V1Iterator = class {
      constructor(firstPagePromise, params, options, method, path, spec, stripeResource) {
        this.index = 0;
        this.pagePromise = firstPagePromise;
        this.promiseCache = { currentPromise: null };
        this.params = params;
        this.options = options;
        this.method = method;
        this.path = path;
        this.spec = spec;
        this.stripeResource = stripeResource;
      }
      async iterate(pageResult) {
        if (!(pageResult && pageResult.data && typeof pageResult.data.length === "number")) {
          throw Error("Unexpected: Stripe API response does not have a well-formed `data` array.");
        }
        const reverseIteration = !!this.params.ending_before;
        if (this.index < pageResult.data.length) {
          const idx = reverseIteration ? pageResult.data.length - 1 - this.index : this.index;
          const value = pageResult.data[idx];
          this.index += 1;
          return { value, done: false };
        } else if (pageResult.has_more) {
          this.index = 0;
          this.pagePromise = this.getNextPage(pageResult);
          const nextPageResult = await this.pagePromise;
          return this.iterate(nextPageResult);
        }
        return { done: true, value: void 0 };
      }
      /** @abstract */
      getNextPage(_pageResult) {
        throw new Error("Unimplemented");
      }
      async _next() {
        return this.iterate(await this.pagePromise);
      }
      next() {
        if (this.promiseCache.currentPromise) {
          return this.promiseCache.currentPromise;
        }
        const nextPromise = (async () => {
          const ret = await this._next();
          this.promiseCache.currentPromise = null;
          return ret;
        })();
        this.promiseCache.currentPromise = nextPromise;
        return nextPromise;
      }
    };
    var V1ListIterator = class extends V1Iterator {
      getNextPage(pageResult) {
        const reverseIteration = !!this.params.ending_before;
        const lastId = getLastId(pageResult, reverseIteration);
        const nextParams = {
          ...this.params,
          [reverseIteration ? "ending_before" : "starting_after"]: lastId
        };
        return this.stripeResource._makeRequest(this.method, this.path, nextParams, this.options, this.spec);
      }
    };
    var V1SearchIterator = class extends V1Iterator {
      getNextPage(pageResult) {
        if (!pageResult.next_page) {
          throw Error("Unexpected: Stripe API response does not have a well-formed `next_page` field, but `has_more` was true.");
        }
        const nextParams = {
          ...this.params,
          page: pageResult.next_page
        };
        return this.stripeResource._makeRequest(this.method, this.path, nextParams, this.options, this.spec);
      }
    };
    var V2ListIterator = class {
      constructor(firstPagePromise, options, spec, stripeResource) {
        this.firstPagePromise = firstPagePromise;
        this.currentPageIterator = null;
        this.nextPageUrl = null;
        this.promiseCache = { currentPromise: null };
        this.options = options;
        this.spec = spec;
        this.stripeResource = stripeResource;
      }
      async initFirstPage() {
        if (this.firstPagePromise) {
          const page = await this.firstPagePromise;
          this.firstPagePromise = null;
          this.currentPageIterator = page.data[Symbol.iterator]();
          this.nextPageUrl = page.next_page_url || null;
        }
      }
      async turnPage() {
        if (!this.nextPageUrl)
          return null;
        const page = await this.stripeResource._makeRequest("GET", this.nextPageUrl, void 0, this.options, this.spec);
        this.nextPageUrl = page.next_page_url || null;
        this.currentPageIterator = page.data[Symbol.iterator]();
        return this.currentPageIterator;
      }
      async _next() {
        await this.initFirstPage();
        if (this.currentPageIterator) {
          const result = this.currentPageIterator.next();
          if (!result.done)
            return { done: false, value: result.value };
        }
        return this.nextFromNewPage();
      }
      async nextFromNewPage() {
        const nextPageIterator = await this.turnPage();
        if (!nextPageIterator) {
          return { done: true, value: void 0 };
        }
        const result = nextPageIterator.next();
        if (!result.done)
          return { done: false, value: result.value };
        return this.nextFromNewPage();
      }
      next() {
        if (this.promiseCache.currentPromise) {
          return this.promiseCache.currentPromise;
        }
        const nextPromise = (async () => {
          try {
            return await this._next();
          } finally {
            this.promiseCache.currentPromise = null;
          }
        })();
        this.promiseCache.currentPromise = nextPromise;
        return nextPromise;
      }
    };
    var makeAutoPaginationMethods = (stripeResource, params, options, method, path, spec, firstPagePromise) => {
      const apiMode = (0, utils_js_1.getAPIMode)(path);
      const methodType = spec?.methodType;
      if (apiMode !== "v2" && methodType === "search") {
        return makeAutoPaginationMethodsFromIterator(new V1SearchIterator(firstPagePromise, params, options, method, path, spec, stripeResource));
      }
      if (apiMode !== "v2" && methodType === "list") {
        return makeAutoPaginationMethodsFromIterator(new V1ListIterator(firstPagePromise, params, options, method, path, spec, stripeResource));
      }
      if (apiMode === "v2" && methodType === "list") {
        return makeAutoPaginationMethodsFromIterator(new V2ListIterator(firstPagePromise, options, spec, stripeResource));
      }
      return null;
    };
    exports2.makeAutoPaginationMethods = makeAutoPaginationMethods;
    var makeAutoPaginationMethodsFromIterator = (iterator) => {
      const autoPagingEach = makeAutoPagingEach((...args) => iterator.next(...args));
      const autoPagingToArray = makeAutoPagingToArray(autoPagingEach);
      const autoPaginationMethods = {
        autoPagingEach,
        autoPagingToArray,
        // Async iterator functions:
        next: () => iterator.next(),
        return: () => {
          return {};
        },
        [getAsyncIteratorSymbol()]: () => {
          return autoPaginationMethods;
        }
      };
      return autoPaginationMethods;
    };
    function getAsyncIteratorSymbol() {
      if (typeof Symbol !== "undefined" && Symbol.asyncIterator) {
        return Symbol.asyncIterator;
      }
      return "@@asyncIterator";
    }
    function getDoneCallback(args) {
      if (args.length < 2) {
        return null;
      }
      const onDone = args[1];
      if (typeof onDone !== "function") {
        throw Error(`The second argument to autoPagingEach, if present, must be a callback function; received ${typeof onDone}`);
      }
      return onDone;
    }
    function getItemCallback(args) {
      if (args.length === 0) {
        return void 0;
      }
      const onItem = args[0];
      if (typeof onItem !== "function") {
        throw Error(`The first argument to autoPagingEach, if present, must be a callback function; received ${typeof onItem}`);
      }
      if (onItem.length === 2) {
        return onItem;
      }
      if (onItem.length > 2) {
        throw Error(`The \`onItem\` callback function passed to autoPagingEach must accept at most two arguments; got ${onItem}`);
      }
      return function _onItem(item, next) {
        const shouldContinue = onItem(item);
        next(shouldContinue);
      };
    }
    function getLastId(listResult, reverseIteration) {
      const lastIdx = reverseIteration ? 0 : listResult.data.length - 1;
      const lastItem = listResult.data[lastIdx];
      const lastId = lastItem && lastItem.id;
      if (!lastId) {
        throw Error("Unexpected: No `id` found on the last item while auto-paging a list.");
      }
      return lastId;
    }
    function makeAutoPagingEach(asyncIteratorNext) {
      return function autoPagingEach() {
        const callSiteStack = new Error().stack;
        const args = [].slice.call(arguments);
        const onItem = getItemCallback(args);
        const onDone = getDoneCallback(args);
        if (args.length > 2) {
          throw Error(`autoPagingEach takes up to two arguments; received ${args}`);
        }
        const autoPagePromise = wrapAsyncIteratorWithCallback(
          asyncIteratorNext,
          // @ts-ignore we might need a null check
          onItem
        ).catch((err) => {
          (0, utils_js_1.attachCallSiteToError)(err, callSiteStack);
          throw err;
        });
        if (onDone) {
          autoPagePromise.then(() => onDone(), (err) => onDone(err));
        }
        return autoPagePromise;
      };
    }
    function makeAutoPagingToArray(autoPagingEach) {
      return function autoPagingToArray(opts, onDone) {
        const callSiteStack = new Error().stack;
        const limit = opts && opts.limit;
        if (!limit) {
          throw Error("You must pass a `limit` option to autoPagingToArray, e.g., `autoPagingToArray({limit: 1000});`.");
        }
        if (limit > 1e4) {
          throw Error("You cannot specify a limit of more than 10,000 items to fetch in `autoPagingToArray`; use `autoPagingEach` to iterate through longer lists.");
        }
        const promise = new Promise((resolve, reject) => {
          const items = [];
          autoPagingEach((item) => {
            items.push(item);
            if (items.length >= limit) {
              return false;
            }
          }).then(() => {
            resolve(items);
          }).catch((err) => {
            (0, utils_js_1.attachCallSiteToError)(err, callSiteStack);
            reject(err);
          });
        });
        if (onDone) {
          promise.then((items) => onDone(null, items), (err) => onDone(err));
        }
        return promise;
      };
    }
    function wrapAsyncIteratorWithCallback(asyncIteratorNext, onItem) {
      return new Promise((resolve, reject) => {
        function handleIteration(iterResult) {
          if (iterResult.done) {
            resolve();
            return;
          }
          const item = iterResult.value;
          return new Promise((next) => {
            onItem(item, next);
          }).then((shouldContinue) => {
            if (shouldContinue === false) {
              return handleIteration({ done: true, value: void 0 });
            } else {
              return asyncIteratorNext().then(handleIteration);
            }
          });
        }
        asyncIteratorNext().then(handleIteration).catch(reject);
      });
    }
  }
});

// node_modules/stripe/cjs/StripeResource.js
var require_StripeResource = __commonJS({
  "node_modules/stripe/cjs/StripeResource.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.StripeResource = void 0;
    var utils_js_1 = require_utils();
    var V2Coercion_js_1 = require_V2Coercion();
    var autoPagination_js_1 = require_autoPagination();
    var StripeResource = class {
      constructor(stripe, deprecatedUrlData) {
        this.resourcePath = "";
        this.requestDataProcessor = null;
        this._stripe = stripe;
        if (deprecatedUrlData) {
          throw new Error("Support for curried url params was dropped in stripe-node v7.0.0. Instead, pass two ids.");
        }
        this.basePath = (0, utils_js_1.makeURLInterpolator)(
          // @ts-expect-error changing type of basePath
          this.basePath || stripe.getApiField("basePath")
        );
        const rawPath = this.path || "";
        this.resourcePath = rawPath;
        this.path = (0, utils_js_1.makeURLInterpolator)(rawPath);
        this.initialize(stripe, deprecatedUrlData);
      }
      initialize(_stripe, _deprecatedUrlData) {
      }
      _makeRequest(method, path, params, options, spec) {
        const requestMethod = method.toUpperCase();
        const encode = spec?.encode || ((data2) => data2);
        const data = encode(params ? { ...params } : {});
        const processed = (0, utils_js_1.processOptions)(options);
        const apiBase = processed.apiBase || spec?.apiBase || null;
        const host = apiBase ? this._stripe.resolveBaseAddress(apiBase) : null;
        const streaming = processed.streaming || !!spec?.streaming;
        const headers = Object.assign(processed.headers, spec?.headers);
        const usage = spec?.usage || [];
        const dataInQuery = requestMethod === "GET" || requestMethod === "DELETE";
        let bodyData = dataInQuery ? null : data;
        const queryData = dataInQuery ? data : {};
        try {
          if (spec?.validator) {
            spec.validator(data, { headers });
          }
          if (spec?.requestSchema && bodyData) {
            bodyData = (0, V2Coercion_js_1.coerceV2RequestData)(bodyData, spec.requestSchema);
          }
        } catch (err) {
          return Promise.reject(err);
        }
        const callSiteStack = new Error().stack;
        const innerPromise = new Promise((resolve, reject) => {
          function requestCallback(err, response) {
            if (err) {
              (0, utils_js_1.attachCallSiteToError)(err, callSiteStack);
              reject(err);
            } else {
              try {
                if (spec?.responseSchema) {
                  (0, V2Coercion_js_1.coerceV2ResponseData)(response, spec.responseSchema);
                }
                resolve(spec?.transformResponseData ? spec.transformResponseData(response) : response);
              } catch (e) {
                reject(e);
              }
            }
          }
          const emptyQuery = Object.keys(queryData).length === 0;
          const fullPath = [
            path,
            emptyQuery ? "" : "?",
            (0, utils_js_1.queryStringifyRequestData)(queryData)
          ].join("");
          this._stripe._requestSender._request(requestMethod, host, fullPath, bodyData, processed.authenticator, {
            headers,
            settings: processed.settings,
            streaming
          }, usage, requestCallback, this.requestDataProcessor?.bind(this));
        });
        if (spec?.methodType) {
          Object.assign(innerPromise, (0, autoPagination_js_1.makeAutoPaginationMethods)(this, params ? { ...params } : {}, options, requestMethod, path, spec, innerPromise));
        }
        return innerPromise;
      }
    };
    exports2.StripeResource = StripeResource;
    StripeResource.MAX_BUFFERED_REQUEST_METRICS = 100;
  }
});

// node_modules/stripe/cjs/StripeContext.js
var require_StripeContext = __commonJS({
  "node_modules/stripe/cjs/StripeContext.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.StripeContext = void 0;
    var StripeContext = class _StripeContext {
      /**
       * Creates a new StripeContext with the given segments.
       */
      constructor(segments = []) {
        this._segments = [...segments];
      }
      /**
       * Gets a copy of the segments of this Context.
       */
      get segments() {
        return [...this._segments];
      }
      /**
       * Creates a new StripeContext with an additional segment appended.
       */
      push(segment) {
        if (!segment) {
          throw new Error("Segment cannot be null or undefined");
        }
        return new _StripeContext([...this._segments, segment]);
      }
      /**
       * Creates a new StripeContext with the last segment removed.
       * If there are no segments, throws an error.
       */
      pop() {
        if (this._segments.length === 0) {
          throw new Error("Cannot pop from an empty context");
        }
        return new _StripeContext(this._segments.slice(0, -1));
      }
      /**
       * Converts this context to its string representation.
       */
      toString() {
        return this._segments.join("/");
      }
      /**
       * Parses a context string into a StripeContext instance.
       */
      static parse(contextStr) {
        if (!contextStr) {
          return new _StripeContext([]);
        }
        return new _StripeContext(contextStr.split("/"));
      }
    };
    exports2.StripeContext = StripeContext;
  }
});

// node_modules/stripe/cjs/Webhooks.js
var require_Webhooks = __commonJS({
  "node_modules/stripe/cjs/Webhooks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createWebhooks = void 0;
    var Error_js_1 = require_Error();
    var CryptoProvider_js_1 = require_CryptoProvider();
    function createWebhooks(platformFunctions) {
      const Webhook = {
        DEFAULT_TOLERANCE: 300,
        signature: null,
        constructEvent(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
          try {
            if (!this.signature) {
              throw new Error("ERR: missing signature helper, unable to verify");
            }
            cryptoProvider = cryptoProvider || getCryptoProvider();
            this.signature.verifyHeader(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
          } catch (e) {
            if (e instanceof CryptoProvider_js_1.CryptoProviderOnlySupportsAsyncError) {
              e.message += "\nUse `await constructEventAsync(...)` instead of `constructEvent(...)`";
            }
            throw e;
          }
          const jsonPayload = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
          if (jsonPayload && jsonPayload.object === "v2.core.event") {
            throw new Error("You passed an event notification to stripe.webhooks.constructEvent, which expects a webhook payload. Use stripe.parseEventNotification instead.");
          }
          return jsonPayload;
        },
        async constructEventAsync(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
          if (!this.signature) {
            throw new Error("ERR: missing signature helper, unable to verify");
          }
          cryptoProvider = cryptoProvider || getCryptoProvider();
          await this.signature.verifyHeaderAsync(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
          const jsonPayload = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
          if (jsonPayload && jsonPayload.object === "v2.core.event") {
            throw new Error("You passed an event notification to stripe.webhooks.constructEvent, which expects a webhook payload. Use stripe.parseEventNotificationAsync instead.");
          }
          return jsonPayload;
        },
        /**
         * Generates a header to be used for webhook mocking
         *
         * @typedef {object} opts
         * @property {number} timestamp - Timestamp of the header. Defaults to Date.now()
         * @property {string} payload - JSON stringified payload object, containing the 'id' and 'object' parameters
         * @property {string} secret - Stripe webhook secret 'whsec_...'
         * @property {string} scheme - Version of API to hit. Defaults to 'v1'.
         * @property {string} signature - Computed webhook signature
         * @property {CryptoProvider} cryptoProvider - Crypto provider to use for computing the signature if none was provided. Defaults to NodeCryptoProvider.
         */
        generateTestHeaderString: function(opts) {
          const preparedOpts = prepareOptions(opts);
          const signature2 = preparedOpts.signature || preparedOpts.cryptoProvider.computeHMACSignature(preparedOpts.payloadString, preparedOpts.secret);
          return preparedOpts.generateHeaderString(signature2);
        },
        generateTestHeaderStringAsync: async function(opts) {
          const preparedOpts = prepareOptions(opts);
          const signature2 = preparedOpts.signature || await preparedOpts.cryptoProvider.computeHMACSignatureAsync(preparedOpts.payloadString, preparedOpts.secret);
          return preparedOpts.generateHeaderString(signature2);
        }
      };
      const signature = {
        EXPECTED_SCHEME: "v1",
        verifyHeader(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
          const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
          const secretContainsWhitespace = /\s/.test(secret);
          cryptoProvider = cryptoProvider || getCryptoProvider();
          const expectedSignature = cryptoProvider.computeHMACSignature(makeHMACContent(payload, details), secret);
          validateComputedSignature(payload, header, details, expectedSignature, tolerance || 0, suspectPayloadType, secretContainsWhitespace, receivedAt);
          return true;
        },
        async verifyHeaderAsync(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
          const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
          const secretContainsWhitespace = /\s/.test(secret);
          cryptoProvider = cryptoProvider || getCryptoProvider();
          const expectedSignature = await cryptoProvider.computeHMACSignatureAsync(makeHMACContent(payload, details), secret);
          return validateComputedSignature(payload, header, details, expectedSignature, tolerance || 0, suspectPayloadType, secretContainsWhitespace, receivedAt);
        }
      };
      function makeHMACContent(payload, details) {
        return `${details.timestamp}.${payload}`;
      }
      function parseEventDetails(encodedPayload, encodedHeader, expectedScheme) {
        if (Array.isArray(encodedHeader)) {
          throw new Error("Unexpected: An array was passed as a header, which should not be possible for the stripe-signature header.");
        }
        if (!encodedPayload) {
          throw new Error_js_1.StripeSignatureVerificationError(encodedHeader, encodedPayload, {
            message: "No webhook payload was provided."
          });
        }
        const suspectPayloadType = typeof encodedPayload != "string" && !(encodedPayload instanceof Uint8Array);
        const textDecoder = new TextDecoder("utf8");
        const decodedPayload = encodedPayload instanceof Uint8Array ? textDecoder.decode(encodedPayload) : encodedPayload;
        if (encodedHeader == null || encodedHeader == "") {
          throw new Error_js_1.StripeSignatureVerificationError(encodedHeader, encodedPayload, {
            message: "No stripe-signature header value was provided."
          });
        }
        const decodedHeader = encodedHeader instanceof Uint8Array ? textDecoder.decode(encodedHeader) : encodedHeader;
        const details = parseHeader(decodedHeader, expectedScheme);
        if (!details || details.timestamp === -1) {
          throw new Error_js_1.StripeSignatureVerificationError(decodedHeader, decodedPayload, {
            message: "Unable to extract timestamp and signatures from header"
          });
        }
        if (!details.signatures.length) {
          throw new Error_js_1.StripeSignatureVerificationError(decodedHeader, decodedPayload, {
            message: "No signatures found with expected scheme"
          });
        }
        return {
          decodedPayload,
          decodedHeader,
          details,
          suspectPayloadType
        };
      }
      function validateComputedSignature(payload, header, details, expectedSignature, tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt) {
        const signatureFound = !!details.signatures.filter(platformFunctions.secureCompare.bind(platformFunctions, expectedSignature)).length;
        const docsLocation = "\nLearn more about webhook signing and explore webhook integration examples for various frameworks at https://docs.stripe.com/webhooks/signature";
        const whitespaceMessage = secretContainsWhitespace ? "\n\nNote: The provided signing secret contains whitespace. This often indicates an extra newline or space is in the value" : "";
        if (!signatureFound) {
          if (suspectPayloadType) {
            throw new Error_js_1.StripeSignatureVerificationError(header, payload, {
              message: "Webhook payload must be provided as a string or a Buffer (https://nodejs.org/api/buffer.html) instance representing the _raw_ request body.Payload was provided as a parsed JavaScript object instead. \nSignature verification is impossible without access to the original signed material. \n" + docsLocation + "\n" + whitespaceMessage
            });
          }
          throw new Error_js_1.StripeSignatureVerificationError(header, payload, {
            message: "No signatures found matching the expected signature for payload. Are you passing the raw request body you received from Stripe? \n If a webhook request is being forwarded by a third-party tool, ensure that the exact request body, including JSON formatting and new line style, is preserved.\n" + docsLocation + "\n" + whitespaceMessage
          });
        }
        const timestampAge = Math.floor((typeof receivedAt === "number" ? receivedAt : Date.now()) / 1e3) - details.timestamp;
        if (tolerance > 0 && timestampAge > tolerance) {
          throw new Error_js_1.StripeSignatureVerificationError(header, payload, {
            message: "Timestamp outside the tolerance zone"
          });
        }
        return true;
      }
      function parseHeader(header, scheme) {
        if (typeof header !== "string") {
          return null;
        }
        scheme = scheme || signature.EXPECTED_SCHEME;
        return header.split(",").reduce((accum, item) => {
          const kv = item.split("=");
          if (kv[0] === "t") {
            accum.timestamp = parseInt(kv[1], 10);
          }
          if (kv[0] === scheme) {
            accum.signatures.push(kv[1]);
          }
          return accum;
        }, {
          timestamp: -1,
          signatures: []
        });
      }
      let webhooksCryptoProviderInstance = null;
      function getCryptoProvider() {
        if (!webhooksCryptoProviderInstance) {
          webhooksCryptoProviderInstance = platformFunctions.createDefaultCryptoProvider();
        }
        return webhooksCryptoProviderInstance;
      }
      function prepareOptions(opts) {
        if (!opts) {
          throw new Error_js_1.StripeError({
            message: "Options are required"
          });
        }
        const timestamp = opts.timestamp && Math.floor(opts.timestamp) || Math.floor(Date.now() / 1e3);
        const scheme = opts.scheme || signature.EXPECTED_SCHEME;
        const cryptoProvider = opts.cryptoProvider || getCryptoProvider();
        const payloadString = `${timestamp}.${opts.payload}`;
        const generateHeaderString = (signature2) => {
          return `t=${timestamp},${scheme}=${signature2}`;
        };
        return {
          ...opts,
          timestamp,
          scheme,
          cryptoProvider,
          payloadString,
          generateHeaderString
        };
      }
      Webhook.signature = signature;
      return Webhook;
    }
    exports2.createWebhooks = createWebhooks;
  }
});

// node_modules/stripe/cjs/apiVersion.js
var require_apiVersion = __commonJS({
  "node_modules/stripe/cjs/apiVersion.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ApiMajorVersion = exports2.ApiVersion = void 0;
    exports2.ApiVersion = "2026-06-24.dahlia";
    exports2.ApiMajorVersion = "dahlia";
  }
});

// node_modules/stripe/cjs/ResourceNamespace.js
var require_ResourceNamespace = __commonJS({
  "node_modules/stripe/cjs/ResourceNamespace.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resourceNamespace = void 0;
    function ResourceNamespace(stripe, resources) {
      for (const name in resources) {
        if (!Object.prototype.hasOwnProperty.call(resources, name)) {
          continue;
        }
        const camelCaseName = name[0].toLowerCase() + name.substring(1);
        const resource = new resources[name](stripe);
        this[camelCaseName] = resource;
      }
    }
    function resourceNamespace(namespace, resources) {
      return function(stripe) {
        return new ResourceNamespace(stripe, resources);
      };
    }
    exports2.resourceNamespace = resourceNamespace;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/AccountLinks.js
var require_AccountLinks = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/AccountLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountLinkResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AccountLinkResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates an AccountLink object that includes a single-use URL that an account can use to access a Stripe-hosted flow for collecting or updating required information.
       * @throws Stripe.RateLimitError
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/core/account_links", params, options);
      }
    };
    exports2.AccountLinkResource = AccountLinkResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/AccountTokens.js
var require_AccountTokens = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/AccountTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountTokenResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AccountTokenResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Create an account token with a publishable key and pass it to the Accounts v2 API to
       * create or update an account without its data touching your server.
       * Learn more about [account tokens](https://docs.stripe.com/connect/account-tokens).
       * In live mode, you can only create account tokens with your application's publishable key.
       * In test mode, you can create account tokens with your secret key or publishable key.
       * @throws Stripe.RateLimitError
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/core/account_tokens", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              identity: {
                kind: "object",
                fields: {
                  individual: {
                    kind: "object",
                    fields: {
                      relationship: {
                        kind: "object",
                        fields: { percent_ownership: { kind: "decimal_string" } }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves an Account Token.
       * @throws Stripe.RateLimitError
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v2/core/account_tokens/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.AccountTokenResource = AccountTokenResource;
  }
});

// node_modules/stripe/cjs/resources/FinancialConnections/Accounts.js
var require_Accounts = __commonJS({
  "node_modules/stripe/cjs/resources/FinancialConnections/Accounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AccountResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Financial Connections Account objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/financial_connections/accounts", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an Financial Connections Account.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/financial_connections/accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Disables your access to a Financial Connections Account. You will no longer be able to access data associated with the account (e.g. balances, transactions).
       */
      disconnect(id, params, options) {
        return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/disconnect`, params, options);
      }
      /**
       * Refreshes the data associated with a Financial Connections Account.
       */
      refresh(id, params, options) {
        return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/refresh`, params, options);
      }
      /**
       * Subscribes to periodic refreshes of data associated with a Financial Connections Account. When the account status is active, data is typically refreshed once a day.
       */
      subscribe(id, params, options) {
        return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/subscribe`, params, options);
      }
      /**
       * Unsubscribes from periodic refreshes of data associated with a Financial Connections Account.
       */
      unsubscribe(id, params, options) {
        return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/unsubscribe`, params, options);
      }
      /**
       * Lists all owners for a given Account
       */
      listOwners(id, params, options) {
        return this._makeRequest("GET", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/owners`, params, options, {
          methodType: "list"
        });
      }
    };
    exports2.AccountResource = AccountResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/Accounts/Persons.js
var require_Persons = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/Accounts/Persons.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PersonResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PersonResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a paginated list of Persons associated with an Account.
       * @throws Stripe.RateLimitError
       */
      list(accountId, params, options) {
        return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons`, params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    relationship: {
                      kind: "object",
                      fields: { percent_ownership: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Create a Person. Adds an individual to an Account's identity. You can set relationship attributes and identity information at creation.
       * @throws Stripe.RateLimitError
       */
      create(accountId, params, options) {
        return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              relationship: {
                kind: "object",
                fields: { percent_ownership: { kind: "decimal_string" } }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              relationship: {
                kind: "object",
                fields: { percent_ownership: { kind: "decimal_string" } }
              }
            }
          }
        });
      }
      /**
       * Delete a Person associated with an Account.
       * @throws Stripe.RateLimitError
       */
      del(accountId, id, params, options) {
        return this._makeRequest("DELETE", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a Person associated with an Account.
       * @throws Stripe.RateLimitError
       */
      retrieve(accountId, id, params, options) {
        return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              relationship: {
                kind: "object",
                fields: { percent_ownership: { kind: "decimal_string" } }
              }
            }
          }
        });
      }
      /**
       * Updates a Person associated with an Account.
       * @throws Stripe.RateLimitError
       */
      update(accountId, id, params, options) {
        return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              relationship: {
                kind: "object",
                fields: { percent_ownership: { kind: "decimal_string" } }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              relationship: {
                kind: "object",
                fields: { percent_ownership: { kind: "decimal_string" } }
              }
            }
          }
        });
      }
    };
    exports2.PersonResource = PersonResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/Accounts/PersonTokens.js
var require_PersonTokens = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/Accounts/PersonTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PersonTokenResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PersonTokenResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a single-use token that represents the details for a person. Use this when you create or update persons associated with an Account v2. Learn more about [account tokens](https://docs.stripe.com/connect/account-tokens).
       * You can only create person tokens with your application's publishable key and in live mode. You can use your application's secret key to create person tokens only in test mode.
       * @throws Stripe.RateLimitError
       */
      create(accountId, params, options) {
        return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(accountId)}/person_tokens`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              relationship: {
                kind: "object",
                fields: { percent_ownership: { kind: "decimal_string" } }
              }
            }
          }
        });
      }
      /**
       * Retrieves a Person Token associated with an Account.
       * @throws Stripe.RateLimitError
       */
      retrieve(accountId, id, params, options) {
        return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(accountId)}/person_tokens/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.PersonTokenResource = PersonTokenResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/Accounts.js
var require_Accounts2 = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/Accounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var Persons_js_1 = require_Persons();
    var PersonTokens_js_1 = require_PersonTokens();
    var AccountResource = class extends StripeResource_js_1.StripeResource {
      constructor(stripe) {
        super(stripe);
        this.stripe = stripe;
        this.persons = new Persons_js_1.PersonResource(stripe);
        this.personTokens = new PersonTokens_js_1.PersonTokenResource(stripe);
      }
      /**
       * Returns a list of Accounts.
       * @throws Stripe.RateLimitError
       */
      list(params, options) {
        return this._makeRequest("GET", "/v2/core/accounts", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    identity: {
                      kind: "object",
                      fields: {
                        individual: {
                          kind: "object",
                          fields: {
                            relationship: {
                              kind: "object",
                              fields: { percent_ownership: { kind: "decimal_string" } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Create an Account that represents a company, individual, or other entity that your business interacts with. Accounts contain identifying information about the entity, and configurations that store the features an account has access to. An account can be configured as any or all of the following configurations: Customer, Merchant and/or Recipient.
       * @throws Stripe.RateLimitError
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/core/accounts", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              identity: {
                kind: "object",
                fields: {
                  individual: {
                    kind: "object",
                    fields: {
                      relationship: {
                        kind: "object",
                        fields: { percent_ownership: { kind: "decimal_string" } }
                      }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              identity: {
                kind: "object",
                fields: {
                  individual: {
                    kind: "object",
                    fields: {
                      relationship: {
                        kind: "object",
                        fields: { percent_ownership: { kind: "decimal_string" } }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves the details of an Account.
       * @throws Stripe.RateLimitError
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              identity: {
                kind: "object",
                fields: {
                  individual: {
                    kind: "object",
                    fields: {
                      relationship: {
                        kind: "object",
                        fields: { percent_ownership: { kind: "decimal_string" } }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates the details of an Account.
       * @throws Stripe.RateLimitError
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              identity: {
                kind: "object",
                fields: {
                  individual: {
                    kind: "object",
                    fields: {
                      relationship: {
                        kind: "object",
                        fields: { percent_ownership: { kind: "decimal_string" } }
                      }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              identity: {
                kind: "object",
                fields: {
                  individual: {
                    kind: "object",
                    fields: {
                      relationship: {
                        kind: "object",
                        fields: { percent_ownership: { kind: "decimal_string" } }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Removes access to the Account and its associated resources. Closed Accounts can no longer be operated on, but limited information can still be retrieved through the API in order to be able to track their history.
       * @throws Stripe.RateLimitError
       */
      close(id, params, options) {
        return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(id)}/close`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              identity: {
                kind: "object",
                fields: {
                  individual: {
                    kind: "object",
                    fields: {
                      relationship: {
                        kind: "object",
                        fields: { percent_ownership: { kind: "decimal_string" } }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.AccountResource = AccountResource;
  }
});

// node_modules/stripe/cjs/resources/Entitlements/ActiveEntitlements.js
var require_ActiveEntitlements = __commonJS({
  "node_modules/stripe/cjs/resources/Entitlements/ActiveEntitlements.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ActiveEntitlementResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ActiveEntitlementResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieve a list of active entitlements for a customer
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/entitlements/active_entitlements", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieve an active entitlement
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/entitlements/active_entitlements/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ActiveEntitlementResource = ActiveEntitlementResource;
  }
});

// node_modules/stripe/cjs/resources/Billing/Alerts.js
var require_Alerts = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/Alerts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AlertResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AlertResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists billing active and inactive alerts
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/billing/alerts", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a billing alert
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/billing/alerts", params, options);
      }
      /**
       * Retrieves a billing alert given an ID
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/billing/alerts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Reactivates this alert, allowing it to trigger again.
       */
      activate(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/alerts/${encodeURIComponent(id)}/activate`, params, options);
      }
      /**
       * Archives this alert, removing it from the list view and APIs. This is non-reversible.
       */
      archive(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/alerts/${encodeURIComponent(id)}/archive`, params, options);
      }
      /**
       * Deactivates this alert, preventing it from triggering.
       */
      deactivate(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/alerts/${encodeURIComponent(id)}/deactivate`, params, options);
      }
    };
    exports2.AlertResource = AlertResource;
  }
});

// node_modules/stripe/cjs/resources/Tax/Associations.js
var require_Associations = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Associations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AssociationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AssociationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Finds a tax association object by PaymentIntent id.
       */
      find(params, options) {
        return this._makeRequest("GET", "/v1/tax/associations/find", params, options);
      }
    };
    exports2.AssociationResource = AssociationResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/Authorizations.js
var require_Authorizations = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Authorizations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthorizationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AuthorizationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Issuing Authorization objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/authorizations", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    fleet: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          reported_breakdown: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                non_fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tax: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      local_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      national_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    fuel: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_cost_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    transactions: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          purchase_details: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fleet: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      reported_breakdown: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            fuel: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  gross_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            non_fuel: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  gross_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            tax: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  local_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  national_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      quantity_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_cost_decimal: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves an Issuing Authorization object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/authorizations/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates the specified Issuing Authorization object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/authorizations/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * [Deprecated] Approves a pending Issuing Authorization object. This request should be made within the timeout window of the [real-time authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations) flow.
       * This method is deprecated. Instead, [respond directly to the webhook request to approve an authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations#authorization-handling).
       * @deprecated
       */
      approve(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/authorizations/${encodeURIComponent(id)}/approve`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * [Deprecated] Declines a pending Issuing Authorization object. This request should be made within the timeout window of the [real time authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations) flow.
       * This method is deprecated. Instead, [respond directly to the webhook request to decline an authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations#authorization-handling).
       * @deprecated
       */
      decline(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/authorizations/${encodeURIComponent(id)}/decline`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.AuthorizationResource = AuthorizationResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/Authorizations.js
var require_Authorizations2 = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/Authorizations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthorizationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AuthorizationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Create a test-mode authorization.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/test_helpers/issuing/authorizations", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "object",
                fields: {
                  reported_breakdown: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "object",
                        fields: { gross_amount_decimal: { kind: "decimal_string" } }
                      },
                      non_fuel: {
                        kind: "object",
                        fields: { gross_amount_decimal: { kind: "decimal_string" } }
                      },
                      tax: {
                        kind: "object",
                        fields: {
                          local_amount_decimal: { kind: "decimal_string" },
                          national_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "object",
                fields: {
                  quantity_decimal: { kind: "decimal_string" },
                  unit_cost_decimal: { kind: "decimal_string" }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Capture a test-mode authorization.
       */
      capture(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/capture`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "object",
                fields: {
                  fleet: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "object",
                            fields: {
                              gross_amount_decimal: { kind: "decimal_string" }
                            }
                          },
                          non_fuel: {
                            kind: "object",
                            fields: {
                              gross_amount_decimal: { kind: "decimal_string" }
                            }
                          },
                          tax: {
                            kind: "object",
                            fields: {
                              local_amount_decimal: { kind: "decimal_string" },
                              national_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  },
                  fuel: {
                    kind: "object",
                    fields: {
                      quantity_decimal: { kind: "decimal_string" },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  },
                  receipt: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: { quantity: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Expire a test-mode Authorization.
       */
      expire(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/expire`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Finalize the amount on an Authorization prior to capture, when the initial authorization was for an estimated amount.
       */
      finalizeAmount(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/finalize_amount`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "object",
                fields: {
                  reported_breakdown: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "object",
                        fields: { gross_amount_decimal: { kind: "decimal_string" } }
                      },
                      non_fuel: {
                        kind: "object",
                        fields: { gross_amount_decimal: { kind: "decimal_string" } }
                      },
                      tax: {
                        kind: "object",
                        fields: {
                          local_amount_decimal: { kind: "decimal_string" },
                          national_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "object",
                fields: {
                  quantity_decimal: { kind: "decimal_string" },
                  unit_cost_decimal: { kind: "decimal_string" }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Respond to a fraud challenge on a testmode Issuing authorization, simulating either a confirmation of fraud or a correction of legitimacy.
       */
      respond(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/fraud_challenges/respond`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Increment a test-mode Authorization.
       */
      increment(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/increment`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Reverse a test-mode Authorization.
       */
      reverse(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/reverse`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              fleet: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    reported_breakdown: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          non_fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                gross_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tax: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                local_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                national_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_cost_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              transactions: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.AuthorizationResource = AuthorizationResource;
  }
});

// node_modules/stripe/cjs/resources/Tax/Calculations.js
var require_Calculations = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Calculations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CalculationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CalculationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves a Tax Calculation object, if the calculation hasn't expired.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/tax/calculations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Calculates tax based on the input and returns a Tax Calculation object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/tax/calculations", params, options);
      }
      /**
       * Retrieves the line items of a tax calculation as a collection, if the calculation hasn't expired.
       */
      listLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/tax/calculations/${encodeURIComponent(id)}/line_items`, params, options, {
          methodType: "list"
        });
      }
    };
    exports2.CalculationResource = CalculationResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/Cardholders.js
var require_Cardholders = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Cardholders.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CardholderResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CardholderResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Issuing Cardholder objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/cardholders", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new Issuing Cardholder object that can be issued cards.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/issuing/cardholders", params, options);
      }
      /**
       * Retrieves an Issuing Cardholder object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/cardholders/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified Issuing Cardholder object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/cardholders/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.CardholderResource = CardholderResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/Cards.js
var require_Cards = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Cards.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CardResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CardResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Issuing Card objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/cards", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates an Issuing Card object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/issuing/cards", params, options);
      }
      /**
       * Retrieves an Issuing Card object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/cards/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified Issuing Card object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/cards/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.CardResource = CardResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/Cards.js
var require_Cards2 = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/Cards.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CardResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CardResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Updates the shipping status of the specified Issuing Card object to delivered.
       */
      deliverCard(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/deliver`, params, options);
      }
      /**
       * Updates the shipping status of the specified Issuing Card object to failure.
       */
      failCard(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/fail`, params, options);
      }
      /**
       * Updates the shipping status of the specified Issuing Card object to returned.
       */
      returnCard(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/return`, params, options);
      }
      /**
       * Updates the shipping status of the specified Issuing Card object to shipped.
       */
      shipCard(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/ship`, params, options);
      }
      /**
       * Updates the shipping status of the specified Issuing Card object to submitted. This method requires Stripe Version ‘2024-09-30.acacia' or later.
       */
      submitCard(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/submit`, params, options);
      }
    };
    exports2.CardResource = CardResource;
  }
});

// node_modules/stripe/cjs/resources/BillingPortal/Configurations.js
var require_Configurations = __commonJS({
  "node_modules/stripe/cjs/resources/BillingPortal/Configurations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfigurationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ConfigurationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of configurations that describe the functionality of the customer portal.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/billing_portal/configurations", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a configuration that describes the functionality and behavior of a PortalSession
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/billing_portal/configurations", params, options);
      }
      /**
       * Retrieves a configuration that describes the functionality of the customer portal.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/billing_portal/configurations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a configuration that describes the functionality of the customer portal.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/billing_portal/configurations/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ConfigurationResource = ConfigurationResource;
  }
});

// node_modules/stripe/cjs/resources/Terminal/Configurations.js
var require_Configurations2 = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/Configurations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfigurationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ConfigurationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes a Configuration object.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/terminal/configurations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a Configuration object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/terminal/configurations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a new Configuration object.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/configurations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of Configuration objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/terminal/configurations", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new Configuration object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/terminal/configurations", params, options);
      }
    };
    exports2.ConfigurationResource = ConfigurationResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/ConfirmationTokens.js
var require_ConfirmationTokens = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/ConfirmationTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfirmationTokenResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ConfirmationTokenResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a test mode Confirmation Token server side for your integration tests.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/test_helpers/confirmation_tokens", params, options);
      }
    };
    exports2.ConfirmationTokenResource = ConfirmationTokenResource;
  }
});

// node_modules/stripe/cjs/resources/Terminal/ConnectionTokens.js
var require_ConnectionTokens = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/ConnectionTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConnectionTokenResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ConnectionTokenResource = class extends StripeResource_js_1.StripeResource {
      /**
       * To connect to a reader the Stripe Terminal SDK needs to retrieve a short-lived connection token from Stripe, proxied through your server. On your backend, add an endpoint that creates and returns a connection token.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/terminal/connection_tokens", params, options);
      }
    };
    exports2.ConnectionTokenResource = ConnectionTokenResource;
  }
});

// node_modules/stripe/cjs/resources/Billing/CreditBalanceSummary.js
var require_CreditBalanceSummary = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/CreditBalanceSummary.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditBalanceSummaryResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CreditBalanceSummaryResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves the credit balance summary for a customer.
       */
      retrieve(params, options) {
        return this._makeRequest("GET", "/v1/billing/credit_balance_summary", params, options);
      }
    };
    exports2.CreditBalanceSummaryResource = CreditBalanceSummaryResource;
  }
});

// node_modules/stripe/cjs/resources/Billing/CreditBalanceTransactions.js
var require_CreditBalanceTransactions = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/CreditBalanceTransactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditBalanceTransactionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CreditBalanceTransactionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieve a list of credit balance transactions.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/billing/credit_balance_transactions", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves a credit balance transaction.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/billing/credit_balance_transactions/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.CreditBalanceTransactionResource = CreditBalanceTransactionResource;
  }
});

// node_modules/stripe/cjs/resources/Billing/CreditGrants.js
var require_CreditGrants = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/CreditGrants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditGrantResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CreditGrantResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieve a list of credit grants.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/billing/credit_grants", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a credit grant.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/billing/credit_grants", params, options);
      }
      /**
       * Retrieves a credit grant.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/billing/credit_grants/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a credit grant.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/credit_grants/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Expires a credit grant.
       */
      expire(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/credit_grants/${encodeURIComponent(id)}/expire`, params, options);
      }
      /**
       * Voids a credit grant.
       */
      voidGrant(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/credit_grants/${encodeURIComponent(id)}/void`, params, options);
      }
    };
    exports2.CreditGrantResource = CreditGrantResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/CreditReversals.js
var require_CreditReversals = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/CreditReversals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditReversalResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CreditReversalResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of CreditReversals.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/credit_reversals", params, options, {
          methodType: "list"
        });
      }
      /**
       * Reverses a ReceivedCredit and creates a CreditReversal object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/treasury/credit_reversals", params, options);
      }
      /**
       * Retrieves the details of an existing CreditReversal by passing the unique CreditReversal ID from either the CreditReversal creation request or CreditReversal list
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/credit_reversals/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.CreditReversalResource = CreditReversalResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Customers.js
var require_Customers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Customers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CustomerResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CustomerResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Create an incoming testmode bank transfer
       */
      fundCashBalance(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/customers/${encodeURIComponent(id)}/fund_cash_balance`, params, options);
      }
    };
    exports2.CustomerResource = CustomerResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/DebitReversals.js
var require_DebitReversals = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/DebitReversals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DebitReversalResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var DebitReversalResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of DebitReversals.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/debit_reversals", params, options, {
          methodType: "list"
        });
      }
      /**
       * Reverses a ReceivedDebit and creates a DebitReversal object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/treasury/debit_reversals", params, options);
      }
      /**
       * Retrieves a DebitReversal object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/debit_reversals/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.DebitReversalResource = DebitReversalResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/Disputes.js
var require_Disputes = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Disputes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DisputeResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var DisputeResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Issuing Dispute objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/disputes", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates an Issuing Dispute object. Individual pieces of evidence within the evidence object are optional at this point. Stripe only validates that required evidence is present during submission. Refer to [Dispute reasons and evidence](https://docs.stripe.com/docs/issuing/purchases/disputes#dispute-reasons-and-evidence) for more details about evidence requirements.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/issuing/disputes", params, options);
      }
      /**
       * Retrieves an Issuing Dispute object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/disputes/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified Issuing Dispute object by setting the values of the parameters passed. Any parameters not provided will be left unchanged. Properties on the evidence object can be unset by passing in an empty string.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/disputes/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Submits an Issuing Dispute to the card network. Stripe validates that all evidence fields required for the dispute's reason are present. For more details, see [Dispute reasons and evidence](https://docs.stripe.com/docs/issuing/purchases/disputes#dispute-reasons-and-evidence).
       */
      submit(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/disputes/${encodeURIComponent(id)}/submit`, params, options);
      }
    };
    exports2.DisputeResource = DisputeResource;
  }
});

// node_modules/stripe/cjs/resources/Radar/EarlyFraudWarnings.js
var require_EarlyFraudWarnings = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/EarlyFraudWarnings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EarlyFraudWarningResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var EarlyFraudWarningResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of early fraud warnings.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/radar/early_fraud_warnings", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an early fraud warning that has previously been created.
       *
       * Please refer to the [early fraud warning](https://docs.stripe.com/api#early_fraud_warning_object) object reference for more details.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/radar/early_fraud_warnings/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.EarlyFraudWarningResource = EarlyFraudWarningResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/EventDestinations.js
var require_EventDestinations = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/EventDestinations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EventDestinationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var EventDestinationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists all event destinations.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v2/core/event_destinations", params, options, {
          methodType: "list"
        });
      }
      /**
       * Create a new event destination.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/core/event_destinations", params, options);
      }
      /**
       * Delete an event destination.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v2/core/event_destinations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the details of an event destination.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v2/core/event_destinations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Update the details of an event destination.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Disable an event destination.
       */
      disable(id, params, options) {
        return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}/disable`, params, options);
      }
      /**
       * Enable an event destination.
       */
      enable(id, params, options) {
        return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}/enable`, params, options);
      }
      /**
       * Send a `ping` event to an event destination.
       */
      ping(id, params, options) {
        return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}/ping`, params, options);
      }
    };
    exports2.EventDestinationResource = EventDestinationResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/Events.js
var require_Events = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/Events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EventResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var EventResource = class extends StripeResource_js_1.StripeResource {
      /**
       * List events, going back up to 30 days.
       */
      list(params, options) {
        const transformResponseData = (response) => {
          return {
            ...response,
            data: response.data.map(this.addFetchRelatedObjectIfNeeded.bind(this))
          };
        };
        return this._makeRequest("GET", "/v2/core/events", params, options, {
          methodType: "list",
          transformResponseData
        });
      }
      /**
       * Retrieves the details of an event if it was created in the last 30 days. Supply the unique
       * identifier of the event, which might have been delivered to your event destination.
       */
      retrieve(id, params, options) {
        const transformResponseData = (response) => {
          return this.addFetchRelatedObjectIfNeeded(response);
        };
        return this._makeRequest("GET", `/v2/core/events/${encodeURIComponent(id)}`, params, options, {
          transformResponseData
        });
      }
      /**
       * @private
       *
       * For internal use in stripe-node.
       *
       * @param pulledEvent The retrieved event object
       * @returns The retrieved event object with a fetchRelatedObject method,
       * if pulledEvent.related_object is valid (non-null and has a url)
       */
      addFetchRelatedObjectIfNeeded(pulledEvent) {
        if (!pulledEvent.related_object || !pulledEvent.related_object.url) {
          return pulledEvent;
        }
        return {
          ...pulledEvent,
          fetchRelatedObject: () => this._makeRequest("GET", pulledEvent.related_object.url, void 0, {
            stripeContext: pulledEvent.context,
            headers: {
              "Stripe-Request-Trigger": `event=${pulledEvent.id}`
            }
          })
        };
      }
    };
    exports2.EventResource = EventResource;
  }
});

// node_modules/stripe/cjs/resources/Entitlements/Features.js
var require_Features = __commonJS({
  "node_modules/stripe/cjs/resources/Entitlements/Features.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FeatureResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var FeatureResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieve a list of features
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/entitlements/features", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a feature
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/entitlements/features", params, options);
      }
      /**
       * Retrieves a feature
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/entitlements/features/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Update a feature's metadata or permanently deactivate it.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/entitlements/features/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.FeatureResource = FeatureResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/FinancialAccounts.js
var require_FinancialAccounts = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/FinancialAccounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FinancialAccountResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var FinancialAccountResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of FinancialAccounts.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/financial_accounts", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new FinancialAccount. Each connected account can have up to three FinancialAccounts by default.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/treasury/financial_accounts", params, options);
      }
      /**
       * Retrieves the details of a FinancialAccount.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the details of a FinancialAccount.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Closes a FinancialAccount. A FinancialAccount can only be closed if it has a zero balance, has no pending InboundTransfers, and has canceled all attached Issuing cards.
       */
      close(id, params, options) {
        return this._makeRequest("POST", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}/close`, params, options);
      }
      /**
       * Updates the Features associated with a FinancialAccount.
       */
      updateFeatures(id, params, options) {
        return this._makeRequest("POST", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}/features`, params, options);
      }
      /**
       * Retrieves Features information associated with the FinancialAccount.
       */
      retrieveFeatures(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}/features`, params, options);
      }
    };
    exports2.FinancialAccountResource = FinancialAccountResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Commerce/ProductCatalog/Imports.js
var require_Imports = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Commerce/ProductCatalog/Imports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ImportResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ImportResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of ProductCatalogImport objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v2/commerce/product_catalog/imports", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    status_details: {
                      kind: "object",
                      fields: {
                        processing: {
                          kind: "object",
                          fields: {
                            error_count: { kind: "int64_string" },
                            success_count: { kind: "int64_string" }
                          }
                        },
                        succeeded: {
                          kind: "object",
                          fields: { success_count: { kind: "int64_string" } }
                        },
                        succeeded_with_errors: {
                          kind: "object",
                          fields: {
                            error_count: { kind: "int64_string" },
                            error_file: {
                              kind: "object",
                              fields: { size: { kind: "int64_string" } }
                            },
                            samples: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: { row: { kind: "int64_string" } }
                              }
                            },
                            success_count: { kind: "int64_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Creates a ProductCatalogImport.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/commerce/product_catalog/imports", params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              status_details: {
                kind: "object",
                fields: {
                  processing: {
                    kind: "object",
                    fields: {
                      error_count: { kind: "int64_string" },
                      success_count: { kind: "int64_string" }
                    }
                  },
                  succeeded: {
                    kind: "object",
                    fields: { success_count: { kind: "int64_string" } }
                  },
                  succeeded_with_errors: {
                    kind: "object",
                    fields: {
                      error_count: { kind: "int64_string" },
                      error_file: {
                        kind: "object",
                        fields: { size: { kind: "int64_string" } }
                      },
                      samples: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: { row: { kind: "int64_string" } }
                        }
                      },
                      success_count: { kind: "int64_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves a ProductCatalogImport by ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v2/commerce/product_catalog/imports/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              status_details: {
                kind: "object",
                fields: {
                  processing: {
                    kind: "object",
                    fields: {
                      error_count: { kind: "int64_string" },
                      success_count: { kind: "int64_string" }
                    }
                  },
                  succeeded: {
                    kind: "object",
                    fields: { success_count: { kind: "int64_string" } }
                  },
                  succeeded_with_errors: {
                    kind: "object",
                    fields: {
                      error_count: { kind: "int64_string" },
                      error_file: {
                        kind: "object",
                        fields: { size: { kind: "int64_string" } }
                      },
                      samples: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: { row: { kind: "int64_string" } }
                        }
                      },
                      success_count: { kind: "int64_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.ImportResource = ImportResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/InboundTransfers.js
var require_InboundTransfers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/InboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InboundTransferResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var InboundTransferResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Transitions a test mode created InboundTransfer to the failed status. The InboundTransfer must already be in the processing state.
       */
      fail(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/inbound_transfers/${encodeURIComponent(id)}/fail`, params, options);
      }
      /**
       * Marks the test mode InboundTransfer object as returned and links the InboundTransfer to a ReceivedDebit. The InboundTransfer must already be in the succeeded state.
       */
      returnInboundTransfer(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/inbound_transfers/${encodeURIComponent(id)}/return`, params, options);
      }
      /**
       * Transitions a test mode created InboundTransfer to the succeeded status. The InboundTransfer must already be in the processing state.
       */
      succeed(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/inbound_transfers/${encodeURIComponent(id)}/succeed`, params, options);
      }
    };
    exports2.InboundTransferResource = InboundTransferResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/InboundTransfers.js
var require_InboundTransfers2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/InboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InboundTransferResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var InboundTransferResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of InboundTransfers sent from the specified FinancialAccount.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/inbound_transfers", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates an InboundTransfer.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/treasury/inbound_transfers", params, options);
      }
      /**
       * Retrieves the details of an existing InboundTransfer.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/inbound_transfers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Cancels an InboundTransfer.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/treasury/inbound_transfers/${encodeURIComponent(id)}/cancel`, params, options);
      }
    };
    exports2.InboundTransferResource = InboundTransferResource;
  }
});

// node_modules/stripe/cjs/resources/Terminal/Locations.js
var require_Locations = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/Locations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LocationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var LocationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes a Location object.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/terminal/locations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a Location object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/terminal/locations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a Location object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/locations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of Location objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/terminal/locations", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new Location object.
       * For further details, including which address fields are required in each country, see the [Manage locations](https://docs.stripe.com/docs/terminal/fleet/locations) guide.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/terminal/locations", params, options);
      }
    };
    exports2.LocationResource = LocationResource;
  }
});

// node_modules/stripe/cjs/resources/Billing/MeterEventAdjustments.js
var require_MeterEventAdjustments = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/MeterEventAdjustments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventAdjustmentResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MeterEventAdjustmentResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a billing meter event adjustment.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/billing/meter_event_adjustments", params, options);
      }
    };
    exports2.MeterEventAdjustmentResource = MeterEventAdjustmentResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEventAdjustments.js
var require_MeterEventAdjustments2 = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEventAdjustments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventAdjustmentResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MeterEventAdjustmentResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a meter event adjustment to cancel a previously sent meter event.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/billing/meter_event_adjustments", params, options);
      }
    };
    exports2.MeterEventAdjustmentResource = MeterEventAdjustmentResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEventSession.js
var require_MeterEventSession = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEventSession.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventSessionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MeterEventSessionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a meter event session to send usage on the high-throughput meter event stream. Authentication tokens are only valid for 15 minutes, so you need to create a new meter event session when your token expires.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/billing/meter_event_session", params, options);
      }
    };
    exports2.MeterEventSessionResource = MeterEventSessionResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEventStream.js
var require_MeterEventStream = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEventStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventStreamResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MeterEventStreamResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates meter events. Events are processed asynchronously, including validation. Requires a meter event session for authentication. Supports up to 10,000 requests per second in livemode. For even higher rate-limits, contact sales.
       * @throws Stripe.TemporarySessionExpiredError
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/billing/meter_event_stream", params, options, {
          apiBase: "meter_events"
        });
      }
    };
    exports2.MeterEventStreamResource = MeterEventStreamResource;
  }
});

// node_modules/stripe/cjs/resources/Billing/MeterEvents.js
var require_MeterEvents = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/MeterEvents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MeterEventResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a billing meter event.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/billing/meter_events", params, options);
      }
    };
    exports2.MeterEventResource = MeterEventResource;
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEvents.js
var require_MeterEvents2 = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEvents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MeterEventResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a meter event. Events are validated synchronously, but are processed asynchronously. Supports up to 1,000 events per second in livemode. For higher rate-limits, please use meter event streams instead.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v2/billing/meter_events", params, options);
      }
    };
    exports2.MeterEventResource = MeterEventResource;
  }
});

// node_modules/stripe/cjs/resources/Billing/Meters.js
var require_Meters = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/Meters.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MeterResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieve a list of billing meters.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/billing/meters", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a billing meter.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/billing/meters", params, options);
      }
      /**
       * Retrieves a billing meter given an ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/billing/meters/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a billing meter.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/meters/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * When a meter is deactivated, no more meter events will be accepted for this meter. You can't attach a deactivated meter to a price.
       */
      deactivate(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/meters/${encodeURIComponent(id)}/deactivate`, params, options);
      }
      /**
       * When a meter is reactivated, events for this meter can be accepted and you can attach the meter to a price.
       */
      reactivate(id, params, options) {
        return this._makeRequest("POST", `/v1/billing/meters/${encodeURIComponent(id)}/reactivate`, params, options);
      }
      /**
       * Retrieve a list of billing meter event summaries.
       */
      listEventSummaries(id, params, options) {
        return this._makeRequest("GET", `/v1/billing/meters/${encodeURIComponent(id)}/event_summaries`, params, options, {
          methodType: "list"
        });
      }
    };
    exports2.MeterResource = MeterResource;
  }
});

// node_modules/stripe/cjs/resources/Terminal/OnboardingLinks.js
var require_OnboardingLinks = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/OnboardingLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OnboardingLinkResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var OnboardingLinkResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a new OnboardingLink object that contains a redirect_url used for onboarding onto Tap to Pay on iPhone.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/terminal/onboarding_links", params, options);
      }
    };
    exports2.OnboardingLinkResource = OnboardingLinkResource;
  }
});

// node_modules/stripe/cjs/resources/Climate/Orders.js
var require_Orders = __commonJS({
  "node_modules/stripe/cjs/resources/Climate/Orders.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OrderResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var OrderResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists all Climate order objects. The orders are returned sorted by creation date, with the
       * most recently created orders appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/climate/orders", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { metric_tons: { kind: "decimal_string" } }
                }
              }
            }
          }
        });
      }
      /**
       * Creates a Climate order object for a given Climate product. The order will be processed immediately
       * after creation and payment will be deducted your Stripe balance.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/climate/orders", params, options, {
          requestSchema: {
            kind: "object",
            fields: { metric_tons: { kind: "decimal_string" } }
          },
          responseSchema: {
            kind: "object",
            fields: { metric_tons: { kind: "decimal_string" } }
          }
        });
      }
      /**
       * Retrieves the details of a Climate order object with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/climate/orders/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: { metric_tons: { kind: "decimal_string" } }
          }
        });
      }
      /**
       * Updates the specified order by setting the values of the parameters passed.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/climate/orders/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: { metric_tons: { kind: "decimal_string" } }
          }
        });
      }
      /**
       * Cancels a Climate order. You can cancel an order within 24 hours of creation. Stripe refunds the
       * reservation amount_subtotal, but not the amount_fees for user-triggered cancellations. Frontier
       * might cancel reservations if suppliers fail to deliver. If Frontier cancels the reservation, Stripe
       * provides 90 days advance notice and refunds the amount_total.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/climate/orders/${encodeURIComponent(id)}/cancel`, params, options, {
          responseSchema: {
            kind: "object",
            fields: { metric_tons: { kind: "decimal_string" } }
          }
        });
      }
    };
    exports2.OrderResource = OrderResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundPayments.js
var require_OutboundPayments = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundPayments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundPaymentResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var OutboundPaymentResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Updates a test mode created OutboundPayment with tracking details. The OutboundPayment must not be cancelable, and cannot be in the canceled or failed states.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Transitions a test mode created OutboundPayment to the failed status. The OutboundPayment must already be in the processing state.
       */
      fail(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}/fail`, params, options);
      }
      /**
       * Transitions a test mode created OutboundPayment to the posted status. The OutboundPayment must already be in the processing state.
       */
      post(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}/post`, params, options);
      }
      /**
       * Transitions a test mode created OutboundPayment to the returned status. The OutboundPayment must already be in the processing state.
       */
      returnOutboundPayment(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}/return`, params, options);
      }
    };
    exports2.OutboundPaymentResource = OutboundPaymentResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/OutboundPayments.js
var require_OutboundPayments2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/OutboundPayments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundPaymentResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var OutboundPaymentResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of OutboundPayments sent from the specified FinancialAccount.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/outbound_payments", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates an OutboundPayment.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/treasury/outbound_payments", params, options);
      }
      /**
       * Retrieves the details of an existing OutboundPayment by passing the unique OutboundPayment ID from either the OutboundPayment creation request or OutboundPayment list.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/outbound_payments/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Cancel an OutboundPayment.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/treasury/outbound_payments/${encodeURIComponent(id)}/cancel`, params, options);
      }
    };
    exports2.OutboundPaymentResource = OutboundPaymentResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundTransfers.js
var require_OutboundTransfers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundTransferResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var OutboundTransferResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Updates a test mode created OutboundTransfer with tracking details. The OutboundTransfer must not be cancelable, and cannot be in the canceled or failed states.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Transitions a test mode created OutboundTransfer to the failed status. The OutboundTransfer must already be in the processing state.
       */
      fail(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}/fail`, params, options);
      }
      /**
       * Transitions a test mode created OutboundTransfer to the posted status. The OutboundTransfer must already be in the processing state.
       */
      post(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}/post`, params, options);
      }
      /**
       * Transitions a test mode created OutboundTransfer to the returned status. The OutboundTransfer must already be in the processing state.
       */
      returnOutboundTransfer(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}/return`, params, options);
      }
    };
    exports2.OutboundTransferResource = OutboundTransferResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/OutboundTransfers.js
var require_OutboundTransfers2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/OutboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundTransferResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var OutboundTransferResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of OutboundTransfers sent from the specified FinancialAccount.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/outbound_transfers", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates an OutboundTransfer.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/treasury/outbound_transfers", params, options);
      }
      /**
       * Retrieves the details of an existing OutboundTransfer by passing the unique OutboundTransfer ID from either the OutboundTransfer creation request or OutboundTransfer list.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/outbound_transfers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * An OutboundTransfer can be canceled if the funds have not yet been paid out.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/treasury/outbound_transfers/${encodeURIComponent(id)}/cancel`, params, options);
      }
    };
    exports2.OutboundTransferResource = OutboundTransferResource;
  }
});

// node_modules/stripe/cjs/resources/Radar/PaymentEvaluations.js
var require_PaymentEvaluations = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/PaymentEvaluations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentEvaluationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentEvaluationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Request a Radar API fraud risk score from Stripe for a payment before sending it for external processor authorization.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/radar/payment_evaluations", params, options);
      }
    };
    exports2.PaymentEvaluationResource = PaymentEvaluationResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/PersonalizationDesigns.js
var require_PersonalizationDesigns = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/PersonalizationDesigns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PersonalizationDesignResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PersonalizationDesignResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of personalization design objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/personalization_designs", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a personalization design object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/issuing/personalization_designs", params, options);
      }
      /**
       * Retrieves a personalization design object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/personalization_designs/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a card personalization object.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/personalization_designs/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.PersonalizationDesignResource = PersonalizationDesignResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/PersonalizationDesigns.js
var require_PersonalizationDesigns2 = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/PersonalizationDesigns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PersonalizationDesignResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PersonalizationDesignResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Updates the status of the specified testmode personalization design object to active.
       */
      activate(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/personalization_designs/${encodeURIComponent(id)}/activate`, params, options);
      }
      /**
       * Updates the status of the specified testmode personalization design object to inactive.
       */
      deactivate(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/personalization_designs/${encodeURIComponent(id)}/deactivate`, params, options);
      }
      /**
       * Updates the status of the specified testmode personalization design object to rejected.
       */
      reject(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/personalization_designs/${encodeURIComponent(id)}/reject`, params, options);
      }
    };
    exports2.PersonalizationDesignResource = PersonalizationDesignResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/PhysicalBundles.js
var require_PhysicalBundles = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/PhysicalBundles.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PhysicalBundleResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PhysicalBundleResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of physical bundle objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/physical_bundles", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves a physical bundle object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/physical_bundles/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.PhysicalBundleResource = PhysicalBundleResource;
  }
});

// node_modules/stripe/cjs/resources/Climate/Products.js
var require_Products = __commonJS({
  "node_modules/stripe/cjs/resources/Climate/Products.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProductResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ProductResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists all available Climate product objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/climate/products", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { metric_tons_available: { kind: "decimal_string" } }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves the details of a Climate product with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/climate/products/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: { metric_tons_available: { kind: "decimal_string" } }
          }
        });
      }
    };
    exports2.ProductResource = ProductResource;
  }
});

// node_modules/stripe/cjs/resources/Terminal/Readers.js
var require_Readers = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/Readers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReaderResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReaderResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes a Reader object.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/terminal/readers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a Reader object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/terminal/readers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a Reader object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of Reader objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/terminal/readers", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new Reader object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/terminal/readers", params, options);
      }
      /**
       * Cancels the current reader action. See [Programmatic Cancellation](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven#programmatic-cancellation) for more details.
       */
      cancelAction(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/cancel_action`, params, options);
      }
      /**
       * Initiates an [input collection flow](https://docs.stripe.com/docs/terminal/features/collect-inputs) on a Reader to display input forms and collect information from your customers.
       */
      collectInputs(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/collect_inputs`, params, options);
      }
      /**
       * Initiates a payment flow on a Reader and updates the PaymentIntent with card details before manual confirmation. See [Collecting a Payment method](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven&process=inspect#collect-a-paymentmethod) for more details.
       */
      collectPaymentMethod(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/collect_payment_method`, params, options);
      }
      /**
       * Finalizes a payment on a Reader. See [Confirming a Payment](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven&process=inspect#confirm-the-paymentintent) for more details.
       */
      confirmPaymentIntent(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/confirm_payment_intent`, params, options);
      }
      /**
       * Initiates a payment flow on a Reader. See [process the payment](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven&process=immediately#process-payment) for more details.
       */
      processPaymentIntent(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/process_payment_intent`, params, options);
      }
      /**
       * Initiates a SetupIntent flow on a Reader. See [Save directly without charging](https://docs.stripe.com/docs/terminal/features/saving-payment-details/save-directly) for more details.
       */
      processSetupIntent(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/process_setup_intent`, params, options);
      }
      /**
       * Initiates an in-person refund on a Reader. See [Refund an Interac Payment](https://docs.stripe.com/docs/terminal/payments/regional?integration-country=CA#refund-an-interac-payment) for more details.
       */
      refundPayment(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/refund_payment`, params, options);
      }
      /**
       * Sets the reader display to show [cart details](https://docs.stripe.com/docs/terminal/features/display).
       */
      setReaderDisplay(id, params, options) {
        return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/set_reader_display`, params, options);
      }
    };
    exports2.ReaderResource = ReaderResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Terminal/Readers.js
var require_Readers2 = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Terminal/Readers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReaderResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReaderResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Presents a payment method on a simulated reader. Can be used to simulate accepting a payment, saving a card or refunding a transaction.
       */
      presentPaymentMethod(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/terminal/readers/${encodeURIComponent(id)}/present_payment_method`, params, options);
      }
      /**
       * Use this endpoint to trigger a successful input collection on a simulated reader.
       */
      succeedInputCollection(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/terminal/readers/${encodeURIComponent(id)}/succeed_input_collection`, params, options);
      }
      /**
       * Use this endpoint to complete an input collection with a timeout error on a simulated reader.
       */
      timeoutInputCollection(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/terminal/readers/${encodeURIComponent(id)}/timeout_input_collection`, params, options);
      }
    };
    exports2.ReaderResource = ReaderResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedCredits.js
var require_ReceivedCredits = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedCredits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedCreditResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReceivedCreditResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Use this endpoint to simulate a test mode ReceivedCredit initiated by a third party. In live mode, you can't directly create ReceivedCredits initiated by third parties.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/test_helpers/treasury/received_credits", params, options);
      }
    };
    exports2.ReceivedCreditResource = ReceivedCreditResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/ReceivedCredits.js
var require_ReceivedCredits2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/ReceivedCredits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedCreditResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReceivedCreditResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of ReceivedCredits.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/received_credits", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an existing ReceivedCredit by passing the unique ReceivedCredit ID from the ReceivedCredit list.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/received_credits/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ReceivedCreditResource = ReceivedCreditResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedDebits.js
var require_ReceivedDebits = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedDebits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedDebitResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReceivedDebitResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Use this endpoint to simulate a test mode ReceivedDebit initiated by a third party. In live mode, you can't directly create ReceivedDebits initiated by third parties.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/test_helpers/treasury/received_debits", params, options);
      }
    };
    exports2.ReceivedDebitResource = ReceivedDebitResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/ReceivedDebits.js
var require_ReceivedDebits2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/ReceivedDebits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedDebitResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReceivedDebitResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of ReceivedDebits.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/received_debits", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an existing ReceivedDebit by passing the unique ReceivedDebit ID from the ReceivedDebit list
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/received_debits/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ReceivedDebitResource = ReceivedDebitResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Refunds.js
var require_Refunds = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Refunds.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RefundResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var RefundResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Expire a refund with a status of requires_action.
       */
      expire(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/refunds/${encodeURIComponent(id)}/expire`, params, options);
      }
    };
    exports2.RefundResource = RefundResource;
  }
});

// node_modules/stripe/cjs/resources/Tax/Registrations.js
var require_Registrations = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Registrations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RegistrationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var RegistrationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Tax Registration objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/tax/registrations", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new Tax Registration object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/tax/registrations", params, options);
      }
      /**
       * Returns a Tax Registration object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/tax/registrations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing Tax Registration object.
       *
       * A registration cannot be deleted after it has been created. If you wish to end a registration you may do so by setting expires_at.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/tax/registrations/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.RegistrationResource = RegistrationResource;
  }
});

// node_modules/stripe/cjs/resources/Reporting/ReportRuns.js
var require_ReportRuns = __commonJS({
  "node_modules/stripe/cjs/resources/Reporting/ReportRuns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReportRunResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReportRunResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Report Runs, with the most recent appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/reporting/report_runs", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new object and begin running the report. (Certain report types require a [live-mode API key](https://stripe.com/docs/keys#test-live-modes).)
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/reporting/report_runs", params, options);
      }
      /**
       * Retrieves the details of an existing Report Run.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/reporting/report_runs/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ReportRunResource = ReportRunResource;
  }
});

// node_modules/stripe/cjs/resources/Reporting/ReportTypes.js
var require_ReportTypes = __commonJS({
  "node_modules/stripe/cjs/resources/Reporting/ReportTypes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReportTypeResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReportTypeResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a full list of Report Types.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/reporting/report_types", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of a Report Type. (Certain report types require a [live-mode API key](https://stripe.com/docs/keys#test-live-modes).)
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/reporting/report_types/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ReportTypeResource = ReportTypeResource;
  }
});

// node_modules/stripe/cjs/resources/Forwarding/Requests.js
var require_Requests = __commonJS({
  "node_modules/stripe/cjs/resources/Forwarding/Requests.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RequestResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var RequestResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists all ForwardingRequest objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/forwarding/requests", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a ForwardingRequest object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/forwarding/requests", params, options);
      }
      /**
       * Retrieves a ForwardingRequest object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/forwarding/requests/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.RequestResource = RequestResource;
  }
});

// node_modules/stripe/cjs/resources/Sigma/ScheduledQueryRuns.js
var require_ScheduledQueryRuns = __commonJS({
  "node_modules/stripe/cjs/resources/Sigma/ScheduledQueryRuns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ScheduledQueryRunResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ScheduledQueryRunResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of scheduled query runs.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/sigma/scheduled_query_runs", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an scheduled query run.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/sigma/scheduled_query_runs/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ScheduledQueryRunResource = ScheduledQueryRunResource;
  }
});

// node_modules/stripe/cjs/resources/Apps/Secrets.js
var require_Secrets = __commonJS({
  "node_modules/stripe/cjs/resources/Apps/Secrets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SecretResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SecretResource = class extends StripeResource_js_1.StripeResource {
      /**
       * List all secrets stored on the given scope.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/apps/secrets", params, options, {
          methodType: "list"
        });
      }
      /**
       * Create or replace a secret in the secret store.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/apps/secrets", params, options);
      }
      /**
       * Finds a secret in the secret store by name and scope.
       */
      find(params, options) {
        return this._makeRequest("GET", "/v1/apps/secrets/find", params, options);
      }
      /**
       * Deletes a secret from the secret store by name and scope.
       */
      deleteWhere(params, options) {
        return this._makeRequest("POST", "/v1/apps/secrets/delete", params, options);
      }
    };
    exports2.SecretResource = SecretResource;
  }
});

// node_modules/stripe/cjs/resources/BillingPortal/Sessions.js
var require_Sessions = __commonJS({
  "node_modules/stripe/cjs/resources/BillingPortal/Sessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SessionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SessionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a session of the customer portal.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/billing_portal/sessions", params, options);
      }
    };
    exports2.SessionResource = SessionResource;
  }
});

// node_modules/stripe/cjs/resources/Checkout/Sessions.js
var require_Sessions2 = __commonJS({
  "node_modules/stripe/cjs/resources/Checkout/Sessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SessionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SessionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Checkout Sessions.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/checkout/sessions", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    currency_conversion: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: { fx_rate: { kind: "decimal_string" } }
                      }
                    },
                    line_items: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              price: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    currency_options: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          tiers: {
                                            kind: "array",
                                            element: {
                                              kind: "object",
                                              fields: {
                                                flat_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                },
                                                unit_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                }
                                              }
                                            }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Creates a Checkout Session object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/checkout/sessions", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              currency_conversion: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: { fx_rate: { kind: "decimal_string" } }
                }
              },
              line_items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves a Checkout Session object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/checkout/sessions/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              currency_conversion: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: { fx_rate: { kind: "decimal_string" } }
                }
              },
              line_items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates a Checkout Session object.
       *
       * Related guide: [Dynamically update a Checkout Session](https://docs.stripe.com/payments/advanced/dynamic-updates)
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/checkout/sessions/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              currency_conversion: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: { fx_rate: { kind: "decimal_string" } }
                }
              },
              line_items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * A Checkout Session can be expired when it is in one of these statuses: open
       *
       * After it expires, a customer can't complete a Checkout Session and customers loading the Checkout Session see a message saying the Checkout Session is expired.
       */
      expire(id, params, options) {
        return this._makeRequest("POST", `/v1/checkout/sessions/${encodeURIComponent(id)}/expire`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              currency_conversion: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: { fx_rate: { kind: "decimal_string" } }
                }
              },
              line_items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * When retrieving a Checkout Session, there is an includable line_items property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
       */
      listLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/checkout/sessions/${encodeURIComponent(id)}/line_items`, params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.SessionResource = SessionResource;
  }
});

// node_modules/stripe/cjs/resources/FinancialConnections/Sessions.js
var require_Sessions3 = __commonJS({
  "node_modules/stripe/cjs/resources/FinancialConnections/Sessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SessionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SessionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves the details of a Financial Connections Session
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/financial_connections/sessions/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * To launch the Financial Connections authorization flow, create a Session. The session's client_secret can be used to launch the flow using Stripe.js.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/financial_connections/sessions", params, options);
      }
    };
    exports2.SessionResource = SessionResource;
  }
});

// node_modules/stripe/cjs/resources/Tax/Settings.js
var require_Settings = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Settings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SettingResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SettingResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves Tax Settings for a merchant.
       */
      retrieve(params, options) {
        return this._makeRequest("GET", "/v1/tax/settings", params, options);
      }
      /**
       * Updates Tax Settings parameters used in tax calculations. All parameters are editable but none can be removed once set.
       */
      update(params, options) {
        return this._makeRequest("POST", "/v1/tax/settings", params, options);
      }
    };
    exports2.SettingResource = SettingResource;
  }
});

// node_modules/stripe/cjs/resources/Climate/Suppliers.js
var require_Suppliers = __commonJS({
  "node_modules/stripe/cjs/resources/Climate/Suppliers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SupplierResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SupplierResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists all available Climate supplier objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/climate/suppliers", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves a Climate supplier object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/climate/suppliers/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.SupplierResource = SupplierResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/TestClocks.js
var require_TestClocks = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/TestClocks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TestClockResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TestClockResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes a test clock.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/test_helpers/test_clocks/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a test clock.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/test_helpers/test_clocks/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of your test clocks.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/test_helpers/test_clocks", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new test clock that can be attached to new customers and quotes.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/test_helpers/test_clocks", params, options);
      }
      /**
       * Starts advancing a test clock to a specified time in the future. Advancement is done when status changes to Ready.
       */
      advance(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/test_clocks/${encodeURIComponent(id)}/advance`, params, options);
      }
    };
    exports2.TestClockResource = TestClockResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/Tokens.js
var require_Tokens = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Tokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TokenResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TokenResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists all Issuing Token objects for a given card.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/tokens", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves an Issuing Token object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/tokens/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Attempts to update the specified Issuing Token object to the status specified.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/tokens/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.TokenResource = TokenResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/TransactionEntries.js
var require_TransactionEntries = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/TransactionEntries.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransactionEntryResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TransactionEntryResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves a list of TransactionEntry objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/transaction_entries", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flow_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          issuing_authorization: {
                            kind: "object",
                            fields: {
                              fleet: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    reported_breakdown: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          fuel: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                gross_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                }
                                              }
                                            }
                                          },
                                          non_fuel: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                gross_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                }
                                              }
                                            }
                                          },
                                          tax: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                local_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                },
                                                national_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              fuel: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    quantity_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_cost_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              transactions: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    purchase_details: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          fleet: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                reported_breakdown: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      fuel: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            gross_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            }
                                                          }
                                                        }
                                                      },
                                                      non_fuel: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            gross_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            }
                                                          }
                                                        }
                                                      },
                                                      tax: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            local_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            },
                                                            national_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          },
                                          fuel: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                quantity_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                },
                                                unit_cost_decimal: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves a TransactionEntry object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/transaction_entries/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              flow_details: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    issuing_authorization: {
                      kind: "object",
                      fields: {
                        fleet: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              reported_breakdown: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    fuel: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          gross_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    non_fuel: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          gross_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    tax: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          local_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          national_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        },
                        fuel: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              quantity_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_cost_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        transactions: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              purchase_details: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    fleet: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          reported_breakdown: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                fuel: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      gross_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      }
                                                    }
                                                  }
                                                },
                                                non_fuel: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      gross_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      }
                                                    }
                                                  }
                                                },
                                                tax: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      local_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      },
                                                      national_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    },
                                    fuel: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          quantity_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_cost_decimal: {
                                            kind: "decimal_string"
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.TransactionEntryResource = TransactionEntryResource;
  }
});

// node_modules/stripe/cjs/resources/FinancialConnections/Transactions.js
var require_Transactions = __commonJS({
  "node_modules/stripe/cjs/resources/FinancialConnections/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransactionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TransactionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Financial Connections Transaction objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/financial_connections/transactions", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of a Financial Connections Transaction
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/financial_connections/transactions/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.TransactionResource = TransactionResource;
  }
});

// node_modules/stripe/cjs/resources/Issuing/Transactions.js
var require_Transactions2 = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransactionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TransactionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Issuing Transaction objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/issuing/transactions", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    purchase_details: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves an Issuing Transaction object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/issuing/transactions/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    fleet: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          reported_breakdown: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                non_fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tax: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      local_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      national_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    fuel: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_cost_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates the specified Issuing Transaction object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/issuing/transactions/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    fleet: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          reported_breakdown: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                non_fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tax: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      local_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      national_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    fuel: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_cost_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.TransactionResource = TransactionResource;
  }
});

// node_modules/stripe/cjs/resources/Tax/Transactions.js
var require_Transactions3 = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransactionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TransactionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves a Tax Transaction object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/tax/transactions/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Creates a Tax Transaction from a calculation, if that calculation hasn't expired. Calculations expire after 90 days.
       */
      createFromCalculation(params, options) {
        return this._makeRequest("POST", "/v1/tax/transactions/create_from_calculation", params, options);
      }
      /**
       * Partially or fully reverses a previously created Transaction.
       */
      createReversal(params, options) {
        return this._makeRequest("POST", "/v1/tax/transactions/create_reversal", params, options);
      }
      /**
       * Retrieves the line items of a committed standalone transaction as a collection.
       */
      listLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/tax/transactions/${encodeURIComponent(id)}/line_items`, params, options, {
          methodType: "list"
        });
      }
    };
    exports2.TransactionResource = TransactionResource;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/Transactions.js
var require_Transactions4 = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransactionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TransactionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Refund a test-mode Transaction.
       */
      refund(id, params, options) {
        return this._makeRequest("POST", `/v1/test_helpers/issuing/transactions/${encodeURIComponent(id)}/refund`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    fleet: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          reported_breakdown: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                non_fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tax: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      local_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      national_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    fuel: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_cost_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Allows the user to capture an arbitrary amount, also known as a forced capture.
       */
      createForceCapture(params, options) {
        return this._makeRequest("POST", "/v1/test_helpers/issuing/transactions/create_force_capture", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "object",
                fields: {
                  fleet: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "object",
                            fields: {
                              gross_amount_decimal: { kind: "decimal_string" }
                            }
                          },
                          non_fuel: {
                            kind: "object",
                            fields: {
                              gross_amount_decimal: { kind: "decimal_string" }
                            }
                          },
                          tax: {
                            kind: "object",
                            fields: {
                              local_amount_decimal: { kind: "decimal_string" },
                              national_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  },
                  fuel: {
                    kind: "object",
                    fields: {
                      quantity_decimal: { kind: "decimal_string" },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  },
                  receipt: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: { quantity: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    fleet: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          reported_breakdown: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                non_fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tax: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      local_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      national_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    fuel: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_cost_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Allows the user to refund an arbitrary amount, also known as a unlinked refund.
       */
      createUnlinkedRefund(params, options) {
        return this._makeRequest("POST", "/v1/test_helpers/issuing/transactions/create_unlinked_refund", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "object",
                fields: {
                  fleet: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "object",
                        fields: {
                          fuel: {
                            kind: "object",
                            fields: {
                              gross_amount_decimal: { kind: "decimal_string" }
                            }
                          },
                          non_fuel: {
                            kind: "object",
                            fields: {
                              gross_amount_decimal: { kind: "decimal_string" }
                            }
                          },
                          tax: {
                            kind: "object",
                            fields: {
                              local_amount_decimal: { kind: "decimal_string" },
                              national_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  },
                  fuel: {
                    kind: "object",
                    fields: {
                      quantity_decimal: { kind: "decimal_string" },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  },
                  receipt: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: { quantity: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              purchase_details: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    fleet: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          reported_breakdown: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                non_fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tax: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      local_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      national_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    fuel: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_cost_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.TransactionResource = TransactionResource;
  }
});

// node_modules/stripe/cjs/resources/Treasury/Transactions.js
var require_Transactions5 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransactionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TransactionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves a list of Transaction objects.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/treasury/transactions", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    entries: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          data: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flow_details: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      issuing_authorization: {
                                        kind: "object",
                                        fields: {
                                          fleet: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                reported_breakdown: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      fuel: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            gross_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            }
                                                          }
                                                        }
                                                      },
                                                      non_fuel: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            gross_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            }
                                                          }
                                                        }
                                                      },
                                                      tax: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            local_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            },
                                                            national_amount_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          },
                                          fuel: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                quantity_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                },
                                                unit_cost_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                }
                                              }
                                            }
                                          },
                                          transactions: {
                                            kind: "array",
                                            element: {
                                              kind: "object",
                                              fields: {
                                                purchase_details: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      fleet: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            reported_breakdown: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "object",
                                                                fields: {
                                                                  fuel: {
                                                                    kind: "nullable",
                                                                    inner: {
                                                                      kind: "object",
                                                                      fields: {
                                                                        gross_amount_decimal: {
                                                                          kind: "nullable",
                                                                          inner: {
                                                                            kind: "decimal_string"
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  },
                                                                  non_fuel: {
                                                                    kind: "nullable",
                                                                    inner: {
                                                                      kind: "object",
                                                                      fields: {
                                                                        gross_amount_decimal: {
                                                                          kind: "nullable",
                                                                          inner: {
                                                                            kind: "decimal_string"
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  },
                                                                  tax: {
                                                                    kind: "nullable",
                                                                    inner: {
                                                                      kind: "object",
                                                                      fields: {
                                                                        local_amount_decimal: {
                                                                          kind: "nullable",
                                                                          inner: {
                                                                            kind: "decimal_string"
                                                                          }
                                                                        },
                                                                        national_amount_decimal: {
                                                                          kind: "nullable",
                                                                          inner: {
                                                                            kind: "decimal_string"
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      },
                                                      fuel: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            quantity_decimal: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "decimal_string"
                                                              }
                                                            },
                                                            unit_cost_decimal: {
                                                              kind: "decimal_string"
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves the details of an existing Transaction.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/treasury/transactions/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              entries: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flow_details: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                issuing_authorization: {
                                  kind: "object",
                                  fields: {
                                    fleet: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          reported_breakdown: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                fuel: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      gross_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      }
                                                    }
                                                  }
                                                },
                                                non_fuel: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      gross_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      }
                                                    }
                                                  }
                                                },
                                                tax: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      local_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      },
                                                      national_amount_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    },
                                    fuel: {
                                      kind: "nullable",
                                      inner: {
                                        kind: "object",
                                        fields: {
                                          quantity_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_cost_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    transactions: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          purchase_details: {
                                            kind: "nullable",
                                            inner: {
                                              kind: "object",
                                              fields: {
                                                fleet: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      reported_breakdown: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "object",
                                                          fields: {
                                                            fuel: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "object",
                                                                fields: {
                                                                  gross_amount_decimal: {
                                                                    kind: "nullable",
                                                                    inner: {
                                                                      kind: "decimal_string"
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            },
                                                            non_fuel: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "object",
                                                                fields: {
                                                                  gross_amount_decimal: {
                                                                    kind: "nullable",
                                                                    inner: {
                                                                      kind: "decimal_string"
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            },
                                                            tax: {
                                                              kind: "nullable",
                                                              inner: {
                                                                kind: "object",
                                                                fields: {
                                                                  local_amount_decimal: {
                                                                    kind: "nullable",
                                                                    inner: {
                                                                      kind: "decimal_string"
                                                                    }
                                                                  },
                                                                  national_amount_decimal: {
                                                                    kind: "nullable",
                                                                    inner: {
                                                                      kind: "decimal_string"
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                },
                                                fuel: {
                                                  kind: "nullable",
                                                  inner: {
                                                    kind: "object",
                                                    fields: {
                                                      quantity_decimal: {
                                                        kind: "nullable",
                                                        inner: {
                                                          kind: "decimal_string"
                                                        }
                                                      },
                                                      unit_cost_decimal: {
                                                        kind: "decimal_string"
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.TransactionResource = TransactionResource;
  }
});

// node_modules/stripe/cjs/resources/Radar/ValueListItems.js
var require_ValueListItems = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/ValueListItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ValueListItemResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ValueListItemResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes a ValueListItem object, removing it from its parent value list.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/radar/value_list_items/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a ValueListItem object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/radar/value_list_items/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of ValueListItem objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/radar/value_list_items", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new ValueListItem object, which is added to the specified parent value list.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/radar/value_list_items", params, options);
      }
    };
    exports2.ValueListItemResource = ValueListItemResource;
  }
});

// node_modules/stripe/cjs/resources/Radar/ValueLists.js
var require_ValueLists = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/ValueLists.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ValueListResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ValueListResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes a ValueList object, also deleting any items contained within the value list. To be deleted, a value list must not be referenced in any rules.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/radar/value_lists/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a ValueList object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/radar/value_lists/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a ValueList object by setting the values of the parameters passed. Any parameters not provided will be left unchanged. Note that item_type is immutable.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/radar/value_lists/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of ValueList objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/radar/value_lists", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new ValueList object, which can then be referenced in rules.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/radar/value_lists", params, options);
      }
    };
    exports2.ValueListResource = ValueListResource;
  }
});

// node_modules/stripe/cjs/resources/Identity/VerificationReports.js
var require_VerificationReports = __commonJS({
  "node_modules/stripe/cjs/resources/Identity/VerificationReports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.VerificationReportResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var VerificationReportResource = class extends StripeResource_js_1.StripeResource {
      /**
       * List all verification reports.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/identity/verification_reports", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves an existing VerificationReport
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/identity/verification_reports/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.VerificationReportResource = VerificationReportResource;
  }
});

// node_modules/stripe/cjs/resources/Identity/VerificationSessions.js
var require_VerificationSessions = __commonJS({
  "node_modules/stripe/cjs/resources/Identity/VerificationSessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.VerificationSessionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var VerificationSessionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of VerificationSessions
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/identity/verification_sessions", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a VerificationSession object.
       *
       * After the VerificationSession is created, display a verification modal using the session client_secret or send your users to the session's url.
       *
       * If your API key is in test mode, verification checks won't actually process, though everything else will occur as if in live mode.
       *
       * Related guide: [Verify your users' identity documents](https://docs.stripe.com/docs/identity/verify-identity-documents)
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/identity/verification_sessions", params, options);
      }
      /**
       * Retrieves the details of a VerificationSession that was previously created.
       *
       * When the session status is requires_input, you can use this method to retrieve a valid
       * client_secret or url to allow re-submission.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/identity/verification_sessions/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a VerificationSession object.
       *
       * When the session status is requires_input, you can use this method to update the
       * verification check and options.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/identity/verification_sessions/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * A VerificationSession object can be canceled when it is in requires_input [status](https://docs.stripe.com/docs/identity/how-sessions-work).
       *
       * Once canceled, future submission attempts are disabled. This cannot be undone. [Learn more](https://docs.stripe.com/docs/identity/verification-sessions#cancel).
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/identity/verification_sessions/${encodeURIComponent(id)}/cancel`, params, options);
      }
      /**
       * Redact a VerificationSession to remove all collected information from Stripe. This will redact
       * the VerificationSession and all objects related to it, including VerificationReports, Events,
       * request logs, etc.
       *
       * A VerificationSession object can be redacted when it is in requires_input or verified
       * [status](https://docs.stripe.com/docs/identity/how-sessions-work). Redacting a VerificationSession in requires_action
       * state will automatically cancel it.
       *
       * The redaction process may take up to four days. When the redaction process is in progress, the
       * VerificationSession's redaction.status field will be set to processing; when the process is
       * finished, it will change to redacted and an identity.verification_session.redacted event
       * will be emitted.
       *
       * Redaction is irreversible. Redacted objects are still accessible in the Stripe API, but all the
       * fields that contain personal data will be replaced by the string [redacted] or a similar
       * placeholder. The metadata field will also be erased. Redacted objects cannot be updated or
       * used for any purpose.
       *
       * [Learn more](https://docs.stripe.com/docs/identity/verification-sessions#redact).
       */
      redact(id, params, options) {
        return this._makeRequest("POST", `/v1/identity/verification_sessions/${encodeURIComponent(id)}/redact`, params, options);
      }
    };
    exports2.VerificationSessionResource = VerificationSessionResource;
  }
});

// node_modules/stripe/cjs/resources/Accounts.js
var require_Accounts3 = __commonJS({
  "node_modules/stripe/cjs/resources/Accounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AccountResource = class extends StripeResource_js_1.StripeResource {
      /**
       * With [Connect](https://docs.stripe.com/connect), you can delete accounts you manage.
       *
       * Test-mode accounts can be deleted at any time.
       *
       * Live-mode accounts that have access to the standard dashboard and Stripe is responsible for negative account balances cannot be deleted, which includes Standard accounts. All other Live-mode accounts, can be deleted when all [balances](https://docs.stripe.com/api/balance/balance_object) are zero.
       *
       * If you want to delete your own account, use the [account information tab in your account settings](https://dashboard.stripe.com/settings/account) instead.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the details of an account. Pass `null` as the account id to retrieve details about your own account.
       */
      retrieve(id, params, options) {
        if (typeof id === "string") {
          return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}`, params, options);
        } else {
          return this._makeRequest("GET", "/v1/account", params, options);
        }
      }
      /**
       * Updates a [connected account](https://docs.stripe.com/connect/accounts) by setting the values of the parameters passed. Any parameters not provided are
       * left unchanged.
       *
       * For accounts where [controller.requirement_collection](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection)
       * is application, which includes Custom accounts, you can update any information on the account.
       *
       * For accounts where [controller.requirement_collection](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection)
       * is stripe, which includes Standard and Express accounts, you can update all information until you create
       * an [Account Link or <a href="/api/account_sessions">Account Session](https://docs.stripe.com/api/account_links) to start Connect onboarding,
       * after which some properties can no longer be updated.
       *
       * To update your own account, use the [Dashboard](https://dashboard.stripe.com/settings/account). Refer to our
       * [Connect](https://docs.stripe.com/docs/connect/updating-accounts) documentation to learn more about updating accounts.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the details of an account.
       */
      retrieveCurrent(params, options) {
        return this._makeRequest("GET", "/v1/account", params, options);
      }
      /**
       * Returns a list of accounts connected to your platform via [Connect](https://docs.stripe.com/docs/connect). If you're not a platform, the list is empty.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/accounts", params, options, {
          methodType: "list"
        });
      }
      /**
       * With [Connect](https://docs.stripe.com/docs/connect), you can create Stripe accounts for your users.
       * To do this, you'll first need to [register your platform](https://dashboard.stripe.com/account/applications/settings).
       *
       * If you've already collected information for your connected accounts, you [can prefill that information](https://docs.stripe.com/docs/connect/best-practices#onboarding) when
       * creating the account. Connect Onboarding won't ask for the prefilled information during account onboarding.
       * You can prefill any information on the account.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/accounts", params, options);
      }
      /**
       * With [Connect](https://docs.stripe.com/connect), you can reject accounts that you have flagged as suspicious.
       *
       * Only accounts where your platform is liable for negative account balances, which includes Custom and Express accounts, can be rejected. Test-mode accounts can be rejected at any time. Live-mode accounts can only be rejected after all balances are zero.
       */
      reject(id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/reject`, params, options);
      }
      /**
       * Returns a list of capabilities associated with the account. The capabilities are returned sorted by creation date, with the most recent capability appearing first.
       */
      listCapabilities(id, params, options) {
        return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}/capabilities`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves information about the specified Account Capability.
       */
      retrieveCapability(accountId, id, params, options) {
        return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(accountId)}/capabilities/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing Account Capability. Request or remove a capability by updating its requested parameter.
       */
      updateCapability(accountId, id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(accountId)}/capabilities/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Delete a specified external account for a given account.
       */
      deleteExternalAccount(accountId, id, params, options) {
        return this._makeRequest("DELETE", `/v1/accounts/${encodeURIComponent(accountId)}/external_accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieve a specified external account for a given account.
       */
      retrieveExternalAccount(accountId, id, params, options) {
        return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(accountId)}/external_accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the metadata, account holder name, account holder type of a bank account belonging to
       * a connected account and optionally sets it as the default for its currency. Other bank account
       * details are not editable by design.
       *
       * You can only update bank accounts when [account.controller.requirement_collection is application, which includes <a href="/connect/custom-accounts">Custom accounts](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection).
       *
       * You can re-enable a disabled bank account by performing an update call without providing any
       * arguments or changes.
       */
      updateExternalAccount(accountId, id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(accountId)}/external_accounts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * List external accounts for an account.
       */
      listExternalAccounts(id, params, options) {
        return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}/external_accounts`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Create an external account for a given account.
       */
      createExternalAccount(id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/external_accounts`, params, options);
      }
      /**
       * Creates a login link for a connected account to access the Express Dashboard.
       *
       * You can only create login links for accounts that use the [Express Dashboard](https://docs.stripe.com/connect/express-dashboard) and are connected to your platform.
       */
      createLoginLink(id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/login_links`, params, options);
      }
      /**
       * Deletes an existing person's relationship to the account's legal entity. Any person with a relationship for an account can be deleted through the API, except if the person is the account_opener. If your integration is using the executive parameter, you cannot delete the only verified executive on file.
       */
      deletePerson(accountId, id, params, options) {
        return this._makeRequest("DELETE", `/v1/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves an existing person.
       */
      retrievePerson(accountId, id, params, options) {
        return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing person.
       */
      updatePerson(accountId, id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of people associated with the account's legal entity. The people are returned sorted by creation date, with the most recent people appearing first.
       */
      listPersons(id, params, options) {
        return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}/persons`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new person.
       */
      createPerson(id, params, options) {
        return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/persons`, params, options);
      }
    };
    exports2.AccountResource = AccountResource;
  }
});

// node_modules/stripe/cjs/resources/AccountLinks.js
var require_AccountLinks2 = __commonJS({
  "node_modules/stripe/cjs/resources/AccountLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountLinkResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AccountLinkResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates an AccountLink object that includes a single-use Stripe URL that the platform can redirect their user to in order to take them through the Connect Onboarding flow.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/account_links", params, options);
      }
    };
    exports2.AccountLinkResource = AccountLinkResource;
  }
});

// node_modules/stripe/cjs/resources/AccountSessions.js
var require_AccountSessions = __commonJS({
  "node_modules/stripe/cjs/resources/AccountSessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountSessionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var AccountSessionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a AccountSession object that includes a single-use token that the platform can use on their front-end to grant client-side API access.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/account_sessions", params, options);
      }
    };
    exports2.AccountSessionResource = AccountSessionResource;
  }
});

// node_modules/stripe/cjs/resources/ApplePayDomains.js
var require_ApplePayDomains = __commonJS({
  "node_modules/stripe/cjs/resources/ApplePayDomains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ApplePayDomainResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ApplePayDomainResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Delete an apple pay domain.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/apple_pay/domains/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieve an apple pay domain.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/apple_pay/domains/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * List apple pay domains.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/apple_pay/domains", params, options, {
          methodType: "list"
        });
      }
      /**
       * Create an apple pay domain.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/apple_pay/domains", params, options);
      }
    };
    exports2.ApplePayDomainResource = ApplePayDomainResource;
  }
});

// node_modules/stripe/cjs/resources/ApplicationFees.js
var require_ApplicationFees = __commonJS({
  "node_modules/stripe/cjs/resources/ApplicationFees.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ApplicationFeeResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ApplicationFeeResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of application fees you've previously collected. The application fees are returned in sorted order, with the most recent fees appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/application_fees", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an application fee that your account has collected. The same information is returned when refunding the application fee.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/application_fees/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * By default, you can see the 10 most recent refunds stored directly on the application fee object, but you can also retrieve details about a specific refund stored on the application fee.
       */
      retrieveRefund(feeId, id, params, options) {
        return this._makeRequest("GET", `/v1/application_fees/${encodeURIComponent(feeId)}/refunds/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified application fee refund by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       *
       * This request only accepts metadata as an argument.
       */
      updateRefund(feeId, id, params, options) {
        return this._makeRequest("POST", `/v1/application_fees/${encodeURIComponent(feeId)}/refunds/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * You can see a list of the refunds belonging to a specific application fee. Note that the 10 most recent refunds are always available by default on the application fee object. If you need more than those 10, you can use this API method and the limit and starting_after parameters to page through additional refunds.
       */
      listRefunds(id, params, options) {
        return this._makeRequest("GET", `/v1/application_fees/${encodeURIComponent(id)}/refunds`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Refunds an application fee that has previously been collected but not yet refunded.
       * Funds will be refunded to the Stripe account from which the fee was originally collected.
       *
       * You can optionally refund only part of an application fee.
       * You can do so multiple times, until the entire fee has been refunded.
       *
       * Once entirely refunded, an application fee can't be refunded again.
       * This method will raise an error when called on an already-refunded application fee,
       * or when trying to refund more money than is left on an application fee.
       */
      createRefund(id, params, options) {
        return this._makeRequest("POST", `/v1/application_fees/${encodeURIComponent(id)}/refunds`, params, options);
      }
    };
    exports2.ApplicationFeeResource = ApplicationFeeResource;
  }
});

// node_modules/stripe/cjs/resources/Balance.js
var require_Balance = __commonJS({
  "node_modules/stripe/cjs/resources/Balance.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BalanceResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var BalanceResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves the current account balance, based on the authentication that was used to make the request.
       *  For a sample request, see [Accounting for negative balances](https://docs.stripe.com/docs/connect/account-balances#accounting-for-negative-balances).
       */
      retrieve(params, options) {
        return this._makeRequest("GET", "/v1/balance", params, options);
      }
    };
    exports2.BalanceResource = BalanceResource;
  }
});

// node_modules/stripe/cjs/resources/BalanceSettings.js
var require_BalanceSettings = __commonJS({
  "node_modules/stripe/cjs/resources/BalanceSettings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BalanceSettingResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var BalanceSettingResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves balance settings for a given connected account.
       *  Related guide: [Making API calls for connected accounts](https://docs.stripe.com/connect/authentication)
       */
      retrieve(params, options) {
        return this._makeRequest("GET", "/v1/balance_settings", params, options);
      }
      /**
       * Updates balance settings for a given connected account.
       *  Related guide: [Making API calls for connected accounts](https://docs.stripe.com/connect/authentication)
       */
      update(params, options) {
        return this._makeRequest("POST", "/v1/balance_settings", params, options);
      }
    };
    exports2.BalanceSettingResource = BalanceSettingResource;
  }
});

// node_modules/stripe/cjs/resources/BalanceTransactions.js
var require_BalanceTransactions = __commonJS({
  "node_modules/stripe/cjs/resources/BalanceTransactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BalanceTransactionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var BalanceTransactionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of transactions that have contributed to the Stripe account balance (for example, charges, transfers, and so on). The transactions return in sorted order, with the most recent transactions appearing first.
       *
       * The previous name of this endpoint was “Balance history,” and it used the path /v1/balance/history.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/balance_transactions", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the balance transaction with the given ID.
       *
       * Note that this endpoint previously used the path /v1/balance/history/:id.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/balance_transactions/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.BalanceTransactionResource = BalanceTransactionResource;
  }
});

// node_modules/stripe/cjs/resources/Charges.js
var require_Charges = __commonJS({
  "node_modules/stripe/cjs/resources/Charges.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ChargeResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ChargeResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of charges you've previously created. The charges are returned in sorted order, with the most recent charges appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/charges", params, options, {
          methodType: "list"
        });
      }
      /**
       * This method is no longer recommended—use the [Payment Intents API](https://docs.stripe.com/docs/api/payment_intents)
       * to initiate a new payment instead. Confirmation of the PaymentIntent creates the Charge
       * object used to request payment.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/charges", params, options);
      }
      /**
       * Retrieves the details of a charge that has previously been created. Supply the unique charge ID that was returned from your previous request, and Stripe will return the corresponding charge information. The same information is returned when creating or refunding the charge.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/charges/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified charge by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/charges/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Search for charges you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
       * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
       * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
       * to an hour behind during outages. Search functionality is not available to merchants in India.
       */
      search(params, options) {
        return this._makeRequest("GET", "/v1/charges/search", params, options, {
          methodType: "search"
        });
      }
      /**
       * Capture the payment of an existing, uncaptured charge that was created with the capture option set to false.
       *
       * Uncaptured payments expire a set number of days after they are created ([7 by default](https://docs.stripe.com/docs/charges/placing-a-hold)), after which they are marked as refunded and capture attempts will fail.
       *
       * Don't use this method to capture a PaymentIntent-initiated charge. Use [Capture a PaymentIntent](https://docs.stripe.com/docs/api/payment_intents/capture).
       */
      capture(id, params, options) {
        return this._makeRequest("POST", `/v1/charges/${encodeURIComponent(id)}/capture`, params, options);
      }
    };
    exports2.ChargeResource = ChargeResource;
  }
});

// node_modules/stripe/cjs/resources/ConfirmationTokens.js
var require_ConfirmationTokens2 = __commonJS({
  "node_modules/stripe/cjs/resources/ConfirmationTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfirmationTokenResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ConfirmationTokenResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves an existing ConfirmationToken object
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/confirmation_tokens/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ConfirmationTokenResource = ConfirmationTokenResource;
  }
});

// node_modules/stripe/cjs/resources/CountrySpecs.js
var require_CountrySpecs = __commonJS({
  "node_modules/stripe/cjs/resources/CountrySpecs.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CountrySpecResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CountrySpecResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists all Country Spec objects available in the API.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/country_specs", params, options, {
          methodType: "list"
        });
      }
      /**
       * Returns a Country Spec for a given Country code.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/country_specs/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.CountrySpecResource = CountrySpecResource;
  }
});

// node_modules/stripe/cjs/resources/Coupons.js
var require_Coupons = __commonJS({
  "node_modules/stripe/cjs/resources/Coupons.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CouponResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CouponResource = class extends StripeResource_js_1.StripeResource {
      /**
       * You can delete coupons via the [coupon management](https://dashboard.stripe.com/coupons) page of the Stripe dashboard. However, deleting a coupon does not affect any customers who have already applied the coupon; it means that new customers can't redeem the coupon. You can also delete coupons via the API.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/coupons/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the coupon with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/coupons/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the metadata of a coupon. Other coupon details (currency, duration, amount_off) are, by design, not editable.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/coupons/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of your coupons.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/coupons", params, options, {
          methodType: "list"
        });
      }
      /**
       * You can create coupons easily via the [coupon management](https://dashboard.stripe.com/coupons) page of the Stripe dashboard. Coupon creation is also accessible via the API if you need to create coupons on the fly.
       *
       * A coupon has either a percent_off or an amount_off and currency. If you set an amount_off, that amount will be subtracted from any invoice's subtotal. For example, an invoice with a subtotal of 100 will have a final total of 0 if a coupon with an amount_off of 200 is applied to it and an invoice with a subtotal of 300 will have a final total of 100 if a coupon with an amount_off of 200 is applied to it.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/coupons", params, options);
      }
    };
    exports2.CouponResource = CouponResource;
  }
});

// node_modules/stripe/cjs/resources/CreditNotes.js
var require_CreditNotes = __commonJS({
  "node_modules/stripe/cjs/resources/CreditNotes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditNoteResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CreditNoteResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of credit notes.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/credit_notes", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    lines: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Issue a credit note to adjust the amount of a finalized invoice. A credit note will first reduce the invoice's amount_remaining (and amount_due), but not below zero.
       * This amount is indicated by the credit note's pre_payment_amount. The excess amount is indicated by post_payment_amount, and it can result in any combination of the following:
       *
       *
       * Refunds: create a new refund (using refund_amount) or link existing refunds (using refunds).
       * Customer balance credit: credit the customer's balance (using credit_amount) which will be automatically applied to their next invoice when it's finalized.
       * Outside of Stripe credit: record the amount that is or will be credited outside of Stripe (using out_of_band_amount).
       *
       *
       * The sum of refunds, customer balance credits, and outside of Stripe credits must equal the post_payment_amount.
       *
       * You may issue multiple credit notes for an invoice. Each credit note may increment the invoice's pre_payment_credit_notes_amount,
       * post_payment_credit_notes_amount, or both, depending on the invoice's amount_remaining at the time of credit note creation.
       *
       * For invoices that also have refunds created through the [Refund API](https://docs.stripe.com/docs/api/refunds), the credit note API subtracts those refund amounts from the maximum creditable amount. This prevents the combined credit notes and refunds from exceeding the invoice amount. If you use both, ensure the combined total does not exceed the invoice's paid amount.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/credit_notes", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves the credit note object with the given identifier.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/credit_notes/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates an existing credit note.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/credit_notes/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Get a preview of a credit note without creating it.
       */
      preview(params, options) {
        return this._makeRequest("GET", "/v1/credit_notes/preview", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Marks a credit note as void. Learn more about [voiding credit notes](https://docs.stripe.com/docs/billing/invoices/credit-notes#voiding).
       */
      voidCreditNote(id, params, options) {
        return this._makeRequest("POST", `/v1/credit_notes/${encodeURIComponent(id)}/void`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * When retrieving a credit note preview, you'll get a lines property containing the first handful of those items. This URL you can retrieve the full (paginated) list of line items.
       */
      listPreviewLineItems(params, options) {
        return this._makeRequest("GET", "/v1/credit_notes/preview/lines", params, options, {
          methodType: "list",
          requestSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * When retrieving a credit note, you'll get a lines property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
       */
      listLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/credit_notes/${encodeURIComponent(id)}/lines`, params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.CreditNoteResource = CreditNoteResource;
  }
});

// node_modules/stripe/cjs/resources/Customers.js
var require_Customers2 = __commonJS({
  "node_modules/stripe/cjs/resources/Customers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CustomerResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CustomerResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Permanently deletes a customer. It cannot be undone. Also immediately cancels any active subscriptions on the customer.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a Customer object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified customer by setting the values of the parameters passed. Any parameters not provided are left unchanged. For example, if you pass the source parameter, that becomes the customer's active source (such as a card) to be used for all charges in the future. When you update a customer to a new valid card source by passing the source parameter: for each of the customer's current subscriptions, if the subscription bills automatically and is in the past_due state, then the latest open invoice for the subscription with automatic collection enabled is retried. This retry doesn't count as an automatic retry, and doesn't affect the next regularly scheduled payment for the invoice. Changing the default_source for a customer doesn't trigger this behavior.
       *
       * This request accepts mostly the same arguments as the customer creation call.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              subscriptions: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        items: {
                          kind: "object",
                          fields: {
                            data: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  plan: {
                                    kind: "object",
                                    fields: {
                                      amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  },
                                  price: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Removes the currently applied discount on a customer.
       */
      deleteDiscount(id, params, options) {
        return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(id)}/discount`, params, options);
      }
      /**
       * Returns a list of your customers. The customers are returned sorted by creation date, with the most recent customers appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/customers", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    subscriptions: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              items: {
                                kind: "object",
                                fields: {
                                  data: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        plan: {
                                          kind: "object",
                                          fields: {
                                            amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        },
                                        price: {
                                          kind: "object",
                                          fields: {
                                            currency_options: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  tiers: {
                                                    kind: "array",
                                                    element: {
                                                      kind: "object",
                                                      fields: {
                                                        flat_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        },
                                                        unit_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Creates a new customer object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/customers", params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              subscriptions: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        items: {
                          kind: "object",
                          fields: {
                            data: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  plan: {
                                    kind: "object",
                                    fields: {
                                      amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  },
                                  price: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Search for customers you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
       * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
       * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
       * to an hour behind during outages. Search functionality is not available to merchants in India.
       */
      search(params, options) {
        return this._makeRequest("GET", "/v1/customers/search", params, options, {
          methodType: "search",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    subscriptions: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              items: {
                                kind: "object",
                                fields: {
                                  data: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        plan: {
                                          kind: "object",
                                          fields: {
                                            amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        },
                                        price: {
                                          kind: "object",
                                          fields: {
                                            currency_options: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  tiers: {
                                                    kind: "array",
                                                    element: {
                                                      kind: "object",
                                                      fields: {
                                                        flat_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        },
                                                        unit_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Returns a list of transactions that updated the customer's [balances](https://docs.stripe.com/docs/billing/customer/balance).
       */
      listBalanceTransactions(id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/balance_transactions`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates an immutable transaction that updates the customer's credit [balance](https://docs.stripe.com/docs/billing/customer/balance).
       */
      createBalanceTransaction(id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/balance_transactions`, params, options);
      }
      /**
       * Retrieves a specific customer balance transaction that updated the customer's [balances](https://docs.stripe.com/docs/billing/customer/balance).
       */
      retrieveBalanceTransaction(customerId, id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/balance_transactions/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Most credit balance transaction fields are immutable, but you may update its description and metadata.
       */
      updateBalanceTransaction(customerId, id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(customerId)}/balance_transactions/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a customer's cash balance.
       */
      retrieveCashBalance(id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/cash_balance`, params, options);
      }
      /**
       * Changes the settings on a customer's cash balance.
       */
      updateCashBalance(id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/cash_balance`, params, options);
      }
      /**
       * Returns a list of transactions that modified the customer's [cash balance](https://docs.stripe.com/docs/payments/customer-balance).
       */
      listCashBalanceTransactions(id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/cash_balance_transactions`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves a specific cash balance transaction, which updated the customer's [cash balance](https://docs.stripe.com/docs/payments/customer-balance).
       */
      retrieveCashBalanceTransaction(customerId, id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/cash_balance_transactions/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieve funding instructions for a customer cash balance. If funding instructions do not yet exist for the customer, new
       * funding instructions will be created. If funding instructions have already been created for a given customer, the same
       * funding instructions will be retrieved. In other words, we will return the same funding instructions each time.
       */
      createFundingInstructions(id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/funding_instructions`, params, options);
      }
      /**
       * Returns a list of PaymentMethods for a given Customer
       */
      listPaymentMethods(id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/payment_methods`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves a PaymentMethod object for a given Customer.
       */
      retrievePaymentMethod(customerId, id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/payment_methods/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * List sources for a specified customer.
       */
      listSources(id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/sources`, params, options, {
          methodType: "list"
        });
      }
      /**
       * When you create a new credit card, you must specify a customer or recipient on which to create it.
       *
       * If the card's owner has no default card, then the new card will become the default.
       * However, if the owner already has a default, then it will not change.
       * To change the default, you should [update the customer](https://docs.stripe.com/api/customers/update) to have a new default_source.
       */
      createSource(id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/sources`, params, options);
      }
      /**
       * Retrieve a specified source for a given customer.
       */
      retrieveSource(customerId, id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Update a specified source for a given customer.
       */
      updateSource(customerId, id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Delete a specified source for a given customer.
       */
      deleteSource(customerId, id, params, options) {
        return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Verify a specified bank account for a given customer.
       */
      verifySource(customerId, id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}/verify`, params, options);
      }
      /**
       * Deletes an existing tax_id object.
       */
      deleteTaxId(customerId, id, params, options) {
        return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(customerId)}/tax_ids/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the tax_id object with the given identifier.
       */
      retrieveTaxId(customerId, id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/tax_ids/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of tax IDs for a customer.
       */
      listTaxIds(id, params, options) {
        return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/tax_ids`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new tax_id object for a customer.
       */
      createTaxId(id, params, options) {
        return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/tax_ids`, params, options);
      }
    };
    exports2.CustomerResource = CustomerResource;
  }
});

// node_modules/stripe/cjs/resources/CustomerSessions.js
var require_CustomerSessions = __commonJS({
  "node_modules/stripe/cjs/resources/CustomerSessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CustomerSessionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var CustomerSessionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Creates a Customer Session object that includes a single-use client secret that you can use on your front-end to grant client-side API access for certain customer resources.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/customer_sessions", params, options);
      }
    };
    exports2.CustomerSessionResource = CustomerSessionResource;
  }
});

// node_modules/stripe/cjs/resources/Disputes.js
var require_Disputes2 = __commonJS({
  "node_modules/stripe/cjs/resources/Disputes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DisputeResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var DisputeResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of your disputes.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/disputes", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the dispute with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/disputes/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * When you get a dispute, contacting your customer is always the best first step. If that doesn't work, you can submit evidence to help us resolve the dispute in your favor. You can do this in your [dashboard](https://dashboard.stripe.com/disputes), but if you prefer, you can use the API to submit evidence programmatically.
       *
       * Depending on your dispute type, different evidence fields will give you a better chance of winning your dispute. To figure out which evidence fields to provide, see our [guide to dispute types](https://docs.stripe.com/docs/disputes/categories).
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/disputes/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Closing the dispute for a charge indicates that you do not have any evidence to submit and are essentially dismissing the dispute, acknowledging it as lost.
       *
       * The status of the dispute will change from needs_response to lost. Closing a dispute is irreversible.
       */
      close(id, params, options) {
        return this._makeRequest("POST", `/v1/disputes/${encodeURIComponent(id)}/close`, params, options);
      }
    };
    exports2.DisputeResource = DisputeResource;
  }
});

// node_modules/stripe/cjs/resources/EphemeralKeys.js
var require_EphemeralKeys = __commonJS({
  "node_modules/stripe/cjs/resources/EphemeralKeys.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EphemeralKeyResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var EphemeralKeyResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Invalidates a short-lived API key for a given resource.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/ephemeral_keys/${encodeURIComponent(id)}`, params, options);
      }
      create(params, options) {
        return this._makeRequest("POST", "/v1/ephemeral_keys", params, options, {
          validator: (data, options2) => {
            if (!options2.headers || !options2.headers["Stripe-Version"]) {
              throw new Error("Passing apiVersion in a separate options hash is required to create an ephemeral key. See https://stripe.com/docs/api/versioning?lang=node");
            }
          }
        });
      }
    };
    exports2.EphemeralKeyResource = EphemeralKeyResource;
  }
});

// node_modules/stripe/cjs/resources/Events.js
var require_Events2 = __commonJS({
  "node_modules/stripe/cjs/resources/Events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EventResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var EventResource = class extends StripeResource_js_1.StripeResource {
      /**
       * List events, going back up to 30 days. Each event data is rendered according to Stripe API version at its creation time, specified in [event object](https://docs.stripe.com/api/events/object) api_version attribute (not according to your current Stripe API version or Stripe-Version header).
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/events", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an event if it was created in the last 30 days. Supply the unique identifier of the event, which you might have received in a webhook.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/events/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.EventResource = EventResource;
  }
});

// node_modules/stripe/cjs/resources/ExchangeRates.js
var require_ExchangeRates = __commonJS({
  "node_modules/stripe/cjs/resources/ExchangeRates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ExchangeRateResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ExchangeRateResource = class extends StripeResource_js_1.StripeResource {
      /**
       * [Deprecated] The ExchangeRate APIs are deprecated. Please use the [FX Quotes API](https://docs.stripe.com/payments/currencies/localize-prices/fx-quotes-api) instead.
       *
       * Returns a list of objects that contain the rates at which foreign currencies are converted to one another. Only shows the currencies for which Stripe supports.
       * @deprecated
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/exchange_rates", params, options, {
          methodType: "list"
        });
      }
      /**
       * [Deprecated] The ExchangeRate APIs are deprecated. Please use the [FX Quotes API](https://docs.stripe.com/payments/currencies/localize-prices/fx-quotes-api) instead.
       *
       * Retrieves the exchange rates from the given currency to every supported currency.
       * @deprecated
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/exchange_rates/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ExchangeRateResource = ExchangeRateResource;
  }
});

// node_modules/stripe/cjs/multipart.js
var require_multipart = __commonJS({
  "node_modules/stripe/cjs/multipart.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.multipartRequestDataProcessor = void 0;
    var utils_js_1 = require_utils();
    var multipartDataGenerator = (method, data, headers) => {
      const segno = (Math.round(Math.random() * 1e16) + Math.round(Math.random() * 1e16)).toString();
      headers["Content-Type"] = `multipart/form-data; boundary=${segno}`;
      const textEncoder = new TextEncoder();
      let buffer = new Uint8Array(0);
      const endBuffer = textEncoder.encode("\r\n");
      function push(l) {
        const prevBuffer = buffer;
        const newBuffer = l instanceof Uint8Array ? l : new Uint8Array(textEncoder.encode(l));
        buffer = new Uint8Array(prevBuffer.length + newBuffer.length + 2);
        buffer.set(prevBuffer);
        buffer.set(newBuffer, prevBuffer.length);
        buffer.set(endBuffer, buffer.length - 2);
      }
      function q(s) {
        return `"${s.replace(/"|"/g, "%22").replace(/\r\n|\r|\n/g, " ")}"`;
      }
      const flattenedData = (0, utils_js_1.flattenAndStringify)(data);
      for (const k in flattenedData) {
        if (!Object.prototype.hasOwnProperty.call(flattenedData, k)) {
          continue;
        }
        const v = flattenedData[k];
        push(`--${segno}`);
        if (Object.prototype.hasOwnProperty.call(v, "data")) {
          const typedEntry = v;
          push(`Content-Disposition: form-data; name=${q(k)}; filename=${q(typedEntry.name || "blob")}`);
          push(`Content-Type: ${typedEntry.type || "application/octet-stream"}`);
          push("");
          push(typedEntry.data);
        } else {
          push(`Content-Disposition: form-data; name=${q(k)}`);
          push("");
          push(v);
        }
      }
      push(`--${segno}--`);
      return buffer;
    };
    function multipartRequestDataProcessor(method, data, headers, callback) {
      data = data || {};
      if (method !== "POST") {
        return callback(null, (0, utils_js_1.queryStringifyRequestData)(data));
      }
      this._stripe._platformFunctions.tryBufferData(data).then((bufferedData) => {
        const buffer = multipartDataGenerator(method, bufferedData, headers);
        return callback(null, buffer);
      }).catch((err) => callback(err, null));
    }
    exports2.multipartRequestDataProcessor = multipartRequestDataProcessor;
  }
});

// node_modules/stripe/cjs/resources/Files.js
var require_Files = __commonJS({
  "node_modules/stripe/cjs/resources/Files.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileResource = void 0;
    var multipart_js_1 = require_multipart();
    var StripeResource_js_1 = require_StripeResource();
    var FileResource = class extends StripeResource_js_1.StripeResource {
      constructor() {
        super(...arguments);
        this.requestDataProcessor = multipart_js_1.multipartRequestDataProcessor;
      }
      /**
       * Returns a list of the files that your account has access to. Stripe sorts and returns the files by their creation dates, placing the most recently created files at the top.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/files", params, options, {
          methodType: "list"
        });
      }
      /**
       * To upload a file to Stripe, you need to send a request of type multipart/form-data. Include the file you want to upload in the request, and the parameters for creating a file.
       *
       * All of Stripe's officially supported Client libraries support sending multipart/form-data.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/files", params, options, {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          apiBase: "files"
        });
      }
      /**
       * Retrieves the details of an existing file object. After you supply a unique file ID, Stripe returns the corresponding file object. Learn how to [access file contents](https://docs.stripe.com/docs/file-upload#download-file-contents).
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/files/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.FileResource = FileResource;
  }
});

// node_modules/stripe/cjs/resources/FileLinks.js
var require_FileLinks = __commonJS({
  "node_modules/stripe/cjs/resources/FileLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileLinkResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var FileLinkResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of file links.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/file_links", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new file link object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/file_links", params, options);
      }
      /**
       * Retrieves the file link with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/file_links/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing file link object. Expired links can no longer be updated.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/file_links/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.FileLinkResource = FileLinkResource;
  }
});

// node_modules/stripe/cjs/resources/Invoices.js
var require_Invoices = __commonJS({
  "node_modules/stripe/cjs/resources/Invoices.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InvoiceResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var InvoiceResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Permanently deletes a one-off invoice draft. This cannot be undone. Attempts to delete invoices that are no longer in a draft state will fail; once an invoice has been finalized or if an invoice is for a subscription, it must be [voided](https://docs.stripe.com/api/invoices/void).
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/invoices/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the invoice with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/invoices/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Draft invoices are fully editable. Once an invoice is [finalized](https://docs.stripe.com/docs/billing/invoices/workflow#finalized),
       * monetary values, as well as collection_method, become uneditable.
       *
       * If you would like to stop the Stripe Billing engine from automatically finalizing, reattempting payments on,
       * sending reminders for, or [automatically reconciling](https://docs.stripe.com/docs/billing/invoices/reconciliation) invoices, pass
       * auto_advance=false.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * You can list all invoices, or list the invoices for a specific customer. The invoices are returned sorted by creation date, with the most recently created invoices appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/invoices", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    lines: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              pricing: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              quantity_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * This endpoint creates a draft invoice for a given customer. The invoice remains a draft until you [finalize the invoice, which allows you to [pay](/api/invoices/pay) or <a href="/api/invoices/send">send](https://docs.stripe.com/api/invoices/finalize) the invoice to your customers.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/invoices", params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Search for invoices you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
       * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
       * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
       * to an hour behind during outages. Search functionality is not available to merchants in India.
       */
      search(params, options) {
        return this._makeRequest("GET", "/v1/invoices/search", params, options, {
          methodType: "search",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    lines: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              pricing: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              quantity_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Adds multiple line items to an invoice. This is only possible when an invoice is still a draft.
       */
      addLines(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/add_lines`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    },
                    quantity_decimal: { kind: "decimal_string" }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Attaches a PaymentIntent or an Out of Band Payment to the invoice, adding it to the list of payments.
       *
       * For the PaymentIntent, when the PaymentIntent's status changes to succeeded, the payment is credited
       * to the invoice, increasing its amount_paid. When the invoice is fully paid, the
       * invoice's status becomes paid.
       *
       * If the PaymentIntent's status is already succeeded when it's attached, it's
       * credited to the invoice immediately.
       *
       * See: [Partial payments](https://docs.stripe.com/docs/invoicing/partial-payments) to learn more.
       */
      attachPayment(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/attach_payment`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Stripe automatically finalizes drafts before sending and attempting payment on invoices. However, if you'd like to finalize a draft invoice manually, you can do so using this method.
       */
      finalizeInvoice(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/finalize`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Marking an invoice as uncollectible is useful for keeping track of bad debts that can be written off for accounting purposes.
       */
      markUncollectible(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/mark_uncollectible`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Stripe automatically creates and then attempts to collect payment on invoices for customers on subscriptions according to your [subscriptions settings](https://dashboard.stripe.com/account/billing/automatic). However, if you'd like to attempt payment on an invoice out of the normal collection schedule or for some other reason, you can do so.
       */
      pay(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/pay`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Removes multiple line items from an invoice. This is only possible when an invoice is still a draft.
       */
      removeLines(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/remove_lines`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Stripe will automatically send invoices to customers according to your [subscriptions settings](https://dashboard.stripe.com/account/billing/automatic). However, if you'd like to manually send an invoice to your customer out of the normal schedule, you can do so. When sending invoices that have already been paid, there will be no reference to the payment in the email.
       *
       * Requests made in test-mode result in no emails being sent, despite sending an invoice.sent event.
       */
      sendInvoice(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/send`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates multiple line items on an invoice. This is only possible when an invoice is still a draft.
       */
      updateLines(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/update_lines`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    },
                    quantity_decimal: { kind: "decimal_string" }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Mark a finalized invoice as void. This cannot be undone. Voiding an invoice is similar to [deletion](https://docs.stripe.com/api/invoices/delete), however it only applies to finalized invoices and maintains a papertrail where the invoice can still be found.
       *
       * Consult with local regulations to determine whether and how an invoice might be amended, canceled, or voided in the jurisdiction you're doing business in. You might need to [issue another invoice or <a href="/api/credit_notes/create">credit note](https://docs.stripe.com/api/invoices/create) instead. Stripe recommends that you consult with your legal counsel for advice specific to your business.
       */
      voidInvoice(id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/void`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * At any time, you can preview the upcoming invoice for a subscription or subscription schedule. This will show you all the charges that are pending, including subscription renewal charges, invoice item charges, etc. It will also show you any discounts that are applicable to the invoice.
       *
       * You can also preview the effects of creating or updating a subscription or subscription schedule, including a preview of any prorations that will take place. To ensure that the actual proration is calculated exactly the same as the previewed proration, you should pass the subscription_details.proration_date parameter when doing the actual subscription update.
       *
       * The recommended way to get only the prorations being previewed on the invoice is to consider line items where parent.subscription_item_details.proration is true.
       *
       * Note that when you are viewing an upcoming invoice, you are simply viewing a preview – the invoice has not yet been created. As such, the upcoming invoice will not show up in invoice listing calls, and you cannot use the API to pay or edit the invoice. If you want to change the amount that your customer will be billed, you can add, remove, or update pending invoice items, or update the customer's discount.
       *
       * Note: Currency conversion calculations use the latest exchange rates. Exchange rates may vary between the time of the preview and the time of the actual invoice creation. [Learn more](https://docs.stripe.com/currencies/conversions)
       */
      createPreview(params, options) {
        return this._makeRequest("POST", "/v1/invoices/create_preview", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              invoice_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    },
                    quantity_decimal: { kind: "decimal_string" },
                    unit_amount_decimal: { kind: "decimal_string" }
                  }
                }
              },
              schedule_details: {
                kind: "object",
                fields: {
                  phases: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        add_invoice_items: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              price_data: {
                                kind: "object",
                                fields: {
                                  unit_amount_decimal: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        },
                        items: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              price_data: {
                                kind: "object",
                                fields: {
                                  unit_amount_decimal: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              subscription_details: {
                kind: "object",
                fields: {
                  items: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price_data: {
                          kind: "object",
                          fields: { unit_amount_decimal: { kind: "decimal_string" } }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              lines: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        pricing: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        quantity_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * When retrieving an invoice, you'll get a lines property containing the total count of line items and the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
       */
      listLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/invoices/${encodeURIComponent(id)}/lines`, params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates an invoice's line item. Some fields, such as tax_amounts, only live on the invoice line item,
       * so they can only be updated through this endpoint. Other fields, such as amount, live on both the invoice
       * item and the invoice line item, so updates on this endpoint will propagate to the invoice item as well.
       * Updating an invoice's line item is only possible before the invoice is finalized.
       */
      updateLineItem(invoiceId, id, params, options) {
        return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(invoiceId)}/lines/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              price_data: {
                kind: "object",
                fields: { unit_amount_decimal: { kind: "decimal_string" } }
              },
              quantity_decimal: { kind: "decimal_string" }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              pricing: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              quantity_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              }
            }
          }
        });
      }
    };
    exports2.InvoiceResource = InvoiceResource;
  }
});

// node_modules/stripe/cjs/resources/InvoiceItems.js
var require_InvoiceItems = __commonJS({
  "node_modules/stripe/cjs/resources/InvoiceItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InvoiceItemResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var InvoiceItemResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes an invoice item, removing it from an invoice. Deleting invoice items is only possible when they're not attached to invoices, or if it's attached to a draft invoice.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/invoiceitems/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the invoice item with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/invoiceitems/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              pricing: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              quantity_decimal: { kind: "decimal_string" }
            }
          }
        });
      }
      /**
       * Updates the amount or description of an invoice item on an upcoming invoice. Updating an invoice item is only possible before the invoice it's attached to is closed.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/invoiceitems/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              price_data: {
                kind: "object",
                fields: { unit_amount_decimal: { kind: "decimal_string" } }
              },
              quantity_decimal: { kind: "decimal_string" },
              unit_amount_decimal: { kind: "decimal_string" }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              pricing: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              quantity_decimal: { kind: "decimal_string" }
            }
          }
        });
      }
      /**
       * Returns a list of your invoice items. Invoice items are returned sorted by creation date, with the most recently created invoice items appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/invoiceitems", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: { kind: "decimal_string" }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Creates an item to be added to a draft invoice (up to 250 items per invoice). If no invoice is specified, the item will be on the next invoice created for the customer specified.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/invoiceitems", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              price_data: {
                kind: "object",
                fields: { unit_amount_decimal: { kind: "decimal_string" } }
              },
              quantity_decimal: { kind: "decimal_string" },
              unit_amount_decimal: { kind: "decimal_string" }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              pricing: {
                kind: "nullable",
                inner: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              quantity_decimal: { kind: "decimal_string" }
            }
          }
        });
      }
    };
    exports2.InvoiceItemResource = InvoiceItemResource;
  }
});

// node_modules/stripe/cjs/resources/InvoicePayments.js
var require_InvoicePayments = __commonJS({
  "node_modules/stripe/cjs/resources/InvoicePayments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InvoicePaymentResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var InvoicePaymentResource = class extends StripeResource_js_1.StripeResource {
      /**
       * When retrieving an invoice, there is an includable payments property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of payments.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/invoice_payments", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the invoice payment with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/invoice_payments/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.InvoicePaymentResource = InvoicePaymentResource;
  }
});

// node_modules/stripe/cjs/resources/InvoiceRenderingTemplates.js
var require_InvoiceRenderingTemplates = __commonJS({
  "node_modules/stripe/cjs/resources/InvoiceRenderingTemplates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InvoiceRenderingTemplateResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var InvoiceRenderingTemplateResource = class extends StripeResource_js_1.StripeResource {
      /**
       * List all templates, ordered by creation date, with the most recently created template appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/invoice_rendering_templates", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves an invoice rendering template with the given ID. It by default returns the latest version of the template. Optionally, specify a version to see previous versions.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/invoice_rendering_templates/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the status of an invoice rendering template to ‘archived' so no new Stripe objects (customers, invoices, etc.) can reference it. The template can also no longer be updated. However, if the template is already set on a Stripe object, it will continue to be applied on invoices generated by it.
       */
      archive(id, params, options) {
        return this._makeRequest("POST", `/v1/invoice_rendering_templates/${encodeURIComponent(id)}/archive`, params, options);
      }
      /**
       * Unarchive an invoice rendering template so it can be used on new Stripe objects again.
       */
      unarchive(id, params, options) {
        return this._makeRequest("POST", `/v1/invoice_rendering_templates/${encodeURIComponent(id)}/unarchive`, params, options);
      }
    };
    exports2.InvoiceRenderingTemplateResource = InvoiceRenderingTemplateResource;
  }
});

// node_modules/stripe/cjs/resources/Mandates.js
var require_Mandates = __commonJS({
  "node_modules/stripe/cjs/resources/Mandates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MandateResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var MandateResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves a Mandate object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/mandates/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.MandateResource = MandateResource;
  }
});

// node_modules/stripe/cjs/resources/OAuth.js
var require_OAuth = __commonJS({
  "node_modules/stripe/cjs/resources/OAuth.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OAuthResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var utils_js_1 = require_utils();
    var OAuthResource = class extends StripeResource_js_1.StripeResource {
      constructor() {
        super(...arguments);
        this.basePath = (0, utils_js_1.makeURLInterpolator)("/");
      }
      authorizeUrl(params, options) {
        params = params || {};
        options = options || {};
        let path = "oauth/authorize";
        if (options.express) {
          path = `express/${path}`;
        }
        if (!params.response_type) {
          params.response_type = "code";
        }
        if (!params.client_id) {
          params.client_id = this._stripe.getClientId();
        }
        if (!params.scope) {
          params.scope = "read_write";
        }
        const connectHost = this._stripe.resolveBaseAddress("connect");
        return `https://${connectHost}/${path}?${(0, utils_js_1.queryStringifyRequestData)(params)}`;
      }
      token(params, options) {
        return this._makeRequest("POST", "/oauth/token", params, options, {
          apiBase: "connect"
        });
      }
      deauthorize(params, options) {
        if (!params.client_id) {
          params.client_id = this._stripe.getClientId();
        }
        return this._makeRequest("POST", "/oauth/deauthorize", params, options, {
          apiBase: "connect"
        });
      }
    };
    exports2.OAuthResource = OAuthResource;
  }
});

// node_modules/stripe/cjs/resources/PaymentAttemptRecords.js
var require_PaymentAttemptRecords = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentAttemptRecords.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentAttemptRecordResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentAttemptRecordResource = class extends StripeResource_js_1.StripeResource {
      /**
       * List all the Payment Attempt Records attached to the specified Payment Record.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/payment_attempt_records", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves a Payment Attempt Record with the given ID
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_attempt_records/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.PaymentAttemptRecordResource = PaymentAttemptRecordResource;
  }
});

// node_modules/stripe/cjs/resources/PaymentIntents.js
var require_PaymentIntents = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentIntents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentIntentResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentIntentResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of PaymentIntents.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/payment_intents", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a PaymentIntent object.
       *
       * After the PaymentIntent is created, attach a payment method and [confirm](https://docs.stripe.com/docs/api/payment_intents/confirm)
       * to continue the payment. Learn more about <a href="/docs/payments/payment-intents">the available payment flows
       * with the Payment Intents API.
       *
       * When you use confirm=true during creation, it's equivalent to creating
       * and confirming the PaymentIntent in the same call. You can use any parameters
       * available in the [confirm API](https://docs.stripe.com/docs/api/payment_intents/confirm) when you supply
       * confirm=true.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/payment_intents", params, options);
      }
      /**
       * Retrieves the details of a PaymentIntent that has previously been created.
       *
       * You can retrieve a PaymentIntent client-side using a publishable key when the client_secret is in the query string.
       *
       * If you retrieve a PaymentIntent with a publishable key, it only returns a subset of properties. Refer to the [payment intent](https://docs.stripe.com/api#payment_intent_object) object reference for more details.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_intents/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates properties on a PaymentIntent object without confirming.
       *
       * Depending on which properties you update, you might need to confirm the
       * PaymentIntent again. For example, updating the payment_method
       * always requires you to confirm the PaymentIntent again. If you prefer to
       * update and confirm at the same time, we recommend updating properties through
       * the [confirm API](https://docs.stripe.com/docs/api/payment_intents/confirm) instead.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Search for PaymentIntents you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
       * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
       * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
       * to an hour behind during outages. Search functionality is not available to merchants in India.
       */
      search(params, options) {
        return this._makeRequest("GET", "/v1/payment_intents/search", params, options, {
          methodType: "search"
        });
      }
      /**
       * Manually reconcile the remaining amount for a customer_balance PaymentIntent.
       */
      applyCustomerBalance(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/apply_customer_balance`, params, options);
      }
      /**
       * You can cancel a PaymentIntent object when it's in one of these statuses: requires_payment_method, requires_capture, requires_confirmation, requires_action or, [in rare cases](https://docs.stripe.com/docs/payments/intents), processing.
       *
       * After it's canceled, no additional charges are made by the PaymentIntent and any operations on the PaymentIntent fail with an error. For PaymentIntents with a status of requires_capture, the remaining amount_capturable is automatically refunded.
       *
       * You can directly cancel the PaymentIntent for a Checkout Session only when the PaymentIntent has a status of requires_capture. Otherwise, you must [expire the Checkout Session](https://docs.stripe.com/docs/api/checkout/sessions/expire).
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/cancel`, params, options);
      }
      /**
       * Capture the funds of an existing uncaptured PaymentIntent when its status is requires_capture.
       *
       * Uncaptured PaymentIntents are cancelled a set number of days (7 by default) after their creation.
       *
       * Learn more about [separate authorization and capture](https://docs.stripe.com/docs/payments/capture-later).
       */
      capture(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/capture`, params, options);
      }
      /**
       * Confirm that your customer intends to pay with current or provided
       * payment method. Upon confirmation, the PaymentIntent will attempt to initiate
       * a payment.
       *
       * If the selected payment method requires additional authentication steps, the
       * PaymentIntent will transition to the requires_action status and
       * suggest additional actions via next_action. If payment fails,
       * the PaymentIntent transitions to the requires_payment_method status or the
       * canceled status if the confirmation limit is reached. If
       * payment succeeds, the PaymentIntent will transition to the succeeded
       * status (or requires_capture, if capture_method is set to manual).
       *
       * If the confirmation_method is automatic, payment may be attempted
       * using our [client SDKs](https://docs.stripe.com/docs/stripe-js/reference#stripe-handle-card-payment)
       * and the PaymentIntent's [client_secret](https://docs.stripe.com/api#payment_intent_object-client_secret).
       * After next_actions are handled by the client, no additional
       * confirmation is required to complete the payment.
       *
       * If the confirmation_method is manual, all payment attempts must be
       * initiated using a secret key.
       *
       * If any actions are required for the payment, the PaymentIntent will
       * return to the requires_confirmation state
       * after those actions are completed. Your server needs to then
       * explicitly re-confirm the PaymentIntent to initiate the next payment
       * attempt.
       *
       * There is a variable upper limit on how many times a PaymentIntent can be confirmed.
       * After this limit is reached, any further calls to this endpoint will
       * transition the PaymentIntent to the canceled state.
       */
      confirm(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/confirm`, params, options);
      }
      /**
       * Perform an incremental authorization on an eligible
       * [PaymentIntent](https://docs.stripe.com/docs/api/payment_intents/object). To be eligible, the
       * PaymentIntent's status must be requires_capture and
       * [incremental_authorization_supported](https://docs.stripe.com/docs/api/charges/object#charge_object-payment_method_details-card_present-incremental_authorization_supported)
       * must be true.
       *
       * Incremental authorizations attempt to increase the authorized amount on
       * your customer's card to the new, higher amount provided. Similar to the
       * initial authorization, incremental authorizations can be declined. A
       * single PaymentIntent can call this endpoint multiple times to further
       * increase the authorized amount.
       *
       * If the incremental authorization succeeds, the PaymentIntent object
       * returns with the updated
       * [amount](https://docs.stripe.com/docs/api/payment_intents/object#payment_intent_object-amount).
       * If the incremental authorization fails, a
       * [card_declined](https://docs.stripe.com/docs/error-codes#card-declined) error returns, and no other
       * fields on the PaymentIntent or Charge update. The PaymentIntent
       * object remains capturable for the previously authorized amount.
       *
       * Each PaymentIntent can have a maximum of 10 incremental authorization attempts, including declines.
       * After it's captured, a PaymentIntent can no longer be incremented.
       *
       * Learn more about incremental authorizations with
       * [in-person payments](https://docs.stripe.com/docs/terminal/features/incremental-authorizations) and
       * [online payments](https://docs.stripe.com/docs/payments/incremental-authorization?platform=web&ui=elements).
       */
      incrementAuthorization(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/increment_authorization`, params, options);
      }
      /**
       * Verifies microdeposits on a PaymentIntent object.
       */
      verifyMicrodeposits(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/verify_microdeposits`, params, options);
      }
      /**
       * Lists all LineItems of a given PaymentIntent.
       */
      listAmountDetailsLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_intents/${encodeURIComponent(id)}/amount_details_line_items`, params, options, {
          methodType: "list"
        });
      }
    };
    exports2.PaymentIntentResource = PaymentIntentResource;
  }
});

// node_modules/stripe/cjs/resources/PaymentLinks.js
var require_PaymentLinks = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentLinkResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentLinkResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of your payment links.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/payment_links", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    line_items: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              price: {
                                kind: "nullable",
                                inner: {
                                  kind: "object",
                                  fields: {
                                    currency_options: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          tiers: {
                                            kind: "array",
                                            element: {
                                              kind: "object",
                                              fields: {
                                                flat_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                },
                                                unit_amount_decimal: {
                                                  kind: "nullable",
                                                  inner: { kind: "decimal_string" }
                                                }
                                              }
                                            }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Creates a payment link.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/payment_links", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieve a payment link.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_links/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates a payment link.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_links/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        price: {
                          kind: "nullable",
                          inner: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * When retrieving a payment link, there is an includable line_items property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
       */
      listLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_links/${encodeURIComponent(id)}/line_items`, params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.PaymentLinkResource = PaymentLinkResource;
  }
});

// node_modules/stripe/cjs/resources/PaymentMethods.js
var require_PaymentMethods = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentMethods.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentMethodResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentMethodResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of all PaymentMethods.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/payment_methods", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a PaymentMethod object. Read the [Stripe.js reference](https://docs.stripe.com/docs/stripe-js/reference#stripe-create-payment-method) to learn how to create PaymentMethods via Stripe.js.
       *
       * Instead of creating a PaymentMethod directly, we recommend using the [PaymentIntents API to accept a payment immediately or the <a href="/docs/payments/save-and-reuse">SetupIntent](https://docs.stripe.com/docs/payments/accept-a-payment) API to collect payment method details ahead of a future payment.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/payment_methods", params, options);
      }
      /**
       * Retrieves a PaymentMethod object attached to the StripeAccount. To retrieve a payment method attached to a Customer, you should use [Retrieve a Customer's PaymentMethods](https://docs.stripe.com/docs/api/payment_methods/customer)
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_methods/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a PaymentMethod object. A PaymentMethod must be attached to a customer to be updated.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_methods/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Attaches a PaymentMethod object to a Customer.
       *
       * To attach a new PaymentMethod to a customer for future payments, we recommend you use a [SetupIntent](https://docs.stripe.com/docs/api/setup_intents)
       * or a PaymentIntent with [setup_future_usage](https://docs.stripe.com/docs/api/payment_intents/create#create_payment_intent-setup_future_usage).
       * These approaches will perform any necessary steps to set up the PaymentMethod for future payments. Using the /v1/payment_methods/:id/attach
       * endpoint without first using a SetupIntent or PaymentIntent with setup_future_usage does not optimize the PaymentMethod for
       * future use, which makes later declines and payment friction more likely.
       * See [Optimizing cards for future payments](https://docs.stripe.com/docs/payments/payment-intents#future-usage) for more information about setting up
       * future payments.
       *
       * To use this PaymentMethod as the default for invoice or subscription payments,
       * set [invoice_settings.default_payment_method](https://docs.stripe.com/docs/api/customers/update#update_customer-invoice_settings-default_payment_method),
       * on the Customer to the PaymentMethod's ID.
       */
      attach(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_methods/${encodeURIComponent(id)}/attach`, params, options);
      }
      /**
       * Detaches a PaymentMethod object from a Customer. After a PaymentMethod is detached, it can no longer be used for a payment or re-attached to a Customer.
       */
      detach(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_methods/${encodeURIComponent(id)}/detach`, params, options);
      }
    };
    exports2.PaymentMethodResource = PaymentMethodResource;
  }
});

// node_modules/stripe/cjs/resources/PaymentMethodConfigurations.js
var require_PaymentMethodConfigurations = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentMethodConfigurations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentMethodConfigurationResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentMethodConfigurationResource = class extends StripeResource_js_1.StripeResource {
      /**
       * List payment method configurations
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/payment_method_configurations", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a payment method configuration
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/payment_method_configurations", params, options);
      }
      /**
       * Retrieve payment method configuration
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_method_configurations/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Update payment method configuration
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_method_configurations/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.PaymentMethodConfigurationResource = PaymentMethodConfigurationResource;
  }
});

// node_modules/stripe/cjs/resources/PaymentMethodDomains.js
var require_PaymentMethodDomains = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentMethodDomains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentMethodDomainResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentMethodDomainResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Lists the details of existing payment method domains.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/payment_method_domains", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a payment method domain.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/payment_method_domains", params, options);
      }
      /**
       * Retrieves the details of an existing payment method domain.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_method_domains/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing payment method domain.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_method_domains/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Some payment methods might require additional steps to register a domain. If the requirements weren't satisfied when the domain was created, the payment method will be inactive on the domain.
       * The payment method doesn't appear in Elements or Embedded Checkout for this domain until it is active.
       *
       * To activate a payment method on an existing payment method domain, complete the required registration steps specific to the payment method, and then validate the payment method domain with this endpoint.
       *
       * Related guides: [Payment method domains](https://docs.stripe.com/docs/payments/payment-methods/pmd-registration).
       */
      validate(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_method_domains/${encodeURIComponent(id)}/validate`, params, options);
      }
    };
    exports2.PaymentMethodDomainResource = PaymentMethodDomainResource;
  }
});

// node_modules/stripe/cjs/resources/PaymentRecords.js
var require_PaymentRecords = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentRecords.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentRecordResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PaymentRecordResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves a Payment Record with the given ID
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payment_records/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Report a new payment attempt on the specified Payment Record. A new payment
       *  attempt can only be specified if all other payment attempts are canceled or failed.
       */
      reportPaymentAttempt(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt`, params, options);
      }
      /**
       * Report that the most recent payment attempt on the specified Payment Record
       *  was canceled.
       */
      reportPaymentAttemptCanceled(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_canceled`, params, options);
      }
      /**
       * Report that the most recent payment attempt on the specified Payment Record
       *  failed or errored.
       */
      reportPaymentAttemptFailed(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_failed`, params, options);
      }
      /**
       * Report that the most recent payment attempt on the specified Payment Record
       *  was guaranteed.
       */
      reportPaymentAttemptGuaranteed(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_guaranteed`, params, options);
      }
      /**
       * Report informational updates on the specified Payment Record.
       */
      reportPaymentAttemptInformational(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_informational`, params, options);
      }
      /**
       * Report that the most recent payment attempt on the specified Payment Record
       *  was refunded.
       */
      reportRefund(id, params, options) {
        return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_refund`, params, options);
      }
      /**
       * Report a new Payment Record. You may report a Payment Record as it is
       *  initialized and later report updates through the other report_* methods, or report Payment
       *  Records in a terminal state directly, through this method.
       */
      reportPayment(params, options) {
        return this._makeRequest("POST", "/v1/payment_records/report_payment", params, options);
      }
    };
    exports2.PaymentRecordResource = PaymentRecordResource;
  }
});

// node_modules/stripe/cjs/resources/Payouts.js
var require_Payouts = __commonJS({
  "node_modules/stripe/cjs/resources/Payouts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PayoutResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PayoutResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of existing payouts sent to third-party bank accounts or payouts that Stripe sent to you. The payouts return in sorted order, with the most recently created payouts appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/payouts", params, options, {
          methodType: "list"
        });
      }
      /**
       * To send funds to your own bank account, create a new payout object. Your [Stripe balance](https://docs.stripe.com/api#balance) must cover the payout amount. If it doesn't, you receive an “Insufficient Funds” error.
       *
       * If your API key is in test mode, money won't actually be sent, though every other action occurs as if you're in live mode.
       *
       * If you create a manual payout on a Stripe account that uses multiple payment source types, you need to specify the source type balance that the payout draws from. The [balance object](https://docs.stripe.com/api/balances/object) details available and pending amounts by source type.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/payouts", params, options);
      }
      /**
       * Retrieves the details of an existing payout. Supply the unique payout ID from either a payout creation request or the payout list. Stripe returns the corresponding payout information.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/payouts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified payout by setting the values of the parameters you pass. We don't change parameters that you don't provide. This request only accepts the metadata as arguments.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/payouts/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * You can cancel a previously created payout if its status is pending. Stripe refunds the funds to your available balance. You can't cancel automatic Stripe payouts.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/payouts/${encodeURIComponent(id)}/cancel`, params, options);
      }
      /**
       * Reverses a payout by debiting the destination bank account. At this time, you can only reverse payouts for connected accounts to US and Canadian bank accounts. If the payout is manual and in the pending status, use /v1/payouts/:id/cancel instead.
       *
       * By requesting a reversal through /v1/payouts/:id/reverse, you confirm that the authorized signatory of the selected bank account authorizes the debit on the bank account and that no other authorization is required.
       */
      reverse(id, params, options) {
        return this._makeRequest("POST", `/v1/payouts/${encodeURIComponent(id)}/reverse`, params, options);
      }
    };
    exports2.PayoutResource = PayoutResource;
  }
});

// node_modules/stripe/cjs/resources/Plans.js
var require_Plans = __commonJS({
  "node_modules/stripe/cjs/resources/Plans.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PlanResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PlanResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deleting plans means new subscribers can't be added. Existing subscribers aren't affected.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/plans/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the plan with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/plans/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              amount_decimal: { kind: "nullable", inner: { kind: "decimal_string" } },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates the specified plan by setting the values of the parameters passed. Any parameters not provided are left unchanged. By design, you cannot change a plan's ID, amount, currency, or billing cycle.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/plans/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              amount_decimal: { kind: "nullable", inner: { kind: "decimal_string" } },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Returns a list of your plans.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/plans", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * You can now model subscriptions more flexibly using the [Prices API](https://docs.stripe.com/api#prices). It replaces the Plans API and is backwards compatible to simplify your migration.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/plans", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              amount_decimal: { kind: "decimal_string" },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: { kind: "decimal_string" },
                    unit_amount_decimal: { kind: "decimal_string" }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              amount_decimal: { kind: "nullable", inner: { kind: "decimal_string" } },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.PlanResource = PlanResource;
  }
});

// node_modules/stripe/cjs/resources/Prices.js
var require_Prices = __commonJS({
  "node_modules/stripe/cjs/resources/Prices.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PriceResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PriceResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of your active prices, excluding [inline prices](https://docs.stripe.com/docs/products-prices/pricing-models#inline-pricing). For the list of inactive prices, set active to false.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/prices", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    currency_options: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Creates a new [Price for an existing <a href="https://docs.stripe.com/api/products">Product](https://docs.stripe.com/api/prices). The Price can be recurring or one-time.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/prices", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: { kind: "decimal_string" },
                          unit_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    },
                    unit_amount_decimal: { kind: "decimal_string" }
                  }
                }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: { kind: "decimal_string" },
                    unit_amount_decimal: { kind: "decimal_string" }
                  }
                }
              },
              unit_amount_decimal: { kind: "decimal_string" }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              unit_amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              }
            }
          }
        });
      }
      /**
       * Retrieves the price with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/prices/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              unit_amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              }
            }
          }
        });
      }
      /**
       * Updates the specified price by setting the values of the parameters passed. Any parameters not provided are left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/prices/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              unit_amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              }
            }
          }
        });
      }
      /**
       * Search for prices you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
       * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
       * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
       * to an hour behind during outages. Search functionality is not available to merchants in India.
       */
      search(params, options) {
        return this._makeRequest("GET", "/v1/prices/search", params, options, {
          methodType: "search",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    currency_options: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.PriceResource = PriceResource;
  }
});

// node_modules/stripe/cjs/resources/Products.js
var require_Products2 = __commonJS({
  "node_modules/stripe/cjs/resources/Products.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProductResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ProductResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Delete a product. Deleting a product is only possible if it has no prices associated with it. Additionally, deleting a product with type=good is only possible if it has no SKUs associated with it.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/products/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the details of an existing product. Supply the unique product ID from either a product creation request or the product list, and Stripe will return the corresponding product information.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/products/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specific product by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/products/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of your products. The products are returned sorted by creation date, with the most recently created products appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/products", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new product object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/products", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              default_price_data: {
                kind: "object",
                fields: {
                  currency_options: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: { kind: "decimal_string" },
                              unit_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        },
                        unit_amount_decimal: { kind: "decimal_string" }
                      }
                    }
                  },
                  unit_amount_decimal: { kind: "decimal_string" }
                }
              }
            }
          }
        });
      }
      /**
       * Search for products you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
       * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
       * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
       * to an hour behind during outages. Search functionality is not available to merchants in India.
       */
      search(params, options) {
        return this._makeRequest("GET", "/v1/products/search", params, options, {
          methodType: "search"
        });
      }
      /**
       * Deletes the feature attachment to a product
       */
      deleteFeature(productId, id, params, options) {
        return this._makeRequest("DELETE", `/v1/products/${encodeURIComponent(productId)}/features/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves a product_feature, which represents a feature attachment to a product
       */
      retrieveFeature(productId, id, params, options) {
        return this._makeRequest("GET", `/v1/products/${encodeURIComponent(productId)}/features/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieve a list of features for a product
       */
      listFeatures(id, params, options) {
        return this._makeRequest("GET", `/v1/products/${encodeURIComponent(id)}/features`, params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a product_feature, which represents a feature attachment to a product
       */
      createFeature(id, params, options) {
        return this._makeRequest("POST", `/v1/products/${encodeURIComponent(id)}/features`, params, options);
      }
    };
    exports2.ProductResource = ProductResource;
  }
});

// node_modules/stripe/cjs/resources/PromotionCodes.js
var require_PromotionCodes = __commonJS({
  "node_modules/stripe/cjs/resources/PromotionCodes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PromotionCodeResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var PromotionCodeResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of your promotion codes.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/promotion_codes", params, options, {
          methodType: "list"
        });
      }
      /**
       * A promotion code points to an underlying promotion. You can optionally restrict the code to a specific customer, redemption limit, and expiration date.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/promotion_codes", params, options);
      }
      /**
       * Retrieves the promotion code with the given ID. In order to retrieve a promotion code by the customer-facing code use [list](https://docs.stripe.com/docs/api/promotion_codes/list) with the desired code.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/promotion_codes/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified promotion code by setting the values of the parameters passed. Most fields are, by design, not editable.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/promotion_codes/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.PromotionCodeResource = PromotionCodeResource;
  }
});

// node_modules/stripe/cjs/resources/Quotes.js
var require_Quotes = __commonJS({
  "node_modules/stripe/cjs/resources/Quotes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.QuoteResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var QuoteResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of your quotes.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/quotes", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    computed: {
                      kind: "object",
                      fields: {
                        upfront: {
                          kind: "object",
                          fields: {
                            line_items: {
                              kind: "object",
                              fields: {
                                data: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      price: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            currency_options: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  tiers: {
                                                    kind: "array",
                                                    element: {
                                                      kind: "object",
                                                      fields: {
                                                        flat_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        },
                                                        unit_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * A quote models prices and services for a customer. Default options for header, description, footer, and expires_at can be set in the dashboard via the [quote template](https://dashboard.stripe.com/settings/billing/quote).
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/quotes", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              computed: {
                kind: "object",
                fields: {
                  upfront: {
                    kind: "object",
                    fields: {
                      line_items: {
                        kind: "object",
                        fields: {
                          data: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                price: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: { kind: "decimal_string" }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves the quote with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              computed: {
                kind: "object",
                fields: {
                  upfront: {
                    kind: "object",
                    fields: {
                      line_items: {
                        kind: "object",
                        fields: {
                          data: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                price: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * A quote models prices and services for a customer.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              line_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              computed: {
                kind: "object",
                fields: {
                  upfront: {
                    kind: "object",
                    fields: {
                      line_items: {
                        kind: "object",
                        fields: {
                          data: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                price: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Accepts the specified quote.
       */
      accept(id, params, options) {
        return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}/accept`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              computed: {
                kind: "object",
                fields: {
                  upfront: {
                    kind: "object",
                    fields: {
                      line_items: {
                        kind: "object",
                        fields: {
                          data: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                price: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Cancels the quote.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}/cancel`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              computed: {
                kind: "object",
                fields: {
                  upfront: {
                    kind: "object",
                    fields: {
                      line_items: {
                        kind: "object",
                        fields: {
                          data: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                price: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Finalizes the quote.
       */
      finalizeQuote(id, params, options) {
        return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}/finalize`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              computed: {
                kind: "object",
                fields: {
                  upfront: {
                    kind: "object",
                    fields: {
                      line_items: {
                        kind: "object",
                        fields: {
                          data: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                price: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      currency_options: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            tiers: {
                                              kind: "array",
                                              element: {
                                                kind: "object",
                                                fields: {
                                                  flat_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  unit_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Download the PDF for a finalized quote. Explanation for special handling can be found [here](https://docs.stripe.com/quotes/overview#quote_pdf)
       */
      pdf(id, params, options) {
        return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}/pdf`, params, options, {
          apiBase: "files",
          streaming: true
        });
      }
      /**
       * When retrieving a quote, there is an includable [computed.upfront.line_items](https://stripe.com/docs/api/quotes/object#quote_object-computed-upfront-line_items) property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of upfront line items.
       */
      listComputedUpfrontLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}/computed_upfront_line_items`, params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * When retrieving a quote, there is an includable line_items property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
       */
      listLineItems(id, params, options) {
        return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}/line_items`, params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.QuoteResource = QuoteResource;
  }
});

// node_modules/stripe/cjs/resources/Refunds.js
var require_Refunds2 = __commonJS({
  "node_modules/stripe/cjs/resources/Refunds.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RefundResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var RefundResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of all refunds you created. We return the refunds in sorted order, with the most recent refunds appearing first. The 10 most recent refunds are always available by default on the Charge object.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/refunds", params, options, {
          methodType: "list"
        });
      }
      /**
       * When you create a new refund, you must specify a Charge or a PaymentIntent object on which to create it.
       *
       * Creating a new refund will refund a charge that has previously been created but not yet refunded.
       * Funds will be refunded to the credit or debit card that was originally charged.
       *
       * You can optionally refund only part of a charge.
       * You can do so multiple times, until the entire charge has been refunded.
       *
       * Once entirely refunded, a charge can't be refunded again.
       * This method will raise an error when called on an already-refunded charge,
       * or when trying to refund more money than is left on a charge.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/refunds", params, options);
      }
      /**
       * Retrieves the details of an existing refund.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/refunds/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the refund that you specify by setting the values of the passed parameters. Any parameters that you don't provide remain unchanged.
       *
       * This request only accepts metadata as an argument.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/refunds/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Cancels a refund with a status of requires_action.
       *
       * You can't cancel refunds in other states. Only refunds for payment methods that require customer action can enter the requires_action state.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/refunds/${encodeURIComponent(id)}/cancel`, params, options);
      }
    };
    exports2.RefundResource = RefundResource;
  }
});

// node_modules/stripe/cjs/resources/Reviews.js
var require_Reviews = __commonJS({
  "node_modules/stripe/cjs/resources/Reviews.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReviewResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ReviewResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of Review objects that have open set to true. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/reviews", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves a Review object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/reviews/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Approves a Review object, closing it and removing it from the list of reviews.
       */
      approve(id, params, options) {
        return this._makeRequest("POST", `/v1/reviews/${encodeURIComponent(id)}/approve`, params, options);
      }
    };
    exports2.ReviewResource = ReviewResource;
  }
});

// node_modules/stripe/cjs/resources/SetupAttempts.js
var require_SetupAttempts = __commonJS({
  "node_modules/stripe/cjs/resources/SetupAttempts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SetupAttemptResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SetupAttemptResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of SetupAttempts that associate with a provided SetupIntent.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/setup_attempts", params, options, {
          methodType: "list"
        });
      }
    };
    exports2.SetupAttemptResource = SetupAttemptResource;
  }
});

// node_modules/stripe/cjs/resources/SetupIntents.js
var require_SetupIntents = __commonJS({
  "node_modules/stripe/cjs/resources/SetupIntents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SetupIntentResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SetupIntentResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of SetupIntents.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/setup_intents", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a SetupIntent object.
       *
       * After you create the SetupIntent, attach a payment method and [confirm](https://docs.stripe.com/docs/api/setup_intents/confirm)
       * it to collect any required permissions to charge the payment method later.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/setup_intents", params, options);
      }
      /**
       * Retrieves the details of a SetupIntent that has previously been created.
       *
       * Client-side retrieval using a publishable key is allowed when the client_secret is provided in the query string.
       *
       * When retrieved with a publishable key, only a subset of properties will be returned. Please refer to the [SetupIntent](https://docs.stripe.com/api#setup_intent_object) object reference for more details.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/setup_intents/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates a SetupIntent object.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * You can cancel a SetupIntent object when it's in one of these statuses: requires_payment_method, requires_confirmation, or requires_action.
       *
       * After you cancel it, setup is abandoned and any operations on the SetupIntent fail with an error. You can't cancel the SetupIntent for a Checkout Session. [Expire the Checkout Session](https://docs.stripe.com/docs/api/checkout/sessions/expire) instead.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}/cancel`, params, options);
      }
      /**
       * Confirm that your customer intends to set up the current or
       * provided payment method. For example, you would confirm a SetupIntent
       * when a customer hits the “Save” button on a payment method management
       * page on your website.
       *
       * If the selected payment method does not require any additional
       * steps from the customer, the SetupIntent will transition to the
       * succeeded status.
       *
       * Otherwise, it will transition to the requires_action status and
       * suggest additional actions via next_action. If setup fails,
       * the SetupIntent will transition to the
       * requires_payment_method status or the canceled status if the
       * confirmation limit is reached.
       */
      confirm(id, params, options) {
        return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}/confirm`, params, options);
      }
      /**
       * Verifies microdeposits on a SetupIntent object.
       */
      verifyMicrodeposits(id, params, options) {
        return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}/verify_microdeposits`, params, options);
      }
    };
    exports2.SetupIntentResource = SetupIntentResource;
  }
});

// node_modules/stripe/cjs/resources/ShippingRates.js
var require_ShippingRates = __commonJS({
  "node_modules/stripe/cjs/resources/ShippingRates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ShippingRateResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var ShippingRateResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of your shipping rates.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/shipping_rates", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new shipping rate object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/shipping_rates", params, options);
      }
      /**
       * Returns the shipping rate object with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/shipping_rates/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing shipping rate object.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/shipping_rates/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.ShippingRateResource = ShippingRateResource;
  }
});

// node_modules/stripe/cjs/resources/Sources.js
var require_Sources = __commonJS({
  "node_modules/stripe/cjs/resources/Sources.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SourceResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SourceResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves an existing source object. Supply the unique source ID from a source creation request and Stripe will return the corresponding up-to-date source object information.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/sources/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified source by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       *
       * This request accepts the metadata and owner as arguments. It is also possible to update type specific information for selected payment methods. Please refer to our [payment method guides](https://docs.stripe.com/docs/sources) for more detail.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/sources/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Creates a new source object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/sources", params, options);
      }
      /**
       * Verify a given source.
       */
      verify(id, params, options) {
        return this._makeRequest("POST", `/v1/sources/${encodeURIComponent(id)}/verify`, params, options);
      }
      /**
       * List source transactions for a given source.
       */
      listSourceTransactions(id, params, options) {
        return this._makeRequest("GET", `/v1/sources/${encodeURIComponent(id)}/source_transactions`, params, options, {
          methodType: "list"
        });
      }
    };
    exports2.SourceResource = SourceResource;
  }
});

// node_modules/stripe/cjs/resources/Subscriptions.js
var require_Subscriptions = __commonJS({
  "node_modules/stripe/cjs/resources/Subscriptions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubscriptionResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SubscriptionResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Cancels a customer's subscription immediately. The customer won't be charged again for the subscription. After it's canceled, the subscription is largely immutable. You can still update its [metadata](https://docs.stripe.com/metadata) and cancellation_details.
       *
       * Any pending invoice items that you've created are still charged at the end of the period, unless manually [deleted](https://docs.stripe.com/api/invoiceitems/delete). If you've set the subscription to cancel at the end of the period, any pending prorations are also left in place and collected at the end of the period. But if the subscription is set to cancel immediately, pending prorations are removed if invoice_now and prorate are both set to false.
       *
       * By default, upon subscription cancellation, Stripe stops automatic collection of all finalized invoices for the customer. This is intended to prevent unexpected payment attempts after the customer has canceled a subscription. However, you can resume automatic collection of the invoices manually after subscription cancellation to have us proceed. Or, you could check for unpaid invoices before allowing the customer to cancel the subscription at all.
       */
      cancel(id, params, options) {
        return this._makeRequest("DELETE", `/v1/subscriptions/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        plan: {
                          kind: "object",
                          fields: {
                            amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        },
                        price: {
                          kind: "object",
                          fields: {
                            currency_options: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves the subscription with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/subscriptions/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        plan: {
                          kind: "object",
                          fields: {
                            amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        },
                        price: {
                          kind: "object",
                          fields: {
                            currency_options: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates an existing subscription to match the specified parameters.
       * When changing prices or quantities, we optionally prorate the price we charge next month to make up for any price changes.
       * To preview how the proration is calculated, use the [create preview](https://docs.stripe.com/docs/api/invoices/create_preview) endpoint.
       *
       * By default, we prorate subscription changes. For example, if a customer signs up on May 1 for a 100 price, they'll be billed 100 immediately. If on May 15 they switch to a 200 price, then on June 1 they'll be billed 250 (200 for a renewal of her subscription, plus a 50 prorating adjustment for half of the previous month's 100 difference). Similarly, a downgrade generates a credit that is applied to the next invoice. We also prorate when you make quantity changes.
       *
       * Switching prices does not normally change the billing date or generate an immediate charge unless:
       *
       *
       * The billing interval is changed (for example, from monthly to yearly).
       * The subscription moves from free to paid.
       * A trial starts or ends.
       *
       *
       * In these cases, we apply a credit for the unused time on the previous price, immediately charge the customer using the new price, and reset the billing date. Learn about how [Stripe immediately attempts payment for subscription changes](https://docs.stripe.com/docs/billing/subscriptions/upgrade-downgrade#immediate-payment).
       *
       * If you want to charge for an upgrade immediately, pass proration_behavior as always_invoice to create prorations, automatically invoice the customer for those proration adjustments, and attempt to collect payment. If you pass create_prorations, the prorations are created but not automatically invoiced. If you want to bill the customer for the prorations before the subscription's renewal date, you need to manually [invoice the customer](https://docs.stripe.com/docs/api/invoices/create).
       *
       * If you don't want to prorate, set the proration_behavior option to none. With this option, the customer is billed 100 on May 1 and 200 on June 1. Similarly, if you set proration_behavior to none when switching between different billing intervals (for example, from monthly to yearly), we don't generate any credits for the old subscription's unused time. We still reset the billing date and bill immediately for the new subscription.
       *
       * Updating the quantity on a subscription many times in an hour may result in [rate limiting. If you need to bill for a frequently changing quantity, consider integrating <a href="/docs/billing/subscriptions/usage-based">usage-based billing](https://docs.stripe.com/docs/rate-limits) instead.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/subscriptions/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              add_invoice_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              },
              items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        plan: {
                          kind: "object",
                          fields: {
                            amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        },
                        price: {
                          kind: "object",
                          fields: {
                            currency_options: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Removes the currently applied discount on a subscription.
       */
      deleteDiscount(id, params, options) {
        return this._makeRequest("DELETE", `/v1/subscriptions/${encodeURIComponent(id)}/discount`, params, options);
      }
      /**
       * By default, returns a list of subscriptions that have not been canceled. In order to list canceled subscriptions, specify status=canceled.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/subscriptions", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    items: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              plan: {
                                kind: "object",
                                fields: {
                                  amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              price: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Creates a new subscription on an existing customer. Each customer can have up to 500 active or scheduled subscriptions.
       *
       * When you create a subscription with collection_method=charge_automatically, the first invoice is finalized as part of the request.
       * The payment_behavior parameter determines the exact behavior of the initial payment.
       *
       * To start subscriptions where the first invoice always begins in a draft status, use [subscription schedules](https://docs.stripe.com/docs/billing/subscriptions/subscription-schedules#managing) instead.
       * Schedules provide the flexibility to model more complex billing configurations that change over time.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/subscriptions", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              add_invoice_items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              },
              items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        plan: {
                          kind: "object",
                          fields: {
                            amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        },
                        price: {
                          kind: "object",
                          fields: {
                            currency_options: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Search for subscriptions you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
       * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
       * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
       * to an hour behind during outages. Search functionality is not available to merchants in India.
       */
      search(params, options) {
        return this._makeRequest("GET", "/v1/subscriptions/search", params, options, {
          methodType: "search",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    items: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              plan: {
                                kind: "object",
                                fields: {
                                  amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              price: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Upgrade the billing_mode of an existing subscription.
       */
      migrate(id, params, options) {
        return this._makeRequest("POST", `/v1/subscriptions/${encodeURIComponent(id)}/migrate`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        plan: {
                          kind: "object",
                          fields: {
                            amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        },
                        price: {
                          kind: "object",
                          fields: {
                            currency_options: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Initiates resumption of a paused subscription, optionally resetting the billing cycle anchor and creating prorations. Resume is only available for subscriptions that use charge_automatically collection. If Stripe doesn't generate a resumption invoice, the subscription becomes active immediately. When a resumption invoice is generated, Stripe finalizes it immediately. If the invoice is paid or marked uncollectible, the subscription becomes active. If the invoice is manually voided, the subscription stays paused. If there is no payment attempt within 23 hours, Stripe voids the invoice and the subscription stays paused. Learn more about [resuming subscriptions](https://docs.stripe.com/docs/billing/subscriptions/pause#resume-subscriptions).
       */
      resume(id, params, options) {
        return this._makeRequest("POST", `/v1/subscriptions/${encodeURIComponent(id)}/resume`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              items: {
                kind: "object",
                fields: {
                  data: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        plan: {
                          kind: "object",
                          fields: {
                            amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        },
                        price: {
                          kind: "object",
                          fields: {
                            currency_options: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.SubscriptionResource = SubscriptionResource;
  }
});

// node_modules/stripe/cjs/resources/SubscriptionItems.js
var require_SubscriptionItems = __commonJS({
  "node_modules/stripe/cjs/resources/SubscriptionItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubscriptionItemResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SubscriptionItemResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes an item from the subscription. Removing a subscription item from a subscription will not cancel the subscription.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/subscription_items/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the subscription item with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/subscription_items/${encodeURIComponent(id)}`, params, options, {
          responseSchema: {
            kind: "object",
            fields: {
              plan: {
                kind: "object",
                fields: {
                  amount_decimal: {
                    kind: "nullable",
                    inner: { kind: "decimal_string" }
                  },
                  tiers: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        flat_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              price: {
                kind: "object",
                fields: {
                  currency_options: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  },
                  tiers: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        flat_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  },
                  unit_amount_decimal: {
                    kind: "nullable",
                    inner: { kind: "decimal_string" }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Updates the plan or quantity of an item on a current subscription.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/subscription_items/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              price_data: {
                kind: "object",
                fields: { unit_amount_decimal: { kind: "decimal_string" } }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              plan: {
                kind: "object",
                fields: {
                  amount_decimal: {
                    kind: "nullable",
                    inner: { kind: "decimal_string" }
                  },
                  tiers: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        flat_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              price: {
                kind: "object",
                fields: {
                  currency_options: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  },
                  tiers: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        flat_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  },
                  unit_amount_decimal: {
                    kind: "nullable",
                    inner: { kind: "decimal_string" }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Returns a list of your subscription items for a given subscription.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/subscription_items", params, options, {
          methodType: "list",
          responseSchema: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    plan: {
                      kind: "object",
                      fields: {
                        amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    },
                    price: {
                      kind: "object",
                      fields: {
                        currency_options: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Adds a new item to an existing subscription. No existing items will be changed or replaced.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/subscription_items", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              price_data: {
                kind: "object",
                fields: { unit_amount_decimal: { kind: "decimal_string" } }
              }
            }
          },
          responseSchema: {
            kind: "object",
            fields: {
              plan: {
                kind: "object",
                fields: {
                  amount_decimal: {
                    kind: "nullable",
                    inner: { kind: "decimal_string" }
                  },
                  tiers: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        flat_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              price: {
                kind: "object",
                fields: {
                  currency_options: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  },
                  tiers: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: {
                        flat_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  },
                  unit_amount_decimal: {
                    kind: "nullable",
                    inner: { kind: "decimal_string" }
                  }
                }
              }
            }
          }
        });
      }
    };
    exports2.SubscriptionItemResource = SubscriptionItemResource;
  }
});

// node_modules/stripe/cjs/resources/SubscriptionSchedules.js
var require_SubscriptionSchedules = __commonJS({
  "node_modules/stripe/cjs/resources/SubscriptionSchedules.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubscriptionScheduleResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var SubscriptionScheduleResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves the list of your subscription schedules.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/subscription_schedules", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new subscription schedule object. Each customer can have up to 500 active or scheduled subscriptions.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/subscription_schedules", params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              phases: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    add_invoice_items: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price_data: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    },
                    items: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price_data: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Retrieves the details of an existing subscription schedule. You only need to supply the unique subscription schedule identifier that was returned upon subscription schedule creation.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/subscription_schedules/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing subscription schedule.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/subscription_schedules/${encodeURIComponent(id)}`, params, options, {
          requestSchema: {
            kind: "object",
            fields: {
              phases: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    add_invoice_items: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price_data: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    },
                    items: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price_data: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      /**
       * Cancels a subscription schedule and its associated subscription immediately (if the subscription schedule has an active subscription). A subscription schedule can only be canceled if its status is not_started or active.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/subscription_schedules/${encodeURIComponent(id)}/cancel`, params, options);
      }
      /**
       * Releases the subscription schedule immediately, which will stop scheduling of its phases, but leave any existing subscription in place. A schedule can only be released if its status is not_started or active. If the subscription schedule is currently associated with a subscription, releasing it will remove its subscription property and set the subscription's ID to the released_subscription property.
       */
      release(id, params, options) {
        return this._makeRequest("POST", `/v1/subscription_schedules/${encodeURIComponent(id)}/release`, params, options);
      }
    };
    exports2.SubscriptionScheduleResource = SubscriptionScheduleResource;
  }
});

// node_modules/stripe/cjs/resources/TaxCodes.js
var require_TaxCodes = __commonJS({
  "node_modules/stripe/cjs/resources/TaxCodes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TaxCodeResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TaxCodeResource = class extends StripeResource_js_1.StripeResource {
      /**
       * A list of [all tax codes available](https://stripe.com/docs/tax/tax-categories) to add to Products in order to allow specific tax calculations.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/tax_codes", params, options, {
          methodType: "list"
        });
      }
      /**
       * Retrieves the details of an existing tax code. Supply the unique tax code ID and Stripe will return the corresponding tax code information.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/tax_codes/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.TaxCodeResource = TaxCodeResource;
  }
});

// node_modules/stripe/cjs/resources/TaxIds.js
var require_TaxIds = __commonJS({
  "node_modules/stripe/cjs/resources/TaxIds.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TaxIdResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TaxIdResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Deletes an existing account or customer tax_id object.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/tax_ids/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves an account or customer tax_id object.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/tax_ids/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of tax IDs.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/tax_ids", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new account or customer tax_id object.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/tax_ids", params, options);
      }
    };
    exports2.TaxIdResource = TaxIdResource;
  }
});

// node_modules/stripe/cjs/resources/TaxRates.js
var require_TaxRates = __commonJS({
  "node_modules/stripe/cjs/resources/TaxRates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TaxRateResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TaxRateResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of your tax rates. Tax rates are returned sorted by creation date, with the most recently created tax rates appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/tax_rates", params, options, {
          methodType: "list"
        });
      }
      /**
       * Creates a new tax rate.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/tax_rates", params, options);
      }
      /**
       * Retrieves a tax rate with the given ID
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/tax_rates/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates an existing tax rate.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/tax_rates/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.TaxRateResource = TaxRateResource;
  }
});

// node_modules/stripe/cjs/resources/Tokens.js
var require_Tokens2 = __commonJS({
  "node_modules/stripe/cjs/resources/Tokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TokenResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TokenResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Retrieves the token with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/tokens/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Creates a single-use token that represents a bank account's details.
       * You can use this token with any v1 API method in place of a bank account dictionary. You can only use this token once. To do so, attach it to a [connected account](https://docs.stripe.com/api#accounts) where [controller.requirement_collection](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection) is application, which includes Custom accounts.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/tokens", params, options);
      }
    };
    exports2.TokenResource = TokenResource;
  }
});

// node_modules/stripe/cjs/resources/Topups.js
var require_Topups = __commonJS({
  "node_modules/stripe/cjs/resources/Topups.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TopupResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TopupResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of top-ups.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/topups", params, options, {
          methodType: "list"
        });
      }
      /**
       * Top up the balance of an account
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/topups", params, options);
      }
      /**
       * Retrieves the details of a top-up that has previously been created. Supply the unique top-up ID that was returned from your previous request, and Stripe will return the corresponding top-up information.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/topups/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the metadata of a top-up. Other top-up details are not editable by design.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/topups/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Cancels a top-up. Only pending top-ups can be canceled.
       */
      cancel(id, params, options) {
        return this._makeRequest("POST", `/v1/topups/${encodeURIComponent(id)}/cancel`, params, options);
      }
    };
    exports2.TopupResource = TopupResource;
  }
});

// node_modules/stripe/cjs/resources/Transfers.js
var require_Transfers = __commonJS({
  "node_modules/stripe/cjs/resources/Transfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransferResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var TransferResource = class extends StripeResource_js_1.StripeResource {
      /**
       * Returns a list of existing transfers sent to connected accounts. The transfers are returned in sorted order, with the most recently created transfers appearing first.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/transfers", params, options, {
          methodType: "list"
        });
      }
      /**
       * To send funds from your Stripe account to a connected account, you create a new transfer object. Your [Stripe balance](https://docs.stripe.com/api#balance) must be able to cover the transfer amount, or you'll receive an “Insufficient Funds” error.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/transfers", params, options);
      }
      /**
       * Retrieves the details of an existing transfer. Supply the unique transfer ID from either a transfer creation request or the transfer list, and Stripe will return the corresponding transfer information.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/transfers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified transfer by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       *
       * This request accepts only metadata as an argument.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/transfers/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * You can see a list of the reversals belonging to a specific transfer. Note that the 10 most recent reversals are always available by default on the transfer object. If you need more than those 10, you can use this API method and the limit and starting_after parameters to page through additional reversals.
       */
      listReversals(id, params, options) {
        return this._makeRequest("GET", `/v1/transfers/${encodeURIComponent(id)}/reversals`, params, options, {
          methodType: "list"
        });
      }
      /**
       * When you create a new reversal, you must specify a transfer to create it on.
       *
       * When reversing transfers, you can optionally reverse part of the transfer. You can do so as many times as you wish until the entire transfer has been reversed.
       *
       * Once entirely reversed, a transfer can't be reversed again. This method will return an error when called on an already-reversed transfer, or when trying to reverse more money than is left on a transfer.
       */
      createReversal(id, params, options) {
        return this._makeRequest("POST", `/v1/transfers/${encodeURIComponent(id)}/reversals`, params, options);
      }
      /**
       * By default, you can see the 10 most recent reversals stored directly on the transfer object, but you can also retrieve details about a specific reversal stored on the transfer.
       */
      retrieveReversal(transferId, id, params, options) {
        return this._makeRequest("GET", `/v1/transfers/${encodeURIComponent(transferId)}/reversals/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the specified reversal by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
       *
       * This request only accepts metadata and description as arguments.
       */
      updateReversal(transferId, id, params, options) {
        return this._makeRequest("POST", `/v1/transfers/${encodeURIComponent(transferId)}/reversals/${encodeURIComponent(id)}`, params, options);
      }
    };
    exports2.TransferResource = TransferResource;
  }
});

// node_modules/stripe/cjs/resources/WebhookEndpoints.js
var require_WebhookEndpoints = __commonJS({
  "node_modules/stripe/cjs/resources/WebhookEndpoints.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WebhookEndpointResource = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var WebhookEndpointResource = class extends StripeResource_js_1.StripeResource {
      /**
       * You can also delete webhook endpoints via the [webhook endpoint management](https://dashboard.stripe.com/account/webhooks) page of the Stripe dashboard.
       */
      del(id, params, options) {
        return this._makeRequest("DELETE", `/v1/webhook_endpoints/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Retrieves the webhook endpoint with the given ID.
       */
      retrieve(id, params, options) {
        return this._makeRequest("GET", `/v1/webhook_endpoints/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Updates the webhook endpoint. You may edit the url, the list of enabled_events, and the status of your endpoint.
       */
      update(id, params, options) {
        return this._makeRequest("POST", `/v1/webhook_endpoints/${encodeURIComponent(id)}`, params, options);
      }
      /**
       * Returns a list of your webhook endpoints.
       */
      list(params, options) {
        return this._makeRequest("GET", "/v1/webhook_endpoints", params, options, {
          methodType: "list"
        });
      }
      /**
       * A webhook endpoint must have a url and a list of enabled_events. You may optionally specify the Boolean connect parameter. If set to true, then a Connect webhook endpoint that notifies the specified url about events from all connected accounts is created; otherwise an account webhook endpoint that notifies the specified url only about events from your account is created. You can also create webhook endpoints in the [webhooks settings](https://dashboard.stripe.com/account/webhooks) section of the Dashboard.
       */
      create(params, options) {
        return this._makeRequest("POST", "/v1/webhook_endpoints", params, options);
      }
    };
    exports2.WebhookEndpointResource = WebhookEndpointResource;
  }
});

// node_modules/stripe/cjs/resources.js
var require_resources = __commonJS({
  "node_modules/stripe/cjs/resources.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubscriptionItems = exports2.Subscriptions = exports2.Sources = exports2.ShippingRates = exports2.SetupIntents = exports2.SetupAttempts = exports2.Reviews = exports2.Refunds = exports2.Quotes = exports2.PromotionCodes = exports2.Products = exports2.Prices = exports2.Plans = exports2.Payouts = exports2.PaymentRecords = exports2.PaymentMethodDomains = exports2.PaymentMethodConfigurations = exports2.PaymentMethods = exports2.PaymentLinks = exports2.PaymentIntents = exports2.PaymentAttemptRecords = exports2.OAuthResource = exports2.Mandates = exports2.InvoiceRenderingTemplates = exports2.InvoicePayments = exports2.InvoiceItems = exports2.Invoices = exports2.FileLinks = exports2.Files = exports2.ExchangeRates = exports2.Events = exports2.EphemeralKeys = exports2.Disputes = exports2.CustomerSessions = exports2.Customers = exports2.CreditNotes = exports2.Coupons = exports2.CountrySpecs = exports2.ConfirmationTokens = exports2.Charges = exports2.BalanceTransactions = exports2.BalanceSettings = exports2.Balances = exports2.Balance = exports2.ApplicationFees = exports2.ApplePayDomains = exports2.AccountSessions = exports2.AccountLinks = exports2.Accounts = exports2.Account = void 0;
    exports2.V2 = exports2.Treasury = exports2.TestHelpers = exports2.Terminal = exports2.Tax = exports2.Sigma = exports2.Reporting = exports2.Radar = exports2.Issuing = exports2.Identity = exports2.Forwarding = exports2.FinancialConnections = exports2.Entitlements = exports2.Climate = exports2.Checkout = exports2.BillingPortal = exports2.Billing = exports2.Apps = exports2.WebhookEndpoints = exports2.Transfers = exports2.Topups = exports2.Tokens = exports2.TaxRates = exports2.TaxIds = exports2.TaxCodes = exports2.SubscriptionSchedules = void 0;
    var ResourceNamespace_js_1 = require_ResourceNamespace();
    var AccountLinks_js_1 = require_AccountLinks();
    var AccountTokens_js_1 = require_AccountTokens();
    var Accounts_js_1 = require_Accounts();
    var Accounts_js_2 = require_Accounts2();
    var ActiveEntitlements_js_1 = require_ActiveEntitlements();
    var Alerts_js_1 = require_Alerts();
    var Associations_js_1 = require_Associations();
    var Authorizations_js_1 = require_Authorizations();
    var Authorizations_js_2 = require_Authorizations2();
    var Calculations_js_1 = require_Calculations();
    var Cardholders_js_1 = require_Cardholders();
    var Cards_js_1 = require_Cards();
    var Cards_js_2 = require_Cards2();
    var Configurations_js_1 = require_Configurations();
    var Configurations_js_2 = require_Configurations2();
    var ConfirmationTokens_js_1 = require_ConfirmationTokens();
    var ConnectionTokens_js_1 = require_ConnectionTokens();
    var CreditBalanceSummary_js_1 = require_CreditBalanceSummary();
    var CreditBalanceTransactions_js_1 = require_CreditBalanceTransactions();
    var CreditGrants_js_1 = require_CreditGrants();
    var CreditReversals_js_1 = require_CreditReversals();
    var Customers_js_1 = require_Customers();
    var DebitReversals_js_1 = require_DebitReversals();
    var Disputes_js_1 = require_Disputes();
    var EarlyFraudWarnings_js_1 = require_EarlyFraudWarnings();
    var EventDestinations_js_1 = require_EventDestinations();
    var Events_js_1 = require_Events();
    var Features_js_1 = require_Features();
    var FinancialAccounts_js_1 = require_FinancialAccounts();
    var Imports_js_1 = require_Imports();
    var InboundTransfers_js_1 = require_InboundTransfers();
    var InboundTransfers_js_2 = require_InboundTransfers2();
    var Locations_js_1 = require_Locations();
    var MeterEventAdjustments_js_1 = require_MeterEventAdjustments();
    var MeterEventAdjustments_js_2 = require_MeterEventAdjustments2();
    var MeterEventSession_js_1 = require_MeterEventSession();
    var MeterEventStream_js_1 = require_MeterEventStream();
    var MeterEvents_js_1 = require_MeterEvents();
    var MeterEvents_js_2 = require_MeterEvents2();
    var Meters_js_1 = require_Meters();
    var OnboardingLinks_js_1 = require_OnboardingLinks();
    var Orders_js_1 = require_Orders();
    var OutboundPayments_js_1 = require_OutboundPayments();
    var OutboundPayments_js_2 = require_OutboundPayments2();
    var OutboundTransfers_js_1 = require_OutboundTransfers();
    var OutboundTransfers_js_2 = require_OutboundTransfers2();
    var PaymentEvaluations_js_1 = require_PaymentEvaluations();
    var PersonalizationDesigns_js_1 = require_PersonalizationDesigns();
    var PersonalizationDesigns_js_2 = require_PersonalizationDesigns2();
    var PhysicalBundles_js_1 = require_PhysicalBundles();
    var Products_js_1 = require_Products();
    var Readers_js_1 = require_Readers();
    var Readers_js_2 = require_Readers2();
    var ReceivedCredits_js_1 = require_ReceivedCredits();
    var ReceivedCredits_js_2 = require_ReceivedCredits2();
    var ReceivedDebits_js_1 = require_ReceivedDebits();
    var ReceivedDebits_js_2 = require_ReceivedDebits2();
    var Refunds_js_1 = require_Refunds();
    var Registrations_js_1 = require_Registrations();
    var ReportRuns_js_1 = require_ReportRuns();
    var ReportTypes_js_1 = require_ReportTypes();
    var Requests_js_1 = require_Requests();
    var ScheduledQueryRuns_js_1 = require_ScheduledQueryRuns();
    var Secrets_js_1 = require_Secrets();
    var Sessions_js_1 = require_Sessions();
    var Sessions_js_2 = require_Sessions2();
    var Sessions_js_3 = require_Sessions3();
    var Settings_js_1 = require_Settings();
    var Suppliers_js_1 = require_Suppliers();
    var TestClocks_js_1 = require_TestClocks();
    var Tokens_js_1 = require_Tokens();
    var TransactionEntries_js_1 = require_TransactionEntries();
    var Transactions_js_1 = require_Transactions();
    var Transactions_js_2 = require_Transactions2();
    var Transactions_js_3 = require_Transactions3();
    var Transactions_js_4 = require_Transactions4();
    var Transactions_js_5 = require_Transactions5();
    var ValueListItems_js_1 = require_ValueListItems();
    var ValueLists_js_1 = require_ValueLists();
    var VerificationReports_js_1 = require_VerificationReports();
    var VerificationSessions_js_1 = require_VerificationSessions();
    var Accounts_js_3 = require_Accounts3();
    Object.defineProperty(exports2, "Account", { enumerable: true, get: function() {
      return Accounts_js_3.AccountResource;
    } });
    var Accounts_js_4 = require_Accounts3();
    Object.defineProperty(exports2, "Accounts", { enumerable: true, get: function() {
      return Accounts_js_4.AccountResource;
    } });
    var AccountLinks_js_2 = require_AccountLinks2();
    Object.defineProperty(exports2, "AccountLinks", { enumerable: true, get: function() {
      return AccountLinks_js_2.AccountLinkResource;
    } });
    var AccountSessions_js_1 = require_AccountSessions();
    Object.defineProperty(exports2, "AccountSessions", { enumerable: true, get: function() {
      return AccountSessions_js_1.AccountSessionResource;
    } });
    var ApplePayDomains_js_1 = require_ApplePayDomains();
    Object.defineProperty(exports2, "ApplePayDomains", { enumerable: true, get: function() {
      return ApplePayDomains_js_1.ApplePayDomainResource;
    } });
    var ApplicationFees_js_1 = require_ApplicationFees();
    Object.defineProperty(exports2, "ApplicationFees", { enumerable: true, get: function() {
      return ApplicationFees_js_1.ApplicationFeeResource;
    } });
    var Balance_js_1 = require_Balance();
    Object.defineProperty(exports2, "Balance", { enumerable: true, get: function() {
      return Balance_js_1.BalanceResource;
    } });
    var Balance_js_2 = require_Balance();
    Object.defineProperty(exports2, "Balances", { enumerable: true, get: function() {
      return Balance_js_2.BalanceResource;
    } });
    var BalanceSettings_js_1 = require_BalanceSettings();
    Object.defineProperty(exports2, "BalanceSettings", { enumerable: true, get: function() {
      return BalanceSettings_js_1.BalanceSettingResource;
    } });
    var BalanceTransactions_js_1 = require_BalanceTransactions();
    Object.defineProperty(exports2, "BalanceTransactions", { enumerable: true, get: function() {
      return BalanceTransactions_js_1.BalanceTransactionResource;
    } });
    var Charges_js_1 = require_Charges();
    Object.defineProperty(exports2, "Charges", { enumerable: true, get: function() {
      return Charges_js_1.ChargeResource;
    } });
    var ConfirmationTokens_js_2 = require_ConfirmationTokens2();
    Object.defineProperty(exports2, "ConfirmationTokens", { enumerable: true, get: function() {
      return ConfirmationTokens_js_2.ConfirmationTokenResource;
    } });
    var CountrySpecs_js_1 = require_CountrySpecs();
    Object.defineProperty(exports2, "CountrySpecs", { enumerable: true, get: function() {
      return CountrySpecs_js_1.CountrySpecResource;
    } });
    var Coupons_js_1 = require_Coupons();
    Object.defineProperty(exports2, "Coupons", { enumerable: true, get: function() {
      return Coupons_js_1.CouponResource;
    } });
    var CreditNotes_js_1 = require_CreditNotes();
    Object.defineProperty(exports2, "CreditNotes", { enumerable: true, get: function() {
      return CreditNotes_js_1.CreditNoteResource;
    } });
    var Customers_js_2 = require_Customers2();
    Object.defineProperty(exports2, "Customers", { enumerable: true, get: function() {
      return Customers_js_2.CustomerResource;
    } });
    var CustomerSessions_js_1 = require_CustomerSessions();
    Object.defineProperty(exports2, "CustomerSessions", { enumerable: true, get: function() {
      return CustomerSessions_js_1.CustomerSessionResource;
    } });
    var Disputes_js_2 = require_Disputes2();
    Object.defineProperty(exports2, "Disputes", { enumerable: true, get: function() {
      return Disputes_js_2.DisputeResource;
    } });
    var EphemeralKeys_js_1 = require_EphemeralKeys();
    Object.defineProperty(exports2, "EphemeralKeys", { enumerable: true, get: function() {
      return EphemeralKeys_js_1.EphemeralKeyResource;
    } });
    var Events_js_2 = require_Events2();
    Object.defineProperty(exports2, "Events", { enumerable: true, get: function() {
      return Events_js_2.EventResource;
    } });
    var ExchangeRates_js_1 = require_ExchangeRates();
    Object.defineProperty(exports2, "ExchangeRates", { enumerable: true, get: function() {
      return ExchangeRates_js_1.ExchangeRateResource;
    } });
    var Files_js_1 = require_Files();
    Object.defineProperty(exports2, "Files", { enumerable: true, get: function() {
      return Files_js_1.FileResource;
    } });
    var FileLinks_js_1 = require_FileLinks();
    Object.defineProperty(exports2, "FileLinks", { enumerable: true, get: function() {
      return FileLinks_js_1.FileLinkResource;
    } });
    var Invoices_js_1 = require_Invoices();
    Object.defineProperty(exports2, "Invoices", { enumerable: true, get: function() {
      return Invoices_js_1.InvoiceResource;
    } });
    var InvoiceItems_js_1 = require_InvoiceItems();
    Object.defineProperty(exports2, "InvoiceItems", { enumerable: true, get: function() {
      return InvoiceItems_js_1.InvoiceItemResource;
    } });
    var InvoicePayments_js_1 = require_InvoicePayments();
    Object.defineProperty(exports2, "InvoicePayments", { enumerable: true, get: function() {
      return InvoicePayments_js_1.InvoicePaymentResource;
    } });
    var InvoiceRenderingTemplates_js_1 = require_InvoiceRenderingTemplates();
    Object.defineProperty(exports2, "InvoiceRenderingTemplates", { enumerable: true, get: function() {
      return InvoiceRenderingTemplates_js_1.InvoiceRenderingTemplateResource;
    } });
    var Mandates_js_1 = require_Mandates();
    Object.defineProperty(exports2, "Mandates", { enumerable: true, get: function() {
      return Mandates_js_1.MandateResource;
    } });
    var OAuth_js_1 = require_OAuth();
    Object.defineProperty(exports2, "OAuthResource", { enumerable: true, get: function() {
      return OAuth_js_1.OAuthResource;
    } });
    var PaymentAttemptRecords_js_1 = require_PaymentAttemptRecords();
    Object.defineProperty(exports2, "PaymentAttemptRecords", { enumerable: true, get: function() {
      return PaymentAttemptRecords_js_1.PaymentAttemptRecordResource;
    } });
    var PaymentIntents_js_1 = require_PaymentIntents();
    Object.defineProperty(exports2, "PaymentIntents", { enumerable: true, get: function() {
      return PaymentIntents_js_1.PaymentIntentResource;
    } });
    var PaymentLinks_js_1 = require_PaymentLinks();
    Object.defineProperty(exports2, "PaymentLinks", { enumerable: true, get: function() {
      return PaymentLinks_js_1.PaymentLinkResource;
    } });
    var PaymentMethods_js_1 = require_PaymentMethods();
    Object.defineProperty(exports2, "PaymentMethods", { enumerable: true, get: function() {
      return PaymentMethods_js_1.PaymentMethodResource;
    } });
    var PaymentMethodConfigurations_js_1 = require_PaymentMethodConfigurations();
    Object.defineProperty(exports2, "PaymentMethodConfigurations", { enumerable: true, get: function() {
      return PaymentMethodConfigurations_js_1.PaymentMethodConfigurationResource;
    } });
    var PaymentMethodDomains_js_1 = require_PaymentMethodDomains();
    Object.defineProperty(exports2, "PaymentMethodDomains", { enumerable: true, get: function() {
      return PaymentMethodDomains_js_1.PaymentMethodDomainResource;
    } });
    var PaymentRecords_js_1 = require_PaymentRecords();
    Object.defineProperty(exports2, "PaymentRecords", { enumerable: true, get: function() {
      return PaymentRecords_js_1.PaymentRecordResource;
    } });
    var Payouts_js_1 = require_Payouts();
    Object.defineProperty(exports2, "Payouts", { enumerable: true, get: function() {
      return Payouts_js_1.PayoutResource;
    } });
    var Plans_js_1 = require_Plans();
    Object.defineProperty(exports2, "Plans", { enumerable: true, get: function() {
      return Plans_js_1.PlanResource;
    } });
    var Prices_js_1 = require_Prices();
    Object.defineProperty(exports2, "Prices", { enumerable: true, get: function() {
      return Prices_js_1.PriceResource;
    } });
    var Products_js_2 = require_Products2();
    Object.defineProperty(exports2, "Products", { enumerable: true, get: function() {
      return Products_js_2.ProductResource;
    } });
    var PromotionCodes_js_1 = require_PromotionCodes();
    Object.defineProperty(exports2, "PromotionCodes", { enumerable: true, get: function() {
      return PromotionCodes_js_1.PromotionCodeResource;
    } });
    var Quotes_js_1 = require_Quotes();
    Object.defineProperty(exports2, "Quotes", { enumerable: true, get: function() {
      return Quotes_js_1.QuoteResource;
    } });
    var Refunds_js_2 = require_Refunds2();
    Object.defineProperty(exports2, "Refunds", { enumerable: true, get: function() {
      return Refunds_js_2.RefundResource;
    } });
    var Reviews_js_1 = require_Reviews();
    Object.defineProperty(exports2, "Reviews", { enumerable: true, get: function() {
      return Reviews_js_1.ReviewResource;
    } });
    var SetupAttempts_js_1 = require_SetupAttempts();
    Object.defineProperty(exports2, "SetupAttempts", { enumerable: true, get: function() {
      return SetupAttempts_js_1.SetupAttemptResource;
    } });
    var SetupIntents_js_1 = require_SetupIntents();
    Object.defineProperty(exports2, "SetupIntents", { enumerable: true, get: function() {
      return SetupIntents_js_1.SetupIntentResource;
    } });
    var ShippingRates_js_1 = require_ShippingRates();
    Object.defineProperty(exports2, "ShippingRates", { enumerable: true, get: function() {
      return ShippingRates_js_1.ShippingRateResource;
    } });
    var Sources_js_1 = require_Sources();
    Object.defineProperty(exports2, "Sources", { enumerable: true, get: function() {
      return Sources_js_1.SourceResource;
    } });
    var Subscriptions_js_1 = require_Subscriptions();
    Object.defineProperty(exports2, "Subscriptions", { enumerable: true, get: function() {
      return Subscriptions_js_1.SubscriptionResource;
    } });
    var SubscriptionItems_js_1 = require_SubscriptionItems();
    Object.defineProperty(exports2, "SubscriptionItems", { enumerable: true, get: function() {
      return SubscriptionItems_js_1.SubscriptionItemResource;
    } });
    var SubscriptionSchedules_js_1 = require_SubscriptionSchedules();
    Object.defineProperty(exports2, "SubscriptionSchedules", { enumerable: true, get: function() {
      return SubscriptionSchedules_js_1.SubscriptionScheduleResource;
    } });
    var TaxCodes_js_1 = require_TaxCodes();
    Object.defineProperty(exports2, "TaxCodes", { enumerable: true, get: function() {
      return TaxCodes_js_1.TaxCodeResource;
    } });
    var TaxIds_js_1 = require_TaxIds();
    Object.defineProperty(exports2, "TaxIds", { enumerable: true, get: function() {
      return TaxIds_js_1.TaxIdResource;
    } });
    var TaxRates_js_1 = require_TaxRates();
    Object.defineProperty(exports2, "TaxRates", { enumerable: true, get: function() {
      return TaxRates_js_1.TaxRateResource;
    } });
    var Tokens_js_2 = require_Tokens2();
    Object.defineProperty(exports2, "Tokens", { enumerable: true, get: function() {
      return Tokens_js_2.TokenResource;
    } });
    var Topups_js_1 = require_Topups();
    Object.defineProperty(exports2, "Topups", { enumerable: true, get: function() {
      return Topups_js_1.TopupResource;
    } });
    var Transfers_js_1 = require_Transfers();
    Object.defineProperty(exports2, "Transfers", { enumerable: true, get: function() {
      return Transfers_js_1.TransferResource;
    } });
    var WebhookEndpoints_js_1 = require_WebhookEndpoints();
    Object.defineProperty(exports2, "WebhookEndpoints", { enumerable: true, get: function() {
      return WebhookEndpoints_js_1.WebhookEndpointResource;
    } });
    exports2.Apps = (0, ResourceNamespace_js_1.resourceNamespace)("apps", { Secrets: Secrets_js_1.SecretResource });
    exports2.Billing = (0, ResourceNamespace_js_1.resourceNamespace)("billing", {
      Alerts: Alerts_js_1.AlertResource,
      CreditBalanceSummary: CreditBalanceSummary_js_1.CreditBalanceSummaryResource,
      CreditBalanceTransactions: CreditBalanceTransactions_js_1.CreditBalanceTransactionResource,
      CreditGrants: CreditGrants_js_1.CreditGrantResource,
      MeterEventAdjustments: MeterEventAdjustments_js_1.MeterEventAdjustmentResource,
      MeterEvents: MeterEvents_js_1.MeterEventResource,
      Meters: Meters_js_1.MeterResource
    });
    exports2.BillingPortal = (0, ResourceNamespace_js_1.resourceNamespace)("billingPortal", {
      Configurations: Configurations_js_1.ConfigurationResource,
      Sessions: Sessions_js_1.SessionResource
    });
    exports2.Checkout = (0, ResourceNamespace_js_1.resourceNamespace)("checkout", {
      Sessions: Sessions_js_2.SessionResource
    });
    exports2.Climate = (0, ResourceNamespace_js_1.resourceNamespace)("climate", {
      Orders: Orders_js_1.OrderResource,
      Products: Products_js_1.ProductResource,
      Suppliers: Suppliers_js_1.SupplierResource
    });
    exports2.Entitlements = (0, ResourceNamespace_js_1.resourceNamespace)("entitlements", {
      ActiveEntitlements: ActiveEntitlements_js_1.ActiveEntitlementResource,
      Features: Features_js_1.FeatureResource
    });
    exports2.FinancialConnections = (0, ResourceNamespace_js_1.resourceNamespace)("financialConnections", {
      Accounts: Accounts_js_1.AccountResource,
      Sessions: Sessions_js_3.SessionResource,
      Transactions: Transactions_js_1.TransactionResource
    });
    exports2.Forwarding = (0, ResourceNamespace_js_1.resourceNamespace)("forwarding", {
      Requests: Requests_js_1.RequestResource
    });
    exports2.Identity = (0, ResourceNamespace_js_1.resourceNamespace)("identity", {
      VerificationReports: VerificationReports_js_1.VerificationReportResource,
      VerificationSessions: VerificationSessions_js_1.VerificationSessionResource
    });
    exports2.Issuing = (0, ResourceNamespace_js_1.resourceNamespace)("issuing", {
      Authorizations: Authorizations_js_1.AuthorizationResource,
      Cardholders: Cardholders_js_1.CardholderResource,
      Cards: Cards_js_1.CardResource,
      Disputes: Disputes_js_1.DisputeResource,
      PersonalizationDesigns: PersonalizationDesigns_js_1.PersonalizationDesignResource,
      PhysicalBundles: PhysicalBundles_js_1.PhysicalBundleResource,
      Tokens: Tokens_js_1.TokenResource,
      Transactions: Transactions_js_2.TransactionResource
    });
    exports2.Radar = (0, ResourceNamespace_js_1.resourceNamespace)("radar", {
      EarlyFraudWarnings: EarlyFraudWarnings_js_1.EarlyFraudWarningResource,
      PaymentEvaluations: PaymentEvaluations_js_1.PaymentEvaluationResource,
      ValueListItems: ValueListItems_js_1.ValueListItemResource,
      ValueLists: ValueLists_js_1.ValueListResource
    });
    exports2.Reporting = (0, ResourceNamespace_js_1.resourceNamespace)("reporting", {
      ReportRuns: ReportRuns_js_1.ReportRunResource,
      ReportTypes: ReportTypes_js_1.ReportTypeResource
    });
    exports2.Sigma = (0, ResourceNamespace_js_1.resourceNamespace)("sigma", {
      ScheduledQueryRuns: ScheduledQueryRuns_js_1.ScheduledQueryRunResource
    });
    exports2.Tax = (0, ResourceNamespace_js_1.resourceNamespace)("tax", {
      Associations: Associations_js_1.AssociationResource,
      Calculations: Calculations_js_1.CalculationResource,
      Registrations: Registrations_js_1.RegistrationResource,
      Settings: Settings_js_1.SettingResource,
      Transactions: Transactions_js_3.TransactionResource
    });
    exports2.Terminal = (0, ResourceNamespace_js_1.resourceNamespace)("terminal", {
      Configurations: Configurations_js_2.ConfigurationResource,
      ConnectionTokens: ConnectionTokens_js_1.ConnectionTokenResource,
      Locations: Locations_js_1.LocationResource,
      OnboardingLinks: OnboardingLinks_js_1.OnboardingLinkResource,
      Readers: Readers_js_1.ReaderResource
    });
    exports2.TestHelpers = (0, ResourceNamespace_js_1.resourceNamespace)("testHelpers", {
      ConfirmationTokens: ConfirmationTokens_js_1.ConfirmationTokenResource,
      Customers: Customers_js_1.CustomerResource,
      Refunds: Refunds_js_1.RefundResource,
      TestClocks: TestClocks_js_1.TestClockResource,
      Issuing: (0, ResourceNamespace_js_1.resourceNamespace)("issuing", {
        Authorizations: Authorizations_js_2.AuthorizationResource,
        Cards: Cards_js_2.CardResource,
        PersonalizationDesigns: PersonalizationDesigns_js_2.PersonalizationDesignResource,
        Transactions: Transactions_js_4.TransactionResource
      }),
      Terminal: (0, ResourceNamespace_js_1.resourceNamespace)("terminal", {
        Readers: Readers_js_2.ReaderResource
      }),
      Treasury: (0, ResourceNamespace_js_1.resourceNamespace)("treasury", {
        InboundTransfers: InboundTransfers_js_1.InboundTransferResource,
        OutboundPayments: OutboundPayments_js_1.OutboundPaymentResource,
        OutboundTransfers: OutboundTransfers_js_1.OutboundTransferResource,
        ReceivedCredits: ReceivedCredits_js_1.ReceivedCreditResource,
        ReceivedDebits: ReceivedDebits_js_1.ReceivedDebitResource
      })
    });
    exports2.Treasury = (0, ResourceNamespace_js_1.resourceNamespace)("treasury", {
      CreditReversals: CreditReversals_js_1.CreditReversalResource,
      DebitReversals: DebitReversals_js_1.DebitReversalResource,
      FinancialAccounts: FinancialAccounts_js_1.FinancialAccountResource,
      InboundTransfers: InboundTransfers_js_2.InboundTransferResource,
      OutboundPayments: OutboundPayments_js_2.OutboundPaymentResource,
      OutboundTransfers: OutboundTransfers_js_2.OutboundTransferResource,
      ReceivedCredits: ReceivedCredits_js_2.ReceivedCreditResource,
      ReceivedDebits: ReceivedDebits_js_2.ReceivedDebitResource,
      TransactionEntries: TransactionEntries_js_1.TransactionEntryResource,
      Transactions: Transactions_js_5.TransactionResource
    });
    exports2.V2 = (0, ResourceNamespace_js_1.resourceNamespace)("v2", {
      Billing: (0, ResourceNamespace_js_1.resourceNamespace)("billing", {
        MeterEventAdjustments: MeterEventAdjustments_js_2.MeterEventAdjustmentResource,
        MeterEventSession: MeterEventSession_js_1.MeterEventSessionResource,
        MeterEventStream: MeterEventStream_js_1.MeterEventStreamResource,
        MeterEvents: MeterEvents_js_2.MeterEventResource
      }),
      Commerce: (0, ResourceNamespace_js_1.resourceNamespace)("commerce", {
        ProductCatalog: (0, ResourceNamespace_js_1.resourceNamespace)("productCatalog", {
          Imports: Imports_js_1.ImportResource
        })
      }),
      Core: (0, ResourceNamespace_js_1.resourceNamespace)("core", {
        AccountLinks: AccountLinks_js_1.AccountLinkResource,
        AccountTokens: AccountTokens_js_1.AccountTokenResource,
        Accounts: Accounts_js_2.AccountResource,
        EventDestinations: EventDestinations_js_1.EventDestinationResource,
        Events: Events_js_1.EventResource
      })
    });
  }
});

// node_modules/stripe/cjs/shared.js
var require_shared = __commonJS({
  "node_modules/stripe/cjs/shared.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Decimal = void 0;
    var Decimal_js_1 = require_Decimal();
    Object.defineProperty(exports2, "Decimal", { enumerable: true, get: function() {
      return Decimal_js_1.Decimal;
    } });
  }
});

// node_modules/stripe/cjs/resources/Apps/index.js
var require_Apps = __commonJS({
  "node_modules/stripe/cjs/resources/Apps/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Apps = void 0;
    var Secrets_js_1 = require_Secrets();
    var Apps = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.secrets = new Secrets_js_1.SecretResource(stripe);
      }
    };
    exports2.Apps = Apps;
  }
});

// node_modules/stripe/cjs/resources/Billing/index.js
var require_Billing = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Billing = void 0;
    var Alerts_js_1 = require_Alerts();
    var CreditBalanceSummary_js_1 = require_CreditBalanceSummary();
    var CreditBalanceTransactions_js_1 = require_CreditBalanceTransactions();
    var CreditGrants_js_1 = require_CreditGrants();
    var Meters_js_1 = require_Meters();
    var MeterEvents_js_1 = require_MeterEvents();
    var MeterEventAdjustments_js_1 = require_MeterEventAdjustments();
    var Billing = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.alerts = new Alerts_js_1.AlertResource(stripe);
        this.creditBalanceSummaries = new CreditBalanceSummary_js_1.CreditBalanceSummaryResource(stripe);
        this.creditBalanceTransactions = new CreditBalanceTransactions_js_1.CreditBalanceTransactionResource(stripe);
        this.creditGrants = new CreditGrants_js_1.CreditGrantResource(stripe);
        this.meters = new Meters_js_1.MeterResource(stripe);
        this.meterEvents = new MeterEvents_js_1.MeterEventResource(stripe);
        this.meterEventAdjustments = new MeterEventAdjustments_js_1.MeterEventAdjustmentResource(stripe);
      }
    };
    exports2.Billing = Billing;
  }
});

// node_modules/stripe/cjs/resources/BillingPortal/index.js
var require_BillingPortal = __commonJS({
  "node_modules/stripe/cjs/resources/BillingPortal/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BillingPortal = void 0;
    var Configurations_js_1 = require_Configurations();
    var Sessions_js_1 = require_Sessions();
    var BillingPortal = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.configurations = new Configurations_js_1.ConfigurationResource(stripe);
        this.sessions = new Sessions_js_1.SessionResource(stripe);
      }
    };
    exports2.BillingPortal = BillingPortal;
  }
});

// node_modules/stripe/cjs/resources/Checkout/index.js
var require_Checkout = __commonJS({
  "node_modules/stripe/cjs/resources/Checkout/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Checkout = void 0;
    var Sessions_js_1 = require_Sessions2();
    var Checkout = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.sessions = new Sessions_js_1.SessionResource(stripe);
      }
    };
    exports2.Checkout = Checkout;
  }
});

// node_modules/stripe/cjs/resources/Climate/index.js
var require_Climate = __commonJS({
  "node_modules/stripe/cjs/resources/Climate/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Climate = void 0;
    var Orders_js_1 = require_Orders();
    var Products_js_1 = require_Products();
    var Suppliers_js_1 = require_Suppliers();
    var Climate = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.orders = new Orders_js_1.OrderResource(stripe);
        this.products = new Products_js_1.ProductResource(stripe);
        this.suppliers = new Suppliers_js_1.SupplierResource(stripe);
      }
    };
    exports2.Climate = Climate;
  }
});

// node_modules/stripe/cjs/resources/Entitlements/index.js
var require_Entitlements = __commonJS({
  "node_modules/stripe/cjs/resources/Entitlements/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Entitlements = void 0;
    var ActiveEntitlements_js_1 = require_ActiveEntitlements();
    var Features_js_1 = require_Features();
    var Entitlements = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.activeEntitlements = new ActiveEntitlements_js_1.ActiveEntitlementResource(stripe);
        this.features = new Features_js_1.FeatureResource(stripe);
      }
    };
    exports2.Entitlements = Entitlements;
  }
});

// node_modules/stripe/cjs/resources/FinancialConnections/index.js
var require_FinancialConnections = __commonJS({
  "node_modules/stripe/cjs/resources/FinancialConnections/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FinancialConnections = void 0;
    var Accounts_js_1 = require_Accounts();
    var Sessions_js_1 = require_Sessions3();
    var Transactions_js_1 = require_Transactions();
    var FinancialConnections = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.accounts = new Accounts_js_1.AccountResource(stripe);
        this.sessions = new Sessions_js_1.SessionResource(stripe);
        this.transactions = new Transactions_js_1.TransactionResource(stripe);
      }
    };
    exports2.FinancialConnections = FinancialConnections;
  }
});

// node_modules/stripe/cjs/resources/Forwarding/index.js
var require_Forwarding = __commonJS({
  "node_modules/stripe/cjs/resources/Forwarding/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Forwarding = void 0;
    var Requests_js_1 = require_Requests();
    var Forwarding = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.requests = new Requests_js_1.RequestResource(stripe);
      }
    };
    exports2.Forwarding = Forwarding;
  }
});

// node_modules/stripe/cjs/resources/Identity/index.js
var require_Identity = __commonJS({
  "node_modules/stripe/cjs/resources/Identity/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Identity = void 0;
    var VerificationReports_js_1 = require_VerificationReports();
    var VerificationSessions_js_1 = require_VerificationSessions();
    var Identity = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.verificationReports = new VerificationReports_js_1.VerificationReportResource(stripe);
        this.verificationSessions = new VerificationSessions_js_1.VerificationSessionResource(stripe);
      }
    };
    exports2.Identity = Identity;
  }
});

// node_modules/stripe/cjs/resources/Issuing/index.js
var require_Issuing = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Issuing = void 0;
    var Authorizations_js_1 = require_Authorizations();
    var Cards_js_1 = require_Cards();
    var Cardholders_js_1 = require_Cardholders();
    var Disputes_js_1 = require_Disputes();
    var PersonalizationDesigns_js_1 = require_PersonalizationDesigns();
    var PhysicalBundles_js_1 = require_PhysicalBundles();
    var Tokens_js_1 = require_Tokens();
    var Transactions_js_1 = require_Transactions2();
    var Issuing = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.authorizations = new Authorizations_js_1.AuthorizationResource(stripe);
        this.cards = new Cards_js_1.CardResource(stripe);
        this.cardholders = new Cardholders_js_1.CardholderResource(stripe);
        this.disputes = new Disputes_js_1.DisputeResource(stripe);
        this.personalizationDesigns = new PersonalizationDesigns_js_1.PersonalizationDesignResource(stripe);
        this.physicalBundles = new PhysicalBundles_js_1.PhysicalBundleResource(stripe);
        this.tokens = new Tokens_js_1.TokenResource(stripe);
        this.transactions = new Transactions_js_1.TransactionResource(stripe);
      }
    };
    exports2.Issuing = Issuing;
  }
});

// node_modules/stripe/cjs/resources/Radar/index.js
var require_Radar = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Radar = void 0;
    var EarlyFraudWarnings_js_1 = require_EarlyFraudWarnings();
    var PaymentEvaluations_js_1 = require_PaymentEvaluations();
    var ValueLists_js_1 = require_ValueLists();
    var ValueListItems_js_1 = require_ValueListItems();
    var Radar = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.earlyFraudWarnings = new EarlyFraudWarnings_js_1.EarlyFraudWarningResource(stripe);
        this.paymentEvaluations = new PaymentEvaluations_js_1.PaymentEvaluationResource(stripe);
        this.valueLists = new ValueLists_js_1.ValueListResource(stripe);
        this.valueListItems = new ValueListItems_js_1.ValueListItemResource(stripe);
      }
    };
    exports2.Radar = Radar;
  }
});

// node_modules/stripe/cjs/resources/Reporting/index.js
var require_Reporting = __commonJS({
  "node_modules/stripe/cjs/resources/Reporting/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Reporting = void 0;
    var ReportRuns_js_1 = require_ReportRuns();
    var ReportTypes_js_1 = require_ReportTypes();
    var Reporting = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.reportRuns = new ReportRuns_js_1.ReportRunResource(stripe);
        this.reportTypes = new ReportTypes_js_1.ReportTypeResource(stripe);
      }
    };
    exports2.Reporting = Reporting;
  }
});

// node_modules/stripe/cjs/resources/Sigma/index.js
var require_Sigma = __commonJS({
  "node_modules/stripe/cjs/resources/Sigma/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Sigma = void 0;
    var ScheduledQueryRuns_js_1 = require_ScheduledQueryRuns();
    var Sigma = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.scheduledQueryRuns = new ScheduledQueryRuns_js_1.ScheduledQueryRunResource(stripe);
      }
    };
    exports2.Sigma = Sigma;
  }
});

// node_modules/stripe/cjs/resources/Tax/index.js
var require_Tax = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Tax = void 0;
    var Associations_js_1 = require_Associations();
    var Calculations_js_1 = require_Calculations();
    var Registrations_js_1 = require_Registrations();
    var Settings_js_1 = require_Settings();
    var Transactions_js_1 = require_Transactions3();
    var Tax = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.associations = new Associations_js_1.AssociationResource(stripe);
        this.calculations = new Calculations_js_1.CalculationResource(stripe);
        this.registrations = new Registrations_js_1.RegistrationResource(stripe);
        this.settings = new Settings_js_1.SettingResource(stripe);
        this.transactions = new Transactions_js_1.TransactionResource(stripe);
      }
    };
    exports2.Tax = Tax;
  }
});

// node_modules/stripe/cjs/resources/Terminal/index.js
var require_Terminal = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Terminal = void 0;
    var Configurations_js_1 = require_Configurations2();
    var ConnectionTokens_js_1 = require_ConnectionTokens();
    var Locations_js_1 = require_Locations();
    var OnboardingLinks_js_1 = require_OnboardingLinks();
    var Readers_js_1 = require_Readers();
    var Terminal = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.configurations = new Configurations_js_1.ConfigurationResource(stripe);
        this.connectionTokens = new ConnectionTokens_js_1.ConnectionTokenResource(stripe);
        this.locations = new Locations_js_1.LocationResource(stripe);
        this.onboardingLinks = new OnboardingLinks_js_1.OnboardingLinkResource(stripe);
        this.readers = new Readers_js_1.ReaderResource(stripe);
      }
    };
    exports2.Terminal = Terminal;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/index.js
var require_Issuing2 = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Issuing = void 0;
    var Authorizations_js_1 = require_Authorizations2();
    var Cards_js_1 = require_Cards2();
    var PersonalizationDesigns_js_1 = require_PersonalizationDesigns2();
    var Transactions_js_1 = require_Transactions4();
    var Issuing = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.authorizations = new Authorizations_js_1.AuthorizationResource(stripe);
        this.cards = new Cards_js_1.CardResource(stripe);
        this.personalizationDesigns = new PersonalizationDesigns_js_1.PersonalizationDesignResource(stripe);
        this.transactions = new Transactions_js_1.TransactionResource(stripe);
      }
    };
    exports2.Issuing = Issuing;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Terminal/index.js
var require_Terminal2 = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Terminal/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Terminal = void 0;
    var Readers_js_1 = require_Readers2();
    var Terminal = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.readers = new Readers_js_1.ReaderResource(stripe);
      }
    };
    exports2.Terminal = Terminal;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/index.js
var require_Treasury = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Treasury = void 0;
    var InboundTransfers_js_1 = require_InboundTransfers();
    var OutboundPayments_js_1 = require_OutboundPayments();
    var OutboundTransfers_js_1 = require_OutboundTransfers();
    var ReceivedCredits_js_1 = require_ReceivedCredits();
    var ReceivedDebits_js_1 = require_ReceivedDebits();
    var Treasury = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.inboundTransfers = new InboundTransfers_js_1.InboundTransferResource(stripe);
        this.outboundPayments = new OutboundPayments_js_1.OutboundPaymentResource(stripe);
        this.outboundTransfers = new OutboundTransfers_js_1.OutboundTransferResource(stripe);
        this.receivedCredits = new ReceivedCredits_js_1.ReceivedCreditResource(stripe);
        this.receivedDebits = new ReceivedDebits_js_1.ReceivedDebitResource(stripe);
      }
    };
    exports2.Treasury = Treasury;
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/index.js
var require_TestHelpers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TestHelpers = void 0;
    var ConfirmationTokens_js_1 = require_ConfirmationTokens();
    var Customers_js_1 = require_Customers();
    var Refunds_js_1 = require_Refunds();
    var TestClocks_js_1 = require_TestClocks();
    var index_js_1 = require_Issuing2();
    var index_js_2 = require_Terminal2();
    var index_js_3 = require_Treasury();
    var TestHelpers = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.confirmationTokens = new ConfirmationTokens_js_1.ConfirmationTokenResource(stripe);
        this.customers = new Customers_js_1.CustomerResource(stripe);
        this.refunds = new Refunds_js_1.RefundResource(stripe);
        this.testClocks = new TestClocks_js_1.TestClockResource(stripe);
        this.issuing = new index_js_1.Issuing(stripe);
        this.terminal = new index_js_2.Terminal(stripe);
        this.treasury = new index_js_3.Treasury(stripe);
      }
    };
    exports2.TestHelpers = TestHelpers;
  }
});

// node_modules/stripe/cjs/resources/Treasury/index.js
var require_Treasury2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Treasury = void 0;
    var CreditReversals_js_1 = require_CreditReversals();
    var DebitReversals_js_1 = require_DebitReversals();
    var FinancialAccounts_js_1 = require_FinancialAccounts();
    var InboundTransfers_js_1 = require_InboundTransfers2();
    var OutboundPayments_js_1 = require_OutboundPayments2();
    var OutboundTransfers_js_1 = require_OutboundTransfers2();
    var ReceivedCredits_js_1 = require_ReceivedCredits2();
    var ReceivedDebits_js_1 = require_ReceivedDebits2();
    var Transactions_js_1 = require_Transactions5();
    var TransactionEntries_js_1 = require_TransactionEntries();
    var Treasury = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.creditReversals = new CreditReversals_js_1.CreditReversalResource(stripe);
        this.debitReversals = new DebitReversals_js_1.DebitReversalResource(stripe);
        this.financialAccounts = new FinancialAccounts_js_1.FinancialAccountResource(stripe);
        this.inboundTransfers = new InboundTransfers_js_1.InboundTransferResource(stripe);
        this.outboundPayments = new OutboundPayments_js_1.OutboundPaymentResource(stripe);
        this.outboundTransfers = new OutboundTransfers_js_1.OutboundTransferResource(stripe);
        this.receivedCredits = new ReceivedCredits_js_1.ReceivedCreditResource(stripe);
        this.receivedDebits = new ReceivedDebits_js_1.ReceivedDebitResource(stripe);
        this.transactions = new Transactions_js_1.TransactionResource(stripe);
        this.transactionEntries = new TransactionEntries_js_1.TransactionEntryResource(stripe);
      }
    };
    exports2.Treasury = Treasury;
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/index.js
var require_Billing2 = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Billing = void 0;
    var MeterEvents_js_1 = require_MeterEvents2();
    var MeterEventAdjustments_js_1 = require_MeterEventAdjustments2();
    var MeterEventSession_js_1 = require_MeterEventSession();
    var MeterEventStream_js_1 = require_MeterEventStream();
    var Billing = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.meterEvents = new MeterEvents_js_1.MeterEventResource(stripe);
        this.meterEventAdjustments = new MeterEventAdjustments_js_1.MeterEventAdjustmentResource(stripe);
        this.meterEventSession = new MeterEventSession_js_1.MeterEventSessionResource(stripe);
        this.meterEventStream = new MeterEventStream_js_1.MeterEventStreamResource(stripe);
      }
    };
    exports2.Billing = Billing;
  }
});

// node_modules/stripe/cjs/resources/V2/Commerce/ProductCatalog/index.js
var require_ProductCatalog = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Commerce/ProductCatalog/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProductCatalog = void 0;
    var Imports_js_1 = require_Imports();
    var ProductCatalog = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.imports = new Imports_js_1.ImportResource(stripe);
      }
    };
    exports2.ProductCatalog = ProductCatalog;
  }
});

// node_modules/stripe/cjs/resources/V2/Commerce/index.js
var require_Commerce = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Commerce/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Commerce = void 0;
    var index_js_1 = require_ProductCatalog();
    var Commerce = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.productCatalog = new index_js_1.ProductCatalog(stripe);
      }
    };
    exports2.Commerce = Commerce;
  }
});

// node_modules/stripe/cjs/resources/V2/Core/index.js
var require_Core = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Core = void 0;
    var Accounts_js_1 = require_Accounts2();
    var AccountLinks_js_1 = require_AccountLinks();
    var AccountTokens_js_1 = require_AccountTokens();
    var Events_js_1 = require_Events();
    var EventDestinations_js_1 = require_EventDestinations();
    var Core = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.accounts = new Accounts_js_1.AccountResource(stripe);
        this.accountLinks = new AccountLinks_js_1.AccountLinkResource(stripe);
        this.accountTokens = new AccountTokens_js_1.AccountTokenResource(stripe);
        this.events = new Events_js_1.EventResource(stripe);
        this.eventDestinations = new EventDestinations_js_1.EventDestinationResource(stripe);
      }
    };
    exports2.Core = Core;
  }
});

// node_modules/stripe/cjs/resources/V2/index.js
var require_V2 = __commonJS({
  "node_modules/stripe/cjs/resources/V2/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.V2 = void 0;
    var index_js_1 = require_Billing2();
    var index_js_2 = require_Commerce();
    var index_js_3 = require_Core();
    var V2 = class {
      constructor(stripe) {
        this.stripe = stripe;
        this.billing = new index_js_1.Billing(stripe);
        this.commerce = new index_js_2.Commerce(stripe);
        this.core = new index_js_3.Core(stripe);
      }
    };
    exports2.V2 = V2;
  }
});

// node_modules/stripe/cjs/resources/Reserve/index.js
var require_Reserve = __commonJS({
  "node_modules/stripe/cjs/resources/Reserve/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Reserve = void 0;
    var Reserve = class {
    };
    exports2.Reserve = Reserve;
  }
});

// node_modules/stripe/cjs/stripe.core.js
var require_stripe_core = __commonJS({
  "node_modules/stripe/cjs/stripe.core.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createStripe = exports2.Stripe = void 0;
    var _Error = require_Error();
    var RequestSender_js_1 = require_RequestSender();
    var StripeResource_js_1 = require_StripeResource();
    var StripeContext_js_1 = require_StripeContext();
    var Types_js_1 = require_Types();
    var Webhooks_js_1 = require_Webhooks();
    var apiVersion_js_1 = require_apiVersion();
    var CryptoProvider_js_1 = require_CryptoProvider();
    var HttpClient_js_1 = require_HttpClient();
    var resources = require_resources();
    var utils_js_1 = require_utils();
    var shared_js_1 = require_shared();
    var Accounts_js_1 = require_Accounts3();
    var AccountLinks_js_1 = require_AccountLinks2();
    var AccountSessions_js_1 = require_AccountSessions();
    var ApplePayDomains_js_1 = require_ApplePayDomains();
    var ApplicationFees_js_1 = require_ApplicationFees();
    var Balance_js_1 = require_Balance();
    var BalanceSettings_js_1 = require_BalanceSettings();
    var BalanceTransactions_js_1 = require_BalanceTransactions();
    var Charges_js_1 = require_Charges();
    var ConfirmationTokens_js_1 = require_ConfirmationTokens2();
    var CountrySpecs_js_1 = require_CountrySpecs();
    var Coupons_js_1 = require_Coupons();
    var CreditNotes_js_1 = require_CreditNotes();
    var Customers_js_1 = require_Customers2();
    var CustomerSessions_js_1 = require_CustomerSessions();
    var Disputes_js_1 = require_Disputes2();
    var EphemeralKeys_js_1 = require_EphemeralKeys();
    var ExchangeRates_js_1 = require_ExchangeRates();
    var Files_js_1 = require_Files();
    var FileLinks_js_1 = require_FileLinks();
    var Invoices_js_1 = require_Invoices();
    var InvoiceItems_js_1 = require_InvoiceItems();
    var InvoicePayments_js_1 = require_InvoicePayments();
    var InvoiceRenderingTemplates_js_1 = require_InvoiceRenderingTemplates();
    var Mandates_js_1 = require_Mandates();
    var PaymentAttemptRecords_js_1 = require_PaymentAttemptRecords();
    var PaymentIntents_js_1 = require_PaymentIntents();
    var PaymentLinks_js_1 = require_PaymentLinks();
    var PaymentMethods_js_1 = require_PaymentMethods();
    var PaymentMethodConfigurations_js_1 = require_PaymentMethodConfigurations();
    var PaymentMethodDomains_js_1 = require_PaymentMethodDomains();
    var PaymentRecords_js_1 = require_PaymentRecords();
    var Payouts_js_1 = require_Payouts();
    var Plans_js_1 = require_Plans();
    var Prices_js_1 = require_Prices();
    var Products_js_1 = require_Products2();
    var PromotionCodes_js_1 = require_PromotionCodes();
    var Quotes_js_1 = require_Quotes();
    var Refunds_js_1 = require_Refunds2();
    var Reviews_js_1 = require_Reviews();
    var SetupAttempts_js_1 = require_SetupAttempts();
    var SetupIntents_js_1 = require_SetupIntents();
    var ShippingRates_js_1 = require_ShippingRates();
    var Sources_js_1 = require_Sources();
    var Subscriptions_js_1 = require_Subscriptions();
    var SubscriptionItems_js_1 = require_SubscriptionItems();
    var SubscriptionSchedules_js_1 = require_SubscriptionSchedules();
    var TaxCodes_js_1 = require_TaxCodes();
    var TaxIds_js_1 = require_TaxIds();
    var TaxRates_js_1 = require_TaxRates();
    var Tokens_js_1 = require_Tokens2();
    var Topups_js_1 = require_Topups();
    var Transfers_js_1 = require_Transfers();
    var WebhookEndpoints_js_1 = require_WebhookEndpoints();
    var index_js_1 = require_Apps();
    var index_js_2 = require_Billing();
    var index_js_3 = require_BillingPortal();
    var index_js_4 = require_Checkout();
    var index_js_5 = require_Climate();
    var index_js_6 = require_Entitlements();
    var index_js_7 = require_FinancialConnections();
    var index_js_8 = require_Forwarding();
    var index_js_9 = require_Identity();
    var index_js_10 = require_Issuing();
    var index_js_11 = require_Radar();
    var index_js_12 = require_Reporting();
    var index_js_13 = require_Sigma();
    var index_js_14 = require_Tax();
    var index_js_15 = require_Terminal();
    var index_js_16 = require_TestHelpers();
    var index_js_17 = require_Treasury2();
    var index_js_18 = require_V2();
    var index_js_19 = require_Reserve();
    var Events_js_1 = require_Events2();
    var resources_js_1 = require_resources();
    var DEFAULT_HOST = "api.stripe.com";
    var DEFAULT_PORT = "443";
    var DEFAULT_BASE_PATH = "/v1/";
    var DEFAULT_API_VERSION = apiVersion_js_1.ApiVersion;
    var DEFAULT_TIMEOUT = 8e4;
    var MAX_NETWORK_RETRY_DELAY_SEC = 5;
    var INITIAL_NETWORK_RETRY_DELAY_SEC = 0.5;
    var APP_INFO_PROPERTIES = [
      "name",
      "version",
      "url",
      "partner_id"
    ];
    var ALLOWED_CONFIG_PROPERTIES = [
      "authenticator",
      "apiVersion",
      "typescript",
      "maxNetworkRetries",
      "httpAgent",
      "httpClient",
      "timeout",
      "host",
      "port",
      "protocol",
      "telemetry",
      "emitEventBodies",
      "appInfo",
      "stripeAccount",
      "stripeContext"
    ];
    var defaultRequestSenderFactory = (stripe) => new RequestSender_js_1.RequestSender(stripe, StripeResource_js_1.StripeResource.MAX_BUFFERED_REQUEST_METRICS);
    var Stripe2 = class _Stripe {
      static initialize(platformFunctions, requestSenderFactory = defaultRequestSenderFactory) {
        _Stripe._platformFunctions = platformFunctions;
        _Stripe._requestSenderFactory = requestSenderFactory;
        _Stripe.webhooks = (0, Webhooks_js_1.createWebhooks)(platformFunctions);
        _Stripe.createNodeHttpClient = platformFunctions.createNodeHttpClient;
        _Stripe.createFetchHttpClient = platformFunctions.createFetchHttpClient;
        _Stripe.createNodeCryptoProvider = platformFunctions.createNodeCryptoProvider;
        _Stripe.createSubtleCryptoProvider = platformFunctions.createSubtleCryptoProvider;
        const env = platformFunctions.getEnv();
        const runtimeVersion = platformFunctions.getRuntimeVersion();
        _Stripe.aiAgent = env ? (0, utils_js_1.detectAIAgent)(env) : "";
        _Stripe.AI_AGENT = _Stripe.aiAgent;
        _Stripe.USER_AGENT = {
          bindings_version: _Stripe.PACKAGE_VERSION,
          lang: "node",
          typescript: false,
          ...runtimeVersion ? { lang_version: runtimeVersion } : {},
          ..._Stripe.aiAgent ? { ai_agent: _Stripe.aiAgent } : {}
        };
        _Stripe.SOURCE_HASH = platformFunctions.getSourceHash();
      }
      constructor(key, config = {}) {
        this._authenticator = null;
        const props = this._getPropsFromConfig(config);
        this._platformFunctions = _Stripe._platformFunctions;
        Object.defineProperty(this, "_emitter", {
          value: this._platformFunctions.createEmitter(),
          enumerable: false,
          configurable: false,
          writable: false
        });
        this.VERSION = _Stripe.PACKAGE_VERSION;
        this.on = this._emitter.on.bind(this._emitter);
        this.once = this._emitter.once.bind(this._emitter);
        this.off = this._emitter.removeListener.bind(this._emitter);
        const agent = props.httpAgent || null;
        this._api = {
          host: props.host || DEFAULT_HOST,
          port: props.port || DEFAULT_PORT,
          protocol: props.protocol || "https",
          basePath: DEFAULT_BASE_PATH,
          version: props.apiVersion || DEFAULT_API_VERSION,
          timeout: (0, utils_js_1.validateInteger)("timeout", props.timeout, DEFAULT_TIMEOUT),
          maxNetworkRetries: (0, utils_js_1.validateInteger)("maxNetworkRetries", props.maxNetworkRetries, 2),
          agent,
          httpClient: props.httpClient || (agent ? this._platformFunctions.createNodeHttpClient(agent) : this._platformFunctions.createDefaultHttpClient()),
          dev: false,
          stripeAccount: props.stripeAccount || null,
          stripeContext: props.stripeContext || null
        };
        const typescript = props.typescript || false;
        if (typescript !== _Stripe.USER_AGENT.typescript) {
          _Stripe.USER_AGENT.typescript = typescript;
        }
        if (props.appInfo) {
          this._setAppInfo(props.appInfo);
        }
        this._setAuthenticator(key, props.authenticator || null);
        this.errors = _Error;
        this.Decimal = shared_js_1.Decimal;
        this.webhooks = _Stripe.webhooks;
        this._prevRequestMetrics = [];
        this._enableTelemetry = props.telemetry !== false;
        this._emitEventBodies = props.emitEventBodies === true;
        this._requestSender = _Stripe._requestSenderFactory(this);
        this.accountLinks = new AccountLinks_js_1.AccountLinkResource(this);
        this.accountSessions = new AccountSessions_js_1.AccountSessionResource(this);
        this.accounts = new Accounts_js_1.AccountResource(this);
        this.applePayDomains = new ApplePayDomains_js_1.ApplePayDomainResource(this);
        this.applicationFees = new ApplicationFees_js_1.ApplicationFeeResource(this);
        this.balance = new Balance_js_1.BalanceResource(this);
        this.balanceSettings = new BalanceSettings_js_1.BalanceSettingResource(this);
        this.balanceTransactions = new BalanceTransactions_js_1.BalanceTransactionResource(this);
        this.charges = new Charges_js_1.ChargeResource(this);
        this.confirmationTokens = new ConfirmationTokens_js_1.ConfirmationTokenResource(this);
        this.countrySpecs = new CountrySpecs_js_1.CountrySpecResource(this);
        this.coupons = new Coupons_js_1.CouponResource(this);
        this.creditNotes = new CreditNotes_js_1.CreditNoteResource(this);
        this.customerSessions = new CustomerSessions_js_1.CustomerSessionResource(this);
        this.customers = new Customers_js_1.CustomerResource(this);
        this.disputes = new Disputes_js_1.DisputeResource(this);
        this.ephemeralKeys = new EphemeralKeys_js_1.EphemeralKeyResource(this);
        this.events = new Events_js_1.EventResource(this);
        this.exchangeRates = new ExchangeRates_js_1.ExchangeRateResource(this);
        this.fileLinks = new FileLinks_js_1.FileLinkResource(this);
        this.files = new Files_js_1.FileResource(this);
        this.invoiceItems = new InvoiceItems_js_1.InvoiceItemResource(this);
        this.invoicePayments = new InvoicePayments_js_1.InvoicePaymentResource(this);
        this.invoiceRenderingTemplates = new InvoiceRenderingTemplates_js_1.InvoiceRenderingTemplateResource(this);
        this.invoices = new Invoices_js_1.InvoiceResource(this);
        this.mandates = new Mandates_js_1.MandateResource(this);
        this.paymentAttemptRecords = new PaymentAttemptRecords_js_1.PaymentAttemptRecordResource(this);
        this.paymentIntents = new PaymentIntents_js_1.PaymentIntentResource(this);
        this.paymentLinks = new PaymentLinks_js_1.PaymentLinkResource(this);
        this.paymentMethodConfigurations = new PaymentMethodConfigurations_js_1.PaymentMethodConfigurationResource(this);
        this.paymentMethodDomains = new PaymentMethodDomains_js_1.PaymentMethodDomainResource(this);
        this.paymentMethods = new PaymentMethods_js_1.PaymentMethodResource(this);
        this.paymentRecords = new PaymentRecords_js_1.PaymentRecordResource(this);
        this.payouts = new Payouts_js_1.PayoutResource(this);
        this.plans = new Plans_js_1.PlanResource(this);
        this.prices = new Prices_js_1.PriceResource(this);
        this.products = new Products_js_1.ProductResource(this);
        this.promotionCodes = new PromotionCodes_js_1.PromotionCodeResource(this);
        this.quotes = new Quotes_js_1.QuoteResource(this);
        this.refunds = new Refunds_js_1.RefundResource(this);
        this.reviews = new Reviews_js_1.ReviewResource(this);
        this.setupAttempts = new SetupAttempts_js_1.SetupAttemptResource(this);
        this.setupIntents = new SetupIntents_js_1.SetupIntentResource(this);
        this.shippingRates = new ShippingRates_js_1.ShippingRateResource(this);
        this.sources = new Sources_js_1.SourceResource(this);
        this.subscriptionItems = new SubscriptionItems_js_1.SubscriptionItemResource(this);
        this.subscriptionSchedules = new SubscriptionSchedules_js_1.SubscriptionScheduleResource(this);
        this.subscriptions = new Subscriptions_js_1.SubscriptionResource(this);
        this.taxCodes = new TaxCodes_js_1.TaxCodeResource(this);
        this.taxIds = new TaxIds_js_1.TaxIdResource(this);
        this.taxRates = new TaxRates_js_1.TaxRateResource(this);
        this.tokens = new Tokens_js_1.TokenResource(this);
        this.topups = new Topups_js_1.TopupResource(this);
        this.transfers = new Transfers_js_1.TransferResource(this);
        this.webhookEndpoints = new WebhookEndpoints_js_1.WebhookEndpointResource(this);
        this.apps = new index_js_1.Apps(this);
        this.billing = new index_js_2.Billing(this);
        this.billingPortal = new index_js_3.BillingPortal(this);
        this.checkout = new index_js_4.Checkout(this);
        this.climate = new index_js_5.Climate(this);
        this.entitlements = new index_js_6.Entitlements(this);
        this.financialConnections = new index_js_7.FinancialConnections(this);
        this.forwarding = new index_js_8.Forwarding(this);
        this.identity = new index_js_9.Identity(this);
        this.issuing = new index_js_10.Issuing(this);
        this.radar = new index_js_11.Radar(this);
        this.reporting = new index_js_12.Reporting(this);
        this.sigma = new index_js_13.Sigma(this);
        this.tax = new index_js_14.Tax(this);
        this.terminal = new index_js_15.Terminal(this);
        this.testHelpers = new index_js_16.TestHelpers(this);
        this.treasury = new index_js_17.Treasury(this);
        this.v2 = new index_js_18.V2(this);
        this.account = this.accounts;
        this.oauth = new resources_js_1.OAuthResource(this);
      }
      /**
       * Allows for sending "raw" requests to the Stripe API, which can be used for
       * testing new API endpoints or performing requests that the library does
       * not support yet.
       *
       * @param method - HTTP request method, 'GET', 'POST', or 'DELETE'
       * @param path - The path of the request, e.g. '/v1/beta_endpoint'
       * @param params - The parameters to include in the request body.
       * @param options - Additional request options.
       */
      rawRequest(method, path, params, options) {
        return this._requestSender._rawRequest(method, path, params, options);
      }
      /**
       * @private
       */
      _setAuthenticator(key, authenticator) {
        if (key && authenticator) {
          throw new Error("Can't specify both apiKey and authenticator");
        }
        if (!key && !authenticator) {
          throw new Error("Neither apiKey nor config.authenticator provided");
        }
        this._authenticator = key ? (0, utils_js_1.createApiKeyAuthenticator)(key) : authenticator;
      }
      /**
       * @private
       * This may be removed in the future.
       */
      _setAppInfo(info) {
        if (info && typeof info !== "object") {
          throw new Error("AppInfo must be an object.");
        }
        if (info && !info.name) {
          throw new Error("AppInfo.name is required");
        }
        info = info || {};
        this._appInfo = APP_INFO_PROPERTIES.reduce((accum, prop) => {
          if (typeof info[prop] == "string") {
            accum = accum || {};
            accum[prop] = info[prop];
          }
          return accum;
        }, {});
      }
      setClientId(clientId) {
        this._clientId = clientId;
      }
      getClientId() {
        return this._clientId;
      }
      /**
       * @private
       * Please open or upvote an issue at github.com/stripe/stripe-node
       * if you use this, detailing your use-case.
       *
       * It may be deprecated and removed in the future.
       */
      getConstant(c) {
        switch (c) {
          case "DEFAULT_HOST":
            return DEFAULT_HOST;
          case "DEFAULT_PORT":
            return DEFAULT_PORT;
          case "DEFAULT_BASE_PATH":
            return DEFAULT_BASE_PATH;
          case "DEFAULT_API_VERSION":
            return DEFAULT_API_VERSION;
          case "DEFAULT_TIMEOUT":
            return DEFAULT_TIMEOUT;
          case "MAX_NETWORK_RETRY_DELAY_SEC":
            return MAX_NETWORK_RETRY_DELAY_SEC;
          case "INITIAL_NETWORK_RETRY_DELAY_SEC":
            return INITIAL_NETWORK_RETRY_DELAY_SEC;
        }
        return _Stripe[c];
      }
      resolveBaseAddress(apiBase) {
        const instanceHost = this.getApiField("host");
        if (instanceHost !== DEFAULT_HOST) {
          return instanceHost;
        }
        return Types_js_1.DEFAULT_BASE_ADDRESSES[apiBase];
      }
      getMaxNetworkRetries() {
        return this.getApiField("maxNetworkRetries");
      }
      /**
       * @private
       * This may be removed in the future.
       */
      _setApiNumberField(prop, n, defaultVal) {
        const val = (0, utils_js_1.validateInteger)(prop, n, defaultVal);
        this._setApiField(prop, val);
      }
      getMaxNetworkRetryDelay() {
        return MAX_NETWORK_RETRY_DELAY_SEC;
      }
      getInitialNetworkRetryDelay() {
        return INITIAL_NETWORK_RETRY_DELAY_SEC;
      }
      /**
       * @private
       * Please open or upvote an issue at github.com/stripe/stripe-node
       * if you use this, detailing your use-case.
       *
       * It may be deprecated and removed in the future.
       *
       * Gets a JSON version of a User-Agent and uses a cached version for a slight
       * speed advantage.
       */
      getClientUserAgent(cb) {
        return this.getClientUserAgentSeeded(_Stripe.USER_AGENT, cb);
      }
      /**
       * @private
       * Please open or upvote an issue at github.com/stripe/stripe-node
       * if you use this, detailing your use-case.
       *
       * It may be deprecated and removed in the future.
       *
       * Gets a JSON version of a User-Agent by encoding a seeded object and
       * fetching a uname from the system.
       */
      getClientUserAgentSeeded(seed, cb) {
        const userAgent = {};
        for (const field in seed) {
          if (!Object.prototype.hasOwnProperty.call(seed, field)) {
            continue;
          }
          userAgent[field] = encodeURIComponent(seed[field] ?? "null");
        }
        const platformInfo = this._platformFunctions.getPlatformInfo();
        if (platformInfo && this.getTelemetryEnabled()) {
          userAgent.platform = encodeURIComponent(platformInfo);
        } else {
          delete userAgent.platform;
        }
        const client = this.getApiField("httpClient");
        if (client) {
          userAgent.httplib = encodeURIComponent(client.getClientName());
        }
        if (this._appInfo) {
          userAgent.application = this._appInfo;
        }
        if (_Stripe.SOURCE_HASH) {
          userAgent.source = _Stripe.SOURCE_HASH;
        }
        cb(JSON.stringify(userAgent));
      }
      /**
       * @private
       * Please open or upvote an issue at github.com/stripe/stripe-node
       * if you use this, detailing your use-case.
       *
       * It may be deprecated and removed in the future.
       */
      getAppInfoAsString() {
        if (!this._appInfo) {
          return "";
        }
        let formatted = this._appInfo.name;
        if (this._appInfo.version) {
          formatted += `/${this._appInfo.version}`;
        }
        if (this._appInfo.url) {
          formatted += ` (${this._appInfo.url})`;
        }
        return formatted;
      }
      getTelemetryEnabled() {
        return this._enableTelemetry;
      }
      getEmitEventBodiesEnabled() {
        return this._emitEventBodies;
      }
      /**
       * @private
       * This may be removed in the future.
       */
      _prepResources() {
        for (const name in resources) {
          if (!Object.prototype.hasOwnProperty.call(resources, name)) {
            continue;
          }
          this[(0, utils_js_1.pascalToCamelCase)(name.replace("Resource", ""))] = new resources[name](this);
        }
      }
      /**
       * @private
       * This may be removed in the future.
       */
      _getPropsFromConfig(config) {
        if (!config) {
          return {};
        }
        const isString = typeof config === "string";
        const isObject = config === Object(config) && !Array.isArray(config);
        if (!isObject && !isString) {
          throw new Error("Config must either be an object or a string");
        }
        if (isString) {
          return {
            apiVersion: config
          };
        }
        const values = Object.keys(config).filter((value) => !ALLOWED_CONFIG_PROPERTIES.includes(value));
        if (values.length > 0) {
          throw new Error(`Config object may only contain the following: ${ALLOWED_CONFIG_PROPERTIES.join(", ")}`);
        }
        return config;
      }
      /**
       * @private
       * This may be removed in the future.
       */
      _setApiField(key, value) {
        this._api[key] = value;
      }
      /**
       * @private
       * Please open or upvote an issue at github.com/stripe/stripe-node
       * if you use this, detailing your use-case.
       *
       * It may be deprecated and removed in the future.
       */
      getApiField(key) {
        return this._api[key];
      }
      parseEventNotification(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
        if (!this.webhooks.signature) {
          throw new Error("ERR: missing signature helper, unable to verify");
        }
        this.webhooks.signature.verifyHeader(payload, header, secret, tolerance || this.webhooks.DEFAULT_TOLERANCE, cryptoProvider || this._platformFunctions.createDefaultCryptoProvider(), receivedAt);
        const eventNotification = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
        if (eventNotification && eventNotification.object === "event") {
          throw new Error("You passed a webhook payload to stripe.parseEventNotification, which expects an event notification. Use stripe.webhooks.constructEvent instead.");
        }
        if (eventNotification.context) {
          eventNotification.context = StripeContext_js_1.StripeContext.parse(eventNotification.context);
        }
        eventNotification.fetchEvent = () => {
          return this._requestSender._rawRequest("GET", `/v2/core/events/${eventNotification.id}`, void 0, {
            stripeContext: eventNotification.context,
            headers: {
              "Stripe-Request-Trigger": `event=${eventNotification.id}`
            }
          }, ["fetch_event"]);
        };
        eventNotification.fetchRelatedObject = () => {
          if (!eventNotification.related_object) {
            return Promise.resolve(null);
          }
          return this._requestSender._rawRequest("GET", eventNotification.related_object.url, void 0, {
            stripeContext: eventNotification.context,
            headers: {
              "Stripe-Request-Trigger": `event=${eventNotification.id}`
            }
          }, ["fetch_related_object"]);
        };
        return eventNotification;
      }
      async parseEventNotificationAsync(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
        if (!this.webhooks.signature) {
          throw new Error("ERR: missing signature helper, unable to verify");
        }
        await this.webhooks.signature.verifyHeaderAsync(payload, header, secret, tolerance || this.webhooks.DEFAULT_TOLERANCE, cryptoProvider || this._platformFunctions.createDefaultCryptoProvider(), receivedAt);
        const eventNotification = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
        if (eventNotification && eventNotification.object === "event") {
          throw new Error("You passed a webhook payload to stripe.parseEventNotificationAsync, which expects an event notification. Use stripe.webhooks.constructEventAsync instead.");
        }
        if (eventNotification.context) {
          eventNotification.context = StripeContext_js_1.StripeContext.parse(eventNotification.context);
        }
        eventNotification.fetchEvent = () => {
          return this._requestSender._rawRequest("GET", `/v2/core/events/${eventNotification.id}`, void 0, {
            stripeContext: eventNotification.context,
            headers: {
              "Stripe-Request-Trigger": `event=${eventNotification.id}`
            }
          }, ["fetch_event"]);
        };
        eventNotification.fetchRelatedObject = () => {
          if (!eventNotification.related_object) {
            return Promise.resolve(null);
          }
          return this._requestSender._rawRequest("GET", eventNotification.related_object.url, void 0, {
            stripeContext: eventNotification.context,
            headers: {
              "Stripe-Request-Trigger": `event=${eventNotification.id}`
            }
          }, ["fetch_related_object"]);
        };
        return eventNotification;
      }
    };
    exports2.Stripe = Stripe2;
    Stripe2.PACKAGE_VERSION = "22.3.1";
    Stripe2.API_VERSION = apiVersion_js_1.ApiVersion;
    Stripe2.aiAgent = "";
    Stripe2.AI_AGENT = "";
    Stripe2.USER_AGENT = {
      bindings_version: Stripe2.PACKAGE_VERSION,
      lang: "node",
      typescript: false
    };
    Stripe2.SOURCE_HASH = null;
    Stripe2.StripeResource = StripeResource_js_1.StripeResource;
    Stripe2.resources = resources;
    Stripe2.HttpClient = HttpClient_js_1.HttpClient;
    Stripe2.HttpClientResponse = HttpClient_js_1.HttpClientResponse;
    Stripe2.CryptoProvider = CryptoProvider_js_1.CryptoProvider;
    Stripe2.StripeContext = StripeContext_js_1.StripeContext;
    Stripe2.errors = _Error;
    Stripe2.Decimal = shared_js_1.Decimal;
    Stripe2._requestSenderFactory = defaultRequestSenderFactory;
    function createStripe(platformFunctions, requestSender = defaultRequestSenderFactory) {
      Stripe2.initialize(platformFunctions, requestSender);
      return Stripe2;
    }
    exports2.createStripe = createStripe;
  }
});

// node_modules/stripe/cjs/stripe.cjs.node.js
var require_stripe_cjs_node = __commonJS({
  "node_modules/stripe/cjs/stripe.cjs.node.js"(exports2, module2) {
    "use strict";
    var NodePlatformFunctions_js_1 = require_NodePlatformFunctions();
    var stripe_core_js_1 = require_stripe_core();
    stripe_core_js_1.Stripe.initialize(new NodePlatformFunctions_js_1.NodePlatformFunctions());
    var StripeConstructor = function(key, config) {
      if (!(this instanceof StripeConstructor)) {
        return new stripe_core_js_1.Stripe(key, config);
      }
      return new stripe_core_js_1.Stripe(key, config);
    };
    Object.setPrototypeOf(StripeConstructor, stripe_core_js_1.Stripe);
    Object.setPrototypeOf(StripeConstructor.prototype, stripe_core_js_1.Stripe.prototype);
    for (const key of Object.getOwnPropertyNames(stripe_core_js_1.Stripe)) {
      if (key !== "length" && key !== "prototype" && key !== "name") {
        Object.defineProperty(StripeConstructor, key, {
          value: stripe_core_js_1.Stripe[key],
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    module2.exports = StripeConstructor;
  }
});

// netlify/functions/create-checkout-session.js
var Stripe = require_stripe_cjs_node();

const ALLOWED_ORIGINS = ["https://beanbrosbrewingco.com", "http://localhost:8888"];

// Source of truth for prices \u2014 never trust price/quantity fields from the client.
// Keep in sync with shopify-products.csv.
const PRODUCT_CATALOG = {
  "ethiopian yirgacheffe": { name: "Ethiopian Yirgacheffe", price: 18.99 },
  "colombian supremo": { name: "Colombian Supremo", price: 16.99 },
  "guatemalan antigua": { name: "Guatemalan Antigua", price: 17.99 },
  "sumatra mandheling": { name: "Sumatra Mandheling", price: 17.99 },
  "costa rica tarraz\xFA": { name: "Costa Rica Tarraz\xFA", price: 18.99 },
  "kenya aa": { name: "Kenya AA", price: 19.99 },
  "house blend": { name: "House Blend", price: 14.99 },
  "brazilian santos": { name: "Brazilian Santos", price: 15.99 }
};
const SUBSCRIBE_DISCOUNT = 0.1;

function corsOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function isAllowedRedirect(url) {
  return typeof url === "string" && ALLOWED_ORIGINS.some((o) => url.startsWith(o));
}

exports.handler = async (event) => {
  const allowOrigin = corsOrigin(event);
  const baseHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: baseHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is not set in the Netlify environment");
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: "Payments are not configured on the server yet." })
    };
  }

  try {
    const { items, successUrl, cancelUrl } = JSON.parse(event.body || "{}");
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "No items in cart" }) };
    }
    if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "Invalid redirect URL" }) };
    }

    const items_ = items.map((item) => {
      const catalogEntry = PRODUCT_CATALOG[String(item.name || "").trim().toLowerCase()];
      if (!catalogEntry) {
        throw new Error(`Unknown product: ${item.name}`);
      }
      const quantity = Math.max(1, Math.min(50, parseInt(item.quantity, 10) || 1));
      const isSubscription = !!item.isSubscription;
      const price = isSubscription
        ? Math.round(catalogEntry.price * (1 - SUBSCRIBE_DISCOUNT) * 100) / 100
        : catalogEntry.price;
      return {
        name: catalogEntry.name,
        grindLabel: String(item.grindLabel || "").slice(0, 40),
        frequencyLabel: String(item.frequencyLabel || "").slice(0, 40),
        frequency: String(item.frequency || "").slice(0, 20),
        isSubscription,
        quantity,
        price
      };
    });

    const stripe = new Stripe(secretKey);
    const line_items = items_.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: `${item.grindLabel}${item.isSubscription ? ` \xB7 ${item.frequencyLabel}` : ""}`
        },
        unit_amount: Math.round(item.price * 100),
        ...item.isSubscription ? {
          recurring: {
            interval: item.frequency === "weekly" ? "week" : "month",
            interval_count: 1
          }
        } : {}
      },
      quantity: item.quantity
    }));
    const hasSubscription = items_.some((i) => i.isSubscription);
    const hasOneTime = items_.some((i) => !i.isSubscription);
    let mode = "payment";
    let sessionLineItems = line_items;
    if (hasSubscription && !hasOneTime) {
      mode = "subscription";
    } else {
      sessionLineItems = items_.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: `${item.grindLabel}${item.isSubscription ? ` \xB7 Subscribe & Save (${item.frequencyLabel})` : ""}`
          },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      }));
    }
    const shipping_options = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "UPS Ground (Free)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 7 }
          }
        }
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 999, currency: "usd" },
          display_name: "UPS 3 Day Select",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 3 }
          }
        }
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 1499, currency: "usd" },
          display_name: "UPS 2nd Day Air",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 2 },
            maximum: { unit: "business_day", value: 2 }
          }
        }
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 2499, currency: "usd" },
          display_name: "UPS Next Day Air",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 1 },
            maximum: { unit: "business_day", value: 1 }
          }
        }
      }
    ];
    const sessionConfig = {
      mode,
      line_items: sessionLineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      payment_method_types: ["card"]
    };
    if (mode === "payment") {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ["US"]
      };
      sessionConfig.shipping_options = shipping_options;
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return {
      statusCode: 200,
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, sessionId: session.id })
    };
  } catch (err) {
    console.error("Stripe Checkout error:", err.message);
    return {
      statusCode: 400,
      headers: baseHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
