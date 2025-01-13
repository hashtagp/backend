import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
    image:{
        type:String,
        required:true
    }, 
    name:{
        type:String,
        required:true
    }
})

const Banner = mongoose.model("Banner",bannerSchema);

export default Banner;