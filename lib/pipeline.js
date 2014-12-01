'use strict';

var bind = function(object, method) {
  return function() {
    return object[method].apply(object, arguments);
  };
};

var Pipeline = function(sessions) {
  var nextIn, nextOut;

  for (var i = 0, n = sessions.length; i < n; i++) {
    nextIn  = new Queue(bind(sessions[i], 'processIncomingMessage'), nextIn);
    nextOut = new Queue(bind(sessions[n-1-i], 'processOutgoingMessage'), nextOut);
  }
  this._in  = nextIn;
  this._out = nextOut;
};

Pipeline.prototype.processIncomingMessage = function(message, callback, context) {
  if (this._in)
    this._in.push({message: message, callback: callback, context: context});
  else
    callback.call(context, null, message);
};

Pipeline.prototype.processOutgoingMessage = function(message, callback, context) {
  if (this._out)
    this._out.push({message: message, callback: callback, context: context});
  else
    callback.call(context, null, message);
};

var Queue = function(fn, next) {
  this._fn    = fn;
  this._next  = next;
  this._inbox = [];
};

Queue.prototype.push = function(record) {
  var inbox = this._inbox, next = this._next, self = this;

  record.done = false;
  inbox.push(record);

  this._fn(record.message, function(error, msg) {
    if (error) return record.callback.call(record.context, error, null);

    record.message = msg;
    record.done    = true;

    while (inbox.length > 0 && inbox[0].done) {
      record = inbox.shift();
      if (next)
        next.push(record);
      else
        record.callback.call(record.context, null, record.message);
    }
  });
};

module.exports = Pipeline;
