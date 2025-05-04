import { UserModel } from "../modules/appData/user/user.model"

export const generateFarmerId =async()=>{
    const allUsersDataLength = (await UserModel.find()).length;
    return `fr${allUsersDataLength}`
}
