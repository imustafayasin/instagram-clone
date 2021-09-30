"use strict";

var mongoose = require('mongoose');

var postModel = new mongoose.Schema({
  userId: String,
  totalLike: Number,
  date: Date,
  imagePath: String,
  description: String
});
module.exports = mongoose.model('posts', postModel);