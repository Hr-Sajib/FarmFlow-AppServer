import { FieldModel } from "../modules/appData/fields/fields.model";
import { UserModel } from "../modules/appData/user/user.model"

export const generateFarmerId =async()=>{
    const allUsersDataLength = (await UserModel.find()).length+1;
    return `fr${allUsersDataLength}`
}

export const generateFieldId =async()=>{
    const allFieldsDataLength = (await FieldModel.find()).length+1;
    return `fd${allFieldsDataLength}`
}
