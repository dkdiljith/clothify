var mongoose = require("mongoose")
const url = "mongodb://localhost:27017/Clothify"


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