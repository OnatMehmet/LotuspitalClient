import { Component } from '@angular/core';
import { departments } from '../../constants';
import { PersonnelModel } from '../../models/personnel.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppointmentModel } from '../../models/appointment.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
 departments = departments;
 doctors :PersonnelModel[] = [];

 selectedDepartmentValue : number = 0;
 selectedDoctorId :string="";

 appointments : AppointmentModel[] = [];
}
