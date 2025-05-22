const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');

const db = mysql.createConnection({ //aca le digo: preparate para una conexión con la siguiente info, pero aun no te conectes
    host : process.env.DB_HOST, //ya guarde esta info en .env con el nombre que va al final como si fueran variables
    user: process.env.DB_USER,//ya guarde esta info en .env con el nombre que va al final como si fueran variables
    password: process.env.DB_PASSWORD,//ya guarde esta info en .env con el nombre que va al final como si fueran variables
    database: process.env.DB_NAME//ya guarde esta info en .env con el nombre que va al final como si fueran variables
})

/* exports.admin = (req,res) => { 
    console.log(req.body);
    const nombreestudiante = req.body.nombre_estudiante;
    const clase = req.body.clase;   
    const fecha = req.body.fecha;
    db.query('SELECT * FROM estudiantes WHERE nombre_estudiante = ? AND clase = ? AND fecha = ?', [nombreestudiante, clase, fecha], (error, results) => {
        if (error) {
            console.log("Error en la consulta: " + error);
            return res.status(500).json({ error: 'Error en la base de datos' });
        }

        if (results.length === 0) {
            return res.render('admin', {
                message: 'No se encontraron registros para ese estudiante, clase y fecha'
            });
        }

        const toDoList = results.map((item) => {
            return `- ${item.tarea}: ${item.descripcion}`;
        }).join('\n');

        res.render('admin', {
            message: 'Registros encontrados:',
            toDoList: toDoList
        });
    });

    }
 */

exports.admin = (req, res) => {
    const nombreestudiante = req.body.nombre_estudiante; 
    const clase = req.body.clase; 
    const fecha = req.body.fecha; 
    console.log(req.body);

    // Base de la consulta
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

    // Array para los parámetros
    const parametros = [];

    // Agregamos condiciones solo si los campos están presentes
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






exports.register = (req,res)=>{
    console.log(req.body);

    const cedula = req.body.cedula;
    const name = req.body.nombre; /* aca estaos guardando en variables la respuesta de cada input */
    const apellido = req.body.apellido;
    const email = req.body.email;
    const password = req.body.password;
    const passwordconfirm = req.body.passwordConfirm;

    db.query('SELECT email FROM profesor WHERE cedulaprofesor = ?',[cedula], async(error,results) => { //aqui hacemos la consulta para ver si el email ya está registrado o no, entonces
        // el ? y despues [email] sirve para evitar inyecciones maliciosas y despues van los callbacks, en error el error si falla la consulta y results el resultado de el query

        if(error){
            console.log("este es el error "+ error);
        }

        if(results.length > 0){ //si en results llega 1 resultado significa que ya ese email está en base de datos, por tanto está en uso
            return res.render('register',{/* "Renderiza una vista llamada register y pásale estos datos para que los pueda mostrar". */
                message: "Esa cedula ya está asociada a una cuenta" /* "Renderiza la vista register y pásale un objeto que contiene una variable llamada message con ese valor".*/
            }) // ese objeto queda libre para usarse en register asi {{message}}
            /* {{#if message}}
                 <h3>{{message}}</h3>
               {{/if}} */
        }else if(password !== passwordconfirm){
            return res.render('register', {
                message: "Las contraseñas no coinciden"
            })
        }

        let passwordincriptada = await bcrypt.hash(password, 8);
        console.log(passwordincriptada);


        db.query('INSERT INTO profesor SET ?', {cedulaprofesor: cedula,nombre: name, apellido:apellido, email:email, password: passwordincriptada}, (error,results)=>{
            if(error){
                console.log(error);
            }else{
                return res.render('register',{
                    messageRegistrado: 'Usuario Registrado'
                })
            }
         })


    })
    
    
}

exports.login = (req,res) =>{
    console.log(req.body);
    const email = req.body.email
    const password = req.body.password
    db.query('SELECT * FROM profesor WHERE email = ?',[email],async(err,results)=>{

        if(err) return res.status(500).json({error:'Error en la base de datos'});

        if(results.length === 0){
            console.log('no hay usuarios con ese email ')
            return res.render('login',{
                message2: 'Usuario no valida'
            })
        }

        const usuario = results[0];

        const passwordvalida = await bcrypt.compare(password, usuario.password);//compara las contraseñas y bota true si concuerdan y false si no concuerdan
        if(passwordvalida == false){
            return res.render('login',{
                message2: 'Contraseña no valida'
            })
        }else{
            console.log("contraseña correcta")
        }

        const accessToken = generateAccessToken({email:usuario.email, nombre: usuario.name})
        //esa funcion generará el token, pasando como parametro el
        //email de el usuario, porque para el token necesitamos: info que queremos
        // que vaya, la palabra clave y la expiracion del token 



       /*  res.header('authorization', accessToken).json({ */ //'authorization' (el nombre estándar para pasar tokens de autenticación).
            //El accessToken, que es el JWT que generaste para el usuario que acaba de loguearse.
            /* message:'Usuario autenticado',
            token: accessToken */
        /* }) *//* También mandas el accessToken dentro del cuerpo JSON, no solo en el header.

        ¿Por qué mandarlo también en el JSON?
        ➔ Para que el cliente pueda fácilmente leerlo del cuerpo de la respuesta si no quiere leer headers.
        (Ej: un frontend que recibe la respuesta y la guarda en localStorage.) */
        res.cookie('accessToken', accessToken, {
            httpOnly: true, // protege de accesos por JavaScript
            secure: false,  // pon true si estás en HTTPS
            maxAge: 59 * 60 * 1000 // 59 minutos
        });
        res.redirect('/');
    })
    function generateAccessToken(usuario){
        return jwt.sign(usuario,process.env.CLAVE, {expiresIn: '59m'})
        //aca estamos creando la firma del token, sign de signature. contiene 3 partes
        //Header:	Información sobre el tipo de token y algoritmo usado.
        //Payload:	Los datos que tú pusiste (por ejemplo, el email).
        //Signature:	La firma generada con tu clave secreta.
    }
    

}



exports.validateToken = (req,res,next) => {
    const token =  req.cookies.accessToken; //cada request tiene un header en donde va info de la peitcion
    //por lo tanto accesstoken está guardando un header que tenga 'authorization'

    // O tambien en la URL esta buscando el query donde este accesstoken=123 por ejemplo, y coge ese token que se le esté pasando en la url 

    if(!token){//aca verifica que accessToken no sea nulo, osea que si tenga el authorization
        return res.redirect('/login');
    }else{//si no es null el accesstoken, pasa a acá pero acá verifica que la firma del token sea pura
        //y no haya sido modificada
        jwt.verify(token, process.env.CLAVE,(err,user) =>{
            if(err){
                return res.redirect('/login');
                
            }else{
                req.user = user;
                next();
                console.log(req.user);
                console.log("eso era");
            }
                                                                 })        
        }
}




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

      // ✅ Si existe inscripción, registramos asistencia
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

          // 🔁 CONSULTAR ESTUDIANTES Y ASIGNACIONES OTRA VEZ
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
