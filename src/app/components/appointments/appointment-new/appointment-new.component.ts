import { Component, ElementRef, ViewChild } from '@angular/core';
import { AppointmentModel } from '../../../models/appointment.model';
import { HttpService } from '../../../services/http.service';
import { SwalService } from '../../../services/swal.service';
import { genders } from '../../../constants';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormValidateDirective } from 'form-validate-angular';
import { PatientPipe } from '../../pipe/patient.pipe';
import { PatientModel } from '../../../models/patient.model';

@Component({
  selector: 'app-appointment-new',
  standalone: true,
  imports: [CommonModule,RouterLink, FormsModule, FormValidateDirective, PatientPipe],
  templateUrl: './appointment-new.component.html',
  styleUrl: './appointment-new.component.css'
})
export class AppointmentNewComponent {

  constructor(
          private http:HttpService,
          private swal: SwalService
        ){}
      
    // patients: AppointmentModel[] = [];
    genders =  genders
    
    showSearch: boolean = true; // Default is "Hasta Ara"
    activeTab: number = 1; 
    searchTerm: string = '';

    @ViewChild("addModalCloseBtn") addModalCloseBtn: ElementRef<HTMLButtonElement> | undefined;
    @ViewChild("updateModalCloseBtn") updateModalCloseBtn : ElementRef<HTMLButtonElement> | undefined;
    createModel: AppointmentModel = new AppointmentModel();
    updateModel: AppointmentModel = new AppointmentModel();
    createPatientModel: PatientModel = new PatientModel();
    
  
    ngOnInit(): void {
      this.showSearch =true;
    }
  
  patients = [
    { name: 'Mehmet Onat' },
    { name: 'Ahmet Yılmaz' },
    { name: 'Zeynep Demir' },
    { name: 'Ali Veli' },
    { name: 'Fatma Kaya' }
  ]; // Example data (usually fetched from a backend)
  filteredPatients = this.patients; // Initial list

// Function to filter patients based on the search term
filterPatients() {
  if (this.searchTerm.length >= 2) { // Filter only after 3 or more characters
    this.filteredPatients = this.patients.filter(patient =>
      patient.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  } else {
    this.filteredPatients = []; // Reset if less than 3 characters
  }
}

// Select patient and populate the input field with their name
selectPatient(patient: any) {
  this.searchTerm = patient.name;
  this.filteredPatients = []; // Hide suggestions after selecting a patient
}
setActiveTab(tabNumber: number) {
  this.activeTab = tabNumber;
}


add(form:NgForm){
  if(form.valid){
    this.http.post<string>("patient/Create",this.createModel, (res) =>{
      this.swal.callToast(res.data,"success");
      //this.getAll();
      this.addModalCloseBtn?.nativeElement.click();
      this.createModel = new AppointmentModel();
    })
  }

}
addPatient(form:NgForm){
  if(form.valid){
    this.http.post<string>("patient/Create",this.createPatientModel, (res) =>{
      this.swal.callToast(res.data,"success");
      this.createPatientModel = new PatientModel();
    })
  }

}

}
