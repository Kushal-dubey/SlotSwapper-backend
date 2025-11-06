import mongoose from "mongoose";
import bcrypt from "bcryptjs";

//User Schema : defines how user data is stored in mongodb
const userSchema = new mongoose.Schema({
    name: {
        type : String,
        required : [true, "Please enter your name"],
    },
    email: {
        type : String,
        required : [true, "Please enter your email"],
    },

    password: {
        type : String,
        required : [true, "Please enter your Password"],
        minlength : 6,
    },
}, {timestamps: true});

//Before saving , encrypt the password using bcrypt

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare entered password with hashed password

userSchema.methods.matchPassword = async function (enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;