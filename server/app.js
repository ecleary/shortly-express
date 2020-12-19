const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const db = require('./db');
const executeQuery = (query, values) => {
  return db.queryAsync(query, values).spread(results => results);
};

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/', (req, res) => {
  res.render('index');
});

app.get('/create', (req, res) => {
  res.render('index');
});

app.get('/links', (req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

// If queried item exists in database, once resolved, above function call evaluates to {"id":2,"username":"George","password":"George","salt":null}
app.post('/signup', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  return models.Users.get({ username })
    .then(user => {
      // console.log(`WE EXPECT TO SEE THE USER HERE: ${user.username}`);
      if (user) {
        //if exists redirect to sign up
        throw user;
      }
      // console.log(`WE EXPECT TO SEE THE USERNAME HERE: ${username}`);
      // console.log(`WE EXPECT TO SEE THE PASSWORD HERE: ${password}`);
      return models.Users.create({ username, password });
    })
    .then((results) => {
      models.Sessions.create(results.insertId);
      // console.log(`UNSTRINGIFYED RESULTS: ${results}`);
      // console.log(`STRINGIFYED RESULTS: ${JSON.stringify(results)}`);
      /*
      {
        "fieldCount":0,
        "affectedRows":1,
        "insertId":4,
        "serverStatus":2,
        "warningCount":0,
        "message":"",
        "protocol41":true,
        "changedRows":0
      }
      */

      // update session
      // hash password (???)

      // next then block: handling redirecting
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(username => {
      res.status(200).send(`Sorry, the name ${username} has already been taken\n`);
      // redirect user to signup
    });
});

app.post('/links', (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
