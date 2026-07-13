// middlewares/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const Wallet = require(`../models/walletSchema`)
require('dotenv').config();


///////////////////////////////////////////////
const createWallet = require(`../controllers/walletController`).createWallet
const createReferral = require(`../controllers/referralController`).createReferral


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
      // 1. Use .lean() here safely on the query for existing users
      let user = await User.findOne({ googleId: profile.id }).lean();
      if (user) {
        return done(null, user);
      }

      // 2. Use .lean() here safely on the query for email checking
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        user.name = profile.displayName;
        await user.save();

        // Convert to a plain object since save() returns a document
        return done(null, user.toObject());
      }

      // 3. For new users, create and save them normally
      const newUser = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        isVerified: true,
      });
      await newUser.save();
      await createWallet(newUser._id);
      await createReferral(newUser._id);

      // Alternative to .toObject(): Extract raw object using JSON methods
      const registeredUser = JSON.parse(JSON.stringify(newUser));
      registeredUser.isNewRegistration = true;

      return done(null, registeredUser);

    } catch (error) {
      return done(error);
    }
  }
));


passport.serializeUser((user, done) => {
  const userId = user._id || user.id;
  done(null, userId);
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
    if (!user) return res.redirect('/user/login');

    req.login(user, { keepSessionInfo: true }, (err) => {
      if (err) return next(err);

      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null
      };

      if (user.isNewRegistration) {
        req.session.user.showWelcomeModal = true;
        return res.redirect('/user/home');
      }

      return res.redirect('/user/home');
    });
  })(req, res, next);
};





module.exports = { passport, googleLogin, googleCallback }
