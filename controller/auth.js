const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

exports.admin = (req, res) => {
    const nombreestudiante = req.body.nombre_estudiante;
    const clase = req.body.clase;
    const fecha = req.body.fecha;
    console.log(req.body);

    let consulta = `
        SELECT 
            estudiante.nombre,
            estudiante.semestre,
            materias.nombremateria,
            asistencias.fecha
        FROM 
            asistencias
        JOIN inscripcion ON asistencias.idinscripcion = inscripcion.idinscripcion
        JOIN estudiante ON inscripcion.idestudiante = estudiante.idestudiante
        JOIN asignacion ON inscripcion.idasignacion = asignacion.idasignacion
        JOIN materias ON asignacion.idmateria = materias.idmateria
        WHERE 1 = 1
    `;

    const parametros = [];

    if (nombreestudiante) {
        consulta += ` AND estudiante.nombre = ?`;
        parametros.push(nombreestudiante);
    }

    if (clase) {
        consulta += ` AND materias.nombremateria = ?`;
        parametros.push(clase);
    }

    if (fecha) {
        consulta += ` AND DATE(asistencias.fecha) = ?`;
        parametros.push(fecha);
    }

    db.query(consulta, parametros, (error, results) => {
        console.log(results);
        if (error) {
            console.log("Este es el error: " + error);
            return res.render('admin', {
                mensaje: 'Error en la consulta'
            });
        }
        if (results.length === 0) {
            return res.render('admin', {
                mensaje: 'No se encontraron registros con esos filtros'
            });
        } else {
            return res.render('admin', {
                lista: results
            });
        }
    });
};

exports.register = (req, res) => {
    console.log(req.body);

    const cedula = req.body.cedula;
    const name = req.body.nombre;
    const apellido = req.body.apellido;
    const email = req.body.email;
    const password = req.body.password;
    const passwordconfirm = req.body.passwordConfirm;

    db.query('SELECT email FROM profesor WHERE cedulaprofesor = ?', [cedula], async (error, results) => {
        if (error) {
            console.log("este es el error " + error);
        }

        if (results.length > 0) {
            return res.render('register', {
                message: "Esa cedula ya está asociada a una cuenta"
            });
        } else if (password !== passwordconfirm) {
            return res.render('register', {
                message: "Las contraseñas no coinciden"
            });
        }

        let passwordincriptada = await bcrypt.hash(password, 8);
        console.log(passwordincriptada);

        db.query('INSERT INTO profesor SET ?', {
            cedulaprofesor: cedula,
            nombre: name,
            apellido: apellido,
            email: email,
            password: passwordincriptada
        }, (error, results) => {
            if (error) {
                console.log(error);
            } else {
                return res.render('register', {
                    messageRegistrado: 'Usuario Registrado'
                });
            }
        });
    });
};

exports.login = (req, res) => {
    console.log(req.body);
    const email = req.body.email;
    const password = req.body.password;

    db.query('SELECT * FROM profesor WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Error en la base de datos' });

        if (results.length === 0) {
            console.log('no hay usuarios con ese email');
            return res.render('login', {
                message2: 'Usuario no valido'
            });
        }

        const usuario = results[0];
        const passwordvalida = await bcrypt.compare(password, usuario.password);

        if (!passwordvalida) {
            return res.render('login', {
                message2: 'Contraseña no válida'
            });
        }

        console.log("contraseña correcta");

        const accessToken = generateAccessToken({
            email: usuario.email,
            nombre: usuario.nombre
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            maxAge: 59 * 60 * 1000
        });

        res.redirect('/');
    });

    function generateAccessToken(usuario) {
        return jwt.sign(usuario, process.env.CLAVE, { expiresIn: '59m' });
    }
};

exports.validateToken = (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, process.env.CLAVE, (err, user) => {
        if (err) {
            return res.redirect('/login');
        } else {
            req.user = user;
            next();
            console.log(req.user);
            console.log("eso era");
        }
    });
};

exports.registro = (req, res) => {
    const { idestudiante, idasignacion } = req.body;

    db.query(
        'SELECT idinscripcion FROM inscripcion WHERE idestudiante = ? AND idasignacion = ?',
        [idestudiante, idasignacion],
        (err, results) => {
            if (err) {
                console.error('Error buscando inscripción:', err);
                return res.status(500).send('Error buscando inscripción');
            }

            if (results.length === 0) {
                db.query('SELECT * FROM estudiante', (err, estudiantes) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Error cargando estudiantes');
                    }

                    db.query(`
                        SELECT asignacion.idasignacion, materias.nombremateria, profesor.nombre AS nombreprofesor
                        FROM asignacion
                        JOIN materias ON asignacion.idmateria = materias.idmateria
                        JOIN profesor ON asignacion.cedulaprofesor = profesor.cedulaprofesor
                    `, (err, asignaciones) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Error cargando asignaciones');
                        }

                        res.render('registro', {
                            estudiantes,
                            asignaciones,
                            message3: 'Usuario no válido'
                        });
                    });
                });

                return;
            }

            const idinscripcion = results[0].idinscripcion;
            const fecha = moment().tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');

            db.query(
                'INSERT INTO asistencias (idasignacion, fecha, idinscripcion) VALUES (?, ?, ?)',
                [idasignacion, fecha, idinscripcion],
                (err, result) => {
                    if (err) {
                        console.error('Error insertando asistencia:', err);
                        return res.status(500).send('Error registrando asistencia');
                    }

                    db.query('SELECT * FROM estudiante', (err, estudiantes) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Error cargando estudiantes');
                        }

                        db.query(`
                            SELECT asignacion.idasignacion, materias.nombremateria, profesor.nombre AS nombreprofesor
                            FROM asignacion
                            JOIN materias ON asignacion.idmateria = materias.idmateria
                            JOIN profesor ON asignacion.cedulaprofesor = profesor.cedulaprofesor
                        `, (err, asignaciones) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send('Error cargando asignaciones');
                            }

                            res.render('registro', {
                                estudiantes,
                                asignaciones,
                                message4: 'Asistencia registrada exitosamente'
                            });
                        });
                    });
                }
            );
        }
    );
};
