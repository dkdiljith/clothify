// middlewares/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema'); // Adjust the path to your User model
require('dotenv').config();

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID.trim(),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/user/auth/google/callback', // Ensure this matches the URI in your Google Developer Console
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
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

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (req,id, done) => {
  try {
    const user = await User.findById(id);

    req.session.userIsLoggedIn = ({
      _id:user._id,
      name:user.name,
      email:user.email,
      phone:user.phone,
      dateOfBirth:user.dateOfBirth,
      gender:user.gender,
      blocked:user.blocked
    })

    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
