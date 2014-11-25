var Extensions = require("../lib/websocket_extensions"),
    events     = require("events"),
    test       = require("jstest").Test

test.describe("Extensions", function() { with(this) {
  before(function() { with(this) {
    this.extensions = new Extensions()

    this.ext     = {name: "deflate", rsv1: true, rsv2: false, rsv3: false}
    this.session = new events.EventEmitter()
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

  describe("client extensions", function() { with(this) {
    before(function() { with(this) {
      this.offer = {mode: "compress"}
      stub(ext, "createClientSession").returns(session)
      stub(session, "generateOffer").returns(offer)
      extensions.add(ext)
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
        var tar = {name: "tar", rsv1: false, rsv2: true, rsv3: false}
        stub(tar, "createClientSession").returns(session)
        stub(session, "generateOffer").returns(offer, {gzip: true})
        extensions.add(tar)
        assertEqual( "deflate; mode=compress, tar; gzip", extensions.generateOffer() )
      }})
    }})
  }})
}})
