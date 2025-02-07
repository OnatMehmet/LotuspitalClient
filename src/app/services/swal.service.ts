import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SwalService {

  constructor() { }

  callToast( title: string, icon:SweetAlertIcon = "success"){
    Swal.fire({
      title:title,
      //text:"alt başlık",
      timer:3000,
      icon:icon,
      showCancelButton:false,
      showCloseButton: false,
      toast:true,
      position: 'bottom-right',
      showConfirmButton:false
    });
  }
  callSwal( title: string, text: string, confirmButtonName: string ="Sil", callBack:()=>void){
    Swal.fire({
      title:title,
      text:text,
      icon:"question",
      showConfirmButton:true,
      confirmButtonText:confirmButtonName,
      showCancelButton:true,
      cancelButtonText:"Vazgeç"
    }).then(res=> {
      if(res.isConfirmed){
        callBack();
      }
    });
  }

}
  export type SweetAlertIcon = 'success' | 'error' | 'warning' | 'info' | 'question'