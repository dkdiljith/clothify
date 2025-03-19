var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var exphbs = require('express-handlebars');
var session = require("express-session")
require('dotenv').config();
const flash = require('connect-flash'); 

var adminRouter = require(`./routes/adminRoute`)
var userRouter = require('./routes/userRoute');
var db = require("./config/connection")

var app = express();

const nocache = require(`nocache`)
app.use(nocache())


const hbs = exphbs.create({
  extname: 'hbs', 
  defaultLayout: 'layout', 
  layoutsDir: path.join(__dirname, 'views', 'layout'), 
  partialsDir: path.join(__dirname, 'views', 'partials'), 
  helpers: {
    ifEquals: function (arg1, arg2, options) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    }
  }
});

//REGISTERING HBS HELPERS
var hbsHelpers = require('./middlewares/hbsHelpers')
for (const helperName in hbsHelpers) {  
  hbs.handlebars.registerHelper(helperName, hbsHelpers[helperName]);
}


app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));


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
app.use(flash())

// Logger and Middleware
const bodyparser = require(`body-parser`)
app.use(logger('dev'));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
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
