import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PatientModel } from '../../../models/patient.model';
import { genders } from '../../../constants';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { FormValidateDirective } from 'form-validate-angular';
import { PatientPipe } from '../../pipe/patient.pipe';
import { HttpService } from '../../../services/http.service';
import { SwalService } from '../../../services/swal.service';

@Component({
  selector: 'app-new',
  standalone: true,
  imports: [CommonModule,RouterLink, FormsModule, FormValidateDirective, PatientPipe],
  templateUrl: './new.component.html',
  styleUrl: './new.component.css'
})
export class NewComponent implements OnInit {

      constructor(
        private http:HttpService,
        private swal: SwalService
      ){}
    
  patients: PatientModel[] = [];
  genders =  genders
  
  @ViewChild("addModalCloseBtn") addModalCloseBtn: ElementRef<HTMLButtonElement> | undefined;
  @ViewChild("updateModalCloseBtn") updateModalCloseBtn : ElementRef<HTMLButtonElement> | undefined;
  createModel: PatientModel = new PatientModel();
  updateModel: PatientModel = new PatientModel();

  ngOnInit(): void {
    //dssdf
  }

   add(form:NgForm){
       if(form.valid){
         this.http.post<string>("patient/Create",this.createModel, (res) =>{
           this.swal.callToast(res.data,"success");
           //this.getAll();
           this.addModalCloseBtn?.nativeElement.click();
           this.createModel = new PatientModel();
         })
       }
   
     }

}
