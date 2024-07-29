require('dotenv').config();
const express = require('express');
const methodOverride = require('method-override');
const mysql = require('mysql2');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.set('views', './views');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

app.get('/users', (req, res) => {
  connection.query(
    'SELECT id, email, first_name, last_name, DATE_FORMAT(birth_date, "%Y-%m-%d") AS birth_date FROM users',
    (err, results) => {
      if (err) {
        console.error('Error querying the database:', err);
        res.status(500).send('Error querying the database');
        return;
      }
      res.render('all_users', { users: results });
    }
  );
});

app.get('/users/add', (req, res) => {
  res.render('add_user');
});

app.get('/users/:id', (req, res) => {
  const user_id = req.params.id;
  
  connection.query(
    'SELECT id, email, password, first_name, last_name, DATE_FORMAT(birth_date, "%Y-%m-%d") AS birth_date FROM users WHERE id = ?', 
    [user_id], 
    (err, results) => {
      if (err) {
        console.error('Error querying the database:', err);
        res.status(500).send('Error querying the database');
        return;
      }
      if (results.length === 0) {
        res.status(404).send('User not found');
        return;
      }
      res.render('view_user', { user: results[0] });
    }
  );
});


app.get('/users/edit/:id', (req, res) => {
  const user_id = req.params.id;
  connection.query('SELECT id, email, password, first_name, last_name, DATE_FORMAT(birth_date, "%Y-%m-%d") AS birth_date FROM users WHERE id = ?', [user_id], (err, results) => {
    if (err) {
      res.status(500).send('Error querying the database');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.render('edit_user', { user: results[0] });
  });
});

app.post('/users', async (req, res) => {
  const { email, password, first_name, last_name, birth_date } = req.body;
  if (!email || !password || !first_name || !last_name || !birth_date) {
    res.status(400).send('All fields are required');
    return;
  }
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    connection.query(
      'INSERT INTO users (email, password, first_name, last_name, birth_date) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, first_name, last_name, birth_date],
      (err, results) => {
        if (err) {
          res.status(500).send('Error inserting user into the database');
          return;
        }
        res.redirect('/users');
      }
    );
  } catch (error) {
    res.status(500).send('Error encrypting the password');
  }
});

app.put('/users/:id', async (req, res) => {
  const user_id = req.params.id;
  const { email, password, first_name, last_name, birth_date } = req.body;

  let query = 'UPDATE users SET ';
  const values = [];
  const updates = [];

  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (password) {
    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updates.push('password = ?');
      values.push(hashedPassword);
    } catch (err) {
      console.error('Error encrypting the password:', err);
      res.status(500).send('Error encrypting the password');
      return;
    }
  }
  if (first_name) {
    updates.push('first_name = ?');
    values.push(first_name);
  }
  if (last_name) {
    updates.push('last_name = ?');
    values.push(last_name);
  }
  if (birth_date) {
    updates.push('birth_date = ?');
    values.push(birth_date);
  }

  if (updates.length === 0) {
    res.status(400).send('No fields to update');
    return;
  }

  query += updates.join(', ') + ' WHERE id = ?';
  values.push(user_id);

  connection.query(query, values, (err, results) => {
    if (err) {
      console.error('Error updating user in the database:', err);
      res.status(500).send('Error updating user in the database');
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.redirect(`/users/edit/${user_id}`);
  });
});

app.delete('/users/:id', (req, res) => {
  const user_id = req.params.id;

  connection.query('DELETE FROM users WHERE id = ?', [user_id], (err, results) => {
    if (err) {
      console.error('Error deleting user from the database:', err);
      res.status(500).send('Error deleting user from the database');
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.redirect('/users');
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
