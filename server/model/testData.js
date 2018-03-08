/**
 * File that sets up test data.
 */

const { Users, Comments, Topics } = require('./model.js');

const testData = () => {
  // Clear db
  Users.remove({}, (err) => {
    if (err) throw err;
  })
    .catch((err) => {
      // Add error handling...
      console.log(err);
    });
  Comments.remove({}, (err) => {
    if (err) throw err;
  })
    .catch((err) => {
      // Add error handling...
      console.log(err);
    });
  Topics.remove({}, (err) => {
    if (err) throw err;
  })
    .catch((err) => {
      // Add error handling...
      console.log(err);
    });

  // Create three users
  const andrew = new Users({
    username: 'andrew',
    password: 'ilovetesting',
  });
  const eric = new Users({
    username: 'eric',
    password: 'ilovetesting',
  });
  const john = new Users({
    username: 'john',
    password: 'ilovetesting',
  });
  andrew.save();
  eric.save();
  john.save();

  // Create two topics
  const topic1 = new Topics({
    content: 'Eric stole my database',
    author: 'Andrew',
    comments: [],
  });
  const topic2 = new Topics({
    content: 'I stole Andrews database',
    author: 'Eric',
    comments: [],
  });

  topic1.save()
    .then((topic) => {
      const comment1 = new Comments({
        author: 'andrew',
        topic: topic._id,
        text: "That's kind of fucked up to steal my db.",
        score: 0,
      });
      // Create a comment after the Topic is created
      comment1.save()
        .then((comment) => {
          Topics.findOneAndUpdate({ _id: topic._id }, { $push: { comments: comment._id } }, { new: true }).then(result => console.log(result));
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });

  topic2.save()
    .then((topic) => {
      const comment2 = new Comments({
        author: 'eric',
        topic: topic._id,
        text: 'comment 2',
        score: 0,
      });
      // Create a comment after the Topic is created
      comment2.save()
        .then((comment) => {
          Topics.findOneAndUpdate({ _id: topic._id }, { $push: { comments: comment._id } }, { new: true }).then(result => console.log(result));
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = testData;
