global.mongoose = require('mongoose');
mongoose.Promise = global.Promise;


mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify : false,
    // useUnifiedTopology: true
}).then(() => {
    console.log('Database is connected');
}, err => {
    console.log('Can not cannect to the database', err);
});

mongoose.connection.on('error', function (err) {
    console.log('Mongodb connection failed. ' + err);
    mongoose.disconnect();
});

mongoose.connection.once('open', function() {
	console.log('MongoDB connection opened!');
});

mongoose.connection.on('reconnected', function () {
	console.log('MongoDB reconnected!');
});

mongoose.connection.on('disconnected', function() {
	console.log('MongoDB disconnected!');
	mongoose.connect(process.env.MONGODB_URI);
});

module.exports = mongoose;