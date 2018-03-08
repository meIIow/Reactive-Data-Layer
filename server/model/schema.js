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
      const GraphQLType = info.fieldName;
      // This GraphQL type doesn't exist in the RDL
      if (!RDL.data[GraphQLType]) {
        RDL.data[GraphQLType] = {};
      }
      // context.live stores a reference to the RDL GraphQL type tree
      context.live = RDL.data[GraphQLType];
    }

    let store = context.live;
    if (Array.isArray(store)) {
      store = store[source.live];
    }

    return resolve().then((val) => {
      // console.log('------------------');
      // console.log('context', context.live);
      // The GraphQL type that is returned from the resolver
      const { returnType } = info;

      // The return type is an array
      const returnTypeString = returnType.toString();
      if (returnTypeString[0] === '[') {
        // The GraphQL type of the array
        const arrayType = returnType.ofType;

        // Remove the array brackets
        const returnTypeStringSliced = returnTypeString.substring(1, returnTypeString.length - 1);

        if (arrayType._typeConfig) {
          // Check if the tree for this type exists
          if (!RDL.data[returnTypeStringSliced]) {
            RDL.data[returnTypeStringSliced] = {};
          }
          // Store the field name as the key
          const field = info.fieldName;
          if (!store[field]) {
            store[field] = {
              data: { type: returnTypeStringSliced, id: [] },
              subscribers: ['me'],
            }
          }
          const contextArray = [];
          for (let i = 0; i < val.length; i += 1) {
            val[i].live = i;
            const id = val[i]._id;
            // Check if the object exists in the tree
            if (!RDL.data[returnTypeStringSliced][id]) {
              RDL.data[returnTypeStringSliced][id] = {};
            }

            // Maybe store dependencies
            contextArray.push(RDL.data[returnTypeStringSliced][id]);
            // Push object ids into array
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
            }
          }
          // WE NEED TO CHECK FOR CUSTOM SCALAR TYPES

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
          store[field].subscribers.push('me');
        }
      }
      console.log(RDL.data.Comment);
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
