const { Users } = require('../model/model.js');

const userController = {};

// Checks if the username/password combo is stored in the db
// returns a promise that resolves to true or false
userController.login = (input) => {
  return Users.find(input, (err) => { if (err) throw err; })
    .then((result) => {
      if (result.length > 0) return true;
      return false;
    })
    .catch(err => console.log(err));
};

// Create a new user in the db with a given username/password
// passed in the 'input' variable
userController.addUser = (input) => {
  const user = new Users(input);
  return user.save().then(result => result);
};

userController.updateUser = (id, update) => {
  return Users.findByIdAndUpdate(id, { username: update }, { new: true })
    .then(result => result)
    .catch(err => console.log(err));
};

userController.getUser = (id) => {
  return Users.findById(id)
    .then(result => result)
    .catch(err => console.log(err));
};

module.exports = userController;
