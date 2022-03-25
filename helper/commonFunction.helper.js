const AppSession = require('../models/appSession.model');
const axios = require('axios');

exports.getAppSession = async () => {
    let shopSessionData = await AppSession.findOne({});
    if (shopSessionData) {
        return shopSessionData
    } else {
        return null
    }
}

exports.getProducts = async () => {
    try {
        console.log('In getProduct');
        let url = 'https://https://20a7-103-249-233-8.ngrok.io/app/get-product-list?shop=first-step-demo.myshopify.com';
        let response = await axios.get(
            url,
        );
        console.log('products : ', response);
        let products = response.data.data;
        console.log(products)
        return products
    } catch (e) {
        console.log(e);
    }

}