'use strict';

var Functor = require('./cell'),
    Pledge  = require('./pledge');

var Pipeline = function(sessions) {
  this._functors = sessions.map(function(session) { return new Functor(session) });
  this._stopped  = {incoming: false, outgoing: false};
};

Pipeline.prototype.processIncomingMessage = function(message, callback, context) {
  if (this._stopped.incoming) return;
  this._loop('incoming', this._functors.length - 1, -1, -1, message, callback, context);
};

Pipeline.prototype.processOutgoingMessage = function(message, callback, context) {
  if (this._stopped.outgoing) return;
  this._loop('outgoing', 0, this._functors.length, 1, message, callback, context);
};

Pipeline.prototype.close = function(callback, context) {
  this._stopped = {incoming: true, outgoing: true};

  var closed = this._functors.map(function(a) { return a.close() });
  if (callback)
    Pledge.all(closed).then(function() { callback.call(context) });
};

Pipeline.prototype._loop = function(direction, start, end, step, message, callback, context) {
  var functors = this._functors,
      n        = functors.length,
      self     = this;

  while (n--) functors[n].pending(direction);

  var pipe = function(index, error, msg) {
    if (index === end) return callback.call(context, error, msg);

    functors[index][direction](error, msg, function(err, m) {
      if (err) self._stopped[direction] = true;
      pipe(index + step, err, m);
    });
  };
  pipe(start, null, message);
};

module.exports = Pipeline;
