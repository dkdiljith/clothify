const mongoose = require("mongoose")
const url = process.env.DB_URL;
const logger = require('../config/logger');


module.exports.connect = function (done){
    mongoose.connect(url)
    .then(()=>{
        // console.log("Database Connected Successfully")
        done()
    })
    .catch((err)=>{
        logger.error(err)
        done(err)
    })
}

module.exports.get = function (){
   return mongoose.connection;
}