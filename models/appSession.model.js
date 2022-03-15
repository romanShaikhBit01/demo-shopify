const appSessionSchema = new mongoose.Schema({
    shop : {
        type : String
    },
    access_token : {
        type : String
    }
},
{
    collection : 'app_session'
});

const AppSession = mongoose.model('app_session',appSessionSchema);
module.exports = AppSession;