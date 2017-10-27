const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let Schema = mongoose.Schema;

let userSchema = new Schema({
  user:  {
    type: String,
    unique: true
  },
  password: String
});

let User; // to be defined on new connection (see initialize)



module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {

        let db = mongoose.createConnection("mongodb://fhaddadi2:cFH2543SS@ds161038.mlab.com:61038/web322_a7");

        db.on('error', (err)=>{
            reject(err);
        });

        db.once('open', ()=>{
           User = db.model("users", userSchema);
           //User.remove({ }, function (err) { }); // HACK used to clean all users out of the DB (Remove after first use!) or use Robo 3T
           resolve();
        });

    });
};

module.exports.registerUser = function (userData) {
    return new Promise(function (resolve, reject) {

        if (userData.password != userData.password2) {
            reject("Passwords do not match");
        } else {

            bcrypt.genSalt(10, function (err, salt) { // Generate a "salt" using 10 rounds
                if (err) {
                        reject("There was an error encrypting the password");
                }else{

                    bcrypt.hash(userData.password, salt, function (err, hash) { // encrypt the password: userData.password

                        if (err) {
                            reject("There was an error encrypting the password");
                        } else {

                            userData.password = hash;

                            let newUser = new User(userData);
                            
                            newUser.save((err) => {
                                if (err) {
                                    if (err.code == 11000){
                                        reject("User Name already taken");
                                    } else {
                                        reject("There was an error creating the user: " + err);
                                    }

                                } else {
                                    resolve();
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};

module.exports.checkUser = function(userData){
    return new Promise(function (resolve, reject) {

        User.find({ user: userData.user})
            .exec()
            .then((users) => {
                if(users.length == 0){
                    reject("Unable to find user: " + userData.user);
                }else{
                    // Pull the password "hash" value from the DB and compare it to "myPassword123" (match)
                    bcrypt.compare(userData.password, users[0].password).then((res) => {
                        if(res === true){
                            resolve();
                        }else{
                            reject("Incorrect Password for user: " + userData.user);
                        }
                    });
                }
            }).catch((err) => {
                reject("Unable to find user: " + userData.user);
            });

     });
};

module.exports.updatePassword = function (userData) {
    console.log(userData);
    return new Promise(function (resolve, reject) {

        if (userData.password != userData.password2) {
            reject("Passwords do not match");
        } else {

            bcrypt.genSalt(10, function (err, salt) { // Generate a "salt" using 10 rounds
                if (err) {
                        reject("There was an error encrypting the password");
                }else{

                    bcrypt.hash(userData.password, salt, function (err, hash) { // encrypt the password: userData.password

                        if (err) {
                            reject("There was an error encrypting the password");
                        } else {
                            User.update({ user: userData.user },
                                { $set: { password: hash } },
                                { multi: false })
                                .exec()
                                .then(() => { 
                                    resolve();
                                })
                                .catch((err) => { 
                                    reject("There was an error updating the password for user: " + userData.user);
                                });
                        }
                    });
                }
            });
        }
    });
};


