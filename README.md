
# keyvalues – 

## Resources

## Installing

```
npm install keyvalues
yarn add keyvalues
```

## Usage

```js
const kv = require('keyvalues');

var data = {
  owner: {
    name: 'Miko',
    status: 'active',
  },
  projects: [
    { 
      name: 'Project 1', 
      team: 'Team 1', 
      manager: {
        name: 'Mike', 
        status:'online'
      }
    },
    { 
      name: 'Project 2', 
      team: 'Team 2', 
      manager: {
        name: 'Mara', 
        status:'offline'
      }
    }
  ]
};

kv.get(data, 'owner.name'); // -> "Miko"
kv.get(data, 'projects.manager.name'); // -> ["Mike", "Mara"]

```


<a href="#">#</a> <i>kv</i>.<b>get</b>([<i>key</i>) [<>](/test)

this is data
