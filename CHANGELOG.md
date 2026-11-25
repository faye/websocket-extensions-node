### 0.3.0 / 2026-11-25

- Refuse to serialize parameter values that do not conform to the `token`
  grammar, c.f. RFC 6455:

  > When using the quoted-string syntax variant, the value after quoted-string
  > unescaping MUST conform to the 'token' ABNF.

### 0.2.0 / 2026-11-16

- Add an `options` argument to the `new Extensions()` constructor, to provide
  configuration parameters that should be passed on to individual extensions
- Extend the header field parser to handle whitespace as required by the spec

### 0.1.4 / 2020-06-02

- Remove a ReDoS vulnerability in the header parser (CVE-2020-7662, reported by
  Robert McLaughlin)
- Change license from MIT to Apache 2.0

### 0.1.3 / 2017-11-11

- Accept extension names and parameters including uppercase letters
- Handle extension names that clash with `Object.prototype` properties

### 0.1.2 / 2017-09-10

- Catch synchronous exceptions thrown when calling an extension
- Fix race condition caused when a message is pushed after a cell has stopped
  due to an error
- Fix failure of `close()` to return if a message that's queued after one that
  produces an error never finishes being processed

### 0.1.1 / 2015-02-19

- Prevent sessions being closed before they have finished processing messages
- Add a callback to `Extensions.close()` so the caller can tell when it's safe
  to close the socket

### 0.1.0 / 2014-12-12

- Initial release
