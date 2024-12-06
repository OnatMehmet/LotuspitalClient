export class PatientModel {

    id: string ="";
    firstName: string ="";
    lastName: string ="";
    fullName : string ="";
    identityNumber: string ="";
    gender : string =""
    genderValue: number = 0;
    birthOfDate?: Date;
    age?: number;
    job:string ="";
    
    //İletişim Bilgileri
    phoneNumber : string = "";
    eMail: string ="";
    country: string ="";
    city: string ="";
    district: string ="";
    fullAddress: string ="";

    //Başvuran Bilgileri
    applicantFullName: string ="";
    applicantPhoneNumber: string ="";
    closenessDegre: string ="";

}
