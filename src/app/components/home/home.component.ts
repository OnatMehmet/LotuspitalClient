import { Component } from '@angular/core';
import { departments } from '../../constants';
import { PersonnelModel } from '../../models/personnel.model';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { AppointmentModel } from '../../models/appointment.model';
import { HttpService } from '../../services/http.service';
import { CreateAppointmentModel } from '../../models/create-appointment.model';
import { FormValidateDirective } from 'form-validate-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule, FormValidateDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  providers:[DatePipe]

})
export class HomeComponent {
 departments = departments;
 doctors :PersonnelModel[] = [];

 selectedDepartmentValue : number = 0;
 selectedDoctorId :string="";

 authService :string ="";
 appointments : AppointmentModel[] = [];

 createModel: CreateAppointmentModel = new CreateAppointmentModel();

 constructor(
  private htpp : HttpService,
  private date : DatePipe
 ){}


 onAppointmentFormOpening(e :any){
  e.cancel = true;
  console.log(e);

  this.createModel.startDate = this.date.transform (e.eppointmentData.startDate, "dd.MM.yyyy HH:mm")?? "";
  this.createModel.endDate = this.date.transform (e.eppointmentData.endDate, "dd.MM.yyyy HH:mm")?? "";
  this.createModel.doctorId = this.selectedDoctorId;


 }

 create(form: NgForm){

 }

}
