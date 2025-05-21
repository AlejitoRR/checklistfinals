const express = require('express'); // importar express que nos ayuda a crear el servidor
const mysql = require('mysql'); //improtarmos mysql para poder conectarnos a la base de datos
const dotenv = require('dotenv'); //importamos dotenv para poder tener informacion sensible fuera de este principal archivo
const path = require('path'); //importamos path para poder trabajar con rutas de archivos y carpetas
const cookieParser = require('cookie-parser');



dotenv.config({path: './.env'}); //con config le decimos que lea el archivo .env 
//que está en mi proyecto y le pasamos la ruta de donde se encuentra el archivo .env

const app = express();

const db = mysql.createConnection({ 
    host : process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));   

app.use(cookieParser());
app.use(express.urlencoded({ extended: false}));
app.use(express.json())


app.set('view engine', 'hbs');


db.connect((error) => { //aqui ya se dice "okey, conectate a la bd"
    if(error){ //ese error es un callback que se ejecuta si llega a existir un error en la conexión
        console.log(error); //si hay error se llena, pero si no el error es null y se ejecuta el else
    }else{
        console.log("Conectada mi papacho");
    }
}) 

app.use('/',require('./routes/pages'));
app.use('/auth', require('./routes/auth')) //cada vez que tenga una peticion con /auth, voy a requerir la ruta que pusimos
//como segundo parametro

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
