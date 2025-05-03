
export type TFieldData = {
    fieldId: string,
    fieldName: string,
    cropName: string,
    fieldArea: number, //in acres
    fieldLocation: {latitude: number, longitude: number}
}

export interface IFarmer {
    name: string,
    farmerId: string,
    totalFieldsCount: number,
    fieldDetails: TFieldData[],

}
