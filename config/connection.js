import mongoose from 'mongoose';
const url = process.env.DB_URL;
import logger from '../config/logger.js';


export const connect = function (done){
    mongoose.connect(url)
    .then(()=>{
        // console.log("Database Connected Successfully")
        done()
    })
    .catch((err)=>{
        logger.error(err)
        done(err)
    })
};

export const get = function (){
   return mongoose.connection;
};
