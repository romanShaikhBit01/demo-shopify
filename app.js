global.express = require('express');
const dotenv = require('dotenv');
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
const axios = require('axios');
const path = require('path');
var cors = require('cors');
const constant = require('./config/constant');

const host = '127.0.0.1';
const port = 3000;

const app = express();
app.set('view engine', 'ejs');
dotenv.config();
app.use(cors());
require('./db/DB');
const commonFunction = require('./helper/commonFunction.helper');
const message = require('./helper/message');
const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET_KEY, SHOPIFY_API_SCOPES, HOST } = process.env;

const shops = {};

Shopify.Context.initialize({
    API_KEY: SHOPIFY_API_KEY,
    API_SECRET_KEY: SHOPIFY_API_SECRET_KEY,
    SCOPES: SHOPIFY_API_SCOPES.split(","),
    HOST_NAME: HOST.replace(/https:\/\//, ""),
    IS_EMBEDDED_APP: true,
    API_VERSION: ApiVersion.April21,
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const AppSession = require('./models/appSession.model');
app.get('/', async (req, res) => {
    if (typeof shops[req.query.shop] !== 'undefined') {
        // res.send('Welcome to shopify')
        res.sendFile(path.join(__dirname + '/index.html'));
        // res.render('home', { async: true, helper: commonFunction });
        // res.render('home', { helper: await commonFunction.getProducts() })
    } else {
        res.redirect(`/auth?shop=${req.query.shop}`)
    }
});

app.get('/auth', async (req, res) => {
    console.log('In auth api')
    try {
        const authRoute = await Shopify.Auth.beginAuth(
            req,
            res,
            req.query.shop,
            '/auth/callback',
            false
        );
        res.redirect(authRoute);
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

app.get('/auth/callback', async (req, res) => {
    console.log('In auth/callback api');
    try {
        const shopifySession = await Shopify.Auth.validateAuthCallback(
            req,
            res,
            req.query
        );
        console.log('shopifySession : ', shopifySession);
        shops[shopifySession.shop] = shopifySession;
        let myShop = req.query.shop;
        let storeSession = await AppSession.findOne({});
        if (!storeSession) {
            let newStore = new AppSession();
            newStore.shop = shops[myShop].shop;
            newStore.access_token = shops[myShop].accessToken;
            await newStore.save();
        } else {
            storeSession.access_token = shops[myShop].accessToken;
            await storeSession.save();
        }

        // register webhook here
        const response = await Shopify.Webhooks.Registry.register({
            path: "/webhooks",
            topic: "APP_UNINSTALLED",
            accessToken: shopifySession.accessToken,
            shop: shopifySession.shop,
        });

        console.log("resp at shopify callback ---------", response);
        console.log(
            "create response ---",
            response["APP_UNINSTALLED"] ? response["APP_UNINSTALLED"].result : null
        );

        if (!response['APP_UNINSTALLED'].success) {
            console.log(
                `Failed to register APP_UNINSTALLED webhook: ${response.result}`
            );
        }
        res.redirect(`https://${shops[myShop].shop}/admin/apps/`);
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


app.get('/app/get-product-list', async (req, res) => {
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

app.post('/app/create-product', async (req, res) => {
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
        "product": { "title": "Product 1", "body_html": "\u003cstrong\u003eGood snowboard!\u003c\/strong\u003e", "vendor": "Burton", "product_type": "Snowboard", "tags": ["Barnes \u0026 Noble", "Big Air", "John's Fav"] }
    }
    let headers = {
        'X-Shopify-Access-Token': shopData.access_token,
        'Content-Type': 'application/json'
    }
    try {
        let response = await axios.post(url, data, { headers });
        console.log(response.data);
        res.status(200).send({
            status: constant.STATUS_CODE.SUCCESS,
            message: message.GENERAL.data_save_success,
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

app.get('/app/get-product/:id', async (req, res) => {
    console.log('In get product detail api');
    let url = 'https://' + req.query.shop + '/admin/api/2021-10/products/' + req.params.id + '.json';
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

app.post('/app/update-product/:id', async (req, res) => {
    console.log('in update product');
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
    let url = 'https://' + req.query.shop + '/admin/api/2021-10/products/' + req.params.id + '.json'
    console.log('url : ', url);
    let data = {
        "product": { "id": req.params.id, "title": " Update Burton Custom Freestyle 151", "body_html": "\u003cstrong\u003eGood snowboard!\u003c\/strong\u003e", "vendor": "Burton", "product_type": "Snowboard", "tags": ["Barnes \u0026 Noble", "Big Air", "John's Fav"] }
    }
    let headers = {
        'X-Shopify-Access-Token': shopData.access_token,
        'Content-Type': 'application/json'
    }
    try {
        let response = await axios.put(url, data, { headers });
        console.log(response.data);
        res.status(200).send({
            status: constant.STATUS_CODE.SUCCESS,
            message: message.GENERAL.data_save_success,
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

app.post('/app/delete-product/:id', async (req, res) => {
    console.log('In delete product api');
    let url = 'https://' + req.query.shop + '/admin/api/2021-10/products/' + req.params.id + '.json';
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
        let response = await axios.delete(
            url,
            {
                headers: {
                    'X-Shopify-Access-Token': shopData.access_token,
                    'Content-Type': 'application/json'
                }
            }
        );
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

app.post('/webhooks/app/uninstall', async (req, res) => {
    console.log('In webhook');
    console.log(req);
});

app.listen(port, () => {
    console.log(`Server is running at : http://${host}:${port}/`);
});