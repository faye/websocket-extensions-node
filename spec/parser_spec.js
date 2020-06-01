var Parser = require('../lib/parser'),
    test   = require('jstest').Test

test.describe("Parser", function() { with(this) {
  describe("parseHeader", function() { with(this) {
    define("parse", function(string) {
      return Parser.parseHeader(string).toArray()
    })

    it("parses an empty header", function() { with(this) {
      assertEqual( [], parse('') )
    }})

    it("parses a missing header", function() { with(this) {
      assertEqual( [], parse(undefined) )
    }})

    it("throws on invalid input", function() { with(this) {
      assertThrows(SyntaxError, function() { parse('a,') })
    }})

    it("parses one offer with no params", function() { with(this) {
      assertEqual( [{ name: "a", params: {}}],
                   parse('a') )
    }})

    it("parses two offers with no params", function() { with(this) {
      assertEqual( [{ name: "a", params: {}}, { name: "b", params: {}}],
                   parse('a, b') )
    }})

    it("parses a duplicate offer name", function() { with(this) {
      assertEqual( [{ name: "a", params: {}}, { name: "a", params: {}}],
                   parse('a, a') )
    }})

    it("parses a flag", function() { with(this) {
      assertEqual( [{ name: "a", params: { b: true }}],
                   parse('a; b') )
    }})

    it("parses an unquoted param", function() { with(this) {
      assertEqual( [{ name: "a", params: { b: 1 }}],
                   parse('a; b=1') )
    }})

    it("parses a quoted param", function() { with(this) {
      assertEqual( [{ name: "a", params: { b: 'hi, "there' }}],
                   parse('a; b="hi, \\"there"') )
    }})

    it("parses multiple params", function() { with(this) {
      assertEqual( [{ name: "a", params: { b: true, c: 1, d: 'hi' }}],
                   parse('a; b; c=1; d="hi"') )
    }})

    it("parses duplicate params", function() { with(this) {
      assertEqual( [{ name: "a", params: { b: [true, 'hi'], c: 1 }}],
                   parse('a; b; c=1; b="hi"') )
    }})

    it("parses multiple complex offers", function() { with(this) {
      assertEqual( [{ name: "a", params: { b: 1 }},
                    { name: "c", params: {}},
                    { name: "b", params: { d: true }},
                    { name: "c", params: { e: ['hi, there', true] }},
                    { name: "a", params: { b: true }}],
                   parse('a; b=1, c, b; d, c; e="hi, there"; e, a; b') )
    }})

    it("parses an extension name that shadows an Object property", function() { with(this) {
      assertEqual( [{ name: "hasOwnProperty", params: {}}],
                   parse('hasOwnProperty') )
    }})

    it("parses an extension param that shadows an Object property", function() { with(this) {
      var result = parse('foo; hasOwnProperty; x')[0]
      assertEqual( result.params.hasOwnProperty, true )
    }})

    it("rejects a string missing its closing quote", function() { with(this) {
      assertThrows(SyntaxError, function() {
        parse('foo; bar="fooa\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a\\a')
      })
    }})
  }})

  describe("serializeParams", function() { with(this) {
    it("serializes empty params", function() { with(this) {
      assertEqual( 'a', Parser.serializeParams('a', {}) )
    }})

    it("serializes a flag", function() { with(this) {
      assertEqual( 'a; b', Parser.serializeParams('a', { b: true }) )
    }})

    it("serializes an unquoted param", function() { with(this) {
      assertEqual( 'a; b=42', Parser.serializeParams('a', { b: '42' }) )
    }})

    it("serializes a quoted param", function() { with(this) {
      assertEqual( 'a; b="hi, there"', Parser.serializeParams('a', { b: 'hi, there' }) )
    }})

    it("serializes multiple params", function() { with(this) {
      assertEqual( 'a; b; c=1; d=hi', Parser.serializeParams('a', { b: true, c: 1, d: 'hi' }) )
    }})

    it("serializes duplicate params", function() { with(this) {
      assertEqual( 'a; b; b=hi; c=1', Parser.serializeParams('a', { b: [true, 'hi'], c: 1 }) )
    }})
  }})
}})
