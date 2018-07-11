/*
 * test/keyvalues-test.js
 * 
 * @see   http://visionmedia.github.com/mocha/
 * @see   http://nodejs.org/docs/v0.4.8/api/assert.html
 */

var assert = require('assert');

var kv = require('../lib/keyvalues.js');
var log = require('log');

var data = [
  { a:1, b:{c:{d:2}, e:[1, {f:[2]}, {f:[3]}], g:0, h:undefined, i:null}, j:4 },
  { a:5, b:{c:{d:6}, e:[7, {f:[8]}, {f:[9]}], g:'', h:0.0, i:false}, j:10 },
  { a:11, b:{c:null, e:[{f:[12]}], g:1/0}, j:13 },
  { a:14, b:{c:0, e:2, i:null}, j:4 },
];

describe("Key basics", function() {

  describe("_.key", function() {
    it("exists", function() {
      assert.ok(kv);
    });
  });
  
  describe("Key get", function() {
    it("works with simple keys", function() {
      assert.deepEqual(kv.get(data[0], 'a'), 1);
    });
    it("works with simple keys as arrays", function() {
      assert.deepEqual(kv.get(data, 'a'), [1, 5, 11, 14]);
    });
    it("works with key paths", function() {
      assert.deepEqual(kv.get(data[0], 'b.c.d'), 2);
    });
    it("works with key paths as arrays", function() {
      assert.deepEqual(kv.get(data, 'b.c.d'), [2, 6, null, undefined]);
    });
  });
  
  describe("Working with get array properties", function() {
    
    var doc;
    
    before(function() {
      doc = {
        a: { w:1, x:{q:1,r:1}, y:[1, 2], z:[{q:2,r:2}, {q:3,r:3}] },
        b: 2,
      };
    });
    
    it("should be able to get 'b'", function() {
      var val = kv.get(doc, 'b');
      assert.equal(val, 2);
    });
    it("should be able to get 'a.w'", function() {
      var val = kv.get(doc, 'a.w');
      assert.equal(val, 1);
    });
    it("should be able to get 'a.x.q'", function() {
      var val = kv.get(doc, 'a.x.q');
      assert.equal(val, 1);
    });
    it("should be able to get 'a.y[1]'", function() {
      var val = kv.get(doc, 'a.y[1]');
      assert.equal(val, 2);
    });
    it("should be able to get '1' from [1, 2] as 2", function() {
      var val = kv.get([1, 2], '1');
      assert.equal(val, 2);
    });
    it("should be able to get '[1]' from [1, 2] as [2]", function() {
      var val = kv.get([1, 2], '[1]');
      assert.deepEqual(val, [2]);
    });
    it("should be able to get '[1,2]' from [1, 2, 3] as [2,3]", function() {
      var val = kv.get([1, 2, 3], '[1,2]');
      assert.deepEqual(val, [2,3]);
    });
    it("should be able to get 'a.y.1'", function() {
      var val = kv.get(doc, 'a.y.1');
      assert.equal(val, 2);
    });
    it("should be able to get 'a.z.q'", function() {
      var val = kv.get(doc, 'a.z.q');
      assert.deepEqual(val, [2, 3]);
    });
    it("should be able to get 'a.z.0.q'", function() {
      var val = kv.get(doc, 'a.z.0.q');
      assert.equal(val, 2);
    });
    it("should be able to get 'a.z[0].q'", function() {
      var val = kv.get(doc, 'a.z[0].q');
      assert.equal(val, 2);
    });
    
  });
  
  describe("Setting keys", function() {
    
    it("should be able to set: {} a:1 => {a:1}", function() {
      var doc = {};
      kv.set(doc, 'a', 1);
      assert.equal(log.dump(doc), log.dump({a:1}));
    });
    it("should be able to set: {} a.b:1 => {a:{b:1}}", function() {
      var doc = {};
      kv.set(doc, 'a.b', 1);
      assert.equal(log.dump(doc), log.dump({a:{b:1}}));
    });
    it("should be able to set: {} a.0:1 => {a:{'0':1}}", function() {
      var doc = {};
      kv.set(doc, 'a.0', 1);
      assert.equal(log.dump(doc), log.dump({a:{'0':1}}));
    });
    it("should be able to set: {a:[]} a.0:1 => {a:[1]}", function() {
      var doc = {a:[]};
//      debugger;
      kv.set(doc, 'a.0', 1);
      assert.equal(log.dump(doc), log.dump({a:[1]}));
    });
    it("should be able to set: {a:[]} a.0.x:1 => {a:[{x:1}]}", function() {
      var doc = {a:[]};
      kv.set(doc, 'a.0.x', 1);
      // log('info', "doc: #byl[%s]", doc);
      assert.equal(log.dump(doc), log.dump({a:[{x:1}]}));
    });
    it("should be able to set: {a:[]} a[0,1].x:1 => {a:[{x:1},{x:1}]}", function() {
      var doc = {a:[]};
      kv.set(doc, 'a[0,1].x', 1);
      // log('info', "doc: #byl[%s]", doc);
      assert.equal(log.dump(doc), log.dump({a:[{x:1},{x:1}]}));
    });
    it("should be able to set: {a:[{x:1}]} a.1 = {x:2} => {a:[{x:1},{x:2}]}", function() {
      var doc = {a:[{x:1}]};
      kv.set(doc, 'a.1', {x:2});
      assert.equal(log.dump(doc), log.dump({a:[{x:1},{x:2}]}));
    });
    
    it("should be able to delete: {a:1} a => {}", function() {
      var doc = {a:1};
      kv.set(doc, 'a', undefined);
      assert.equal(log.dump(doc), log.dump({}));
    });
    it("should be able to delete: {a:{b:1}} a.b => {a:{}}", function() {
      var doc = {a:{b:1}};
      kv.set(doc, 'a.b', undefined);
      assert.equal(log.dump(doc), log.dump({a:{}}));
    });
    it("should be able to delete: {a:{b:1}} a => {}", function() {
      var doc = {a:{b:1}};
      kv.set(doc, 'a', undefined);
      assert.equal(log.dump(doc), log.dump({}));
    });
    it("should be able to delete: {a:[1,2]} a.0 => {a:[undef,2]}", function() {
      var doc = {a:[1,2]};
      kv.set(doc, 'a.0', undefined);
      assert.equal(log.dump(doc), log.dump({a:[undefined,2]}));
    });
    it("should be able to delete: {a:[1,2]} a.1 => {a:[1,undef]}", function() {
      var doc = {a:[1,2]};
      kv.set(doc, 'a.1', undefined);
      assert.equal(log.dump(doc), log.dump({a:[1,undefined]}));
    });
    it("should be able to delete: {a:[{x:1},{x:2}]} a.x => {a:[{},{}]}", function() {
      var doc = {a:[{x:1},{x:2}]};
      kv.set(doc, 'a.x', undefined);
      assert.equal(log.dump(doc), log.dump({a:[{},{}]}));
    });
    
  });
  
});

