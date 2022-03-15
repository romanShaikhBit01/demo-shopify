const AppSession = require('../models/appSession.model');

exports.getAppSession = async () => {
    let shopSessionData = await AppSession.findOne({});
    if(shopSessionData){
        return shopSessionData
    } else{
        return null
    }
}