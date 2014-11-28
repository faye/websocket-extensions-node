'use strict';

var TOKEN    = /([!#\$%&'\*\+\-\.\^_`\|~0-9a-z]+)/,
    NOTOKEN  = /([^!#\$%&'\*\+\-\.\^_`\|~0-9a-z])/g,
    QUOTED   = /"((?:\\[\x00-\x7f]|[^\x00-\x08\x0a-\x1f\x7f"])*)"/,
    PARAM    = new RegExp(TOKEN.source + '(?:=(?:' + TOKEN.source + '|' + QUOTED.source + '))?'),
    EXT      = new RegExp(TOKEN.source + '(?: *; *' + PARAM.source + ')*', 'g'),
    EXT_LIST = new RegExp('^' + EXT.source + '(?: *, *' + EXT.source + ')*$'),
    NUMBER   = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;

var Parser = {
  parseHeader: function(header) {
    if (header === '' || header === undefined) return [];

    if (!EXT_LIST.test(header))
      throw new SyntaxError('Invalid Sec-WebSocket-Extensions header: ' + header);

    var values = header.match(EXT), offers = [];

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

        this._push(offer, key, data);
      }, this);
      offers.push({name: name, params: offer});
    }, this);

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
  },

  _push: function(object, key, value) {
    if (object.hasOwnProperty(key)) {
      object[key] = [].concat(object[key]);
      object[key].push(value);
    } else {
      object[key] = value;
    }
  }
};

module.exports = Parser;
