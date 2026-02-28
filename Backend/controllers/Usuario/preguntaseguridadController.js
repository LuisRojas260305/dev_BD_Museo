const createGenericController = require('../../utils/genericController');

module.exports = createGenericController('PreguntaSeguridad', {
  idField: 'pregunta_id',        
  nameField: 'pregunta_texto',   
  uniqueName: true              
});