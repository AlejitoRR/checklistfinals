const express = require('express');
const { login, validateToken } = require('../controller/auth');
const mysql = require('mysql2');
const db = mysql.createConnection({ 
    host : process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

const router = express.Router();

router.get('/', (req,res)=>{
    res.render('home'); 
})

router.get('/register', (req,res)=>{
    res.render('register'); 
})

router.get('/login', (req,res) =>{
    res.render('login');
})

router.get('/admin' ,validateToken,(req,res)=>{
    res.render('admin');
})

router.get('/home',(req,res)=>{
    res.render('home');
})

router.get('/registro', (req, res) => {
  db.query('SELECT * FROM estudiante', (err, estudiantes) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error cargando datos');
    }
    db.query(`
      SELECT asignacion.idasignacion, materias.nombremateria, profesor.nombre AS nombreprofesor
      FROM asignacion
      JOIN materias ON asignacion.idmateria = materias.idmateria
      JOIN profesor ON asignacion.cedulaprofesor = profesor.cedulaprofesor
    `, (err, asignaciones) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error cargando datos');
      }
      res.render('registro', { estudiantes, asignaciones });
    });
  });
});

router.get('/logout', (req,res)=>{
    res.clearCookie('accessToken');
    res.redirect('/login');
})
module.exports = router;    