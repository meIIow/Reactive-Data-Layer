const { makeExecutableSchema } = require('graphql-tools');
const resolvers = require('./resolvers.js');
const RDL = require('./RDL.js');

const typeDefs = `
  directive @live on FIELD | FIELD_DEFINITION | QUERY
  
  type Query {
    Topics: [Topic]
    Topic(id: ID!): Topic @live
    User(id: ID!): User
  }
  type Mutation {
    like(id: ID!): Comment @live
    addComment(topic: ID!, author: String!, text: String!): Comment @live
    addUser(id: ID!): User
    updateUser(id: ID!, update: String!): User
  }
  type User {
    username: String
    password: String 
  }
  type Topic {
    id: ID! 
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
  }
`;

const directiveResolvers = {
  live: (resolve, source, args, context, info) => {
    // Check if this is the top of the query
    if (!context.live) {
      const returnType = info.fieldName;
      // This GraphQL type doesn't exist in the RDL
      if (!RDL.data[returnType]) {
        RDL.data[returnType] = {};
      }
      // context.live stores a reference to the RDL GraphQL type tree
      context.live = RDL.data[returnType];
      // Store the ws and Query info in the fucking RDL
      // RDL.subscribers['handle'] = 'Query';
    }

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
