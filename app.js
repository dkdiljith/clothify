const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const exphbs = require('express-handlebars');
const session = require("express-session")
require('dotenv').config();


const adminRouter = require(`./routes/adminRoute`)
const userRouter = require('./routes/userRoute');
const db = require("./config/connection")

const app = express();

const nocache = require(`nocache`)
app.use(nocache())


//HBS Connections
const hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: path.join(__dirname, 'views', 'layout'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
});

//REGISTERING HBS HELPERS
const hbsHelpers = require('./middlewares/hbsHelpers')
for (const helperName in hbsHelpers) {
  hbs.handlebars.registerHelper(helperName, hbsHelpers[helperName]);
}


app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

const MongoStore = require('connect-mongo')
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling:true,
  cookie: {
    maxAge: 900000, // 15 min // 300000 is 5min
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  }
}));


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
  console.log("Database Successfully Running")
})

//Coupon and Offer Pricing and Expiry Engine
require("./jobs/pricingExpiryEngine");

// Routes
app.use(`/admin`, adminRouter);
app.use('/user', userRouter);

// Handling Unhandled Requests
const ErrorMessage = require(`./middlewares/ErrorMessage`)
app.use('*', ErrorMessage.ErrorContent)

module.exports = app;
