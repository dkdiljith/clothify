var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('express-handlebars')
const passport = require('passport');
var session = require("express-session")
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');


var adminRouter = require(`./routes/adminRoute`)
var userRouter = require('./routes/userRoute');
var db = require("./config/connection")

var app = express();

//nocache setup
const nocache = require(`nocache`)
app.use(nocache())

/////////////////////////////////////////Express-Session-Setup///////////////////////////////////////////////////
// Generate a random secret key
const randomSecret = crypto.randomBytes(64).toString('hex');

// Path to the .env file
const envPath = path.resolve(__dirname, '.env');

// Check if .env exists, and append or create it
fs.appendFile(envPath, `SESSION_SECRET=${randomSecret}\n`, (err) => {
  if (err) {
    console.error('Failed to write to .env file:', err);
  } else {
    console.log('SESSION_SECRET successfully written to .env file');
  }
});

app.use(session({
  secret: process.env.SESSION_SECRET, // Access the secret key from environment variables
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 600000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },
}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials/'}))
db.connect((err)=>{
if(err){
  console.log("Connection Failed")
  process.exit(1)
}
console.log("Sucessfully Running")
})

app.use(`/admin` , adminRouter);
app.use('/user', userRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

//wildcard route
app.use('*', (req, res) => {
  res.status(404).send('Not Found');
});


module.exports = app;
