const mongoose = require('mongoose');

const userLikedPost = new mongoose.Schema({
    ownerId: String,
    likedUserId: String
});

module.exports = mongoose.model('userLikedPost', userLikedPost);