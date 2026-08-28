//load .env files
import 'dotenv/config';

import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import logger from './config/logger.js'; //WINSTON LOGGER
import exphbs from 'express-handlebars';
import session from 'express-session';

import adminRouter from './routes/adminRoute.js';
import userRouter from './routes/userRoute.js';
import db from './config/connection.js';

const app = express();

import nocache from 'nocache';
app.use(nocache());


//express-handlebars-section
import sections from 'express-handlebars-sections';


//HBS Connections
const hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: path.join(__dirname, 'views', 'layout'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: { section: sections() }
});

//REGISTERING HBS HELPERS
import hbsHelpers from './utils/hbsHelpers.js';
for (const helperName in hbsHelpers) {
  hbs.handlebars.registerHelper(helperName, hbsHelpers[helperName]);
}


app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));


app.set('trust proxy', true);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 900000, // 15 min // 300000 is 5min
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  }
}));


// Create a stream pipeline from Morgan to Winston
const morganStream = {
  write: (message) => logger.info(message.trim()),
};

// Choose 'combined' format for detailed production logs, or 'dev' for local testing
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';


app.use(morgan(morganFormat, { stream: morganStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
db.connect((err) => {
  if (err) {
    console.log("Connection Failed");
    process.exit(1);
  }
  logger.info("Database connected successfully");

  import { initializeSettings } from './controllers/settingController.js'

  initializeSettings()
    .then(() => logger.info("Settings logic finished check"))
    .catch(() => logger.error("Settings logic failed:"));
});


//Cron
import './jobs/cron.js';

// Routes
app.use(`/admin`, adminRouter);
app.use('/user', userRouter);
app.get('/', (req, res) => {
  res.redirect(`/user`);
});

// Handling Unhandled Requests
import ErrorMessage from './utils/ErrorMessage.js';
app.use('*', ErrorMessage.ErrorContent)

module.exports = app;
