import mongoose from 'mongoose';
const url = process.env.DB_URL;
import logger from '../config/logger.js';


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