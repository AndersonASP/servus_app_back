import { MongooseModule } from '@nestjs/mongoose';

export const DatabaseConfig = MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/servus');