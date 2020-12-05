const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');

const {verificarToken} = require('./helpers/jwToken');
require('dotenv').config({path: 'variables.env'});

// Conectar a la data base
conectarDB();


// Servidor
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context : ({req}) => {
       // console.log(req.headers['authorization']);
        const token = req.headers['authorization'] || '';
        if (token) {
            try {
                const usuarioId = verificarToken(token, process.env.SECRETA);
               // console.log(usuarioId);
               return {
                   usuarioId
               }
            } catch (error) {
                console.log('Hubo un error');
                console.log(error);
            }
        }
    }
});

// Arrancar servidor
server.listen().then( ({url}) => {
    console.log(`servidor corriendo en ${url}`);
});