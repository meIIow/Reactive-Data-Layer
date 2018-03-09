const { makeExecutableSchema } = require('graphql-tools');
const resolvers = require('./resolvers.js');
const RDL = require('./RDL.js');

const typeDefs = `
  directive @live on FIELD | FIELD_DEFINITION | QUERY

  type Query {
    Topics: [Topic] @live
    Topic(id: ID!): Topic @live
    User(id: ID!): User @live
  }
  type Mutation {
    like(id: ID!): Comment @live
    addComment(topic: ID!, author: String!, text: String!): Comment @live
    addUser(id: ID!): User @live
    updateUser(id: ID!, update: String!): User @live
  }
  type User {
    username: String @live
    password: String @live
  }
  type Topic {
    id: ID! @live
    content: String @live
    author: String @live
    authors: [String] @live
    comment: Comment @live
    comments: [Comment] @live
  }
  type Comment {
    id: ID! @live
    author: String @live
    text: String @live
    score: Int @live
    topic(id: ID!): Topic @live
  }
`;

const directiveResolvers = {
  live: (resolve, source, args, context, info) => {

    // hard-coded for now, for demo will grab from RDL
    let handle = 'I AM A HANDLE';

    // The GraphQL type that will be returned from the resolver
    const type = info.returnType;

    const isArray = resultIsArray(info.returnType);
    const isObject = resultIsObject(info.returnType);

    let typeString = type.toString();
    // strip off [ ] if it's an array
    if (isArray) {typeString = typeString.substring(1, typeString.length - 1)};

    // true if this is the first resolver
    const rootResolver = !context.live;

    // if first resolver, set context.live
    if (rootResolver) {
      //console.log('root', info);
      context.live = {};
      context.live.location = setOneLiveContext(typeString);
      context.live.handles = {};
    }

    // store lets us know where we are within the RDL
    let store = context.live.location;
    let handles = context.live.handles;

    // grabs correct location from context if they were set by an array
    if (Array.isArray(store)) {
      store = store[source.live]; // added live prop to source in last resursish step
    }

    return resolve().then((val) => {

      if (rootResolver && !isArray) {
        const id = val._id; // gonna have to change this

        // The current object with this id doesn't exist in the RDL
        if (!store[id]) {
          store[id] = {};
        }
        context.live.location = store[id];
      } else {
        const field = info.fieldName;
        if (!store[field]) {
          store[field] = setField(isArray, typeString);
        }

        // looks for differences between existing data and new data
        diffField(store[field], val, isArray, isObject, handles);

        // sets context for nested resolvers
        if (isObject) {context.live.location = setLiveContext(typeString, isArray, val)};

        store[field].subscribers[handle] = true; // add current handle to subscribers
      }
      console.log(handles);
      console.log(RDL.data.Comment);
      return val;
    });
  },
};

function resultIsArray(type) {
  const typeString = type.toString()
  return (typeString[0] === '[' && typeString[typeString.length-1] === ']')
}

function resultIsObject(type) {
  typeObj = (resultIsArray(type)) ? type.ofType: type;
  return (!!typeObj._typeConfig)
}

// figures out context info of single object or array of objects
function setLiveContext(typeString, isArray, val) {
  if (!isArray) return setOneLiveContext(typeString, val._id);
  return val.map((obj, i) => {
    obj.live = i;
    return setOneLiveContext(typeString, obj.id);
  })
}

// creates (if neccesary) and returns context of a single object
function setOneLiveContext(typeString, id) {
  if (!RDL.data[typeString]) {
    RDL.data[typeString] = {};
  }
  if (!id) return RDL.data[typeString];
  // Check if the object exists in the tree
  if (!RDL.data[typeString][id]) {
    RDL.data[typeString][id] = {};
  }
  return RDL.data[typeString][id]
}

function setField(isArray, typeString) {
  // initialized field to default 'empty' state
  return ({
    data: (isArray ? [] : null),
    subscribers: {},
    type: typeString
  });
}

// compares old data to newly resolved data
function diffField(field, val, isArray, isObject, handles) {
  let comp;
  let changed = false;

  if (isArray) {
    comp = val.map((obj, i) => {return setComparison(obj, isObject)});

    // compare each value of new data to old data
    changed = val.reduce((acc, curr, i) => {
      return (acc || curr !== field.data[i]);
    }, false)
    changed = changed || (comp.length !== field.data.length);

  } else {
    comp = setComparison(val, isObject);
    changed = (field.data !== comp)
  }

  if (changed) {
    console.log('-------------THERE WAS A CHANGE------------------')
    field.data = comp; // overwrite field

    // add subscribers of this data to list of handls to be fired back
    Object.assign(handles, field.subscribers);
  }
}

// grabs id if object, val if scalar
function setComparison(val, isObject) {
  return (isObject) ? val._id : val;
}

const directiveResolvers2 = {
  live: (resolve, source, args, context, info) => {

    // Check if this is the top of the query
    if (!context.live) {
      const returnType = info.fieldName;
      console.log('root', returnType);
      // This GraphQL type doesn't exist in the RDL
      if (!RDL.data[returnType]) {
        RDL.data[returnType] = {};
      }
      // context.live stores a reference to the RDL GraphQL type tree
      context.live = RDL.data[returnType];
      // Store the ws and Query info in the fucking RDL
      // RDL.subscribers['handle'] = 'Query';
    }

    // store lets us know where we are within the RDL
    let store = context.live;
    if (Array.isArray(store)) {
      // Indexing things in store
      store = store[source.live];
    }

    return resolve().then((val) => {
      // The GraphQL type that is returned from the resolver
      const { returnType } = info;
      const returnTypeString = returnType.toString();

      // The return type is an array
      if (returnTypeString[0] === '[') {
        const arrayType = returnType.ofType;

        // Remove the array brackets
        const returnTypeStringSliced = returnTypeString.substring(1, returnTypeString.length - 1);

        // The array is an object type
        if (arrayType._typeConfig) {
          // Check if the tree for this type exists
          if (!RDL.data[returnTypeStringSliced]) {
            RDL.data[returnTypeStringSliced] = {};
          }
          // Store the field name as the object key
          const field = info.fieldName;
          if (!store[field]) {
            store[field] = {
              data: { type: returnTypeStringSliced, id: [] },
              subscribers: ['handle'],
            };
          } else {
            store[field].data.id = [];
            // Check if ws handle is in subscribers array
            /**
             * DO STUFF HERE!!!!!!!!!!!
             */
            store[field].subscribers.push('handle2');
          }
          const contextArray = [];
          for (let i = 0; i < val.length; i += 1) {
            val[i].live = i;
            // Dependencies must have a unique id
            const id = val[i]._id;
            // Check if the object exists in the tree
            if (!RDL.data[returnTypeStringSliced][id]) {
              RDL.data[returnTypeStringSliced][id] = {};
            }
            contextArray.push(RDL.data[returnTypeStringSliced][id]);
            // Push object ids into array
            // store[field] = {
            //   data: { type: returnTypeStringSliced, id: [] },
            //   subscribers: ['handle'],
            // };
            store[field].data.id.push(id);
          }
          context.live = contextArray;
        } else {
          // Store the field name as the key
          const field = info.fieldName;
          if (!store[field]) {
            store[field] = {
              data: val,
              subscribers: ['me'],
            };
          } else {
            const current = store[field].data;
            if (current.length !== val.length) {
              store[field].data = val;
              store[field].subscribers.forEach((handle) => {
                RDL.queue[handle] = 'SEND ME DATA';
              });
            } else {
              for (let i = 0; i < current.length; i += 1) {
                if (current[i] !== val[i]) {
                  store[field].data = val;
                  store[field].subscribers.forEach((handle) => {
                    RDL.queue[handle] = 'SEND ME DATA';
                  });
                  break;
                }
              }
            }
          }
          // WE NEED TO CHECK FOR CUSTOM SCALAR TYPES? Maybe...
        }
      }
      // This is a GraphQL Object Type
      else if (returnType._typeConfig) {
        const parent = info.parentType.toString();
        if (parent === 'Query') {
          // Unique identifier for object
          const id = val._id;
          // The current object with this id doesn't exist in the RDL
          if (!store[id]) {
            store[id] = {};
          }
          context.live = store[id];
        } else {
          // Store the field name as the key
          const field = info.fieldName;
          const id = val._id;
          if (!store[field]) {
            store[field] = {
              data: { type: returnTypeString, id },
              subscribers: ['me'],
            }
          } else {
            // The data already exists. Add users as a subscriber.
            if (store[field].data.id !== id) {
              store[field].data.id = id;
              store[field].subscribers.forEach((handle) => {
                RDL.queue[handle] = 'SEND ME DATA';
              });
            }
            store[field].subscribers.push('me');
          }
          // Check if the tree for this type exists
          if (!RDL.data[returnTypeString]) {
            RDL.data[returnTypeString] = {};
          }
          // Check if the object exists in the tree
          if (!RDL.data[returnTypeString][id]) {
            RDL.data[returnTypeString][id] = {};
          }
          // Rebranch
          context.live = RDL.data[returnTypeString][id];
        }
      } else {
        // Store the field name as the key
        const field = info.fieldName;
        // The current object at id doesn't have this field as a property
        if (!store[field]) {
          store[field] = {
            data: val,
            subscribers: ['me'],
          };
        } else {
          // The data already exists. Add users as a subscriber.
          if (store[field].data !== val) {
            store[field].data = val;
            store[field].subscribers.forEach((handle) => {
              RDL.queue[handle] = 'SEND ME DATA';
            });
          }
          store[field].subscribers.push('me');
        }
      }
      console.log(RDL);
      return val;
    });
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  directiveResolvers,
});

module.exports = schema;
