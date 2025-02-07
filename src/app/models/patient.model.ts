export class PatientModel {

    id: string ="";
    firstName: string ="";
    lastName: string ="";
    fullName : string ="";
    identityNumber: string ="";
    gender: GenderModel = new GenderModel();
    genderValue : number = 0;
    birthOfDate: number =  Date.now() ;
    age?: number;
    job:string ="";
    
    //İletişim Bilgileri
    phoneNumber : string ="";
    email: string ="";
    country: string ="";
    city: string ="";
    district: string ="";
    fullAddress: string ="";

    //Başvuran Bilgileri
    applicantFullName?: string ="";
    applicantPhoneNumber?: string = "";
    closenessDegree?: string ="";

}

export class GenderModel {
    name:string  ="";
    value :number = 0;

}
