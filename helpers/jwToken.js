const jwt = require('jsonwebtoken');


const crearToken = (usuario, secreta, expiresIn) =>{
   // console.log(usuario, secreta, expiresIn);
    const {id, email, nombre, apellido} = usuario; // payload del token

    return jwt.sign({id, email, nombre, apellido}, secreta, {expiresIn})

}

const verificarToken = (token , secreta) => {
   
    return jwt.verify(token, secreta);
    
}





module.exports = {crearToken, verificarToken};