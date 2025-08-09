import { connect, model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserSchema, User } from '../modules/users/schema/user.schema'

async function seedSuperAdmin() {
  try {
    await connect(process.env.MONGO_URI || 'mongodb://localhost:27017/servus');
    console.log('✅ Conectado ao banco.');

    const UserModel = model<User>('User', UserSchema);

    const email = 'superadmin@servus.com';
    const exists = await UserModel.findOne({ email });

    if (exists) {
      console.log('⚠️ SuperAdmin já existe.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('!Servus1108', 10);

    await UserModel.create({
      name: 'Super Admin',
      email,
      password: hashedPassword,
      role: 'superadmin',
      tenantId: null,
    });

    console.log('✅ SuperAdmin criado com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar SuperAdmin:', error.message);
    process.exit(1);
  }
}

seedSuperAdmin();