const userController = require('../controller/userController.js');
const contentController = require('../controller/contentController.js');
// const { PubSub, withFilter } = require('graphql-subscriptions');

const resolvers = {};

resolvers.Query = {
  Topic: (_, { id }) => contentController.topic(id),
  Topics: () => contentController.topics(),
  User: (_, { id }) => userController.getUser(id),
};

resolvers.Mutation = {
  addComment: (_, comment) => contentController.addComment(comment),
  addUser: (_, user) => userController.addUser(user.input),
  updateUser: (_, { id, update }) => userController.updateUser(id, update),
  like: (_, { id }) => contentController.like(id),
};

resolvers.Topic = {
  comments: ({ _id }) => contentController.comments(_id),
  comment: () => contentController.comment(),
  authors: () => ['Max', 'Max'],
  id: ({ _id }) => _id
};

resolvers.Comment = {
  topic: (_, { id }) => contentController.topic(id),
  id: ({ _id }) => _id
};


resolvers.User = {
  username: ({ username }) => username.toUpperCase(),
};

module.exports = resolvers;
