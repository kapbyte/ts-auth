import mongoose from 'mongoose';

// An interface that describes the properties required to create a new User
interface UserAttrs {
  phoneNumber?: string;
  password: string;
  email?: string;
  createdDate?: Date;
}

// An interface that describes the properties that a User Model has
interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

// An interface that describes the properties that a User Document has
interface UserDoc extends mongoose.Document {
  phoneNumber: string;
  password: string;
  email: string;
  createdDate: Date;
}

const userSchema = new mongoose.Schema({
  phoneNumber: { 
    type: String 
  },
  password: {
    type: String,
    required: true
  },
  email: { 
    type: String 
  },
  createdDate: {
    type: Date, 
    default: Date.now
  }
});

userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

const User = mongoose.model<UserDoc, UserModel>('User', userSchema);

export { User };