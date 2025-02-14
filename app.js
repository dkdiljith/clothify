var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var exphbs = require('express-handlebars');
const passport = require('passport');
var session = require("express-session")
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');

var adminRouter = require(`./routes/adminRoute`)
var userRouter = require('./routes/userRoute');
var db = require("./config/connection")

var app = express();

// Handlebar setup with custom helpers
const hbs = exphbs.create({
  extname: 'hbs', // Use .hbs as the extension
  defaultLayout: 'layout', // Define default layout
  layoutsDir: path.join(__dirname, 'views', 'layout'), // Set layouts directory
  partialsDir: path.join(__dirname, 'views', 'partials'), // Set partials directory
  helpers: {
    ifEquals: function (arg1, arg2, options) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    }
  }
});

//REGISTERING HBS HELPERS
var hbsHelpers = require('./middlewares/hbsHelpers')
for (const helperName in hbsHelpers) {  // Iterate over all the exported helpers
  hbs.handlebars.registerHelper(helperName, hbsHelpers[helperName]);
}


// Set Handlebars as the view engine
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (if needed)
app.use(express.static('public'));

// Express-Session Setup
const randomSecret = crypto.randomBytes(64).toString('hex');
const envPath = path.resolve(__dirname, '.env');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 600000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },
}));

// Logger and Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
db.connect((err) => {
  if (err) {
    console.log("Connection Failed")
    process.exit(1)
  }
  console.log("Successfully Running")
})

// Routes
app.use(`/admin`, adminRouter);
app.use('/user', userRouter);

// Handling Unhandled Requests
const ErrorMessage = require(`./middlewares/ErrorMessage`)
app.use('*', ErrorMessage.ErrorContent)

module.exports = app;
