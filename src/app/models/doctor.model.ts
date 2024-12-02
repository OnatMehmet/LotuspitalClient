export class DoctorModel{
    id: string ="";
    firstName: string ="";
    lastName: string ="";
    fullName: string ="";
    department: any =""//DepartmentModel = new DepartmentModel();
}

export class DepartmentModel {
    name:string  ="";
    value :number = 0;

}