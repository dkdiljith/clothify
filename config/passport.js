// middlewares/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const Wallet = require(`../models/walletSchema`)
require('dotenv').config();


//////////////wallet cretaion/////////////////////
const createWallet = require(`../controllers/walletController`).createWallet


////////////////////////////////////////////////////////////////////////////////////////////////////

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID.trim(),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
    callbackURL: '/user/auth/google/callback',
    proxy: true 
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      }
      // Check if a user exists with the same email
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        user.name = profile.displayName;
        await user.save();
        return done(null, user);
      }
      // Create a new user if not found
      const newUser = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        isVerified: true,
      });
      await newUser.save();
      await createWallet(newUser._id)

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean()

    done(null, user);
  } catch (error) {
    done(error);
  }
});


const googleLogin = (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};


const googleCallback = (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login');

    req.login(user, { keepSessionInfo: true }, (err) => {
      if (err) return next(err);

      req.session.user = { _id: user._id };

      return res.redirect('/user/home');
    });
  })(req, res, next);
};





module.exports = { passport, googleLogin, googleCallback }
