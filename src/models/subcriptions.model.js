import mongoose, {Schema} from "mongoose";

const subScriptionSchema = new Schema(
    {
        subScriber:{
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        channel:{
            type: Schema.Types.ObjectId,
            ref: "User"             
        }
    },
    {timestamps:true}
)

export const Subscription = mongoose.model(Subscription,subScriptionSchema)