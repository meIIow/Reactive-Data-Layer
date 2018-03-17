const { makeExecutableSchema } = require('graphql-tools');
const { addDirectiveResolveFunctionsToSchema } = require('graphql-directive');
const resolvers = require('./resolvers.js');
const RDL = require('./RDL.js');

const typeDefs = `
  directive @live on FIELD | FIELD_DEFINITION | QUERY
  directive @upper on FIELD | FIELD_DEFINITION | QUERY
  directive @addMe on FIELD | FIELD_DEFINITION | QUERY


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
  upper: (resolve, source, args, context, info) => {
    return resolve().then((val) => {
      console.log('UPPER')
      return val;
    });
  },
  addMe: (resolve, source, args) => {
    return resolve().then((val) => {
      console.log('logged')
      return val;
    });
  },
  live: (resolve, source, args, context, info) => {

    // return resolve().then((val) => {return val});
    if (!context.__live) {
      console.log(`no context.__live was set. That is srsly messed up. What's a guy to do?`)
      context.__live = {};
    }

    let live = context.__live; // gonna be referencing this a lot
    // console.log('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
    // console.log(context.__live);
    // console.log(live)

    const handle = 'I AM A HANDLE' //live.handle || '';
    const alias = 'live' //live.directive;
    const idField = 'id' //live.uid;

    //console.log(live.references);

    if (!live.resolverCount) { // this is the first resolver to be called
      console.log('plz do not fire');
      live.resolverCount = 0;
      live.referenceCount = 0;
      live.references = [];
      live.handles = [];
    }
    const count = live.resolverCount++;
    console.log(live.resolverCount);
    const refCount = live.referenceCount;

    // The GraphQL type that will be returned from the resolver
    const type = info.returnType;

    // The GraphQL type that this is a field of
    const parent = info.parentType;

    const isArray = resultIsArray(type);
    const isObject = resultIsObject(type);

    let typeString = type.toString();
    if (isArray) {typeString = typeString.substring(1, typeString.length - 1)}; // strip off [ ] if it's an array

    const parentString = parent.toString();

    const fieldName = info.fieldName;
    let fieldString = setFieldString(fieldName, info.fieldNodes[0].arguments);

    const rootResolver = (parentString === 'Query' || parentString === 'Mutation')
    let orphan = false;

    let reference = live.references[live.referenceCount];

    // new stuff

    if (!reference) {
      // console.log('SDSSADDSS');
      // console.log('reference count', live.referenceCount);
      // console.log('ref', live.references);
      orphan = true;
    } else if (reference.source !== source) {
      reference = live.references[live.referenceCount+1];
      if (!reference || reference.source !== source) {
        console.log('-----------------orphan----------------------------------');
        if (reference) console.log('reference.source', reference.source);
        console.log('source', source);
        orphan = true;
      } else {
        live.referenceCount ++;
      }
    }



    // const fromArray = Array.isArray(reference);
    // let index;
    // if (fromArray) {
    //   index = source.__liveIndex
    //   reference = reference[index]; // added live prop to source in last resursish step
    // }

    // const orphan = (!reference || reference.source !== source);

    if (rootResolver || orphan) {
      //console.log('-----------------orphan?-------------------', source, live.references);
      reference = setReference(source, null, getReference(parentString), null);
    }

    // store lets us know where we are within the RDL

    // grabs correct location from context if they were set by an array

    let handles = reference.handles;
    live.handles[count] = handles.existing;

    //console.log('outer resolve', reference)

    return resolve().then((val) => {
      // console.log('inner resolve')
      // console.log(reference);

      setFields(isArray, typeString, fieldString, reference);

      // looks for differences between existing data and new data
      // diffField(store[field], val, isArray, isObject, handles);

      //console.log('set fields');

      // sets context for nested resolvers

      // KEEP CHILD POINTED TO RIGHT PARENTSTRING
      if (isObject) {

        //(isArray, val, field)
        //console.log('YYYYYYYY', reference.existing[fieldString]);
        reference.replacement[fieldString] = reference.existing[fieldString];
        setReferences(isArray, val, reference.existing[fieldString], live);
        //console.log('-------object reset refs---------', live.reference);
      } else {

        //field, val, isArray, isObject, handles
        diffField(reference.existing[fieldString], val, isArray, false, handles.existing);
        diffField(reference.replacement[fieldString], val, isArray, false, handles.replacement);
      };

      //console.log('set context');

      reference.existing[fieldString].subscribers[handle] = true; // add current handle to subscribers
      reference.replacement[fieldString].subscribers[handle] = true; // add current handle to subscribers

      if (fieldName === idField) {
        console.log('this object has an id');
        // combine replacement with object with that id
        const x = getReference(val);
        let fields = Object.keys(reference.replacement);
        //console.log('fields', fields);
        for (field of fields) {
          // diffField(field, val, isArray, isObject, handles)
          let fieldHasArray = Array.isArray(reference.replacement[field].data);
          if (!x[field]) {x[field] = setField(fieldHasArray, reference.replacement[field].type)}
          diffField(x[field], reference.replacement[field].data, fieldHasArray, false, handles.replacement);
          Object.assign(x[field].subscribers, reference.replacement[field].subscribers);

          // TODO - have way of making sure child parentFields have reference back up to right field
          //console.log('SHOULD NOT BE NULL', x[field])
          reference.replacement[field] = x[field];

        }
        reference.replacement = x;
        // go back into parent field and replace with id, check for changes
        console.log('5******');
        // console.log(reference);

        if (!Array.isArray(reference.parentField)) {
          console.log('not arr');
          reference.parentField.data = val; // TODO this could be an issue
          console.log('******5');
          if (reference.existingData !== val) {
            Object.assign(handles.replacement, reference.parentField.subscribers);
          };
        } else {
          console.log('arr');
          reference.parentField.data[index] = val; // TODO this could be an issue
          console.log('******5');
          if (reference.existingData[index] !== val) {
            Object.assign(handles.replacement, reference.parentField.subscribers);
          };
        }

        // switch handles[count] to replacement handles
        live.handles[count] = handles.replacement;

      }

      // console.log('references', live.reference);
      // console.log('handles', live.handles);
      console.log('RDL', RDL.data);
      // console.log('Query', RDL.data.Query);
      // console.log('val', val);
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

function setReferences(isArray, val, field, live) {
  console.log('---------------------------SETTING A REFERENCE---------------------------------');
  //console.log('******1');
  const existingData = field.data
  //console.log('1******');
  console.log('FFFFFFFFFF');
  const data = shuffleData(isArray, field, val);
  console.log('GGGGGGGGGGGGGG');
  if (!isArray) {
    console.log('HHHHHHH');
    live.references.push(setReference(val, field, data, existingData));
    console.log('JJJJJJJJ');
  } else {
    val.forEach((obj, i) => {
      console.log('IIIIIIIIII');
      //console.log('******4');
      //console.log(field, data);
      //console.log('4******');
      live.references.push(setReference(obj, field, data[i], existingData[i]));
    });
  }
  //console.log('references', live.references);
}

function setReference(source, parentField, existing, existingData) {
  return {
    existing,
    parentField,
    existingData,
    source,
    replacement: {},
    handles: {
      existing: {},
      replacement: {}
    }
  };
}

function shuffleData(isArray, field, val) {
  if (!isArray) {
    //const data = (typeof field.data === 'object') ? field.data: {};
    const data = {};
    //console.log('****2')
    field.data = data;
    //console.log('2****')
    return data;
  }
  return val.map((obj, i) => {
    //const data = (typeof obj.data === 'object') ? obj.data: {};
    const data = {};
    //console.log('****3')
    field.data[i] = data;
    //console.log('3****')

    return data;
  })
}

function getReference(identifier) {
  if (RDL.data[identifier]) return RDL.data[identifier];
  RDL.data[identifier] = {};
  //console.log('xxxxxxx');
  return RDL.data[identifier];
}

function setField(isArray, typeString) {
  // initialized field to default 'empty' state
  return ({
    data: (isArray ? [] : null),
    subscribers: {},
    type: typeString
  });
}

function setFields(isArray, typeString, fieldString, reference) {
  if (!reference.existing[fieldString]) {
    reference.existing[fieldString] = setField(isArray, typeString)
  }
  if (!reference.replacement[fieldString]) {
    reference.replacement[fieldString] = setField(isArray, typeString)
  }
}

// compares old data to newly resolved data
function diffField(field, val, isArray, isObject, handles) {
  //console.log('CANNOT BE UNDEFINED', field);
  let changed = false;

  if (isArray) {
    // compare each value of new data to old data
    changed = val.reduce((acc, curr, i) => {
      return (acc || curr !== field.data[i]);
    }, false)
    changed = changed || (val.length !== field.data.length);

  } else {
    changed = (field.data !== val)
  }

  if (changed) {
    console.log('-------------THERE WAS A CHANGE------------------')
    field.data = val; // overwrite field

    // add subscribers of this data to list of handls to be fired back
    Object.assign(handles, field.subscribers);
  }
}

function setFieldString(fieldString, arguments) {
  const argString = arguments.reduce((acc, curr) => {
    const argKey = curr.name.value;
    const argVal = (typeof curr.value.value === 'string') ? curr.value.value : JSON.stringify(curr.value.value);
    return acc + ` ${argKey}: ${argVal}`
  }, '');
  return (!argString.length) ? fieldString : fieldString  + `(${argString} )`;
}

// const liveResolver = (resolve, source, args, context, info) => {
//    // const isLive = info.fieldNodes[0].directives.reduce((acc, curr) => {
//    //   return (acc || curr.name.value === 'live')
//    // }, false);
//    //
//    // if (!isLive) return resolve();
//    console.log('live!');
//
//    // hard-coded for now, for demo will grab from RDL
//    let handle = 'I AM A HANDLE';
//
//    // The GraphQL type that will be returned from the resolver
//    const type = info.returnType;
//
//    const isArray = resultIsArray(info.returnType);
//    const isObject = resultIsObject(info.returnType);
//
//    let typeString = type.toString();
//    // strip off [ ] if it's an array
//    if (isArray) {typeString = typeString.substring(1, typeString.length - 1)};
//
//    // true if this is the first resolver
//    const rootResolver = !context.live;
//    console.log('XXXXXXXXXX', info.fieldNodes[0].directives);
//
//    // if first resolver, set context.live
//    if (rootResolver) {
//      // console.log('root', info.fieldNodes[0].selectionSet.selections[0].directives);
//      // console.log('root', info.schema._directives[0].astNode.locations[0].loc);
//      // console.log('YYYYYYYYYYYYYYYYYYYY', info.fieldNodes[0].directives);
//      context.live = {};
//      context.live.location = setOneLiveContext(typeString);
//      context.live.handles = {};
//    }
//
//    // store lets us know where we are within the RDL
//    let store = context.live.location;
//    let handles = context.live.handles;
//
//    // grabs correct location from context if they were set by an array
//    if (Array.isArray(store)) {
//      store = store[source.live]; // added live prop to source in last resursish step
//    }
//
//    return resolve().then((val) => {
//
//      if (rootResolver && !isArray) {
//        const id = val._id; // gonna have to change this
//
//        // The current object with this id doesn't exist in the RDL
//        if (!store[id]) {
//          store[id] = {};
//        }
//        context.live.location = store[id];
//      } else {
//        const field = info.fieldName;
//        if (!store[field]) {
//          store[field] = setField(isArray, typeString);
//        }
//
//        // looks for differences between existing data and new data
//        diffField(store[field], val, isArray, isObject, handles);
//
//        // sets context for nested resolvers
//        if (isObject) {context.live.location = setLiveContext(typeString, isArray, val)};
//
//        store[field].subscribers[handle] = true; // add current handle to subscribers
//      }
//      // console.log(handles);
//      // console.log(RDL.data.Comment);
//      return val;
//    });
//  },
// };
//
// function resultIsArray(type) {
//  const typeString = type.toString()
//  return (typeString[0] === '[' && typeString[typeString.length-1] === ']')
// }
//
// function resultIsObject(type) {
//  typeObj = (resultIsArray(type)) ? type.ofType: type;
//  return (!!typeObj._typeConfig)
// }
//
// // figures out context info of single object or array of objects
// function setLiveContext(typeString, isArray, val) {
//  if (!isArray) return setOneLiveContext(typeString, val._id);
//  return val.map((obj, i) => {
//    obj.live = i;
//    return setOneLiveContext(typeString, obj.id);
//  })
// }
//
// // creates (if neccesary) and returns context of a single object
// function setOneLiveContext(typeString, id) {
//  if (!RDL.data[typeString]) {
//    RDL.data[typeString] = {};
//  }
//  if (!id) return RDL.data[typeString];
//  // Check if the object exists in the tree
//  if (!RDL.data[typeString][id]) {
//    RDL.data[typeString][id] = {};
//  }
//  return RDL.data[typeString][id]
// }
//
// function setField(isArray, typeString) {
//  // initialized field to default 'empty' state
//  return ({
//    data: (isArray ? [] : null),
//    subscribers: {},
//    type: typeString
//  });
// }
//
// // compares old data to newly resolved data
// function diffField(field, val, isArray, isObject, handles) {
//  let comp;
//  let changed = false;
//
//  if (isArray) {
//    comp = val.map((obj, i) => {return setComparison(obj, isObject)});
//
//    // compare each value of new data to old data
//    changed = val.reduce((acc, curr, i) => {
//      return (acc || curr !== field.data[i]);
//    }, false)
//    changed = changed || (comp.length !== field.data.length);
//
//  } else {
//    comp = setComparison(val, isObject);
//    changed = (field.data !== comp)
//  }
//
//  if (changed) {
//    console.log('-------------THERE WAS A CHANGE------------------')
//    field.data = comp; // overwrite field
//
//    // add subscribers of this data to list of handls to be fired back
//    Object.assign(handles, field.subscribers);
//  }
// }
//
// // grabs id if object, val if scalar
// function setComparison(val, isObject) {
//  return (isObject) ? val._id : val;
// }

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  directiveResolvers
});

// console.log('schema1', schema.getTypeMap().Topic.getFields().id.astNode.directives);
// console.log('schema2', schema.getTypeMap().Topic);
// console.log('DIR', schema.getDirective('live'))


//addDirectiveResolveFunctionsToSchema(schema, directiveResolvers)

console.log('schema3', schema);


module.exports = schema;
