/*
 * test/array-test.js
 * 
 * @see   http://visionmedia.github.com/mocha/
 * @see   http://nodejs.org/docs/v0.4.8/api/assert.html
 */

var assert = require('assert');
var log = require('logsync');

var kv = require('../lib/keyvalues.js');
var array = require('../lib/array.js');

describe("array()", function() {

  describe("Creating arrays", function() {

    it("creates arrays that are Arrays", function() {
      assert.ok(Array.isArray(array()));
      assert.equal(typeof(array()), 'object');
      assert.ok(Array.isArray(array()))
      // assert.equal(_.typeOf(array()), 'array');
      // assert.equal(_.classOf(array()), 'array');
    });
    it("can create empty arrays", function() {
      log('info', "array: #gr[%s]", array().toString());
      assert.equal(array().toString(), [].toString());
    });
    /*
    it.only("can create length arrays", function() {
      assert.equal(log.dump(array(10)), log.dump(new Array(10)));
    });
    it("can create item arrays", function() {
      assert.equal(log.dump(array(1, 2, 3)), log.dump(new Array(1, 2, 3)));
    }); */
    
  });

  describe("Modifying arrays", function() {

    it("supports add()", function() {
      var ary = array();
      ary.push(1);
      assert.equal(log.dump(ary), log.dump([1]));
      ary.add(1);
      assert.equal(log.dump(ary), log.dump([1]));
      ary.push(1);
      assert.equal(log.dump(ary), log.dump([1, 1]));
    });
    it("supports array(null, 1)", function() {
      var ary = array(null, 1);
      assert.equal(log.dump(ary), log.dump([1]));
    });
    it("supports remove()", function() {
      var ary = array(null, 1, 2, 3, 1);
      ary.remove(1);
      assert.equal(log.dump(ary), log.dump([2, 3]));
    });
    it("supports splice() with replacement", function() {
      var ary = array(null, 1, 2, 3, 4);
      ary.splice(1, 2, 5, 6);
      assert.equal(log.dump(ary), log.dump([1, 5, 6, 4]));
    });
    it("supports splice() with negative index and no length", function() {
      var ary = array(null, 1, 2, 3, 4);
      ary.splice(-2);
      assert.equal(log.dump(ary), log.dump([1, 2]));
    });
    it("supports splice() with negative index and length", function() {
      var ary = array(null, 1, 2, 3, 4);
      ary.splice(-100, 1);
      assert.equal(log.dump(ary), log.dump([2, 3, 4]));
    });
    it("supports splice() with high index", function() {
      var ary = array(null, 1, 2, 3, 4);
      ary.splice(100, 1, 5);
      assert.equal(log.dump(ary), log.dump([1, 2, 3, 4, 5]));
    });
    it("supports push()", function() {
      var ary = array(null, 1, 2, 3, 4);
      ary.push(5, 6, 7);
      assert.equal(log.dump(ary), log.dump([1, 2, 3, 4, 5, 6, 7]));
    });
    it("supports pop()", function() {
      var ary = array(null, 1, 2, 3, 4);
      assert.equal(ary.pop(), 4);
      assert.equal(log.dump(ary), log.dump([1, 2, 3]));
    });
    it("supports unshift()", function() {
      var ary = array(null, 1, 2, 3, 4);
      ary.unshift(5, 6, 7);
      assert.equal(log.dump(ary), log.dump([5, 6, 7, 1, 2, 3, 4]));
    });
    it("supports shift()", function() {
      var ary = array(null, 1, 2, 3, 4);
      assert.equal(ary.shift(), 1);
      assert.equal(log.dump(ary), log.dump([2, 3, 4]));
    });
    
    
  });

  describe("Using simple indexes", function() {
    
    it("can retrieve all items in an index", function() {
      var ary = array(null, {a:1,b:1}, {a:1,b:2}, {a:2,b:2}, {a:2,b:1});
      var items = ary.all('a', 1);
      assert.equal(log.dump(items), log.dump([{a:1,b:1}, {a:1,b:2}]));
    });
    it("can retrieve first items in an index", function() {
      var ary = array(null, {a:1,b:1}, {a:1,b:2}, {a:2,b:2}, {a:2,b:1});
      var item = ary.get('a', 1);
      assert.equal(log.dump(item), log.dump({a:1,b:1}));
    });
    it("supports indexes with live addition/removal of items", function() {
      var ary = array(null, {a:1,b:1}, {a:1,b:2}, {a:2,b:2}, {a:2,b:1});
      var items = ary.all('a', 1);
      assert.equal(log.dump(items), log.dump([{a:1,b:1}, {a:1,b:2}]));
      // log('info', "M1 ary: #byl[%s] #bmg[%s]", ary, ary.index('a'));
      var item = ary.shift();
      // log('info', "M2 ary: #byl[%s] -> #gr[%s]", ary, item);
      ary.push({a:1,b:3}, {a:3,b:1});
      // log('info', "M3 ary: #byl[%s]", ary);
      var items = ary.all('a', 1);
      assert.equal(log.dump(items), log.dump([{a:1,b:2}, {a:1,b:3}]));
    });

    it("supports indexes responding to changes", function() {
      var ary = array(null, {a:1,b:1}, {a:1,b:2}, {a:2,b:2}, {a:2,b:1});
      var item = ary.get('a', 1);
      // log('info', "^^#yl[Index a: %s]", log.dump(ary.index('a').map));
      assert.equal(log.dump(item), log.dump({a:1,b:1}));
      item.a = 2;
      ary.changed(item);
      // log('info', "^^#yl[Index a: %s]", log.dump(ary.index('a').map));
      var item2 = ary.get('a', 1);
      assert.equal(log.dump(item2), log.dump({a:1,b:2}));
    });

    it("trims index maps upon removal", function() {
      var ary = array(null, {a:1,b:1}, {a:1,b:2}, {a:2,b:2}, {a:2,b:1});
      var item = ary.get('a', 1);
      // log('info', "^^#yl[Index a: %s]", log.dump(ary.index('a').map));
      ary.splice(0, 2);
      // log('info', "^^#yl[Index a: %s]", log.dump(ary.index('a').map));
    });

    it("supports unique keys", function() {
      var ary = array(null, {a:1,b:1}, {a:2,b:2});
      ary.index('a', {unique:true});
      var item = ary.get('a', 1);
      assert.equal(log.dump(item), log.dump({a:1,b:1}));
      item.a = 3;
      ary.changed(item);
      // log('info', "^^#yl[Index a: %s]", log.dump(ary.index('a').map));
      var item2 = ary.get('a', 1);
      assert.equal(log.dump(item2), log.dump(undefined));
    });

  });

  describe("Using compound indexes", function() {
    
    it("can retrieve compound indexes", function() {
      var ary = array(null, {a:1,b:1}, {a:1,b:2}, {a:2,b:2}, {a:2,b:1});
      assert.equal(log.dump(ary.get('a,b', 1, 2)), log.dump({a:1,b:2}));
      assert.equal(log.dump(ary.get('a,b', 2, 1)), log.dump({a:2,b:1}));
      assert.equal(log.dump(ary.get('a,b', 3, 1)), log.dump(undefined));
    });

  });

  describe("Working with array items", function() {
    
    it("works with arrays as items", function() {
      var ary = array(null, [1,'a'], [2, 'b'], [3,'c'], [4,'d']);
      var item = ary.get('0', 1);
      assert.equal(log.dump(item), log.dump([1,'a']));
      // log('info', "Item: %s\n#yl[%s]", item, log.dump(ary.index('0').map));
    });

  });

  describe("Using put()", function() {
    
    var ary;
    beforeEach(function() {
      ary = array(null, [1,1,'a'], [2,2,'b'], [3,3,'c'], [1,2,'d'], [1,3,'e']);
      ary.index('0,1', {unique:true});
    });
    
    it("works with get()", function() {
      assert.equal(ary.length, 5);
      assert.deepEqual(ary.get([1,2]), [1,2,'d']);
    });
    it("can replace and item using put()", function() {
      var events = [];
      ary.on('change', function(changes) {
        events.push(kv.clone(changes, true));
      });
      var r = ary.put([2,2,'f']);
      assert.ok(!r, "Row have been replaced, not added");
      // assert.deepEqual(events.pop(), {a:[], r:[], c:[[[2,2,'b'], [2,2,'f']]]});
      assert.deepEqual(events.pop(), [{action:'=',item:[2,2,'f'],old:[2,2,'b']}]);
      // log('info', "index.map: %s", ary.index('0,1').map);
    });
    it("supports put() suppressing changes with equals", function() {
      var events = [];
      ary.on('change', function(a, r, c) {
        events.push(kv.clone({a:a, r:r, c:c}, true));
      });
      var r = ary.put([2,2,'b'], true);
      assert.ok(!r, "Row have been replaced if at all, not added");
      assert.equal(events.length, 0);
      // log('info', "index.map: %s", ary.index('0,1').map);
    });

  });

  describe("Mark/Purge", function() {
    
    describe("With Simple Keys", function() {
    
      var ary;
      beforeEach(function() {
        ary = array(null, {x:1,y:'a'},{x:2,y:'b'},{x:3,y:'c'},{x:4,y:'d'});
        ary.index('x', {unique:true});
      });
      
      it("can mark() and purge() all items", function() {
        assert.equal(ary.length, 4);
        // assert.ok(!ary.__marked, "should not have a __marked map");
        ary.mark();
        // assert.ok(ary.__marked, "should have a __marked map");
        ary.purge();
        assert.equal(ary.length, 0);
      });
      it("can mark() and purge() some items", function() {
        ary.mark();
        ary.unmark({x:1,y:'a'});
        ary.unmark({x:3,y:'c'});
        ary.purge();
        assert.equal(ary.length, 2);
      });
      it("can ummark() without using a full item", function() {
        ary.mark();
        ary.unmark({x:1});
        ary.unmark({x:3});
        ary.purge();
        assert.equal(ary.length, 2);
      });
      it("cannot ummark() without an index key", function() {
        assert.throws(function() {
          ary.mark();
          ary.unmark({y:'b'});
          ary.purge();
          assert.equal(ary.length, 0);
        });
      });

    });

    describe("With Complex Keys", function() {
      
      var ary;
      beforeEach(function() {
        ary = array(null, {x:1,y:1,z:'a'}, {x:1,y:2,z:'b'}, {x:2,y:1,z:'c'}, {x:2,y:2,z:'d'});
        ary.index('x,y', {unique:true});
      });
      
      it("can mark() and purge() all items", function() {
        ary.mark();
        ary.purge();
        assert.equal(ary.length, 0, "should have purged all items:\nary = " + log.dump(ary));
      });
      it("can mark() and purge() some items", function() {
        ary.mark();
        ary.unmark({x:1,y:2});
        ary.purge();
        assert.equal(ary.length, 1, "should leave just one item:\nary = " + log.dump(ary));
      });

    });

  });
  
  describe("Calculating with groups", function() {
  
    it("can group using a string key", function() {
      var trs = array(),
          cts = [{id:1,sy:'EURUSD'}, {id:2,sy:'USDMXN'}, {id:3,sy:'AUDUSD'}];
      for (var i = 0, ic = 100; i < ic; i++) {
        trs.push({ct:cts[i % cts.length], qt:1e3 * (1 + (i % 4))});
      }
      var groups = trs.calc('ct.sy', {
        initial:  {cn:0, qt:0},
        iterator: function(tr, r) {
          r.cn++;
          r.qt += tr.qt;
        },
      });
      // log('info', "Groups: #yl[%s]", log.dump(groups));
    });
    it("can group using a function key", function() {
      var trs = array(),
          cts = [{id:1,sy:'EURUSD'}, {id:2,sy:'USDMXN'}, {id:3,sy:'AUDUSD'}];
      for (var i = 0, ic = 1e3; i < ic; i++) {
        trs.push({id:i, ct:cts[i % cts.length], qt:1e3 * (1 + (i % 4))});
      }

      var groups = trs.calc(['ct.sy'], {
        filter:   function(tr) { return tr.id > 10 && tr.id < 90 },
        initial:  {cn:0, qt:0},
        iterator: function(tr, r) { r.cn++; r.qt += tr.qt; },
        total:    false,
        keyGet:   function(tr, key) { return tr.ct.sy.substring(3, 6) },
      });
      // log('info', "Groups: #yl[%s]", log.dump(groups));
      
    });
    
  });

  describe("Performance testing", function() {
    
    var count = 1e5;
    
    describe.skip("With Object Items", function() {
      it("supports large simple indexed arrays with push()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('x', {unique:true});
        _.benchmark("Adding rows using push()", count, function(i) {
          ary.push({ x:i, y:i, z:'x' });
        });
        assert.equal(ary.identityIndex.itemKey({x:2}), '2');
        assert.ok(ary.contains({x:2}));
      });
      it("supports large simple indexed arrays with add()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('x', {unique:true});
        _.benchmark("Adding rows using add()", count, function(i) {
          ary.add({ x:i, y:i, z:'x' });
        });
        assert.equal(ary.identityIndex.itemKey({x:2}), '2');
        assert.ok(ary.contains({x:2}));
      });
      it("supports large complex indexed arrays with push()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('x,y', {unique:true});
        _.benchmark("Adding rows using push()", count, function(i) {
          ary.push({ x:i, y:i, z:'x' });
        });
        assert.equal(ary.identityIndex.itemKey({x:2,y:2}), '2\x002');
        assert.ok(ary.contains({x:2,y:2}));
      });
      it("supports large complex indexed arrays with add()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('x,y', {unique:true});
        _.benchmark("Adding rows using add()", count, function(i) {
          ary.add({ x:i, y:i, z:'x' });
        });
        assert.equal(ary.identityIndex.itemKey({x:2,y:2}), '2\x002');
        assert.ok(ary.contains({x:2,y:2}));
      });
    });

    describe.skip("With Array Items", function() {
      it("supports large simple indexed arrays with push()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('0', {unique:true});
        _.benchmark("Adding rows using push()", count, function(i) {
          ary.push([i, i, 'x']);
        });
        assert.equal(ary.identityIndex.itemKey([2]), '2');
        assert.ok(ary.contains([2]));
      });
      it("supports large simple indexed arrays with add()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('0', {unique:true});
        _.benchmark("Adding rows using add()", count, function(i) {
          ary.add([i, i, 'x']);
        });
        assert.equal(ary.identityIndex.itemKey([2]), '2');
        assert.ok(ary.contains([2]));
      });
      it("supports large complex indexed arrays with push()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('0,1', {unique:true});
        _.benchmark("Adding rows using push()", count, function(i) {
          if (i === undefined) return;
          ary.push([i, i, 'x']);
        });
        assert.equal(ary.identityIndex.itemKey([2, 2]), '2\x002');
        assert.ok(ary.contains([2, 2]));
      });
      it("supports large complex indexed arrays with add()", function() {
        log('info', "^^");
        var ary = array();
        ary.index('0,1', {unique:true});
        _.benchmark("Adding rows using add()", count, function(i) {
          ary.add([i, i, 'x']);
        });
        assert.equal(ary.identityIndex.itemKey([2, 2]), '2\x002');
        assert.ok(ary.contains([2, 2]));
      });
    });

  });

});

