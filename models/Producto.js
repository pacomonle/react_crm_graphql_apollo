const {Schema, model} = require('mongoose');

const ProductoSchema = new Schema({
    nombre: {
        type: String,
        require: true,
        trim: true
    },
    existencia: {
        type: Number,
        require: true,
        trim: true
    },
    precio:{
        type: Number,
        require: true,
        trim: true
    },
    creado:{
        type: Date,
        default: Date.now()
    }
});

ProductoSchema.index({nombre: 'text'});

module.exports = model('Producto', ProductoSchema);