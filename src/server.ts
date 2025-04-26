import config from "./config";
import mongoose from 'mongoose'
import app from "./app";

async function main() {
    try{
        const conn = await mongoose.connect(config.database_url as string);
        if(conn){
            console.log("\nDatabase connected..")
        }
    
        app.listen(config.port, () => {
            console.log(`Farm-Flow app listening on port ${config.port}`)
        })
    }catch(err){
        console.log(err)
    }

}

main();



