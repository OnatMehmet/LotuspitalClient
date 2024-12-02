import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ResultModel } from '../models/result.model';
import { api } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor(private http:HttpClient ) { }

  post<T>(apiUrl:string, body:any, callBack: (res:ResultModel<T>) =>void, errorCallBack?: (err: HttpErrorResponse)=>void){
    this.http.post<ResultModel<T>>(`${api}/${apiUrl}`,body)
    .subscribe({
      next: (res=>{
            callBack(res);
      }),
      error: ((err:HttpErrorResponse)=> {
        if(errorCallBack !== undefined){
          errorCallBack(err);
        }
      })
    })
  }
}
