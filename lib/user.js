const bcrypt = require('bcrypt');

module.exports = function(knex) {

  //User.find(12).then((user) => {})
  function find(id) {
    return new Promise((resolve, reject) => {
      knex('users')
      .select('*')
      .where({id: id})
      .limit(1)
      .then((rows) => {
        let user = rows[0];
        //return (user) ? resolve(user) : reject(user);
        if (user) {
          return resolve(user);
        } else {
          return reject();
        }
      })
      .catch((error) => reject(error));
    })
  }


  function findByEmail(email) {
    return new Promise((resolve, reject) => {
      knex('users')
      .select('*')
      .where({email: email})
      .limit(1)
      .then((rows) => {
        let user = rows[0];
        return (user) ? resolve(user) : reject(email);
      })
      .catch((error) => reject(error));
    })
  }


  // Checks email uniqueness. Triggers .catch if email exists
  // (In essence it's the opposite of findByEmail)
  function checkEmailUniqueness(email) {
    return new Promise((resolve, reject) => {
      findByEmail(email)
      .then((user) => {
        if (user) {
          return reject({
            type: 409,
            message: 'this email cannot be used'
          });
        } else {
          return resolve(email);
        }
      })
      .catch((email) => resolve(email))
    })
  }


  //User.authenticate(email, pw).then().catch()
  function authenticate(email, password) {
    let rejection = {
      type: 409,
      message: 'bad credentials'
    };
    return new Promise((resolve, reject) => {
      findByEmail(email)
      .then((user) => {
        if (!user) {
          return reject(rejection)
        }
        bcrypt.compare(password, user.password_digest)
        .then((passwordsMatch) => {
          if (passwordsMatch) {
            return resolve(user);
          } else {
            // If the passwords don't match, return a rejected promise with an
            // error.
            return reject(rejection);
          }
        })
      })
      .catch((error) => reject(error));
    })
  }


  //User.add(email, pw).then();
  function add(email, password) {
    return (
      checkEmailUniqueness(email) // First check if email already exists
      .then((email) => {
        console.log("Email is unique");
        return bcrypt.hash(password, 10);
      })
      .then((passwordDigest) => {
        console.log("Pw is hashed");
        return knex('users').insert({
          email: email,
          password_digest: passwordDigest
        }).returning('id');
      })
      .catch((error) => console.log("WTF:", error))
    )
  }


  function update(id, newEmail, newPassword) {
    // We have multiple promises running here, so we'll use a slightly
    // different tecnique with Promise.all
    let promises = [];

    // If the email needs to be updated, we need to check for uniqueness
    if (newEmail) {
      promises.push(checkEmailUniqueness(newEmail));
    } else {
      promises.push(Promise.resolve(false));
    }

    // If the password needs to be updated, we must encrypt it
    if (newPassword) {
      promises.push(bcrypt.hash(newPassword, 10));
    } else {
      promises.push(Promise.resolve(false));
    }

    // Now we run all promises and get .then results in an array
    // If anything breaks, .catch will be called
    return Promise.all(promises).then((emailAndPasswordDigest) => {
      const email = emailAndPasswordDigest[0];
      const passwordDigest = emailAndPasswordDigest[1];

      const updatedUser = {};
      if (email) {
        updatedUser.email = email;
      }

      if (passwordDigest) {
        updatedUser.password_digest = passwordDigest;
      }

      return knex('users')
      .update(updatedUser)
      .where({id: id});
    })
  }


  return {
    find: find,
    findByEmail: findByEmail,
    authenticate: authenticate,
    add: add,
    update: update,
    checkEmailUniqueness: checkEmailUniqueness
  };
}
