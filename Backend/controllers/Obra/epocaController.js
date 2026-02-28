const createGenericController = require('../../utils/genericController');

module.exports = createGenericController('Epoca', {
  idField: 'epoca_id',
  nameField: 'nombre',
  uniqueName: true
});