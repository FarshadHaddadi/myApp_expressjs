const mongoose = require('mongoose');

let Schema = mongoose.Schema;

let commentSchema = new Schema({
    authorName: String,
    authorEmail: String,
    subject: String,
    commentText: String,
    postedDate: Date,
    replies: [{
        comment_id: String,
        authorName: String,
        authorEmail: String,
        commentText: String,
        repliedDate: Date
    }]
});

let Comment; // to be defined on new connection (see initialize)

module.exports.getAllComments = function () {

    return new Promise(function (resolve, reject) {
        Comment.find()
            .sort({postedDate: 'asc'}) // from: https://medium.com/@jeanjacquesbagui/in-mongoose-sort-by-date-node-js-4dfcba254110
            .exec()
            .then((comments) => {
                resolve(comments);
            }).catch((err) => {
                reject(err);
            });
    });

};

module.exports.addComment = function (data) {
    return new Promise(function (resolve, reject) {
       
        data.postedDate = Date.now();
        var newComment = new Comment(data);
        // save the comment
        newComment.save((err) => {
            
            if (err) {
                reject("There was an error saving the comment: " + err);
            } else {
                console.log(newComment._id);
                resolve(newComment._id);
            }
        });
    });
}

module.exports.addReply = function (data) {
    return new Promise(function (resolve, reject) {
        
        // set the replied date to "now"
        data.repliedDate = Date.now();

        // update the comment whose _id matches "data.comment_id"
       
        Comment.update({ _id: data.comment_id},
        { $addToSet: { replies: data } },
        { multi: false })
        .exec()
        .then(() => {
            resolve();
        }).catch((err) => {
            reject(err);
        });
    });
}

module.exports.initialize = function () {

    return new Promise(function (resolve, reject) {

        let db = mongoose.createConnection("mongodb://fhaddadi2:cFH2543SS@ds163612.mlab.com:63612/web322_a6");

        db.on('error', (err)=>{
            reject(err);
        });

        db.once('open', ()=>{
           Comment = db.model("comments", commentSchema);
           resolve();
        });
    });
};

    
