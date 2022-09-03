const mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    id: Number,
    quantity: String,
    productName: String,
    productDescription: String,
    productPrice: String,
    purchased: Boolean
});

module.exports = mongoose.model('products', Schema);