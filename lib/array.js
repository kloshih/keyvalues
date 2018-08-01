

const kMeta = Symbol('meta');

const util = require('util');
const kv = require('./keyvalues.js');

const ArrayProto = Array.prototype;

function array(...args) {
  return new IArray(...args);
}

module.exports = array;

class IArray extends Array {

  constructor(config) {
    super();
    this[kMeta] = {};
    
    /* Configure indexes */
    if (config && config.indexes) {
      for (var key in config.indexes) {
        var opts = config.indexes[key];
// console.log("creating index: key=" + key + " opts=" + opts);
        this.index(key, opts);
      }
    }
    
    /* Add any remaining arguments as items */
    for (var i = 1, ic = arguments.length; i < ic; i++) {
      this.push(arguments[i]);
    }
  }
  
  index(key, options) {
    if (options === true) options = {unique:true};
    if (options === false) options = {unique:false};
    var meta = this[kMeta] || (this[kMeta] = {});
    const indexes = meta.indexes || (meta.indexes = new Map());
    key = normalizeKey(key);
    var index = indexes.get(key);
    if (!index) {
      index = new this.constructor.Index(this, key, options);
      indexes.set(key, index);
      if (index.unique && (!meta.identityIndex || !meta.identityIndex.unique))
        meta.identityIndex = index;
    } else if (options && options.unique && !index.unique) {
      throw new Error("Index is not unique as requested");
    }
    return index;
  }
  
  get(key, value) {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (arguments.length === 1) {
      if (!meta.identityIndex)
        throw new Error("Array doesn't have an identity index");
      return meta.identityIndex.getItem(key);
    }
    var index = this.index(key);
    if (!index.simple)
      value = Array.prototype.slice.call(arguments, 1);
    return index.get(value);
  }
  
  all(key, value) {
    var index = this.index(key);
    if (!index.simple)
      value = Array.prototype.slice.call(arguments, 1);
    return index.all(value);
  }
  
  calc(index, opts) {
    // var args = _.extract(arguments, {index:['string','array'], opts:'object'});
    // opts = args.opts, index = args.index;
    if (!opts) throw new Error("Options required");
    if (index && index.length == 0)
      index = null;
    var totalKey = opts.total !== undefined ? opts.total : 'total';
    
    var target = opts.target || null,
        initial = opts.initial || {},
        iterator = opts.iterator,
        filter = opts.filter,
        finalize = opts.finalize;
    if (!iterator) throw new Error("Iterator required");
    var result = copy(initial, true);
    if (!index || totalKey) {
      for (var i = 0, ic = this.length; i < ic; i++) {
        var item = this[i];
        if (!filter || filter.call(target, item, i, ic)) {
          iterator.call(target, item, result);
        }
      }
      finalize && finalize.call(target, result);
    }
    
    if (index && index.length) {
      var total = result;
      var indexes = Array.isArray(index) ? copy(index) : [index];
      var indexKey = indexes.shift();
      var next = this.index(indexKey, opts);
      result = next.calc(indexes, opts);
      if (totalKey)
        result[totalKey] = total;
    }
    return result;
  }
  
  changed(item) {
    var meta = this[kMeta] || (this[kMeta] = {});
// KLS: We want to publish changes regardless of whether we have an indexes
//    var indexes = this._indexes;
//    if (!indexes)
//      return;
    this.begin();
    meta.changes.push({ action:'=', item:item });
    this.end();
  }
  
  last() {
    return this[this.length - 1];
  }
  
  contains(item) {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (meta.identityIndex)
      return meta.identityIndex.getItem(item) != null;
    else
      return this.indexOf(item) >= 0;
  }
  
  clear() {
    var meta = this[kMeta] || (this[kMeta] = {});
    this.begin();
    for (var i = 0, ic = this.length; i < ic; i++) {
      meta.__removed.push(this[i]);
    }
    this.length = 0;
    this.end();
  }
  
  splice(index, length) {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (typeof(index) !== 'number')   index = 0;
    if (index < 0)                    index = Math.max(0, this.length + index);
    if (index > this.length)          index = this.length;
    if (typeof(length) !== 'number')  length = this.length - index;
    if (length < 0)                   length = 0;
    if (index + length > this.length) length = this.length - index;
    // log('info', "index=%s, length=%s", index, length);

    this.begin();
    var args = [index, length];
    for (var i = 0; i < length; i++) {
      meta.changes.push({ action:'-', item:this[index + i] });
    }
    for (var i = 2, ic = arguments.length; i < ic; i++) {
      var item = arguments[i];
      meta.changes.push({ action:'+', item:item });
      args.push(item);
    }
    ArrayProto.splice.apply(this, args);
    this.end();
  }
  
  remove(item) {
    this.begin();
    var count = 0;
    for (var index; (index = this.indexOf(item)) >= 0; ) {
      // log('info', "#bbl[Removing #df[%d] item #df[%s]]", index, item);
      this.splice.call(this, index, 1);
      count++;
    }
    this.end();
    return count > 0;
  }
  
  add(item, index) {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (!this.contains(item)) {
      this.push(item);
    } else {
      if (meta.marked)
        this.unmark(item);
    }
    return false;
  }
  
  put(item, equals) {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (!meta.identityIndex)
      throw new Error("No identity index");
    var oldKey = meta.identityIndex.itemKey(item);
    if (!meta.identityIndex.map)
      meta.identityIndex.rebuild();
    var old = meta.identityIndex.map[oldKey];
    if (old) {
      if (meta.marked && meta.marked[oldKey])
        meta.unmark(old);
      if (equals) {
        if (typeof(equals) === 'function' && equals(old, item))
          return false;
        else if (kv.equals(old, item))
          return false;
      }
      /* If there's an old item, replace it with the new item */
      var index = this.indexOf(old);
      if (index < 0)
        throw new Error("IMPL: indexOf() couldn't find old item");
      this.begin();
      this[index] = item;
      meta.changes.push({ action:'=', item:item, old:old });
      this.end();
      return false;
    } else {
      /* If there's not an old item add it */
      this.push(item);
      return true;
    }
  }
  
  push(value) {
    var meta = this[kMeta] || (this[kMeta] = {});
    this.begin();
    for (var i = 0, ic = arguments.length; i < ic; i++) {
      var item = arguments[i];
      meta.changes.push({ action:'+', item:item });
    }
    ArrayProto.push.apply(this, arguments);
    this.end();
    return this.length;
  }
  
  pop() {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (this.length === 0)
      return undefined;
    this.begin();
    var item = ArrayProto.pop.call(this);
    meta.changes.push({ action:'-', item:item });
    this.end();
    return item;
  }
  
  /** Removes the last element
   *
   *  @param  value... The value (optional)
   *  @return The new length of the array ({number}, non-null)
   *  @since  1.0
   *  @MARK:  -shift()
   */
  shift() {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (this.length === 0)
      return undefined;
    
    this.begin();
    var item = ArrayProto.shift.call(this);
    meta.changes.push({ action:'-', item:item });
    this.end();
    return item;
  }
  
  /** Removes the last element
   *
   *  @param  value... The value (optional)
   *  @return The new length of the array ({number}, non-null)
   *  @since  1.0
   *  @MARK:  -unshift()
   */
  unshift() {
    var meta = this[kMeta] || (this[kMeta] = {});
    this.begin();
    for (var i = 0, ic = arguments.length; i < ic; i++) {
      var item = arguments[i];
      meta.changes.push({ action:'+', item:item });
    }
    ArrayProto.unshift.apply(this, arguments);
    this.end();
    return this.length;
  }
  
  /** Removes the last element
   *
   *  @param  value... The value (optional)
   *  @return The new length of the array ({number}, non-null)
   *  @since  1.0
   *  @MARK:  -sort()
   */
  sort() {
    return ArrayProto.sort.call(this);
  }
  
  /** Reverses the items in the array
   *
   *  @return `this`
   *  @since  1.0
   *  @MARK:  -reverse()
   */
  reverse() {
    return ArrayProto.reverse.call(this);
  }
  
  
  /*+-------------------------------------------------------------------------* 
   |                       MARK: | Marking and updating                       | 
   *--------------------------------------------------------------------------*/
  
  /** Marks all items in the array. All subsequent calls to -unmark() or -add()
   *  for existing items will be cleared of its mark.
   *  
   *  @see    -unmark()
   *  @see    -purge()
   *  @since  1.0
   *  @MARK:  -mark()
   */
  mark() {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (!meta.identityIndex)
      throw new Error("No identity index configured for array");
    if (meta.marked)
      throw new Error("Array already marked");
    var marked = meta.marked = {};
    var itemKeys = meta.identityIndex.itemKeys();
    for (var i = 0, ic = itemKeys.length; i < ic; i++)
      marked[itemKeys[i]] = true;
  }
  
  /** Give a pass to the given *item*, removing its mark so that a call to
   *  {-purge()} will not remove this *item*. If `unmark()` is called with zero
   *  arguments, marks are reset without purging.
   *  
   *  @param  item The item (required)
   *  @return `true` if the item was marked ({boolean}, non-null)
   *  @see    -mark()
   *  @see    -purge()
   *  @since  1.0
   *  @MARK:  -unmark()
   */
  unmark(item) {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (arguments.length === 0) {
      delete(meta.marked);
      return;
    }
    var marked = meta.marked;
    if (!marked)
      throw new Error("Array not marked");
    var itemKey = meta.identityIndex.itemKey(item);
    if (!(itemKey in marked))
      throw new Error("Item not in array: " + JSON.stringify(itemKey) + " (" + JSON.stringify(marked) + ")");
    delete(marked[itemKey]);
  }

  /** Purges all marked items in the array.
   *
   *  @since  1.0
   *  @MARK:  -purge()
   */
  purge() {
    var meta = this[kMeta] || (this[kMeta] = {});
    var marked = meta.marked;
    if (!marked)
      throw new Error("Array not marked");
    delete(meta.marked);
    var index = meta.identityIndex;
    this.begin();
    // log('info', "Removing marked keys");
    for (var itemKey in marked) {
      var item = index.map[itemKey];
      this.remove(item);
    }
    this.end();
  }

  /*+-------------------------------------------------------------------------*
   |                  MARK: | Modifying & Observing Changes                   | 
   *--------------------------------------------------------------------------*/
  
  
  /** Begins a bracketed change
   *
   *  @see    -end()
   *  @since  1.0
   *  @MARK:  -begin()
   */
  begin() {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (meta.depth === undefined) {
      meta.depth = 0;
      meta.changes = [];
      meta.listeners || (meta.listeners = []);
    }
    meta.depth++;
  }

  /** Ends a bracketed change
   *
   *  @see    -begin()
   *  @since  1.0
   *  @MARK:  -end()
   */
  end() {
    var meta = this[kMeta] || (this[kMeta] = {});
    if (--meta.depth < 0)
      throw new Error("Bracket mismatch");
    // log('info', "#yl[Ended: %d]", meta.depth);
    if (meta.depth === 0) {
      var changes = meta.changes;
      if (changes.length > 0) {
        var indexes = meta.indexes;
        if (indexes) {
          for (var index of indexes.values()) {
//            var index = indexes[key];
            index.didChange(changes);
          }
        }
        this.didChange(changes)
        changes.length = 0;
      }
    }
  }
  
  /** Observes that the array has changed. This class's implementation emits a
   *  'change' event.
   *  
   *  @param  changes An array of changes items ({array}, required)
   *  @since  1.0
   *  @MARK:  -didChange()
   */
  didChange(changes) {
    this.emit('change', changes);
  }

  /** Returns an array of listeners for the given *event*
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  [create] `true` if listeners should be created ({boolean}, 
   *          optional)
   *  @return An array of listeners for the *event* or `null`
   *  @since  1.0
   *  @MARK:  -listeners()
   */
  listeners(event, create) {
    var meta = this[kMeta] || (this[kMeta] = {});
    var events = meta.events || (meta.events = {});
    if (!events) {
      if (!create) return [];
      meta.events = [];
      if (!meta.maxListeners)
        meta.maxListeners = 10000;
    }
    var listeners = events[event];
    if (!listeners) {
      if (!create) return [];
      listeners = events[event] = [];
    }
    return listeners;
  }
  
  /** Sets the maximum number of listeners before a warning is logged
   *
   *  @param  count The maximum number of listeners ({number}, required)
   *  @since  1.0
   *  @MARK:  -setMaxListeners()
   */
  setMaxListeners(count) {
    var meta = this[kMeta] || (this[kMeta] = {});
    meta.maxListeners = count;
    return this;
  }
  
  /** Adds a listener function for the given *event*.
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  listener The event listener ({function(..)}, required)
   *  @see    #removeListener()
   *  @since  1.0
   *  @MARK:  -addListener()
   */
  addListener(event, listener) {
// log('info', "^^#bk[EVENTED #bbk[%20s.]#df[addListener]('%s')]", this.klass.className + ':' + _.iid(this), event);
    return this.on.apply(this, arguments);
  }
  
  /** Removes a listener function for the given *event*.
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  listener The event listener ({function(..)}, required)
   *  @see    #addListener()
   *  @since  1.0
   *  @MARK:  -removeListener()
   */
  removeListener(event, listener) {
// log('info', "^^#bk[EVENTED #bbk[%20s.]#df[removeListener]('%s')]", this.klass.className + ':' + _.iid(this), event);
    return this.off.apply(this, arguments);
  }
  
  /** Removes a listener function for the given *event*.
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  listener The event listener ({function(..)}, required)
   *  @see    #addListener()
   *  @since  1.0
   *  @MARK:  -removeAllListeners()
   */
  removeAllListeners(event) {
    var listeners = this.listeners(event);
    if (!listeners)
      return this;
    for (var i = 0, ic = listeners.length; i < ic; i++)
      this.off(event, listeners[i]);
    return this;
  }
  
  /** Removes a listener function for the given *event*.
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  listener The event listener ({function(..)}, required)
   *  @see    #addListener()
   *  @since  1.0
   *  @MARK:  -on()
   */
  on(event, listener) {
    var meta = this[kMeta] || (this[kMeta] = {});
// log('info', "^^#bk[EVENTED #bbk[%20s.]#df[on]('%s')]", this.klass.className + ':' + _.iid(this), event);
    if (typeof(event) !== 'string')
      throw new Error("Event must be a string");
    if (typeof(listener) !== 'function')
      throw new Error("Listener must be a function");
    var listeners = this.listeners(event, true);
    /* Add the listener. Postpone only for the 'newListener' event */
    if (event !== 'newListener')
      listeners.push(listener);
    if (meta.maxListeners > 0 && listeners.length == meta.maxListeners)
      log('error', "#yl[More than " + meta.maxListeners + " added for event, '" + event + "' on %s]", this);
    if (listeners.length === 1 && this._onStartListeners)
      this._onStartListeners(event);
    if (this._onAddListener)
      this._onAddListener(event, listener, listener.once);
    if (meta.events.newListener && meta.events.newListener.length > 0)
      this.emit('newListener', event, listener);
    if (event === 'newListener')
      listeners.push(listener);
    return this;
  }
  
  /** Removes a listener function for the given *event*.
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  listener The event listener ({function(..)}, required)
   *  @see    #addListener()
   *  @since  1.0
   *  @MARK:  -off()
   */
  off(event, listener) {
// log('info', "^^#bk[EVENTED #bbk[%20s.]#df[off]('%s')]", this.klass.className + ':' + _.iid(this), event);
    if (typeof(event) !== 'string')
      throw new Error("Event must be a string");
    if (typeof(listener) !== 'function')
      throw new Error("Listener must be a function");
    var listeners = this.listeners(event, true);
    if (!listeners)
      return this;
    var removed = false;
    for (var i = 0, ic = listeners.length; i < ic; i++) {
      var handler = listeners[i];
      if (handler === listener || handler.once === listener) {
        removed = true;
        listeners.splice(i, 1), i--, ic--;
      }
    }
    if (this._onRemoveListener)
      this._onRemoveListener(event, listener);
    if (listeners.length === 0 && this._onStopListeners)
      this._onStopListeners(event);
    if (this.listeners('removeListener', false).length > 0)
      this.emit('removeListener', event, listener);
    return this;
  }
  
  /** Adds a listener for the given *event* for a single call.
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  listener The event listener ({function(..)}, required)
   *  @see    #removeListener()
   *  @since  1.0
   *  @MARK:  -once()
   */
  once(event, listener) {
// log('info', "^^#bk[EVENTED #bbk[%20s.]#df[once]('%s')]", this.klass.className + ':' + _.iid(this), event);
//    listener.once = true;
    var self = this, handler = function() {
      self.off(event, handler);
      listener.apply(null, arguments);
    };
    handler.once = listener;
    return this.on(event, handler);
  }
  
  /** Emits the given *event*
   *
   *  @param  event The name of the event ({string}, required)
   *  @param  [args...] The arguments (optional)
   *  @since  1.0
   *  @MARK:  -emit()
   */
  emit(event) {
// log('info', "^^#bk[EVENTED #bbk[%20s.]#df[emit]('%s')]", this.klass.className + ':' + _.iid(this), event);
    var listeners = this.listeners(event, false);
    if (!listeners || listeners.length === 0)
      return;
    listeners = listeners.slice();
    var args = arguments.length > 1 ? slice.call(arguments, 1) : null;
    var error;
    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
//       if (listener.once) {
//         delete(listener.once);
//         listeners.slice(i, 1), i--;
//       }
      try {
        // log('info', "#bbk[Calling #wh[%s] %s]", event, listener);
        if (args)
          listener.apply(null, args);
        else
          listener();
      } catch (e) {
        console.log("array.emit(): e=", e);
        // log('error', e, "Failed to call listener " + i + " (of " + listeners.length + "): " + listener);
        if (!error) {
          error = new Error("While handling '" + event + "': " + e.message);
          error.stack = e.stack;
          error.errors = [e];
        } else {
          error.message += '; ' + e.message;
          error.errors.push(e);
        }
      }
    }
    if (error)
      throw error;
    return this;
  }
  
}

array.IArray = IArray;

IArray.Index = class Index {

  /** Creates an index
   *
   *  @param  array The array ({array}, required)
   *  @param  key The key ({string}, required)
   *  @param  options The index options ({object}, optional)
   *  @since  1.0
   *  @MARK:  -init()
   */
  constructor(array, key, options) {
    this.array = array;
    this.key = key;
    this.options = options || {};
    this.keyGet = this.options.keyGet || kv.get;
    this.keys = this.key.split(/[\s,]+/);
    this.values = [];
    this.simple = this.keys.length == 1;
    this.unique = !!this.options.unique;
    this.map = null;
    this.rebuild();
  }
  
  toString() {
    var text = [];
    for (var key in this.map)
      text.push(key);
    return "Index(" + this.key + ":{" + text.join(',') + "})"
  }
  
  /** Returns keys of all items as an array. This method is currently only
   *  supported for {-simple} indexes.
   *  
   *  @return An array of keys ({array}, non-null)
   *  @since  1.0
   *  @MARK:  -itemKeys()
   */
  itemKeys() {
    if (!this.map)
      this.rebuild();
    return Object.keys(this.map);
  }
  
  /** Returns the existing item if the array contains the given *item* using
   *  this index.
   *  
   *  @param  item The item ({object}, required)
   *  @return `true` if contains
   *  @since  1.0
   *  @MARK:  -getItem()
   */
  getItem(item) {
    if (!this.map)
      this.rebuild();
    if (!this.unique)
      throw new Error("array.Index.getItem() should only be used with unique indexes");
    var itemKey = this.itemKey(item);
    return this.map[itemKey];
  }
  
  /** Gets the items matching the given *values*.
   *
   *  @param  values... The values for corresponding keys (required)
   *  @return The first matching item ({Record} or `null`)
   *  @see
   *  @since  1.0
   *  @MARK:  -get()
   */
  get(value) {
    if (this.unique) {
      return this.all(value);
    } else {
      return this.all(value)[0];
    }
  }
  
  /** Gets all of the items matching the given
   *
   *  @param  values The values for corresponding keys (required)
   *  @return An array of items ({array}, non-null)
   *  @see
   *  @since  1.0
   *  @MARK:  -all()
   */
  all(value) {
    if (!this.map)
      this.rebuild();
    if (!this.simple && !Array.isArray(value))
      value = [value];
    var key = this.valueKey(value);
    if (this.unique) {
      return this.map[key];
    } else {
      return this.map[key] || [];
    }
  }
  
  /** Calculates a hash of values calculated with the given options.
   *
   *  @param  index The index keys ({array} or single {string}, required)
   *  @param  opts The index options ({object}, optional)
   *  @return The resulting values ({object}, non-null)
   *  @see    -array.calc()
   *  @since  1.0
   *  @MARK:  -calc()
   */
  calc(index, opts) {
    // var args = kv.extract(arguments, {index:['string','array'], opts:'object'});
    // opts = args.opts, index = args.index;
    var idKey = opts.id || 'id';
    var result = {};//, map = result.map = {};
    var values = this.values;
    for (var v = 0, vc = values.length; v < vc; v++) {
      var value = values[v], valueKey = this.valueKey(value, opts.keySeparator);
      var subitems = this.all(value);
      var subresult = subitems.calc(index, opts);
      subresult[idKey] = value;
//      result.push(map[valueKey] = subresult);
      result[valueKey] = subresult;
    }
    return result;
  }
  
  /** Returns the index key for the given *value*
   *
   *  @param  value The value (required)
   *  @return The index key (non-null)
   *  @since  1.0
   *  @MARK:  -valueKey()
   */
  valueKey(value, separator) {
    if (this.simple) {
      return value;
    } else {
      return value.join(separator || '\x00');
    }
  }
  
  /** Returns the *item*'s value for this index's {-key}. If the index is not
   *  {-simple}, the returned value is an array.
   *  
   *  @param  item The item (required)
   *  @return The item's index value ()
   *  @since  1.0
   *  @MARK:  -itemValue(item)
   */
  itemValue(item) {
    if (this.simple) {
      return Array.isArray(item) && !item.class ? item[this.key] : this.keyGet(item, this.key);
    } else {
      var value = [];
      for (var keys = this.keys, k = 0, kc = keys.length; k < kc; k++) {
        var key = keys[k];
        value[k] = Array.isArray(item) && !item.class ? item[key] : this.keyGet(item, key);
      }
      return value;
    }
  }
  
  /** Returns the index key for the given *value*
   *
   *  @param  value The value (required)
   *  @return The index key (non-null)
   *  @since  1.0
   *  @MARK:  -itemKey()
   */
  itemKey(item) {
    return this.valueKey(this.itemValue(item));
//     if (this.simple) {
//       return Array.isArray(item) ? item[this.key] : this.keyGet(item, this.key);
//     } else {
//       var keys = this.keys, count = keys.length;
//       var value = [];
//       for (var k = 0; k < count; k++) {
//         var key = keys[k];
//         value[k] = Array.isArray(item) ? item[key] : this.keyGet(item, key);
//       }
//       return this.valueKey(value);
//     }
  }
  
  /** Rebuilds the index
   *
   *  @since  1.0
   *  @MARK:  -rebuild()
   */
  rebuild() {
    this.map = {};
    for (var i = 0, ic = this.array.length; i < ic; i++) {
      var item = this.array[i];
      this.include(item);
    }
    // log('info', "Rebuild index: #gr[%s]: #yl[%s]", this.keys, kv.dump(this.map));
  }
  
  /** Adds the *item* to the index
   *
   *  @param  item The item (required)
   *  @param  value The item's value (optional)
   *  @since  1.0
   *  @MARK:  -include()
   */
  include(item, value) {
    value || (value = this.itemValue(item));
    var valueKey = this.valueKey(value);
    if (this.unique) {
      if (!(valueKey in this.map))
        this.values.push(value);
      this.map[valueKey] = item;
    } else {
      var items = this.map[valueKey];
      if (items == null) {
        // log('info', "Warning this=%s, this.array=%s, this.array.class=%s", this, this.array, this.array.class);
        items = this.map[valueKey] = new this.array.constructor.IndexGroup();
        this.values.push(value);
      }
      items.push(item);
    }
    // this.groups.forEach(function(g) { g.include(item, key) });
  }
  
  /** Removes the *item* to the index for the given known *key*. If *key* is not
   *  provided, the *item* is searched throughout the index.
   *  
   *  @param  item The item (required)
   *  @param  value The item's value (optional)
   *  @since  1.0
   *  @MARK:  -exclude()
   */
  exclude(item, value) {
    value || (value = this.itemValue(item));
    var valueKey = this.valueKey(value);
    if (this.unique) {
      if (item === this.map[valueKey]) {
        delete(this.map[valueKey]);
        kv.remove(this.values, value);
        // this.groups.forEach(function(g) { g.exclude(item, valueKey) });
        return true;
      }
      for (var valueKey in this.map) {
        if (item === this.map[valueKey]) {
          delete(this.map[valueKey]);
          kv.remove(this.values, value);
          // this.groups.forEach(function(g) { g.exclude(item, valueKey) });
          return true;
        }
      }
      return false;
    } else {
      var items = this.map[valueKey];
      if (items && kv.remove(items, item)) {
        if (items.length === 0)
          kv.remove(this.values, value);
        // this.groups.forEach(function(g) { g.exclude(item, valueKey) });
        return true;
      }
      for (var valueKey in this.map) {
        var items = this.map[valueKey];
        if (kv.remove(items, item)) {
          if (items.length === 0)
            kv.remove(this.values, value);
          // this.groups.forEach(function(g) { g.exclude(item, valueKey) });
          return true;
        }
      }
      return false;
    }
  }
  
  /** Observes a change to the array.
   *
   *  @param  added The added items ({array}, required)
   *  @param  removed The removed items ({array}, optional)
   *  @since  1.0
   *  @MARK:  -didChange()
   */
  didChange(changes) {
    if (!this.map)
      return;
    for (var c = 0, cc = changes.length; c < cc; c++) {
      var change = changes[c];
      switch (change.action) {
        case '!':
        case '+':
          this.include(change.item);
          break;
        case '=':
          this.exclude(change.old || change.item);
          this.include(change.item);
          break;
        case '-':
          this.exclude(change.item || change.old);
          break;
      }
    }
//    if (added) {
//      for (var i = 0, ic = added.length; i < ic; i++)
//        this.include(added[i]);
//    }
//    if (removed) {
//      for (var i = 0, ic = removed.length; i < ic; i++)
//        this.exclude(removed[i]);
//    }
//    if (changed) {
//      for (var i = 0, ic = changed.length; i < ic; i++) {
//        var change = changed[i],
//            oldItem = change[0],
//            newItem = change[1];
//        this.exclude(oldItem);
//        this.include(newItem);
//      }
//    }
  }
  
}

IArray.IndexGroup = class IndexGroup extends IArray {
  
  /** Creates an index
   *
   *  @param  config The configuration ({object} or {Config}, optional)
   *  @param  owner The owner (optional)
   *  @since  1.0
   *  @MARK:  -constructor()
   */
  constructor(index, values) {
    super();
    this._index = index;
    this._values = values;
  }
  
}


function normalizeKey(key) {
  if (key.indexOf(' ') >= 0)
    return key.replace(/\s+/g, '');
  return key;
}

function copy(value, deep) {
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
}

function equals(a, b) {
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
                            for (var i; i < ic; i++) {
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
                              if (!equal(a[key], b[key])) return false;
                            }
                            return true;
    default: throw new Error("Unsupported type: " + type);
  }
}

var toString = Object.prototype.toString,
    slice = Array.prototype.slice;

