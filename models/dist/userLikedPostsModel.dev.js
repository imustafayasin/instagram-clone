"use strict";

var mongoose = require('mongoose');

var userLikedPost = new mongoose.Schema({
  ownerId: String,
  likedUserId: String
});
module.exports = mongoose.model('userLikedPost', userLikedPost);