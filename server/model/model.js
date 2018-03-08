const mongoose = require('mongoose');

const { Schema } = mongoose;

// Hosted on mLab

mongoose.connect('mongodb://rest:sucks@ds255258.mlab.com:55258/graphqlchat');
console.log('Connected to mongodb');

// Only storing username and password
const userSchema = new Schema({
  username: { type: String, unique: true, require: true },
  password: { type: String, require: true },
});

const Users = mongoose.model('Users', userSchema);

// Stores the topics
const topicSchema = new Schema({
  content: String,
  author: String,
  comments: [Schema.Types.ObjectId],
});

const Topics = mongoose.model('Topics', topicSchema);

// Schema for comments on a topic
const commentSchema = new Schema({
  author: String,
  topic: Schema.Types.ObjectId,
  text: String,
  score: { type: Number, default: 0 },
});

const Comments = mongoose.model('Comments', commentSchema);

module.exports = { Users, Comments, Topics };

