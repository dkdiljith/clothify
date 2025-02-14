const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user-schema');
require('dotenv').config()


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      console.log('User Found:', user);
      if(user.blocked){
        console.log('Blocked User');
        return done(null,false,{message:'you have been blocked.Please contact customer service'})
      }
      else{
        return done(null, user);
      }
    } else {
      const newUser = new User({
        googleId: profile.id,
        email: profile.emails[0].value, 
        name: profile.displayName,
        isVerified:true
      });

      await newUser.save();
      return done(null, newUser);
    }
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id); 
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); 
  } catch (error) {
    done(error);
  }
})

module.exports = passport;
