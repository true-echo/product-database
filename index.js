const express = require('express');
const app = express();
const mongoose = require('mongoose');
const clc = require('cli-color');
const config = require('./config.js');
const productDB = require('./schemas/product.js');
const priceFormat = new Intl.NumberFormat('en-US'); // Internal number format for the US

// Backend
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/assets', express.static(__dirname + 'public/assets'))
app.set('views', './public/views');
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    return res.render('index.ejs', {
        deleted: false, modal: false
    });
});

app.get('/login', (req, res) => {
    // Not currently supported
    res.redirect('/');
});

app.get('/list', (req, res) => {
    let products = [];
    let count = 0;
    productDB.find({}).then(async data => {
        if(data){
            for(let i of data){
                count++;
                let price = priceFormat.format(i.productPrice);
                const product = {
                    count: count,
                    id: i.id,
                    quantity: i.quantity,
                    name: i.productName,
                    description: i.productDescription,
                    price: `$${price}`,
                    purchased: i.purchased
                };
                products.push(product);
            };
            return res.render('list.ejs', {
                products: products
            });
        } else if(!data){
            return res.render('list.ejs', {
                products: []
            });
        };
    });
});

app.get('/lookup', (req, res) => {
    const productName = req.query.name;
    if(!productName){
        return res.status(400).send({ error: "Name query is required for this request"});
    };
    productDB.findOne({ productName: productName }).then(data => {
        if(data){
            let price = priceFormat.format(data.productPrice);
            return res.render('index.ejs', {
                deleted: false, modal: true, found: true, id: data.id, quantity: data.quantity, name: data.productName, description: data.productDescription, price: `$${price}`, purchased: data.purchased
            });
        } else if(!data){
            return res.render('index.ejs', {
                deleted: false, modal: true, found: false, name: productName
            });
        };
    });
});

app.get('/delete', (req, res) => {
    const productName = req.query.name;
    if(!productName){
        return res.render('delete.ejs', {
            error: false, deleted: false, modal: false
        });
    };
    productDB.findOne({ productName: productName }).then(data => {
        if(data){
            productDB.deleteOne({ productName: productName }).then(data => {
                if(data){
                    return res.render('delete.ejs', {
                        error: false, deleted: true, modal: false, name: productName
                    });
                } else if(!data){
                    return res.render('delete.ejs', {
                        error: true, message: "Unable to delete product", deleted: false, modal: false
                    });
                };
            });
        } else if(!data){
            return res.render('delete.ejs', {
                error: true, message: "Product not found", deleted: false, modal: false
            });
        };
    });
});

app.get('/delete/confirm', (req, res) => {
    const productName = req.query.name;
    if(!productName){
        return res.status(302).redirect('/delete');
    };
    productDB.findOne({ productName: productName }).then(data => {
        if(data){
            return res.render('delete.ejs', {
                error: false, modal: true, deleted: false, name: productName
            });
        } else if(!data){
            return res.render('delete.ejs', {
                error: true, message: "Product not found", deleted: false, modal: false
            });
        };
    });
});

app.get('/create', (req, res) => {
    const {
        name,
        description,
        price,
        quantity
    } = req.query;
    if(name){
        if(!description || !price || !quantity){
            return res.render('create.ejs', {
                modal: false, created: false, error: true, message: "One or more fields are missing"
            });
        } else {
            productDB.findOne({ productName: name }).then(data => {
                if(data){
                    return res.render('create.ejs', {
                        modal: false, created: false, error: true, message: `A product with the name ${name} already exists`
                    });
                } else if(!data){
                    let productID = Math.floor(Math.random() * 90000) + 10000;
                    productDB.create(
                        {
                            id: productID,
                            quantity: quantity,
                            productName: name,
                            productDescription: description,
                            productPrice: price,
                            purchased: false
                        }
                    ).then(data => {
                        if(data){
                            return res.render('create.ejs', {
                                modal: false, created: true, error: false, name: name
                            });
                        } else if(!data){
                            return res.render('create.ejs', {
                                modal: false, created: false, error: true, message: `Unable to create product ${name}`
                            });
                        };
                    });
                };
            });
        }
    } else if(!name){
        return res.render('create.ejs', {
            modal: false, created: false, error: false
        });
    };
});

app.get('/build', (req, res) => {
    const productName = req.query.name;
    if(!productName){
        return res.render('create.ejs', {
            modal: false, created: false, error: true, message: "One or more fields are missing"
        });
    };
    return res.render('create.ejs', {
        modal: true, created: false, error: false, name: productName
    });
});

// 404 Page, Should remain the last endpoint
app.get('*', (req, res) => {
    return res.render('404.ejs');
})

app.listen(config.port, () => {
    connect();
    console.log(clc.blue('[Connection]') + ` Web Server Listening on port ${config.port}`);
});

// Connects to MongoDB database
async function connect(){
    await mongoose.connect(config.mongoDB, {}).then(() => {
        console.log(clc.blue('[Database]') + ` Established Connection`);
    });
};

// Logs all unhandled rejection errors to console
process.on('unhandledRejection', (err) => { 
    console.log(clc.red('[Error]') + ` ${err}`);
});