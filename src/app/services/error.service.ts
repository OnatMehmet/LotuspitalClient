import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SwalService } from './swal.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  constructor(
    private swal: SwalService
  ) { }

  errorHandler(err: HttpErrorResponse){
    console.log(err);
    let message = "Error!" 
    if(err.status == 0 ){
      message = "API Meşgul";
    }else if(err.status == 404){
      message ="API bulunamadı";
    }else if(err.status == 500){
      message ="";
      for(const i of err.error.errorMessages){
        message += i +"\n";
      }
    }
    this.swal.callToast(message, "error");
  }
}
