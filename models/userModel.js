const mongoose = require('mongoose');

const userModel = new mongoose.Schema({
    email: String,
    username: String,
    password: String,
    avatar: { type: String, default: '/images/user.svg' },
    firstName: String,
    phoneNumber: { type: Number, default: '' },
    gender: { type: String, default: '' },
    biography: { type: String, default: '' },
    website: { type: String, default: '' },
    industry: { type: String, default: '' }
})

module.exports = mongoose.model('Users', userModel);