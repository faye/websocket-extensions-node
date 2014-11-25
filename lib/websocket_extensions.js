'use strict';

var events = require('events'),
    util   = require('util'),
    Parser = require('./parser');

var Extensions = function() {
  events.EventEmitter.apply(this);
  this._rsv1 = this._rsv2 = this._rsv3 = false;

  this._byName   = {};
  this._inOrder  = [];
  this._sessions = [];
};
util.inherits(Extensions, events.EventEmitter);

var instance = {
  add: function(ext) {
    if (typeof ext.name !== 'string') throw new TypeError('extension.name must be a string');

    if (typeof ext.rsv1 !== 'boolean') throw new TypeError('extension.rsv1 must be true or false');
    if (typeof ext.rsv2 !== 'boolean') throw new TypeError('extension.rsv2 must be true or false');
    if (typeof ext.rsv3 !== 'boolean') throw new TypeError('extension.rsv3 must be true or false');

    if (this._byName.hasOwnProperty(ext.name))
      throw new TypeError('An extension with name "' + ext.name + '" is already registered');

    this._byName[ext.name] = ext;
    this._inOrder.push(ext);
  },

  generateOffer: function() {
    var sessions = [],
        offer    = [],
        index    = {},
        self     = this;

    this._inOrder.forEach(function(ext) {
      var session = ext.createClientSession();
      if (!session) return;

      session.on('error', function(error) {
        self.emit('error', error);
      });

      sessions.push(session);
      index[ext.name] = {ext: ext, session: session};

      var offers = session.generateOffers();
      offers = offers ? [].concat(offers) : [];

      offers.forEach(function(off) {
        offer.push(Parser.serializeParams(ext.name, off));
      }, this);
    }, this);

    this._sessions = sessions;
    this._index    = index;

    return offer.length > 0 ? offer.join(', ') : null;
  },

  activate: function(header) {
    var responses = Parser.parseHeader(header),
        active    = [],
        record, ext, session;

    for (var name in responses) {
      record  = this._index[name];
      ext     = record.ext;
      session = record.session;

      if (this._reserved(ext)) continue;
      this._reserve(ext);

      session.activate(responses[name]);
      active.push(session);
    }

    this._sessions = this._sessions.filter(function(session) {
      return active.indexOf(session) >= 0;
    });
  },

  generateResponse: function(header) {
    var offers   = Parser.parseHeader(header),
        sessions = [],
        response = [],
        self     = this;

    this._inOrder.forEach(function(ext) {
      var offer = offers[ext.name];
      if (!offer || this._reserved(ext)) return;

      offer = [].concat(offer);
      var session = ext && ext.createServerSession(offer);
      if (!session) return;

      session.on('error', function(error) {
        self.emit('error', error);
      });

      this._reserve(ext);
      sessions.push(session);
      response.push(Parser.serializeParams(ext.name, session.generateResponse()));
    }, this);

    this._sessions = sessions;
    return response.length > 0 ? response.join(', ') : null;
  },

  processIncomingMessage: function(message, callback, context) {
    var sessions = this._sessions.slice();

    var pipe = function(msg) {
      var session = sessions.pop();
      if (!session) return callback.call(context, msg);
      session.processIncomingMessage(msg, pipe);
    };
    pipe(message);
  },

  processOutgoingMessage: function(message, callback, context) {
    var sessions = this._sessions.slice();

    var pipe = function(msg) {
      var session = sessions.shift();
      if (!session) return callback.call(context, msg);
      session.processOutgoingMessage(msg, pipe);
    };
    pipe(message);
  },

  validFrame: function(frame) {
    return (this._rsv1 || !frame.rsv1) && (this._rsv2 || !frame.rsv2) && (this._rsv3 || !frame.rsv3);
  },

  _reserve: function(ext) {
    this._rsv1 = this._rsv1 || ext.rsv1;
    this._rsv2 = this._rsv2 || ext.rsv2;
    this._rsv3 = this._rsv3 || ext.rsv3;
  },

  _reserved: function(ext) {
    return (this._rsv1 && ext.rsv1) || (this._rsv2 && ext.rsv2) || (this._rsv3 && ext.rsv3);
  }
};

for (var key in instance)
  Extensions.prototype[key] = instance[key];

module.exports = Extensions;
