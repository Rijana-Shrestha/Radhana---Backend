import mongoose from 'mongoose';
const { Schema } = mongoose;
const OauthAccountSchema = new Schema({ 
    provider: {
        type: String,
        enum:["google", "github"],
        required: true 
    },
    providerAccountId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const OauthAccount = mongoose.model('OauthAccount', OauthAccountSchema);

export default OauthAccount;