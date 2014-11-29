'use strict';

var Parser = require('./parser');

var Extensions = function() {
  this._rsv1 = this._rsv2 = this._rsv3 = false;

  this._byName   = {};
  this._inOrder  = [];
  this._sessions = [];
  this._index    = {}
};

var instance = {
  add: function(ext) {
    if (typeof ext.name !== 'string') throw new TypeError('extension.name must be a string');
    if (ext.type !== 'permessage') throw new TypeError('extension.type must be "permessage"');

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

      sessions.push(session);
      index[ext.name] = {ext: ext, session: session};

      var offers = session.generateOffer();
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
    var responses = Parser.parseHeader(header);

    this._sessions = [];

    responses.eachOffer(function(name, params) {
      var record = this._index[name];

      if (!record)
        throw new Error('Server sent an extension response for unknown extension "' + name + '"');

      var ext      = record.ext,
          session  = record.session,
          reserved = this._reserved(ext);

      if (reserved)
        throw new Error('Server sent two extension responses that use the RSV' +
                        reserved[0] + ' bit: "' +
                        reserved[1] + '" and "' + ext.name + '"');

      if (session.activate(params) !== true)
        throw new Error('Server sent unacceptable extension parameters: ' +
                        Parser.serializeParams(name, params));

      this._reserve(ext);
      this._sessions.push(session);
    }, this);
  },

  generateResponse: function(header) {
    var offers   = Parser.parseHeader(header),
        sessions = [],
        response = [],
        self     = this;

    this._inOrder.forEach(function(ext) {
      var offer = offers.byName(ext.name);
      if (offer.length === 0 || this._reserved(ext)) return;

      offer = [].concat(offer);
      var session = ext && ext.createServerSession(offer);
      if (!session) return;

      this._reserve(ext);
      sessions.push(session);
      response.push(Parser.serializeParams(ext.name, session.generateResponse()));
    }, this);

    this._sessions = sessions;
    return response.length > 0 ? response.join(', ') : null;
  },

  validFrameRsv: function(frame) {
    var allowed = {rsv1: false, rsv2: false, rsv3: false},
        policy;

    for (var i = 0, n = this._sessions.length; i < n; i++) {
      policy = this._sessions[i].validFrameRsv(frame);
      allowed.rsv1 = allowed.rsv1 || policy.rsv1;
      allowed.rsv2 = allowed.rsv2 || policy.rsv2;
      allowed.rsv3 = allowed.rsv3 || policy.rsv3;
    }
    return (allowed.rsv1 || !frame.rsv1) &&
           (allowed.rsv2 || !frame.rsv2) &&
           (allowed.rsv3 || !frame.rsv3);
  },

  processIncomingMessage: function(message, callback, context) {
    var sessions = this._sessions.slice();

    var pipe = function(error, msg) {
      if (error) return callback.call(context, error, null);
      var session = sessions.pop();
      if (!session) return callback.call(context, null, msg);
      session.processIncomingMessage(msg, pipe);
    };
    pipe(null, message);
  },

  processOutgoingMessage: function(message, callback, context) {
    var sessions = this._sessions.slice();

    var pipe = function(error, msg) {
      if (error) return callback.call(context, error, null);
      var session = sessions.shift();
      if (!session) return callback.call(context, null, msg);
      session.processOutgoingMessage(msg, pipe);
    };
    pipe(null, message);
  },

  close: function() {
    for (var i = 0, n = this._sessions.length; i < n; i++) {
      try {
        this._sessions[i].close();
      } catch (e) {}
    }
  },

  _reserve: function(ext) {
    this._rsv1 = this._rsv1 || (ext.rsv1 && ext.name);
    this._rsv2 = this._rsv2 || (ext.rsv2 && ext.name);
    this._rsv3 = this._rsv3 || (ext.rsv3 && ext.name);
  },

  _reserved: function(ext) {
    if (this._rsv1 && ext.rsv1) return [1, this._rsv1];
    if (this._rsv2 && ext.rsv2) return [2, this._rsv2];
    if (this._rsv3 && ext.rsv3) return [3, this._rsv3];
    return false;
  }
};

for (var key in instance)
  Extensions.prototype[key] = instance[key];

module.exports = Extensions;
