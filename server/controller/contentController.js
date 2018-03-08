const { Topics, Comments } = require('../model/model.js');

const contentController = {};

// Grab all topics from the db
contentController.topics = () => {
  return Topics.find({})
    .then(result => result)
    .catch(err => console.log(err));
};

// Get a topic from the db
contentController.topic = (input) => {
  return Topics.findById(input)
    .then(result => result)
    .catch(err => console.log(err));
};

// Get comments from the db
contentController.comments = (input) => {
  return Comments.find({ topic: input })
    .then(result => result)
    .catch(err => console.log(err));
};

// Get one comment from db
contentController.comment = () => {
  return Comments.find({})
    .then(result => result[0])
    .catch(err => console.log(err));
};

// Add a comment to db
contentController.addComment = (input) => {
  const comment = new Comments(input);
  comment.save()
    .then((result) => {
      Topics.findByIdAndUpdate(result.topic, { $push: { comments: result._id } }, { new: true })
        .then(result)
    })

    //Users.findByIdAndUpdate(id, { username: update }, { new: true })
    //.then(result => result)
  // return user.save().then(result => result);
};

module.exports = contentController;
