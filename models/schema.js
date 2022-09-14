const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    entryDate: {
        type: Date,
        default: Date.now(),
    }
});

const users = mongoose.model('users', userSchema);

module.exports = users;