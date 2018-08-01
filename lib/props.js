
const log = require('logsync');
const kv = require('./keyvalues.js')

const kAllProps = Symbol('allProps');

module.exports = {

  /*
   * props may define the following types:
   * 
   *  { type:<type-name>, req:'*'|'+' }
   *  { type:"array(item)", lookup:'name' }
   *  { type:"map(key, item)" }
   *  { type:<constructor>, req:'*'|'+' }
   *  { many:<type> }
   * 
   * 
   *  Canonical
   *    { kind:'value', type:'int8', itemtype:'', 
   *      keytype:'string', prec:-1, width:-1, nulls:y/n, 
   *      enum:[], coerce:fn }
   *    { kind:'one', type:'int8', itemtype:'', 
   *      keytype:'string', prec:-1, width:-1, nulls:y/n, 
   *      enum:[], coerce:fn }
   *    { kind:'many', type:'int8', itemtype:'', 
   *      keytype:'string', prec:-1, width:-1, nulls:y/n, 
   *      enum:[], coerce:fn }
   *    { kind:'map', type:'int8', itemtype:'', 
   *      keytype:'string', prec:-1, width:-1, nulls:y/n, 
   *      enum:[], coerce:fn }
   *      value:'', one:'', many:''
   *      type:'', one:''
   * *
   * 
   * 
   * Features:
   *  - Named 
   *  - Kinds/modality
   *    - value
   *      - Derived 
   *    - one
   *    - many (with key)
   *    - derived
   *  - Code
   *  - Versioning
   *  Mappings:
   *  - JSON - json schema
   *  - ORM - pk/fk/cols
   *  - GraphQL - 
   *  - XML - 
   *  - REST - 
   *  - 
   */

  /**
   * Returns all property definitions for the given class. 
   * @param {class} cls The class 
   */
  allProps(cls) {
    let allProps = cls[kAllProps];
    if (!allProps) {
      let superproto = Object.getPrototypeOf(cls.prototype);
      let curprops = {};
      for (let key in cls.props) {
        var prop = cls.props[key];
        curprops[key] = this.coerceProp(prop);
      }
      let supercls = superproto.constructor;
      if (supercls !== Object) {
        let superprops = allProps(supercls);
        let curprops = kv.merge({}, superprops, curprops);
      }
      allProps = cls[kAllProps] = curprops;
    }
    return allProps;
  },

  coerceProp(prop) {
    if (typeof(prop) == 'string') {
      prop = {type:prop};
    }

    if (prop.one) {
      prop.kind = 'one';
      prop.type = prop.one;
      delete(prop.one);
    } else if (prop.many) {
      prop.kind = 'many';
      prop.type = prop.many;
      delete(prop.many);
    } else {
      prop.kind = 'value';
      // delete(prop.)
    }

    return prop;
  },

  /**
   * Creates an instance of the given class. The instance will be initialized with all of the properties for the class. 
   * @param {class} cls The instance class
   */
  create(cls, data, opts) {
    let props = this.allProps(cls);
    let item = new cls();
    for (let key in props) {
      let prop = props[key];
      let value = data[key] || prop.default;
    }
    this.parse(item, data, opts);
    return item;
    
    
    // let allProps = this.allProps(cls);
    
  },

  coerceValue(prop, value) {
    if (value == null)
      return true;
    let valueType = kv.typeof(value);
    switch (prop.type) {
      case 'string':
        if (valueType !== 'string')
          throw new Error("Value is not a string, " + value);
        return value;
      case 'number':
        if (valueType !== 'number')
          throw new Error("Value is not a number, " + value);
        return value;
      default:
        return value;
    }
    return value;
  },

  parse(obj, doc, opts) {
    let cls = obj.constructor;
    // log('info', "cls #gr[%s]", cls && cls.name);
    let props = this.allProps(cls);
    // log('info', "props #byl[%s]", props);
    
    let changes = {};
    let chgCount = 0;
    for (let key in props) {
      let prop = props[key];
      let newVal = doc[key];
      if (newVal === undefined)
        continue;
      let oldVal = obj[key];
      // log('info', "key #gr[%s] prop #byl[%s]", key, prop);

      switch (prop.kind) {
        case 'value':
          newVal = this.coerceValue(prop, newVal);
          if (oldVal === undefined || oldVal != newVal) {
            obj[key] = newVal;
            changes[key] = oldVal;
            chgCount++;
          }
          break;
        case 'one':
          let item = oldVal;
          if (item == null) {
            item = this.create(prop.type, newVal, opts);
            chgCount++;
          } else {
            chgCount += this.parse(item, newVal);
          }
          break;
        case 'many':
          let list = oldVal;
          if (!list) {
            list = obj[key] = kv.array({indexes:{name:true}});
          }
          let idKey = prop.naturalKey || 'name';

          for (let itemKey in newVal) {
            let newDoc = newVal[itemKey];
            if (!('name' in newDoc))
              newDoc.name = itemKey;
            let newId = newDoc[idKey];
            let item = list.get(idKey, newId);
            if (!item) {
              item = new prop.type();
              if (newVal === null) {
                list.remove(item);
                // changes[key]
              } else {
                this.parse(item, newDoc, opts);
                list.add(item);
              }
            } else {
              this.parse(item, newDoc, opts);
            }
          }
          break;
        default:
          throw new Error("Unsupported prop kind: " + prop.kind);
          break;
      }
      
    }

    return { count:chgCount, changes:changes };
  },

  format(obj, doc, opts) {
    if (obj == null)
      return null;
    let cls = obj.constructor;
    let props = this.allProps(cls);
    
    doc || (doc = {});
    for (let key in props) {
      let prop = props[key];
      let value = obj[key];

      // log('info', "format #bbl[kind #df[%s]]", prop.kind);

      switch (prop.kind) {
        case 'value':
          if (value != null)
            doc[key] = value;
          break;
        case 'one':
          let subdoc = this.format(value, null, opts);
          if (subdoc != null)
            doc[key] = subdoc;
          break;
        case 'many':
          let list = value;
          if (!list) {
            list = obj[key] = kv.array({indexes:{name:true}});
          }
          let idKey = prop.naturalKey || 'name';
          let map = {};
          for (let i = 0, ic = list.length; i < ic; i++) {
            let item = list[i];
            let itemKey = item[idKey] || item.key || 'it' + i;
            let subdoc = this.format(item, null, opts);
            map[itemKey] = subdoc;
          }
          doc[key] = map;
          break;
        default:
          throw new Error("Unsupported prop kind: " + prop.kind);
          break;
      }
    }
    return doc;
  },

};




