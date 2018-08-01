/*
 * test/selector-test.js
 * 
 * @see   http://visionmedia.github.com/mocha/
 * @see   http://nodejs.org/docs/v0.4.8/api/assert.html
 */

var assert = require('assert');
var log = require('logsync');
var kv = require('../lib/keyvalues.js');
var selector = require('../lib/selector.js');

describe("Selector", function() {

  describe("$in operator", function() {
    it("should select 1 in [1, 2, 3]", function() {
      var query = {id:{$in:[1, 2, 3]}};
      var doc = {id:1, x:2};
      assert.ok(selector.select(query, doc));
    });
    it("shouldn't select 4 in [1, 2, 3]", function() {
      var query = {id:{$in:[1, 2, 3]}};
      var doc = {id:4, x:2};
      assert.ok(!selector.select(query, doc));
      // assert.ok(!selector.select(doc));
    });
    
    describe("Working with the $or operator", function() {
      it("should work with $or", function() {
        assert.ok(selector.select({$or:[{a:1},{a:2}]}, {a:1}));
        assert.ok(selector.select({$or:[{a:1},{a:2}]}, {a:2}));
        assert.ok(!selector.select({$or:[{a:1},{a:2}]}, {a:3}));
      });
    });
    
    it("can select with complex selector", function() {
      var query = {id:{$gte:0, $lte:3}, 'b.c':{$in:['x','y','z']}, 'b.d':2, e:{$gte:new Date(2013,0,1),$lt:new Date(2014,0,1)}};
      assert.ok(selector.select(query,
        { id:0, a:1, b:{ c:'x', d:2 }, e:new Date(2013,5,5) }));
      assert.ok(selector.select(query,
        { id:3, a:4, b:{ c:'z', d:2 }, e:new Date(2013,7,9) }));
      assert.ok(! selector.select(query,
        { id:4, a:1, b:{ c:'x', d:2 }, e:new Date(2013,5,5) }));
      assert.ok(! selector.select(query,
        { id:0, a:1, b:{ c:'w', d:2 }, e:new Date(2013,5,5) }));
      assert.ok(! selector.select(query,
        { id:0, a:1, b:{ c:'x', d:3 }, e:new Date(2013,5,5) }));
      assert.ok(! selector.select(query,
        { id:0, a:1, b:{ c:'x', d:2 }, e:new Date(2012,5,5) }));
      assert.ok(! selector.select(query,
        { id:0, a:1, b:{ c:'x', d:2 }, e:new Date(2014,5,5) }));
      assert.ok(selector.select(query,
        { id:0, a:1, b:{ c:'x', d:2 }, e:new Date(2013,0,1) }));
      assert.ok(! selector.select(query,
        { id:0, a:1, b:{ c:'x', d:2 }, e:new Date(2014,0,1) }));
    });
  });
  
  describe("Selecting into arrays", function() {
    it("should select arrays as well", function() {
      var doc = { id:0, as:[{x:1,y:2}, {x:2,y:2}, {x:3,y:3}] };
      assert.ok(selector.select({'as.y':2}, doc));
    });
  });
  
  describe("Operator $elemMatch", function() {
    
    it("shouldn't work with $elemMatch on no list property", function() {
      assert.ok(!selector.select({notes:{$elemMatch:{status:1}}}, {}));
    });
    it("shouldn't work with $elemMatch on empty list", function() {
      assert.ok(!selector.select({notes:{$elemMatch:{status:1}}}, {notes:[]}));
    });
    it("shouldn't work with $elemMatch on no match list", function() {
      assert.ok(!selector.select({notes:{$elemMatch:{status:1}}}, {notes:[{status:0}]}));
    });
    it("should work with $elemMatch on mixed list", function() {
      assert.ok(selector.select({notes:{$elemMatch:{status:1}}}, {notes:[{status:0}, {status:1}]}));
    });
    
  });
  
  describe("operator", function() {
    it.skip("should work", function() {
      var cond = {"$or":[{filename:{"$regex":/^FC ONE770\x2f/i}}]};
      var doc = {
        _id: "533428ad576fb395d08019ea",
        filename: "FC WESTAR/test.pdf",
        chunkSize: 262144,
        uploadDate: '2014-03-27T13:33:33.259Z',
        md5: "d41d8cd98f00b204e9800998ecf8427e",
        length: 0
      };
      assert.ok(!selector.select(cond, doc));
    });
  });
  
  describe("Using +Selector.update()", function() {
    
    it("works with $push", function() {
      var doc = {a:1, b:[{x:1}, {x:2}]}, upd = {$push:{b:{x:3}}};
      var res = selector.update(doc, upd);
      log('info', "^^doc: #yl[%s] + #byl[%s]\nupd: #yl[%s]", log.dump(doc), log.dump(upd), log.dump(res));
      assert.deepEqual(res, {a:1, b:[{x:1}, {x:2}, {x:3}]});
    });
    it("works with $pushAll", function() {
      var doc = {a:1, b:[{x:1}, {x:2}]}, upd = {$pushAll:{b:[{x:3},{x:4}]}};
      var res = selector.update(doc, upd);
      log('info', "^^doc: #yl[%s] + #byl[%s]\nupd: #yl[%s]", log.dump(doc), log.dump(upd), log.dump(res));
      assert.deepEqual(res, {a:1, b:[{x:1}, {x:2}, {x:3}, {x:4}]});
    });
    it("works with $pull", function() {
      var doc = {a:1, b:[{x:1}, {x:2}]}, upd = {$pull:{b:{x:2}}};
      var res = selector.update(doc, upd);
      log('info', "^^doc: #yl[%s] + #byl[%s]\nupd: #yl[%s]", log.dump(doc), log.dump(upd), log.dump(res));
      assert.deepEqual(res, {a:1, b:[{x:1}]});
    });
    it("works with $pullAll", function() {
      var doc = {a:1, b:[{x:1}, {x:2}]}, upd = {$pullAll:{b:[{x:2}, {x:3}]}};
      var res = selector.update(doc, upd);
      log('info', "^^doc: #yl[%s] + #byl[%s]\nupd: #yl[%s]", log.dump(doc), log.dump(upd), log.dump(res));
      assert.deepEqual(res, {a:1, b:[{x:1}]});
    });
    it("works with $inc", function() {
      var doc = {a:1, b:[{x:1}, {x:2}]}, upd = {$inc:{a:-2}};
      var res = selector.update(doc, upd);
      log('info', "^^doc: #yl[%s] + #byl[%s]\nupd: #yl[%s]", log.dump(doc), log.dump(upd), log.dump(res));
      assert.deepEqual(res, {a:-1, b:[{x:1}, {x:2}]});
    });
    it("works with $set with index on array", function() {
      var doc = {a:1, b:[{x:1}, {x:2}]}, upd = {$set:{'b.2':{x:3}}};
      var res = selector.update(doc, upd);
      log('info', "^^doc: #yl[%s] + #byl[%s]\nupd: #yl[%s]", log.dump(doc), log.dump(upd), log.dump(res));
      assert.deepEqual(res, {a:1, b:[{x:1}, {x:2}, {x:3}]});
    });
    
  });

  describe.skip("Performance", function() {
    it("can perform well", function() {
      var doc = { id:0, a:1, b:{ c:'x', d:2 }, e:new Date(2013,5,5) };
      var query = new selector({id:{$gte:0, $lte:3}, 'b.c':{$in:['x','y','z']}, 'b.d':2, e:{$gte:new Date(2013,0,1),$lt:new Date(2013,12,31)}});
      _.benchmark("Selecting with complex selector", 10000, function() {
        selector.select(doc);
      });
    });
  });
  
  describe("selector.update()", function() {
    
    it("should update({}, {$set:{x:1}}) => {x:1}", function() {
      var doc = {};
      selector.update(doc, {$set:{x:1}}, true);
      assert.deepEqual(log.dump(doc), log.dump({x:1}));
    });
    it("should update({}, {$set:{'x.y':1}}) => {x:{y:1}}", function() {
      var doc = {};
      selector.update(doc, {$set:{'x.y':1}}, true);
      assert.deepEqual(log.dump(doc), log.dump({x:{y:1}}));
    });
    it("should update({x:1}, {$unset:{x:1}}) => {}", function() {
      var doc = {x:1};
      selector.update(doc, {$unset:{x:1}}, true);
      assert.deepEqual(log.dump(doc), log.dump({}));
    });
    it("should update({x:{y:1}}, {$unset:{x:1}}) => {}", function() {
      var doc = {x:{y:1}};
      selector.update(doc, {$unset:{x:1}}, true);
      assert.deepEqual(log.dump(doc), log.dump({}));
    });
    it("should update({x:{y:1}}, {$unset:{x:1}}) => {}", function() {
      var doc = {x:{y:1}};
      selector.update(doc, {$unset:{x:1}}, true);
      assert.deepEqual(log.dump(doc), log.dump({}));
    });
    
  });

  describe("selector.comparator()", function() {
    
    it("should compare {x:1}", function() {
      var cmp = selector.comparator({x:1});
      assert.ok(cmp({x:1,y:1}, {x:2,y:2}) < 0);
      assert.ok(cmp({x:2,y:1}, {x:1,y:2}) > 0);
      assert.ok(cmp({x:1,y:1}, {x:1,y:2}) == 0);
    });
    it("should compare {x:-1}", function() {
      var cmp = selector.comparator({x:-1});
      assert.ok(cmp({x:1,y:1}, {x:2,y:2}) > 0);
      assert.ok(cmp({x:2,y:1}, {x:1,y:2}) < 0);
      assert.ok(cmp({x:1,y:1}, {x:1,y:2}) == 0);
    });
    
  });

});

