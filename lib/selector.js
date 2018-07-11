/*
 * selector.js
 *
 * @MARK: Module
 */

var kv = require('./keyvalues.js');

/** The selector defines
 *  
 *  @see    <#see#>
 *  @version 1.0.0
 *  @author K. Lo Shih <kls@elysiumtechgroup.com>
 *  @MARK: - selector
 */
var selector = module.exports = {

  /** Compares two documents, *a* and *b*, according to the *sort* comparator
   *
   *  @param  sort The sort specification ({object}, required)
   *  @param  a The first doc ({object}, optional)
   *  @param  b The second doc ({object}, optional)
   *  @since  1.0
   *  @MARK:  -comparator()
   */
  comparator: function(sort) {
    switch (kv.typeof(sort)) {
      case 'null': case 'undefined':
        sort = [[]];
        /* fall through */
      case 'array':
        if (sort.length == 2 && !Array.isArray(sort[0]))
          sort = [sort];
        var convert = {};
        for (var f = 0, fc = sort.length; f < fc; f++) {
          var field = sort[f], key = field[0], dir = field[1] || 1;
          convert[key] = dir;
        }
        sort = convert;
        /* fall through */
      case 'object':
        if (Object.keys(sort).length === 0)
          sort = {_id:1};
        for (var key in sort) {
          sort[key] = sort[key] < 0 ? -1 : 1;
        }
        break;
      default:
        throw new Error("Invalid sort: " + JSON.stringify(sort));
    }
    
    var comparators = this.comparators || (this.comparators = {});
    var key = JSON.stringify(sort);
    return comparators[key] || (comparators[key] = function(aDoc, bDoc) {
      if (aDoc == bDoc) return 0;
      if (aDoc == null) return -1;
      if (bDoc == null) return 1;
      for (var key in sort) {
        var dir = sort[key];
        var a = aDoc[key], b = bDoc[key], r;
        if (a == b) continue;
        if (a == null) return -dir;
        if (b == null) return dir;
        var aType = kv.typeof(a), bType = kv.typeof(b);
        if (aType !== bType) return aType.localeCompare(bType) * dir;
        switch (aType) {
          case 'number':
            r = a - b; break;
          case 'string':
            r = a.localeCompare(b); break;
          case 'date':
            r = a.getTime() - b.getTime(); break;
          default:
            r = a.toString().localeCompare(b.toString()); break;
        }
        if (r != 0)
          return r * dir;
      }
      return 0;
    });
  },

  /** Compares two documents, *a* and *b*, according to the *sort* comparator
   *
   *  @param  sort The sort specification ({object}, required)
   *  @param  a The first doc ({object}, optional)
   *  @param  b The second doc ({object}, optional)
   *  @since  1.0
   *  @MARK:  -compare()
   */
  compare: function(sort, a, b) {
    return selector.comparator(sort)(a, b);
  },

  /** Sorts an array of documents.
   *
   *  @param  sort The sort specification ({object}, required)
   *  @param  docs The array of documents ({array}, optional)
   *  @since  1.0
   *  @MARK:  -sort()
   */
  sort: function(sort, docs) {
  },
  
  /** Creates a function
   *
   *  @param  query The query ({object}, required)
   *  @return The select function ({function(doc)}
   *  @since  1.0
   *  @MARK:  -selectFunction()
   */
  selectFunction: function selectFunction(query) {
    var text = [];
    
    /*
     * {x:1,y:{$in:[2,3]}}
     *   -> function(doc) {
     *        if (doc.x == 1) return true;
     *        if (~[2,3].indexOf(doc.y)) return true;
     *        return false;
     *      }
     *
     * {$and:[{x:1},{y:2}]}
     *   -> function(doc) {
     *        if ((doc.x == 1) && (doc.y == 2)) return true;
     *        return false;
     *      }
     * {$not:{x:1}}
     *   -> function(doc) {
     *        if (!(doc.x == 1)) return true;
     *        return false;
     *      }
     */
    
    for (var op in query) {
      var cfg = query[op];
      switch (op) {
        case '$and':
          break;
      }
    }
    
    var text = text.join('');
    return new Function('doc', text);
  },
  
//  selectExpr: function selectExpr(query, key) {
//    for (var op in query) {
//      var cfg = query[op];
//      switch (op) {
//        case '$and':
//        case '$or':
//        case '$nor':
//          var exprs = [];
//          cfg.forEach(function(text) {
//            if (op == '$nor') exprs.push('!');
//            exprs.push('(', selectExpr(text, key) + ')');
//          });
//          var joinOp = op == '$and' ? ' && ' : ' || ';
//          return exprs.join(joinOp);
//          
//        default:
//          // {x:1} or {y:{$gt:0}} where k = 'x', cfg = 1
//          for (var k in cfg) {
//            var o = cfg[k];
//            switch (kv.typeof(o)) {
//              case 'object':
//                if (o)
//
//              default: /* literal */
//                return key + '.' + k + '==' + JSON.stringify(o);
//            }
//          }
//    }
//  },

  /** Selects the document or documents
   *
   *  @param  query The query ({object}, optional)
   *  @see    #onStart()
   *  @since  1.0
   *  @MARK:  -select()
   */
  select: function select(query, doc, options) {
    if (Array.isArray(doc)) {
      var result = [];
      for (var i = 0, ic = doc.length; i < ic; i++) {
        if (select(doc[i]))
          result.push(doc[i]);
      }
      return result;
    }
    if (!query)
      return true;
    if (!doc)
      return false;
    
    var matches = true;
    for (var key in query) {
      var op = query[key];
      switch (key) {
        case '$and':
          var result = true;
          for (var i = 0, ic = op.length; i < ic; i++) {
            if (select(op[i], doc)) {
              result = false;
              break;
            }
          }
          if (!result)
            matches = false;
          break;
        case '$or':
        case '$nor':
          var result = false;
          for (var i = 0, ic = op.length; i < ic; i++) {
            if (select(op[i], doc)) {
              result = true;
              break;
            }
          }
          if (key == '$or' && !result || key == '$nor' && result)
            matches = false;
          break;
        case '$where':
          throw new Error("Unsupported operator: " + key);
          break;
        default:
          if (key.charAt(0) === '$')
            throw new Error("Unsupported operator, " + key);
          var v = kv.get(doc, key);
          if (typeof(op) !== 'object') {
            if (Array.isArray(v)) {
              if (v.indexOf(op) < 0)
                matches = false;
            } else if (compare(v, op) !== 0)
              matches = false;
          } else {
            for (var k in op) {
              var o = op[k];
              switch (k) {
                case '$lt':     if (compare(v, o) >= 0) matches = false; break;
                case '$lte':    if (compare(v, o) >  0) matches = false; break;
                case '$gt':     if (compare(v, o) <= 0) matches = false; break;
                case '$gte':    if (compare(v, o) <  0) matches = false; break;
                case '$ne':     if (compare(v, o) == 0) matches = false; break;
                case '$in':
                  if (Array.isArray(o)) {
                    if (!~o.indexOf(v))
                      matches = false;
                  }
                  break;
                case '$nin':    if (~o.indexOf(v)) matches = false; break;
                case '$all':    if (_.difference(v, o).length > 0)
                                  matches = false; break;
                case '$exists': if ((v === undefined) !== !!o)
                                  matches = false; break;
                case '$mod':    if ((v % o[0]) != o[1]) matches = false; break;
                case '$size':   if (v.length !== o) matches = false; break;
                case '$type':   var vt = kv.typeof(v), vte = true;
                                switch (o) {
                                  case 1:  vte = vt === 'number'; break;
                                  case 2:  vte = vt === 'string'; break;
                                  case 3:  vte = vt === 'object'; break;
                                  case 4:  vte = vt === 'array'; break;
                                  case 5:  vte = vt === 'buffer'; break;
                                  case 7:  vte = vt === 'objectid'; break;
                                  case 8:  vte = vt === 'true'
                                              || vt === 'false'; break;
                                  case 9:  vte = vt === 'date'; break;
                                  case 1:  vte = vt === 'null'; break;
                                  case 11: vte = vt === 'regexp'; break;
                                  case 13: vte = vt === '<code>'; break;
                                  case 14: vte = vt === '<symbol>'; break;
                                  case 15: vte = vt === '<code>'; break;
                                  case 16: vte = vt === 'number'; break;
                                  case 17: vte = vt === 'date'; break;
                                  case 18: vte = vt === 'number'; break;
                                  default: vte = false;
                                }
                                matches = vte;
                                break;
                case '$regex':  if (!op._regex) {
                                  op._regex = new RegExp(op.$regex, op.$options || '');
                                }
                                if (!op._regex.exec(v))
                                  matches = false;
                                break;
                case '$elemMatch':
                                matches = false;
                                for (var i = 0, ic = v ? v.length : 0; i < ic; i++) {
                                  if (select(o, v[i])) {
                                    matches = true;
                                    break;
                                  }
                                }
                                break;
                case '$not': 
              }
              if (!matches)
                break;
            }
          }
          break;
      }
      if (!matches)
        break;
    }
    return matches;
  },
  
  clean: function(query) {
    for (var key in query) {
      var op = query[key];
      if (op.$regex)
        delete(op._regex);
    }
  },
  
  /** Updates the
   *
   *  @param  <#param#> <#title#> (<#type#>, required)
   *  @param  <#param#> <#title#> (<#type#>, optional)
   *  @param  callback A completion callback ({function(err,..)}, optional)
   *  @return <#return#>
   *  @see    <#other#>
   *  @since  1.0
   *  @MARK:  -update()
   */
  update: function(doc, update, inplace) {
    if (!doc || !update)
      return doc;
    if (Array.isArray(doc) || typeof(doc) !== 'object')
      throw new Error("Document must be an object");
    
    doc = inplace ? doc : kv.copy(doc, true/*deep*/);
    for (var key in update) {
      var value = update[key];
      switch (key) {
        /* Not yet supported: $setOnInsert, $each, $slice, $sort, $isolated */
        case '$set':
          for (var k in value) {
            // log('info', "kv.set(#byl[%s], #byl[%s], #byl[%s])", JSON.stringify(doc), JSON.stringify(k), JSON.stringify(value[k]));
            kv.set(doc, k, value[k]);
//            // log('info', "key=%s, k=%s, value[k]=%s", key, k, value[k]);
//            /* When $push() is used, it actually does a {$set:{key.2:..} to set
//             * an item on an index rather than a {$push:{key:..}} */
//            var match = k.match(/^(.*)\.(\d+)$/);
//            if (match) {
//              var array = kv.get(doc, match[1]);
//              var subkey = match[1], index = parseInt(match[2]),
//                  array = kv.get(doc, subkey);
//              if (!array)
//                kv.set(doc, subkey, array = []);
//              array[index] = value[k];
//            } else {
//              kv.set(doc, k, value[k]);
//            }
          }
          break;
        case '$unset':
          for (var k in value) {
            kv.set(doc, k, undefined);
          }
          break;
        case '$inc':
          for (var k in value) {
            kv.set(doc, k, (kv.get(doc, k) || 0) + value[k]);
          }
          break;
        case '$push':
          for (var k in value) {
            var array = kv.get(doc, k);
            if (!array)
              kv.set(doc, k, array = []);
            array.push(value[k]);
          }
          break;
        case '$pushAll':
          for (var k in value) {
            var array = kv.get(doc, k);
            if (!array)
              kv.set(doc, k, array = []);
            kv.each(value[k], function(v) { array.push(v) });
          }
          break;
        case '$addToSet':
          for (var k in value) {
            var array = kv.get(doc, k);
            if (!array)
              kv.set(doc, k, array = []);
            var items = value[k].$each || [values[k]];
            for (var i = 0, ic = items.length; i < ic; i++) {
              if (!~array.indexOf(items[i]))
                array.push(items[i]);
            }
          }
          break;
        case '$pop':
          for (var k in value) {
            var array = kv.get(doc, k);
            if (!array)
              kv.set(doc, k, array = []);
            if (value[k] < 0)
              array.splice(0, 1);
            else
              array.pop();
          }
          break;
        case '$pull':
          for (var k in value) {
            var array = kv.get(doc, k);
            if (!array)
              kv.set(doc, k, array = []);
            var item = value[k];
            for (var i = 0, ic = array.length; i < ic; i++) {
              if (kv.equals(array[i], item))
                array.splice(i, 1), i--, ic--;
            }
          }
          break;
        case '$pullAll':
          for (var k in value) {
            var array = kv.get(doc, k);
            if (!array)
              kv.set(doc, k, array = []);
            var items = value[k];
            for (var r = 0, rc = items.length; r < rc; r++) {
              var item = items[r];
              for (var i = 0, ic = array.length; i < ic; i++) {
                if (kv.equals(array[i], item))
                  array.splice(i, 1), i--, ic--;
              }
            }
          }
          break;
        case '$rename':
          for (var k in value) {
            var v = kv.get(doc, k);
            kv.set(doc, value[k], v);
            kv.set(doc, k, undefined);
          }
          break;
        case '$bit':
          for (var k in value) {
            var ops = value[k];
            var v = kv.get(doc, k);
            for (var op in ops) {
              switch (op) {
                case 'and': v &= ops[op]; break;
                case 'or': v |= ops[op]; break;
              }
            }
            kv.set(doc, k, v);
          }
          break;
        default:
          if (key.charAt(0) == '$')
            throw new Error(key + " is not yet supported");
          kv.set(doc, key, value);
          break;
      }
    }
    return doc;
  },

};

/** Compares *a* to *b* and returns the comparison result. If one of the
 *  values is a date, the other value is coerced to be . Nulls the undefineds
 *  are last.
 *  
 *  @param  a The first value (optional)
 *  @param  b The second value (optional)
 *  @return The comparison result ({number}, non-null)
 *  @see
 *  @since  1.0
 *  @MARK:  compare()
 */
function compare(a, b) {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  if (a === null) return 1;
  if (b === null) return -1;
  if (a == b) return 0;
  var lt = a < b, gt = a > b;
  if (lt && !gt) return -1;
  if (!lt && gt) return 1;
  if (a.getTime && b.getTime)
    return compare(a.getTime(), b.getTime());
  var atype = typeof(a), btype = typeof(b), r;
  if (Array.isArray(a) && Array.isArray(b)) {
    var alen = a.length, blen = b.len, len = alen > blen ? alen : blen;
    for (var i = 0; i < len; i++) {
      if ((r = compare(a[i], b[i])) !== 0)
        return r;
    }
    return 0;
  } else if (Array.isArray(a)) {
    return ~a.indexOf(b);
  } else if (atype === 'object' && btype === 'object') {
    var akeys = Object.keys(a), bkeys = Object.keys(b), seen = {};
    for (var k = 0, kc = akeys.length; k < kc; k++) {
      var key = akeys[k];
      if (seen[key]) { continue } else { seen[key] = true }
      var avalue = a[key], bvalue = b[key];
      if ((r = compare(a[i], b[i])) !== 0)
        return r;
    }
    for (var k = 0, kc = bkeys.length; k < kc; k++) {
      var key = bkeys[k];
      if (seen[key]) { continue } else { seen[key] = true }
      var avalue = a[key], bvalue = b[key];
      if ((r = compare(a[i], b[i])) !== 0)
        return r;
    }
    return 0;
  }
  throw new Error("Cannot compare " + a + " with " + b);
}

function equals(a, b) {
  return compare(a, b) === 0;
}

