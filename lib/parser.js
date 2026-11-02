'use strict';

// RFC 6455 grammar rules:
//
//      Sec-WebSocket-Extensions = extension-list
//
//      extension-list    = 1#extension
//
//      extension         = extension-token *( ";" extension-param )
//
//      extension-token   = registered-token
//
//      registered-token  = token
//
//      extension-param   = token [ "=" (token | quoted-string) ]
//           ; When using the quoted-string syntax variant, the value
//           ; after quoted-string unescaping MUST conform to the
//           ; 'token' ABNF.
//
// These make use of the following rules from RFC 2616:
//
//      token          = 1*<any CHAR except CTLs or separators>
//
//      separators     = "(" | ")" | "<" | ">" | "@"
//                     | "," | ";" | ":" | "\" | <">
//                     | "/" | "[" | "]" | "?" | "="
//                     | "{" | "}" | SP | HT
//
//      quoted-string  = ( <"> *(qdtext | quoted-pair ) <"> )
//
//      qdtext         = <any TEXT except <">>
//
//      quoted-pair    = "\" CHAR
//
//      CHAR           = <any US-ASCII character (octets 0 - 127)>
//
//      CTL            = <any US-ASCII control character
//                       (octets 0 - 31) and DEL (127)>
//
//      TEXT           = <any OCTET except CTLs, but including LWS>
//
//      LWS            = [CRLF] 1*( SP | HT )
//
//      SP             = <US-ASCII SP, space (32)>
//
//      HT             = <US-ASCII HT, horizontal-tab (9)>

var TOKEN    = /([!#\$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+)/,
    NOTOKEN  = /([^!#\$%&'\*\+\-\.\^_`\|~0-9A-Za-z])/g,
    QUOTED   = /"((?:\\[\x00-\x7f]|[^\x00-\x08\x0a-\x1f\x7f"\\])*)"/,
    NUMBER   = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/,

    LWS      = /[ \t]*(?:\r\n[ \t]+)*/,
    EQL      = new RegExp(LWS.source + '=' + LWS.source),
    SEM      = new RegExp(LWS.source + ';' + LWS.source),
    COM      = new RegExp(LWS.source + ',' + LWS.source),

    PARAM    = new RegExp(TOKEN.source + '(?:' + EQL.source + '(?:' + TOKEN.source + '|' + QUOTED.source + '))?'),
    EXT      = new RegExp(TOKEN.source + '(?:' + SEM.source + PARAM.source + ')*', 'g'),
    EXT_LIST = new RegExp('^' + EXT.source + '(?:' + COM.source + EXT.source + ')*$');

var hasOwnProperty = Object.prototype.hasOwnProperty;

var Parser = {
  parseHeader: function(header) {
    var offers = new Offers();
    if (header === '' || header === undefined) return offers;

    if (!EXT_LIST.test(header))
      throw new SyntaxError('Invalid Sec-WebSocket-Extensions header: ' + header);

    var values = header.match(EXT);

    values.forEach(function(value) {
      var params = value.match(new RegExp(PARAM.source, 'g')),
          name   = params.shift(),
          offer  = {};

      params.forEach(function(param) {
        var args = param.match(PARAM), key = args[1], data;

        if (args[2] !== undefined) {
          data = args[2];
        } else if (args[3] !== undefined) {
          data = args[3].replace(/\\/g, '');
        } else {
          data = true;
        }
        if (NUMBER.test(data)) data = parseFloat(data);

        if (hasOwnProperty.call(offer, key)) {
          offer[key] = [].concat(offer[key]);
          offer[key].push(data);
        } else {
          offer[key] = data;
        }
      });

      offers.push(name, offer);
    });

    return offers;
  },

  serializeParams: function(name, params) {
    var values = [];

    var print = function(key, value) {
      if (value instanceof Array) {
        value.forEach(function(v) { print(key, v) });
      } else if (value === true) {
        values.push(key);
      } else if (typeof value === 'number') {
        values.push(key + '=' + value);
      } else if (NOTOKEN.test(value)) {
        values.push(key + '="' + value.replace(/"/g, '\\"') + '"');
      } else {
        values.push(key + '=' + value);
      }
    };

    for (var key in params) print(key, params[key]);

    return [name].concat(values).join('; ');
  }
};

var Offers = function() {
  this._byName  = {};
  this._inOrder = [];
};

Offers.prototype.push = function(name, params) {
  if (!hasOwnProperty.call(this._byName, name))
    this._byName[name] = [];

  this._byName[name].push(params);
  this._inOrder.push({ name: name, params: params });
};

Offers.prototype.eachOffer = function(callback, context) {
  var list = this._inOrder;
  for (var i = 0, n = list.length; i < n; i++)
    callback.call(context, list[i].name, list[i].params);
};

Offers.prototype.byName = function(name) {
  return this._byName[name] || [];
};

Offers.prototype.toArray = function() {
  return this._inOrder.slice();
};

module.exports = Parser;
