global.express = require('express');
const dotenv = require('dotenv');
const { Shopify } = require('@shopify/shopify-api');
const axios = require('axios');
const path = require('path');
var cors = require('cors');
const constant = require('./config/constant');

const host = '127.0.0.1';
const port = 3000;

const app = express();
dotenv.config();
app.use(cors());
require('./db/DB');
const commonFunction = require('./helper/commonFunction.helper');
const message = require('./helper/message');
const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_API_SCOPES, HOST } = process.env;

const shops = {};

Shopify.Context.initialize({
    API_KEY: SHOPIFY_API_KEY,
    API_SECRET_KEY: SHOPIFY_API_SECRET,
    SCOPES: SHOPIFY_API_SCOPES,
    HOST_NAME: HOST,
    IS_EMBEDDED_APP: true
});


const AppSession = require('./models/appSession.model');
const { Session } = require('@shopify/shopify-api/dist/auth/session');

app.get('/', async (req, res) => {
    if (typeof shops[req.query.shop] !== 'undefined') {
        res.sendFile(path.join(__dirname + '/index.html'));
        // res.send('Hello world');
    } else {
        res.redirect(`/auth?shop=${req.query.shop}`)
    }
});

app.get('/auth', async (req, res) => {
    console.log('In auth/callback api')
    const authRoute = await Shopify.Auth.beginAuth(
        req,
        res,
        req.query.shop,
        '/auth/callback',
        false
    )
    res.redirect(authRoute);
});

app.get('/auth/callback', async (req, res) => {
    console.log('In auth/callback api');
    let shopSession = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query
    );
    console.log('req.query : ', req.query);
    console.log('shopSession : ', shopSession)
    shops[shopSession.shop] = shopSession; // remove after store in db
    let myShop = req.query.shop;
    let storeSession = await AppSession.findOne({});
    if (!storeSession) {
        let newStore = new AppSession();
        newStore.shop = shops[myShop].shop;
        newStore.access_token = shops[myShop].accessToken;
        await newStore.save();
    }
    storeSession.access_token = shops[myShop].accessToken;
    await storeSession.save();
    res.redirect(`https://${shops[myShop].shop}/admin/apps/`)
});


app.get('/app/products', async (req, res) => {
    console.log('In app/product api');
    let url = 'https://' + req.query.shop + '/admin/products.json'
    console.log('url : ', url);
    try {
        let shopData = await commonFunction.getAppSession();
        console.log(shopData)
        if (!shopData) {
            return res.status(400).send({
                status: constant.STATUS_CODE.FAIL,
                message: message.GENERAL.general_error_content,
                error: true,
                data: {}
            });
        }

        let response = await axios.get(
            url,
            {
                headers: {
                    'X-Shopify-Access-Token': shopData.access_token,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(response.data);
        res.status(200).send({
            status: constant.STATUS_CODE.SUCCESS,
            message: message.GENERAL.data_fetch_success,
            error: false,
            data: response.data
        });
    } catch (e) {
        console.log(e);
        return res.status(400).send({
            status: constant.STATUS_CODE.FAIL,
            message: message.GENERAL.general_error_content,
            error: true,
            data: {}
        });
    }
});

app.post('/app/products/create', async (req, res) => {
    // const client = new Shopify.Clients.Rest(shops[shopSession.shop], shops[shopSession.accessToken]);
    // console.log(client)
    console.log('in create product');
    let shopData = await commonFunction.getAppSession();
    console.log(shopData)
    if (!shopData) {
        return res.status(400).send({
            status: constant.STATUS_CODE.FAIL,
            message: message.GENERAL.general_error_content,
            error: true,
            data: {}
        });
    }
    let url = 'https://' + req.query.shop + '/admin/products.json'
    console.log('url : ', url);
    let data = {
        "product": { "title": "Burton Custom Freestyle 151", "body_html": "\u003cstrong\u003eGood snowboard!\u003c\/strong\u003e", "vendor": "Burton", "product_type": "Snowboard", "tags": ["Barnes \u0026 Noble", "Big Air", "John's Fav"] }
    }
    let headers = {
        'X-Shopify-Access-Token': shopData.access_token,
        'Content-Type': 'application/json'
    }
    try {
        axios.post(url, data, { headers })
            .then(response => console.log(response.data));

        res.send(response.data);
    } catch (e) {
        console.log('in error');
        console.log(e);
    }
});

app.listen(port, () => {
    console.log(`Server is running at : http://${host}:${port}/`);
});