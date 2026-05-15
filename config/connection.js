const mongoose = require("mongoose")
const url = process.env.DB_URL;


module.exports.connect = function (done){
    mongoose.connect(url)
    .then(()=>{
        // console.log("Database Connected Successfully")
        done()
    })
    .catch((err)=>{
        console.log(err)
        done(err)
    })
}

module.exports.get = function (){
    return mongoose.connect
}