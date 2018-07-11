/*
 * test/jsonize-test.js
 * 
 * @see   http://visionmedia.github.com/mocha/
 * @see   http://nodejs.org/docs/v0.4.8/api/assert.html
 */

var assert = require('assert');

var log = require('log');

var kv = require('../lib/keyvalues.js');

describe("Jsonize", function() {

  describe("kv.jsonize()", function() {
  
    it("should define kv.jsonize()", function() {
      assert.ok(kv.jsonize);
    });
    it("should define kv.unjsonize()", function() {
      assert.ok(kv.unjsonize);
    });
    
    it("should jsonize scalars", function() {
      assert.equal(2.2, kv.jsonize(2.2));
      assert.equal("hello", kv.jsonize("hello"));
      assert.equal(true, kv.jsonize(true));
    });

    it("should jsonize dates", function() {
      var now = new Date();
      assert.equal(now.toISOString(), kv.jsonize(now));
    });
    it("should unjsonize dates", function() {
      var now = new Date();
      // log('info', "Date: #yl[%s]", now.toISOString());
      assert.equal(now.getTime(), kv.unjsonize(now.toISOString()).getTime());
    });

  });
  
  describe("kv.defaultTimezone", function() {
    
    it("should have a default timezone", function() {
      // log('info', "Default timezone: #yl[%s]", kv.defaultTimezone);
      assert.ok(kv.defaultTimezone);
    });
    it("should support setting null for default", function() {
      assert.ok(kv.defaultTimezone);
      kv.defaultTimezone = null;
      assert.ok(kv.defaultTimezone);
    });
    it("should support setting TIMEZONE environment", function() {
      var test = 'America/Los_Angeles';
      process.env.TIMEZONE = test;
      kv.defaultTimezone = null;
      assert.equal(kv.defaultTimezone, test);
      delete(process.env.TIMEZONE);
      kv.defaultTimezone = null;
      assert.notEqual(kv.defaultTimezone, test);
    });
    
    it("should support jsonize of moment()", function() {
      var now = new Date();
      var nowMoment = kv.moment(now);
      assert.equal(kv.typeof(nowMoment), 'date');
      assert.equal(now.toISOString(), kv.jsonize(nowMoment));
    });
    
  });
  
});

