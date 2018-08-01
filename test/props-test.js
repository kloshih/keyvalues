
const kv = require('../lib/keyvalues.js');
const log = require('logsync');

const expect = require('chai').expect;

describe("KeyValues Props", function() {

  it("should create a system", function() {

    class Parent {
      static get props() {
        return {
          name: {type:'string'},
          children: {many:Child, naturalKey:'name'},
        }
      }
      parse() {
        let change = kv.parse(parent, doc).
          string('name').
          items('children', Child).
        end();
        return change.changeCount > 0;
      }
    }
    class Child {
      static get props() {
        return {
          parent: {one:'Parent'},
          name: {type:'string'},
          age: {type:'number'},
        }
      }
      parse() {
        let change = kv.parse(parent, doc).
          string('name').
          number('age').
        end();
        return change.changeCount > 0;
      }
    }

    var parent = new Parent();
    let doc = {
      name: 'Dad',
      children: {
        xv: { name:'Xoy', age:6 },
        ea: { name:'Ela', age:10 },
      },
    };

    let ch = kv.parse(parent, doc);
    //log('info', "change #byl[%s]", ch);

    let doc2 = kv.format(parent);
    log('info', "parent doc #gr[%s]", doc2);
    return null;


    // let doc = {
    //   name: 'Dad',
    //   children: {
    //     xv: { name:'Xoy', age:6 },
    //     ea: { name:'Ela', age:10 },
    //   },
    // };
    // parse.parse(doc);

    // let change = kv.parse(parent, doc).
    //   string('name').
    //   items(Child).
    // end();

    // log('info', "parent name: #gr[%s]", parent.name);
    // log('info', "changes #byl[%s]", change);

    // return;

    // kv.parse(parent, {
    //   name: 'Carly Apple',
    //   children: {
    //     tims: { name:'Tim Sherbert'},
    //     marc: { name:'Marc Vince'},
    //   },
    // });

    // log('info', "#bcy[parent.name #gr[%s]]", parent.name);

    // expect(parent.name).to.be.a('string');
    // expect(parent.name).to.be.equal('Carly Apple');
    // expect(parent.children).to.be.a('array');

  });

});

