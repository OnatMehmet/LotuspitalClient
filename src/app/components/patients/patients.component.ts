import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PatientModel } from '../../models/patient.model';
import { HttpService } from '../../services/http.service';
import { SwalService } from '../../services/swal.service';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormValidateDirective } from 'form-validate-angular';
import { PatientPipe } from '../pipe/patient.pipe';
import { genders } from '../../constants';


@Component({
  selector: 'app-patient',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FormValidateDirective, PatientPipe],// html tarafında döngü ve pipe için commonmodule kullanılır
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.css'
})
export class PatientsComponent implements OnInit {
  patients: PatientModel[] = [];
  genders =  genders
  
  @ViewChild("addModalCloseBtn") addModalCloseBtn: ElementRef<HTMLButtonElement> | undefined;
  @ViewChild("updateModalCloseBtn") updateModalCloseBtn : ElementRef<HTMLButtonElement> | undefined;
  createModel: PatientModel = new PatientModel();
  updateModel: PatientModel = new PatientModel();
  
  search: string =""
  
    constructor(
      private http:HttpService,
      private swal: SwalService
    ){}
  
  
    ngOnInit(): void {
      this.getAll();
      // this.swal.callSwal("Silme İşlemi","Silinsinmi", "Sil", ()=> {
      //   alert("Silme işlemi başarılı");
      // });
    }
  
    getAll(){
      this.http.post<PatientModel[]>("patient/GetAll",{}, (res)=> {
        this.patients = res.data
  
      });
    }
  
    add(form:NgForm){
      if(form.valid){
        this.http.post<string>("patient/Create",this.createModel, (res) =>{
          this.swal.callToast(res.data,"success");
          this.getAll();
          this.addModalCloseBtn?.nativeElement.click();
          this.createModel = new PatientModel();
        })
      }
  
    }
  
    delete(id: string, fullName :string){
      this.swal.callSwal("Hasta Silme", `${fullName} adlı hasta silinecektir emin misiniz? `,"Sil" ,() => {
        this.http.post<string>("patient/DeleteById", {id: id}, (res)=>{
            this.swal.callToast(res.data, "info");
            this.getAll();
        })
      }  )
    }
  
    get(data : PatientModel){
      this.updateModel = {...data}
      // this.updateModel.departmentValue = data.department.value;
    }
  
    update(form:NgForm){
      if(form.valid){
        this.http.post<string>("patient/Update",this.updateModel, (res) =>{
          this.swal.callToast(res.data,"success");
          this.getAll();
          this.updateModalCloseBtn?.nativeElement.click();
        })
      }
  
    }
}
