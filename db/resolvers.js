const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const bcryptjs = require('bcryptjs');
const {crearToken, verificarToken} = require('../helpers/jwToken');


require('dotenv').config({path: 'variables.env'});

// Resolvers

const resolvers = {
  Query: {
    obtenerUsuario: async(_, {token}) => {
        const usuarioId = await verificarToken(token, process.env.SECRETA);
        return usuarioId;
      },
    obtenerProductos: async()=> {
        try {
          const productos = await Producto.find({});
          return productos;

        } catch (error) {
          console.log('Hubo un error');
          console.log(error);
        }
     },
    obtenerProducto: async(_, {id})  => {
       
        try {
           // revisar si el producto existe
          const producto = await Producto.findById(id);
          if (!producto) {
            throw new Error('Producto no encontrado');
          }
          return producto;
        } catch (error) {
          console.log('Hubo un error');
          console.log(error);
        }
     },
    obtenerClientes: async() =>{
        try {
          const clientes = await Cliente.find({});
          return clientes;

        } catch (error) {
          console.log('Hubo un error');
          console.log(error);
        }
     },
    obtenerClientesVendedor: async(_, {}, ctx) =>{
        const {usuarioId:{id}} = ctx;

        const clientes = await Cliente.find({vendedor: id.toString()});
       // console.log(clientes)
        if (!clientes) {
          throw new Error('El vendedor no tiene clientes asignados');
        }
        try {
          return clientes;
        } catch (error) {
          console.log('Hubo un error');
          console.log(error);
        }
     },
    obtenerCliente: async(_, {id}, ctx)  => {
        // revisar si el cliente existe
        const cliente = await Cliente.findById(id);
        if (!cliente) {
          throw new Error('Cliente no encontrado');
        }
        // quien lo creo puede verlo
        if (cliente.vendedor.toString() !== ctx.usuarioId.id) {
          throw new Error('No tienes privilegios');
        }

        try {
          
            return cliente;   
      
        } catch (error) {
          console.log('Hubo un error');
          console.log(error);
        }
   },
    obtenerPedidos: async() =>{
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log('Hubo un error');
        console.log(error);
      }
   },
   obtenerPedidosVendedor: async(_, {}, ctx) =>{
      const {usuarioId:{id}} = ctx;

      try {
        const pedidos = await Pedido.find({ vendedor: id });

        console.log(pedidos);
        
        return pedidos;

      } catch (error) {
        console.log('Hubo un error');
        console.log(error);
      }
   },
   obtenerPedido: async(_, {id}, ctx) =>{
      // console.log(ctx)
          // Si el pedido existe o no
          const pedido = await Pedido.findById(id);
          if(!pedido) {
              throw new Error('Pedido no encontrado');
          }

          // Solo quien lo creo puede verlo
          if(pedido.vendedor.toString() !== ctx.usuarioId.id) {
              throw new Error('No tienes las credenciales');
          }

          // retornar el resultado
          return pedido;
   },
      obtenerPedidosEstado: async (_, { estado }, ctx) => {
        const pedidos = await Pedido.find({ vendedor: ctx.usuarioId.id, estado });

        return pedidos;
    },

      mejoresClientes: async() => {
        const clientes = await Pedido.aggregate([
          {
            $match: { estado: "COMPLETADO" }
          },
          {
            $group: {
              _id: "$cliente",
              total: { $sum: '$total' } // type TopCliente.total
          }},
          {
            $lookup: {
                from: 'clientes', // modelo
                localField: '_id',
                foreignField: '_id',
                as: 'cliente' // type TopCliente.cliente
          }},
          {
            $limit: 3
          },
          {
            $sort: { total: -1 }
          }
        ]) 
        return clientes;
    },
      mejoresVendedores: async() =>{
        const vendedores = await Pedido.aggregate([
          {
            $match: { estado: 'COMPLETADO' }
          },
          {
            $group: {
              _id: "$vendedor",
              total: { $sum: '$total' } // type TopVendedor.total
          }},
          {
            $lookup: {
              from: 'usuarios', // modelo 
              localField: '_id',
              foreignField: '_id',
              as: 'vendedor' // type TopVendedor.vendedor
            }},
            {
              $limit: 3
            },
            {
              $sort: { total: -1 }
            }
        ])
        return vendedores;
    },
    buscarProducto: async(_, {texto}) =>{
        const productos = await Producto.find({$text: {$search : texto}}).limit(10)  // operador indice text del modelo Producto
        return productos;
      }
    
},
  Mutation: {
    nuevoUsuario: async(_, {input}) =>{
       // console.log(input);
        const {email, password} = input
        // revisar si el usuario esta registrado
        const existeUsuario = await Usuario.findOne({email});
          //console.log(existeUsuario);
        if (existeUsuario) {
          throw new Error('El usuario ya esta registrado');
        }

        // hashear password
        const salt = await bcryptjs.genSalt(10);
        input.password = await bcryptjs.hash(password, salt);

        // guardar en base datos
        try {
          const usuario = new Usuario(input);
          usuario.save();
          return usuario;

        } catch (error) {
          console.log('Hubo un error');
          console.log(error);
        }  
    },
    autenticarUsuario: async(_, {input})=>{ 
        const {email, password} = input  
        // comprobar que el usuario existe
        const existeUsuario = await Usuario.findOne({email});
        if (!existeUsuario) {
          throw new Error('Ese usuario no existe');
        }
        // revisar que el password es correcto
        const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
        if (!passwordCorrecto) {
          throw new Error('Ese usuario no existe');
        }
        // crear un token
        return {
          token: crearToken(existeUsuario, process.env.SECRETA, '24h')
        }
    },
    nuevoProducto: async(_, {input}) =>{
        try {
          const nuevoProducto = new Producto(input);
          // guardar en base datos
          const resultado = nuevoProducto.save();
          return resultado

        } catch (error) {
          console.log('Hubo un error');
          console.log(error);
        }
    },
    actualizarProducto: async(_,{id, input})=>{
       // revisar si el producto existe    
          let producto = await Producto.findById(id);
          if (!producto) {
            throw new Error('Producto no encontrado');
          }
        try {
          producto = await Producto.findByIdAndUpdate({_id: id}, input, {new:true} );

         return producto;

          } catch (error) {
            console.log('Hubo un error');
            console.log(error);
          }
    },
    eliminarProducto: async(_, {id}) =>{
           // revisar si el producto existe
            let producto = await Producto.findById(id);
            if (!producto) {
              throw new Error('Producto no encontrado');
            }
            try {
            producto = await Producto.findByIdAndDelete({_id: id});

            return `El producto ${producto.nombre} eliminado correctamente`;

            } catch (error) {
              console.log('Hubo un error');
              console.log(error);
            }
    },
    nuevoCliente: async (_, { input }, ctx) => {
      // console.log(input);
      // console.log(ctx);
      const {email} = input;
       // verificar si el cliente existe
       const cliente = await Cliente.findOne({email});
       if (cliente) {
         throw new Error('El cliente ya existe');
       }
      try {
        const nuevoCliente = new Cliente(input);
        // asignarle un vendedor
        const {usuarioId:{id}} = ctx;
        nuevoCliente.vendedor =  id;

        // guardar en la base de datos
        const resultado = await nuevoCliente.save();
        return resultado;

      } catch (error) {
        console.log('Hubo un error');
        console.log(error);
      } 
      
    },
    actualizarCliente: async(_, {id, input}, ctx) =>{
        // verificar si existe el cliente
        let cliente = await Cliente.findById(id);
        if (!cliente) {
          throw new Error('El cliente no existe');
        }
        // verificar si el vendedor es el que edita
        if (cliente.vendedor.toString() !== ctx.usuarioId.id) {
          throw new Error('No tienes privilegios');
        }

        // guardar cliente
        cliente = Cliente.findByIdAndUpdate({_id: id}, input, {new: true} );
        return cliente;
    },
    eliminarCliente: async(_, {id}, ctx) =>{
        // verificar si existe el cliente
        let cliente = await Cliente.findById(id);
        if (!cliente) {
          throw new Error('El cliente no existe');
        }
        // verificar si el vendedor es el que edita
        if (cliente.vendedor.toString() !== ctx.usuarioId.id) {
            throw new Error('No tienes privilegios');
          }
       // eliminar cliente
         cliente = await Cliente.findByIdAndDelete({_id: id});
         return `El cliente ${cliente.empresa} se elemino correctamente`;
    },
    nuevoPedido: async(_, {input}, ctx) =>{
      // console.log(input);
      const {cliente} = input; // el cliente es un id
   // verificar si el cliente existe
      const clienteExiste = await Cliente.findById({_id:cliente});
      // console.log(clienteExiste)
      if (!clienteExiste) {
        throw new Error('El cliente no existe');
      }
   // verificar si el vendedor tiene privilegios
       if (clienteExiste.vendedor.toString() !== ctx.usuarioId.id) {
         throw new Error('No tienes privilegios');
      }
   
  // Revisar la existencia de stock    
      for await (let articulo of input.pedido) {
          // console.log(articulo);
          const {id} = articulo;
          const producto = await Producto.findById(id);
         // console.log(producto)
          if (articulo.cantidad > producto.existencia) {
            throw new Error(`El articulo: ${producto.nombre} excede de las existencias`);
          }else{
            // restar la cantidad a la existente
            producto.existencia = producto.existencia - articulo.cantidad;
            await producto.save();
          }

      };
     
           // crear nuevo pedido
      const nuevoPedido = new Pedido(input);
      
          // asignarle un vendedor
      const {usuarioId:{id}} = ctx;
      nuevoPedido.vendedor =  id;

          // guardar en la base de datos
      const resultado = await nuevoPedido.save();
      console.log(resultado);
      return resultado;
    },
    actualizarPedido: async(_, {id, input}, ctx) => {

      const { cliente } = input; // es un id

      // Si el pedido existe
      const existePedido = await Pedido.findById(id);
      if(!existePedido) {
          throw new Error('El pedido no existe');
      }

      // Si el cliente existe
      const existeCliente = await Cliente.findById(cliente);
      if(!existeCliente) {
          throw new Error('El Cliente no existe');
      }

      // Si el cliente y pedido pertenece al vendedor
      if(existeCliente.vendedor.toString() !== ctx.usuarioId.id ) {
          throw new Error('No tienes las credenciales');
      }

      // Revisar el stock
      if( input.pedido ) {
          for await ( const articulo of input.pedido ) {
              const { id } = articulo;

              const producto = await Producto.findById(id);

              if(articulo.cantidad > producto.existencia) {
                  throw new Error(`El articulo: ${producto.nombre} excede la cantidad disponible`);
              } else {
                  // Restar la cantidad a lo disponible
                  producto.existencia = producto.existencia - articulo.cantidad;

                  await producto.save();
              }
          }
      }

      // Guardar el pedido
      const resultado = await Pedido.findOneAndUpdate({_id: id}, input, { new: true });
      return resultado;

  },
  eliminarPedido: async (_, {id}, ctx) => {
      // Verificar si el pedido existe o no
      const pedido = await Pedido.findById(id);
      if(!pedido) {
          throw new Error('El pedido no existe')
      }

      // verificar si el vendedor es quien lo borra
      if(pedido.vendedor.toString() !== ctx.usuarioId.id ) {
          throw new Error('No tienes las credenciales')
      }

      // eliminar de la base de datos
      await Pedido.findOneAndDelete({_id: id});
      return `Pedido ${pedido.id} Eliminado`
  }

  }
}

module.exports = resolvers;