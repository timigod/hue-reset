const {Database, Model} = require('mongorito');
const db = new Database(process.env.MONGODB_URI)

class Light extends Model {}

const initDb = async () => {
  await db.connect();
  db.register(Light);
  await Light.createIndex('id', {unique: true});
};

module.exports = { Light, initDb }