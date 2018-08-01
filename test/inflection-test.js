/*
 * test/jsonize-test.js
 * 
 * @see   http://visionmedia.github.com/mocha/
 * @see   http://nodejs.org/docs/v0.4.8/api/assert.html
 */

var assert = require('assert');

var log = require('logsync');

var kv = require('../lib/keyvalues.js');

describe("Inflection", function() {

  it("should define kv.classify()", function() {
    assert.ok(kv.classify);
  });
  
  it("should define kv.underscore()", function() {
    assert.ok(kv.underscore);
  });
  
  it("should define kv.pluralize()", function() {
    assert.ok(kv.pluralize);
  });
  
  it("should define kv.singularize()", function() {
    assert.ok(kv.singularize);
  });
  
});

