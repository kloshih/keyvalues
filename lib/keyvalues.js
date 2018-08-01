/*
 * keyvalues.js
 *
 * @MARK: Module
 */

'use strict';

var moment = require('moment-timezone');
var inflection = require('inflection');
var defaultTimezone;

/** The key object defines functions related to keys, key paths and key
 *  values.
 *  
 *  @since  1.0
 *  @MARK:  -key
 */
var keyvalues = module.exports = {

  /** Joins a key path with the arguments given.
   *
   *  @param  [keys...] The keys (optional)
   *  @return The joined key path or +null+
   *  @since  1.0
   *  @MARK:  -join()
   */
  join: function() {
    var keys = [], key;
    for (var i = 0, ic = arguments.length; i < ic; i++) {
      if (key = arguments[i])
        keys.push(key);
    }
    return keys.join('.');
  },
  
  /** Gets the key for the given _key_ path. If the value doesn't exist, or if
   *  the _object_ or _key_ is +null+, +null+ is returned.
   *  
   *  @param  object An object (optional)
   *  @param  key The key path ({string}, optional)
   *  @return The value for the given _key_
   *  @see    -key.set()
   *  @since  1.0
   *  @MARK:  -key.get()
   */
  get: function keyGet(object, key) {
    if (object === undefined || object === null || !key)
      return object || null;
    var result;
    if (Array.isArray(object)/* && (!object.klass || !object.class)/ * support for array.js */) {
      var match = key.match(/^(?:\[([\d,\s]+)\]|(\d+)|([^\.]+))(?:.(.*))?$/),
          matchIndexes = match[1],
          matchIndex = match[2],
          matchKey = match[3],
          subkey = match[4];
      if (matchIndexes) {
        var parts = matchIndexes.trim().split(/\s*,\s*/);
        result = [];
        for (var i = 0, ic = parts.length; i < ic; i++) {
          var index = parseInt(parts[i]), item = object[index];
          result.push(subkey ? keyGet(item, subkey) : item);
        }

      } else if (matchIndex) {
        /* If the firstkey appears to be an numeric index, treat it as such */
        var index = parseInt(matchIndex), item = object[index];
        result = subkey ? keyGet(item, subkey) : item;

      } else if (matchKey && matchKey in object) {
        var item = object[matchKey];
        result = subkey ? keyGet(item, subkey) : item;

      } else {
        /* Otherwise, enumerate each array item */
        result = [];
        for (var i = 0, ic = object.length; i < ic; i++) {
          result.push(keyGet(object[i], key));
        }
      }
    } else if (Array.isArray(key)) {
      result = object;
      for (var i = 0, ic = key.length; i < ic; i++) {
        result = keyGet(result, key[i]);
      }
    } else {
      var subkey, dot = key.indexOf('.'), bracket = key.indexOf('[');
      if (~dot && (!~bracket || dot < bracket)) {
          subkey = key.substring(dot + 1), key = key.substring(0, dot);
      } else if (~bracket) {
          subkey = key.substring(bracket), key = key.substring(0, bracket);
      }
      var item = object[key];
      result = subkey ? keyGet(item, subkey) : item;
    }
    return result;
  },

  /** Sets the value for the given key.
   *  
   *  @param  object An object (optional)
   *  @param  key The key path ({string}, optional)
   *  @return The value for the given _key_
   *  @see    -key.get()
   *  @since  1.0
   *  @MARK:  -key.set()
   */
  set: function keySet(object, key, val) {
    if (object === undefined || object === null || !key)
      return;
    var result;
    if (Array.isArray(object)) {
      var match = key.match(/^(?:\[([\d,\s]+)\]|(\d+)|([^\.]+))(?:.(.*))?$/),
          matchIndexes = match[1],
          matchIndex = match[2],
          matchKey = match[3],
          subkey = match[4];
      if (matchIndexes) {
        var parts = matchIndexes.trim().split(/\s*,\s*/);
        for (var i = 0, ic = parts.length; i < ic; i++) {
          var index = parseInt(parts[i]);
          if (subkey) {
            var item = object[index] || (val != null && (object[index] = {}));
            keySet(item, subkey, val);
          } else if (val !== undefined) {
            object[index] = val;
          } else {
            delete(object[index]);
          }
        }

      } else if (matchIndex) {
        /* If the firstkey appears to be an numeric index, treat it as such */
        var index = parseInt(matchIndex);
        if (subkey) {
          var item = object[index] || (object[index] = {});
          keySet(item, subkey, val);
        } else if (val !== undefined) {
          object[index] = val;
        } else {
          delete(object[index]);
        }

      } else if (matchKey && matchKey in object) {
        if (subkey) {
          var item = object[matchKey] || (object[matchKey] = {});
          keySet(item, subkey, val);
        } else if (val !== undefined) {
          object[matchKey] = val;
        } else {
          delete(object[matchKey]);
        }

      } else {
        /* Otherwise, enumerate each array item */
        for (var i = 0, ic = object.length; i < ic; i++) {
          keySet(object[i], key, val);
        }
      }

//        for (var j = 0, jc = object.length; j < jc; j++) {
//          keySet(object[j], key, val);
//        }
    } else {
      var subkey, dot = key.indexOf('.'), bracket = key.indexOf('[');
      if (~dot && (!~bracket || dot < bracket)) {
          subkey = key.substring(dot + 1), key = key.substring(0, dot);
      } else if (~bracket) {
          subkey = key.substring(bracket), key = key.substring(0, bracket);
      }
      if (subkey) {
        var item = object[key] || (object[key] = {});
        keySet(item, subkey, val);
      } else if (val !== undefined) {
        object[key] = val;
      } else {
        delete(object[key]);
      }
    }
  },
  
  /** Recursively merges the arguments following *target*
   *
   *  @param  target The target ({object}, required)
   *  @param  [args..] Objects ({object...], optional)
   *  @return The *target* 
   *  @since  1.0
   *  @MARK:  -merge()
   */
  merge: function(target) { // try {
    target || (target = {});
    function merge(a, b) {
      for (var k in b) {
        if (!b.hasOwnProperty(k))
          continue;
        var bv = b[k];
        if (bv == null) {
          delete(a[k]);
          
        } else {
          var av = a[k];
          var at = keyvalues.typeof(av), bt = keyvalues.typeof(bv);
          if (at == 'object' && bt == 'object') {
            /* If they're both objects, then merge the two */
            try {
              if (merge.depth++ == 0)
                av = a[k] = keyvalues.clone(av, true);
              merge(av, bv);
            } finally {
              merge.depth--;
            }
          
          } else if (at == 'array' && bt == 'object' && (bv['+'] || bv['='] || bv['-'] || Object.key(bv).length == 0)) {
            /* If this is an array delta, then perform the operations */
            bv['-'] && bv['-'].forEach(function(item) {
              for (var i = 0, ic = av.length; i < ic; i++) {
                if (keyvalues.equals(av[i], item)) av.slice(i, 1), i--, ic--;
              }
            });
            bv['+'] && bv['+'].forEach(function(item) {
              av.push(item);
            });
            bv['='] && bv['='].forEach(function(item) {
              // throw new Error("UNSUPPORTED");
              console.log("_.merge(): unsupported array update");
              av.push(item);
            });
            
          } else {
            a[k] = bv;
          }
        }
      }
    }
    merge.depth = 0;
    for (var i = 1, ic = arguments.length; i < ic; i++) {
      var object = arguments[i];
      if (typeof(object) === 'object')
        merge(target, object);
    }
    return target;
  },

  /** Unmerges and returns the minimal document to provide to {-merge()}
   *
   *  @param  target The target document ({object}, required)
   *  @param  update The update document ({object}, optional)
   *  @return The unmerged document ({object}, non-null)
   *  @since  1.0
   *  @MARK:  -unmerge()
   */
  unmerge: function(target, update) {
    if (target == update) return null;
    if (target == null || update == null) return update;
      
    function calcDiff(a, b) {
      var diff;
      for (var key in a) {
        if (!(key in b))
          (diff || (diff={}))[key] = null;
      }
      for (var key in b) {
        var av = a[key], bv = b[key];
        if (av == bv)
          continue;
        var at = keyvalues.typeof(av), bt = keyvalues.typeof(bv);
        if (at != bt) {
          (diff || (diff={}))[key] = bv;
          continue;
        }
        switch (at) {
          case 'object':
            var dv = calcDiff(av, bv);
            if (dv)
              (diff || (diff={}))[key] = dv;
            break;
          case 'array':
            if (JSON.stringify(av) != JSON.stringify(bv))
              (diff || (diff={}))[key] = bv;
            break;
          case 'date':
            if (av.getTime() != bv.getTime())
              (diff || (diff={}))[key] = bv;
            break;
          default:
            (diff || (diff={}))[key] = bv;
            break;
        }
      }
      return diff;
    }
    return calcDiff(target, update);
  },

  /** Clones an object, optionally deep.
   *
   *  @param  object The object to copy ({object}, required)
   *  @param  deep `true` if the copy should be deep ({boolean}, optional)
   *  @return The clone
   *  @since  1.0
   *  @MARK:  -clone()
   */
  clone: function clone(object, deep) {
    if (null == object || 'object' !== typeof(object))
      return object;
    
    /* To handle recursive copies, the seen array is owned by the top call to
     * clone() recursion. It will contain references to object's mutable and
     * container referents. Each referent will have the property __clonedRef set
     * by clone() but deleted by the top call. */
    var seen = clone.__seen, top = !seen;
    if (!seen)
      seen = clone._seen = [];
    
    if (object.__clonedRef)
      return object.__clonedRef;
    
    var copy;
    switch (keyvalues.typeof(object)) {
      case 'object':
        copy = {};
        seen.push(object), object.__clonedRef = copy;
        for (var k in object) {
          if (k.indexOf('__') !== 0 && object.hasOwnProperty(k))
            copy[k] = deep ? clone(object[k], true) : object[k];
        }
        break;
      case 'array':
        copy = [];
        seen.push(object), object.__clonedRef = copy;
        for (var i = 0, ic = object.length; i < ic; i++) {
          copy[i] = deep ? clone(object[i], true) : object[i];
        }
        break;
      case 'date':
        copy = new Date();
        seen.push(object), object.__clonedRef = copy;
        copy.setTime(object.getTime());
        break;
      default:
        copy = object;
        break;
    }
    
    if (top) {
      for (var i = 0, ic = seen.length; i < ic; i++) {
        var item = seen[i];
        delete(item.__clonedRef);
      }
      delete(clone.__seen);
    }
    
    return copy;
  },
  
  /** Converts the *doc* into a JSON document, coercing dates to ISO 8601
   *  strings.
   *  
   *  @param  doc The document (required)
   *  @return The converted document
   *  @see    -unjsonize()
   *  @since  1.0
   *  @MARK:  -jsonize()
   */
  jsonize: function jsonize(doc, inplace) {
    if (!inplace)
      doc = keyvalues.copy(doc);
    switch (keyvalues.typeof(doc)) {
      case 'object':
        var r = inplace ? doc : {};
        for (var key in doc)
          r[key] = jsonize(doc[key], inplace);
        return r;
      case 'array':
        var r = inplace ? doc : [];
        for (var i = 0, ic = doc.length; i < ic; i++)
          r[i] = jsonize(doc[i], inplace);
        return r;
      case 'date':
        return doc.toISOString();
      default:
        return doc;
    }
  },
  
  /** Converts the *doc* into a JSON document, coercing dates to ISO 8601
   *  strings.
   *
   *  @param  doc The document (required)
   *  @return The converted document
   *  @see    -jsonize()
   *  @since  1.0
   *  @MARK:  -unjsonize()
   */
  unjsonize: function unjsonize(doc, inplace) {
    switch (keyvalues.typeof(doc)) {
      case 'object':
        var r = inplace ? doc : {};
        for (var key in doc)
          r[key] = unjsonize(doc[key], inplace);
        return r;
      case 'array':
        var r = inplace ? doc : [];
        for (var i = 0, ic = doc.length; i < ic; i++)
          r[i] = unjsonize(doc[i], inplace);
        return r;
      case 'string':
        if (keyvalues.isISODate(doc))
          return new Date(doc); ///* KLS: Optimize: _.date(doc)*/ _.date(doc, _.timezone);
        /* fall through */
      default:
        return doc;
    }
  },

  /** Quotes the _string_ with the given _quote_ and _escape_ characters.
   *
   *  @param  string The string ({string}, optional)
   *  @param  quote The quote char ({string}, defaults to '"')
   *  @param  escape The escape char ({string}, defaults to '\\')
   *  @return The quoted form ({string})
   *  @MARK:  -quote()
   */
  quote: function(string, quote, escape) {
    if (typeof(string) !== 'string') return string;
    // if (string === null || string === undefined) return null;
    if (!quote) quote = '"';
    if (!escape) escape = '\\';
    var text = quote;
    for (var i = 0, ic = string.length; i < ic; i++) {
      var c = string.charAt(i);
      switch (c) {
        case "\t": text += escape + "t"; break;
        case "\r": text += escape + "r"; break;
        case "\n": text += escape + "n"; break;
        case escape: text += escape + escape; break;
        case quote: text += escape + quote; break;
        default:
          var cc = string.charCodeAt(i);
          if (cc >= 32 && cc <= 126)
            text += c;
          else {
            var ct = cc.toString(16);
            if (ct.length < 2)
              ct = '0' + ct;
            text += '\\x' + ct;
          }
      }
    }
    text += quote;
    return text;
  },
  
  /** Unquotes the _string_ with the given _quote_ and _escape_ characters.
   *
   *  @param  string The string ({string}, optional)
   *  @param  quote The quote char ({string}, defaults to '"')
   *  @param  escape The escape char ({string}, defaults to '\\')
   *  @return The unquoted form ({string})
   *  @MARK:  -unquote()
   */
  unquote: function(string, quote, escape) {
    if (string == null) return null;
    if (string.length == 0) return string;
    if (!quote) {
      var c = string.charAt(0);
      quote = '\'"'.indexOf(c) >= 0 ? c : '"';
    }
    if (!escape) escape = '\\';
    var length = string.length;
    if (string.charAt(0) != quote || string.charAt(length - 1) != quote)
      return string;
    var text = "";
    for (var i = 1, ic = length - 1; i < ic; i++) {
      var c = string.charAt(i);
      switch (c) {
        case escape:
          c = string.charAt(++i);
          switch (c) {
            case "t": text += "\t"; break;
            case "r": text += "\r"; break;
            case "n": text += "\n"; break;
            default: text += c; break;
          }
          break;
        default:
          text += c;
          break;
      }
    }
    return text;
  },
  
  /** Picks items from _array_
   *
   *  @param  string A string ({string}, required)
   *  @return A camelized from _string_ ({string}, non-null)
   *  @MARK: -extract()
   */
  extract: function(array, types) {
    if (types && typeof(types) === 'object' && !Array.isArray(types)) {
      var i = 0, picked = {}, p = 0;
      for (var key in types) {
        var type = types[key];
        if (array[i] === null || type === null || _.isa(array[i], types[key]))
          picked[key] = picked[p++] = array[i++];
        else
          picked[key] = picked[p++] = null;
      }
      if (i < array.length)
        picked.remaining = slice.call(array, i);
      return picked;
    } else {
      var tc = arguments.length, picked = [], i = 0;
      for (var t = 1; t < tc; t++) {
        var type = arguments[t], pick = null;
        if (array[i] === null || type === null || _.isa(array[i], type))
          pick = array[i++];
        picked.push(pick);
      }
      if (i < array.length)
        picked.push(slice.call(array, i));
      return picked;
    }
  },
  
  /** Copies a value
   *
   *  @param  value The value to copy (optional)
   *  @param  deep `true` if this should be a deep copy ({boolean}, optional)
   *  @return The copied value
   *  @since  1.0
   *  @MARK:  -copy()
   */
  copy: function copy(value, deep) {
    if (typeof(value) === 'object') {
      if (value === null)
        return value;
      if (Array.isArray(value)) {
        var result = value.class ? value.class() : [];
        for (var i = 0, ic = value.length; i < ic; i++)
          result[i] = deep ? copy(value[i], true) : value[i];
        return result;
      } else if (value.constructor === Object /* won't across frames */) {
        var result = {};
        for (var key in value)
          result[key] = deep ? copy(value[key], true) : value[key];
        return result;
      }
    }
    return value;
  },

  /** Returns `true` if *a* and *b* are equal
   *
   *  @param  a The first value (optioanl)
   *  @param  b The second value (optional)
   *  @return `true` if equal
   *  @since  1.0
   *  @MARK:  -equals()
   */
  equals: function equals(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    var type = toString.call(a);
    if (type != toString.call(b)) return false;
    switch (type) {
      case '[object String]': return a === b;
      case '[object RegExp]': return a.toString() === b.toString();
      case '[object Number]': if (+a !== a) return +b !== +b;
                              return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':return +a === +b;
      case '[object Array]':  var ic = a.length;
                              if (ic !== b.length) return false;
                              for (var i = 0; i < ic; i++) {
                                if (!equals(a[i], b[i])) return false;
                              }
                              return true;
      case '[object Object]': if (a.class || b.class) return false;
                              if (a.constructor !== b.constructor) return false;
                              var aKeys = Object.keys(a), bKeys = Object.keys(b);
                              if (aKeys.length != bKeys.length) return false;
                              aKeys.sort(), bKeys.sort();
                              if (!equals(aKeys, bKeys)) return false;
                              for (var k = 0, kc = aKeys.length; k < kc; k++) {
                                var key = aKeys[k];
                                if (!equals(a[key], b[key])) return false;
                              }
                              return true;
      default: throw new Error("Unsupported type: " + type);
    }
  },

  /** 
   *
   *
   */
  each: function(coll, iterator) {
    switch (keyvalues.typeof(coll)) {
      case 'array':
        for (var i = 0, ic = coll.length; i < ic; i++) {
          iterator(coll[i], i);
        }
        break;
      case 'object':
        for (var key in coll) {
          iterator(coll[key], key);
        }
        break;
      case 'null': case 'undefined':
        return;
      default:
        iterator(coll);
        break;
    }
  },

  map: function(coll, iterator) {
    switch (keyvalues.typeof(coll)) {
      case 'array':
        var res = [];
        for (var i = 0, ic = coll.length; i < ic; i++) {
          res[i] = iterator(coll[i], i) || coll[i];
        }
        return res;
      case 'object':
        var res = {};
        for (var key in coll) {
          res[key] = iterator(coll[key], key) || coll[key];
        }
        return res;
      case 'null': case 'undefined':
        return null;
      default:
        return iterator(coll) || null;
    }
  },

  /** Removes all entries of the *item* from a collection, either an array or
   *  an object.
   *  
   *  @param  coll The collection ({array} or {object}, optional)
   *  @param  item The item (optional)
   *  @param  equivalent `true` or a function if the {-equals()} function
   *          should be used to test equivalency.
   *  @return `true` if removed
   *  @since  1.0
   *  @MARK:  -remove()
   */
  remove: function(coll, item, equivalent) {
    var count = 0;
    if (coll == null)
      return count;
    if (equivalent === true)
      equivalent = keyvalues.equals;
    if (Array.isArray(coll)) {
      if (equivalent) {
        for (var i = 0, ic = coll.length; i < ic; i++) {
          if (equivalent(coll[i], item))
            coll.splice(i, 1), i--, ic--, count++;
        }
      } else {
        for (var idx = 0; (idx = coll.indexOf(item, idx)) >= 0; ) {
          coll.splice(idx, 1);
          count++;
        }
      }

    } else if (keyvalues.typeof(item) === 'object') {
      var count = 0;
      for (var key in coll) {
        if (equivalent ? equivalent(coll[key], item) : coll[key] == item)
          delete(coll[key]), count++;
      }
    }
    return count;
  },

  /** Returns the type of the <i>value</i>. The possible types returned are:
   *  "null", "object", "array", "string", "number", "regexp" or the name of
   *  the user constructor.
   *  
   *  @param  value The value (optional)
   *  @return The type of the <i>value</i>
   *  @author K. Lo Shih <lo@readyon.com>
   *  @since  1.0
   *  @MARK:  -typeof()
   */
  typeof: function(value) {
    var type = typeof(value);
    switch (type) {
      case 'object':
        if (value == null)
          return 'null';
        if (Array.isArray(value))
          return 'array';
        if (value.jquery !== undefined)
          return 'jquery';
        if (value.getTime && value.toISOString || value._isAMomentObject)
          return 'date';
        if (value.klass !== undefined || value.class !== undefined)
          return 'object'
        if (value.constructor && (type = value.constructor.name))
          return type.toLowerCase();
        break;
      case 'function':
        if (value.className !== undefined && value.methodName === undefined)
          return 'class';
        if (functionToString.call(value).indexOf('class') === 0)
          return 'class';
        if (value.compile && value.exec)
          return 'regexp';
        break;
    }
    return type;
  },
 
  /** Returns the type of the <i>value</i>. The possible types returned are:
   *  "null", "object", "array", "string", "number", "regexp" or the name of
   *  the user constructor.
   *  
   *  @param  value The value (optional)
   *  @return The type of the <i>value</i>
   *  @author K. Lo Shih <lo@readyon.com>
   *  @since  1.0
   *  @MARK:  -classof()
   */
  classof: function(value) {
    var type = keyvalues.typeof(value);
    if (type === "object")
      return value.klass && value.klass.className
          || value.class && value.class.className
          || value.constructor.name
          || 'object';
    if (type === "class")
      return value.className;
    return type;
  },
  
  supertype: function(type) {
    return Object.getPrototypeOf(type.prototype).constructor;
  },
  
  visitType: function(startType, stopType, visitor, context) {
    for (var type = startType; type && type != stopType; type = this.supertype(type)) {
      var result = visitor.call(type, context);
      if (result !== undefined)
        return result;
    }
  },

  /** Returns `true` if the *str* is an ISO-8601 date.
   *
   *  @param  str The string ({string}, required)
   *  @return `true` if an ISO date
   *  @since  1.0
   *  @MARK:  -isISODate()
   */
  isISODate: function(str) {
    return str.length == 24 && str.charAt(4) == '-' && str.charAt(23) == 'Z';
  },

  /** Returns the moment lib
   *
   *  @type   function
   *  @since  1.0
   *  @MARK:  -moment()
   */
  moment: moment,

  /** Determines the default time zone of
   *
   *  @type   string
   */
  defaultTimezone: {
    get: function() {
      if (!defaultTimezone) {
        if (typeof(process) !== 'undefined') {
          defaultTimezone = process.env.TIMEZONE || process.env.TZ;
        }
        if (!defaultTimezone && typeof(document) !== 'undefined') {
          var metas = document.getElementsByTagName('meta');
          for (var i = 0, ic = metas.length; i < ic; i++) {
            if (metas[i].getAttribute('name') == 'timezone') {
              defaultTimezone = metas[i].getAttribute('content');
              break;
            }
          }
        }
        if (!defaultTimezone)
          defaultTimezone = moment.tz.guess();
        moment.tz.setDefault(defaultTimezone);
      }
      return defaultTimezone;
    },
    set: function(v) {
      return defaultTimezone = v;
    },
  },

};

/* If there are members which are property descriptors, then define the
 * porperty accordingly. */
for (var key in keyvalues) {
  var def = keyvalues[key];
  if (typeof(def) == 'object' && (def.get || def.value))
    Object.defineProperty(keyvalues, key, def);
}

[
  inflection,
  require('./selector.js'),
  require('./props.js')
].forEach(function(mod) {
  for (var key in mod) {
    if (keyvalues[key])
      throw new Error("IMPL");
    keyvalues[key] = mod[key];
  }
});

keyvalues.array = require('./array');

/* For keyvalues.equals() above */
var toString = Object.prototype.toString;
var functionToString = Function.prototype.toString;

