//jshint esversion:6
//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session
({
    secret: "My anonymous text!",
    cookie: 
    {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    },
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URL,
{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema 
({
  email: String,
  password: String,
  googleId: String,
  secrets: [String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => 
{
    done(null, user.id);
});
  
passport.deserializeUser((id, done) =>  
{
    User.findById(id, function(err, user) 
    {
        done(err, user);
    });
});

passport.use(new GoogleStrategy
    ({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
        userProfileURL: process.env.PROFILE_URL
    },
  (accessToken, refreshToken, profile, cb) =>
  {
    User.findOrCreate({ googleId: profile.id }, 
    (err, user) => 
    {
        return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
    res.render("home");
  });
  
app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);
  
app.get(process.env.CALLBACK_ROUTE,
    passport.authenticate('google', { failureRedirect: "/login" }),
    (req, res) =>
    {
      // Successful authentication, redirect to secrets.
      res.redirect("/secrets");
    });
  
app.get("/login", (req, res) =>
{
    req.session.save(() => 
    {
        res.render("login");
    });
});
  
app.get("/register", (req, res) => 
{
    req.session.save(() => 
    {
        res.render("register");
    });
});
  
app.get("/secrets", (req, res) => 
{
    User.find({"secrets": {$ne: null}}, function(err, foundUsers)
    {
      if (err)
      {
        console.log(err);
      } 
      else 
      {
        if (foundUsers) 
        {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
    });
});
  
app.get("/submit", (req, res) =>
{
    if (req.user)
    {
      res.render("submit");
    } 
    else 
    {
      res.redirect("/login");
    }
  });
  
app.post("/submit", (req, res) =>
{
    const submittedSecret = req.body.secret;
  
  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  
    User.findById(req.user.id, (err, foundUser) =>
    {
      if (err) 
      {
        console.log(err);
      } 
      else 
      {
        if (foundUser) 
        {
          if(sentiment.analyze(submittedSecret).score > 0)
          {
            foundUser.secrets.push(submittedSecret);
          }
          foundUser.save(() => 
          {
            res.redirect("/secrets");
          });
        }
      }
    });
});
  
app.get("/logout", (req, res) => 
{
    req.logout();
    res.redirect("/");
});
  
app.post("/register", (req, res) => 
{
  
    User.register({username: req.body.username}, req.body.password, (err, user) => 
    {
      if (err) 
      {
        console.log(err);
        res.redirect("/register");
      } 
      else 
      {
        passport.authenticate("local")(req, res, () => 
        {
          res.redirect("/secrets");
        });
      }
    });
  
});
  
app.post("/login", (req, res) => 
{
  
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, (err) => 
    {
      if (err) 
      {
        console.log(err);
      } 
      else 
      {
        passport.authenticate("local")(req, res, () =>
        {
          res.redirect("/secrets");
        });
      }
    })
  
});

app.listen(process.env.PORT, () => 
{
    console.log("Server started on the port.");
});
