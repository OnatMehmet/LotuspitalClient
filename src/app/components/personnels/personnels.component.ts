import { Component, ElementRef, OnInit, ViewChild, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpService } from '../../services/http.service';
import { CommonModule} from '@angular/common';
import { departments } from '../../constants';
import { FormsModule, NgForm } from '@angular/forms';
import { FormValidateDirective } from 'form-validate-angular';
import { SwalService } from '../../services/swal.service';
import { PersonnelModel } from '../../models/personnel.model';
import { PersonnelPipe } from '../pipe/personnel.pipe';


@Component({
  selector: 'app-personnels',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FormValidateDirective, PersonnelPipe],// html tarafında döngü ve pipe için commonmodule kullanılır
  templateUrl: './personnels.component.html',
  styleUrl: './personnels.component.css'
})
export class PersonnelsComponent implements OnInit {
personnels: PersonnelModel[] = [];
departments = departments;

@ViewChild("addModalCloseBtn") addModalCloseBtn: ElementRef<HTMLButtonElement> | undefined;
@ViewChild("updateModalCloseBtn") updateModalCloseBtn : ElementRef<HTMLButtonElement> | undefined;
createModel: PersonnelModel = new PersonnelModel();
updateModel: PersonnelModel = new PersonnelModel();

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
    this.http.post<PersonnelModel[]>("personnel/GetAll",{}, (res)=> {
      this.personnels = res.data

    });
  }

  add(form:NgForm){
    if(form.valid){
      this.http.post<string>("personnel/Create",this.createModel, (res) =>{
        this.swal.callToast(res.data,"success");
        this.getAll();
        this.addModalCloseBtn?.nativeElement.click();
        this.createModel = new PersonnelModel();
      })
    }

  }

  delete(id: string, fullName :string){
    this.swal.callSwal("Personel Silme", `${fullName} adlı personel silinecektir emin misiniz? `,"Sil" ,() => {
      this.http.post<string>("Personnel/DeleteById", {id: id}, (res)=>{
          this.swal.callToast(res.data, "info");
          this.getAll();
      })
    }  )
  }

  get(data : PersonnelModel){
    this.updateModel = {...data}
    this.updateModel.departmentValue = data.department.value;
  }

  update(form:NgForm){
    if(form.valid){
      this.http.post<string>("personnel/Update",this.updateModel, (res) =>{
        this.swal.callToast(res.data,"success");
        this.getAll();
        this.updateModalCloseBtn?.nativeElement.click();
      })
    }

  }
}
