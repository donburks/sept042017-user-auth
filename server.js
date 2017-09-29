require('dotenv').config();

const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || 'development';

const express = require('express');
const bodyParser = require('body-parser');
const sass = require('node-sass-middleware');
const cookieSession = require('cookie-session');
const flash = require('connect-flash');
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig[ENV]);

// Separate file with user-related database logic
const User = require('./lib/user')(knex);

const app = express();

app.set('view engine', 'ejs');

// Because some dependencies are in devDependencies, they must not
// be required when the app is running in production environment
if (ENV === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
  const knexLogger = require('knex-logger');
  app.use(knexLogger(knex));
}

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'development']
}));

app.use(flash());

app.use(bodyParser.urlencoded({extended: true}));

app.use('/styles', sass({
  src: __dirname + '/styles',
  dest: __dirname + '/public/styles',
  debug: true,
  outputStyle: 'expanded'
}));

app.use(express.static('public'));


app.get('/', (req, res) => {
  res.render('index', {
    errors: req.flash('errors'),
    info: req.flash('info'),
    loggedIn: Boolean(req.session.user_id)
  });
});

app.get('/logout', (req, res) => {
  req.session.user_id = null;
  req.flash('info', "You have been logged out.");
  res.redirect('/');
});

app.post('/login', (req, res) => {
  let email = req.body.email;
  let pw = req.body.password;

  User.authenticate(email, pw).then((user) => {
    req.session.user_id = user.id;
    req.flash('info', 'You have been successfully signed in.');
    res.redirect('/');
  }); 
});

app.post('/register', (req, res) => {
  let email = req.body.email;
  let pw = req.body.password;

  User.add(email, pw).then((result) => {
    let id = result[0];
    req.session.user_id = id;
    req.flash('info', "You have created your account and been logged in.");
    res.redirect('/'); 
  })
  .catch((error) => console.log(error));
});

app.listen(PORT, () => {
  console.log('Example app listening on port ' + PORT);
});
