var Extensions = require("../lib/websocket_extensions"),
    test       = require("jstest").Test
    FakeClock  = test.FakeClock

test.describe("Extensions", function() { with(this) {
  before(function() { with(this) {
    this.extensions = new Extensions()

    this.ext     = { name: "deflate", type: "permessage", rsv1: true, rsv2: false, rsv3: false }
    this.session = {}
  }})

  describe("add", function() { with(this) {
    it("does not throw on valid extensions", function() { with(this) {
      assertNothingThrown(function() { extensions.add(ext) })
    }})

    it("throws if ext.name is not a string", function() { with(this) {
      ext.name = 42
      assertThrows(TypeError, function() { extensions.add(ext) })
    }})

    it("throws if ext.rsv1 is not a boolean", function() { with(this) {
      ext.rsv1 = 42
      assertThrows(TypeError, function() { extensions.add(ext) })
    }})

    it("throws if ext.rsv2 is not a boolean", function() { with(this) {
      ext.rsv2 = 42
      assertThrows(TypeError, function() { extensions.add(ext) })
    }})

    it("throws if ext.rsv3 is not a boolean", function() { with(this) {
      ext.rsv3 = 42
      assertThrows(TypeError, function() { extensions.add(ext) })
    }})
  }})

  describe("client sessions", function() { with(this) {
    before(function() { with(this) {
      this.offer = { mode: "compress" }
      stub(ext, "createClientSession").returns(session)
      stub(session, "generateOffer").returns(offer)
      extensions.add(ext)

      this.conflict = { name: "tar", type: "permessage", rsv1: true, rsv2: false, rsv3: false }
      this.conflictSession = {}
      stub(conflict, "createClientSession").returns(conflictSession)
      stub(conflictSession, "generateOffer").returns({ gzip: true })

      this.nonconflict = { name: "reverse", type: "permessage", rsv1: false, rsv2: true, rsv3: false }
      this.nonconflictSession = {}
      stub(nonconflict, "createClientSession").returns(nonconflictSession)
      stub(nonconflictSession, "generateOffer").returns({ utf8: true })

      stub(session, "activate").returns(true)
      stub(conflictSession, "activate").returns(true)
      stub(nonconflictSession, "activate").returns(true)
    }})

    describe("generateOffer", function() { with(this) {
      it("asks the extension to create a client session", function() { with(this) {
        expect(ext, "createClientSession").exactly(1).returning(session)
        extensions.generateOffer()
      }})

      it("asks the session to generate an offer", function() { with(this) {
        expect(session, "generateOffer").exactly(1).returning(offer)
        extensions.generateOffer()
      }})

      it("does not ask the session to generate an offer if the extension doesn't build a session", function() { with(this) {
        stub(ext, "createClientSession").returns(null)
        expect(session, "generateOffer").exactly(0)
        extensions.generateOffer()
      }})

      it("returns the serialized offer from the session", function() { with(this) {
        assertEqual( "deflate; mode=compress", extensions.generateOffer() )
      }})

      it("returns a null offer from the session", function() { with(this) {
        stub(session, "generateOffer").returns(null)
        assertEqual( null, extensions.generateOffer() )
      }})

      it("returns multiple serialized offers from the session", function() { with(this) {
        stub(session, "generateOffer").returns([offer, {}])
        assertEqual( "deflate; mode=compress, deflate", extensions.generateOffer() )
      }})

      it("returns serialized offers from multiple sessions", function() { with(this) {
        extensions.add(nonconflict)
        assertEqual( "deflate; mode=compress, reverse; utf8", extensions.generateOffer() )
      }})

      it("generates offers for potentially conflicting extensions", function() { with(this) {
        extensions.add(conflict)
        assertEqual( "deflate; mode=compress, tar; gzip", extensions.generateOffer() )
      }})
    }})

    describe("activate", function() { with(this) {
      before(function() { with(this) {
        extensions.add(conflict)
        extensions.add(nonconflict)
        extensions.generateOffer()
      }})

      it("throws if given unregistered extensions", function() { with(this) {
        assertThrows(Error, function() { extensions.activate("xml") })
      }})

      it("does not throw if given registered extensions", function() { with(this) {
        assertNothingThrown(function() { extensions.activate("deflate") })
      }})

      it("does not throw if given only one potentially conflicting extension", function() { with(this) {
        assertNothingThrown(function() { extensions.activate("tar") })
      }})

      it("throws if two extensions conflict on RSV bits", function() { with(this) {
        assertThrows(Error, function() { extensions.activate("deflate, tar") })
      }})

      it("does not throw if given two non-conflicting extensions", function() { with(this) {
        assertNothingThrown(function() { extensions.activate("deflate, reverse") })
      }})

      it("activates one session with no params", function() { with(this) {
        expect(session, "activate").given({}).exactly(1).returning(true)
        extensions.activate("deflate")
      }})

      it("activates one session with a boolean param", function() { with(this) {
        expect(session, "activate").given({ gzip: true }).exactly(1).returning(true)
        extensions.activate("deflate; gzip")
      }})

      it("activates one session with a string param", function() { with(this) {
        expect(session, "activate").given({ mode: "compress" }).exactly(1).returning(true)
        extensions.activate("deflate; mode=compress")
      }})

      it("activates multiple sessions", function() { with(this) {
        expect(session, "activate").given({ a: true }).exactly(1).returning(true)
        expect(nonconflictSession, "activate").given({ b: true }).exactly(1).returning(true)
        extensions.activate("deflate; a, reverse; b")
      }})

      it("does not activate sessions not named in the header", function() { with(this) {
        expect(session, "activate").exactly(0)
        expect(nonconflictSession, "activate").exactly(1).returning(true)
        extensions.activate("reverse")
      }})

      it("throws if session.activate() does not return true", function() { with(this) {
        stub(session, "activate").returns("yes")
        assertThrows(Error, function() { extensions.activate("deflate") })
      }})
    }})

    describe("processIncomingMessage", function() { with(this) {
      before(function() { with(this) {
        extensions.add(conflict)
        extensions.add(nonconflict)
        extensions.generateOffer()

        stub(session, "processIncomingMessage", function(message, callback) {
          message.frames.push("deflate")
          callback(null, message)
        })

        stub(nonconflictSession, "processIncomingMessage", function(message, callback) {
          message.frames.push("reverse")
          callback(null, message)
        })
      }})

      it("processes messages in the reverse order given in the server's response", function() { with(this) {
        extensions.activate("deflate, reverse")

        extensions.processIncomingMessage({ frames: [] }, function(error, message) {
          assertNull( error )
          assertEqual( ["reverse", "deflate"], message.frames )
        })
      }})

      it("yields an error if a session yields an error", function() { with(this) {
        extensions.activate("deflate")
        stub(session, "processIncomingMessage").yields([{ message: "ENOENT" }])

        extensions.processIncomingMessage({ frames: [] }, function(error, message) {
          assertEqual( "deflate: ENOENT", error.message )
          assertNull( message )
        })
      }})

      it("does not call sessions after one has yielded an error", function() { with(this) {
        extensions.activate("deflate, reverse")
        stub(nonconflictSession, "processIncomingMessage").yields([{ message: "ENOENT" }])

        expect(session, "processIncomingMessage").exactly(0)

        extensions.processIncomingMessage({ frames: [] }, function() {})
      }})
    }})

    describe("processOutgoingMessage", function() { with(this) {
      before(function() { with(this) {
        extensions.add(conflict)
        extensions.add(nonconflict)
        extensions.generateOffer()

        stub(session, "processOutgoingMessage", function(message, callback) {
          message.frames.push("deflate")
          callback(null, message)
        })

        stub(nonconflictSession, "processOutgoingMessage", function(message, callback) {
          message.frames.push("reverse")
          callback(null, message)
        })
      }})

      describe("error handling", function() { with(this) {
        include(FakeClock)

        sharedExamplesFor("handles errors", function() { with(this) {
          before(function() { with(this) {
            clock.stub()
            extensions.activate("deflate, reverse")

            stub(session, "processOutgoingMessage", function(message, callback) {
              setTimeout(function() { callback(null, message.concat("a")) }, 100)
            })

            stub(nonconflictSession, "processOutgoingMessage", function(message, callback) {
              setTimeout(function() { callback(null, message.concat("b")) }, 100)
            })

            stub(nonconflictSession, "processIncomingMessage", function(message, callback) {
              if (message[0] === 5) return emitError(callback)
              setTimeout(function() { callback(null, message.concat("c")) }, 50)
            })

            stub(session, "processIncomingMessage", function(message, callback) {
              setTimeout(function() { callback(null, message.concat("d")) }, 100)
            })

            stub(session, "close")
            stub(nonconflictSession, "close")

            this.messages = []

            var push = function(error, message) {
              if (error) extensions.close(function() { messages.push("close") })
              messages.push(message)
            }

            ;[1, 2, 3].forEach(function(n) {
              extensions.processOutgoingMessage([n], push)
            })

            ;[4, 5, 6].forEach(function(n, i) {
              setTimeout(function() {
                extensions.processIncomingMessage([n], push)
              }, 20 * i)
            })

            clock.tick(200)
          }})

          it("allows the message before the error through to the end", function() { with(this) {
            assertEqual( [4, "c", "d"], messages[0] )
          }})

          it("yields the error to the end of the pipeline", function() { with(this) {
            assertNull( messages[1] )
          }})

          it("does not yield the message after the error", function() { with(this) {
            assertNotEqual( arrayIncluding([6, "c", "d"]), messages )
          }})

          it("yields all the messages in the direction unaffected by the error", function() { with(this) {
            assertEqual( [1, "a", "b"], messages[2] )
            assertEqual( [2, "a", "b"], messages[3] )
            assertEqual( [3, "a", "b"], messages[4] )
          }})

          it("closes after all messages are processed", function() { with(this) {
            assertEqual( "close", messages[5] )
            assertEqual( 6, messages.length )
          }})
        }})

        describe("with a sync error", function() { with(this) {
          define("emitError", function(callback) {
            throw new Error("sync error")
          })

          itShouldBehaveLike("handles errors")
        }})

        describe("with an async error", function() { with(this) {
          define("emitError", function(callback) {
            setTimeout(function() { callback(new Error("async error"), null) }, 10)
          })

          itShouldBehaveLike("handles errors")
        }})
      }})

      describe("async processors", function() { with(this) {
        include(FakeClock)

        before(function() { with(this) {
          clock.stub()
          var tags = ["a", "b", "c", "d"]

          stub(session, "processOutgoingMessage", function(message, callback) {
            var time = message.frames.length === 0 ? 100 : 20
            message.frames.push(tags.shift())
            setTimeout(function() { callback(null, message) }, time)
          })

          stub(nonconflictSession, "processOutgoingMessage", function(message, callback) {
            var time = message.frames.length === 1 ? 100 : 20
            message.frames.push(tags.shift())
            setTimeout(function() { callback(null, message) }, time)
          })
        }})

        it("processes messages in order even if upstream emits them out of order", function() { with(this) {
          extensions.activate("deflate, reverse")

          var out = []
          extensions.processOutgoingMessage({ frames: [] }, function(error, message) { out.push(message) })
          extensions.processOutgoingMessage({ frames: [1] }, function(error, message) { out.push(message) })
          clock.tick(200)

          assertEqual( [{ frames: ["a", "c"] }, { frames: [1, "b", "d"] }], out )
        }})

        it("defers closing until the extension has finished processing", function() { with(this) {
          extensions.activate("deflate")

          var closed = false, notified = false
          stub(session, "close", function() { closed = true })

          extensions.processOutgoingMessage({ frames: [] }, function() {})
          extensions.close(function() { notified = true })

          clock.tick(50)
          assertNot( closed || notified )

          clock.tick(50)
          assert( closed && notified )
        }})

        it("closes each session as soon as it finishes processing", function() { with(this) {
          extensions.activate("deflate, reverse")

          var closed = [false, false], notified = false
          stub(session, "close", function() { closed[0] = true })
          stub(nonconflictSession, "close", function() { closed[1] = true })

          extensions.processOutgoingMessage({ frames: [] }, function() {});
          extensions.close(function() { notified = true })

          clock.tick(50)
          assertNot( closed[0] || closed[1] || notified )

          clock.tick(100)
          assert( closed[0] )
          assertNot( closed[1] || notified )

          clock.tick(50)
          assert( closed[0] && closed[1] && notified )
        }})

        it("notifies of closure immeidately if already closed", function() { with(this) {
          extensions.activate("deflate")
          stub(session, "close", function() { closed = true })

          extensions.processOutgoingMessage({ frames: [] }, function() {})
          extensions.close()
          clock.tick(100)

          var notified = false
          extensions.close(function() { notified = true })
          assert( notified )
        }})
      }})

      it("processes messages in the order given in the server's response", function() { with(this) {
        extensions.activate("deflate, reverse")

        extensions.processOutgoingMessage({ frames: [] }, function(error, message) {
          assertNull( error )
          assertEqual( ["deflate", "reverse"], message.frames )
        })
      }})

      it("processes messages in the server's order, not the client's order", function() { with(this) {
        extensions.activate("reverse, deflate")

        extensions.processOutgoingMessage({ frames: [] }, function(error, message) {
          assertNull( error )
          assertEqual( ["reverse", "deflate"], message.frames )
        })
      }})

      it("yields an error if a session yields an error", function() { with(this) {
        extensions.activate("deflate")
        stub(session, "processOutgoingMessage").yields([{ message: "ENOENT" }])

        extensions.processOutgoingMessage({ frames: [] }, function(error, message) {
          assertEqual( "deflate: ENOENT", error.message )
          assertNull( message )
        })
      }})

      it("does not call sessions after one has yielded an error", function() { with(this) {
        extensions.activate("deflate, reverse")
        stub(session, "processOutgoingMessage").yields([{ message: "ENOENT" }])

        expect(nonconflictSession, "processOutgoingMessage").exactly(0)

        extensions.processOutgoingMessage({ frames: [] }, function() {})
      }})
    }})
  }})

  describe("server sessions", function() { with(this) {
    before(function() { with(this) {
      this.response = { mode: "compress" }
      stub(ext, "createServerSession").returns(session)
      stub(session, "generateResponse").returns(response)

      this.conflict = { name: "tar", type: "permessage", rsv1: true, rsv2: false, rsv3: false }
      this.conflictSession = {}
      stub(conflict, "createServerSession").returns(conflictSession)
      stub(conflictSession, "generateResponse").returns({ gzip: true })

      this.nonconflict = { name: "reverse", type: "permessage", rsv1: false, rsv2: true, rsv3: false }
      this.nonconflictSession = {}
      stub(nonconflict, "createServerSession").returns(nonconflictSession)
      stub(nonconflictSession, "generateResponse").returns({ utf8: true })

      extensions.add(ext)
      extensions.add(conflict)
      extensions.add(nonconflict)
    }})

    describe("generateResponse", function() { with(this) {
      it("asks the extension for a server session with the offer", function() { with(this) {
        expect(ext, "createServerSession").given([{ flag: true }]).exactly(1).returning(session)
        extensions.generateResponse("deflate; flag")
      }})

      it("asks the extension for a server session with multiple offers", function() { with(this) {
        expect(ext, "createServerSession").given([{ a: true }, { b: true }]).exactly(1).returning(session)
        extensions.generateResponse("deflate; a, deflate; b")
      }})

      it("asks the session to generate a response", function() { with(this) {
        expect(session, "generateResponse").exactly(1).returning(response)
        extensions.generateResponse("deflate")
      }})

      it("asks multiple sessions to generate a response", function() { with(this) {
        expect(session, "generateResponse").exactly(1).returning(response)
        expect(nonconflictSession, "generateResponse").exactly(1).returning(response)
        extensions.generateResponse("deflate, reverse")
      }})

      it("does not ask the session to generate a response if the extension doesn't build a session", function() { with(this) {
        stub(ext, "createServerSession").returns(null)
        expect(session, "generateResponse").exactly(0)
        extensions.generateResponse("deflate")
      }})

      it("does not ask the extension to build a session for unoffered extensions", function() { with(this) {
        expect(nonconflict, "createServerSession").exactly(0)
        extensions.generateResponse("deflate")
      }})

      it("does not ask the extension to build a session for conflicting extensions", function() { with(this) {
        expect(conflict, "createServerSession").exactly(0)
        extensions.generateResponse("deflate, tar")
      }})

      it("returns the serialized response from the session", function() { with(this) {
        assertEqual( "deflate; mode=compress", extensions.generateResponse("deflate") )
      }})

      it("returns serialized responses from multiple sessions", function() { with(this) {
        assertEqual( "deflate; mode=compress, reverse; utf8", extensions.generateResponse("deflate, reverse") )
      }})

      it("returns responses in registration order", function() { with(this) {
        assertEqual( "deflate; mode=compress, reverse; utf8", extensions.generateResponse("reverse, deflate") )
      }})

      it("does not return responses for unoffered extensions", function() { with(this) {
        assertEqual( "reverse; utf8", extensions.generateResponse("reverse") )
      }})

      it("does not return responses for conflicting extensions", function() { with(this) {
        assertEqual( "deflate; mode=compress", extensions.generateResponse("deflate, tar") )
      }})

      it("throws an error if the header is invalid", function() { with(this) {
        assertThrows(SyntaxError, function() { extensions.generateResponse("x-webkit- -frame") })
      }})

      it("returns a response for potentially conflicting extensions if their preceding extensions don't build a session", function() { with(this) {
        stub(ext, "createServerSession").returns(null)
        assertEqual( "tar; gzip", extensions.generateResponse("deflate, tar") )
      }})
    }})
  }})
}})
