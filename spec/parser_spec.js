var Parser = require('../lib/parser'),
    test   = require('jstest').Test

test.describe("Parser", function() { with(this) {
  describe("parseHeader", function() { with(this) {
    it("parses an empty header", function() { with(this) {
      assertEqual( [], Parser.parseHeader('') )
    }})

    it("parses a missing header", function() { with(this) {
      assertEqual( [], Parser.parseHeader(undefined) )
    }})

    it("throws on invalid input", function() { with(this) {
      assertThrows(SyntaxError, function() { Parser.parseHeader('a,') })
    }})

    it("parses one offer with no params", function() { with(this) {
      assertEqual( [{name: "a", params: {}}],
                   Parser.parseHeader('a') )
    }})

    it("parses two offers with no params", function() { with(this) {
      assertEqual( [{name: "a", params: {}}, {name: "b", params: {}}],
                   Parser.parseHeader('a, b') )
    }})

    it("parses a duplicate offer name", function() { with(this) {
      assertEqual( [{name: "a", params: {}}, {name: "a", params: {}}],
                   Parser.parseHeader('a, a') )
    }})

    it("parses a flag", function() { with(this) {
      assertEqual( [{name: "a", params: {b: true}}],
                   Parser.parseHeader('a; b') )
    }})

    it("parses an unquoted param", function() { with(this) {
      assertEqual( [{name: "a", params: {b: 1}}],
                   Parser.parseHeader('a; b=1') )
    }})

    it("parses a quoted param", function() { with(this) {
      assertEqual( [{name: "a", params: {b: 'hi, "there'}}],
                   Parser.parseHeader('a; b="hi, \\"there"') )
    }})

    it("parses multiple params", function() { with(this) {
      assertEqual( [{name: "a", params: {b: true, c: 1, d: 'hi'}}],
                   Parser.parseHeader('a; b; c=1; d="hi"') )
    }})

    it("parses duplicate params", function() { with(this) {
      assertEqual( [{name: "a", params: {b: [true, 'hi'], c: 1}}],
                   Parser.parseHeader('a; b; c=1; b="hi"') )
    }})

    it("parses multiple complex offers", function() { with(this) {
      assertEqual( [{name: "a", params: {b: 1}},
                    {name: "c", params: {}},
                    {name: "b", params: {d: true}},
                    {name: "c", params: {e: ['hi, there', true]}},
                    {name: "a", params: {b: true}}],
                   Parser.parseHeader('a; b=1, c, b; d, c; e="hi, there"; e, a; b') )
    }})
  }})

  describe("serializeParams", function() { with(this) {
    it("serializes empty params", function() { with(this) {
      assertEqual( 'a', Parser.serializeParams('a', {}) )
    }})

    it("serializes a flag", function() { with(this) {
      assertEqual( 'a; b', Parser.serializeParams('a', {b: true}) )
    }})

    it("serializes an unquoted param", function() { with(this) {
      assertEqual( 'a; b=42', Parser.serializeParams('a', {b: '42'}) )
    }})

    it("serializes a quoted param", function() { with(this) {
      assertEqual( 'a; b="hi, there"', Parser.serializeParams('a', {b: 'hi, there'}) )
    }})

    it("serializes multiple params", function() { with(this) {
      assertEqual( 'a; b; c=1; d=hi', Parser.serializeParams('a', {b: true, c: 1, d: 'hi'}) )
    }})

    it("serializes duplicate params", function() { with(this) {
      assertEqual( 'a; b; b=hi; c=1', Parser.serializeParams('a', {b: [true, 'hi'], c: 1}) )
    }})
  }})
}})
